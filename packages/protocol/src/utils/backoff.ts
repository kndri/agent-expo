/**
 * Exponential Backoff Utility
 *
 * Implements exponential backoff with jitter for resilient reconnection.
 */

/**
 * Configuration for exponential backoff behavior
 */
export interface BackoffConfig {
  /** Starting delay in milliseconds (default: 1000) */
  initialDelay: number;
  /** Maximum delay cap in milliseconds (default: 30000) */
  maxDelay: number;
  /** Delay multiplier for each attempt (default: 2) */
  multiplier: number;
  /** Random jitter factor 0-1 (default: 0.1 = 10%) */
  jitter: number;
  /** Maximum attempts before giving up (undefined = infinite) */
  maxAttempts?: number;
}

/**
 * Default backoff configuration
 */
export const DEFAULT_BACKOFF: BackoffConfig = {
  initialDelay: 1000, // Start at 1 second
  maxDelay: 30000, // Cap at 30 seconds
  multiplier: 2, // Double each time
  jitter: 0.1, // 10% random jitter
  maxAttempts: undefined, // Retry forever
};

/**
 * ExponentialBackoff manages retry delays with exponential growth and jitter.
 *
 * @example
 * ```typescript
 * const backoff = new ExponentialBackoff({
 *   initialDelay: 1000,
 *   maxDelay: 30000,
 *   multiplier: 2,
 * });
 *
 * async function connectWithRetry() {
 *   while (backoff.shouldRetry()) {
 *     try {
 *       await connect();
 *       backoff.reset();
 *       return;
 *     } catch (error) {
 *       const delay = backoff.nextDelay();
 *       console.log(`Retrying in ${delay}ms (attempt ${backoff.getAttempt()})`);
 *       await sleep(delay);
 *     }
 *   }
 *   throw new Error('Max attempts reached');
 * }
 * ```
 */
export class ExponentialBackoff {
  private config: BackoffConfig;
  private attempt: number = 0;
  private currentDelay: number;

  constructor(config: Partial<BackoffConfig> = {}) {
    this.config = { ...DEFAULT_BACKOFF, ...config };
    this.currentDelay = this.config.initialDelay;
  }

  /**
   * Get the next delay and increment attempt counter.
   * Applies jitter to avoid thundering herd problems.
   *
   * @returns The delay in milliseconds before the next retry attempt
   */
  nextDelay(): number {
    const delay = this.currentDelay;

    // Apply jitter: ±(jitter * delay)
    const jitterAmount = delay * this.config.jitter * (Math.random() * 2 - 1);
    const jitteredDelay = Math.max(0, delay + jitterAmount);

    // Increase delay for next attempt (capped at maxDelay)
    this.currentDelay = Math.min(this.currentDelay * this.config.multiplier, this.config.maxDelay);

    this.attempt++;
    return Math.round(jitteredDelay);
  }

  /**
   * Check if we should continue retrying.
   *
   * @returns true if we haven't exceeded maxAttempts
   */
  shouldRetry(): boolean {
    if (this.config.maxAttempts === undefined) {
      return true;
    }
    return this.attempt < this.config.maxAttempts;
  }

  /**
   * Reset backoff state. Call this after a successful connection.
   */
  reset(): void {
    this.attempt = 0;
    this.currentDelay = this.config.initialDelay;
  }

  /**
   * Get the current attempt number (0-based, incremented after nextDelay())
   */
  getAttempt(): number {
    return this.attempt;
  }

  /**
   * Get the current configuration
   */
  getConfig(): Readonly<BackoffConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(config: Partial<BackoffConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Helper function to create a promise-based delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with exponential backoff retry logic.
 *
 * @param fn The async function to execute
 * @param config Backoff configuration
 * @param onRetry Optional callback called before each retry
 * @returns The result of the function
 * @throws The last error if max attempts exceeded
 *
 * @example
 * ```typescript
 * const result = await withBackoff(
 *   () => fetch('/api/data'),
 *   { maxAttempts: 5 },
 *   (attempt, delay) => console.log(`Retry ${attempt} in ${delay}ms`)
 * );
 * ```
 */
export async function withBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<BackoffConfig> = {},
  onRetry?: (attempt: number, delay: number, error: Error) => void
): Promise<T> {
  const backoff = new ExponentialBackoff(config);
  let lastError: Error | undefined;

  while (backoff.shouldRetry()) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!backoff.shouldRetry()) {
        break;
      }

      const retryDelay = backoff.nextDelay();
      onRetry?.(backoff.getAttempt(), retryDelay, lastError);
      await delay(retryDelay);
    }
  }

  throw lastError || new Error('Max attempts exceeded');
}
