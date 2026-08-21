/**
 * Enhanced error handling and monitoring for DeepLX API
 * Provides standardized error processing, sanitization, and response formatting
 */

import { createStandardResponse } from "./types";

/**
 * Detailed error information interface
 */
export interface ErrorDetails {
  message: string;
  stack?: string;
  code?: number;
  status?: number;
  endpoint?: string;
  clientIP?: string;
  timestamp: number;
}

/**
 * Sanitized error details for public responses (removes sensitive information)
 */
export interface SanitizedErrorDetails {
  message: string;
  code?: number;
  status?: number;
  endpoint?: string;
  timestamp: number;
  // Note: Excludes stack traces and client IP for security
}

/**
 * Check if a given code is a valid HTTP status code
 * @param code The code to validate
 * @returns True if the code is a valid HTTP status code
 * @private
 */

function isValidHttpStatusCode(code: any): code is number {
  const numCode = Number(code);
  return (
    !isNaN(numCode) &&
    numCode >= 200 &&
    numCode <= 599 &&
    Number.isInteger(numCode)
  );
}

/**
 * Sanitize status code to ensure it's a valid HTTP status code
 * Maps common invalid codes to appropriate HTTP status codes
 * @param code The status code to sanitize
 * @returns A valid HTTP status code
 * @private
 */
function sanitizeStatusCode(code: any): number {
  // Try to convert to number
  const numCode = Number(code);

  // If it's a valid HTTP status code, use it
  if (isValidHttpStatusCode(numCode)) {
    return numCode;
  }

  // Map common invalid codes to appropriate HTTP status codes
  if (code === 5 || code === "5") {
    return 500; // Internal server error
  }

  // Default to 500 for any invalid status code
  return 500;
}

/**
 * Sanitize error message by removing potentially sensitive information
 * @param message The error message to sanitize
 * @returns The sanitized error message
 * @private
 */

function sanitizeErrorMessage(message: string): string {
  // Remove potentially sensitive information
  return message
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[IP]") // IP addresses
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL]") // Email addresses
    .replace(/\b[A-Fa-f0-9]{32,}\b/g, "[HASH]") // Potential hashes
    .substring(0, 500); // Limit message length
}

/**
 * Log error with structured format and sanitization
 * Removes sensitive information and provides detailed logging for debugging
 * @param error The error to log
 * @param context Optional context information about where the error occurred
 * @returns ErrorDetails - Detailed error information for internal use
 */
export function logError(
  error: any,
  context?: { endpoint?: string; clientIP?: string }
): ErrorDetails {
  const errorDetails: ErrorDetails = {
    message: sanitizeErrorMessage(
      error instanceof Error ? error.message : String(error)
    ),
    stack: error instanceof Error ? error.stack : undefined,
    code: error?.code,
    status: error?.status,
    endpoint: context?.endpoint,
    clientIP: context?.clientIP,
    timestamp: Date.now(),
  };

  // Log to console with structured format - don't log sensitive information
  const sanitizedDetails: SanitizedErrorDetails = {
    message: errorDetails.message,
    code: errorDetails.code,
    status: errorDetails.status,
    endpoint: errorDetails.endpoint,
    timestamp: errorDetails.timestamp,
  };

  console.error("DeepLX Error:", sanitizedDetails);

  return errorDetails;
}

/**
 * Create standardized error response for API endpoints
 * Provides consistent error response format across the app
 * @param error The error that occurred
 * @param context Optional context about where the error occurred
 * @returns Object containing the response data and HTTP status code
 */

export function createErrorResponse(
  error: any,
  context?: { endpoint?: string; clientIP?: string }
) {
  const errorDetails = logError(error, context);

  // Return appropriate HTTP status code with sanitization
  let httpStatus = 500;
  if (errorDetails.status) {
    httpStatus = sanitizeStatusCode(errorDetails.status);
  } else if (errorDetails.code) {
    httpStatus = sanitizeStatusCode(errorDetails.code);
  }

  // Import createStandardResponse from types

  return {
    response: createStandardResponse(httpStatus, null),
    httpStatus,
  };
}

export function isNetworkError(error: any): boolean {
  return (
    (error?.name === "TypeError" && error?.message?.includes("fetch")) ||
    error?.name === "AbortError" ||
    error?.message?.includes("network") ||
    error?.message?.includes("timeout")
  );
}

export function isRateLimitError(error: any): boolean {
  return error?.status === 429 || error?.code === 429;
}

export function isServerError(error: any): boolean {
  const status = error?.status || error?.code;
  return status >= 500 && status < 600;
}

export function isPayloadTooLargeError(error: any): boolean {
  return (
    error?.status === 413 ||
    error?.code === 413 ||
    error?.message?.includes("Payload Too Large") ||
    error?.message?.includes("payload too large")
  );
}

/**
 * Enhanced rate limit error handling
 * Provides specific handling for 429 errors with retry-after headers
 * @param error - The error object that may contain rate limit information
 * @returns Enhanced error with retry suggestions
 */
export function enhanceRateLimitError(error: any): any {
  if (isRateLimitError(error)) {
    const enhancedError = { ...error };

    // Add helpful suggestions for rate limit errors
    enhancedError.suggestions = [
      "Wait 60 seconds before retrying",
      "Reduce request frequency",
      "Implement exponential backoff",
    ];

    // Add retry-after hint (DeepL typically requires 60+ seconds)
    enhancedError.retryAfter = 60; // seconds

    return enhancedError;
  }

  return error;
}
