/**
 * Input validation and sanitization utilities for DeepLX API
 * Provides comprehensive validation for translation requests
 */

import { PAYLOAD_LIMITS } from "./config";

/**
 * Configuration constants for validation
 */
const MAX_TEXT_LENGTH = PAYLOAD_LIMITS.MAX_TEXT_LENGTH;

/**
 * Result interface for validation operations
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedInput?: any;
}

/**
 * Validate a single translation request
 * Performs comprehensive validation on request structure and parameters
 * @param input The request input to validate
 * @returns ValidationResult - Validation result with errors and sanitized input
 */

export function validateTranslationRequest(input: any): ValidationResult {
  const errors: string[] = [];

  // Check if input is an object
  if (!input || typeof input !== "object") {
    return {
      isValid: false,
      errors: ["Request body must be a valid JSON object"],
    };
  }

  // Validate text field
  if (!input.text) {
    errors.push("Text field is required");
  } else if (typeof input.text !== "string") {
    errors.push("Text field must be a string");
  } else if (input.text.trim().length === 0) {
    errors.push("Text field cannot be empty");
  } else if (input.text.length > MAX_TEXT_LENGTH) {
    errors.push(
      `Text field exceeds maximum length of ${MAX_TEXT_LENGTH} characters`
    );
  }

  // Validate source_lang (basic format validation)
  if (input.source_lang && typeof input.source_lang !== "string") {
    errors.push("Source language must be a string");
  } else if (input.source_lang && input.source_lang.length < 2) {
    errors.push("Source language code is too short");
  }

  // Validate target_lang (required and basic format validation)
  if (!input.target_lang) {
    errors.push("Target language is required");
  } else if (typeof input.target_lang !== "string") {
    errors.push("Target language must be a string");
  } else if (input.target_lang.length < 2) {
    errors.push("Target language code is too short");
  } else if (input.target_lang.toLowerCase() === "auto") {
    errors.push("Target language cannot be 'auto'");
  }

  // Create sanitized input object
  const sanitizedInput = {
    text: typeof input.text === "string" ? input.text.trim() : "",
    source_lang:
      typeof input.source_lang === "string"
        ? input.source_lang.toLowerCase()
        : "auto",
    target_lang:
      typeof input.target_lang === "string"
        ? input.target_lang.toLowerCase()
        : "en",
  };

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedInput: errors.length === 0 ? sanitizedInput : undefined,
  };
}
