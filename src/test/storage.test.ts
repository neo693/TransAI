/**
 * Unit tests for StorageManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageManager, StorageError, StorageErrorCode, STORAGE_KEYS } from '../services/storage.js';
import type { VocabularyItem, UserConfig, ExtensionStatistics, TranslationResult } from '../types/index.js';

// Mock Chrome storage API
const mockStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn(),
    getBytesInUse: vi.fn(),
    QUOTA_BYTES: 5242880
  }
};

// Mock chrome global
global.chrome = {
  storage: mockStorage
} as any;

describe('StorageManager', () => {
  let storageManager: StorageManager;

  beforeEach(() => {
    storageManager = StorageManager.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = StorageManager.getInstance();
      const instance2 = StorageManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Vocabulary Operations', () => {
    const mockVocabularyItem: VocabularyItem = {
      id: 'test-id',
      word: 'hello',
      translation: 'hola',
      context: 'greeting',
      sourceUrl: 'https://example.com',
      dateAdded: new Date('2024-01-01'),
      reviewCount: 0
    };

    it('should get vocabulary items', async () => {
      const mockVocabulary = [mockVocabularyItem];
      mockStorage.local.get.mockResolvedValue({ [STORAGE_KEYS.VOCABULARY]: mockVocabulary });

      const result = await storageManager.getVocabulary();

      expect(mockStorage.local.get).toHaveBeenCalledWith(STORAGE_KEYS.VOCABULARY);
      expect(result).toEqual(mockVocabulary);
    });

    it('should return empty array when no vocabulary exists', async () => {
      mockStorage.local.get.mockResolvedValue({});

      const result = await storageManager.getVocabulary();

      expect(result).toEqual([]);
    });

    it('should save vocabulary items', async () => {
      const mockVocabulary = [mockVocabularyItem];
      mockStorage.local.set.mockResolvedValue(undefined);

      await storageManager.setVocabulary(mockVocabulary);

      expect(mockStorage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.VOCABULARY]: mockVocabulary
      });
    });

    it('should add new vocabulary item', async () => {
      const existingVocabulary = [mockVocabularyItem];
      const newItem: VocabularyItem = {
        ...mockVocabularyItem,
        id: 'new-id',
        word: 'goodbye',
        translation: 'adiós'
      };

      mockStorage.local.get.mockResolvedValue({ [STORAGE_KEYS.VOCABULARY]: existingVocabulary });
      mockStorage.local.set.mockResolvedValue(undefined);

      await storageManager.addVocabularyItem(newItem);

      expect(mockStorage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.VOCABULARY]: [mockVocabularyItem, newItem]
      });
    });

    it('should update existing vocabulary item when word already exists', async () => {
      const existingVocabulary = [mockVocabularyItem];
      const updatedItem: VocabularyItem = {
        ...mockVocabularyItem,
        translation: 'updated translation',
        reviewCount: 5
      };

      mockStorage.local.get.mockResolvedValue({ [STORAGE_KEYS.VOCABULARY]: existingVocabulary });
      mockStorage.local.set.mockResolvedValue(undefined);

      await storageManager.addVocabularyItem(updatedItem);

      expect(mockStorage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.VOCABULARY]: [updatedItem]
      });
    });

    it('should remove vocabulary item by ID', async () => {
      const vocabulary = [
        mockVocabularyItem,
        { ...mockVocabularyItem, id: 'item-2', word: 'world' }
      ];

      mockStorage.local.get.mockResolvedValue({ [STORAGE_KEYS.VOCABULARY]: vocabulary });
      mockStorage.local.set.mockResolvedValue(undefined);

      await storageManager.removeVocabularyItem('test-id');

      expect(mockStorage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.VOCABULARY]: [{ ...mockVocabularyItem, id: 'item-2', word: 'world' }]
      });
    });
  });

  describe('Configuration Operations', () => {
    const mockConfig: UserConfig = {
      apiKey: 'test-key',
      apiProvider: 'openai',
      defaultTargetLanguage: 'es',
      customPrompts: {
        translation: 'Custom translation prompt',
        sentenceGeneration: 'Custom sentence prompt',
        articleGeneration: 'Custom article prompt'
      },
      uiPreferences: {
        theme: 'dark',
        overlayPosition: 'top',
        autoPlayPronunciation: true
      }
    };

    it('should get configuration with defaults', async () => {
      mockStorage.local.get.mockResolvedValue({});

      const result = await storageManager.getConfig();

      expect(result).toMatchObject({
        apiKey: '',
        apiProvider: 'openai',
        defaultTargetLanguage: 'en'
      });
    });

    it('should get saved configuration', async () => {
      mockStorage.local.get.mockResolvedValue({ [STORAGE_KEYS.CONFIG]: mockConfig });

      const result = await storageManager.getConfig();

      expect(result).toEqual(mockConfig);
    });

    it('should save configuration', async () => {
      const partialConfig = { apiKey: 'new-key', apiProvider: 'anthropic' as const };
      
      mockStorage.local.get.mockResolvedValue({ [STORAGE_KEYS.CONFIG]: mockConfig });
      mockStorage.local.set.mockResolvedValue(undefined);

      await storageManager.setConfig(partialConfig);

      expect(mockStorage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.CONFIG]: { ...mockConfig, ...partialConfig }
      });
    });
  });

  describe('Statistics Operations', () => {
    const mockStats: ExtensionStatistics = {
      translationsCount: 10,
      wordsLearned: 5,
      lastUsed: new Date('2024-01-01')
    };

    it('should get statistics with defaults', async () => {
      mockStorage.local.get.mockResolvedValue({});

      const result = await storageManager.getStatistics();

      expect(result).toMatchObject({
        translationsCount: 0,
        wordsLearned: 0
      });
      expect(result.lastUsed).toBeInstanceOf(Date);
    });

    it('should get saved statistics', async () => {
      mockStorage.local.get.mockResolvedValue({ [STORAGE_KEYS.STATISTICS]: mockStats });

      const result = await storageManager.getStatistics();

      expect(result).toEqual(mockStats);
    });

    it('should update statistics', async () => {
      const updates = { translationsCount: 15, wordsLearned: 8 };
      
      mockStorage.local.get.mockResolvedValue({ [STORAGE_KEYS.STATISTICS]: mockStats });
      mockStorage.local.set.mockResolvedValue(undefined);

      await storageManager.updateStatistics(updates);

      expect(mockStorage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.STATISTICS]: expect.objectContaining({
          translationsCount: 15,
          wordsLearned: 8,
          lastUsed: expect.any(Date)
        })
      });
    });

    it('should update lastUsed when updating statistics', async () => {
      const updates = { translationsCount: 15 };
      
      mockStorage.local.get.mockResolvedValue({ [STORAGE_KEYS.STATISTICS]: mockStats });
      mockStorage.local.set.mockResolvedValue(undefined);

      const beforeUpdate = new Date();
      await storageManager.updateStatistics(updates);
      const afterUpdate = new Date();

      const setCall = mockStorage.local.set.mock.calls[0][0];
      const savedStats = setCall[STORAGE_KEYS.STATISTICS];
      
      expect(savedStats.lastUsed).toBeInstanceOf(Date);
      expect(savedStats.lastUsed.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(savedStats.lastUsed.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
    });
  });

  describe('Cache Operations', () => {
    const mockTranslation: TranslationResult = {
      originalText: 'hello',
      translatedText: 'hola',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      examples: [],
      confidence: 0.9,
      timestamp: new Date('2024-01-01')
    };

    it('should get cached translation', async () => {
      const cache = { 'test-key': mockTranslation };
      mockStorage.local.get.mockResolvedValue({ [STORAGE_KEYS.CACHE_TRANSLATIONS]: cache });

      const result = await storageManager.getCachedTranslation('test-key');

      expect(result).toEqual(mockTranslation);
    });

    it('should return null for non-existent cached translation', async () => {
      mockStorage.local.get.mockResolvedValue({});

      const result = await storageManager.getCachedTranslation('non-existent');

      expect(result).toBeNull();
    });

    it('should cache translation', async () => {
      mockStorage.local.get.mockResolvedValue({ [STORAGE_KEYS.CACHE_TRANSLATIONS]: {} });
      mockStorage.local.set.mockResolvedValue(undefined);

      await storageManager.setCachedTranslation('test-key', mockTranslation);

      expect(mockStorage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.CACHE_TRANSLATIONS]: { 'test-key': mockTranslation }
      });
    });

    it('should limit cache size to 100 items', async () => {
      // Create cache with 101 items
      const largeCache: Record<string, any> = {};
      for (let i = 0; i < 101; i++) {
        largeCache[`key-${i}`] = {
          ...mockTranslation,
          timestamp: new Date(2024, 0, i + 1) // Different timestamps
        };
      }

      mockStorage.local.get.mockResolvedValue({ [STORAGE_KEYS.CACHE_TRANSLATIONS]: largeCache });
      mockStorage.local.set.mockResolvedValue(undefined);

      await storageManager.setCachedTranslation('new-key', mockTranslation);

      const setCall = mockStorage.local.set.mock.calls[0][0];
      const savedCache = setCall[STORAGE_KEYS.CACHE_TRANSLATIONS];
      
      expect(Object.keys(savedCache)).toHaveLength(100);
    });

    it('should clear cache', async () => {
      mockStorage.local.set.mockResolvedValue(undefined);

      await storageManager.clearCache();

      expect(mockStorage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.CACHE_TRANSLATIONS]: {}
      });
      expect(mockStorage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.CACHE_AUDIO]: {}
      });
    });
  });

  describe('Storage Usage', () => {
    it('should get storage usage information', async () => {
      mockStorage.local.getBytesInUse.mockResolvedValue(1000);

      const result = await storageManager.getStorageUsage();

      expect(result).toEqual({
        used: 1000,
        quota: 5242880
      });
    });

    it('should handle missing getBytesInUse API', async () => {
      delete (mockStorage.local as any).getBytesInUse;

      const result = await storageManager.getStorageUsage();

      expect(result).toEqual({
        used: 0,
        quota: 5242880
      });
    });
  });

  describe('Data Export/Import', () => {
    const mockData = {
      vocabulary: [
        {
          id: 'test-id',
          word: 'hello',
          translation: 'hola',
          context: 'greeting',
          sourceUrl: 'https://example.com',
          dateAdded: new Date('2024-01-01'),
          reviewCount: 0
        }
      ],
      config: {
        apiKey: 'test-key',
        apiProvider: 'openai' as const,
        defaultTargetLanguage: 'es' as const,
        customPrompts: {
          translation: 'test',
          sentenceGeneration: 'test',
          articleGeneration: 'test'
        },
        uiPreferences: {
          theme: 'dark' as const,
          overlayPosition: 'top' as const,
          autoPlayPronunciation: true
        }
      },
      statistics: {
        translationsCount: 10,
        wordsLearned: 5,
        lastUsed: new Date('2024-01-01')
      }
    };

    it('should export all data', async () => {
      mockStorage.local.get
        .mockResolvedValueOnce({ [STORAGE_KEYS.VOCABULARY]: mockData.vocabulary })
        .mockResolvedValueOnce({ [STORAGE_KEYS.CONFIG]: mockData.config })
        .mockResolvedValueOnce({ [STORAGE_KEYS.STATISTICS]: mockData.statistics });

      const result = await storageManager.exportAllData();

      expect(result).toEqual(mockData);
    });

    it('should import data', async () => {
      mockStorage.local.get.mockResolvedValue({});
      mockStorage.local.set.mockResolvedValue(undefined);

      await storageManager.importData(mockData);

      expect(mockStorage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.VOCABULARY]: mockData.vocabulary
      });
      expect(mockStorage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.CONFIG]: expect.objectContaining(mockData.config)
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle quota exceeded error', async () => {
      const quotaError = new Error('QUOTA_EXCEEDED');
      mockStorage.local.get.mockRejectedValue(quotaError);

      try {
        await storageManager.getVocabulary();
        expect.fail('Should have thrown StorageError');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(StorageErrorCode.QUOTA_EXCEEDED);
      }
    }, 10000);

    it('should handle access denied error', async () => {
      const accessError = new Error('Storage access denied');
      mockStorage.local.set.mockRejectedValue(accessError);

      try {
        await storageManager.setVocabulary([]);
        expect.fail('Should have thrown StorageError');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(StorageErrorCode.ACCESS_DENIED);
      }
    }, 10000);

    it('should retry operations on failure', async () => {
      mockStorage.local.get
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ [STORAGE_KEYS.VOCABULARY]: [] });

      const result = await storageManager.getVocabulary();

      expect(mockStorage.local.get).toHaveBeenCalledTimes(3);
      expect(result).toEqual([]);
    });

    it('should fail after max retries', async () => {
      const persistentError = new Error('Persistent failure');
      mockStorage.local.get.mockRejectedValue(persistentError);

      await expect(storageManager.getVocabulary()).rejects.toThrow(StorageError);
      expect(mockStorage.local.get).toHaveBeenCalledTimes(3);
    });

    it('should handle cache errors gracefully', async () => {
      mockStorage.local.get.mockRejectedValue(new Error('Cache error'));

      const result = await storageManager.getCachedTranslation('test-key');

      expect(result).toBeNull();
    });
  });
});