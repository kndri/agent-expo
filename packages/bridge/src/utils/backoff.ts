/**
 * Exponential Backoff for Bridge Reconnection
 *
 * Implements exponential backoff with jitter for resilient reconnection.
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

export const DEFAULT_BACKOFF: BackoffConfig = {
  initialDelay: 1000,
  maxDelay: 30000,
  multiplier: 2,
  jitter: 0.1,
  maxAttempts: undefined,
};

/**
 * ExponentialBackoff manages retry delays with exponential growth and jitter.
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
   */
  nextDelay(): number {
    const delay = this.currentDelay;

    // Apply jitter
    const jitterAmount = delay * this.config.jitter * (Math.random() * 2 - 1);
    const jitteredDelay = Math.max(0, delay + jitterAmount);

    // Increase delay for next attempt
    this.currentDelay = Math.min(
      this.currentDelay * this.config.multiplier,
      this.config.maxDelay
    );

    this.attempt++;
    return Math.round(jitteredDelay);
  }

  /**
   * Check if we should continue retrying.
   */
  shouldRetry(): boolean {
    if (this.config.maxAttempts === undefined) {
      return true;
    }
    return this.attempt < this.config.maxAttempts;
  }

  /**
   * Reset backoff state (call on successful connection).
   */
  reset(): void {
    this.attempt = 0;
    this.currentDelay = this.config.initialDelay;
  }

  /**
   * Get the current attempt number.
   */
  getAttempt(): number {
    return this.attempt;
  }
}
