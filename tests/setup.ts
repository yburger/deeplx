/**
 * Jest test setup file
 * Global test configuration and utilities
 */

const testGlobal = globalThis as typeof globalThis & {
  console: Console;
  createMockEnv?: () => Env;
  Request: typeof Request;
  Response: typeof Response;
};

// Mock global fetch if not available
if (!testGlobal.fetch) {
  testGlobal.fetch = jest.fn() as typeof fetch;
}

// Mock console methods to reduce noise in tests
testGlobal.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
testGlobal.createMockEnv = (): Env => ({
  CACHE_KV: {
    get: jest.fn().mockResolvedValue(null),
    put: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    list: jest.fn().mockResolvedValue({ keys: [], list_complete: true }),
  } as any,
  RATE_LIMIT_KV: {
    get: jest.fn().mockResolvedValue(null),
    put: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    list: jest.fn().mockResolvedValue({ keys: [], list_complete: true }),
  } as any,

  ANALYTICS: {
    writeDataPoint: jest.fn(),
  } as any,
  PROXY_URLS:
    "https://test1.example.com/jsonrpc,https://test2.example.com/jsonrpc",
  PROXY_WEIGHTS: "1,1",
  DEBUG_MODE: "false",
});

// Mock Request and Response for Cloudflare Workers environment
testGlobal.Request =
  testGlobal.Request ||
  class MockRequest {
    constructor(public url: string, public init?: RequestInit) {}
    json() {
      return Promise.resolve({});
    }
    text() {
      return Promise.resolve("");
    }
    headers = new Map();
  };

testGlobal.Response =
  testGlobal.Response ||
  class MockResponse {
    constructor(public body?: any, public init?: ResponseInit) {}
    json() {
      return Promise.resolve(this.body);
    }
    text() {
      return Promise.resolve(String(this.body));
    }
    ok = true;
    status = 200;
    headers = new Map();
  };

// Extend Jest matchers
declare global {
  var createMockEnv: () => Env;

  namespace jest {
    interface Matchers<R> {
      toBeValidTranslationResponse(): R;
      toBeValidErrorResponse(): R;
    }
  }
}

expect.extend({
  toBeValidTranslationResponse(received) {
    const pass =
      received &&
      typeof received.code === "number" &&
      (received.data !== undefined || received.code !== 200) &&
      typeof received.id === "number" &&
      typeof received.source_lang === "string" &&
      typeof received.target_lang === "string";

    return {
      message: () =>
        `expected ${JSON.stringify(
          received
        )} to be a valid translation response`,
      pass,
    };
  },

  toBeValidErrorResponse(received) {
    const pass =
      received &&
      typeof received.code === "number" &&
      received.code >= 400 &&
      received.data === null;

    return {
      message: () =>
        `expected ${JSON.stringify(received)} to be a valid error response`,
      pass,
    };
  },
});

export {};
