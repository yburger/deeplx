/**
 * Tests for proxy management functionality
 */

import {
  generateBrowserFingerprint,
  getProxyEndpoints,
  selectProxy,
} from "../../src/lib/proxyManager";

describe("Proxy Manager Module", () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("generateBrowserFingerprint", () => {
    it("should generate browser-like headers", () => {
      const fingerprint = generateBrowserFingerprint();

      expect(fingerprint).toHaveProperty("User-Agent");
      expect(fingerprint).toHaveProperty("Accept");
      expect(fingerprint).toHaveProperty("Accept-Language");
      expect(fingerprint).toHaveProperty("Accept-Encoding");
      expect(fingerprint).toHaveProperty("DNT");
      expect(fingerprint).toHaveProperty("Connection");
      expect(fingerprint).toHaveProperty("Upgrade-Insecure-Requests");
    });

    it("should generate string header values", () => {
      const fingerprint = generateBrowserFingerprint();

      Object.values(fingerprint).forEach((value) => {
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      });
    });
  });

  describe("getProxyEndpoints", () => {
    it("should parse proxy URLs from environment", () => {
      const endpoints = getProxyEndpoints(mockEnv);

      expect(Array.isArray(endpoints)).toBe(true);
      expect(endpoints.length).toBe(2);
      expect(endpoints[0]).toHaveProperty("url");
    });

    it("should trim proxy URLs", () => {
      const endpoints = getProxyEndpoints({
        ...mockEnv,
        PROXY_URLS:
          " https://test1.example.com/jsonrpc , https://test2.example.com/jsonrpc ",
      });

      expect(endpoints).toEqual([
        { url: "https://test1.example.com/jsonrpc" },
        { url: "https://test2.example.com/jsonrpc" },
      ]);
    });

    it("should handle missing proxy URLs", () => {
      const envWithoutProxies = { ...mockEnv, PROXY_URLS: undefined };
      const endpoints = getProxyEndpoints(envWithoutProxies);

      expect(endpoints).toEqual([]);
    });
  });

  describe("selectProxy", () => {
    it("should select a proxy from available endpoints", async () => {
      const proxy = await selectProxy(mockEnv);

      expect(proxy).not.toBeNull();
      expect(proxy?.url).toMatch(/^https:\/\/test[12]\.example\.com\/jsonrpc$/);
    });

    it("should return null when no proxies are available", async () => {
      const envWithoutProxies = { ...mockEnv, PROXY_URLS: undefined };
      const proxy = await selectProxy(envWithoutProxies);

      expect(proxy).toBeNull();
    });
  });
});
