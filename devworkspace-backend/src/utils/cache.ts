/**
 * Lightweight in-memory TTL cache with LRU-style eviction.
 *
 * Dependency-free by design so it can run in any Node runtime. The interface is
 * intentionally small and symmetric — when the product outgrows a single process
 * (multiple servers, workers), swap the engine for Redis behind the same
 * get/set/delete/has API without touching callers.
 */
export interface CacheEntry<V> {
  value: V;
  expiresAt: number;
  lastAccessed: number;
}

interface CacheOptions {
  ttlMs: number;
  maxEntries: number;
}

export class TTLCache<V = unknown> {
  private readonly store = new Map<string, CacheEntry<V>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private timer: NodeJS.Timeout | null = null;

  constructor(options?: Partial<CacheOptions>) {
    this.ttlMs = options?.ttlMs ?? 60_000;
    this.maxEntries = options?.maxEntries ?? 500;
  }

  get<T = V>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    entry.lastAccessed = Date.now();
    return entry.value as unknown as T;
  }

  set(key: string, value: V, ttlMs?: number): void {
    this.evictExpired();
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      this.evictLRU();
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.ttlMs),
      lastAccessed: Date.now(),
    });
    this.scheduleSweep();
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    this.evictExpired();
    return this.store.size;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;
    for (const [key, entry] of this.store) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }
    if (oldestKey !== null) this.store.delete(oldestKey);
  }

  private scheduleSweep(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.evictExpired();
    }, Math.max(1000, this.ttlMs));
    if (typeof this.timer.unref === "function") this.timer.unref();
  }
}

export const fileCache = new TTLCache<unknown>({ ttlMs: 30_000, maxEntries: 500 });
export const treeCache = new TTLCache<unknown>({ ttlMs: 10_000, maxEntries: 50 });
