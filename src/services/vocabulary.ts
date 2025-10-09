/**
 * VocabularyStore - Vocabulary management service
 * Provides high-level vocabulary operations with search, filtering, and duplicate detection
 */

import { storageManager } from './storage.js';
import type { VocabularyItem, VocabularyFilter, ExportFormat, LanguageCode } from '../types/index.js';

// Vocabulary operation result types
export interface VocabularyOperationResult {
  success: boolean;
  item?: VocabularyItem;
  error?: string;
}

export interface VocabularySearchResult {
  items: VocabularyItem[];
  totalCount: number;
  hasMore: boolean;
}

// Sort options for vocabulary
export type VocabularySortField = 'word' | 'dateAdded' | 'reviewCount' | 'translation';
export type VocabularySortOrder = 'asc' | 'desc';

export interface VocabularySortOptions {
  field: VocabularySortField;
  order: VocabularySortOrder;
}

// Pagination options
export interface VocabularyPaginationOptions {
  page: number;
  limit: number;
}

/**
 * VocabularyStore manages vocabulary items with advanced search and filtering
 */
export class VocabularyStore {
  private static instance: VocabularyStore;

  private constructor() {}

  /**
   * Get singleton instance of VocabularyStore
   */
  public static getInstance(): VocabularyStore {
    if (!VocabularyStore.instance) {
      VocabularyStore.instance = new VocabularyStore();
    }
    return VocabularyStore.instance;
  }

  /**
   * Add a new vocabulary item with duplicate detection
   */
  async addWord(
    word: string,
    translation: string,
    context: string,
    sourceUrl: string,
    pronunciation: string | undefined,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Promise<VocabularyOperationResult> {
    try {
      // Check for existing word (case-insensitive)
      const existingItems = await storageManager.getVocabulary();
      const existingItem = existingItems.find(
        item => item.word.toLowerCase() === word.toLowerCase()
      );

      const vocabularyItem: VocabularyItem = {
        id: existingItem?.id || this.generateId(),
        word: word.trim(),
        translation: translation.trim(),
        context: context.trim(),
        sourceUrl,
        dateAdded: existingItem?.dateAdded || new Date(),
        reviewCount: existingItem?.reviewCount || 0,
        pronunciation,
        sourceLanguage,
        targetLanguage
      };

      await storageManager.addVocabularyItem(vocabularyItem);

      // Update statistics
      if (!existingItem) {
        const stats = await storageManager.getStatistics();
        await storageManager.updateStatistics({
          wordsLearned: stats.wordsLearned + 1
        });
      }

      return {
        success: true,
        item: vocabularyItem
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add vocabulary item'
      };
    }
  }

  /**
   * Get vocabulary item by ID
   */
  async getWord(id: string): Promise<VocabularyItem | null> {
    try {
      const vocabulary = await storageManager.getVocabulary();
      return vocabulary.find(item => item.id === id) || null;
    } catch (error) {
      console.error('Failed to get vocabulary item:', error);
      return null;
    }
  }

  /**
   * Get all vocabulary items with optional filtering and sorting
   */
  async getWords(
    filter?: VocabularyFilter,
    sort?: VocabularySortOptions,
    pagination?: VocabularyPaginationOptions
  ): Promise<VocabularySearchResult> {
    try {
      let vocabulary = await storageManager.getVocabulary();

      // Apply filters
      if (filter) {
        vocabulary = this.applyFilters(vocabulary, filter);
      }

      // Apply sorting
      if (sort) {
        vocabulary = this.applySorting(vocabulary, sort);
      }

      const totalCount = vocabulary.length;

      // Apply pagination
      if (pagination) {
        const startIndex = (pagination.page - 1) * pagination.limit;
        const endIndex = startIndex + pagination.limit;
        vocabulary = vocabulary.slice(startIndex, endIndex);
      }

      return {
        items: vocabulary,
        totalCount,
        hasMore: pagination ? (pagination.page * pagination.limit) < totalCount : false
      };
    } catch (error) {
      console.error('Failed to get vocabulary items:', error);
      return {
        items: [],
        totalCount: 0,
        hasMore: false
      };
    }
  }

  /**
   * Search vocabulary items by query
   */
  async searchWords(
    query: string,
    sort?: VocabularySortOptions,
    pagination?: VocabularyPaginationOptions
  ): Promise<VocabularySearchResult> {
    if (!query.trim()) {
      return this.getWords(undefined, sort, pagination);
    }

    const searchQuery = query.toLowerCase().trim();
    
    const filter: VocabularyFilter = {
      searchQuery
    };

    return this.getWords(filter, sort, pagination);
  }

  /**
   * Update vocabulary item
   */
  async updateWord(
    id: string,
    updates: Partial<Omit<VocabularyItem, 'id' | 'dateAdded'>>
  ): Promise<VocabularyOperationResult> {
    try {
      const vocabulary = await storageManager.getVocabulary();
      const itemIndex = vocabulary.findIndex(item => item.id === id);

      if (itemIndex === -1) {
        return {
          success: false,
          error: 'Vocabulary item not found'
        };
      }

      const updatedItem: VocabularyItem = {
        ...vocabulary[itemIndex],
        ...updates
      };

      vocabulary[itemIndex] = updatedItem;
      await storageManager.setVocabulary(vocabulary);

      return {
        success: true,
        item: updatedItem
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update vocabulary item'
      };
    }
  }

  /**
   * Delete vocabulary item by ID
   */
  async deleteWord(id: string): Promise<VocabularyOperationResult> {
    try {
      const vocabulary = await storageManager.getVocabulary();
      const itemToDelete = vocabulary.find(item => item.id === id);

      if (!itemToDelete) {
        return {
          success: false,
          error: 'Vocabulary item not found'
        };
      }

      await storageManager.removeVocabularyItem(id);

      // Update statistics
      const stats = await storageManager.getStatistics();
      await storageManager.updateStatistics({
        wordsLearned: Math.max(0, stats.wordsLearned - 1)
      });

      return {
        success: true,
        item: itemToDelete
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete vocabulary item'
      };
    }
  }

  /**
   * Delete multiple vocabulary items by IDs
   */
  async deleteWords(ids: string[]): Promise<{ deleted: number; errors: string[] }> {
    const errors: string[] = [];
    let deleted = 0;

    for (const id of ids) {
      const result = await this.deleteWord(id);
      if (result.success) {
        deleted++;
      } else {
        errors.push(result.error || `Failed to delete item ${id}`);
      }
    }

    return { deleted, errors };
  }

  /**
   * Check if a word already exists in vocabulary
   */
  async wordExists(word: string): Promise<boolean> {
    try {
      const vocabulary = await storageManager.getVocabulary();
      return vocabulary.some(item => item.word.toLowerCase() === word.toLowerCase());
    } catch (error) {
      console.error('Failed to check word existence:', error);
      return false;
    }
  }

  /**
   * Get vocabulary statistics
   */
  async getVocabularyStats(): Promise<{
    totalWords: number;
    averageReviewCount: number;
    mostRecentWord?: VocabularyItem;
    mostReviewedWord?: VocabularyItem;
  }> {
    try {
      const vocabulary = await storageManager.getVocabulary();

      if (vocabulary.length === 0) {
        return {
          totalWords: 0,
          averageReviewCount: 0
        };
      }

      const totalReviews = vocabulary.reduce((sum, item) => sum + item.reviewCount, 0);
      const averageReviewCount = totalReviews / vocabulary.length;

      const mostRecentWord = vocabulary.reduce((latest, item) => 
        item.dateAdded > latest.dateAdded ? item : latest
      );

      const mostReviewedWord = vocabulary.reduce((mostReviewed, item) => 
        item.reviewCount > mostReviewed.reviewCount ? item : mostReviewed
      );

      return {
        totalWords: vocabulary.length,
        averageReviewCount: Math.round(averageReviewCount * 100) / 100,
        mostRecentWord,
        mostReviewedWord
      };
    } catch (error) {
      console.error('Failed to get vocabulary statistics:', error);
      return {
        totalWords: 0,
        averageReviewCount: 0
      };
    }
  }

  /**
   * Increment review count for a vocabulary item
   */
  async incrementReviewCount(id: string): Promise<VocabularyOperationResult> {
    try {
      const item = await this.getWord(id);
      if (!item) {
        return {
          success: false,
          error: 'Vocabulary item not found'
        };
      }

      return this.updateWord(id, {
        reviewCount: item.reviewCount + 1
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to increment review count'
      };
    }
  }

  /**
   * Get random vocabulary items for practice
   */
  async getRandomWords(count: number = 5): Promise<VocabularyItem[]> {
    try {
      const vocabulary = await storageManager.getVocabulary();
      
      if (vocabulary.length === 0) {
        return [];
      }

      // Shuffle array and take first 'count' items
      const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, Math.min(count, vocabulary.length));
    } catch (error) {
      console.error('Failed to get random words:', error);
      return [];
    }
  }

  /**
   * Export vocabulary items in specified format
   */
  async exportWords(format: ExportFormat, filter?: VocabularyFilter): Promise<string> {
    try {
      let vocabulary = await storageManager.getVocabulary();
      
      // Apply filters if provided
      if (filter) {
        vocabulary = this.applyFilters(vocabulary, filter);
      }

      switch (format) {
        case 'json': {
          return JSON.stringify(vocabulary, null, 2);
        }
          
        case 'csv': {
          const headers = ['Word', 'Translation', 'Context', 'Source URL', 'Date Added', 'Review Count'];
          const rows = vocabulary.map(item => [
            item.word,
            item.translation,
            item.context,
            item.sourceUrl,
            item.dateAdded.toISOString().split('T')[0],
            item.reviewCount.toString()
          ]);
          return [headers, ...rows].map(row => 
            row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
          ).join('\n');
        }
          
        case 'txt': {
          return vocabulary.map(item => 
            `${item.word} - ${item.translation}\nContext: ${item.context}\nSource: ${item.sourceUrl}\nAdded: ${item.dateAdded.toISOString().split('T')[0]}\n---`
          ).join('\n\n');
        }
          
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('Failed to export vocabulary:', error);
      throw error;
    }
  }

  /**
   * Apply filters to vocabulary items
   */
  private applyFilters(vocabulary: VocabularyItem[], filter: VocabularyFilter): VocabularyItem[] {
    let filtered = vocabulary;

    // Search query filter
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.word.toLowerCase().includes(query) ||
        item.translation.toLowerCase().includes(query) ||
        item.context.toLowerCase().includes(query)
      );
    }

    // Date range filter
    if (filter.dateRange) {
      filtered = filtered.filter(item => 
        item.dateAdded >= filter.dateRange!.start &&
        item.dateAdded <= filter.dateRange!.end
      );
    }

    // Review count filter
    if (filter.reviewCountMin !== undefined) {
      filtered = filtered.filter(item => item.reviewCount >= filter.reviewCountMin!);
    }

    // Source URL filter
    if (filter.sourceUrl) {
      filtered = filtered.filter(item => item.sourceUrl === filter.sourceUrl);
    }

    return filtered;
  }

  /**
   * Apply sorting to vocabulary items
   */
  private applySorting(vocabulary: VocabularyItem[], sort: VocabularySortOptions): VocabularyItem[] {
    return [...vocabulary].sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case 'word':
          comparison = a.word.localeCompare(b.word);
          break;
        case 'translation':
          comparison = a.translation.localeCompare(b.translation);
          break;
        case 'dateAdded':
          comparison = a.dateAdded.getTime() - b.dateAdded.getTime();
          break;
        case 'reviewCount':
          comparison = a.reviewCount - b.reviewCount;
          break;
        default:
          return 0;
      }

      return sort.order === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Generate unique ID for vocabulary items
   */
  private generateId(): string {
    return `vocab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const vocabularyStore = VocabularyStore.getInstance();