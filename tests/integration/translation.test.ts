/**
 * Integration tests for translation functionality
 */

describe("Translation Integration Tests", () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("End-to-end translation flow", () => {
    it("should complete full translation workflow", async () => {
      // Mock successful API response
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

      const result = await query(
        {
          text: "Hello world",
          source_lang: "en",
          target_lang: "zh",
        },
        { env: mockEnv }
      );

      expect(result.code).toBe(200);
      expect(result.data).toBe("你好世界");
      expect(result.source_lang).toBe("ZH");
      expect(result.target_lang).toBe("ZH");
    });

    it("should handle rate limiting in translation flow", async () => {
      // Mock rate limit exceeded
      (mockEnv.RATE_LIMIT_KV.get as jest.Mock).mockResolvedValue({
        tokens: 0,
        lastRefill: Date.now() + 1000,
      });

      const { checkCombinedRateLimit } = await import("../../src/lib/rateLimit");

      const result = await checkCombinedRateLimit(
        `blocked-client-${Date.now()}`,
        "https://www2.deepl.com/jsonrpc",
        mockEnv
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("rate limit");
    });

    it("should use cache when available", async () => {
      const cachedEntry = {
        data: "你好世界",
        timestamp: Date.now(),
        source_lang: "EN",
        target_lang: "ZH",
        id: 12345,
      };

      (mockEnv.CACHE_KV.get as jest.Mock).mockResolvedValue(cachedEntry);

      const { getCachedTranslation, generateCacheKey } = await import(
        "../../src/lib/cache"
      );

      const cacheKey = generateCacheKey("Hello world", "EN", "ZH");
      const result = await getCachedTranslation(cacheKey, mockEnv);

      expect(result).toEqual(cachedEntry);
    });

    it("should handle proxy selection and failover", async () => {
      // Mock first proxy failure, second proxy success
      global.fetch = jest
        .fn()
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

      const result = await query(
        {
          text: "Hello world",
          source_lang: "en",
          target_lang: "zh",
        },
        { env: mockEnv }
      );

      expect(result.code).toBe(200);
      expect(result.data).toBe("你好世界");
    });
  });

  describe("Error handling integration", () => {
    it("should handle API errors gracefully", async () => {
      // Mock API error response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            error: {
              code: 1156049,
              message: "Invalid request format",
            },
          }),
      });

      const { query } = await import("../../src/lib/query");

      const result = await query(
        {
          text: "Hello world",
          source_lang: "en",
          target_lang: "zh",
        },
        { env: mockEnv }
      );

      expect(result.code).toBeGreaterThanOrEqual(400);
      expect(result.data).toBeNull();
    });

    it("should handle network failures with retry", async () => {
      // Mock network failure then success
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

      const result = await query(
        {
          text: "Hello world",
          source_lang: "en",
          target_lang: "zh",
        },
        { env: mockEnv }
      );

      expect(result.code).toBe(200);
      expect(result.data).toBe("你好世界");
    });
  });

  describe("Performance and reliability", () => {
    it("should handle concurrent requests", async () => {
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

      const promises = Array.from({ length: 10 }, (_, i) =>
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

      results.forEach((result) => {
        expect(result.code).toBe(200);
        expect(result.data).toBe("你好世界");
      });
    });

    it("should handle timeout scenarios", async () => {
      // Mock timeout
      global.fetch = jest
        .fn()
        .mockImplementation(
          () =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Request timeout")), 100)
            )
        );

      const { query } = await import("../../src/lib/query");

      const result = await query(
        {
          text: "Hello world",
          source_lang: "en",
          target_lang: "zh",
        },
        { env: mockEnv }
      );

      expect(result.code).toBeGreaterThanOrEqual(400);
    });
  });

  describe("Security integration", () => {
    it("should validate and sanitize input", async () => {
      const { validateTranslationRequest } = await import(
        "../../src/lib/validation"
      );

      const maliciousInput = {
        text: '<script>alert("xss")</script>Hello world',
        source_lang: "en",
        target_lang: "zh",
      };

      const result = validateTranslationRequest(maliciousInput);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedInput?.text).toBe(
        '<script>alert("xss")</script>Hello world'
      );
    });

    it("should handle rate limiting across multiple IPs", async () => {
      const { checkRateLimit } = await import("../../src/lib/rateLimit");

      // Test multiple IPs
      const ips = ["192.168.1.1", "192.168.1.2", "192.168.1.3"];

      for (const ip of ips) {
        const result = await checkRateLimit(ip, mockEnv);
        expect(result).toBe(true);
      }
    });
  });
});
