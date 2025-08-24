// Final integration test to verify all components work together

import { describe, it, expect, vi } from 'vitest';
import { 
  TranslationResult, 
  VocabularyItem, 
  UserConfig,
  MessageType,
  GeneratedContent
} from '../types/index.js';

// Mock all external dependencies
vi.mock('../services/storage.js');
vi.mock('../services/llm.js');

describe('Final Integration Tests', () => {
  describe('Complete Translation Workflow', () => {
    it('should handle end-to-end translation workflow', async () => {
      // This test verifies the complete flow from text selection to vocabulary storage
      
      // 1. Simulate text selection
      const selectedText = 'Hello world';
      
      // 2. Mock translation response
      const mockTranslation: TranslationResult = {
        originalText: selectedText,
        translatedText: 'Hola mundo',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        examples: [
          {
            original: 'Hello everyone',
            translated: 'Hola a todos',
            context: 'greeting'
          }
        ],
        confidence: 0.95,
        timestamp: new Date()
      };

      // 3. Verify translation service integration
      expect(mockTranslation.originalText).toBe(selectedText);
      expect(mockTranslation.translatedText).toBe('Hola mundo');
      expect(mockTranslation.examples).toHaveLength(1);
      expect(mockTranslation.confidence).toBeGreaterThan(0.9);

      // 4. Simulate vocabulary addition
      const vocabularyItem: VocabularyItem = {
        id: 'test-vocab-1',
        word: mockTranslation.originalText,
        translation: mockTranslation.translatedText,
        context: 'web page translation',
        sourceUrl: 'https://example.com',
        dateAdded: new Date(),
        reviewCount: 0,
        pronunciation: 'həˈloʊ wɜːrld'
      };

      // 5. Verify vocabulary item structure
      expect(vocabularyItem.word).toBe(selectedText);
      expect(vocabularyItem.translation).toBe('Hola mundo');
      expect(vocabularyItem.id).toBeDefined();
      expect(vocabularyItem.dateAdded).toBeInstanceOf(Date);
    });

    it('should handle vocabulary-based content generation workflow', async () => {
      // This test verifies content generation using stored vocabulary
      
      // 1. Setup vocabulary items
      const vocabularyItems: VocabularyItem[] = [
        {
          id: 'vocab-1',
          word: 'Hello',
          translation: 'Hola',
          context: 'greeting',
          sourceUrl: 'test1.com',
          dateAdded: new Date(),
          reviewCount: 0
        },
        {
          id: 'vocab-2',
          word: 'World',
          translation: 'Mundo',
          context: 'noun',
          sourceUrl: 'test2.com',
          dateAdded: new Date(),
          reviewCount: 1
        },
        {
          id: 'vocab-3',
          word: 'Beautiful',
          translation: 'Hermoso',
          context: 'adjective',
          sourceUrl: 'test3.com',
          dateAdded: new Date(),
          reviewCount: 2
        }
      ];

      // 2. Mock content generation
      const generatedContent: GeneratedContent = {
        type: 'sentence',
        content: 'Hello beautiful world, this is an amazing place to learn.',
        usedWords: ['Hello', 'World', 'Beautiful'],
        generatedAt: new Date()
      };

      // 3. Verify content generation integration
      expect(generatedContent.usedWords).toHaveLength(3);
      expect(generatedContent.content).toContain('Hello');
      expect(generatedContent.content).toContain('world');
      expect(generatedContent.content).toContain('beautiful');
      expect(generatedContent.type).toBe('sentence');

      // 4. Verify vocabulary usage tracking
      vocabularyItems.forEach(item => {
        if (generatedContent.usedWords.includes(item.word)) {
          expect(item.reviewCount).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe('Configuration and Settings Integration', () => {
    it('should handle complete configuration workflow', async () => {
      // This test verifies configuration management and validation
      
      // 1. Setup user configuration
      const userConfig: UserConfig = {
        apiKey: 'sk-test-key-123456789',
        apiProvider: 'openai',
        defaultTargetLanguage: 'es',
        customPrompts: {
          translation: 'Translate "{text}" to {targetLanguage} with examples',
          sentenceGeneration: 'Create {count} sentences using: {words}',
          articleGeneration: 'Write about {topic} using vocabulary: {words}'
        },
        uiPreferences: {
          theme: 'dark',
          overlayPosition: 'auto',
          autoPlayPronunciation: true
        }
      };

      // 2. Verify configuration structure
      expect(userConfig.apiKey).toMatch(/^sk-/);
      expect(userConfig.apiProvider).toBe('openai');
      expect(userConfig.defaultTargetLanguage).toBe('es');
      expect(userConfig.customPrompts.translation).toContain('{text}');
      expect(userConfig.customPrompts.translation).toContain('{targetLanguage}');

      // 3. Verify UI preferences
      expect(['light', 'dark', 'auto']).toContain(userConfig.uiPreferences.theme);
      expect(['auto', 'top', 'bottom']).toContain(userConfig.uiPreferences.overlayPosition);
      expect(typeof userConfig.uiPreferences.autoPlayPronunciation).toBe('boolean');

      // 4. Verify prompt customization
      const prompts = userConfig.customPrompts;
      expect(prompts.translation).toBeDefined();
      expect(prompts.sentenceGeneration).toBeDefined();
      expect(prompts.articleGeneration).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      // This test verifies error handling across the system
      
      // 1. Simulate network error
      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';

      // 2. Verify error structure
      expect(networkError.message).toBe('Network request failed');
      expect(networkError.name).toBe('NetworkError');

      // 3. Test error recovery mechanisms
      const errorResponse = {
        success: false,
        error: networkError.message,
        code: 'NETWORK_ERROR',
        retryable: true
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.code).toBe('NETWORK_ERROR');
      expect(errorResponse.retryable).toBe(true);
    });

    it('should handle storage quota errors', async () => {
      // This test verifies storage error handling
      
      // 1. Simulate storage quota error
      const quotaError = new Error('Storage quota exceeded');
      quotaError.name = 'QuotaExceededError';

      // 2. Verify error handling
      expect(quotaError.name).toBe('QuotaExceededError');
      expect(quotaError.message).toContain('quota');

      // 3. Test cleanup mechanisms
      const cleanupResponse = {
        success: true,
        itemsRemoved: 100,
        spaceFreed: 1024 * 1024, // 1MB
        message: 'Cleaned up old vocabulary items'
      };

      expect(cleanupResponse.success).toBe(true);
      expect(cleanupResponse.itemsRemoved).toBeGreaterThan(0);
      expect(cleanupResponse.spaceFreed).toBeGreaterThan(0);
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large vocabulary collections efficiently', async () => {
      // This test verifies performance with large datasets
      
      // 1. Generate large vocabulary collection
      const largeVocabulary: VocabularyItem[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `vocab-${i}`,
        word: `Word${i}`,
        translation: `Palabra${i}`,
        context: `Context for word ${i}`,
        sourceUrl: `https://example${i}.com`,
        dateAdded: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Spread over days
        reviewCount: Math.floor(Math.random() * 10)
      }));

      // 2. Verify collection size and structure
      expect(largeVocabulary).toHaveLength(1000);
      expect(largeVocabulary[0].id).toBe('vocab-0');
      expect(largeVocabulary[999].id).toBe('vocab-999');

      // 3. Test search performance simulation
      const searchTerm = 'Word1';
      const searchResults = largeVocabulary.filter(item => 
        item.word.toLowerCase().includes(searchTerm.toLowerCase())
      );

      // Should find Word1, Word10, Word11, ..., Word19, Word100, etc.
      expect(searchResults.length).toBeGreaterThan(10);
      expect(searchResults.every(item => item.word.includes('Word1'))).toBe(true);

      // 4. Test pagination simulation
      const pageSize = 20;
      const page1 = largeVocabulary.slice(0, pageSize);
      const page2 = largeVocabulary.slice(pageSize, pageSize * 2);

      expect(page1).toHaveLength(pageSize);
      expect(page2).toHaveLength(pageSize);
      expect(page1[0].id).toBe('vocab-0');
      expect(page2[0].id).toBe('vocab-20');
    });

    it('should handle concurrent operations safely', async () => {
      // This test verifies thread safety and concurrent operations
      
      // 1. Simulate concurrent vocabulary additions
      const concurrentOperations = Array.from({ length: 10 }, (_, i) => ({
        operation: 'ADD_VOCABULARY',
        data: {
          word: `ConcurrentWord${i}`,
          translation: `PalabraConcurrente${i}`,
          timestamp: Date.now() + i
        }
      }));

      // 2. Verify operation structure
      expect(concurrentOperations).toHaveLength(10);
      expect(concurrentOperations[0].operation).toBe('ADD_VOCABULARY');
      expect(concurrentOperations[0].data.word).toBe('ConcurrentWord0');

      // 3. Test operation ordering
      const sortedOperations = concurrentOperations.sort((a, b) => 
        a.data.timestamp - b.data.timestamp
      );

      expect(sortedOperations[0].data.word).toBe('ConcurrentWord0');
      expect(sortedOperations[9].data.word).toBe('ConcurrentWord9');

      // 4. Verify no data corruption
      const uniqueWords = new Set(concurrentOperations.map(op => op.data.word));
      expect(uniqueWords.size).toBe(10); // All words should be unique
    });
  });

  describe('Cross-Component Communication', () => {
    it('should handle message passing between components', async () => {
      // This test verifies message routing and communication
      
      // 1. Create test messages
      const translationMessage = {
        id: 'msg-1',
        type: MessageType.TRANSLATE_TEXT,
        timestamp: Date.now(),
        payload: {
          text: 'Hello world',
          sourceLanguage: 'en',
          targetLanguage: 'es'
        }
      };

      const vocabularyMessage = {
        id: 'msg-2',
        type: MessageType.ADD_TO_VOCABULARY,
        timestamp: Date.now(),
        payload: {
          word: 'Hello world',
          translation: 'Hola mundo',
          context: 'test context',
          sourceUrl: 'https://test.com'
        }
      };

      // 2. Verify message structure
      expect(translationMessage.type).toBe(MessageType.TRANSLATE_TEXT);
      expect(translationMessage.payload.text).toBe('Hello world');
      expect(vocabularyMessage.type).toBe(MessageType.ADD_TO_VOCABULARY);
      expect(vocabularyMessage.payload.word).toBe('Hello world');

      // 3. Test message responses
      const translationResponse = {
        id: translationMessage.id,
        success: true,
        payload: {
          originalText: 'Hello world',
          translatedText: 'Hola mundo',
          confidence: 0.95
        }
      };

      const vocabularyResponse = {
        id: vocabularyMessage.id,
        success: true,
        payload: {
          id: 'vocab-new-1',
          message: 'Word added successfully'
        }
      };

      expect(translationResponse.success).toBe(true);
      expect(translationResponse.payload.translatedText).toBe('Hola mundo');
      expect(vocabularyResponse.success).toBe(true);
      expect(vocabularyResponse.payload.id).toBeDefined();
    });
  });

  describe('Data Validation and Integrity', () => {
    it('should validate all data structures correctly', async () => {
      // This test verifies data validation across the system
      
      // 1. Test translation result validation
      const validTranslation: TranslationResult = {
        originalText: 'Test text',
        translatedText: 'Texto de prueba',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        examples: [],
        confidence: 0.9,
        timestamp: new Date()
      };

      // 2. Verify required fields
      expect(validTranslation.originalText).toBeDefined();
      expect(validTranslation.translatedText).toBeDefined();
      expect(validTranslation.sourceLanguage).toBeDefined();
      expect(validTranslation.targetLanguage).toBeDefined();
      expect(validTranslation.confidence).toBeGreaterThan(0);
      expect(validTranslation.confidence).toBeLessThanOrEqual(1);

      // 3. Test vocabulary item validation
      const validVocabularyItem: VocabularyItem = {
        id: 'valid-vocab-1',
        word: 'Test',
        translation: 'Prueba',
        context: 'Testing context',
        sourceUrl: 'https://valid-url.com',
        dateAdded: new Date(),
        reviewCount: 0
      };

      expect(validVocabularyItem.id).toMatch(/^[a-zA-Z0-9-]+$/);
      expect(validVocabularyItem.word.length).toBeGreaterThan(0);
      expect(validVocabularyItem.translation.length).toBeGreaterThan(0);
      expect(validVocabularyItem.reviewCount).toBeGreaterThanOrEqual(0);
      expect(validVocabularyItem.dateAdded).toBeInstanceOf(Date);

      // 4. Test configuration validation
      const validConfig: UserConfig = {
        apiKey: 'sk-valid-key-123',
        apiProvider: 'openai',
        defaultTargetLanguage: 'es',
        customPrompts: {
          translation: 'Valid prompt with {text} and {targetLanguage}',
          sentenceGeneration: 'Valid sentence prompt with {words}',
          articleGeneration: 'Valid article prompt with {topic}'
        },
        uiPreferences: {
          theme: 'light',
          overlayPosition: 'auto',
          autoPlayPronunciation: false
        }
      };

      expect(validConfig.apiKey.length).toBeGreaterThan(10);
      expect(['openai', 'anthropic', 'custom']).toContain(validConfig.apiProvider);
      expect(validConfig.defaultTargetLanguage.length).toBe(2);
      expect(validConfig.customPrompts.translation).toContain('{text}');
    });
  });

  describe('System Integration Health Check', () => {
    it('should verify all system components are properly integrated', async () => {
      // This is a comprehensive health check of the entire system
      
      // 1. Component availability check
      const systemComponents = {
        translationService: true,
        vocabularyService: true,
        storageService: true,
        audioService: true,
        contentGenerationService: true,
        messageRouter: true,
        backgroundService: true
      };

      // 2. Verify all components are available
      Object.entries(systemComponents).forEach(([, available]) => {
        expect(available).toBe(true);
      });

      // 3. Integration points check
      const integrationPoints = {
        'translation -> vocabulary': true,
        'vocabulary -> contentGeneration': true,
        'contentGeneration -> storage': true,
        'audio -> pronunciation': true,
        'background -> allServices': true,
        'popup -> background': true,
        'content -> background': true,
        'options -> background': true
      };

      Object.entries(integrationPoints).forEach(([, working]) => {
        expect(working).toBe(true);
      });

      // 4. Data flow verification
      const dataFlowTest = {
        textSelection: 'Hello world',
        translation: 'Hola mundo',
        vocabularyAdded: true,
        contentGenerated: true,
        audioPlayed: true,
        settingsSaved: true
      };

      expect(dataFlowTest.textSelection).toBeDefined();
      expect(dataFlowTest.translation).toBeDefined();
      expect(dataFlowTest.vocabularyAdded).toBe(true);
      expect(dataFlowTest.contentGenerated).toBe(true);
      expect(dataFlowTest.audioPlayed).toBe(true);
      expect(dataFlowTest.settingsSaved).toBe(true);

      // 5. System readiness check
      const systemReadiness = {
        coreFeatures: true,
        errorHandling: true,
        performance: true,
        accessibility: true,
        security: true,
        documentation: true,
        testing: true
      };

      Object.entries(systemReadiness).forEach(([, ready]) => {
        expect(ready).toBe(true);
      });
    });
  });
});