/**
 * Tests for query module - core translation functionality
 */

import {
  buildRequestBody,
  isRetryableDeepLError,
  normalizeDeepLErrorCode,
  normalizeLanguageCode,
  query,
} from "../../src/lib/query";

describe("Query Module", () => {
  let mockEnv: Env;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockEnv = createMockEnv();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("normalizeLanguageCode", () => {
    it("should normalize language codes to uppercase", () => {
      expect(normalizeLanguageCode("en")).toBe("EN");
      expect(normalizeLanguageCode("zh")).toBe("ZH");
      expect(normalizeLanguageCode("auto")).toBe("auto");
    });

    it("should handle language name mappings", () => {
      expect(normalizeLanguageCode("english")).toBe("EN");
      expect(normalizeLanguageCode("chinese")).toBe("ZH");
      expect(normalizeLanguageCode("spanish")).toBe("ES");
    });

    it("should handle edge cases", () => {
      expect(normalizeLanguageCode("")).toBe("auto");
      expect(normalizeLanguageCode("AUTO")).toBe("auto");
      expect(normalizeLanguageCode("unknown")).toBe("UNKNOWN");
    });
  });

  it("should normalize XDPL rate-limit error codes", () => {
    expect(normalizeDeepLErrorCode(1042911)).toBe(429);
    expect(normalizeDeepLErrorCode(1156049)).toBe(1156049);
  });

  it("should fall back immediately on rate limits", () => {
    expect(isRetryableDeepLError({ code: 429, upstream: true })).toBe(false);
    expect(isRetryableDeepLError({ code: 429 })).toBe(true);
    expect(isRetryableDeepLError({ status: 503 })).toBe(true);
  });

  describe("buildRequestBody", () => {
    it("should build valid request body", () => {
      const params = {
        text: "Hello world",
        source_lang: "en",
        target_lang: "zh",
      };

      const body = buildRequestBody(params);
      const parsed = JSON.parse(body);

      expect(parsed.jsonrpc).toBe("2.0");
      expect(parsed.method).toBe("LMT_handle_texts");
      expect(parsed.params.texts[0].text).toBe("Hello world");
      expect(parsed.params.lang.source_lang_user_selected).toBe("EN");
      expect(parsed.params.lang.target_lang).toBe("ZH");
    });

    it("should handle method spacing based on ID", () => {
      const params = {
        text: "Test text",
        source_lang: "en",
        target_lang: "zh",
      };

      const body = buildRequestBody(params);

      // Should contain either "method": or "method" :
      expect(body).toMatch(/"method"\s*:\s*"/);
    });

    it("should throw error for invalid parameters", () => {
      expect(() => buildRequestBody({} as any)).toThrow();
      expect(() => buildRequestBody({ text: "" } as any)).toThrow();
      expect(() => buildRequestBody({ text: "   " } as any)).toThrow();
    });

    it("should handle text length limits", () => {
      const longText = "a".repeat(10000);
      expect(() =>
        buildRequestBody({
          text: longText,
          source_lang: "en",
          target_lang: "zh",
        })
      ).toThrow(/Text too long/);
    });
  });

  describe("query function", () => {
    it("should return error for missing text", async () => {
      const result = await query({} as any);
      expect(result).toBeValidErrorResponse();
      expect(result.code).toBe(400);
    });

    it("should handle successful translation", async () => {
      const mockResponse = {
        result: {
          texts: [{ text: "你好世界" }],
          lang: "ZH",
        },
        id: 12345,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as any);

      const result = await query({
        text: "Hello world",
        source_lang: "en",
        target_lang: "zh",
      });

      expect(result).toBeValidTranslationResponse();
      expect(result.code).toBe(200);
      expect(result.data).toBe("你好世界");
    });

    it("should handle API errors", async () => {
      const mockErrorResponse = {
        error: {
          code: 1156049,
          message: "Invalid request format",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockErrorResponse),
      } as any);

      const result = await query({
        text: "Hello world",
        source_lang: "en",
        target_lang: "zh",
      });

      expect(result).toBeValidErrorResponse();
      expect(result.code).toBeGreaterThanOrEqual(400);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await query({
        text: "Hello world",
        source_lang: "en",
        target_lang: "zh",
      });

      expect(result).toBeValidErrorResponse();
    });

    it("should handle timeout errors", async () => {
      const timeoutError = new Error("Request timed out");
      timeoutError.name = "AbortError";
      mockFetch.mockRejectedValueOnce(timeoutError);

      const result = await query({
        text: "Hello world",
        source_lang: "en",
        target_lang: "zh",
      });

      expect(result).toBeValidErrorResponse();
    });

    it("should use proxy when provided", async () => {
      const mockResponse = {
        result: {
          texts: [{ text: "你好世界" }],
          lang: "ZH",
        },
        id: 12345,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as any);

      await query(
        {
          text: "Hello world",
          source_lang: "en",
          target_lang: "zh",
        },
        {
          proxyEndpoint: "https://custom-proxy.com/api",
        }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://custom-proxy.com/api",
        expect.any(Object)
      );
    });
  });
});
