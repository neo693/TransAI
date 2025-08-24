/**
 * Unit tests for VocabularyStore
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VocabularyStore, vocabularyStore } from '../services/vocabulary.js';
import { storageManager } from '../services/storage.js';
import type { VocabularyItem, VocabularyFilter } from '../types/index.js';

// Mock the storage manager
vi.mock('../services/storage.js', () => ({
  storageManager: {
    getVocabulary: vi.fn(),
    setVocabulary: vi.fn(),
    addVocabularyItem: vi.fn(),
    removeVocabularyItem: vi.fn(),
    getStatistics: vi.fn(),
    updateStatistics: vi.fn()
  }
}));

describe('VocabularyStore', () => {
  let store: VocabularyStore;

  const mockVocabularyItem: VocabularyItem = {
    id: 'test-id-1',
    word: 'hello',
    translation: 'hola',
    context: 'greeting someone',
    sourceUrl: 'https://example.com',
    dateAdded: new Date('2024-01-01'),
    reviewCount: 0
  };

  const mockVocabularyItem2: VocabularyItem = {
    id: 'test-id-2',
    word: 'goodbye',
    translation: 'adiós',
    context: 'farewell',
    sourceUrl: 'https://example.com',
    dateAdded: new Date('2024-01-02'),
    reviewCount: 5
  };

  const mockStatistics = {
    translationsCount: 10,
    wordsLearned: 2,
    lastUsed: new Date('2024-01-01')
  };

  beforeEach(() => {
    store = VocabularyStore.getInstance();
    vi.clearAllMocks();
    
    // Setup default mock returns
    vi.mocked(storageManager.getStatistics).mockResolvedValue(mockStatistics);
    vi.mocked(storageManager.updateStatistics).mockResolvedValue(mockStatistics);
    vi.mocked(storageManager.addVocabularyItem).mockResolvedValue();
    vi.mocked(storageManager.setVocabulary).mockResolvedValue();
    vi.mocked(storageManager.removeVocabularyItem).mockResolvedValue();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = VocabularyStore.getInstance();
      const instance2 = VocabularyStore.getInstance();
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(vocabularyStore);
    });
  });

  describe('Adding Words', () => {
    it('should add a new word successfully', async () => {
      vi.mocked(storageManager.getVocabulary).mockResolvedValue([]);

      const result = await store.addWord(
        'hello',
        'hola',
        'greeting someone',
        'https://example.com'
      );

      expect(result.success).toBe(true);
      expect(result.item).toBeDefined();
      expect(result.item?.word).toBe('hello');
      expect(result.item?.translation).toBe('hola');
      expect(storageManager.addVocabularyItem).toHaveBeenCalled();
      expect(storageManager.updateStatistics).toHaveBeenCalledWith({
        wordsLearned: 3
      });
    });

    it('should update existing word instead of creating duplicate', async () => {
      vi.mocked(storageManager.getVocabulary).mockResolvedValue([mockVocabularyItem]);

      const result = await store.addWord(
        'HELLO', // Different case
        'updated translation',
        'updated context',
        'https://example.com'
      );

      expect(result.success).toBe(true);
      expect(result.item?.id).toBe(mockVocabularyItem.id);
      expect(result.item?.translation).toBe('updated translation');
      expect(storageManager.addVocabularyItem).toHaveBeenCalled();
      // Should not increment wordsLearned for existing word
      expect(storageManager.updateStatistics).not.toHaveBeenCalled();
    });

    it('should handle pronunciation parameter', async () => {
      vi.mocked(storageManager.getVocabulary).mockResolvedValue([]);

      const result = await store.addWord(
        'hello',
        'hola',
        'greeting',
        'https://example.com',
        '/həˈloʊ/'
      );

      expect(result.success).toBe(true);
      expect(result.item?.pronunciation).toBe('/həˈloʊ/');
    });

    it('should handle storage errors gracefully', async () => {
      vi.mocked(storageManager.getVocabulary).mockRejectedValue(new Error('Storage error'));

      const result = await store.addWord('hello', 'hola', 'greeting', 'https://example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage error');
    });

    it('should trim whitespace from inputs', async () => {
      vi.mocked(storageManager.getVocabulary).mockResolvedValue([]);

      const result = await store.addWord(
        '  hello  ',
        '  hola  ',
        '  greeting  ',
        'https://example.com'
      );

      expect(result.success).toBe(true);
      expect(result.item?.word).toBe('hello');
      expect(result.item?.translation).toBe('hola');
      expect(result.item?.context).toBe('greeting');
    });
  });

  describe('Getting Words', () => {
    it('should get word by ID', async () => {
      vi.mocked(storageManager.getVocabulary).mockResolvedValue([mockVocabularyItem, mockVocabularyItem2]);

      const result = await store.getWord('test-id-1');

      expect(result).toEqual(mockVocabularyItem);
    });

    it('should return null for non-existent ID', async () => {
      vi.mocked(storageManager.getVocabulary).mockResolvedValue([mockVocabularyItem]);

      const result = await store.getWord('non-existent');

      expect(result).toBeNull();
    });

    it('should get all words without filters', async () => {
      const vocabulary = [mockVocabularyItem, mockVocabularyItem2];
      vi.mocked(storageManager.getVocabulary).mockResolvedValue(vocabulary);

      const result = await store.getWords();

      expect(result.items).toEqual(vocabulary);
      expect(result.totalCount).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('should apply pagination', async () => {
      const vocabulary = [mockVocabularyItem, mockVocabularyItem2];
      vi.mocked(storageManager.getVocabulary).mockResolvedValue(vocabulary);

      const result = await store.getWords(undefined, undefined, { page: 1, limit: 1 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(mockVocabularyItem);
      expect(result.totalCount).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('should apply sorting by word ascending', async () => {
      const vocabulary = [mockVocabularyItem2, mockVocabularyItem]; // goodbye, hello
      vi.mocked(storageManager.getVocabulary).mockResolvedValue(vocabulary);

      const result = await store.getWords(undefined, { field: 'word', order: 'asc' });

      expect(result.items[0].word).toBe('goodbye');
      expect(result.items[1].word).toBe('hello');
    });

    it('should apply sorting by date descending', async () => {
      const vocabulary = [mockVocabularyItem, mockVocabularyItem2];
      vi.mocked(storageManager.getVocabulary).mockResolvedValue(vocabulary);

      const result = await store.getWords(undefined, { field: 'dateAdded', order: 'desc' });

      expect(result.items[0]).toEqual(mockVocabularyItem2); // More recent date
      expect(result.items[1]).toEqual(mockVocabularyItem);
    });

    it('should apply search query filter', async () => {
      const vocabulary = [mockVocabularyItem, mockVocabularyItem2];
      vi.mocked(storageManager.getVocabulary).mockResolvedValue(vocabulary);

      const filter: VocabularyFilter = { searchQuery: 'hello' };
      const result = await store.getWords(filter);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(mockVocabularyItem);
    });

    it('should apply date range filter', async () => {
      const vocabulary = [mockVocabularyItem, mockVocabularyItem2];
      vi.mocked(storageManager.getVocabulary).mockResolvedValue(vocabulary);

      const filter: VocabularyFilter = {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-01')
        }
      };
      const result = await store.getWords(filter);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(mockVocabularyItem);
    });

    it('should apply review count filter', async () => {
      const vocabulary = [mockVocabularyItem, mockVocabularyItem2];
      vi.mocked(storageManager.getVocabulary).mockResolvedValue(vocabulary);

      const filter: VocabularyFilter = { reviewCountMin: 1 };
      const result = await store.getWords(filter);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(mockVocabularyItem2);
    });

    it('should handle storage errors gracefully', async () => {
      vi.mocked(storageManager.getVocabulary).mockRejectedValue(new Error('Storage error'));

      const result = await store.getWords();

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('Searching Words', () => {
    it('should search words by query', async () => {
      const vocabulary = [mockVocabularyItem, mockVocabularyItem2];
      vi.mocked(storageManager.getVocabulary).mockResolvedValue(vocabulary);

      const result = await store.searchWords('hello');

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(mockVocabularyItem);
    });

    it('should search in translation and context', async () => {
      const vocabulary = [mockVocabularyItem, mockVocabularyItem2];
      vi.mocked(storageManager.getVocabulary).mockResolvedValue(vocabulary);

      const result = await store.searchWords('adiós');

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(mockVocabularyItem2);
    });

    it('should return all words for empty query', async () => {
      const vocabulary = [mockVocabularyItem, mockVocabularyItem2];
      vi.mocked(storageManager.getVocabulary).mockResolvedValue(vocabulary);

      const result = await store.searchWords('');

      expect(result.items).toHaveLength(2);
    });

    it('should apply sorting to search results', async () => {
      const vocabulary = [mockVocabularyItem2, mockVocabularyItem];
      vi.mocked(storageManager.getVocabulary).mockResolvedValue(vocabulary);

      const result = await store.searchWords('o', { field: 'word', order: 'asc' });

      expect(result.items[0].word).toBe('goodbye');
      expect(result.items[1].word).toBe('hello');
    });
  });

  describe('Updating Words', () => {
    it('should update existing word', async () => {
      const vocabulary = [mockVocabularyItem, mockVocabularyItem2];
      vi.mocked(storageManager.getVocabulary).mockResolvedValue(vocabulary);

      const updates = { translation: 'updated translation', reviewCount: 10 };
      const result = await store.updateWord('test-id-1', updates);

      expect(result.success).toBe(true);
      expect(result.item?.translation).toBe('updated translation');
      expect(result.item?.reviewCount).toBe(10);
      expect(storageManager.setVocabulary).toHaveBeenCalled();
    });

    it('should return error for non-existent word', async () => {
      vi.mocked(storageManager.getVocabulary).mockResolvedValue([mockVocabularyItem]);

      const result = await store.updateWord('non-existent', { translation: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vocabulary item not found');
    });

    it('should handle storage errors', async () => {
      vi.mocked(storageManager.getVocabulary).mockResolvedValue([mockVocabularyItem]);
      vi.mocked(storageManager.setVocabulary).mockRejectedValue(new Error('Storage error'));

      const result = await store.updateWord('test-id-1', { translation: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage error');
    });
  });

  describe('Deleting Words', () => {
    it('should delete word by ID', async () => {
      vi.mocked(storageManager.getVocabulary).mockResolvedValue([mockVocabularyItem, mockVocabularyItem2]);

      const result = await store.deleteWord('test-id-1');

      expect(result.success).toBe(true);
      expect(result.item).toEqual(mockVocabularyItem);
      expect(storageManager.removeVocabularyItem).toHaveBeenCalledWith('test-id-1');
      expect(storageManager.updateStatistics).toHaveBeenCalledWith({
        wordsLearned: 1 // 2 - 1
      });
    });

    it('should return error for non-existent word', async () => {
      vi.mocked(storageManager.getVocabulary).mockResolvedValue([mockVocabularyItem]);

      const result = await store.deleteWord('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vocabulary item not found');
    });

    it('should delete multiple words', async () => {
      vi.mocked(storageManager.getVocabulary).mockResolvedValue([mockVocabularyItem, mockVocabularyItem2]);

      const result = await store.deleteWords(['test-id-1', 'test-id-2']);

      expect(result.deleted).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial failures in bulk delete', async () => {
      vi.mocked(storageManager.getVocabulary)
        .mockResolvedValueOnce([mockVocabularyItem]) // First call finds item
        .mockResolvedValueOnce([]); // Second call doesn't find item

      const result = await store.deleteWords(['test-id-1', 'non-existent']);

      expect(result.deleted).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Vocabulary item not found');
    });
  });

  describe('Word Existence Check', () => {
    it('should return true for existing word', async () => {
      vi.mocked(storageManager.getVocabulary).mockResolvedValue([mockVocabularyItem]);

      const exists = await store.wordExists('hello');

      expect(exists).toBe(true);
    });

    it('should return true for existing word with different case', async () => {
      vi.mocked(storageManager.getVocabulary).mockResolvedValue([mockVocabularyItem]);

      const exists = await store.wordExists('HELLO');

      expect(exists).toBe(true);
    });

    it('should return false for non-existent word', async () => {
      vi.mocked(storageManager.getVocabulary).mockResolvedValue([mockVocabularyItem]);

      const exists = await store.wordExists('nonexistent');

      expect(exists).toBe(false);
    });

    it('should handle storage errors gracefully', async () => {
      vi.mocked(storageManager.getVocabulary).mockRejectedValue(new Error('Storage error'));

      const exists = await store.wordExists('hello');

      expect(exists).toBe(false);
    });
  });

  describe('Vocabulary Statistics', () => {
    it('should calculate vocabulary statistics', async () => {
      const vocabulary = [mockVocabularyItem, mockVocabularyItem2];
      vi.mocked(storageManager.getVocabulary).mockResolvedValue(vocabulary);

      const stats = await store.getVocabularyStats();

      expect(stats.totalWords).toBe(2);
      expect(stats.averageReviewCount).toBe(2.5); // (0 + 5) / 2
      expect(stats.mostRecentWord).toEqual(mockVocabularyItem2);
      expect(stats.mostReviewedWord).toEqual(mockVocabularyItem2);
    });

    it('should handle empty vocabulary', async () => {
      vi.mocked(storageManager.getVocabulary).mockResolvedValue([]);

      const stats = await store.getVocabularyStats();

      expect(stats.totalWords).toBe(0);
      expect(stats.averageReviewCount).toBe(0);
      expect(stats.mostRecentWord).toBeUndefined();
      expect(stats.mostReviewedWord).toBeUndefined();
    });

    it('should handle storage errors gracefully', async () => {
      vi.mocked(storageManager.getVocabulary).mockRejectedValue(new Error('Storage error'));

      const stats = await store.getVocabularyStats();

      expect(stats.totalWords).toBe(0);
      expect(stats.averageReviewCount).toBe(0);
    });
  });

  describe('Review Count Management', () => {
    it('should increment review count', async () => {
      vi.mocked(storageManager.getVocabulary).mockResolvedValue([mockVocabularyItem]);

      const result = await store.incrementReviewCount('test-id-1');

      expect(result.success).toBe(true);
      expect(storageManager.setVocabulary).toHaveBeenCalled();
    });

    it('should return error for non-existent word', async () => {
      vi.mocked(storageManager.getVocabulary).mockResolvedValue([]);

      const result = await store.incrementReviewCount('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vocabulary item not found');
    });
  });

  describe('Random Words', () => {
    it('should return random words', async () => {
      const vocabulary = [mockVocabularyItem, mockVocabularyItem2];
      vi.mocked(storageManager.getVocabulary).mockResolvedValue(vocabulary);

      const randomWords = await store.getRandomWords(2);

      expect(randomWords).toHaveLength(2);
      expect(vocabulary).toContain(randomWords[0]);
      expect(vocabulary).toContain(randomWords[1]);
    });

    it('should return all words if count exceeds vocabulary size', async () => {
      const vocabulary = [mockVocabularyItem];
      vi.mocked(storageManager.getVocabulary).mockResolvedValue(vocabulary);

      const randomWords = await store.getRandomWords(5);

      expect(randomWords).toHaveLength(1);
      expect(randomWords[0]).toEqual(mockVocabularyItem);
    });

    it('should return empty array for empty vocabulary', async () => {
      vi.mocked(storageManager.getVocabulary).mockResolvedValue([]);

      const randomWords = await store.getRandomWords(5);

      expect(randomWords).toHaveLength(0);
    });

    it('should handle storage errors gracefully', async () => {
      vi.mocked(storageManager.getVocabulary).mockRejectedValue(new Error('Storage error'));

      const randomWords = await store.getRandomWords(5);

      expect(randomWords).toHaveLength(0);
    });
  });
});