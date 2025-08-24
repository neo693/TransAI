/**
 * Cross-browser compatibility tests
 * Tests browser detection, API compatibility, and feature detection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  detectBrowser, 
  BrowserCapabilities, 
  CrossBrowserAPI,
  hasAPI,
  getBrowserAPI
} from '../utils/browser-detection.js';

// Mock browser APIs
const mockChrome = {
  runtime: {
    lastError: null,
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn()
    }
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      getBytesInUse: vi.fn()
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn()
    }
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn()
  },
  action: {
    setBadgeText: vi.fn(),
    setIcon: vi.fn()
  },
  browserAction: {
    setBadgeText: vi.fn(),
    setIcon: vi.fn()
  },
  tts: {
    speak: vi.fn()
  },
  scripting: {
    executeScript: vi.fn()
  }
};

const mockBrowser = {
  ...mockChrome,
  browserAction: {
    setBadgeText: vi.fn(),
    setIcon: vi.fn()
  }
};

describe('Browser Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset global objects
    delete (globalThis as any).chrome;
    delete (globalThis as any).browser;
    delete (globalThis as any).navigator;
  });

  describe('detectBrowser', () => {
    it('should detect Chrome browser', () => {
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

    it('should detect Edge browser', () => {
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

    it('should detect Firefox browser', () => {
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

    it('should handle unknown browser', () => {
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
  });

  describe('hasAPI', () => {
    it('should detect available APIs', () => {
      (globalThis as any).chrome = mockChrome;

      expect(hasAPI('chrome.runtime')).toBe(true);
      expect(hasAPI('chrome.storage.local')).toBe(true);
      expect(hasAPI('chrome.nonexistent')).toBe(false);
      expect(hasAPI('chrome.storage.nonexistent')).toBe(false);
    });

    it('should handle missing APIs gracefully', () => {
      expect(hasAPI('chrome.runtime')).toBe(false);
      expect(hasAPI('nonexistent.api')).toBe(false);
    });
  });

  describe('getBrowserAPI', () => {
    it('should return chrome API when available', () => {
      (globalThis as any).chrome = mockChrome;

      const api = getBrowserAPI();
      expect(api).toBe(mockChrome);
    });

    it('should return browser API when chrome is not available', () => {
      (globalThis as any).browser = mockBrowser;

      const api = getBrowserAPI();
      expect(api).toBe(mockBrowser);
    });

    it('should throw error when no API is available', () => {
      expect(() => getBrowserAPI()).toThrow('Browser extension API not available');
    });
  });
});

describe('BrowserCapabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton
    (BrowserCapabilities as any).instance = null;
  });

  it('should detect Chrome capabilities', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      configurable: true
    });
    (globalThis as any).chrome = mockChrome;

    const capabilities = BrowserCapabilities.getInstance();
    
    expect(capabilities.hasStorageAPI()).toBe(true);
    expect(capabilities.hasStorageLocal()).toBe(true);
    expect(capabilities.hasTabsAPI()).toBe(true);
    expect(capabilities.hasActionAPI()).toBe(true);
    expect(capabilities.hasTTSAPI()).toBe(true);
  });

  it('should detect Firefox capabilities', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
      },
      configurable: true
    });
    (globalThis as any).browser = mockBrowser;

    const capabilities = BrowserCapabilities.getInstance();
    
    expect(capabilities.hasStorageAPI()).toBe(true);
    expect(capabilities.hasStorageLocal()).toBe(true);
    expect(capabilities.hasTabsAPI()).toBe(true);
    expect(capabilities.hasBrowserActionAPI()).toBe(true);
  });

  it('should get appropriate action API', () => {
    (globalThis as any).chrome = mockChrome;
    
    const capabilities = BrowserCapabilities.getInstance();
    const actionAPI = capabilities.getActionAPI();
    
    expect(actionAPI).toBe(mockChrome.action);
  });

  it('should fallback to browserAction API', () => {
    const chromeWithBrowserAction = { ...mockChrome };
    delete (chromeWithBrowserAction as any).action;
    (chromeWithBrowserAction as any).browserAction = mockBrowser.browserAction;
    (globalThis as any).chrome = chromeWithBrowserAction;
    
    const capabilities = BrowserCapabilities.getInstance();
    const actionAPI = capabilities.getActionAPI();
    
    expect(actionAPI).toBe(mockBrowser.browserAction);
  });

  it('should detect context types', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      configurable: true
    });
    (globalThis as any).chrome = mockChrome;
    
    // Mock service worker context
    (globalThis as any).importScripts = vi.fn();
    delete (globalThis as any).window;
    
    const capabilities = BrowserCapabilities.getInstance();
    expect(capabilities.isServiceWorkerContext()).toBe(true);
    expect(capabilities.isContentScriptContext()).toBe(false);
    expect(capabilities.isExtensionPageContext()).toBe(false);
  });
});

describe('CrossBrowserAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (BrowserCapabilities as any).instance = null;
    (globalThis as any).chrome = mockChrome;
  });

  describe('Storage operations', () => {
    it('should get storage data', async () => {
      const testData = { key1: 'value1', key2: 'value2' };
      mockChrome.storage.local.get.mockImplementation((_keys, callback) => {
        callback(testData);
      });

      const api = new CrossBrowserAPI();
      const result = await api.getStorage(['key1', 'key2']);
      
      expect(result).toEqual(testData);
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['key1', 'key2'], expect.any(Function));
    });

    it('should set storage data', async () => {
      const testData = { key1: 'value1' };
      mockChrome.storage.local.set.mockImplementation((_data, callback) => {
        callback();
      });

      const api = new CrossBrowserAPI();
      await api.setStorage(testData);
      
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(testData, expect.any(Function));
    });

    it('should handle storage errors', async () => {
      mockChrome.runtime.lastError = { message: 'Storage error' } as any;
      mockChrome.storage.local.get.mockImplementation((_keys, callback) => {
        callback(null);
      });

      const api = new CrossBrowserAPI();
      
      await expect(api.getStorage('key')).rejects.toThrow('Storage error');
    });

    it('should remove storage data', async () => {
      mockChrome.storage.local.remove.mockImplementation((_keys, callback) => {
        callback();
      });

      const api = new CrossBrowserAPI();
      await api.removeStorage(['key1', 'key2']);
      
      expect(mockChrome.storage.local.remove).toHaveBeenCalledWith(['key1', 'key2'], expect.any(Function));
    });
  });

  describe('Messaging operations', () => {
    it('should send messages', async () => {
      const testMessage = { type: 'TEST', data: 'test' };
      const testResponse = { success: true };
      
      mockChrome.runtime.sendMessage.mockImplementation((_message: any, _options: any, callback: any) => {
        callback(testResponse);
      });

      const api = new CrossBrowserAPI();
      const result = await api.sendMessage(testMessage);
      
      expect(result).toEqual(testResponse);
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(testMessage, undefined, expect.any(Function));
    });

    it('should handle messaging errors', async () => {
      mockChrome.runtime.lastError = { message: 'Messaging error' } as any;
      mockChrome.runtime.sendMessage.mockImplementation((_message: any, _options: any, callback: any) => {
        callback(null);
      });

      const api = new CrossBrowserAPI();
      
      await expect(api.sendMessage({ type: 'TEST' })).rejects.toThrow('Messaging error');
    });
  });

  describe('Tabs operations', () => {
    it('should get current tab', async () => {
      const testTab = { id: 1, url: 'https://example.com', active: true };
      mockChrome.tabs.query.mockImplementation((_query: any, callback: any) => {
        callback([testTab]);
      });

      const api = new CrossBrowserAPI();
      const result = await api.getCurrentTab();
      
      expect(result).toEqual(testTab);
      expect(mockChrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true }, expect.any(Function));
    });

    it('should return null when no tab found', async () => {
      mockChrome.tabs.query.mockImplementation((_query: any, callback: any) => {
        callback([]);
      });

      const api = new CrossBrowserAPI();
      const result = await api.getCurrentTab();
      
      expect(result).toBeNull();
    });
  });

  describe('Action operations', () => {
    it('should set action badge', async () => {
      mockChrome.action.setBadgeText.mockImplementation((_options: any, callback: any) => {
        callback();
      });

      const api = new CrossBrowserAPI();
      await api.setActionBadge('5');
      
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '5' }, expect.any(Function));
    });

    it('should set action badge with tab ID', async () => {
      mockChrome.action.setBadgeText.mockImplementation((_options: any, callback: any) => {
        callback();
      });

      const api = new CrossBrowserAPI();
      await api.setActionBadge('3', 123);
      
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '3', tabId: 123 }, expect.any(Function));
    });
  });

  describe('TTS operations', () => {
    it('should speak using TTS API', async () => {
      mockChrome.tts.speak.mockImplementation((_text: any, _options: any, callback: any) => {
        callback();
      });

      const api = new CrossBrowserAPI();
      await api.speak('Hello world', { lang: 'en-US', rate: 1.0 });
      
      expect(mockChrome.tts.speak).toHaveBeenCalledWith('Hello world', { lang: 'en-US', rate: 1.0 }, expect.any(Function));
    });

    it('should fallback to Web Speech API', async () => {
      // Remove TTS API
      delete (globalThis as any).chrome.tts;
      
      // Mock Web Speech API
      const mockUtterance = {
        lang: '',
        rate: 1,
        pitch: 1,
        onend: null as any,
        onerror: null as any
      };
      
      const mockSpeechSynthesis = {
        speak: vi.fn((utterance) => {
          setTimeout(() => utterance.onend?.(), 100);
        })
      };
      
      Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
        value: vi.fn(() => mockUtterance),
        configurable: true
      });
      
      Object.defineProperty(globalThis, 'speechSynthesis', {
        value: mockSpeechSynthesis,
        configurable: true
      });

      const api = new CrossBrowserAPI();
      await api.speak('Hello world', { lang: 'en-US' });
      
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    it('should handle TTS errors', async () => {
      (globalThis as any).chrome = { ...mockChrome };
      (globalThis as any).chrome.runtime.lastError = { message: 'TTS error' } as any;
      (globalThis as any).chrome.tts.speak.mockImplementation((_text: any, _options: any, callback: any) => {
        callback();
      });

      const api = new CrossBrowserAPI();
      
      await expect(api.speak('Hello')).rejects.toThrow('TTS error');
    });
  });
});

describe('Cross-browser Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (BrowserCapabilities as any).instance = null;
  });

  it('should work with Chrome extension environment', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      configurable: true
    });
    (globalThis as any).chrome = mockChrome;

    const capabilities = BrowserCapabilities.getInstance();
    const api = new CrossBrowserAPI();
    
    expect(capabilities.getBrowserInfo().type).toBe('chrome');
    expect(capabilities.hasStorageAPI()).toBe(true);
    expect(capabilities.hasActionAPI()).toBe(true);
    // Verify the API is properly initialized
    expect(api).toBeDefined();
  });

  it('should work with Edge extension environment', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59'
      },
      configurable: true
    });
    (globalThis as any).chrome = mockChrome;

    const capabilities = BrowserCapabilities.getInstance();
    const api = new CrossBrowserAPI();
    
    expect(capabilities.getBrowserInfo().type).toBe('edge');
    expect(capabilities.hasStorageAPI()).toBe(true);
    expect(capabilities.hasActionAPI()).toBe(true);
    // Verify the API is properly initialized
    expect(api).toBeDefined();
  });

  it('should gracefully handle missing APIs', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        userAgent: 'Unknown Browser/1.0'
      },
      configurable: true
    });

    const capabilities = BrowserCapabilities.getInstance();
    
    expect(capabilities.getBrowserInfo().type).toBe('unknown');
    expect(capabilities.hasStorageAPI()).toBe(false);
    expect(capabilities.hasActionAPI()).toBe(false);
    expect(() => new CrossBrowserAPI()).toThrow();
  });
});