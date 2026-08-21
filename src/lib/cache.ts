/**
 * Two-level caching system: In-memory + Cloudflare KV
 * Provides fast access to cached translations with fallback to persistent storage
 */

/**
 * In-memory cache for fast access to recent translations
 */
const memoryCache = new Map<string, CacheEntry>();

/**
 * Cache configuration constants
 */
const CACHE_TTL = 3600; // 1 hour in seconds

/**
 * Generate a unique cache key for translation requests
 * Uses deterministic hashing to ensure consistent keys across requests
 * @param text The text to translate
 * @param sourceLang The source language code
 * @param targetLang The target language code
 * @returns A unique cache key string
 */

export function generateCacheKey(
  text: string,
  sourceLang: string,
  targetLang: string,
  provider?: string
): string {
  // Normalize language codes to uppercase for consistent caching
  const normalizedSourceLang =
    sourceLang === "auto" ? "auto" : sourceLang.toUpperCase();
  const normalizedTargetLang = targetLang.toUpperCase();
  const providerSuffix = provider ? `:${provider}` : "";
  const content = `${text}:${normalizedSourceLang}:${normalizedTargetLang}${providerSuffix}`;

  // Use crypto.subtle to generate a hash instead of btoa for Unicode safety
  try {
    // For environments that support crypto.subtle
    const encoder = new TextEncoder();
    const data = encoder.encode(content);

    // Create a simple hash using a deterministic method
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // Convert to positive number and then to base36 string
    const hashStr = Math.abs(hash).toString(36);

    // Add a prefix and ensure consistent length
    return `cache_${hashStr}_${normalizedSourceLang}_${normalizedTargetLang}`.substring(
      0,
      50
    );
  } catch (error) {
    // Fallback: use content directly with timestamp for uniqueness
    return `cache_${content}_${normalizedSourceLang}_${normalizedTargetLang}_${
      Date.now() % 10000
    }`.substring(0, 50);
  }
}

export async function getCachedTranslation(
  key: string,
  env: Env
): Promise<CacheEntry | null> {
  try {
    // Check in-memory cache first
    const memoryResult = memoryCache.get(key);
    if (
      memoryResult &&
      Date.now() - memoryResult.timestamp < CACHE_TTL * 1000
    ) {
      return memoryResult;
    }

    // Check KV cache with improved error handling
    try {
      const kvResult = (await env.CACHE_KV.get(
        key,
        "json"
      )) as CacheEntry | null;
      if (kvResult && Date.now() - kvResult.timestamp < CACHE_TTL * 1000) {
        // Store in memory cache for faster future access
        memoryCache.set(key, kvResult);
        return kvResult;
      }
    } catch (kvError) {
      console.error("Failed to get cached translation from KV:", kvError);
      // Continue without cache if KV fails
    }

    return null;
  } catch (error) {
    console.error("Cache retrieval failed:", error);
    return null;
  }
}

/**
 * Store translation in two-level cache system
 * Stores in both in-memory cache and KV storage for persistence
 * @param key The cache key to store under
 * @param entry The cache entry to store
 * @param env Environment bindings containing KV namespace
 * @returns Promise<void>
 */
export async function setCachedTranslation(
  key: string,
  entry: CacheEntry,
  env: Env
): Promise<void> {
  try {
    // Store in memory cache (this should always succeed)
    memoryCache.set(key, entry);

    // Store in KV cache (may fail, but don't let it break the response)
    try {
      await env.CACHE_KV.put(key, JSON.stringify(entry), {
        expirationTtl: CACHE_TTL,
      });
    } catch (kvError) {
      console.error("Failed to store cached translation in KV:", kvError);
      // Don't throw - the translation was successful, caching is just an optimization
    }
  } catch (error) {
    console.error("Cache storage failed:", error);
    // Don't throw - the translation was successful, caching is just an optimization
  }
}

/**
 * Clear the in-memory cache
 * Useful for testing or when memory needs to be freed
 * @returns void
 */
export function clearMemoryCache(): void {
  memoryCache.clear();
}
