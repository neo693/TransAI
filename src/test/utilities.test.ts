// Unit tests for utility types and functions

import { describe, it, expect } from 'vitest';
import {
  isCreateVocabularyItem,
  isUpdateVocabularyItem,
  isContentGenerationParams,
  DEFAULT_CONFIG,
  DEFAULT_CACHE_CONFIG,
  SUPPORTED_LANGUAGES,
  StorageKeys,
  ErrorType,
  APIStatus
} from '../types/utilities';
import { MessageType } from '../types/messages';
import {
  CreateVocabularyItem,
  UpdateVocabularyItem,
  ContentGenerationParams
} from '../types/utilities';

describe('Utility Types and Functions', () => {
  describe('Type Guards', () => {
    describe('isCreateVocabularyItem', () => {
      it('should validate valid CreateVocabularyItem', () => {
        const validItem: CreateVocabularyItem = {
          word: 'hello',
          translation: 'hola',
          context: 'greeting',
          sourceUrl: 'https://example.com',
          pronunciation: 'həˈloʊ'
        };
        expect(isCreateVocabularyItem(validItem)).toBe(true);
      });

      it('should validate CreateVocabularyItem without optional fields', () => {
        const validItem = {
          word: 'hello',
          translation: 'hola',
          context: 'greeting',
          sourceUrl: 'https://example.com'
        };
        expect(isCreateVocabularyItem(validItem)).toBe(true);
      });

      it('should reject invalid CreateVocabularyItem', () => {
        expect(isCreateVocabularyItem({})).toBe(false);
        expect(isCreateVocabularyItem({
          word: 'hello',
          translation: 'hola',
          context: 'greeting'
          // missing sourceUrl
        })).toBe(false);
        expect(isCreateVocabularyItem({
          word: '',
          translation: 'hola',
          context: 'greeting',
          sourceUrl: 'https://example.com'
        })).toBe(false);
        expect(isCreateVocabularyItem(null)).toBe(false);
      });
    });

    describe('isUpdateVocabularyItem', () => {
      it('should validate valid UpdateVocabularyItem', () => {
        const validUpdate: UpdateVocabularyItem = {
          id: 'test-id',
          word: 'updated word'
        };
        expect(isUpdateVocabularyItem(validUpdate)).toBe(true);
      });

      it('should validate UpdateVocabularyItem with only id', () => {
        const validUpdate = {
          id: 'test-id'
        };
        expect(isUpdateVocabularyItem(validUpdate)).toBe(true);
      });

      it('should reject invalid UpdateVocabularyItem', () => {
        expect(isUpdateVocabularyItem({})).toBe(false);
        expect(isUpdateVocabularyItem({
          word: 'hello'
          // missing id
        })).toBe(false);
        expect(isUpdateVocabularyItem({
          id: ''
        })).toBe(false);
        expect(isUpdateVocabularyItem(null)).toBe(false);
      });
    });

    describe('isContentGenerationParams', () => {
      it('should validate valid ContentGenerationParams for sentences', () => {
        const validParams: ContentGenerationParams = {
          words: ['hello', 'world'],
          type: 'sentence',
          count: 3
        };
        expect(isContentGenerationParams(validParams)).toBe(true);
      });

      it('should validate valid ContentGenerationParams for articles', () => {
        const validParams: ContentGenerationParams = {
          words: ['hello', 'world'],
          type: 'article',
          topic: 'greetings'
        };
        expect(isContentGenerationParams(validParams)).toBe(true);
      });

      it('should reject invalid ContentGenerationParams', () => {
        expect(isContentGenerationParams({})).toBe(false);
        expect(isContentGenerationParams({
          words: ['hello', 'world']
          // missing type
        })).toBe(false);
        expect(isContentGenerationParams({
          words: ['hello', 123], // invalid word type
          type: 'sentence'
        })).toBe(false);
        expect(isContentGenerationParams({
          words: [],
          type: 'invalid-type'
        })).toBe(false);
        expect(isContentGenerationParams(null)).toBe(false);
      });
    });
  });

  describe('Default Configurations', () => {
    describe('DEFAULT_CONFIG', () => {
      it('should have all required properties', () => {
        expect(DEFAULT_CONFIG).toHaveProperty('apiKey');
        expect(DEFAULT_CONFIG).toHaveProperty('apiProvider');
        expect(DEFAULT_CONFIG).toHaveProperty('defaultTargetLanguage');
        expect(DEFAULT_CONFIG).toHaveProperty('customPrompts');
        expect(DEFAULT_CONFIG).toHaveProperty('uiPreferences');
      });

      it('should have valid default values', () => {
        expect(DEFAULT_CONFIG.apiKey).toBe('');
        expect(DEFAULT_CONFIG.apiProvider).toBe('openai');
        expect(DEFAULT_CONFIG.defaultTargetLanguage).toBe('en');
        expect(typeof DEFAULT_CONFIG.customPrompts.translation).toBe('string');
        expect(typeof DEFAULT_CONFIG.customPrompts.sentenceGeneration).toBe('string');
        expect(typeof DEFAULT_CONFIG.customPrompts.articleGeneration).toBe('string');
        expect(DEFAULT_CONFIG.uiPreferences.theme).toBe('auto');
        expect(DEFAULT_CONFIG.uiPreferences.overlayPosition).toBe('auto');
        expect(DEFAULT_CONFIG.uiPreferences.autoPlayPronunciation).toBe(false);
      });

      it('should have non-empty prompt templates', () => {
        expect(DEFAULT_CONFIG.customPrompts.translation.length).toBeGreaterThan(0);
        expect(DEFAULT_CONFIG.customPrompts.sentenceGeneration.length).toBeGreaterThan(0);
        expect(DEFAULT_CONFIG.customPrompts.articleGeneration.length).toBeGreaterThan(0);
      });
    });

    describe('DEFAULT_CACHE_CONFIG', () => {
      it('should have all required properties', () => {
        expect(DEFAULT_CACHE_CONFIG).toHaveProperty('maxTranslations');
        expect(DEFAULT_CACHE_CONFIG).toHaveProperty('maxAudioFiles');
        expect(DEFAULT_CACHE_CONFIG).toHaveProperty('ttlHours');
      });

      it('should have reasonable default values', () => {
        expect(DEFAULT_CACHE_CONFIG.maxTranslations).toBe(1000);
        expect(DEFAULT_CACHE_CONFIG.maxAudioFiles).toBe(500);
        expect(DEFAULT_CACHE_CONFIG.ttlHours).toBe(24);
      });
    });
  });

  describe('Language Support', () => {
    describe('SUPPORTED_LANGUAGES', () => {
      it('should contain expected languages', () => {
        const expectedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar'];
        expectedLanguages.forEach(lang => {
          expect(SUPPORTED_LANGUAGES).toHaveProperty(lang);
        });
      });

      it('should have valid language configurations', () => {
        Object.values(SUPPORTED_LANGUAGES).forEach(config => {
          expect(config).toHaveProperty('code');
          expect(config).toHaveProperty('name');
          expect(config).toHaveProperty('nativeName');
          expect(config).toHaveProperty('rtl');
          expect(config).toHaveProperty('ttsSupported');
          
          expect(typeof config.code).toBe('string');
          expect(typeof config.name).toBe('string');
          expect(typeof config.nativeName).toBe('string');
          expect(typeof config.rtl).toBe('boolean');
          expect(typeof config.ttsSupported).toBe('boolean');
        });
      });

      it('should correctly identify RTL languages', () => {
        expect(SUPPORTED_LANGUAGES.ar.rtl).toBe(true);
        expect(SUPPORTED_LANGUAGES.en.rtl).toBe(false);
        expect(SUPPORTED_LANGUAGES.es.rtl).toBe(false);
      });

      it('should have TTS support for all languages', () => {
        Object.values(SUPPORTED_LANGUAGES).forEach(config => {
          expect(config.ttsSupported).toBe(true);
        });
      });
    });
  });

  describe('Enums', () => {
    describe('StorageKeys', () => {
      it('should have all required storage keys', () => {
        expect(StorageKeys.VOCABULARY).toBe('vocabulary');
        expect(StorageKeys.CONFIG).toBe('config');
        expect(StorageKeys.CACHE_TRANSLATIONS).toBe('cache_translations');
        expect(StorageKeys.CACHE_AUDIO).toBe('cache_audio');
        expect(StorageKeys.STATISTICS).toBe('statistics');
      });
    });

    describe('MessageType', () => {
      it('should have all required message types', () => {
        const expectedTypes = [
          'TRANSLATE_TEXT',
          'ADD_TO_VOCABULARY',
          'GET_VOCABULARY',
          'UPDATE_VOCABULARY',
          'DELETE_VOCABULARY',
          'EXPORT_VOCABULARY',
          'GENERATE_CONTENT',
          'PLAY_PRONUNCIATION',
          'UPDATE_CONFIG',
          'GET_CONFIG'
        ];
        
        expectedTypes.forEach(type => {
          expect(MessageType).toHaveProperty(type);
        });
      });
    });

    describe('ErrorType', () => {
      it('should have all required error types', () => {
        const expectedTypes = [
          'VALIDATION_ERROR',
          'API_ERROR',
          'STORAGE_ERROR',
          'NETWORK_ERROR',
          'AUTHENTICATION_ERROR',
          'RATE_LIMIT_ERROR',
          'UNKNOWN_ERROR'
        ];
        
        expectedTypes.forEach(type => {
          expect(ErrorType).toHaveProperty(type);
        });
      });
    });

    describe('APIStatus', () => {
      it('should have all required API status values', () => {
        expect(APIStatus.SUCCESS).toBe('success');
        expect(APIStatus.ERROR).toBe('error');
        expect(APIStatus.PENDING).toBe('pending');
      });
    });
  });
});