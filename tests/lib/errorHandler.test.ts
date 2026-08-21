/**
 * Tests for error handling functionality
 */

import { createErrorResponse } from "../../src/lib/errorHandler";

describe("Error Handler Module", () => {
  describe("createErrorResponse", () => {
    it("should handle generic errors", () => {
      const error = new Error("Generic error message");
      const result = createErrorResponse(error);

      expect(result.response.code).toBeGreaterThanOrEqual(400);
      expect(result.response.data).toBeNull();
      expect(result.httpStatus).toBeGreaterThanOrEqual(400);
    });

    it("should handle errors with status codes", () => {
      const error = new Error("Bad request");
      (error as any).status = 400;

      const result = createErrorResponse(error);

      expect(result.response.code).toBe(400);
      expect(result.httpStatus).toBe(400);
    });

    it("should handle errors with code property", () => {
      const error = new Error("Rate limit exceeded");
      (error as any).code = 429;

      const result = createErrorResponse(error);

      expect(result.response.code).toBe(429);
      expect(result.httpStatus).toBe(429);
    });

    it("should handle timeout errors", () => {
      const error = new Error("Request timeout after 30 seconds");
      (error as any).status = 408;

      const result = createErrorResponse(error);

      expect(result.response.code).toBe(408);
      expect(result.httpStatus).toBe(408);
    });

    it("should handle network errors", () => {
      const error = new Error("Network error");

      const result = createErrorResponse(error);

      expect(result.response.code).toBeGreaterThanOrEqual(500);
      expect(result.httpStatus).toBeGreaterThanOrEqual(500);
    });

    it("should handle DeepL API errors", () => {
      const error = new Error(
        "DeepL API error: Invalid request format (Code: 1156049)"
      );
      (error as any).code = 1156049;

      const result = createErrorResponse(error);

      expect(result.response.code).toBe(500);
      expect(result.httpStatus).toBe(500);
    });

    it("should include context information", () => {
      const error = new Error("Test error");
      const context = {
        endpoint: "/translate",
        clientIP: "192.168.1.1",
      };

      const result = createErrorResponse(error, context);

      expect(result.response.code).toBeGreaterThanOrEqual(400);
      expect(result.response.data).toBeNull();
    });

    it("should handle non-Error objects", () => {
      const result1 = createErrorResponse("String error");
      expect(result1.response.code).toBeGreaterThanOrEqual(400);

      const result2 = createErrorResponse({ message: "Object error" });
      expect(result2.response.code).toBeGreaterThanOrEqual(400);

      const result3 = createErrorResponse(null);
      expect(result3.response.code).toBeGreaterThanOrEqual(400);
    });

    it("should handle rate limiting errors specifically", () => {
      const error = new Error("Rate limit exceeded");
      (error as any).code = 429;

      const result = createErrorResponse(error);

      expect(result.response.code).toBe(429);
      expect(result.httpStatus).toBe(429);
    });

    it("should handle server errors", () => {
      const error = new Error("Internal server error");
      (error as any).status = 500;

      const result = createErrorResponse(error);

      expect(result.response.code).toBe(500);
      expect(result.httpStatus).toBe(500);
    });

    it("should handle authentication errors", () => {
      const error = new Error("Unauthorized");
      (error as any).status = 401;

      const result = createErrorResponse(error);

      expect(result.response.code).toBe(401);
      expect(result.httpStatus).toBe(401);
    });

    it("should handle payload too large errors", () => {
      const error = new Error("Request payload too large");
      (error as any).status = 413;

      const result = createErrorResponse(error);

      expect(result.response.code).toBe(413);
      expect(result.httpStatus).toBe(413);
    });

    it("should provide default error when no message available", () => {
      const error = new Error();

      const result = createErrorResponse(error);

      expect(result.response.code).toBeGreaterThanOrEqual(400);
      expect(result.response.data).toBeNull();
    });
  });
});
