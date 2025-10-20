/**
 * StorageManager - Browser extension storage wrapper
 * Provides CRUD operations for vocabulary and configuration with error handling
 */

import type { 
  VocabularyItem, 
  UserConfig, 
  ExtensionStorage, 
  ExtensionStatistics,
  TranslationResult 
} from '../types/index.js';
import { CrossBrowserAPI } from '../utils/browser-detection.js';

// Storage keys for different data types
export const STORAGE_KEYS = {
  VOCABULARY: 'vocabulary',
  CONFIG: 'config',
  STATISTICS: 'statistics',
  CACHE_TRANSLATIONS: 'cache_translations',
  CACHE_AUDIO: 'cache_audio'
} as const;

// Storage error types
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: StorageErrorCode,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export enum StorageErrorCode {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  CORRUPTION = 'CORRUPTION',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN'
}

// Default configuration
const DEFAULT_CONFIG: UserConfig = {
  apiKey: '',
  apiProvider: 'openai',
  apiBaseUrl: '',
  selectedModel: '',
  defaultTargetLanguage: 'en',
  customPrompts: {
    translation: 'Translate the following text to {targetLanguage} and provide 2-3 example sentences using the translated word or phrase:',
    sentenceGeneration: 'Generate 3 example sentences using these vocabulary words: {words}',
    articleGeneration: 'Write a short article (200-300 words) incorporating these vocabulary words: {words}'
  },
  uiPreferences: {
    theme: 'auto',
    overlayPosition: 'auto',
    overlayTriggerMode: 'auto',
    autoPlayPronunciation: false
  }
};

const DEFAULT_STATISTICS: ExtensionStatistics = {
  translationsCount: 0,
  wordsLearned: 0,
  lastUsed: new Date()
};

/**
 * StorageManager handles all browser extension storage operations
 * Supports both local and sync storage with automatic fallback
 */
export class StorageManager {
  private static instance: StorageManager;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second
  private readonly browserAPI: CrossBrowserAPI;

  private constructor() {
    this.browserAPI = new CrossBrowserAPI();
  }

  /**
   * Get singleton instance of StorageManager
   */
  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  /**
   * Get vocabulary items from storage
   */
  async getVocabulary(): Promise<VocabularyItem[]> {
    try {
      const result = await this.getWithRetry<VocabularyItem[]>(STORAGE_KEYS.VOCABULARY);
      if (!result) return [];
      
      // Convert dateAdded strings back to Date objects
      return result.map(item => ({
        ...item,
        dateAdded: item.dateAdded instanceof Date ? item.dateAdded : new Date(item.dateAdded)
      }));
    } catch (error) {
      throw this.handleStorageError(error, 'Failed to get vocabulary');
    }
  }

  /**
   * Save vocabulary items to storage
   */
  async setVocabulary(vocabulary: VocabularyItem[]): Promise<void> {
    try {
      // Convert Date objects to ISO strings for storage
      const serializedVocabulary = vocabulary.map(item => ({
        ...item,
        dateAdded: item.dateAdded instanceof Date ? item.dateAdded.toISOString() : item.dateAdded
      }));
      await this.setWithRetry(STORAGE_KEYS.VOCABULARY, serializedVocabulary);
    } catch (error) {
      throw this.handleStorageError(error, 'Failed to save vocabulary');
    }
  }

  /**
   * Add a single vocabulary item
   */
  async addVocabularyItem(item: VocabularyItem): Promise<void> {
    const vocabulary = await this.getVocabulary();
    
    // Check for duplicates
    const existingIndex = vocabulary.findIndex(v => v.word.toLowerCase() === item.word.toLowerCase());
    
    if (existingIndex >= 0) {
      // Update existing item
      vocabulary[existingIndex] = { ...vocabulary[existingIndex], ...item };
    } else {
      // Add new item
      vocabulary.push(item);
    }
    
    await this.setVocabulary(vocabulary);
  }

  /**
   * Remove vocabulary item by ID
   */
  async removeVocabularyItem(id: string): Promise<void> {
    const vocabulary = await this.getVocabulary();
    const filtered = vocabulary.filter(item => item.id !== id);
    await this.setVocabulary(filtered);
  }

  /**
   * Get user configuration
   */
  async getConfig(): Promise<UserConfig> {
    try {
      const result = await this.getWithRetry<UserConfig>(STORAGE_KEYS.CONFIG);
      return result ? { ...DEFAULT_CONFIG, ...result } : DEFAULT_CONFIG;
    } catch (error) {
      throw this.handleStorageError(error, 'Failed to get configuration');
    }
  }

  /**
   * Save user configuration
   */
  async setConfig(config: Partial<UserConfig>): Promise<void> {
    try {
      const currentConfig = await this.getConfig();
      const updatedConfig = { ...currentConfig, ...config };
      await this.setWithRetry(STORAGE_KEYS.CONFIG, updatedConfig);
    } catch (error) {
      throw this.handleStorageError(error, 'Failed to save configuration');
    }
  }

  /**
   * Update user configuration and return the updated config
   */
  async updateConfig(config: Partial<UserConfig>): Promise<UserConfig> {
    try {
      const currentConfig = await this.getConfig();
      const updatedConfig = { ...currentConfig, ...config };
      await this.setWithRetry(STORAGE_KEYS.CONFIG, updatedConfig);
      return updatedConfig;
    } catch (error) {
      throw this.handleStorageError(error, 'Failed to update configuration');
    }
  }

  /**
   * Get extension statistics
   */
  async getStatistics(): Promise<ExtensionStatistics> {
    try {
      const result = await this.getWithRetry<ExtensionStatistics>(STORAGE_KEYS.STATISTICS);
      return result ? { ...DEFAULT_STATISTICS, ...result } : DEFAULT_STATISTICS;
    } catch (error) {
      throw this.handleStorageError(error, 'Failed to get statistics');
    }
  }

  /**
   * Save extension statistics
   */
  async saveStatistics(statistics: ExtensionStatistics): Promise<void> {
    try {
      await this.setWithRetry(STORAGE_KEYS.STATISTICS, statistics);
    } catch (error) {
      throw this.handleStorageError(error, 'Failed to save statistics');
    }
  }

  /**
   * Update extension statistics
   */
  async updateStatistics(updates: Partial<ExtensionStatistics>): Promise<ExtensionStatistics> {
    try {
      const currentStats = await this.getStatistics();
      const updatedStats = { ...currentStats, ...updates, lastUsed: new Date() };
      await this.setWithRetry(STORAGE_KEYS.STATISTICS, updatedStats);
      return updatedStats;
    } catch (error) {
      throw this.handleStorageError(error, 'Failed to update statistics');
    }
  }

  /**
   * Get cached translation
   */
  async getCachedTranslation(key: string): Promise<TranslationResult | null> {
    try {
      const cache = await this.getWithRetry<Record<string, TranslationResult>>(STORAGE_KEYS.CACHE_TRANSLATIONS) || {};
      return cache[key] || null;
    } catch (error) {
      console.warn('Failed to get cached translation:', error);
      return null;
    }
  }

  /**
   * Cache translation result
   */
  async setCachedTranslation(key: string, translation: TranslationResult): Promise<void> {
    try {
      const cache = await this.getWithRetry<Record<string, TranslationResult>>(STORAGE_KEYS.CACHE_TRANSLATIONS) || {};
      cache[key] = translation;
      
      // Limit cache size (keep only last 100 translations)
      const entries = Object.entries(cache);
      if (entries.length > 100) {
        const sorted = entries.sort((a, b) => 
          new Date(b[1].timestamp).getTime() - new Date(a[1].timestamp).getTime()
        );
        const limited = Object.fromEntries(sorted.slice(0, 100));
        await this.setWithRetry(STORAGE_KEYS.CACHE_TRANSLATIONS, limited);
      } else {
        await this.setWithRetry(STORAGE_KEYS.CACHE_TRANSLATIONS, cache);
      }
    } catch (error) {
      console.warn('Failed to cache translation:', error);
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    try {
      await Promise.all([
        this.setWithRetry(STORAGE_KEYS.CACHE_TRANSLATIONS, {}),
        this.setWithRetry(STORAGE_KEYS.CACHE_AUDIO, {})
      ]);
    } catch (error) {
      throw this.handleStorageError(error, 'Failed to clear cache');
    }
  }

  /**
   * Get storage usage information
   */
  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    try {
      if (chrome?.storage?.local?.getBytesInUse) {
        const used = await chrome.storage.local.getBytesInUse();
        const quota = chrome.storage.local.QUOTA_BYTES || 5242880; // 5MB default
        return { used, quota };
      }
      return { used: 0, quota: 5242880 };
    } catch (error) {
      console.warn('Failed to get storage usage:', error);
      return { used: 0, quota: 5242880 };
    }
  }

  /**
   * Export all data for backup
   */
  async exportAllData(): Promise<Partial<ExtensionStorage>> {
    try {
      const [vocabulary, config, statistics] = await Promise.all([
        this.getVocabulary(),
        this.getConfig(),
        this.getStatistics()
      ]);

      return {
        vocabulary,
        config,
        statistics
      };
    } catch (error) {
      throw this.handleStorageError(error, 'Failed to export data');
    }
  }

  /**
   * Import data from backup
   */
  async importData(data: Partial<ExtensionStorage>): Promise<void> {
    try {
      const operations: Promise<any>[] = [];

      if (data.vocabulary) {
        operations.push(this.setVocabulary(data.vocabulary));
      }
      if (data.config) {
        operations.push(this.setConfig(data.config));
      }
      if (data.statistics) {
        operations.push(this.updateStatistics(data.statistics));
      }

      await Promise.all(operations);
    } catch (error) {
      throw this.handleStorageError(error, 'Failed to import data');
    }
  }

  /**
   * Get data with retry mechanism
   */
  private async getWithRetry<T>(key: string): Promise<T | null> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const result = await this.browserAPI.getStorage(key);
        return result[key] || null;
      } catch (error) {
        if (attempt === this.maxRetries - 1) throw error;
        await this.delay(this.retryDelay * (attempt + 1));
      }
    }
    return null;
  }

  /**
   * Set data with retry mechanism
   */
  private async setWithRetry<T>(key: string, value: T): Promise<void> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        await this.browserAPI.setStorage({ [key]: value });
        return;
      } catch (error) {
        if (attempt === this.maxRetries - 1) throw error;
        await this.delay(this.retryDelay * (attempt + 1));
      }
    }
  }

  /**
   * Handle storage errors and convert to StorageError
   */
  private handleStorageError(error: unknown, message: string): StorageError {
    if (error instanceof Error) {
      // Check for specific Chrome storage errors
      if (error.message.includes('QUOTA_EXCEEDED')) {
        return new StorageError(
          `${message}: Storage quota exceeded`,
          StorageErrorCode.QUOTA_EXCEEDED,
          error
        );
      }
      if (error.message.includes('access')) {
        return new StorageError(
          `${message}: Storage access denied`,
          StorageErrorCode.ACCESS_DENIED,
          error
        );
      }
      if (error.message.includes('network') || error.message.includes('offline')) {
        return new StorageError(
          `${message}: Network error`,
          StorageErrorCode.NETWORK_ERROR,
          error
        );
      }
    }

    return new StorageError(
      `${message}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      StorageErrorCode.UNKNOWN,
      error instanceof Error ? error : undefined
    );
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const storageManager = StorageManager.getInstance();

/**
 * Create LLM client configuration from user config
 */
export function createLLMConfig(userConfig: UserConfig): {
  provider: import('../types/index.js').APIProvider;
  config: any;
} {
  const baseConfig = {
    apiKey: userConfig.apiKey,
    baseUrl: userConfig.apiBaseUrl,
    model: userConfig.selectedModel
  };

  return {
    provider: userConfig.apiProvider,
    config: baseConfig
  };
}