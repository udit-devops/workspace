export class TTLCache {
    constructor(options) {
        this.store = new Map();
        this.timer = null;
        this.ttlMs = options?.ttlMs ?? 60000;
        this.maxEntries = options?.maxEntries ?? 500;
    }
    get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }
        entry.lastAccessed = Date.now();
        return entry.value;
    }
    set(key, value, ttlMs) {
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
    has(key) {
        const entry = this.store.get(key);
        if (!entry)
            return false;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return false;
        }
        return true;
    }
    delete(key) {
        return this.store.delete(key);
    }
    clear() {
        this.store.clear();
    }
    get size() {
        this.evictExpired();
        return this.store.size;
    }
    evictExpired() {
        const now = Date.now();
        for (const [key, entry] of this.store) {
            if (now > entry.expiresAt)
                this.store.delete(key);
        }
    }
    evictLRU() {
        let oldestKey = null;
        let oldestAccess = Infinity;
        for (const [key, entry] of this.store) {
            if (entry.lastAccessed < oldestAccess) {
                oldestAccess = entry.lastAccessed;
                oldestKey = key;
            }
        }
        if (oldestKey !== null)
            this.store.delete(oldestKey);
    }
    scheduleSweep() {
        if (this.timer)
            return;
        this.timer = setTimeout(() => {
            this.timer = null;
            this.evictExpired();
        }, Math.max(1000, this.ttlMs));
        if (typeof this.timer.unref === "function")
            this.timer.unref();
    }
}
export const fileCache = new TTLCache({ ttlMs: 30000, maxEntries: 500 });
export const treeCache = new TTLCache({ ttlMs: 10000, maxEntries: 50 });
