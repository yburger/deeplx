/**
 * Performance monitoring and optimization utilities for DeepLX
 * Provides request tracking, metrics collection, and performance analysis
 */

/**
 * Performance metrics interface for request tracking
 */
export interface PerformanceMetrics {
  requestId: string;
  endpoint: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  cacheHit: boolean;
  proxyUsed: boolean;
  rateLimited: boolean;
  retryCount: number;
  success: boolean;
}

/**
 * In-memory metrics storage
 */
const metrics: PerformanceMetrics[] = [];

/**
 * Maximum number of metrics to keep in memory
 */
const MAX_METRICS = 1000; // Keep only recent metrics

/**
 * Start performance tracking for a request
 * Creates a new performance tracking entry with unique ID
 * @param endpoint The API endpoint being called
 * @returns Unique request ID for tracking
 */
export function startPerformanceTracking(endpoint: string): string {
  // Generate UUID in Workers-compatible way
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  metrics.push({
    requestId,
    endpoint,
    startTime: Date.now(),
    cacheHit: false,
    proxyUsed: false,
    rateLimited: false,
    retryCount: 0,
    success: false,
  });

  // Clean up old metrics to prevent memory leaks
  if (metrics.length > MAX_METRICS) {
    metrics.splice(0, metrics.length - MAX_METRICS);
  }

  return requestId;
}

/**
 * Update performance metrics for a tracked request
 * Allows partial updates to existing metrics entries
 * @param requestId The unique request ID to update
 * @param updates Partial metrics object with values to update
 * @returns void
 */
export function updatePerformanceMetrics(
  requestId: string,
  updates: Partial<PerformanceMetrics>
): void {
  const metric = metrics.find((m) => m.requestId === requestId);
  if (metric) {
    Object.assign(metric, updates);
  }
}

/**
 * End performance tracking for a request
 * Finalizes metrics collection and calculates duration
 * @param requestId The unique request ID to finalize
 * @param success Whether the request was successful
 * @returns void
 */
export function endPerformanceTracking(
  requestId: string,
  success: boolean
): void {
  const metric = metrics.find((m) => m.requestId === requestId);
  if (metric) {
    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.success = success;
  }
}

/**
 * Generate aggregated performance statistics
 * Analyzes recent metrics to provide insights into system performance
 * @returns Performance statistics object or null if no metrics available
 */
export function getPerformanceStats() {
  if (metrics.length === 0) return null;

  const recent = metrics.slice(-100); // Last 100 requests for analysis
  const successful = recent.filter((m) => m.success);
  const failed = recent.filter((m) => !m.success);

  const avgDuration =
    successful.length > 0
      ? successful.reduce((sum, m) => sum + (m.duration || 0), 0) /
        successful.length
      : 0;

  return {
    totalRequests: recent.length,
    successfulRequests: successful.length,
    failedRequests: failed.length,
    successRate:
      recent.length > 0 ? (successful.length / recent.length) * 100 : 0,
    averageDuration: Math.round(avgDuration),
    cacheHitRate:
      recent.length > 0
        ? (recent.filter((m) => m.cacheHit).length / recent.length) * 100
        : 0,
    proxyUsageRate:
      recent.length > 0
        ? (recent.filter((m) => m.proxyUsed).length / recent.length) * 100
        : 0,
    rateLimitedRequests: recent.filter((m) => m.rateLimited).length,
  };
}
