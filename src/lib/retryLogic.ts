/**
 * Exponential backoff retry logic for DeepLX operations
 * Provides robust error handling with configurable retry strategies
 */

import { delayRequest } from "./rateLimit";

/**
 * Retry options configuration interface
 */
export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  backoffFactor: number;
  isRetryable: (error: any) => boolean;
}

/**
 * Execute operation with exponential backoff retry strategy
 * Implements intelligent retry logic with configurable backoff timing
 * @param operation The async operation to retry
 * @param options Retry configuration options
 * @returns Promise<T> - Result of the successful operation
 * @throws Will throw the last error if all retries are exhausted
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxRetries, initialDelay, backoffFactor, isRetryable } = options;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      if (isRetryable(error)) {
        const delay = initialDelay * Math.pow(backoffFactor, attempt);
        // Use delayRequest for Cloudflare Workers compatibility
        await delayRequest(delay / 1000); // Convert to seconds
      } else {
        // Non-retryable error, fail immediately
        throw error;
      }
    }
  }

  // All retries exhausted, throw the last error
  throw lastError;
}

/**
 * Enhanced retry logic specifically for DeepL API rate limiting
 * Implements intelligent backoff with exponential delays for 429 errors
 * @param operation The operation to retry
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @returns Promise<T> - Result of the successful operation
 */
export async function retryWithRateLimit<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  const retryOptions: RetryOptions = {
    maxRetries,
    initialDelay: 2000, // Start with 2 seconds for rate limit errors
    backoffFactor: 2.5, // More aggressive backoff for rate limits
    isRetryable: (error: any) => {
      // Specifically retry on rate limit (429) and server errors
      if (error?.status === 429 || error?.code === 429) {
        return true;
      }
      if (error?.status >= 500 && error?.status < 600) {
        return true;
      }
      // Network errors
      if (
        error?.name === "AbortError" ||
        (error?.name === "TypeError" && error?.message?.includes("fetch"))
      ) {
        return true;
      }
      return false;
    },
  };

  return retryWithBackoff(operation, retryOptions);
}

/**
 * Smart delay calculation for rate limit scenarios
 * Implements recommended delays based on DeepL API documentation
 * @param attempt - Current retry attempt number (0-based)
 * @param isRateLimit - Whether this is specifically a rate limit error
 * @returns number - Delay in milliseconds
 */
export function calculateSmartDelay(
  attempt: number,
  isRateLimit: boolean = false
): number {
  if (isRateLimit) {
    // For rate limits, use longer delays as recommended in documentation
    // 60 seconds base delay with exponential backoff
    return Math.min(60000 * Math.pow(1.5, attempt), 300000); // Max 5 minutes
  } else {
    // For other errors, use standard exponential backoff
    return Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
  }
}

/**
 * Determine if an error is worth retrying
 * Analyzes error types and status codes to make retry decisions
 * @param error - The error object to analyze
 * @returns boolean - True if the error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Network or timeout errors that are typically transient
  if (
    error?.name === "AbortError" ||
    (error?.name === "TypeError" && error?.message?.includes("fetch"))
  ) {
    return true;
  }

  // HTTP status codes that indicate temporary failures
  if (error?.status) {
    // Retry on rate limiting, server errors, and timeouts
    return [408, 429, 500, 502, 503, 504].includes(error.status);
  }

  // DeepL API specific error codes that might be temporary
  if (error?.code) {
    return [429, 500, 502, 503, 504].includes(error.code);
  }

  return false;
}
