/**
 * Environment validation utilities for DeepLX
 * Validates required bindings and environment variables
 */

/**
 * Validate required environment bindings and variables
 * Ensures all necessary Cloudflare Workers bindings are available
 * @param env The environment object to validate
 * @returns Array of error messages (empty if validation passes)
 */
export function validateEnvironment(env: Env): string[] {
  const errors: string[] = [];

  if (!env.CACHE_KV) {
    errors.push("CACHE_KV binding is required");
  }

  if (!env.RATE_LIMIT_KV) {
    errors.push("RATE_LIMIT_KV binding is required");
  }

  // Optional environment variables are handled gracefully
  // PROXY_URLS is not required but recommended for production use

  return errors;
}

/**
 * Parse and validate proxy URLs from environment
 * Extracts valid proxy URLs from comma-separated environment variable
 * @param env The environment object containing proxy configuration
 * @returns Array of valid proxy URLs
 */
export function getProxyUrls(env: Env): string[] {
  if (!env.PROXY_URLS) {
    return [];
  }

  return env.PROXY_URLS.split(",")
    .map((url) => url.trim())
    .filter((url) => {
      try {
        // Basic URL validation for proxy endpoints
        if (url.startsWith("http://") || url.startsWith("https://")) {
          return true;
        }
        return false;
      } catch {
        // Invalid URL format, skip silently
        return false;
      }
    });
}
