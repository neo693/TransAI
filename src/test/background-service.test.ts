// Integration tests for BackgroundService

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { BackgroundService, BackgroundServiceError } from '../background/background-service.js';
import { MessageType, type UserConfig, type ExtensionStatistics } from '../types/index.js';

// Mock all dependencies
vi.mock('../background/message-router.js', () => ({
  messageRouter: {
    registerHandler: vi.fn(),
    createSuccessResponse: vi.fn((id, data) => ({
      id,
      type: MessageType.SUCCESS,
      timestamp: Date.now(),
      payload: { data }
    })),
    cleanup: vi.fn()
  },
  MessageRouterError: class extends Error {}
}));

vi.mock('../services/index.js', () => ({
  storageManager: {
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
    getStatistics: vi.fn(),
    saveStatistics: vi.fn(),
    updateStatistics: vi.fn()
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

// Import mocked modules
import { messageRouter } from '../background/message-router.js';
import {
  storageManager,
  vocabularyStore,
  TranslationServiceFactory,
  ContentGenerationServiceFactory,
  LLMClientFactory
} from '../services/index.js';

describe('BackgroundService', () => {
  let backgroundService: BackgroundService;
  let mockTranslationService: any;
  let mockContentGenerationService: any;
  let mockLLMClient: any;

  const mockConfig: UserConfig = {
    apiKey: 'test-api-key',
    apiProvider: 'openai',
    defaultTargetLanguage: 'es',
    customPrompts: {
      translation: 'Translate this text',
      sentenceGeneration: 'Generate sentences',
      articleGeneration: 'Generate article'
    },
    uiPreferences: {
      theme: 'light',
      overlayPosition: 'auto',
      autoPlayPronunciation: false
    }
  };

  const mockStatistics: ExtensionStatistics = {
    translationsCount: 10,
    wordsLearned: 25,
    lastUsed: new Date()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock services
    mockTranslationService = {
      translate: vi.fn()
    };

    mockContentGenerationService = {
      generateSentences: vi.fn(),
      generateArticle: vi.fn()
    };

    mockLLMClient = {
      validateApiKey: vi.fn()
    };

    // Setup factory mocks
    (TranslationServiceFactory.create as Mock).mockReturnValue(mockTranslationService);
    (ContentGenerationServiceFactory.create as Mock).mockReturnValue(mockContentGenerationService);
    (LLMClientFactory.create as Mock).mockReturnValue(mockLLMClient);

    backgroundService = new BackgroundService();
  });

  afterEach(() => {
    backgroundService.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid config', async () => {
      (storageManager.getConfig as Mock).mockResolvedValue(mockConfig);
      (storageManager.getStatistics as Mock).mockResolvedValue(mockStatistics);

      await backgroundService.initialize();

      expect(backgroundService.isServiceInitialized()).toBe(true);
      expect(LLMClientFactory.create).toHaveBeenCalledWith('openai', { apiKey: 'test-api-key' });
      expect(TranslationServiceFactory.create).toHaveBeenCalledWith(mockLLMClient);
      expect(ContentGenerationServiceFactory.create).toHaveBeenCalledWith(mockLLMClient);
    });

    it('should initialize without services when no config', async () => {
      (storageManager.getConfig as Mock).mockResolvedValue(null);
      (storageManager.getStatistics as Mock).mockResolvedValue(mockStatistics);

      await backgroundService.initialize();

      expect(backgroundService.isServiceInitialized()).toBe(true);
      expect(LLMClientFactory.create).not.toHaveBeenCalled();
    });

    it('should initialize default statistics when none exist', async () => {
      (storageManager.getConfig as Mock).mockResolvedValue(null);
      (storageManager.getStatistics as Mock).mockResolvedValue(null);

      await backgroundService.initialize();

      expect(storageManager.saveStatistics).toHaveBeenCalledWith({
        translationsCount: 0,
        wordsLearned: 0,
        lastUsed: expect.any(Date)
      });
    });

    it('should handle initialization errors', async () => {
      const criticalError = new Error('Critical storage error');
      (criticalError as any).code = 'CRITICAL_ERROR';
      (storageManager.getConfig as Mock).mockRejectedValue(criticalError);

      await expect(backgroundService.initialize()).rejects.toThrow(BackgroundServiceError);
    });
  });

  describe('Message Handler Registration', () => {
    it('should register all message handlers', () => {
      expect(messageRouter.registerHandler).toHaveBeenCalledWith(
        MessageType.TRANSLATE_TEXT,
        expect.any(Function)
      );
      expect(messageRouter.registerHandler).toHaveBeenCalledWith(
        MessageType.ADD_TO_VOCABULARY,
        expect.any(Function)
      );
      expect(messageRouter.registerHandler).toHaveBeenCalledWith(
        MessageType.GET_CONFIG,
        expect.any(Function)
      );
      // Should register all message types (12 handlers + 2 from previous test instances)
      expect(messageRouter.registerHandler).toHaveBeenCalledWith(
        MessageType.TRANSLATE_TEXT,
        expect.any(Function)
      );
    });
  });

  describe('Translation Handling', () => {
    beforeEach(async () => {
      (storageManager.getConfig as Mock).mockResolvedValue(mockConfig);
      (storageManager.getStatistics as Mock).mockResolvedValue(mockStatistics);
      await backgroundService.initialize();
    });

    it('should handle translation requests', async () => {
      const mockTranslationResult = {
        originalText: 'Hello',
        translatedText: 'Hola',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        examples: [],
        confidence: 0.9,
        timestamp: new Date()
      };

      mockTranslationService.translate.mockResolvedValue(mockTranslationResult);
      (storageManager.updateStatistics as Mock).mockResolvedValue(mockStatistics);

      const message = {
        id: 'test-id',
        type: MessageType.TRANSLATE_TEXT,
        timestamp: Date.now(),
        payload: {
          text: 'Hello',
          options: {
            targetLanguage: 'es' as const,
            includeExamples: true
          }
        }
      };

      const response = await (backgroundService as any).handleTranslateText(message);

      expect(mockTranslationService.translate).toHaveBeenCalledWith('Hello', message.payload.options);
      expect(response.type).toBe(MessageType.TRANSLATION_RESULT);
      expect(response.payload.result).toEqual(mockTranslationResult);
      expect(storageManager.updateStatistics).toHaveBeenCalled();
    });

    it('should handle translation errors when service not initialized', async () => {
      const uninitializedService = new BackgroundService();
      
      const message = {
        id: 'test-id',
        type: MessageType.TRANSLATE_TEXT,
        timestamp: Date.now(),
        payload: {
          text: 'Hello',
          options: {
            targetLanguage: 'es' as const,
            includeExamples: true
          }
        }
      };

      const response = await (uninitializedService as any).handleTranslateText(message);

      expect(response.type).toBe(MessageType.ERROR);
      expect(response.payload.code).toBe('SERVICE_NOT_INITIALIZED');
    });
  });

  describe('Vocabulary Handling', () => {
    it('should handle add to vocabulary requests', async () => {
      const mockVocabularyItem = {
        id: 'vocab-1',
        word: 'hello',
        translation: 'hola',
        context: 'greeting',
        sourceUrl: 'https://example.com',
        dateAdded: new Date(),
        reviewCount: 0
      };

      (vocabularyStore.addWord as Mock).mockResolvedValue(mockVocabularyItem);
      (storageManager.updateStatistics as Mock).mockResolvedValue(mockStatistics);

      const message = {
        id: 'test-id',
        type: MessageType.ADD_TO_VOCABULARY,
        timestamp: Date.now(),
        payload: {
          word: 'hello',
          translation: 'hola',
          context: 'greeting',
          sourceUrl: 'https://example.com'
        }
      };

      const response = await (backgroundService as any).handleAddToVocabulary(message);

      expect(vocabularyStore.addWord).toHaveBeenCalledWith(message.payload);
      expect(response.type).toBe(MessageType.SUCCESS);
      expect(storageManager.updateStatistics).toHaveBeenCalled();
    });

    it('should handle get vocabulary requests', async () => {
      const mockVocabularyResult = {
        items: [],
        total: 0,
        hasMore: false
      };

      (vocabularyStore.getWords as Mock).mockResolvedValue(mockVocabularyResult);

      const message = {
        id: 'test-id',
        type: MessageType.GET_VOCABULARY,
        timestamp: Date.now(),
        payload: {
          limit: 10,
          offset: 0
        }
      };

      const response = await (backgroundService as any).handleGetVocabulary(message);

      expect(vocabularyStore.getWords).toHaveBeenCalledWith(
        undefined,
        { limit: 10, offset: 0 }
      );
      expect(response.type).toBe(MessageType.SUCCESS);
    });
  });

  describe('Configuration Handling', () => {
    it('should handle get config requests', async () => {
      (storageManager.getConfig as Mock).mockResolvedValue(mockConfig);

      const message = {
        id: 'test-id',
        type: MessageType.GET_CONFIG,
        timestamp: Date.now()
      };

      const response = await (backgroundService as any).handleGetConfig(message);

      expect(storageManager.getConfig).toHaveBeenCalled();
      expect(response.type).toBe(MessageType.SUCCESS);
    });

    it('should handle update config requests and reinitialize services', async () => {
      const updatedConfig = { ...mockConfig, apiKey: 'new-api-key' };
      (storageManager.updateConfig as Mock).mockResolvedValue(updatedConfig);

      const message = {
        id: 'test-id',
        type: MessageType.UPDATE_CONFIG,
        timestamp: Date.now(),
        payload: {
          config: { apiKey: 'new-api-key' }
        }
      };

      const response = await (backgroundService as any).handleUpdateConfig(message);

      expect(storageManager.updateConfig).toHaveBeenCalledWith({ apiKey: 'new-api-key' });
      expect(LLMClientFactory.create).toHaveBeenCalled();
      expect(response.type).toBe(MessageType.SUCCESS);
    });

    it('should handle API key validation', async () => {
      mockLLMClient.validateApiKey.mockResolvedValue(true);

      const message = {
        id: 'test-id',
        type: MessageType.VALIDATE_API_KEY,
        timestamp: Date.now(),
        payload: {
          apiKey: 'test-key',
          provider: 'openai'
        }
      };

      const response = await (backgroundService as any).handleValidateApiKey(message);

      expect(LLMClientFactory.create).toHaveBeenCalledWith('openai', { apiKey: 'test-key' });
      expect(mockLLMClient.validateApiKey).toHaveBeenCalled();
      expect(response.type).toBe(MessageType.SUCCESS);
      expect(response.payload.data.isValid).toBe(true);
    });
  });

  describe('Content Generation Handling', () => {
    beforeEach(async () => {
      (storageManager.getConfig as Mock).mockResolvedValue(mockConfig);
      (storageManager.getStatistics as Mock).mockResolvedValue(mockStatistics);
      await backgroundService.initialize();
    });

    it('should handle sentence generation requests', async () => {
      const mockGeneratedContent = {
        type: 'sentence' as const,
        content: 'Generated sentences',
        usedWords: ['hello', 'world'],
        generatedAt: new Date()
      };

      mockContentGenerationService.generateSentences.mockResolvedValue(mockGeneratedContent);

      const message = {
        id: 'test-id',
        type: MessageType.GENERATE_SENTENCES,
        timestamp: Date.now(),
        payload: {
          words: ['hello', 'world'],
          count: 3
        }
      };

      const response = await (backgroundService as any).handleGenerateSentences(message);

      expect(mockContentGenerationService.generateSentences).toHaveBeenCalledWith(
        ['hello', 'world'],
        { count: 3, customPrompt: undefined }
      );
      expect(response.type).toBe(MessageType.CONTENT_GENERATED);
    });
  });

  describe('Statistics Handling', () => {
    it('should handle get statistics requests', async () => {
      (storageManager.getStatistics as Mock).mockResolvedValue(mockStatistics);

      const message = {
        id: 'test-id',
        type: MessageType.GET_STATISTICS,
        timestamp: Date.now()
      };

      const response = await (backgroundService as any).handleGetStatistics(message);

      expect(storageManager.getStatistics).toHaveBeenCalled();
      expect(response.type).toBe(MessageType.SUCCESS);
    });

    it('should handle update statistics requests', async () => {
      const updatedStats = { ...mockStatistics, translationsCount: 15 };
      (storageManager.updateStatistics as Mock).mockResolvedValue(updatedStats);

      const message = {
        id: 'test-id',
        type: MessageType.UPDATE_STATISTICS,
        timestamp: Date.now(),
        payload: {
          statistics: { translationsCount: 15 }
        }
      };

      const response = await (backgroundService as any).handleUpdateStatistics(message);

      expect(storageManager.updateStatistics).toHaveBeenCalledWith({ translationsCount: 15 });
      expect(response.type).toBe(MessageType.SUCCESS);
    });
  });

  describe('Error Handling', () => {
    it('should create proper error responses', () => {
      const error = new Error('Test error');
      (error as any).code = 'TEST_ERROR';

      const response = (backgroundService as any).createErrorResponse('test-id', error);

      expect(response).toEqual({
        id: 'test-id',
        type: MessageType.ERROR,
        timestamp: expect.any(Number),
        payload: {
          error: 'Test error',
          code: 'TEST_ERROR',
          details: error
        }
      });
    });

    it('should handle unknown errors', () => {
      const response = (backgroundService as any).createErrorResponse('test-id', 'string error');

      expect(response.payload.error).toBe('Unknown error occurred');
      expect(response.payload.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', () => {
      backgroundService.cleanup();

      expect(messageRouter.cleanup).toHaveBeenCalled();
      expect(backgroundService.isServiceInitialized()).toBe(false);
    });
  });
});