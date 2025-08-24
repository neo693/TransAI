// Unit tests for data model validation functions

import { describe, it, expect } from 'vitest';
import {
  validateTranslationResult,
  validateVocabularyItem,
  validateUserConfig,
  validateGeneratedContent,
  validateTextSelection,
  validateTranslationOptions,
  validateVocabularyFilter,
  validateExtensionStatistics,
  validateExample,
  validateUIPreferences,
  validateCustomPrompts,
  isValidAPIProvider,
  isValidLanguageCode,
  isValidExportFormat,
  isValidContentType,
  isValidTheme,
  isValidOverlayPosition,
  ValidationError,
  validateWithError
} from '../utils/validation';
import {
  TranslationResult,
  VocabularyItem,
  UserConfig,
  GeneratedContent,
  TextSelection,
  TranslationOptions,
  VocabularyFilter,
  ExtensionStatistics,
  Example,
  UIPreferences,
  CustomPrompts
} from '../types';

describe('Validation Functions', () => {
  describe('Basic Type Validators', () => {
    it('should validate API providers correctly', () => {
      expect(isValidAPIProvider('openai')).toBe(true);
      expect(isValidAPIProvider('anthropic')).toBe(true);
      expect(isValidAPIProvider('custom')).toBe(true);
      expect(isValidAPIProvider('invalid')).toBe(false);
      expect(isValidAPIProvider(123)).toBe(false);
      expect(isValidAPIProvider(null)).toBe(false);
    });

    it('should validate language codes correctly', () => {
      expect(isValidLanguageCode('en')).toBe(true);
      expect(isValidLanguageCode('es')).toBe(true);
      expect(isValidLanguageCode('fr')).toBe(true);
      expect(isValidLanguageCode('invalid')).toBe(false);
      expect(isValidLanguageCode(123)).toBe(false);
      expect(isValidLanguageCode('')).toBe(false);
    });

    it('should validate export formats correctly', () => {
      expect(isValidExportFormat('csv')).toBe(true);
      expect(isValidExportFormat('json')).toBe(true);
      expect(isValidExportFormat('txt')).toBe(true);
      expect(isValidExportFormat('pdf')).toBe(false);
      expect(isValidExportFormat(123)).toBe(false);
    });

    it('should validate content types correctly', () => {
      expect(isValidContentType('sentence')).toBe(true);
      expect(isValidContentType('article')).toBe(true);
      expect(isValidContentType('paragraph')).toBe(false);
      expect(isValidContentType(123)).toBe(false);
    });

    it('should validate themes correctly', () => {
      expect(isValidTheme('light')).toBe(true);
      expect(isValidTheme('dark')).toBe(true);
      expect(isValidTheme('auto')).toBe(true);
      expect(isValidTheme('blue')).toBe(false);
      expect(isValidTheme(123)).toBe(false);
    });

    it('should validate overlay positions correctly', () => {
      expect(isValidOverlayPosition('auto')).toBe(true);
      expect(isValidOverlayPosition('top')).toBe(true);
      expect(isValidOverlayPosition('bottom')).toBe(true);
      expect(isValidOverlayPosition('left')).toBe(false);
      expect(isValidOverlayPosition(123)).toBe(false);
    });
  });

  describe('Example Validation', () => {
    it('should validate valid examples', () => {
      const validExample: Example = {
        original: 'Hello world',
        translated: 'Hola mundo',
        context: 'greeting'
      };
      expect(validateExample(validExample)).toBe(true);
    });

    it('should validate examples without context', () => {
      const validExample: Example = {
        original: 'Hello world',
        translated: 'Hola mundo'
      };
      expect(validateExample(validExample)).toBe(true);
    });

    it('should reject invalid examples', () => {
      expect(validateExample({})).toBe(false);
      expect(validateExample({ original: '', translated: 'test' })).toBe(false);
      expect(validateExample({ original: 'test', translated: '' })).toBe(false);
      expect(validateExample(null)).toBe(false);
    });
  });

  describe('TranslationResult Validation', () => {
    const validTranslationResult: TranslationResult = {
      originalText: 'Hello',
      translatedText: 'Hola',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      examples: [
        { original: 'Hello world', translated: 'Hola mundo' }
      ],
      confidence: 0.95,
      timestamp: new Date()
    };

    it('should validate valid translation results', () => {
      expect(validateTranslationResult(validTranslationResult)).toBe(true);
    });

    it('should reject invalid translation results', () => {
      expect(validateTranslationResult({})).toBe(false);
      expect(validateTranslationResult({
        ...validTranslationResult,
        originalText: ''
      })).toBe(false);
      expect(validateTranslationResult({
        ...validTranslationResult,
        confidence: 1.5
      })).toBe(false);
      expect(validateTranslationResult({
        ...validTranslationResult,
        timestamp: 'invalid-date'
      })).toBe(false);
    });
  });

  describe('VocabularyItem Validation', () => {
    const validVocabularyItem: VocabularyItem = {
      id: 'test-id',
      word: 'hello',
      translation: 'hola',
      context: 'greeting',
      sourceUrl: 'https://example.com',
      dateAdded: new Date(),
      reviewCount: 5,
      pronunciation: 'həˈloʊ'
    };

    it('should validate valid vocabulary items', () => {
      expect(validateVocabularyItem(validVocabularyItem)).toBe(true);
    });

    it('should validate vocabulary items without pronunciation', () => {
      const itemWithoutPronunciation = { ...validVocabularyItem };
      delete itemWithoutPronunciation.pronunciation;
      expect(validateVocabularyItem(itemWithoutPronunciation)).toBe(true);
    });

    it('should reject invalid vocabulary items', () => {
      expect(validateVocabularyItem({})).toBe(false);
      expect(validateVocabularyItem({
        ...validVocabularyItem,
        id: ''
      })).toBe(false);
      expect(validateVocabularyItem({
        ...validVocabularyItem,
        reviewCount: -1
      })).toBe(false);
    });
  });

  describe('UIPreferences Validation', () => {
    const validUIPreferences: UIPreferences = {
      theme: 'light',
      overlayPosition: 'auto',
      autoPlayPronunciation: true
    };

    it('should validate valid UI preferences', () => {
      expect(validateUIPreferences(validUIPreferences)).toBe(true);
    });

    it('should reject invalid UI preferences', () => {
      expect(validateUIPreferences({})).toBe(false);
      expect(validateUIPreferences({
        ...validUIPreferences,
        theme: 'invalid'
      })).toBe(false);
      expect(validateUIPreferences({
        ...validUIPreferences,
        autoPlayPronunciation: 'true'
      })).toBe(false);
    });
  });

  describe('CustomPrompts Validation', () => {
    const validCustomPrompts: CustomPrompts = {
      translation: 'Translate: {text}',
      sentenceGeneration: 'Generate sentences with: {words}',
      articleGeneration: 'Write article about: {topic}'
    };

    it('should validate valid custom prompts', () => {
      expect(validateCustomPrompts(validCustomPrompts)).toBe(true);
    });

    it('should reject invalid custom prompts', () => {
      expect(validateCustomPrompts({})).toBe(false);
      expect(validateCustomPrompts({
        ...validCustomPrompts,
        translation: ''
      })).toBe(false);
      expect(validateCustomPrompts({
        translation: 'test',
        sentenceGeneration: 'test'
        // missing articleGeneration
      })).toBe(false);
    });
  });

  describe('UserConfig Validation', () => {
    const validUserConfig: UserConfig = {
      apiKey: 'test-api-key',
      apiProvider: 'openai',
      defaultTargetLanguage: 'es',
      customPrompts: {
        translation: 'Translate: {text}',
        sentenceGeneration: 'Generate sentences with: {words}',
        articleGeneration: 'Write article about: {topic}'
      },
      uiPreferences: {
        theme: 'light',
        overlayPosition: 'auto',
        autoPlayPronunciation: true
      }
    };

    it('should validate valid user config', () => {
      expect(validateUserConfig(validUserConfig)).toBe(true);
    });

    it('should reject invalid user config', () => {
      expect(validateUserConfig({})).toBe(false);
      expect(validateUserConfig({
        ...validUserConfig,
        apiKey: ''
      })).toBe(false);
      expect(validateUserConfig({
        ...validUserConfig,
        apiProvider: 'invalid'
      })).toBe(false);
    });
  });

  describe('GeneratedContent Validation', () => {
    const validGeneratedContent: GeneratedContent = {
      type: 'sentence',
      content: 'This is a generated sentence.',
      usedWords: ['hello', 'world'],
      generatedAt: new Date()
    };

    it('should validate valid generated content', () => {
      expect(validateGeneratedContent(validGeneratedContent)).toBe(true);
    });

    it('should reject invalid generated content', () => {
      expect(validateGeneratedContent({})).toBe(false);
      expect(validateGeneratedContent({
        ...validGeneratedContent,
        type: 'invalid'
      })).toBe(false);
      expect(validateGeneratedContent({
        ...validGeneratedContent,
        usedWords: ['hello', 123]
      })).toBe(false);
    });
  });

  describe('TextSelection Validation', () => {
    const validTextSelection: TextSelection = {
      text: 'selected text',
      position: { x: 100, y: 200 },
      context: 'surrounding context',
      url: 'https://example.com'
    };

    it('should validate valid text selection', () => {
      expect(validateTextSelection(validTextSelection)).toBe(true);
    });

    it('should reject invalid text selection', () => {
      expect(validateTextSelection({})).toBe(false);
      expect(validateTextSelection({
        ...validTextSelection,
        position: { x: 'invalid', y: 200 }
      })).toBe(false);
      expect(validateTextSelection({
        ...validTextSelection,
        text: ''
      })).toBe(false);
    });
  });

  describe('TranslationOptions Validation', () => {
    const validTranslationOptions: TranslationOptions = {
      sourceLanguage: 'en',
      targetLanguage: 'es',
      includeExamples: true,
      customPrompt: 'Custom prompt'
    };

    it('should validate valid translation options', () => {
      expect(validateTranslationOptions(validTranslationOptions)).toBe(true);
    });

    it('should validate options without optional fields', () => {
      const minimalOptions: TranslationOptions = {
        targetLanguage: 'es',
        includeExamples: false
      };
      expect(validateTranslationOptions(minimalOptions)).toBe(true);
    });

    it('should reject invalid translation options', () => {
      expect(validateTranslationOptions({})).toBe(false);
      expect(validateTranslationOptions({
        ...validTranslationOptions,
        targetLanguage: 'invalid'
      })).toBe(false);
      expect(validateTranslationOptions({
        ...validTranslationOptions,
        includeExamples: 'true'
      })).toBe(false);
    });
  });

  describe('VocabularyFilter Validation', () => {
    const validVocabularyFilter: VocabularyFilter = {
      searchQuery: 'hello',
      dateRange: {
        start: new Date('2023-01-01'),
        end: new Date('2023-12-31')
      },
      reviewCountMin: 5,
      sourceUrl: 'https://example.com'
    };

    it('should validate valid vocabulary filter', () => {
      expect(validateVocabularyFilter(validVocabularyFilter)).toBe(true);
    });

    it('should validate empty filter', () => {
      expect(validateVocabularyFilter({})).toBe(true);
    });

    it('should reject invalid vocabulary filter', () => {
      expect(validateVocabularyFilter({
        ...validVocabularyFilter,
        reviewCountMin: -1
      })).toBe(false);
      expect(validateVocabularyFilter({
        ...validVocabularyFilter,
        dateRange: {
          start: 'invalid-date',
          end: new Date()
        }
      })).toBe(false);
    });
  });

  describe('ExtensionStatistics Validation', () => {
    const validExtensionStatistics: ExtensionStatistics = {
      translationsCount: 100,
      wordsLearned: 50,
      lastUsed: new Date()
    };

    it('should validate valid extension statistics', () => {
      expect(validateExtensionStatistics(validExtensionStatistics)).toBe(true);
    });

    it('should reject invalid extension statistics', () => {
      expect(validateExtensionStatistics({})).toBe(false);
      expect(validateExtensionStatistics({
        ...validExtensionStatistics,
        translationsCount: -1
      })).toBe(false);
      expect(validateExtensionStatistics({
        ...validExtensionStatistics,
        lastUsed: 'invalid-date'
      })).toBe(false);
    });
  });

  describe('ValidationError and validateWithError', () => {
    it('should create validation errors correctly', () => {
      const error = new ValidationError('Test error', 'testField');
      expect(error.message).toBe('Test error');
      expect(error.field).toBe('testField');
      expect(error.name).toBe('ValidationError');
    });

    it('should validate with error for valid data', () => {
      const validData = { test: 'value' };
      const validator = (data: any): data is typeof validData => data.test === 'value';
      
      expect(validateWithError(validData, validator, 'TestType')).toBe(validData);
    });

    it('should throw validation error for invalid data', () => {
      const invalidData = { test: 'invalid' };
      const validator = (data: any): data is any => data.test === 'value';
      
      expect(() => {
        validateWithError(invalidData, validator, 'TestType');
      }).toThrow(ValidationError);
    });
  });
});