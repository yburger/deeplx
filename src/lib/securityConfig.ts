/**
 * Security configuration for DeepLX API
 * Centralizes all security-related settings and policies
 */

/**
 * Security policy configuration
 */
export const SECURITY_CONFIG = {
  // Input validation limits
  MAX_INPUT_LENGTH: 30000,

  // Rate limiting
  STRICT_RATE_LIMITING: true,
  FAIL_SAFE_ON_ERROR: false, // Changed to false for better security

  // CORS settings
  CORS_ORIGINS: ["*"], // Restrict in production
  CORS_METHODS: ["GET", "POST", "OPTIONS"],
  CORS_HEADERS: ["Content-Type", "Authorization"],

  // Debug settings
  ENABLE_DEBUG_IN_PRODUCTION: false,
  SHOW_STACK_TRACES: false,
  LOG_CLIENT_IPS: true,

  // Headers
  SECURITY_HEADERS: {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'none'; object-src 'none';",
  },
};

/**
 * Validation patterns for different input types
 */
export const VALIDATION_PATTERNS = {
  // Language code validation (ISO 639-1/639-2)
  LANGUAGE_CODE: /^[a-z]{2,3}(-[A-Z]{2})?$/,

  // IP address validation
  IPV4: /^(\d{1,3}\.){3}\d{1,3}$/,
  IPV6: /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
};

/**
 * Error messages (generic to avoid information disclosure)
 */
export const SECURITY_ERRORS = {
  INVALID_INPUT: "Invalid input format",
  INPUT_TOO_LONG: "Input exceeds maximum length",
  RATE_LIMITED: "Rate limit exceeded",
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "Access forbidden",
  VALIDATION_FAILED: "Input validation failed",
};
