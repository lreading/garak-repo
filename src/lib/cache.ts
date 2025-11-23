import { InMemoryLRUCache } from './cache/in-memory-lru-cache';
// Future implementations can be imported here:
// import { RedisCache } from './cache/redis-cache';

/**
 * Cache Interface
 * 
 * Abstraction for caching implementations to allow easy swapping
 * between in-memory, Redis, or other cache backends.
 */
export interface Cache {
  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns Cached value or null if not found
   */
  get<T>(key: string): T | null;

  /**
   * Set a value in the cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttlMs Optional time-to-live in milliseconds
   */
  set<T>(key: string, value: T, ttlMs?: number): void;

  /**
   * Delete a value from the cache
   * @param key Cache key
   */
  delete(key: string): void;

  /**
   * Clear all entries from the cache
   */
  clear(): void;

  /**
   * Check if a key exists in the cache
   * @param key Cache key
   * @returns true if key exists, false otherwise
   */
  has(key: string): boolean;

  /**
   * Get cache statistics (optional, for monitoring)
   */
  getStats?(): CacheStats;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  evictions: number;
}

/**
 * Get the cache instance
 * This factory function allows easy swapping of cache implementations
 * based on configuration (e.g., CACHE_TYPE environment variable)
 */
let cacheInstance: Cache | null = null;

export function getCache(): Cache {
  if (!cacheInstance) {
    // Determine which cache implementation to use based on config
    // For now, we only have in-memory LRU cache
    // In the future, this could check CACHE_TYPE env var:
    // const cacheType = process.env.CACHE_TYPE || 'in-memory';
    // switch (cacheType) {
    //   case 'redis':
    //     cacheInstance = new RedisCache(...);
    //     break;
    //   default:
    //     cacheInstance = new InMemoryLRUCache(maxMemoryBytes);
    // }
    const maxMemoryBytes = getCacheMaxMemoryBytes();
    cacheInstance = new InMemoryLRUCache(maxMemoryBytes);
  }
  return cacheInstance;
}

/**
 * Get the maximum memory for the cache in bytes
 */
function getCacheMaxMemoryBytes(): number {
  const envValue = process.env.CACHE_MAX_MEMORY_MB;
  if (!envValue) {
    return 100 * 1024 * 1024; // Default 100MB
  }

  const mb = parseInt(envValue, 10);
  if (isNaN(mb) || mb <= 0) {
    console.warn(`Invalid CACHE_MAX_MEMORY_MB value: ${envValue}, using default 100MB`);
    return 100 * 1024 * 1024;
  }

  return mb * 1024 * 1024;
}

/**
 * Generate a cache key for report metadata
 */
export function getReportMetadataCacheKey(filename: string): string {
  return `report-metadata:${filename}`;
}

