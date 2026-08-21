/**
 * Tests for retry logic functionality
 */

import {
  calculateSmartDelay,
  isRetryableError,
  retryWithBackoff,
} from "../../src/lib/retryLogic";

describe("Retry Logic Module", () => {
  describe("isRetryableError", () => {
    it("should identify retryable timeout and fetch errors", () => {
      const timeoutError = new Error("timeout");
      timeoutError.name = "AbortError";

      const fetchError = new TypeError("fetch failed");

      expect(isRetryableError(timeoutError)).toBe(true);
      expect(isRetryableError(fetchError)).toBe(true);
    });

    it("should identify retryable HTTP status codes", () => {
      const serverError = new Error("Server error");
      (serverError as { status?: number }).status = 500;

      const rateLimitError = new Error("Too many requests");
      (rateLimitError as { status?: number }).status = 429;

      expect(isRetryableError(serverError)).toBe(true);
      expect(isRetryableError(rateLimitError)).toBe(true);
    });

    it("should not retry non-retryable client errors", () => {
      const badRequest = new Error("Bad request");
      (badRequest as { status?: number }).status = 400;

      expect(isRetryableError(badRequest)).toBe(false);
      expect(isRetryableError(new Error("Generic error"))).toBe(false);
    });
  });

  describe("retryWithBackoff", () => {
    const defaultOptions = {
      maxRetries: 3,
      initialDelay: 10,
      backoffFactor: 2,
      isRetryable: isRetryableError,
    };

    it("should succeed on first try", async () => {
      const mockOperation = jest.fn().mockResolvedValue("success");

      await expect(
        retryWithBackoff(mockOperation, defaultOptions)
      ).resolves.toBe("success");
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it("should retry on retryable errors", async () => {
      const retryableError = new TypeError("fetch failed");
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce("success");

      await expect(
        retryWithBackoff(mockOperation, defaultOptions)
      ).resolves.toBe("success");
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it("should not retry non-retryable errors", async () => {
      const nonRetryableError = new Error("Bad request");
      (nonRetryableError as { status?: number }).status = 400;
      const mockOperation = jest.fn().mockRejectedValue(nonRetryableError);

      await expect(
        retryWithBackoff(mockOperation, defaultOptions)
      ).rejects.toThrow("Bad request");
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it("should exhaust all retries", async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValue(new TypeError("fetch failed"));

      await expect(
        retryWithBackoff(mockOperation, defaultOptions)
      ).rejects.toThrow("fetch failed");
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it("should use a custom retry predicate", async () => {
      const customError = new Error("Custom error");
      const mockOperation = jest.fn().mockRejectedValue(customError);
      const customIsRetryable = jest.fn().mockReturnValue(false);

      await expect(
        retryWithBackoff(mockOperation, {
          ...defaultOptions,
          isRetryable: customIsRetryable,
        })
      ).rejects.toThrow("Custom error");

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(customIsRetryable).toHaveBeenCalledWith(customError);
    });
  });

  describe("calculateSmartDelay", () => {
    it("should use longer delays for rate limit errors", () => {
      expect(calculateSmartDelay(0, true)).toBe(60000);
      expect(calculateSmartDelay(1, true)).toBeGreaterThan(60000);
    });

    it("should cap non-rate-limit delays", () => {
      expect(calculateSmartDelay(0, false)).toBe(1000);
      expect(calculateSmartDelay(10, false)).toBe(30000);
    });
  });
});
