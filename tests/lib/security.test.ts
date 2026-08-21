/**
 * Tests for security functionality
 */

import {
  addSecurityHeaders,
  getSecureClientIP,
  handleCORSPreflight,
  validateLanguageCode,
} from "../../src/lib/security";

describe("Security Module", () => {
  describe("addSecurityHeaders", () => {
    it("should add security headers to response", () => {
      const mockResponse = {
        headers: new Map(),
      };

      const result = addSecurityHeaders(mockResponse);

      expect(result.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(result.headers.get("X-Frame-Options")).toBe("DENY");
      expect(result.headers.get("X-XSS-Protection")).toBe("1; mode=block");
      expect(result.headers.get("Referrer-Policy")).toBe(
        "strict-origin-when-cross-origin"
      );
      expect(result.headers.get("Content-Security-Policy")).toContain(
        "default-src 'self'"
      );
    });

    it("should add CORS headers to response", () => {
      const mockResponse = {
        headers: new Map(),
      };

      const result = addSecurityHeaders(mockResponse);

      expect(result.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(result.headers.get("Access-Control-Allow-Methods")).toBe(
        "GET, POST, OPTIONS"
      );
      expect(result.headers.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type, Authorization"
      );
      expect(result.headers.get("Access-Control-Max-Age")).toBe("86400");
    });

    it("should preserve existing headers", () => {
      const mockResponse = {
        headers: new Map([["Custom-Header", "custom-value"]]),
      };

      const result = addSecurityHeaders(mockResponse);

      expect(result.headers.get("Custom-Header")).toBe("custom-value");
      expect(result.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });
  });

  describe("handleCORSPreflight", () => {
    it("should return CORS preflight response", () => {
      const mockContext = {
        text: jest.fn().mockReturnValue("preflight response"),
      };

      const result = handleCORSPreflight(mockContext);

      expect(mockContext.text).toHaveBeenCalledWith(
        "",
        200,
        expect.objectContaining({
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        })
      );
    });
  });

  describe("validateLanguageCode", () => {
    it("should validate correct language codes", () => {
      expect(validateLanguageCode("en")).toBe("en");
      expect(validateLanguageCode("zh")).toBe("zh");
      expect(validateLanguageCode("EN")).toBe("en");
      expect(validateLanguageCode("zh-CN")).toBe("zh-cn");
      expect(validateLanguageCode("pt-BR")).toBe("pt-br");
    });

    it("should reject invalid language codes", () => {
      expect(validateLanguageCode("")).toBeNull();
      expect(validateLanguageCode("a")).toBeNull();
      expect(validateLanguageCode("toolong")).toBeNull();
      expect(validateLanguageCode("en@")).toBeNull();
      expect(validateLanguageCode("en_US")).toBeNull();
      expect(validateLanguageCode("123")).toBe("123"); // Numbers are allowed
    });

    it("should handle non-string inputs", () => {
      expect(validateLanguageCode(null as any)).toBeNull();
      expect(validateLanguageCode(undefined as any)).toBeNull();
      expect(validateLanguageCode(123 as any)).toBeNull();
      expect(validateLanguageCode({} as any)).toBeNull();
    });

    it("should trim whitespace", () => {
      expect(validateLanguageCode("  en  ")).toBe("en");
      expect(validateLanguageCode("\ten\n")).toBe("en");
    });
  });

  describe("getSecureClientIP", () => {
    it("should extract IP from CF-Connecting-IP header", () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockImplementation((header) => {
            if (header === "CF-Connecting-IP") return "192.168.1.1";
            return null;
          }),
        },
      };

      const ip = getSecureClientIP(mockRequest);
      expect(ip).toBe("192.168.1.1");
    });

    it("should extract IP from X-Forwarded-For header", () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockImplementation((header) => {
            if (header === "X-Forwarded-For") return "192.168.1.1, 10.0.0.1";
            return null;
          }),
        },
      };

      const ip = getSecureClientIP(mockRequest);
      expect(ip).toBe("192.168.1.1");
    });

    it("should prioritize CF-Connecting-IP over X-Forwarded-For", () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockImplementation((header) => {
            if (header === "CF-Connecting-IP") return "192.168.1.1";
            if (header === "X-Forwarded-For") return "10.0.0.1";
            return null;
          }),
        },
      };

      const ip = getSecureClientIP(mockRequest);
      expect(ip).toBe("192.168.1.1");
    });

    it("should return null for invalid IPs", () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockImplementation((header) => {
            if (header === "CF-Connecting-IP") return "invalid-ip";
            return null;
          }),
        },
      };

      const ip = getSecureClientIP(mockRequest);
      expect(ip).toBeNull();
    });

    it("should return null when no IP headers present", () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue(null),
        },
      };

      const ip = getSecureClientIP(mockRequest);
      expect(ip).toBeNull();
    });

    it("should handle IPv6 addresses", () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockImplementation((header) => {
            if (header === "CF-Connecting-IP")
              return "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
            return null;
          }),
        },
      };

      const ip = getSecureClientIP(mockRequest);
      expect(ip).toBe("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
    });
  });
});
