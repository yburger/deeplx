/**
 * Tests for validation functionality
 */

import { validateTranslationRequest } from "../../src/lib/validation";

describe("Validation Module", () => {
  describe("validateTranslationRequest", () => {
    it("should validate correct translation request", () => {
      const input = {
        text: "Hello world",
        source_lang: "en",
        target_lang: "zh",
      };

      const result = validateTranslationRequest(input);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedInput).toEqual({
        text: "Hello world",
        source_lang: "en",
        target_lang: "zh",
      });
    });

    it("should handle missing text field", () => {
      const input = {
        target_lang: "zh",
      };

      const result = validateTranslationRequest(input);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Text field is required");
    });

    it("should handle empty text field", () => {
      const input = {
        text: "   ",
        target_lang: "zh",
      };

      const result = validateTranslationRequest(input);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Text field cannot be empty");
    });

    it("should handle text that is too long", () => {
      const input = {
        text: "a".repeat(60000), // Exceeds MAX_TEXT_LENGTH
        target_lang: "zh",
      };

      const result = validateTranslationRequest(input);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((error) => error.includes("exceeds maximum length"))
      ).toBe(true);
    });

    it("should handle non-string text field", () => {
      const input = {
        text: 123,
        target_lang: "zh",
      };

      const result = validateTranslationRequest(input);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Text field must be a string");
    });

    it("should handle missing target language", () => {
      const input = {
        text: "Hello world",
      };

      const result = validateTranslationRequest(input);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Target language is required");
    });

    it("should handle auto as target language", () => {
      const input = {
        text: "Hello world",
        target_lang: "auto",
      };

      const result = validateTranslationRequest(input);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Target language cannot be 'auto'");
    });

    it("should handle invalid source language", () => {
      const input = {
        text: "Hello world",
        source_lang: "x",
        target_lang: "zh",
      };

      const result = validateTranslationRequest(input);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Source language code is too short");
    });

    it("should handle non-string language codes", () => {
      const input = {
        text: "Hello world",
        source_lang: 123,
        target_lang: 456,
      };

      const result = validateTranslationRequest(input);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Source language must be a string");
      expect(result.errors).toContain("Target language must be a string");
    });

    it("should handle null input", () => {
      const result = validateTranslationRequest(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Request body must be a valid JSON object"
      );
    });

    it("should handle non-object input", () => {
      const result = validateTranslationRequest("string input");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Request body must be a valid JSON object"
      );
    });

    it("should sanitize input correctly", () => {
      const input = {
        text: "  Hello world  ",
        source_lang: "EN",
        target_lang: "ZH",
      };

      const result = validateTranslationRequest(input);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedInput).toEqual({
        text: "Hello world",
        source_lang: "en",
        target_lang: "zh",
      });
    });

    it("should use defaults for missing optional fields", () => {
      const input = {
        text: "Hello world",
        target_lang: "zh",
      };

      const result = validateTranslationRequest(input);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedInput?.source_lang).toBe("auto");
    });
  });
});
