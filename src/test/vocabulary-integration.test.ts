import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BackgroundService } from '../background/background-service.js';
import { MessageType, CheckVocabularyMessage, AddToVocabularyMessage, SuccessMessage, ErrorMessage } from '../types/messages.js';

// Mock the services
vi.mock('../services/index.js', () => ({
  storageManager: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn()
  },
  vocabularyStore: {
    addWord: vi.fn(),
    getWords: vi.fn(),
    searchWords: vi.fn(),
    deleteWord: vi.fn(),
    updateWord: vi.fn(),
    exportWords: vi.fn()
  },
  TranslationServiceFactory: {
    create: vi.fn()
  },
  ContentGenerationServiceFactory: {
    create: vi.fn()
  },
  LLMClientFactory: {
    create: vi.fn()
  }
}));

describe('Vocabulary Integration', () => {
  let backgroundService: BackgroundService;

  beforeEach(async () => {
    vi.clearAllMocks();
    backgroundService = new BackgroundService();
    await backgroundService.initialize();
  });

  afterEach(async () => {
    backgroundService.cleanup();
  });

  describe('CHECK_VOCABULARY message handling', () => {
    it('should check if word exists in vocabulary', async () => {
      const { vocabularyStore } = await import('../services/index.js');
      
      // Mock word exists
      (vocabularyStore.searchWords as any).mockResolvedValue([
        { id: '1', word: 'hello', translation: 'hola' }
      ]);

      const message: CheckVocabularyMessage = {
        id: 'test-1',
        type: MessageType.CHECK_VOCABULARY,
        timestamp: Date.now(),
        payload: { word: 'hello' }
      };

      const response = await backgroundService['handleCheckVocabulary'](message);

      expect(response.type).toBe(MessageType.SUCCESS);
      expect((response as SuccessMessage).payload.data.exists).toBe(true);
      expect((response as SuccessMessage).payload.data.word).toBe('hello');
    });

    it('should return false when word does not exist', async () => {
      const { vocabularyStore } = await import('../services/index.js');
      
      // Mock word does not exist
      (vocabularyStore.searchWords as any).mockResolvedValue([]);

      const message: CheckVocabularyMessage = {
        id: 'test-2',
        type: MessageType.CHECK_VOCABULARY,
        timestamp: Date.now(),
        payload: { word: 'nonexistent' }
      };

      const response = await backgroundService['handleCheckVocabulary'](message);

      expect(response.type).toBe(MessageType.SUCCESS);
      expect((response as SuccessMessage).payload.data.exists).toBe(false);
      expect((response as SuccessMessage).payload.data.word).toBe('nonexistent');
    });

    it('should handle case-insensitive word checking', async () => {
      const { vocabularyStore } = await import('../services/index.js');
      
      // Mock word exists with different case
      (vocabularyStore.searchWords as any).mockResolvedValue([
        { id: '1', word: 'Hello', translation: 'hola' }
      ]);

      const message: CheckVocabularyMessage = {
        id: 'test-3',
        type: MessageType.CHECK_VOCABULARY,
        timestamp: Date.now(),
        payload: { word: 'hello' }
      };

      const response = await backgroundService['handleCheckVocabulary'](message);

      expect(response.type).toBe(MessageType.SUCCESS);
      expect((response as SuccessMessage).payload.data.exists).toBe(true);
    });
  });

  describe('ADD_TO_VOCABULARY duplicate handling', () => {
    it('should prevent adding duplicate words', async () => {
      const { vocabularyStore } = await import('../services/index.js');
      
      // Mock word already exists
      (vocabularyStore.searchWords as any).mockResolvedValue([
        { id: '1', word: 'hello', translation: 'hola' }
      ]);

      const message: AddToVocabularyMessage = {
        id: 'test-4',
        type: MessageType.ADD_TO_VOCABULARY,
        timestamp: Date.now(),
        payload: {
          word: 'hello',
          translation: 'hola',
          context: 'Hello world',
          sourceUrl: 'https://example.com',
          sourceLanguage: 'en',
          targetLanguage: 'es'
        }
      };
      const response = await backgroundService['handleAddToVocabulary'](message);

      expect(response.type).toBe(MessageType.ERROR);
      expect((response as ErrorMessage).payload.code).toBe('WORD_EXISTS');
      expect(vocabularyStore.addWord).not.toHaveBeenCalled();
    });

    it('should add word when it does not exist', async () => {
      const { vocabularyStore } = await import('../services/index.js');
      
      // Mock word does not exist
      (vocabularyStore.searchWords as any).mockResolvedValue([]);
      (vocabularyStore.addWord as any).mockResolvedValue({
        id: 'new-1',
        word: 'goodbye',
        translation: 'adiós'
      });

      const message: AddToVocabularyMessage = {
        id: 'test-5',
        type: MessageType.ADD_TO_VOCABULARY,
        timestamp: Date.now(),
        payload: {
          word: 'goodbye',
          translation: 'adiós',
          context: 'Goodbye world',
          sourceUrl: 'https://example.com',
          sourceLanguage: 'en',
          targetLanguage: 'es'
        }
      };

      const response = await backgroundService['handleAddToVocabulary'](message);

      expect(response.type).toBe(MessageType.SUCCESS);
      expect((response as SuccessMessage).payload.message).toBeUndefined();
      expect(vocabularyStore.addWord).toHaveBeenCalledWith(
        'goodbye',
        'adiós',
        'Goodbye world',
        'https://example.com',
        undefined,
        'en',
        'es'
      );
    });

    it('should handle case-insensitive duplicate detection', async () => {
      const { vocabularyStore } = await import('../services/index.js');
      
      // Mock word exists with different case
      (vocabularyStore.searchWords as any).mockResolvedValue([
        { id: '1', word: 'Hello', translation: 'hola' }
      ]);

      const message: AddToVocabularyMessage = {
        id: 'test-6',
        type: MessageType.ADD_TO_VOCABULARY,
        timestamp: Date.now(),
        payload: {
          word: 'hello',
          translation: 'hola',
          context: 'Hello world',
          sourceUrl: 'https://example.com',
          sourceLanguage: 'en',
          targetLanguage: 'es'
        }
      };

      const response = await backgroundService['handleAddToVocabulary'](message);

      expect(response.type).toBe(MessageType.ERROR);
      expect((response as ErrorMessage).payload.code).toBe('WORD_EXISTS');
    });
  });

  describe('error handling', () => {
    it('should handle vocabulary service errors gracefully', async () => {
      const { vocabularyStore } = await import('../services/index.js');
      
      // Mock service error
      (vocabularyStore.searchWords as any).mockRejectedValue(new Error('Database error'));

      const message: CheckVocabularyMessage = {
        id: 'test-7',
        type: MessageType.CHECK_VOCABULARY,
        timestamp: Date.now(),
        payload: { word: 'test' }
      };

      const response = await backgroundService['handleCheckVocabulary'](message);

      expect(response.type).toBe(MessageType.ERROR);
      expect((response as ErrorMessage).payload.error).toContain('Database error');
    });
  });
});