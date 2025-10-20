/**
 * Performance optimization utilities
 * Includes request caching, debouncing, throttling, and loading state management
 */

// Request cache interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Loading state interface
interface LoadingState {
  isLoading: boolean;
  progress?: number;
  message?: string;
  error?: string;
}

// Performance metrics interface
interface PerformanceMetrics {
  requestCount: number;
  cacheHitCount: number;
  averageResponseTime: number;
  errorCount: number;
  lastRequestTime: number;
}

/**
 * Request cache with TTL support
 */
export class RequestCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly defaultTTL: number;
  private readonly maxSize: number;

  constructor(defaultTTL: number = 5 * 60 * 1000, maxSize: number = 100) {
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;
  }

  /**
   * Get cached data
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached data
   */
  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    // Clean up if cache is full
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete cached entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.cache.delete(key));

    // If still too many entries, remove oldest ones
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, Math.floor(this.maxSize * 0.3));
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Retry mechanism with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * delay;
      const finalDelay = delay + jitter;

      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }

  throw lastError!;
}

/**
 * Loading state manager
 */
export class LoadingStateManager {
  private listeners = new Set<(state: LoadingState) => void>();
  private currentState: LoadingState = { isLoading: false };

  /**
   * Subscribe to loading state changes
   */
  subscribe(listener: (state: LoadingState) => void): () => void {
    this.listeners.add(listener);
    
    // Send current state immediately
    listener(this.currentState);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Set loading state
   */
  setLoading(isLoading: boolean, message?: string, progress?: number): void {
    this.currentState = {
      isLoading,
      message,
      progress,
      error: isLoading ? undefined : this.currentState.error
    };
    this.notifyListeners();
  }

  /**
   * Set error state
   */
  setError(error: string): void {
    this.currentState = {
      isLoading: false,
      error,
      message: undefined,
      progress: undefined
    };
    this.notifyListeners();
  }

  /**
   * Clear all states
   */
  clear(): void {
    this.currentState = { isLoading: false };
    this.notifyListeners();
  }

  /**
   * Get current state
   */
  getState(): LoadingState {
    return { ...this.currentState };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentState);
      } catch (error) {
        console.error('Error in loading state listener:', error);
      }
    });
  }
}

/**
 * Performance metrics collector
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    requestCount: 0,
    cacheHitCount: 0,
    averageResponseTime: 0,
    errorCount: 0,
    lastRequestTime: 0
  };
  
  private responseTimes: number[] = [];
  private readonly maxResponseTimeHistory = 100;

  /**
   * Record a request
   */
  recordRequest(responseTime: number, fromCache: boolean = false): void {
    this.metrics.requestCount++;
    this.metrics.lastRequestTime = Date.now();

    if (fromCache) {
      this.metrics.cacheHitCount++;
    } else {
      this.responseTimes.push(responseTime);
      
      // Keep only recent response times
      if (this.responseTimes.length > this.maxResponseTimeHistory) {
        this.responseTimes.shift();
      }
      
      // Update average response time
      this.metrics.averageResponseTime = 
        this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    }
  }

  /**
   * Record an error
   */
  recordError(): void {
    this.metrics.errorCount++;
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    if (this.metrics.requestCount === 0) return 0;
    return this.metrics.cacheHitCount / this.metrics.requestCount;
  }

  /**
   * Get error rate
   */
  getErrorRate(): number {
    if (this.metrics.requestCount === 0) return 0;
    return this.metrics.errorCount / this.metrics.requestCount;
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = {
      requestCount: 0,
      cacheHitCount: 0,
      averageResponseTime: 0,
      errorCount: 0,
      lastRequestTime: 0
    };
    this.responseTimes = [];
  }
}

/**
 * Cached request wrapper
 */
export class CachedRequest<T> {
  private cache: RequestCache<T>;
  private monitor: PerformanceMonitor;
  private loadingManager: LoadingStateManager;

  constructor(
    cacheTTL: number = 5 * 60 * 1000,
    cacheSize: number = 100
  ) {
    this.cache = new RequestCache<T>(cacheTTL, cacheSize);
    this.monitor = new PerformanceMonitor();
    this.loadingManager = new LoadingStateManager();
  }

  /**
   * Execute request with caching and performance monitoring
   */
  async execute(
    key: string,
    operation: () => Promise<T>,
    options: {
      ttl?: number;
      retries?: number;
      loadingMessage?: string;
    } = {}
  ): Promise<T> {
    const startTime = Date.now();

    // Check cache first
    const cached = this.cache.get(key);
    if (cached !== null) {
      this.monitor.recordRequest(0, true);
      return cached;
    }

    // Set loading state
    this.loadingManager.setLoading(true, options.loadingMessage);

    try {
      // Execute operation with retry
      const result = await retryWithBackoff(
        operation,
        options.retries || 3
      );

      // Cache result
      this.cache.set(key, result, options.ttl);

      // Record metrics
      const responseTime = Date.now() - startTime;
      this.monitor.recordRequest(responseTime, false);

      // Clear loading state
      this.loadingManager.setLoading(false);

      return result;
    } catch (error) {
      this.monitor.recordError();
      this.loadingManager.setError(
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  /**
   * Subscribe to loading state changes
   */
  onLoadingChange(listener: (state: LoadingState) => void): () => void {
    return this.loadingManager.subscribe(listener);
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics & { cacheHitRate: number; errorRate: number } {
    const baseMetrics = this.monitor.getMetrics();
    return {
      ...baseMetrics,
      cacheHitRate: this.monitor.getCacheHitRate(),
      errorRate: this.monitor.getErrorRate()
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.monitor.reset();
  }
}

/**
 * Bundle size optimization utilities
 */
export class LazyLoader {
  private loadedModules = new Map<string, any>();
  private loadingPromises = new Map<string, Promise<any>>();

  /**
   * Lazy load a module
   */
  async loadModule<T>(
    moduleId: string,
    loader: () => Promise<T>
  ): Promise<T> {
    // Return cached module if already loaded
    if (this.loadedModules.has(moduleId)) {
      return this.loadedModules.get(moduleId);
    }

    // Return existing loading promise if already loading
    if (this.loadingPromises.has(moduleId)) {
      return this.loadingPromises.get(moduleId);
    }

    // Start loading
    const loadingPromise = loader().then(module => {
      this.loadedModules.set(moduleId, module);
      this.loadingPromises.delete(moduleId);
      return module;
    }).catch(error => {
      this.loadingPromises.delete(moduleId);
      throw error;
    });

    this.loadingPromises.set(moduleId, loadingPromise);
    return loadingPromise;
  }

  /**
   * Preload modules
   */
  async preloadModules(
    modules: Array<{ id: string; loader: () => Promise<any> }>
  ): Promise<void> {
    const promises = modules.map(({ id, loader }) => 
      this.loadModule(id, loader).catch(error => {
        console.warn(`Failed to preload module ${id}:`, error);
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Check if module is loaded
   */
  isLoaded(moduleId: string): boolean {
    return this.loadedModules.has(moduleId);
  }

  /**
   * Unload module
   */
  unloadModule(moduleId: string): void {
    this.loadedModules.delete(moduleId);
  }
}

// Global instances
export const globalCache = new RequestCache();
export const globalLoadingManager = new LoadingStateManager();
export const globalPerformanceMonitor = new PerformanceMonitor();
export const globalLazyLoader = new LazyLoader();

// Utility functions
export const debouncedTranslation = debounce(
  (text: string, callback: (text: string) => void) => callback(text),
  300
);

export const throttledScroll = throttle(
  (callback: () => void) => callback(),
  100
);