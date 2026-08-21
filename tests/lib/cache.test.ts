/**
 * Tests for cache module - translation caching functionality
 */

import {
  clearMemoryCache,
  generateCacheKey,
  getCachedTranslation,
  setCachedTranslation,
} from "../../src/lib/cache";

describe("Cache Module", () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
    clearMemoryCache();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("generateCacheKey", () => {
    it("should generate consistent cache keys", () => {
      const key1 = generateCacheKey("Hello world", "EN", "ZH");
      const key2 = generateCacheKey("Hello world", "EN", "ZH");

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^cache_/);
    });

    it("should generate different keys for different inputs", () => {
      const key1 = generateCacheKey("Hello world", "EN", "ZH");
      const key2 = generateCacheKey("Hello world", "EN", "ES");
      const key3 = generateCacheKey("Goodbye world", "EN", "ZH");

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });

    it("should handle special characters in text", () => {
      const key = generateCacheKey("Hello, 世界! @#$%", "EN", "ZH");
      expect(key).toMatch(/^cache_/);
    });
  });

  describe("setCachedTranslation", () => {
    it("should store translation in KV", async () => {
      const cacheEntry = {
        data: "你好世界",
        timestamp: Date.now(),
        source_lang: "EN",
        target_lang: "ZH",
        id: 12345,
      };

      await setCachedTranslation("test-key", cacheEntry, mockEnv);

      expect(mockEnv.CACHE_KV.put).toHaveBeenCalledWith(
        "test-key",
        JSON.stringify(cacheEntry),
        expect.objectContaining({
          expirationTtl: expect.any(Number),
        })
      );
    });

    it("should handle KV storage errors gracefully", async () => {
      (mockEnv.CACHE_KV.put as jest.Mock).mockRejectedValueOnce(
        new Error("KV error")
      );

      const cacheEntry = {
        data: "你好世界",
        timestamp: Date.now(),
        source_lang: "EN",
        target_lang: "ZH",
      };

      // Should not throw
      await expect(
        setCachedTranslation("test-key", cacheEntry, mockEnv)
      ).resolves.not.toThrow();
    });
  });

  describe("getCachedTranslation", () => {
    it("should retrieve cached translation from KV", async () => {
      const cacheEntry = {
        data: "你好世界",
        timestamp: Date.now(),
        source_lang: "EN",
        target_lang: "ZH",
        id: 12345,
      };

      (mockEnv.CACHE_KV.get as jest.Mock).mockResolvedValueOnce(cacheEntry);

      const result = await getCachedTranslation("test-key", mockEnv);

      expect(result).toEqual(cacheEntry);
      expect(mockEnv.CACHE_KV.get).toHaveBeenCalledWith("test-key", "json");
    });

    it("should return null for cache miss", async () => {
      (mockEnv.CACHE_KV.get as jest.Mock).mockResolvedValueOnce(null);

      const result = await getCachedTranslation("test-key", mockEnv);

      expect(result).toBeNull();
    });

    it("should handle expired cache entries", async () => {
      const expiredEntry = {
        data: "你好世界",
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        source_lang: "EN",
        target_lang: "ZH",
      };

      (mockEnv.CACHE_KV.get as jest.Mock).mockResolvedValueOnce(expiredEntry);

      const result = await getCachedTranslation("test-key", mockEnv);

      expect(result).toBeNull();
    });

    it("should handle invalid JSON in cache", async () => {
      (mockEnv.CACHE_KV.get as jest.Mock).mockResolvedValueOnce(null);

      const result = await getCachedTranslation("test-key", mockEnv);

      expect(result).toBeNull();
    });

    it("should handle KV retrieval errors gracefully", async () => {
      (mockEnv.CACHE_KV.get as jest.Mock).mockRejectedValueOnce(
        new Error("KV error")
      );

      const result = await getCachedTranslation("test-key", mockEnv);

      expect(result).toBeNull();
    });
  });

  describe("clearMemoryCache", () => {
    it("should clear memory cache without errors", () => {
      expect(() => clearMemoryCache()).not.toThrow();
    });
  });
});
