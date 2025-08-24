/**
 * Browser detection and compatibility utilities
 */

export type BrowserType = 'chrome' | 'edge' | 'firefox' | 'safari' | 'unknown';

export interface BrowserInfo {
  type: BrowserType;
  version: string;
  isManifestV3: boolean;
  supportsServiceWorker: boolean;
  supportsTTS: boolean;
  supportsOffscreenDocument: boolean;
}

/**
 * Detect the current browser type and capabilities
 */
export function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent.toLowerCase();
  let type: BrowserType = 'unknown';
  let version = '';

  // Detect browser type
  if (userAgent.includes('edg/')) {
    type = 'edge';
    version = userAgent.match(/edg\/([0-9.]+)/)?.[1] || '';
  } else if (userAgent.includes('chrome/')) {
    type = 'chrome';
    version = userAgent.match(/chrome\/([0-9.]+)/)?.[1] || '';
  } else if (userAgent.includes('firefox/')) {
    type = 'firefox';
    version = userAgent.match(/firefox\/([0-9.]+)/)?.[1] || '';
  } else if (userAgent.includes('safari/')) {
    type = 'safari';
    version = userAgent.match(/version\/([0-9.]+)/)?.[1] || '';
  }

  // Determine capabilities based on browser and version
  const majorVersion = parseInt(version.split('.')[0]) || 0;
  
  return {
    type,
    version,
    isManifestV3: type === 'chrome' && majorVersion >= 88 || type === 'edge' && majorVersion >= 88,
    supportsServiceWorker: type === 'chrome' && majorVersion >= 40 || type === 'edge' && majorVersion >= 17,
    supportsTTS: typeof window !== 'undefined' && 'speechSynthesis' in window,
    supportsOffscreenDocument: type === 'chrome' && majorVersion >= 109 || type === 'edge' && majorVersion >= 109,
  };
}

/**
 * Check if a specific browser API is available
 */
export function hasAPI(apiPath: string): boolean {
  const parts = apiPath.split('.');
  let current: any = globalThis;
  
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return false;
    }
  }
  
  return current !== undefined;
}

/**
 * Get browser-specific API namespace
 */
export function getBrowserAPI(): typeof chrome {
  // Chrome and Edge use 'chrome' namespace
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    return chrome;
  }
  
  // Firefox uses 'browser' namespace (webextension-polyfill)
  if (typeof (globalThis as any).browser !== 'undefined' && ((globalThis as any).browser as any).runtime) {
    return (globalThis as any).browser as typeof chrome;
  }
  
  throw new Error('Browser extension API not available');
}

/**
 * Feature detection for extension capabilities
 */
export class BrowserCapabilities {
  private static instance: BrowserCapabilities;
  private browserInfo: BrowserInfo;
  private api: typeof chrome;

  private constructor() {
    this.browserInfo = detectBrowser();
    this.api = getBrowserAPI();
  }

  static getInstance(): BrowserCapabilities {
    if (!BrowserCapabilities.instance) {
      BrowserCapabilities.instance = new BrowserCapabilities();
    }
    return BrowserCapabilities.instance;
  }

  getBrowserInfo(): BrowserInfo {
    return this.browserInfo;
  }

  getAPI(): typeof chrome {
    return this.api;
  }

  // Storage capabilities
  hasStorageAPI(): boolean {
    return hasAPI('chrome.storage') || hasAPI('browser.storage');
  }

  hasStorageLocal(): boolean {
    return hasAPI('chrome.storage.local') || hasAPI('browser.storage.local');
  }

  hasStorageSync(): boolean {
    return hasAPI('chrome.storage.sync') || hasAPI('browser.storage.sync');
  }

  // Scripting capabilities
  hasScriptingAPI(): boolean {
    return hasAPI('chrome.scripting') || hasAPI('browser.scripting');
  }

  hasTabsAPI(): boolean {
    return hasAPI('chrome.tabs') || hasAPI('browser.tabs');
  }

  // Audio capabilities
  hasTTSAPI(): boolean {
    return hasAPI('chrome.tts') || hasAPI('browser.tts');
  }

  hasWebSpeechAPI(): boolean {
    return 'speechSynthesis' in window;
  }

  // Messaging capabilities
  hasRuntimeMessaging(): boolean {
    return hasAPI('chrome.runtime.sendMessage') || hasAPI('browser.runtime.sendMessage');
  }

  // Action/browserAction capabilities
  hasActionAPI(): boolean {
    return hasAPI('chrome.action') || hasAPI('browser.action');
  }

  hasBrowserActionAPI(): boolean {
    return hasAPI('chrome.browserAction') || hasAPI('browser.browserAction');
  }

  // Get the appropriate action API (Manifest V3 uses action, V2 uses browserAction)
  getActionAPI(): any {
    if (this.hasActionAPI()) {
      return this.api.action;
    } else if (this.hasBrowserActionAPI()) {
      return (this.api as any).browserAction;
    }
    return null;
  }

  // Permissions
  hasPermissionsAPI(): boolean {
    return hasAPI('chrome.permissions') || hasAPI('browser.permissions');
  }

  // Context menus
  hasContextMenusAPI(): boolean {
    return hasAPI('chrome.contextMenus') || hasAPI('browser.contextMenus');
  }

  // Check if running in service worker context
  isServiceWorkerContext(): boolean {
    return typeof globalThis !== 'undefined' && typeof (globalThis as any).importScripts === 'function' && typeof window === 'undefined';
  }

  // Check if running in content script context
  isContentScriptContext(): boolean {
    return typeof window !== 'undefined' && typeof chrome !== 'undefined' && !!chrome.runtime;
  }

  // Check if running in popup/options context
  isExtensionPageContext(): boolean {
    return typeof window !== 'undefined' && 
           typeof chrome !== 'undefined' && 
           !!chrome.runtime &&
           typeof window.location !== 'undefined' &&
           window.location.protocol === 'chrome-extension:';
  }
}

/**
 * Cross-browser wrapper for common extension APIs
 */
export class CrossBrowserAPI {
  private capabilities: BrowserCapabilities;
  private api: typeof chrome;

  constructor() {
    this.capabilities = BrowserCapabilities.getInstance();
    this.api = this.capabilities.getAPI();
  }

  // Storage wrapper
  async getStorage(keys?: string | string[] | Record<string, any> | null): Promise<Record<string, any>> {
    if (this.capabilities.hasStorageLocal()) {
      return new Promise((resolve, reject) => {
        this.api.storage.local.get(keys || null, (result) => {
          if (this.api.runtime.lastError) {
            reject(new Error(this.api.runtime.lastError.message));
          } else {
            resolve(result);
          }
        });
      });
    }
    throw new Error('Storage API not available');
  }

  async setStorage(items: Record<string, any>): Promise<void> {
    if (this.capabilities.hasStorageLocal()) {
      return new Promise((resolve, reject) => {
        this.api.storage.local.set(items, () => {
          if (this.api.runtime.lastError) {
            reject(new Error(this.api.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    }
    throw new Error('Storage API not available');
  }

  async removeStorage(keys: string | string[]): Promise<void> {
    if (this.capabilities.hasStorageLocal()) {
      return new Promise((resolve, reject) => {
        this.api.storage.local.remove(keys, () => {
          if (this.api.runtime.lastError) {
            reject(new Error(this.api.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    }
    throw new Error('Storage API not available');
  }

  // Messaging wrapper
  async sendMessage(message: any, options?: chrome.runtime.MessageOptions): Promise<any> {
    if (this.capabilities.hasRuntimeMessaging()) {
      return new Promise((resolve, reject) => {
        this.api.runtime.sendMessage(message, options, (response) => {
          if (this.api.runtime.lastError) {
            reject(new Error(this.api.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    }
    throw new Error('Runtime messaging API not available');
  }

  // Tabs wrapper
  async getCurrentTab(): Promise<chrome.tabs.Tab | null> {
    if (this.capabilities.hasTabsAPI()) {
      return new Promise((resolve, reject) => {
        this.api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (this.api.runtime.lastError) {
            reject(new Error(this.api.runtime.lastError.message));
          } else {
            resolve(tabs[0] || null);
          }
        });
      });
    }
    return null;
  }

  // Action wrapper (handles both action and browserAction APIs)
  async setActionBadge(text: string, tabId?: number): Promise<void> {
    const actionAPI = this.capabilities.getActionAPI();
    if (actionAPI && actionAPI.setBadgeText) {
      return new Promise((resolve, reject) => {
        const options: any = { text };
        if (tabId !== undefined) {
          options.tabId = tabId;
        }
        
        actionAPI.setBadgeText(options, () => {
          if (this.api.runtime.lastError) {
            reject(new Error(this.api.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    }
    throw new Error('Action API not available');
  }

  // TTS wrapper
  async speak(text: string, options?: any): Promise<void> {
    if (this.capabilities.hasTTSAPI()) {
      return new Promise((resolve, reject) => {
        this.api.tts.speak(text, options, () => {
          if (this.api.runtime.lastError) {
            reject(new Error(this.api.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    } else if (this.capabilities.hasWebSpeechAPI()) {
      // Fallback to Web Speech API
      return new Promise((resolve, reject) => {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          if (options?.lang) {
            utterance.lang = options.lang;
          }
          if (options?.rate) {
            utterance.rate = options.rate;
          }
          if (options?.pitch) {
            utterance.pitch = options.pitch;
          }
          
          utterance.onend = () => resolve();
          utterance.onerror = (event) => reject(new Error(`Speech synthesis error: ${event.error}`));
          
          speechSynthesis.speak(utterance);
        } catch (error) {
          reject(error);
        }
      });
    }
    throw new Error('TTS API not available');
  }
}