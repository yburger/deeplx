/**
 * Token bucket rate limiting implementation for client IP and proxy management
 * Provides comprehensive rate limiting with two-level caching for optimal performance
 */

import { RATE_LIMIT_CONFIG, calculateDynamicRateLimits } from "./config";
import { getProxyEndpoints } from "./proxyManager";

// Import types from worker-configuration for consistency
interface Env {
  CACHE_KV: KVNamespace;
  RATE_LIMIT_KV: KVNamespace;
  ANALYTICS: AnalyticsEngineDataset;
  PROXY_URLS?: string;
  PROXY_WEIGHTS?: string;
}

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

/**
 * Rate limiting result interface
 */
export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Get dynamic rate limits based on available proxy endpoints
 * @param env Environment bindings containing proxy configuration
 * @returns Object containing calculated rate limits
 */
function getDynamicRateLimits(env: Env) {
  const proxyEndpoints = getProxyEndpoints(env);
  return calculateDynamicRateLimits(proxyEndpoints.length);
}

/**
 * Proxy backend rate limiting configuration constants
 */
const PROXY_TOKENS_PER_SECOND = RATE_LIMIT_CONFIG.PROXY_TOKENS_PER_SECOND;
const PROXY_MAX_TOKENS = RATE_LIMIT_CONFIG.PROXY_MAX_TOKENS;
const PROXY_REFILL_RATE = PROXY_TOKENS_PER_SECOND;

/**
 * In-memory cache for performance optimization
 * Uses Map for fast lookups and TTL-based cleanup
 */
const rateLimitCache = new Map<
  string,
  { tokens: number; lastRefill: number; lastUpdate: number }
>();
const CACHE_TTL = 5000; // 5 seconds TTL for cache entries

/**
 * Extract client IP address from request headers
 * Supports Cloudflare and standard forwarded headers
 * @param request The incoming request object
 * @returns The client IP address or "unknown" if not found
 */
export function getClientIP(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * Check rate limit for a specific client IP using token bucket algorithm
 * Implements two-level caching: in-memory cache and Cloudflare KV storage
 * @param clientIP The client IP address to check
 * @param env Environment bindings containing KV namespaces
 * @returns Promise<boolean> - True if request is allowed, false if rate limited
 */
export async function checkRateLimit(
  clientIP: string,
  env: Env
): Promise<boolean> {
  const key = `rate_limit:${clientIP}`;
  const now = Date.now();

  try {
    const rateLimits = getDynamicRateLimits(env);
    const maxTokens = rateLimits.TOKENS_PER_MINUTE;

    // Check in-memory cache
    const cached = rateLimitCache.get(key);
    let tokens = maxTokens;
    let lastRefill = now;

    if (cached && now - cached.lastUpdate < CACHE_TTL) {
      // Use cached data
      const timePassed = (now - cached.lastRefill) / 1000;
      tokens = Math.min(
        maxTokens,
        cached.tokens + timePassed * rateLimits.REFILL_RATE
      );
      lastRefill = cached.lastRefill;
    } else {
      // Get data from KV
      try {
        const existing = (await env.RATE_LIMIT_KV.get(
          key,
          "json"
        )) as RateLimitEntry | null;
        if (existing) {
          const timePassed = (now - existing.lastRefill) / 1000;
          tokens = Math.min(
            maxTokens,
            existing.tokens + timePassed * rateLimits.REFILL_RATE
          );
          lastRefill = existing.lastRefill;
        }
      } catch (kvError) {
        // KV read failed, continue with in-memory cache only
        // Error is silently handled to maintain service availability
      }
    }

    if (tokens < 1) {
      // Update cache
      rateLimitCache.set(key, {
        tokens,
        lastRefill: now,
        lastUpdate: now,
      });

      // Async KV update
      env.RATE_LIMIT_KV.put(key, JSON.stringify({ tokens, lastRefill: now }), {
        expirationTtl: 3600,
      }).catch(() => {
        // KV update failed, continue silently
      });

      return false;
    }

    // Consume one token
    tokens -= 1;

    // Update cache
    rateLimitCache.set(key, {
      tokens,
      lastRefill: now,
      lastUpdate: now,
    });

    // Async KV update
    env.RATE_LIMIT_KV.put(key, JSON.stringify({ tokens, lastRefill: now }), {
      expirationTtl: 3600,
    }).catch(() => {
      // KV update failed, continue silently
    });

    return true;
  } catch (error) {
    // Rate limit check failed, allow request to maintain service availability
    return true;
  }
}

/**
 * Delay execution for specified number of seconds
 * Used for implementing backoff strategies
 * @param seconds - Number of seconds to delay
 * @returns Promise that resolves after the specified delay
 */
export function delayRequest(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

/**
 * Clean up expired cache entries to prevent memory leaks
 * Performs on-demand cleanup when cache grows beyond threshold
 * @private
 */
function cleanupCacheIfNeeded(): void {
  // Only clean up when cache has more than 100 items to avoid frequent operations
  if (rateLimitCache.size > 100) {
    const now = Date.now();
    for (const [key, entry] of rateLimitCache.entries()) {
      if (now - entry.lastUpdate > CACHE_TTL * 2) {
        rateLimitCache.delete(key);
      }
    }
  }
}

/**
 * Combined rate limit check for both client and proxy backend limits
 * Provides comprehensive rate limiting across multiple dimensions
 * @param clientIP - The client IP address to check
 * @param endpoint - The endpoint URL to check (null for direct requests)
 * @param env - Environment bindings containing KV namespaces
 * @returns Promise<RateLimitResult> - Object indicating if request is allowed and reason if not
 */
export async function checkCombinedRateLimit(
  clientIP: string,
  endpoint: string,
  env: Env
): Promise<RateLimitResult> {
  // Clean up cache on demand
  cleanupCacheIfNeeded();

  // First check client rate limit
  const clientAllowed = await checkRateLimit(clientIP, env);
  if (!clientAllowed) {
    return { allowed: false, reason: "Client rate limit exceeded" };
  }

  // If endpoint exists, check proxy rate limit
  if (endpoint && endpoint !== "https://www2.deepl.com/jsonrpc") {
    const proxyAllowed = await checkProxyRateLimit(endpoint, env);
    if (!proxyAllowed) {
      return { allowed: false, reason: "Proxy rate limit exceeded" };
    }
  }

  return { allowed: true };
}

/**
 * Efficient proxy backend rate limiting using token bucket algorithm
 * Implements two-level caching to reduce KV latency and improve performance
 * @param proxyUrl - The proxy URL to rate limit
 * @param env - Environment bindings containing KV namespaces
 * @returns Promise<boolean> - True if request is allowed, false if rate limited
 */
export async function checkProxyRateLimit(
  proxyUrl: string,
  env: Env
): Promise<boolean> {
  const key = `proxy_rate_limit:${proxyUrl}`;
  const now = Date.now();

  try {
    // First check in-memory cache for optimal performance
    const cached = rateLimitCache.get(key);
    let tokens = PROXY_MAX_TOKENS;
    let lastRefill = now;

    if (cached && now - cached.lastUpdate < CACHE_TTL) {
      // Use cached data if still valid
      const timePassed = (now - cached.lastRefill) / 1000;
      tokens = Math.min(
        PROXY_MAX_TOKENS,
        cached.tokens + timePassed * PROXY_REFILL_RATE
      );
      lastRefill = cached.lastRefill;
    } else {
      // Fallback to KV storage, but don't block request on failure
      try {
        const existing = (await env.RATE_LIMIT_KV.get(
          key,
          "json"
        )) as RateLimitEntry | null;
        if (existing) {
          const timePassed = (now - existing.lastRefill) / 1000;
          tokens = Math.min(
            PROXY_MAX_TOKENS,
            existing.tokens + timePassed * PROXY_REFILL_RATE
          );
          lastRefill = existing.lastRefill;
        }
      } catch (kvError) {
        // KV read failed, continue using default or cached values
        // Error is silently handled to maintain service availability
      }
    }

    // Check if request should be rate limited
    if (tokens < 1) {
      // Update cache with current state
      rateLimitCache.set(key, {
        tokens,
        lastRefill: now,
        lastUpdate: now,
      });

      // Async KV update without blocking response
      env.RATE_LIMIT_KV.put(key, JSON.stringify({ tokens, lastRefill: now }), {
        expirationTtl: 3600,
      }).catch(() => {
        // KV update failed, continue silently
      });

      return false;
    }

    // Consume one token
    tokens -= 1;

    // Update cache with new token count
    rateLimitCache.set(key, {
      tokens,
      lastRefill: now,
      lastUpdate: now,
    });

    // Async KV update without blocking response
    env.RATE_LIMIT_KV.put(key, JSON.stringify({ tokens, lastRefill: now }), {
      expirationTtl: 3600,
    }).catch(() => {
      // KV update failed, continue silently
    });

    return true;
  } catch (error) {
    // Proxy rate limit check failed, allow request to maintain service availability
    return true;
  }
}
