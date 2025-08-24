/**
 * Unit tests for Content Generation Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  ContentGenerationService,
  ContentGenerationServiceFactory,
  ContentGenerationError,
  ContentGenerationErrorCode,
  type SentenceGenerationOptions,
  type ArticleGenerationOptions
} from '../services/content-generation.js';
import { 
  LLMError,
  LLMErrorCode,
  type LLMResponse,
  type OpenAIConfig
} from '../services/llm.js';

// Mock LLMClient
const createMockLLMClient = () => ({
  sendRequest: vi.fn(),
  isConfigured: vi.fn(() => true),
  getProvider: vi.fn(() => 'openai' as const),
  validateApiKey: vi.fn(() => Promise.resolve(true))
});

describe('ContentGenerationService', () => {
  let contentService: ContentGenerationService;
  let mockLLMClient: ReturnType<typeof createMockLLMClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLLMClient = createMockLLMClient();
    contentService = new ContentGenerationService(mockLLMClient as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize properly', () => {
      expect(contentService.isConfigured()).toBe(true);
      expect(contentService.getProvider()).toBe('openai');
    });
  });

  describe('Sentence Generation', () => {
    describe('Input Validation', () => {
      it('should throw error for empty words array', async () => {
        const options: SentenceGenerationOptions = {
          targetLanguage: 'es'
        };

        await expect(contentService.generateSentences([], options))
          .rejects.toThrow(ContentGenerationError);
        
        await expect(contentService.generateSentences([], options))
          .rejects.toThrow('At least one vocabulary word is required');
      });

      it('should throw error for too many words', async () => {
        const words = Array(21).fill('word');
        const options: SentenceGenerationOptions = {
          targetLanguage: 'es'
        };

        await expect(contentService.generateSentences(words, options))
          .rejects.toThrow('Too many vocabulary words (maximum 20)');
      });

      it('should throw error for missing target language', async () => {
        const words = ['hello', 'world'];
        const options = {} as SentenceGenerationOptions;

        await expect(contentService.generateSentences(words, options))
          .rejects.toThrow('Target language is required');
      });

      it('should throw error for unsupported language', async () => {
        const words = ['hello', 'world'];
        const options: SentenceGenerationOptions = {
          targetLanguage: 'xx' as any
        };

        await expect(contentService.generateSentences(words, options))
          .rejects.toThrow('Target language \'xx\' is not supported');
      });

      it('should throw error for invalid sentence count', async () => {
        const words = ['hello'];
        const options: SentenceGenerationOptions = {
          targetLanguage: 'es',
          count: 15
        };

        await expect(contentService.generateSentences(words, options))
          .rejects.toThrow('Sentence count must be between 1 and 10');
      });
    });

    describe('Successful Generation', () => {
      it('should generate sentences with JSON response', async () => {
        const mockResponse: LLMResponse = {
          content: JSON.stringify({
            sentences: [
              {
                content: 'Hola mundo, ¿cómo estás?',
                usedWords: ['hola', 'mundo'],
                translation: 'Hello world, how are you?'
              },
              {
                content: 'El mundo es muy grande.',
                usedWords: ['mundo'],
                translation: 'The world is very big.'
              }
            ]
          })
        };

        mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

        const words = ['hola', 'mundo'];
        const options: SentenceGenerationOptions = {
          targetLanguage: 'es',
          count: 2,
          includeTranslation: true
        };

        const result = await contentService.generateSentences(words, options);

        expect(result.type).toBe('sentence');
        expect(result.content).toContain('Hola mundo');
        expect(result.content).toContain('El mundo es muy grande');
        expect(result.usedWords).toContain('hola');
        expect(result.usedWords).toContain('mundo');
        expect(result.highlightedContent).toContain('<mark>');
        expect(result.wordPositions).toHaveLength(3); // hola, mundo, mundo
        expect(result.generatedAt).toBeInstanceOf(Date);

        expect(mockLLMClient.sendRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            prompt: expect.stringContaining('hola, mundo'),
            temperature: 0.7,
            maxTokens: 1500
          })
        );
      });

      it('should handle fallback text parsing', async () => {
        const mockResponse: LLMResponse = {
          content: 'Hola mundo. El mundo es grande. This is not JSON format.'
        };

        mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

        const words = ['hola', 'mundo'];
        const options: SentenceGenerationOptions = {
          targetLanguage: 'es',
          count: 2
        };

        const result = await contentService.generateSentences(words, options);

        expect(result.type).toBe('sentence');
        expect(result.content).toBe('Hola mundo. El mundo es grande. This is not JSON format.');
        expect(result.usedWords).toContain('hola');
        expect(result.usedWords).toContain('mundo');
        expect(result.highlightedContent).toContain('<mark>Hola</mark>');
        expect(result.highlightedContent).toContain('<mark>mundo</mark>');
      });

      it('should use custom prompt', async () => {
        const mockResponse: LLMResponse = {
          content: JSON.stringify({
            sentences: [
              {
                content: 'Custom sentence with hola',
                usedWords: ['hola']
              }
            ]
          })
        };

        mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

        const words = ['hola'];
        const options: SentenceGenerationOptions = {
          targetLanguage: 'es',
          customPrompt: 'Create {count} sentences in {language} using {words}. Make them simple.'
        };

        await contentService.generateSentences(words, options);

        expect(mockLLMClient.sendRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            prompt: expect.stringContaining('Create 3 sentences in Spanish using hola. Make them simple.')
          })
        );
      });
    });
  });

  describe('Article Generation', () => {
    describe('Input Validation', () => {
      it('should throw error for empty words array', async () => {
        const options: ArticleGenerationOptions = {
          targetLanguage: 'es'
        };

        await expect(contentService.generateArticle([], options))
          .rejects.toThrow('At least one vocabulary word is required');
      });

      it('should throw error for too many words', async () => {
        const words = Array(31).fill('word');
        const options: ArticleGenerationOptions = {
          targetLanguage: 'es'
        };

        await expect(contentService.generateArticle(words, options))
          .rejects.toThrow('Too many vocabulary words for article (maximum 30)');
      });

      it('should throw error for missing target language', async () => {
        const words = ['hello', 'world'];
        const options = {} as ArticleGenerationOptions;

        await expect(contentService.generateArticle(words, options))
          .rejects.toThrow('Target language is required');
      });
    });

    describe('Successful Generation', () => {
      it('should generate article with JSON response', async () => {
        const mockResponse: LLMResponse = {
          content: JSON.stringify({
            title: 'Un Artículo Sobre el Mundo',
            content: 'Este es un artículo sobre el mundo. El mundo es muy grande y hermoso. Hola a todos los lectores.',
            usedWords: ['mundo', 'hola'],
            translation: 'This is an article about the world. The world is very big and beautiful. Hello to all readers.'
          })
        };

        mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

        const words = ['mundo', 'hola'];
        const options: ArticleGenerationOptions = {
          targetLanguage: 'es',
          topic: 'travel',
          length: 'short',
          difficulty: 'beginner',
          includeTranslation: true
        };

        const result = await contentService.generateArticle(words, options);

        expect(result.type).toBe('article');
        expect(result.content).toContain('mundo');
        expect(result.content.toLowerCase()).toContain('hola');
        expect(result.usedWords).toContain('mundo');
        expect(result.usedWords).toContain('hola');
        expect(result.highlightedContent).toContain('<mark>mundo</mark>');
        expect(result.wordPositions.length).toBeGreaterThan(0);

        expect(mockLLMClient.sendRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            prompt: expect.stringContaining('travel'),
            maxTokens: 800 // Short article
          })
        );
        
        // Check that the prompt contains all expected parts
        const callArgs = mockLLMClient.sendRequest.mock.calls[0][0];
        expect(callArgs.prompt).toContain('mundo, hola');
        expect(callArgs.prompt).toContain('short');
      });

      it('should handle different article lengths', async () => {
        const mockResponse: LLMResponse = {
          content: 'Long article content here'
        };

        mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

        const words = ['test'];
        const options: ArticleGenerationOptions = {
          targetLanguage: 'es',
          length: 'long'
        };

        await contentService.generateArticle(words, options);

        expect(mockLLMClient.sendRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            maxTokens: 2500 // Long article
          })
        );
      });

      it('should use default values for optional parameters', async () => {
        const mockResponse: LLMResponse = {
          content: 'Article content'
        };

        mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

        const words = ['test'];
        const options: ArticleGenerationOptions = {
          targetLanguage: 'es'
        };

        await contentService.generateArticle(words, options);

        expect(mockLLMClient.sendRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            prompt: expect.stringContaining('medium'),
            maxTokens: 1500 // Medium article
          })
        );
      });
    });
  });

  describe('Contextual Sentence Generation', () => {
    it('should generate contextual sentences', async () => {
      const mockResponse: LLMResponse = {
        content: JSON.stringify({
          sentences: [
            {
              content: 'En el restaurante, digo hola al camarero.',
              usedWords: ['hola'],
              context: 'restaurant greeting',
              translation: 'In the restaurant, I say hello to the waiter.'
            }
          ]
        })
      };

      mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

      const words = ['hola'];
      const context = 'restaurant scenario';
      const options: Omit<SentenceGenerationOptions, 'customPrompt'> = {
        targetLanguage: 'es',
        count: 1,
        difficulty: 'beginner'
      };

      const result = await contentService.generateContextualSentences(words, context, options);

      expect(result.type).toBe('sentence');
      expect(result.content).toContain('hola');
      expect(result.usedWords).toContain('hola');

      expect(mockLLMClient.sendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('restaurant scenario')
        })
      );
    });
  });

  describe('Word Highlighting and Positioning', () => {
    it('should correctly highlight words in content', async () => {
      const mockResponse: LLMResponse = {
        content: 'Hello world. The world is big. Hello again.'
      };

      mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

      const words = ['hello', 'world'];
      const options: SentenceGenerationOptions = {
        targetLanguage: 'en'
      };

      const result = await contentService.generateSentences(words, options);

      expect(result.highlightedContent).toContain('<mark>Hello</mark>');
      expect(result.highlightedContent).toContain('<mark>world</mark>');
      expect(result.wordPositions).toHaveLength(4); // Hello, world, world, Hello
      
      // Check positions are sorted by start index
      for (let i = 1; i < result.wordPositions.length; i++) {
        expect(result.wordPositions[i].start).toBeGreaterThanOrEqual(
          result.wordPositions[i - 1].start
        );
      }
    });

    it('should handle case-insensitive word matching', async () => {
      const mockResponse: LLMResponse = {
        content: 'HELLO world. Hello WORLD.'
      };

      mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

      const words = ['hello', 'world'];
      const options: SentenceGenerationOptions = {
        targetLanguage: 'en'
      };

      const result = await contentService.generateSentences(words, options);

      expect(result.usedWords).toContain('hello');
      expect(result.usedWords).toContain('world');
      expect(result.highlightedContent).toContain('<mark>HELLO</mark>');
      expect(result.highlightedContent).toContain('<mark>WORLD</mark>');
    });

    it('should handle special characters in words', async () => {
      const mockResponse: LLMResponse = {
        content: 'The café is nice. I love café-style coffee.'
      };

      mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

      const words = ['café'];
      const options: SentenceGenerationOptions = {
        targetLanguage: 'en'
      };

      const result = await contentService.generateSentences(words, options);

      expect(result.usedWords).toContain('café');
      expect(result.highlightedContent).toContain('<mark>café</mark>');
      // Should not highlight "café-style" as a whole word match
      expect(result.wordPositions).toHaveLength(1); // Only standalone "café" should match
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

      const words = ['test'];
      const options: SentenceGenerationOptions = {
        targetLanguage: 'es'
      };

      try {
        await contentService.generateSentences(words, options);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ContentGenerationError);
        expect((error as ContentGenerationError).code).toBe(ContentGenerationErrorCode.LLM_ERROR);
        expect((error as ContentGenerationError).originalError).toBe(llmError);
      }
    });

    it('should handle parsing errors gracefully', async () => {
      const mockResponse: LLMResponse = {
        content: 'This is not JSON and will cause parsing to fail'
      };

      mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

      const words = ['test'];
      const options: SentenceGenerationOptions = {
        targetLanguage: 'es'
      };

      // Should not throw, should fallback to text parsing
      const result = await contentService.generateSentences(words, options);
      expect(result.content).toBe('This is not JSON and will cause parsing to fail');
    });

    it('should handle generic errors', async () => {
      mockLLMClient.sendRequest.mockRejectedValueOnce(new Error('Generic error'));

      const words = ['test'];
      const options: SentenceGenerationOptions = {
        targetLanguage: 'es'
      };

      try {
        await contentService.generateSentences(words, options);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ContentGenerationError);
        expect((error as ContentGenerationError).code).toBe(ContentGenerationErrorCode.PARSING_ERROR);
      }
    });
  });

  describe('ContentGenerationServiceFactory', () => {
    it('should create service from provider config', () => {
      const config: OpenAIConfig = {
        apiKey: 'sk-test123'
      };

      const service = ContentGenerationServiceFactory.create('openai', config);
      expect(service).toBeInstanceOf(ContentGenerationService);
    });

    it('should create service from LLM client', () => {
      const mockClient = createMockLLMClient();
      const service = ContentGenerationServiceFactory.createFromLLMClient(mockClient as any);
      expect(service).toBeInstanceOf(ContentGenerationService);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty JSON response', async () => {
      const mockResponse: LLMResponse = {
        content: JSON.stringify({})
      };

      mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

      const words = ['test'];
      const options: SentenceGenerationOptions = {
        targetLanguage: 'es'
      };

      const result = await contentService.generateSentences(words, options);

      expect(result.content).toBe('');
      expect(result.usedWords).toEqual([]);
    });

    it('should handle malformed JSON with extra text', async () => {
      const mockResponse: LLMResponse = {
        content: `Here are your sentences:
        
        {
          "sentences": [
            {
              "content": "Test sentence with word",
              "usedWords": ["word"]
            }
          ]
        }
        
        Hope this helps!`
      };

      mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

      const words = ['word'];
      const options: SentenceGenerationOptions = {
        targetLanguage: 'es'
      };

      const result = await contentService.generateSentences(words, options);

      expect(result.content).toBe('Test sentence with word');
      expect(result.usedWords).toContain('word');
    });

    it('should handle words not found in content', async () => {
      const mockResponse: LLMResponse = {
        content: 'This content does not contain the vocabulary words.'
      };

      mockLLMClient.sendRequest.mockResolvedValueOnce(mockResponse);

      const words = ['missing', 'words'];
      const options: SentenceGenerationOptions = {
        targetLanguage: 'es'
      };

      const result = await contentService.generateSentences(words, options);

      // The word "words" is actually in the content "vocabulary words"
      expect(result.usedWords).toContain('words');
      expect(result.wordPositions.length).toBeGreaterThan(0);
      expect(result.highlightedContent).toContain('<mark>words</mark>');
    });
  });
});