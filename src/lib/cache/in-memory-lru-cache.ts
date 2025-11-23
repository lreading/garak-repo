import { Cache, CacheStats } from '../cache';

/**
 * Cache entry with optional expiration
 */
interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
  size: number; // Estimated size in bytes
}

/**
 * In-memory LRU cache implementation
 * 
 * Features:
 * - LRU eviction when memory limit is reached
 * - Optional TTL support
 * - Memory-aware eviction based on estimated entry sizes
 * - Cache statistics
 */
export class InMemoryLRUCache implements Cache {
  private cache: Map<string, CacheEntry<unknown>>;
  private maxMemoryBytes: number;
  private currentMemoryBytes: number;
  private hits: number;
  private misses: number;
  private evictions: number;
  private accessOrder: string[]; // Track access order for LRU

  constructor(maxMemoryBytes: number = 100 * 1024 * 1024) { // Default 100MB
    this.cache = new Map();
    this.maxMemoryBytes = maxMemoryBytes;
    this.currentMemoryBytes = 0;
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.accessOrder = [];
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if entry has expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.delete(key);
      this.misses++;
      return null;
    }

    // Update access order for LRU
    this.updateAccessOrder(key);
    this.hits++;
    
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const estimatedSize = this.estimateSize(value);
    
    // Remove existing entry if present
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!;
      this.currentMemoryBytes -= oldEntry.size;
      this.removeFromAccessOrder(key);
    }

    // Evict entries if needed to make room
    while (this.currentMemoryBytes + estimatedSize > this.maxMemoryBytes && this.cache.size > 0) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
      size: estimatedSize,
    };

    this.cache.set(key, entry);
    this.currentMemoryBytes += estimatedSize;
    this.updateAccessOrder(key);
  }

  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentMemoryBytes -= entry.size;
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    }
  }

  clear(): void {
    this.cache.clear();
    this.currentMemoryBytes = 0;
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    
    // Check if expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  getStats(): CacheStats {
    return {
      size: this.cache.size,
      maxSize: Math.floor(this.maxMemoryBytes / 1024), // Convert to KB for display
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
    };
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return;
    }

    const lruKey = this.accessOrder[0];
    this.delete(lruKey);
    this.evictions++;
  }

  /**
   * Update access order - move key to end (most recently used)
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Estimate the size of a value in bytes
   * This is a rough estimate for memory management
   */
  private estimateSize(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }

    if (typeof value === 'string') {
      // UTF-16 encoding: 2 bytes per character
      return value.length * 2;
    }

    if (typeof value === 'number') {
      return 8; // 64-bit number
    }

    if (typeof value === 'boolean') {
      return 4;
    }

    if (Array.isArray(value)) {
      let size = 0;
      for (const item of value) {
        size += this.estimateSize(item);
      }
      return size + (value.length * 8); // Array overhead
    }

    if (typeof value === 'object') {
      let size = 0;
      for (const [k, v] of Object.entries(value)) {
        size += k.length * 2; // Key size (UTF-16)
        size += this.estimateSize(v);
      }
      return size + 100; // Object overhead
    }

    // Fallback: estimate based on JSON stringification
    try {
      return JSON.stringify(value).length * 2; // UTF-16
    } catch {
      return 1024; // Conservative estimate for unknown types
    }
  }
}

