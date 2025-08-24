/**
 * Simplified cross-browser compatibility tests
 * Tests core browser detection and API compatibility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  detectBrowser, 
  hasAPI
} from '../utils/browser-detection.js';

describe('Cross-browser Compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset global objects
    delete (globalThis as any).chrome;
    delete (globalThis as any).browser;
    delete (globalThis as any).navigator;
  });

  describe('Browser Detection', () => {
    it('should detect Chrome browser correctly', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        configurable: true
      });

      const browserInfo = detectBrowser();
      expect(browserInfo.type).toBe('chrome');
      expect(browserInfo.version).toBe('91.0.4472.124');
      expect(browserInfo.isManifestV3).toBe(true);
      expect(browserInfo.supportsServiceWorker).toBe(true);
    });

    it('should detect Edge browser correctly', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59'
        },
        configurable: true
      });

      const browserInfo = detectBrowser();
      expect(browserInfo.type).toBe('edge');
      expect(browserInfo.version).toBe('91.0.864.59');
      expect(browserInfo.isManifestV3).toBe(true);
    });

    it('should detect Firefox browser correctly', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
        },
        configurable: true
      });

      const browserInfo = detectBrowser();
      expect(browserInfo.type).toBe('firefox');
      expect(browserInfo.version).toBe('89.0');
      expect(browserInfo.isManifestV3).toBe(false);
    });

    it('should handle unknown browsers gracefully', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Unknown Browser/1.0'
        },
        configurable: true
      });

      const browserInfo = detectBrowser();
      expect(browserInfo.type).toBe('unknown');
      expect(browserInfo.version).toBe('');
    });

    it('should detect TTS support correctly', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        configurable: true
      });

      // Mock window with speechSynthesis
      Object.defineProperty(globalThis, 'window', {
        value: {
          speechSynthesis: {}
        },
        configurable: true
      });

      const browserInfo = detectBrowser();
      expect(browserInfo.supportsTTS).toBe(true);
    });
  });

  describe('API Detection', () => {
    it('should detect available Chrome APIs', () => {
      const mockChrome = {
        runtime: { sendMessage: vi.fn() },
        storage: { local: { get: vi.fn() } },
        tabs: { query: vi.fn() }
      };
      (globalThis as any).chrome = mockChrome;

      expect(hasAPI('chrome.runtime')).toBe(true);
      expect(hasAPI('chrome.storage.local')).toBe(true);
      expect(hasAPI('chrome.tabs')).toBe(true);
      expect(hasAPI('chrome.nonexistent')).toBe(false);
    });

    it('should handle missing APIs gracefully', () => {
      expect(hasAPI('chrome.runtime')).toBe(false);
      expect(hasAPI('nonexistent.api')).toBe(false);
    });

    it('should detect nested API paths correctly', () => {
      const mockChrome = {
        storage: {
          local: {
            get: vi.fn(),
            set: vi.fn()
          },
          sync: {
            get: vi.fn()
          }
        }
      };
      (globalThis as any).chrome = mockChrome;

      expect(hasAPI('chrome.storage')).toBe(true);
      expect(hasAPI('chrome.storage.local')).toBe(true);
      expect(hasAPI('chrome.storage.local.get')).toBe(true);
      expect(hasAPI('chrome.storage.sync.get')).toBe(true);
      expect(hasAPI('chrome.storage.local.nonexistent')).toBe(false);
    });
  });

  describe('Manifest V3 Compatibility', () => {
    it('should identify Manifest V3 compatible Chrome versions', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36'
        },
        configurable: true
      });

      const browserInfo = detectBrowser();
      expect(browserInfo.isManifestV3).toBe(true);
    });

    it('should identify Manifest V3 compatible Edge versions', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36 Edg/88.0.705.68'
        },
        configurable: true
      });

      const browserInfo = detectBrowser();
      expect(browserInfo.isManifestV3).toBe(true);
    });

    it('should identify older browsers as not Manifest V3 compatible', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36'
        },
        configurable: true
      });

      const browserInfo = detectBrowser();
      expect(browserInfo.isManifestV3).toBe(false);
    });
  });

  describe('Service Worker Support', () => {
    it('should detect service worker support in modern Chrome', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        configurable: true
      });

      const browserInfo = detectBrowser();
      expect(browserInfo.supportsServiceWorker).toBe(true);
    });

    it('should detect service worker support in modern Edge', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59'
        },
        configurable: true
      });

      const browserInfo = detectBrowser();
      expect(browserInfo.supportsServiceWorker).toBe(true);
    });

    it('should not detect service worker support in old browsers', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36'
        },
        configurable: true
      });

      const browserInfo = detectBrowser();
      expect(browserInfo.supportsServiceWorker).toBe(false);
    });
  });

  describe('Feature Detection', () => {
    it('should detect offscreen document support in newer Chrome', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
        },
        configurable: true
      });

      const browserInfo = detectBrowser();
      expect(browserInfo.supportsOffscreenDocument).toBe(true);
    });

    it('should not detect offscreen document support in older Chrome', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
        },
        configurable: true
      });

      const browserInfo = detectBrowser();
      expect(browserInfo.supportsOffscreenDocument).toBe(false);
    });
  });
});