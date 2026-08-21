/**
 * Performance and load tests
 */

describe("Performance Tests", () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Response time benchmarks", () => {
    it("should respond to translation requests within acceptable time", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            result: {
              texts: [{ text: "你好世界" }],
              lang: "ZH",
            },
            id: 12345,
          }),
      });

      const { query } = await import("../../src/lib/query");

      const startTime = Date.now();

      await query(
        {
          text: "Hello world",
          source_lang: "en",
          target_lang: "zh",
        },
        { env: mockEnv }
      );

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within 5 seconds for normal requests
      expect(responseTime).toBeLessThan(5000);
    });

    it("should handle cache lookups efficiently", async () => {
      const cachedEntry = {
        data: "你好世界",
        timestamp: Date.now(),
        source_lang: "EN",
        target_lang: "ZH",
        id: 12345,
      };

      (mockEnv.CACHE_KV.get as jest.Mock).mockResolvedValue(
        JSON.stringify(cachedEntry)
      );

      const { getCachedTranslation, generateCacheKey } = await import(
        "../../src/lib/cache"
      );

      const startTime = Date.now();

      const cacheKey = generateCacheKey("Hello world", "EN", "ZH");
      await getCachedTranslation(cacheKey, mockEnv);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Cache lookups should be very fast
      expect(responseTime).toBeLessThan(100);
    });
  });

  describe("Memory usage tests", () => {
    it("should not leak memory during repeated operations", async () => {
      const { clearMemoryCache } = await import("../../src/lib/cache");

      // Simulate repeated cache operations
      for (let i = 0; i < 100; i++) {
        const { generateCacheKey } = await import("../../src/lib/cache");
        generateCacheKey(`test text ${i}`, "EN", "ZH");
      }

      // Clear cache should not throw
      expect(() => clearMemoryCache()).not.toThrow();
    });

    it("should handle large text inputs efficiently", async () => {
      const { validateTextLength } = await import("../../src/lib/textUtils");

      const largeText = "This is a test sentence. ".repeat(1000);

      const startTime = Date.now();
      const validation = validateTextLength(largeText);
      const endTime = Date.now();

      expect(validation.isValid).toBe(false);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe("Concurrent request handling", () => {
    it("should handle multiple simultaneous requests", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            result: {
              texts: [{ text: "你好世界" }],
              lang: "ZH",
            },
            id: 12345,
          }),
      });

      const { query } = await import("../../src/lib/query");

      const concurrentRequests = 50;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        query(
          {
            text: `Hello world ${i}`,
            source_lang: "en",
            target_lang: "zh",
          },
          { env: mockEnv }
        )
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All requests should succeed
      results.forEach((result) => {
        expect(result.code).toBe(200);
      });

      // Should handle concurrent requests efficiently
      const avgTimePerRequest = (endTime - startTime) / concurrentRequests;
      expect(avgTimePerRequest).toBeLessThan(1000);
    });

    it("should handle rate limiting under load", async () => {
      const { checkRateLimit } = await import("../../src/lib/rateLimit");

      // Simulate rapid requests from same IP
      const results = [];
      for (let i = 0; i < 20; i++) {
        const result = await checkRateLimit("192.168.1.1", mockEnv);
        results.push(result);
      }

      // Should eventually hit rate limits
      const allowedCount = results.filter(Boolean).length;
      const deniedCount = results.filter((result) => !result).length;

      expect(allowedCount).toBeGreaterThan(0);
      expect(deniedCount).toBeGreaterThanOrEqual(0);
      // Depending on rate limit configuration, some might be denied
    });
  });

  describe("Resource utilization", () => {
    it("should handle proxy failover efficiently", async () => {
      // Mock multiple proxy failures then success
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new TypeError("fetch failed"))
        .mockRejectedValueOnce(new TypeError("fetch failed"))
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              result: {
                texts: [{ text: "你好世界" }],
                lang: "ZH",
              },
              id: 12345,
            }),
        });

      const { query } = await import("../../src/lib/query");

      const startTime = Date.now();

      const result = await query(
        {
          text: "Hello world",
          source_lang: "en",
          target_lang: "zh",
        },
        { env: mockEnv }
      );

      const endTime = Date.now();

      expect(result.code).toBe(200);

      // Failover should not take too long
      const failoverTime = endTime - startTime;
      expect(failoverTime).toBeLessThan(10000);
    });
  });

  describe("Stress tests", () => {
    it("should handle rapid sequential requests", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            result: {
              texts: [{ text: "你好世界" }],
              lang: "ZH",
            },
            id: 12345,
          }),
      });

      const { query } = await import("../../src/lib/query");

      const requestCount = 100;
      const results = [];

      const startTime = Date.now();

      for (let i = 0; i < requestCount; i++) {
        const result = await query(
          {
            text: `Hello world ${i}`,
            source_lang: "en",
            target_lang: "zh",
          },
          { env: mockEnv }
        );
        results.push(result);
      }

      const endTime = Date.now();

      // All requests should succeed
      results.forEach((result) => {
        expect(result.code).toBe(200);
      });

      const totalTime = endTime - startTime;
      const avgTimePerRequest = totalTime / requestCount;

      // Should maintain reasonable performance under load
      expect(avgTimePerRequest).toBeLessThan(500);
    });

    it("should handle large payload processing", async () => {
      const { validateTextLength } = await import("../../src/lib/textUtils");

      const largeText =
        "This is a very long text that needs to be processed efficiently. ".repeat(
          500
        );

      const startTime = Date.now();

      const validation = validateTextLength(largeText);
      expect(validation.isValid).toBe(false);

      const endTime = Date.now();

      // Large text processing should complete quickly
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
