/**
 * Tests for text utilities functionality
 */

import {
  estimatePayloadSize,
  isPayloadTooLarge,
  validateTextLength,
} from "../../src/lib/textUtils";

describe("Text Utils Module", () => {
  describe("estimatePayloadSize", () => {
    it("should estimate payload size for simple text", () => {
      const size = estimatePayloadSize("Hello world", "en", "zh");

      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe("number");
    });

    it("should return larger size for longer text", () => {
      const shortSize = estimatePayloadSize("Hello", "en", "zh");
      const longSize = estimatePayloadSize(
        "Hello world this is a much longer text",
        "en",
        "zh"
      );

      expect(longSize).toBeGreaterThan(shortSize);
    });

    it("should handle empty text", () => {
      const size = estimatePayloadSize("", "en", "zh");

      expect(size).toBeGreaterThan(0); // Still has request structure overhead
    });

    it("should use default language codes", () => {
      const size1 = estimatePayloadSize("Hello world");
      const size2 = estimatePayloadSize("Hello world", "auto", "en");

      expect(size1).toBe(size2);
    });

    it("should handle special characters", () => {
      const size = estimatePayloadSize("Hello 世界 🌍", "en", "zh");

      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe("number");
    });
  });

  describe("isPayloadTooLarge", () => {
    it("should return false for normal text", () => {
      const result = isPayloadTooLarge("Hello world", "en", "zh");

      expect(result).toBe(false);
    });

    it("should return true for very large text", () => {
      const largeText = "a".repeat(100000);
      const result = isPayloadTooLarge(largeText, "en", "zh");

      expect(result).toBe(true);
    });

    it("should handle empty text", () => {
      const result = isPayloadTooLarge("", "en", "zh");

      expect(result).toBe(false);
    });

    it("should use default language codes", () => {
      const result = isPayloadTooLarge("Hello world");

      expect(result).toBe(false);
    });
  });

  describe("validateTextLength", () => {
    it("should validate normal text", () => {
      const result = validateTextLength("Hello world");

      expect(result.isValid).toBe(true);
      expect(result.suggestedAction).toBe("Text is within limits");
    });

    it("should reject empty text", () => {
      const result = validateTextLength("");

      expect(result.isValid).toBe(false);
      expect(result.suggestedAction).toBe("Text cannot be empty");
    });

    it("should reject whitespace-only text", () => {
      const result = validateTextLength("   ");

      expect(result.isValid).toBe(false);
      expect(result.suggestedAction).toBe("Text cannot be empty");
    });

    it("should reject long text", () => {
      const longText = "a".repeat(60000); // Exceeds MAX_TEXT_LENGTH
      const result = validateTextLength(longText);

      expect(result.isValid).toBe(false);
      expect(result.suggestedAction).toBe(
        "Text is too long. Please reduce text length."
      );
    });

    it("should handle text at the boundary", () => {
      const boundaryText = "a".repeat(5000); // Right at MAX_TEXT_LENGTH
      const result = validateTextLength(boundaryText);

      expect(result.isValid).toBe(true);
    });
  });
});
