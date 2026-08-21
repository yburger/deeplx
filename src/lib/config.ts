/**
 * Configuration constants for the DeepLX app
 * Centralizes all configuration values for easy maintenance and consistency
 */

/**
 * Request timeout configurations
 */
export const REQUEST_TIMEOUT = 10000; // 10 seconds for single requests

/**
 * Retry mechanism configuration
 */
export const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second initial delay
  backoffFactor: 2, // Exponential backoff multiplier
};

/**
 * Rate limiting configuration for client and proxy limits
 * Based on DeepL API best practices and community feedback
 */
export const RATE_LIMIT_CONFIG = {
  // Base per-proxy limits
  PROXY_TOKENS_PER_SECOND: 8, // Conservative backend proxy rate limit (below 8 to prevent overload)
  PROXY_MAX_TOKENS: 16, // 2 seconds worth of burst capacity (8 * 2)
  PROXY_REFILL_RATE: 8, // Proxy token refill rate

  // Dynamic client limits (calculated based on proxy count)
  BASE_TOKENS_PER_MINUTE: 480, // Fallback when no proxies available
};

/**
 * Cache system configuration
 */
export const CACHE_CONFIG = {
  TTL: 3600, // 1 hour cache time-to-live
  MEMORY_CACHE_SIZE: 1000, // Maximum items in memory cache
};

/**
 * Payload size limits configuration
 */
export const PAYLOAD_LIMITS = {
  MAX_TEXT_LENGTH: 5000, // Maximum length of text allowed for a single request
  MAX_REQUEST_SIZE: 32768, // Maximum size of a request payload in bytes
  PROXY_MAX_TEXT_LENGTH: 3000, // Maximum text length allowed per proxy request
  CHUNK_SIZE: 2000, // Size of text chunks for splitting large requests
};

/**
 * Error handling and logging configuration
 */
export const ERROR_CONFIG = {
  LOG_SENSITIVE_DATA: false, // Never log sensitive information in production
  INCLUDE_STACK_TRACES: false, // Include stack traces in error responses (for debugging)
};

/**
 * Calculate dynamic rate limits based on available proxy endpoints
 * Per-client limit = number of proxies × per-proxy limit × 60 (to convert to per-minute)
 * @param proxyCount - Number of available proxy endpoints
 * @returns Object containing calculated rate limits
 */
export function calculateDynamicRateLimits(proxyCount: number) {
  // If no proxies available, use base limit
  if (proxyCount === 0) {
    return {
      TOKENS_PER_MINUTE: RATE_LIMIT_CONFIG.BASE_TOKENS_PER_MINUTE,
      REFILL_RATE: RATE_LIMIT_CONFIG.BASE_TOKENS_PER_MINUTE / 60,
    };
  }

  // Calculate based on proxy capacity: proxies × tokens/sec × 60 sec/min
  const tokensPerMinute =
    proxyCount * RATE_LIMIT_CONFIG.PROXY_TOKENS_PER_SECOND * 60;

  return {
    TOKENS_PER_MINUTE: tokensPerMinute,
    REFILL_RATE: tokensPerMinute / 60, // Convert to tokens per second
  };
}
