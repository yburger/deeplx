/**
 * Security middleware for DeepLX API
 * Provides security headers, CORS configuration, and request sanitization
 */

/**
 * Security headers configuration
 */
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'none'; object-src 'none';",
};

/**
 * CORS configuration
 */
const CORS_CONFIG = {
  "Access-Control-Allow-Origin": "*", // Consider restricting in production
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

/**
 * Add security headers to response
 * @param response The response object to modify
 * @returns Modified response with security headers
 */
export function addSecurityHeaders(response: any): any {
  const newHeaders = new Map(response.headers);

  // Add security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  // Add CORS headers for API endpoints
  Object.entries(CORS_CONFIG).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return {
    ...response,
    headers: newHeaders,
  };
}

/**
 * Handle CORS preflight requests
 * @param c Hono context
 * @returns CORS preflight response
 */
export function handleCORSPreflight(c: any) {
  return c.text("", 200, CORS_CONFIG);
}

/**
 * Validate language codes
 * @param langCode The language code to validate
 * @returns Original language code if valid, or null if invalid
 */
export function validateLanguageCode(langCode: string): string | null {
  if (typeof langCode !== "string") {
    return null;
  }

  // Check if language code matches expected pattern (alphanumeric and hyphens only)
  const normalized = langCode.toLowerCase().trim();

  if (normalized.length < 2 || normalized.length > 5) {
    return null;
  }

  // Only allow valid language code characters
  if (!/^[a-z0-9-]+$/.test(normalized)) {
    return null;
  }

  return normalized;
}

/**
 * Rate limit by IP with enhanced security
 * @param request The incoming request
 * @returns Validated client IP or null if suspicious
 */
export function getSecureClientIP(request: any): string | null {
  // Get IP from Cloudflare headers first (most trusted)
  const cfIP = request.headers.get("CF-Connecting-IP");
  if (cfIP && isValidIP(cfIP)) {
    return cfIP;
  }

  // Fallback to X-Forwarded-For (less trusted)
  const forwardedFor = request.headers.get("X-Forwarded-For");
  if (forwardedFor) {
    const firstIP = forwardedFor.split(",")[0]?.trim();
    if (firstIP && isValidIP(firstIP)) {
      return firstIP;
    }
  }

  return null; // Return null for suspicious requests
}

/**
 * Basic IP address validation
 * @param ip The IP address to validate
 * @returns True if IP appears valid
 */
function isValidIP(ip: string): boolean {
  // Basic IPv4 and IPv6 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}
