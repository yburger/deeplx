/**
 * Tests for types and response utilities
 */

import { createStandardResponse } from "../../src/lib/types";

describe("Types Module", () => {
  describe("createStandardResponse", () => {
    it("should create successful response", () => {
      const response = createStandardResponse(
        200,
        "Hello world",
        12345,
        "EN",
        "ZH"
      );

      expect(response.code).toBe(200);
      expect(response.data).toBe("Hello world");
      expect(response.id).toBe(12345);
      expect(response.source_lang).toBe("EN");
      expect(response.target_lang).toBe("ZH");
    });

    it("should create error response", () => {
      const response = createStandardResponse(400, null);

      expect(response.code).toBe(400);
      expect(response.data).toBeNull();
      expect(response.id).toBeGreaterThan(0);
      expect(response.source_lang).toBeNull();
      expect(response.target_lang).toBeNull();
    });

    it("should generate random ID when not provided", () => {
      const response1 = createStandardResponse(200, "test");
      const response2 = createStandardResponse(200, "test");

      expect(response1.id).toBeGreaterThan(0);
      expect(response2.id).toBeGreaterThan(0);
      expect(response1.id).not.toBe(response2.id);
    });

    it("should handle missing language parameters", () => {
      const response = createStandardResponse(200, "test", 12345);

      expect(response.source_lang).toBe("AUTO");
      expect(response.target_lang).toBe("EN");
    });

    it("should handle all parameters", () => {
      const response = createStandardResponse(
        200,
        "translated text",
        98765,
        "AUTO",
        "FR"
      );

      expect(response.code).toBe(200);
      expect(response.data).toBe("translated text");
      expect(response.id).toBe(98765);
      expect(response.source_lang).toBe("AUTO");
      expect(response.target_lang).toBe("FR");
    });

    it("should handle zero ID", () => {
      const response = createStandardResponse(200, "test", 0);

      expect(response.id).toBe(0);
    });

    it("should handle negative status codes", () => {
      const response = createStandardResponse(-1, null);

      expect(response.code).toBe(-1);
      expect(response.data).toBeNull();
      expect(response.source_lang).toBeNull();
      expect(response.target_lang).toBeNull();
    });

    it("should handle empty string data", () => {
      const response = createStandardResponse(200, "");

      expect(response.code).toBe(200);
      expect(response.data).toBe("");
    });

    it("should handle undefined data", () => {
      const response = createStandardResponse(200, undefined as any);

      expect(response.code).toBe(200);
      expect(response.data).toBeUndefined();
    });
  });
});
