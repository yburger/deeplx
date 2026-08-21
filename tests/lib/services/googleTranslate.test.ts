/**
 * Google Translate service integration tests
 */

import { beforeEach, describe, expect, it } from "@jest/globals";
import { translateWithGoogle } from "../../../src/lib/services/googleTranslate";

describe("Google Translate Service", () => {
  let mockEnv: any;

  beforeEach(() => {
    mockEnv = {
      // Mock environment for testing
    };
  });

  describe("translateWithGoogle", () => {
    it("should handle successful translation request", async () => {
      // Mock fetch for successful response
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([[["Hello", "Hola", null, null, 10]], null, "en"]),
        })
      ) as jest.Mock;

      const params = {
        text: "Hello",
        source_lang: "en",
        target_lang: "es",
      };

      const result = await translateWithGoogle(params, {
        env: mockEnv,
        clientIP: "127.0.0.1",
      });

      expect(result.code).toBe(200);
      expect(result.data).toBe("Hello");
      expect(result.source_lang).toBe("EN");
      expect(result.target_lang).toBe("ES");
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("translate.googleapis.com"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("q=Hello"),
          headers: expect.objectContaining({
            "User-Agent": expect.stringContaining("Mozilla"),
          }),
        })
      );
    });

    it("should handle API errors", async () => {
      // Mock fetch for error response
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        })
      ) as jest.Mock;

      const params = {
        text: "Hello",
        source_lang: "en",
        target_lang: "es",
      };

      const result = await translateWithGoogle(params, {
        env: mockEnv,
        clientIP: "127.0.0.1",
      });

      expect(result.code).toBe(500);
      expect(result.data).toBeNull();
    });

    it("should prefer an XDPL proxy when configured", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([[["Hola", "Hello", null, null, 10]], null, "en"]),
      });

      const result = await translateWithGoogle(
        { text: "Hello", source_lang: "en", target_lang: "es" },
        { env: { PROXY_URLS: "https://0.example.com/jsonrpc" } }
      );

      expect(result.code).toBe(200);
      expect(fetch).toHaveBeenCalledWith(
        "https://0.example.com/google/translate_a/single",
        expect.any(Object)
      );
    });

    it("should use the compatible host when the primary is unavailable", async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 429 })
        .mockResolvedValueOnce({ ok: false, status: 429 })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve([[["Hola", "Hello", null, null, 10]], null, "en"]),
        });

      const result = await translateWithGoogle({
        text: "Hello",
        source_lang: "en",
        target_lang: "es",
      });

      expect(result.code).toBe(200);
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(fetch).toHaveBeenLastCalledWith(
        expect.stringContaining("translate.google.com"),
        expect.objectContaining({
          body: expect.stringContaining("client=dict-chrome-ex"),
        })
      );
    });

    it("should handle network errors", async () => {
      // Mock fetch for network error
      global.fetch = jest.fn(() =>
        Promise.reject(new Error("Network error"))
      ) as jest.Mock;

      const params = {
        text: "Hello",
        source_lang: "en",
        target_lang: "es",
      };

      const result = await translateWithGoogle(params, {
        env: mockEnv,
        clientIP: "127.0.0.1",
      });

      expect(result.code).toBe(500);
      expect(result.data).toBeNull();
    });

    it("should handle empty translation response", async () => {
      // Mock fetch for empty response
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      ) as jest.Mock;

      const params = {
        text: "Hello",
        source_lang: "en",
        target_lang: "es",
      };

      const result = await translateWithGoogle(params, {
        env: mockEnv,
        clientIP: "127.0.0.1",
      });

      expect(result.code).toBe(500);
      expect(result.data).toBeNull();
    });
  });
});
