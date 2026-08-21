/**
 * Tests for rate limiting functionality
 */

import {
  checkRateLimit,
  delayRequest,
  getClientIP,
} from "../../src/lib/rateLimit";

describe("Rate Limit Module", () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getClientIP", () => {
    it("should extract IP from CF-Connecting-IP header", () => {
      const mockRequest = {
        headers: new Map([["CF-Connecting-IP", "192.168.1.1"]]),
      } as unknown as Request;

      expect(getClientIP(mockRequest)).toBe("192.168.1.1");
    });

    it("should extract IP from X-Forwarded-For header", () => {
      const mockRequest = {
        headers: new Map([["X-Forwarded-For", "192.168.1.1, 10.0.0.1"]]),
      } as unknown as Request;

      expect(getClientIP(mockRequest)).toBe("192.168.1.1");
    });

    it('should return "unknown" when no supported IP headers are present', () => {
      const mockRequest = {
        headers: new Map([["X-Real-IP", "192.168.1.1"]]),
      } as unknown as Request;

      expect(getClientIP(mockRequest)).toBe("unknown");
    });
  });

  describe("checkRateLimit", () => {
    it("should allow requests within rate limit", async () => {
      (mockEnv.RATE_LIMIT_KV.get as jest.Mock).mockResolvedValueOnce(null);

      await expect(checkRateLimit("192.168.1.1", mockEnv)).resolves.toBe(true);
    });

    it("should deny requests exceeding rate limit", async () => {
      const blockedClient = `blocked-client-${Date.now()}`;
      (mockEnv.RATE_LIMIT_KV.get as jest.Mock).mockResolvedValueOnce({
        tokens: 0,
        lastRefill: Date.now() + 1000,
      });

      await expect(checkRateLimit(blockedClient, mockEnv)).resolves.toBe(false);
    });

    it("should refill tokens over time", async () => {
      (mockEnv.RATE_LIMIT_KV.get as jest.Mock).mockResolvedValueOnce({
        tokens: 0,
        lastRefill: Date.now() - 60000,
      });

      await expect(checkRateLimit("192.168.1.3", mockEnv)).resolves.toBe(true);
    });

    it("should allow requests when KV read fails", async () => {
      (mockEnv.RATE_LIMIT_KV.get as jest.Mock).mockRejectedValueOnce(
        new Error("KV error")
      );

      await expect(checkRateLimit("192.168.1.4", mockEnv)).resolves.toBe(true);
    });
  });

  describe("delayRequest", () => {
    it("should delay for specified seconds", async () => {
      const startTime = Date.now();
      await delayRequest(0.1);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(90);
    });

    it("should handle zero delay", async () => {
      const timer = jest.spyOn(globalThis, "setTimeout");
      const startTime = Date.now();
      await delayRequest(0);
      const endTime = Date.now();

      expect(timer).toHaveBeenCalledTimes(1);
      expect(endTime - startTime).toBeLessThan(50);
    });
  });
});
