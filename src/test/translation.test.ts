/**
 * Unit tests for Translation Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  TranslationService,
  TranslationServiceFactory,
  TranslationError,
  TranslationErrorCode
} from '../services/translation.js';
import { 
  LLMError,
  LLMErrorCode,
  type LLMResponse,
  type OpenAIConfig
} from '../services/llm.js';
import type { TranslationOptions } from '../types/index.js';

// Mock LLMClient
const createMockLLMClient = () => ({
  sendRequest: vi.fn(),
  isConfigured: vi.fn(() => true),
  getProvider: vi.fn(() => 'openai' as const),
  validateApiKey: vi.fn(() => Promise.resolve(true))
});

describe('TranslationService', () => {
  let translationService: TranslationService;
  let mockLLMClient: ReturnType<typeof createMockLLMClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLLMClient = createMockLLMClient();
    translationService = new TranslationService(mockLLMClient as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with default prompts', () => {
      const availablePrompts = translationService.getAvailablePrompts();
      expect(availablePrompts).toContain('basic');
      expect(availablePrompts).toContain('withExamples');
      expect(availablePrompts).toContain('contextual');
      expect(availablePrompts).toContain('detailed');
    });

    it('should be configured when LLM client is configured', () => {
      expect(translationService.isConfigured()).toBe(true);
    });

    it('should return correct provider', () => {
      expect(translationService.getProvider()).toBe('openai');
    });
  });

  describe('Input Validation', () => {
    it('should throw error for empty text', async () => {
      const options: TranslationOptions = {
        targetLanguage: 'es',
        includeExamples: false
      };

      await expect(translationService.translate('', options))
        .rejects.toThrow(TranslationError);
      
      await expect(translationService.translate('   ', options))
        .rejects.toThrow('Text to translate cannot be empty');
    });

    it('should throw error for text that is too long', async () => {
      const longText = 'a'.repeat(5001);
      const options: TranslationOptions = {
        targetLanguage: 'es',
        includeExamples: false
      };

      await expect(translationService.translate(longText, options))
        .rejects.toThrow('Text is too long');
    });

    it('should throw error for missing target language', async () => {
      const options = {
        includeExamples: false
      } as TranslationOptions;

      await expect(translationService.translate('Hello', options))
        .rejects.toThrow('Target language is required');
    });

    it('should throw error for unsupported target language', async () => {
      const options: TranslationOptions = {
        targetLanguage: 'xx' as any,
        includeExamples: false
      };

      await expect(translationService.translate('Hello', options))
        .rejects.toThrow('Target language \'xx\' is not supported');
    });

    it('should throw error for unsupported source language', async () => {
      const options: TranslationOptions = {
        sourceLanguage: 'xx' as any,
        targetLanguage: 'es',
        includeExamples: false
      };

      await expect(translationService.translate('Hello', options))
        .rejects.toThrow('Source language \'xx\' is not supported');
    });
  });

  describe('Basic Translation', () => {
    it('should translate text using basic prompt', async () => {
      const mockResponse: LLMResponse = {
        content: 'Hola'
      };

      mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

      const options: TranslationOptions = {
        targetLanguage: 'es',
        includeExamples: false
      };

      const result = await translationService.translate('Hello', options);

      expect(result.originalText).toBe('Hello');
      expect(result.translatedText).toBe('Hola');
      expect(result.targetLanguage).toBe('es');
      expect(result.examples).toEqual([]);
      expect(result.confidence).toBe(0.8);
      expect(result.timestamp).toBeInstanceOf(Date);

      expect(mockLLMClient.sendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Hello'),
          temperature: 0.3
        })
      );
    });

    it('should translate with source language specified', async () => {
      const mockResponse: LLMResponse = {
        content: 'Hola'
      };

      mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

      const options: TranslationOptions = {
        sourceLanguage: 'en',
        targetLanguage: 'es',
        includeExamples: false
      };

      const result = await translationService.translate('Hello', options);

      expect(result.sourceLanguage).toBe('en');
      expect(mockLLMClient.sendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('English')
        })
      );
    });
  });

  describe('Translation with Examples', () => {
    it('should translate with examples using JSON response', async () => {
      const mockResponse: LLMResponse = {
        content: JSON.stringify({
          translation: 'Hola',
          confidence: 0.95,
          examples: [
            {
              original: 'Hello, how are you?',
              translated: 'Hola, ¿cómo estás?'
            },
            {
              original: 'Hello world!',
              translated: '¡Hola mundo!'
            }
          ]
        })
      };

      mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

      const options: TranslationOptions = {
        targetLanguage: 'es',
        includeExamples: true
      };

      const result = await translationService.translate('Hello', options);

      expect(result.translatedText).toBe('Hola');
      expect(result.confidence).toBe(0.95);
      expect(result.examples).toHaveLength(2);
      expect(result.examples[0].original).toBe('Hello, how are you?');
      expect(result.examples[0].translated).toBe('Hola, ¿cómo estás?');
    });

    it('should handle JSON response with extra text', async () => {
      const mockResponse: LLMResponse = {
        content: `Here is the translation:
        
        {
          "translation": "Hola",
          "examples": [
            {
              "original": "Hello there",
              "translated": "Hola"
            }
          ]
        }
        
        I hope this helps!`
      };

      mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

      const options: TranslationOptions = {
        targetLanguage: 'es',
        includeExamples: true
      };

      const result = await translationService.translate('Hello', options);

      expect(result.translatedText).toBe('Hola');
      expect(result.examples).toHaveLength(1);
    });

    it('should fallback to text parsing when JSON parsing fails', async () => {
      const mockResponse: LLMResponse = {
        content: 'Hola - this is not valid JSON'
      };

      mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

      const options: TranslationOptions = {
        targetLanguage: 'es',
        includeExamples: true
      };

      const result = await translationService.translate('Hello', options);

      expect(result.translatedText).toBe('Hola - this is not valid JSON');
      expect(result.examples).toEqual([]);
      expect(result.confidence).toBe(0.8);
    });
  });

  describe('Custom Prompts', () => {
    it('should validate and set custom prompt', () => {
      const customPrompt = 'Translate "{text}" to {targetLanguage}: ';
      
      const validation = translationService.setCustomPrompt('myCustom', customPrompt, {
        requiresExamples: false,
        expectsJSON: false
      });

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(translationService.getAvailablePrompts()).toContain('myCustom');
    });

    it('should reject invalid custom prompt', () => {
      const invalidPrompt = 'This prompt is missing required placeholders';
      
      const validation = translationService.setCustomPrompt('invalid', invalidPrompt);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Missing required placeholder: {text}');
      expect(validation.errors).toContain('Missing required placeholder: {targetLanguage}');
    });

    it('should provide warnings for prompt issues', () => {
      const shortPrompt = 'Translate {text} to {targetLanguage}';
      
      const validation = translationService.setCustomPrompt('short', shortPrompt);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Prompt template is very short, consider adding more context');
    });

    it('should use custom prompt for translation', async () => {
      const customPrompt = 'Please translate "{text}" from {sourceLanguage} to {targetLanguage}. Be precise.';
      
      translationService.setCustomPrompt('precise', customPrompt, {
        requiresExamples: false,
        expectsJSON: false
      });

      const mockResponse: LLMResponse = {
        content: 'Hola'
      };

      mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

      const options: TranslationOptions = {
        sourceLanguage: 'en',
        targetLanguage: 'es',
        includeExamples: false,
        customPrompt: 'precise'
      };

      await translationService.translate('Hello', options);

      expect(mockLLMClient.sendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Please translate "Hello" from English to Spanish. Be precise.')
        })
      );
    });

    it('should handle inline custom prompt', async () => {
      const mockResponse: LLMResponse = {
        content: JSON.stringify({
          translation: 'Hola'
        })
      };

      mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

      const options: TranslationOptions = {
        targetLanguage: 'es',
        includeExamples: false,
        customPrompt: 'Translate this text: "{text}" to {targetLanguage}. Respond in JSON format with "translation" field.'
      };

      const result = await translationService.translate('Hello', options);

      expect(result.translatedText).toBe('Hola');
      expect(mockLLMClient.sendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Translate this text: "Hello" to Spanish')
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle LLM errors', async () => {
      const llmError = new LLMError(
        LLMErrorCode.RATE_LIMIT,
        'Rate limit exceeded',
        'openai'
      );

      mockLLMClient.sendRequest.mockRejectedValueOnce(llmError);

      const options: TranslationOptions = {
        targetLanguage: 'es',
        includeExamples: false
      };

      try {
        await translationService.translate('Hello', options);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(TranslationError);
        expect((error as TranslationError).code).toBe(TranslationErrorCode.LLM_ERROR);
        expect((error as TranslationError).originalError).toBe(llmError);
      }
    });

    it('should handle parsing errors', async () => {
      const mockResponse: LLMResponse = {
        content: '{ invalid json'
      };

      mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

      const options: TranslationOptions = {
        targetLanguage: 'es',
        includeExamples: true
      };

      // Should fallback to text parsing instead of throwing
      const result = await translationService.translate('Hello', options);
      expect(result.translatedText).toBe('{ invalid json');
    });

    it('should handle invalid custom prompt during translation', async () => {
      const options: TranslationOptions = {
        targetLanguage: 'es',
        includeExamples: false,
        customPrompt: 'Invalid prompt without placeholders'
      };

      await expect(translationService.translate('Hello', options))
        .rejects.toThrow(TranslationError);
    });
  });

  describe('Prompt Template Management', () => {
    it('should get prompt template', () => {
      const basicTemplate = translationService.getPromptTemplate('basic');
      
      expect(basicTemplate).toBeDefined();
      expect(basicTemplate?.template).toContain('{text}');
      expect(basicTemplate?.requiresExamples).toBe(false);
      expect(basicTemplate?.expectsJSON).toBe(false);
    });

    it('should return undefined for non-existent template', () => {
      const template = translationService.getPromptTemplate('nonexistent');
      expect(template).toBeUndefined();
    });

    it('should list all available prompts', () => {
      const prompts = translationService.getAvailablePrompts();
      expect(prompts).toContain('basic');
      expect(prompts).toContain('withExamples');
      expect(prompts).toContain('contextual');
      expect(prompts).toContain('detailed');
    });
  });

  describe('Language Support', () => {
    it('should return supported languages', () => {
      const languages = translationService.getSupportedLanguages();
      
      expect(languages).toHaveProperty('en', 'English');
      expect(languages).toHaveProperty('es', 'Spanish');
      expect(languages).toHaveProperty('fr', 'French');
      expect(languages).toHaveProperty('de', 'German');
      expect(languages).toHaveProperty('ja', 'Japanese');
      expect(languages).toHaveProperty('zh', 'Chinese');
    });
  });

  describe('TranslationServiceFactory', () => {
    it('should create service from provider config', () => {
      const config: OpenAIConfig = {
        apiKey: 'sk-test123'
      };

      const service = TranslationServiceFactory.create('openai', config);
      expect(service).toBeInstanceOf(TranslationService);
    });

    it('should create service from LLM client', () => {
      const mockClient = createMockLLMClient();
      const service = TranslationServiceFactory.createFromLLMClient(mockClient as any);
      expect(service).toBeInstanceOf(TranslationService);
    });
  });

  describe('Edge Cases', () => {
    it('should handle response with missing examples array', async () => {
      const mockResponse: LLMResponse = {
        content: JSON.stringify({
          translation: 'Hola'
          // Missing examples array
        })
      };

      mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

      const options: TranslationOptions = {
        targetLanguage: 'es',
        includeExamples: true
      };

      const result = await translationService.translate('Hello', options);

      expect(result.translatedText).toBe('Hola');
      expect(result.examples).toEqual([]);
    });

    it('should handle malformed examples in response', async () => {
      const mockResponse: LLMResponse = {
        content: JSON.stringify({
          translation: 'Hola',
          examples: [
            { original: 'Hello' }, // Missing translated field
            { translated: 'Hola' }, // Missing original field
            { original: 'Hi', translated: 'Hola', context: 'greeting' }
          ]
        })
      };

      mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

      const options: TranslationOptions = {
        targetLanguage: 'es',
        includeExamples: true
      };

      const result = await translationService.translate('Hello', options);

      expect(result.examples).toHaveLength(3);
      expect(result.examples[0].original).toBe('Hello');
      expect(result.examples[0].translated).toBe('');
      expect(result.examples[1].original).toBe('');
      expect(result.examples[1].translated).toBe('Hola');
      expect(result.examples[2].context).toBe('greeting');
    });

    it('should handle auto source language', async () => {
      const mockResponse: LLMResponse = {
        content: 'Hola'
      };

      mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

      const options: TranslationOptions = {
        targetLanguage: 'es',
        includeExamples: false
      };

      const result = await translationService.translate('Hello', options);

      expect(result.sourceLanguage).toBe('auto');
      expect(mockLLMClient.sendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('the source language')
        })
      );
    });
  });
});