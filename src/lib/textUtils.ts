/**
 * Text processing utilities for handling large payloads
 * Provides text chunking and validation to prevent 413 errors
 */

import { PAYLOAD_LIMITS } from "./config";

/**
 * Estimate the payload size for a given text
 * @param text The text to estimate
 * @param sourceLang Source language
 * @param targetLang Target language
 * @returns Estimated payload size in bytes
 */
export function estimatePayloadSize(
  text: string,
  sourceLang: string = "auto",
  targetLang: string = "en"
): number {
  // Create a sample request structure to estimate size
  const sampleRequest = {
    jsonrpc: "2.0",
    method: "LMT_handle_texts",
    id: 123456789,
    params: {
      texts: [{ text, requestAlternatives: 0 }],
      timestamp: Date.now(),
      splitting: "newlines",
      lang: {
        source_lang_user_selected: sourceLang,
        target_lang: targetLang,
      },
    },
  };

  // Use a simple byte estimation (roughly accurate for UTF-8)
  const jsonString = JSON.stringify(sampleRequest);
  return jsonString.length * 1.2; // Add 20% buffer for formatting variations
}

/**
 * Check if text would create a payload that's too large
 * @param text The text to check
 * @param sourceLang Source language
 * @param targetLang Target language
 * @returns true if payload would be too large
 */
export function isPayloadTooLarge(
  text: string,
  sourceLang: string = "auto",
  targetLang: string = "en"
): boolean {
  const estimatedSize = estimatePayloadSize(text, sourceLang, targetLang);
  return estimatedSize > PAYLOAD_LIMITS.MAX_REQUEST_SIZE;
}

/**
 * Validate text length and suggest appropriate action
 * @param text The text to validate
 * @returns Validation result with suggestions
 */
export function validateTextLength(text: string): {
  isValid: boolean;
  suggestedAction: string;
} {
  const trimmedText = text.trim();

  if (trimmedText.length === 0) {
    return {
      isValid: false,
      suggestedAction: "Text cannot be empty",
    };
  }

  if (trimmedText.length <= PAYLOAD_LIMITS.MAX_TEXT_LENGTH) {
    return {
      isValid: true,
      suggestedAction: "Text is within limits",
    };
  }

  return {
    isValid: false,
    suggestedAction: "Text is too long. Please reduce text length.",
  };
}
