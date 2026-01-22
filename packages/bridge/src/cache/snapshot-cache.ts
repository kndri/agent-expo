/**
 * Snapshot Cache
 *
 * Caches accessibility snapshots to improve performance when UI hasn't changed.
 * Invalidates automatically on UI changes detected via React DevTools hook.
 */

import type { EnhancedSnapshot } from '../types';

export interface CacheConfig {
  /** Maximum cache age in milliseconds (default: 5000) */
  maxAge: number;
  /** Enable/disable caching (default: true) */
  enabled: boolean;
}

export interface CacheStats {
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Cache version (increments on invalidation) */
  version: number;
  /** Whether cache is currently valid */
  isValid: boolean;
  /** Age of current cache in ms (0 if no cache) */
  cacheAge: number;
}

export interface CachedSnapshot extends EnhancedSnapshot {
  /** Whether this snapshot came from cache */
  fromCache: boolean;
  /** Cache version when this snapshot was created */
  cacheVersion: number;
}

export class SnapshotCache {
  private cache: EnhancedSnapshot | null = null;
  private cacheTime: number = 0;
  private version: number = 0;
  private hits: number = 0;
  private misses: number = 0;
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxAge: 5000,
      enabled: true,
      ...config,
    };
  }

  /**
   * Get cached snapshot if valid
   */
  get(): CachedSnapshot | null {
    if (!this.config.enabled) {
      this.misses++;
      return null;
    }

    if (!this.cache) {
      this.misses++;
      return null;
    }

    const age = Date.now() - this.cacheTime;
    if (age > this.config.maxAge) {
      this.invalidate();
      this.misses++;
      return null;
    }

    this.hits++;
    return {
      ...this.cache,
      fromCache: true,
      cacheVersion: this.version,
    };
  }

  /**
   * Store snapshot in cache
   */
  set(snapshot: EnhancedSnapshot): CachedSnapshot {
    if (!this.config.enabled) {
      return {
        ...snapshot,
        fromCache: false,
        cacheVersion: this.version,
      };
    }

    this.cache = snapshot;
    this.cacheTime = Date.now();

    return {
      ...snapshot,
      fromCache: false,
      cacheVersion: this.version,
    };
  }

  /**
   * Invalidate cache (called on UI changes)
   */
  invalidate(): void {
    this.cache = null;
    this.cacheTime = 0;
    this.version++;
  }

  /**
   * Check if cache has a valid entry
   */
  isValid(): boolean {
    if (!this.config.enabled || !this.cache) {
      return false;
    }

    const age = Date.now() - this.cacheTime;
    return age <= this.config.maxAge;
  }

  /**
   * Get cache statistics for debugging
   */
  getStats(): CacheStats {
    const age = this.cache ? Date.now() - this.cacheTime : 0;
    return {
      hits: this.hits,
      misses: this.misses,
      version: this.version,
      isValid: this.isValid(),
      cacheAge: age,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Update cache configuration
   */
  configure(config: Partial<CacheConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };

    // If disabled, clear cache
    if (!this.config.enabled) {
      this.cache = null;
      this.cacheTime = 0;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }
}
