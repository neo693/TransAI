// Integration tests for data models and validation

import { describe, it, expect } from 'vitest';
import {
  TranslationResult,
  VocabularyItem,
  UserConfig,
  validateTranslationResult,
  validateVocabularyItem,
  validateUserConfig,
  DEFAULT_CONFIG,
  CreateVocabularyItem,
  isCreateVocabularyItem,
  ValidationError,
  validateWithError
} from '../types/exports';

describe('Integration Tests', () => {
  describe('Complete workflow validation', () => {
    it('should validate a complete translation workflow', () => {
      // Create a translation result
      const translationResult: TranslationResult = {
        originalText: 'Hello world',
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

      // Validate translation result
      expect(validateTranslationResult(translationResult)).toBe(true);

      // Create vocabulary item from translation
      const createVocabItem: CreateVocabularyItem = {
        word: translationResult.originalText,
        translation: translationResult.translatedText,
        context: 'web page greeting',
        sourceUrl: 'https://example.com',
        pronunciation: 'həˈloʊ wɜːrld'
      };

      // Validate create vocabulary item
      expect(isCreateVocabularyItem(createVocabItem)).toBe(true);

      // Create full vocabulary item (simulating storage)
      const vocabularyItem: VocabularyItem = {
        id: 'vocab-001',
        ...createVocabItem,
        dateAdded: new Date(),
        reviewCount: 0
      };

      // Validate vocabulary item
      expect(validateVocabularyItem(vocabularyItem)).toBe(true);
    });

    it('should work with default configuration structure', () => {
      // Default config should have correct structure but empty API key
      expect(validateUserConfig(DEFAULT_CONFIG)).toBe(false); // Empty API key should fail validation
      
      // Create a valid config based on defaults
      const validConfig: UserConfig = {
        ...DEFAULT_CONFIG,
        apiKey: 'sk-test-key-123' // Add valid API key
      };
      
      expect(validateUserConfig(validConfig)).toBe(true);

      // Test that default config has all required fields
      expect(DEFAULT_CONFIG.apiKey).toBeDefined();
      expect(DEFAULT_CONFIG.apiProvider).toBeDefined();
      expect(DEFAULT_CONFIG.defaultTargetLanguage).toBeDefined();
      expect(DEFAULT_CONFIG.customPrompts).toBeDefined();
      expect(DEFAULT_CONFIG.uiPreferences).toBeDefined();

      // Test that prompts are not empty
      expect(DEFAULT_CONFIG.customPrompts.translation.length).toBeGreaterThan(0);
      expect(DEFAULT_CONFIG.customPrompts.sentenceGeneration.length).toBeGreaterThan(0);
      expect(DEFAULT_CONFIG.customPrompts.articleGeneration.length).toBeGreaterThan(0);
    });

    it('should handle validation errors properly', () => {
      const invalidTranslation = {
        originalText: '', // Invalid: empty string
        translatedText: 'Hola mundo',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        examples: [],
        confidence: 0.95,
        timestamp: new Date()
      };

      // Should fail validation
      expect(validateTranslationResult(invalidTranslation)).toBe(false);

      // Should throw validation error when using validateWithError
      expect(() => {
        validateWithError(invalidTranslation, validateTranslationResult, 'TranslationResult');
      }).toThrow(ValidationError);
    });

    it('should validate complex nested structures', () => {
      const complexConfig: UserConfig = {
        apiKey: 'sk-test-key-123',
        apiProvider: 'anthropic',
        defaultTargetLanguage: 'fr',
        customPrompts: {
          translation: 'Translate "{text}" to {targetLanguage} and provide context',
          sentenceGeneration: 'Create {count} sentences using: {words}',
          articleGeneration: 'Write about {topic} using vocabulary: {words}'
        },
        uiPreferences: {
          theme: 'dark',
          overlayPosition: 'bottom',
          autoPlayPronunciation: true
        }
      };

      expect(validateUserConfig(complexConfig)).toBe(true);
    });

    it('should validate data consistency across types', () => {
      // Test that language codes are consistent
      const translationResult: TranslationResult = {
        originalText: 'Bonjour',
        translatedText: 'Hello',
        sourceLanguage: 'fr',
        targetLanguage: 'en',
        examples: [],
        confidence: 0.9,
        timestamp: new Date()
      };

      const config: UserConfig = {
        ...DEFAULT_CONFIG,
        apiKey: 'sk-test-key-456', // Add valid API key
        defaultTargetLanguage: 'en' // Same as translation target
      };

      expect(validateTranslationResult(translationResult)).toBe(true);
      expect(validateUserConfig(config)).toBe(true);
      expect(translationResult.targetLanguage).toBe(config.defaultTargetLanguage);
    });
  });
});