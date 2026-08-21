/**
 * Circuit breaker pattern implementation for upstream service protection
 * Prevents cascade failures by temporarily blocking requests to failing services
 */

/**
 * Circuit breaker state interface
 */
interface CircuitBreakerState {
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
}

/**
 * Circuit breaker configuration constants
 */
const FAILURE_THRESHOLD = 5; // Number of failures before opening circuit
const RECOVERY_TIMEOUT = 30000; // 30 seconds recovery period
const SUCCESS_THRESHOLD = 3; // Required successes to close circuit

/**
 * Circuit breaker implementation for service protection
 * Implements the circuit breaker pattern with three states: CLOSED, OPEN, HALF_OPEN
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = {
    state: "CLOSED",
    failureCount: 0,
    lastFailureTime: 0,
    successCount: 0,
  };

  /**
   * Execute operation with circuit breaker protection
   * Monitors operation success/failure and manages circuit state
   * @param operation The async operation to execute
   * @returns Promise<T> - Result of the operation
   * @throws Will throw if circuit is open or operation fails
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state.state === "OPEN") {
      if (Date.now() - this.state.lastFailureTime > RECOVERY_TIMEOUT) {
        this.state.state = "HALF_OPEN";
        this.state.successCount = 0;
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful operation
   * Updates state based on current circuit breaker state
   * @private
   */
  private onSuccess(): void {
    if (this.state.state === "HALF_OPEN") {
      this.state.successCount++;
      if (this.state.successCount >= SUCCESS_THRESHOLD) {
        this.state.state = "CLOSED";
        this.state.failureCount = 0;
      }
    } else if (this.state.state === "CLOSED") {
      this.state.failureCount = 0;
    }
  }

  /**
   * Handle failed operation
   * Updates failure count and potentially opens circuit
   * @private
   */
  private onFailure(): void {
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();

    if (this.state.failureCount >= FAILURE_THRESHOLD) {
      this.state.state = "OPEN";
    }
  }

  /**
   * Get current circuit breaker state
   * Returns a copy of the internal state for monitoring
   * @returns CircuitBreakerState - Current state information
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }
}

/**
 * Global circuit breaker instances per proxy URL
 */
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create circuit breaker instance for a proxy URL
 * Ensures one circuit breaker per proxy for proper isolation
 * @param proxyUrl - The proxy URL to get circuit breaker for
 * @returns CircuitBreaker - Circuit breaker instance for the proxy
 */
export function getCircuitBreaker(proxyUrl: string): CircuitBreaker {
  if (!circuitBreakers.has(proxyUrl)) {
    circuitBreakers.set(proxyUrl, new CircuitBreaker());
  }
  return circuitBreakers.get(proxyUrl)!;
}
