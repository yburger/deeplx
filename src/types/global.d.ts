// Global type definitions for DeepLX

declare global {
  interface Env {
    CACHE_KV: KVNamespace;
    RATE_LIMIT_KV: KVNamespace;
    ANALYTICS: AnalyticsEngineDataset;
    PROXY_URLS?: string;
    DEBUG_MODE?: string; // Added for debug endpoint control
  }

  interface ScheduledEvent {
    readonly cron: string;
    readonly scheduledTime: number;
    readonly type: "scheduled";
    waitUntil(promise: Promise<any>): void;
  }

  interface ExecutionContext {
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
  }
}

// Additional Worker types that might be missing
declare const AbortController: {
  prototype: AbortController;
  new (): AbortController;
};

declare interface AbortController {
  readonly signal: AbortSignal;
  abort(): void;
}

declare const AbortSignal: {
  prototype: AbortSignal;
  new (): AbortSignal;
  abort(): AbortSignal;
  timeout(milliseconds: number): AbortSignal;
};

declare interface AbortSignal extends EventTarget {
  readonly aborted: boolean;
  readonly reason: any;
  addEventListener(
    type: "abort",
    listener: (this: AbortSignal, ev: Event) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    type: "abort",
    listener: (this: AbortSignal, ev: Event) => any,
    options?: boolean | EventListenerOptions
  ): void;
}

export {};
