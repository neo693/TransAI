/**
 * Performance utilities tests
 * Tests caching, debouncing, throttling, and performance monitoring
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  RequestCache,
  debounce,
  throttle,
  retryWithBackoff,
  LoadingStateManager,
  PerformanceMonitor,
  CachedRequest,
  LazyLoader
} from '../utils/performance.js';

describe('Performance Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('RequestCache', () => {
    let cache: RequestCache<string>;

    beforeEach(() => {
      cache = new RequestCache<string>(1000, 5); // 1 second TTL, max 5 items
    });

    it('should store and retrieve cached data', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should expire cached data after TTL', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      // Fast-forward time beyond TTL
      vi.advanceTimersByTime(1001);
      expect(cache.get('key1')).toBeNull();
    });

    it('should use custom TTL when provided', () => {
      cache.set('key1', 'value1', 500); // 500ms TTL
      expect(cache.get('key1')).toBe('value1');

      vi.advanceTimersByTime(499);
      expect(cache.get('key1')).toBe('value1');

      vi.advanceTimersByTime(2);
      expect(cache.get('key1')).toBeNull();
    });

    it('should delete cached entries', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);

      cache.delete('key1');
      expect(cache.has('key1')).toBe(false);
    });

    it('should clear all cached entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(true);

      cache.clear();
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });

    it('should cleanup expired entries', () => {
      cache.set('key1', 'value1', 500);
      cache.set('key2', 'value2', 1500);
      
      vi.advanceTimersByTime(1000);
      cache.cleanup();
      
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
    });

    it('should limit cache size and remove oldest entries', () => {
      // Fill cache to max capacity
      for (let i = 0; i < 5; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      // Add one more item, should trigger cleanup
      cache.set('key5', 'value5');
      
      const stats = cache.getStats();
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');

      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
    });

    it('should reset debounce timer on new calls', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('arg1');
      vi.advanceTimersByTime(50);
      
      debouncedFn('arg2');
      vi.advanceTimersByTime(50);
      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg2');
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 100);

      throttledFn('arg1');
      throttledFn('arg2');
      throttledFn('arg3');

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg1');

      vi.advanceTimersByTime(100);
      throttledFn('arg4');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith('arg4');
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first try', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      const result = await retryWithBackoff(mockOperation, 3);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValue('success');
      
      const promise = retryWithBackoff(mockOperation, 3, 10, 100);
      
      // Advance timers to allow retries
      await vi.runAllTimersAsync();
      
      const result = await promise;
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('persistent failure'));
      
      const promise = retryWithBackoff(mockOperation, 2, 10, 100);
      
      // Wait for all retries to complete
      await vi.runAllTimersAsync();
      
      await expect(promise).rejects.toThrow('persistent failure');
      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial call + 2 retries
    }, 10000);
  });

  describe('LoadingStateManager', () => {
    let manager: LoadingStateManager;

    beforeEach(() => {
      manager = new LoadingStateManager();
    });

    it('should notify listeners of state changes', () => {
      const listener = vi.fn();
      manager.subscribe(listener);

      expect(listener).toHaveBeenCalledWith({ isLoading: false });

      manager.setLoading(true, 'Loading...');
      expect(listener).toHaveBeenCalledWith({
        isLoading: true,
        message: 'Loading...',
        progress: undefined,
        error: undefined
      });
    });

    it('should handle multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      manager.subscribe(listener1);
      manager.subscribe(listener2);

      manager.setLoading(true, 'Loading...');

      expect(listener1).toHaveBeenCalledTimes(2); // Initial + update
      expect(listener2).toHaveBeenCalledTimes(2); // Initial + update
    });

    it('should unsubscribe listeners', () => {
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);

      manager.setLoading(true);
      expect(listener).toHaveBeenCalledTimes(2); // Initial + update

      unsubscribe();
      manager.setLoading(false);
      expect(listener).toHaveBeenCalledTimes(2); // No additional calls
    });

    it('should set error state', () => {
      const listener = vi.fn();
      manager.subscribe(listener);

      manager.setError('Something went wrong');
      expect(listener).toHaveBeenLastCalledWith({
        isLoading: false,
        error: 'Something went wrong',
        message: undefined,
        progress: undefined
      });
    });

    it('should clear state', () => {
      const listener = vi.fn();
      manager.subscribe(listener);

      manager.setLoading(true, 'Loading...');
      manager.clear();

      expect(listener).toHaveBeenLastCalledWith({ isLoading: false });
    });
  });

  describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor();
    });

    it('should record requests and calculate metrics', () => {
      monitor.recordRequest(100);
      monitor.recordRequest(200);
      monitor.recordRequest(150);

      const metrics = monitor.getMetrics();
      expect(metrics.requestCount).toBe(3);
      expect(metrics.averageResponseTime).toBe(150);
      expect(metrics.cacheHitCount).toBe(0);
    });

    it('should record cache hits', () => {
      monitor.recordRequest(100, false);
      monitor.recordRequest(0, true);
      monitor.recordRequest(0, true);

      const metrics = monitor.getMetrics();
      expect(metrics.requestCount).toBe(3);
      expect(metrics.cacheHitCount).toBe(2);
      expect(monitor.getCacheHitRate()).toBe(2/3);
    });

    it('should record errors', () => {
      monitor.recordRequest(100);
      monitor.recordError();
      monitor.recordRequest(200);
      monitor.recordError();

      const metrics = monitor.getMetrics();
      expect(metrics.requestCount).toBe(2);
      expect(metrics.errorCount).toBe(2);
      expect(monitor.getErrorRate()).toBe(1); // 2 errors / 2 requests
    });

    it('should reset metrics', () => {
      monitor.recordRequest(100);
      monitor.recordError();

      monitor.reset();

      const metrics = monitor.getMetrics();
      expect(metrics.requestCount).toBe(0);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
    });
  });

  describe('CachedRequest', () => {
    let cachedRequest: CachedRequest<string>;

    beforeEach(() => {
      cachedRequest = new CachedRequest<string>(1000, 10);
    });

    it('should cache successful requests', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result');
      
      const result1 = await cachedRequest.execute('key1', mockOperation);
      const result2 = await cachedRequest.execute('key1', mockOperation);

      expect(result1).toBe('result');
      expect(result2).toBe('result');
      expect(mockOperation).toHaveBeenCalledTimes(1); // Second call should use cache
    });

    it('should retry failed requests', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      const promise = cachedRequest.execute('key1', mockOperation, { retries: 1 });
      
      await vi.runAllTimersAsync();
      
      const result = await promise;
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should notify loading state changes', async () => {
      const listener = vi.fn();
      cachedRequest.onLoadingChange(listener);

      const mockOperation = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('result'), 100))
      );

      const promise = cachedRequest.execute('key1', mockOperation, {
        loadingMessage: 'Processing...'
      });

      expect(listener).toHaveBeenCalledWith({
        isLoading: true,
        message: 'Processing...',
        progress: undefined,
        error: undefined
      });

      await vi.runAllTimersAsync();
      await promise;

      expect(listener).toHaveBeenLastCalledWith({
        isLoading: false,
        message: undefined,
        progress: undefined,
        error: undefined
      });
    });
  });

  describe('LazyLoader', () => {
    let lazyLoader: LazyLoader;

    beforeEach(() => {
      lazyLoader = new LazyLoader();
    });

    it('should load modules lazily', async () => {
      const mockLoader = vi.fn().mockResolvedValue({ default: 'module' });
      
      const module1 = await lazyLoader.loadModule('test-module', mockLoader);
      const module2 = await lazyLoader.loadModule('test-module', mockLoader);

      expect(module1).toEqual({ default: 'module' });
      expect(module2).toEqual({ default: 'module' });
      expect(mockLoader).toHaveBeenCalledTimes(1); // Should only load once
    });

    it('should handle concurrent loading requests', async () => {
      const mockLoader = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ default: 'module' }), 100))
      );
      
      const promise1 = lazyLoader.loadModule('test-module', mockLoader);
      const promise2 = lazyLoader.loadModule('test-module', mockLoader);

      await vi.runAllTimersAsync();
      
      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual({ default: 'module' });
      expect(result2).toEqual({ default: 'module' });
      expect(mockLoader).toHaveBeenCalledTimes(1);
    });

    it('should check if module is loaded', async () => {
      const mockLoader = vi.fn().mockResolvedValue({ default: 'module' });
      
      expect(lazyLoader.isLoaded('test-module')).toBe(false);
      
      await lazyLoader.loadModule('test-module', mockLoader);
      
      expect(lazyLoader.isLoaded('test-module')).toBe(true);
    });

    it('should unload modules', async () => {
      const mockLoader = vi.fn().mockResolvedValue({ default: 'module' });
      
      await lazyLoader.loadModule('test-module', mockLoader);
      expect(lazyLoader.isLoaded('test-module')).toBe(true);
      
      lazyLoader.unloadModule('test-module');
      expect(lazyLoader.isLoaded('test-module')).toBe(false);
    });

    it('should preload multiple modules', async () => {
      const mockLoader1 = vi.fn().mockResolvedValue({ default: 'module1' });
      const mockLoader2 = vi.fn().mockResolvedValue({ default: 'module2' });
      const mockLoader3 = vi.fn().mockRejectedValue(new Error('Load failed'));
      
      await lazyLoader.preloadModules([
        { id: 'module1', loader: mockLoader1 },
        { id: 'module2', loader: mockLoader2 },
        { id: 'module3', loader: mockLoader3 }
      ]);

      expect(lazyLoader.isLoaded('module1')).toBe(true);
      expect(lazyLoader.isLoaded('module2')).toBe(true);
      expect(lazyLoader.isLoaded('module3')).toBe(false); // Failed to load
    });
  });
});