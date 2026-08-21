/**
 * Tests for circuit breaker functionality
 */

import {
  CircuitBreaker,
  getCircuitBreaker,
} from "../../src/lib/circuitBreaker";

describe("Circuit Breaker Module", () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker();
  });

  describe("CircuitBreaker", () => {
    it("should start in CLOSED state", () => {
      const state = circuitBreaker.getState();
      expect(state.state).toBe("CLOSED");
      expect(state.failureCount).toBe(0);
      expect(state.successCount).toBe(0);
    });

    it("should execute successful operations", async () => {
      const mockOperation = jest.fn().mockResolvedValue("success");

      const result = await circuitBreaker.execute(mockOperation);

      expect(result).toBe("success");
      expect(mockOperation).toHaveBeenCalledTimes(1);

      const state = circuitBreaker.getState();
      expect(state.successCount).toBe(0);
    });

    it("should handle failed operations", async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error("failure"));

      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        "failure"
      );

      const state = circuitBreaker.getState();
      expect(state.failureCount).toBe(1);
    });

    it("should open circuit after failure threshold", async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error("failure"));

      // Trigger multiple failures to open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (e) {
          // Expected to fail
        }
      }

      const state = circuitBreaker.getState();
      expect(state.state).toBe("OPEN");
    });

    it("should reject requests when circuit is OPEN", async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error("failure"));

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (e) {
          // Expected to fail
        }
      }

      // Now circuit should be open and reject immediately
      const mockNewOperation = jest.fn().mockResolvedValue("success");

      await expect(circuitBreaker.execute(mockNewOperation)).rejects.toThrow(
        "Circuit breaker is OPEN"
      );
      expect(mockNewOperation).not.toHaveBeenCalled();
    });

    it("should transition to HALF_OPEN after timeout", async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error("failure"));

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (e) {
          // Expected to fail
        }
      }

      // Manually set last failure time to simulate timeout
      (circuitBreaker as any).state.lastFailureTime = Date.now() - 61000; // 61 seconds ago

      const mockNewOperation = jest.fn().mockResolvedValue("success");
      const result = await circuitBreaker.execute(mockNewOperation);

      expect(result).toBe("success");
      const state = circuitBreaker.getState();
      expect(state.state).toBe("HALF_OPEN");
      expect(state.successCount).toBe(1);
    });

    it("should reset failure count on success", async () => {
      const mockFailOperation = jest
        .fn()
        .mockRejectedValue(new Error("failure"));
      const mockSuccessOperation = jest.fn().mockResolvedValue("success");

      // Cause some failures
      try {
        await circuitBreaker.execute(mockFailOperation);
      } catch (e) {
        // Expected
      }

      let state = circuitBreaker.getState();
      expect(state.failureCount).toBe(1);

      // Now succeed
      await circuitBreaker.execute(mockSuccessOperation);

      state = circuitBreaker.getState();
      expect(state.failureCount).toBe(0);
      expect(state.successCount).toBe(0);
    });
  });

  describe("getCircuitBreaker", () => {
    it("should return same instance for same proxy URL", () => {
      const cb1 = getCircuitBreaker("https://proxy1.com");
      const cb2 = getCircuitBreaker("https://proxy1.com");

      expect(cb1).toBe(cb2);
    });

    it("should return different instances for different proxy URLs", () => {
      const cb1 = getCircuitBreaker("https://proxy1.com");
      const cb2 = getCircuitBreaker("https://proxy2.com");

      expect(cb1).not.toBe(cb2);
    });

    it("should handle invalid URLs", () => {
      const cb = getCircuitBreaker("invalid-url");
      expect(cb).toBeInstanceOf(CircuitBreaker);
    });
  });
});
