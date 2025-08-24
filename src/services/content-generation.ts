/**
 * Content Generation Service
 * Handles sentence and article generation using vocabulary words with LLM
 */

import type { 
  GeneratedContent, 
  LanguageCode,
  APIProvider
} from '../types/index.js';
import { 
  LLMClient, 
  LLMError, 
  type LLMRequest,
  type LLMResponse,
  type ProviderConfig
} from './llm.js';

// Content generation error types
export enum ContentGenerationErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  PROMPT_ERROR = 'PROMPT_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  LLM_ERROR = 'LLM_ERROR',
  INSUFFICIENT_WORDS = 'INSUFFICIENT_WORDS'
}

export class ContentGenerationError extends Error {
  constructor(
    public code: ContentGenerationErrorCode,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ContentGenerationError';
  }
}

// Content generation options
export interface SentenceGenerationOptions {
  count?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  targetLanguage: LanguageCode;
  includeTranslation?: boolean;
  customPrompt?: string;
}

export interface ArticleGenerationOptions {
  topic?: string;
  length?: 'short' | 'medium' | 'long';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  targetLanguage: LanguageCode;
  includeTranslation?: boolean;
  customPrompt?: string;
}

// Generated content with highlighting
export interface GeneratedContentWithHighlights extends GeneratedContent {
  highlightedContent: string;
  wordPositions: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

// Built-in content generation prompts
export const DEFAULT_CONTENT_PROMPTS = {
  sentences: `Generate {count} example sentences in {language} using the following vocabulary words: {words}

Requirements:
- Use at least one vocabulary word in each sentence
- Make sentences natural and contextually appropriate
- Difficulty level: {difficulty}
- Vary sentence structure and complexity
{translationRequirement}

Please respond in the following JSON format:
{
  "sentences": [
    {
      "content": "sentence text",
      "usedWords": ["word1", "word2"],
      "translation": "English translation (if requested)"
    }
  ]
}`,

  article: `Write a {length} article in {language} about {topic} using the following vocabulary words: {words}

Requirements:
- Incorporate all provided vocabulary words naturally
- Make the article engaging and informative
- Difficulty level: {difficulty}
- Length: {lengthDescription}
{translationRequirement}

Please respond in the following JSON format:
{
  "title": "Article title",
  "content": "Full article text",
  "usedWords": ["word1", "word2", "word3"],
  "translation": "English translation (if requested)"
}`,

  contextualSentences: `Create {count} contextual example sentences in {language} for language learning.

Vocabulary words to use: {words}
Context/Theme: {context}
Difficulty: {difficulty}

Requirements:
- Each sentence should use 1-2 vocabulary words
- Sentences should be connected thematically
- Progress from simple to more complex usage
- Include natural, everyday language

Respond in JSON format:
{
  "sentences": [
    {
      "content": "sentence in target language",
      "usedWords": ["vocabulary", "words"],
      "context": "brief context note",
      "translation": "English translation"
    }
  ]
}`
};

// Language name mappings
const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese',
  'ar': 'Arabic'
};

/**
 * Content Generation Service
 */
export class ContentGenerationService {
  private llmClient: LLMClient;

  constructor(llmClient: LLMClient) {
    this.llmClient = llmClient;
  }

  /**
   * Generate sentences using vocabulary words
   */
  async generateSentences(
    words: string[],
    options: SentenceGenerationOptions
  ): Promise<GeneratedContentWithHighlights> {
    try {
      this.validateSentenceInput(words, options);

      const prompt = this.buildSentencePrompt(words, options);
      const llmRequest: LLMRequest = {
        prompt,
        maxTokens: 1500,
        temperature: 0.7 // Higher temperature for more creative content
      };

      const llmResponse = await this.llmClient.sendRequest(llmRequest);
      return this.parseSentenceResponse(words, llmResponse);

    } catch (error) {
      if (error instanceof LLMError) {
        throw new ContentGenerationError(
          ContentGenerationErrorCode.LLM_ERROR,
          `LLM error: ${error.message}`,
          error
        );
      }
      
      if (error instanceof ContentGenerationError) {
        throw error;
      }

      throw new ContentGenerationError(
        ContentGenerationErrorCode.PARSING_ERROR,
        `Sentence generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate an article using vocabulary words
   */
  async generateArticle(
    words: string[],
    options: ArticleGenerationOptions
  ): Promise<GeneratedContentWithHighlights> {
    try {
      this.validateArticleInput(words, options);

      const prompt = this.buildArticlePrompt(words, options);
      const llmRequest: LLMRequest = {
        prompt,
        maxTokens: this.getMaxTokensForLength(options.length || 'medium'),
        temperature: 0.7
      };

      const llmResponse = await this.llmClient.sendRequest(llmRequest);
      return this.parseArticleResponse(words, llmResponse);

    } catch (error) {
      if (error instanceof LLMError) {
        throw new ContentGenerationError(
          ContentGenerationErrorCode.LLM_ERROR,
          `LLM error: ${error.message}`,
          error
        );
      }
      
      if (error instanceof ContentGenerationError) {
        throw error;
      }

      throw new ContentGenerationError(
        ContentGenerationErrorCode.PARSING_ERROR,
        `Article generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate contextual sentences with a theme
   */
  async generateContextualSentences(
    words: string[],
    context: string,
    options: Omit<SentenceGenerationOptions, 'customPrompt'>
  ): Promise<GeneratedContentWithHighlights> {
    const prompt = this.buildContextualSentencePrompt(words, context, options);
    
    const llmRequest: LLMRequest = {
      prompt,
      maxTokens: 1500,
      temperature: 0.7
    };

    try {
      const llmResponse = await this.llmClient.sendRequest(llmRequest);
      return this.parseSentenceResponse(words, llmResponse);
    } catch (error) {
      if (error instanceof LLMError) {
        throw new ContentGenerationError(
          ContentGenerationErrorCode.LLM_ERROR,
          `LLM error: ${error.message}`,
          error
        );
      }
      throw error;
    }
  }

  private validateSentenceInput(words: string[], options: SentenceGenerationOptions): void {
    if (!words || words.length === 0) {
      throw new ContentGenerationError(
        ContentGenerationErrorCode.INSUFFICIENT_WORDS,
        'At least one vocabulary word is required'
      );
    }

    if (words.length > 20) {
      throw new ContentGenerationError(
        ContentGenerationErrorCode.INVALID_INPUT,
        'Too many vocabulary words (maximum 20)'
      );
    }

    if (!options.targetLanguage) {
      throw new ContentGenerationError(
        ContentGenerationErrorCode.INVALID_INPUT,
        'Target language is required'
      );
    }

    if (!LANGUAGE_NAMES[options.targetLanguage]) {
      throw new ContentGenerationError(
        ContentGenerationErrorCode.INVALID_INPUT,
        `Target language '${options.targetLanguage}' is not supported`
      );
    }

    const count = options.count || 3;
    if (count < 1 || count > 10) {
      throw new ContentGenerationError(
        ContentGenerationErrorCode.INVALID_INPUT,
        'Sentence count must be between 1 and 10'
      );
    }
  }

  private validateArticleInput(words: string[], options: ArticleGenerationOptions): void {
    if (!words || words.length === 0) {
      throw new ContentGenerationError(
        ContentGenerationErrorCode.INSUFFICIENT_WORDS,
        'At least one vocabulary word is required'
      );
    }

    if (words.length > 30) {
      throw new ContentGenerationError(
        ContentGenerationErrorCode.INVALID_INPUT,
        'Too many vocabulary words for article (maximum 30)'
      );
    }

    if (!options.targetLanguage) {
      throw new ContentGenerationError(
        ContentGenerationErrorCode.INVALID_INPUT,
        'Target language is required'
      );
    }

    if (!LANGUAGE_NAMES[options.targetLanguage]) {
      throw new ContentGenerationError(
        ContentGenerationErrorCode.INVALID_INPUT,
        `Target language '${options.targetLanguage}' is not supported`
      );
    }
  }

  private buildSentencePrompt(words: string[], options: SentenceGenerationOptions): string {
    if (options.customPrompt) {
      return this.replacePlaceholders(options.customPrompt, {
        words: words.join(', '),
        count: (options.count || 3).toString(),
        language: LANGUAGE_NAMES[options.targetLanguage],
        difficulty: options.difficulty || 'intermediate'
      });
    }

    let prompt = DEFAULT_CONTENT_PROMPTS.sentences;
    
    prompt = prompt.replace(/{count}/g, (options.count || 3).toString());
    prompt = prompt.replace(/{language}/g, LANGUAGE_NAMES[options.targetLanguage]);
    prompt = prompt.replace(/{words}/g, words.join(', '));
    prompt = prompt.replace(/{difficulty}/g, options.difficulty || 'intermediate');
    
    const translationReq = options.includeTranslation 
      ? '- Provide English translation for each sentence'
      : '- No translation needed';
    prompt = prompt.replace(/{translationRequirement}/g, translationReq);

    return prompt;
  }

  private buildArticlePrompt(words: string[], options: ArticleGenerationOptions): string {
    if (options.customPrompt) {
      return this.replacePlaceholders(options.customPrompt, {
        words: words.join(', '),
        topic: options.topic || 'general topic',
        language: LANGUAGE_NAMES[options.targetLanguage],
        difficulty: options.difficulty || 'intermediate',
        length: options.length || 'medium'
      });
    }

    let prompt = DEFAULT_CONTENT_PROMPTS.article;
    
    prompt = prompt.replace(/{length}/g, options.length || 'medium');
    prompt = prompt.replace(/{language}/g, LANGUAGE_NAMES[options.targetLanguage]);
    prompt = prompt.replace(/{topic}/g, options.topic || 'an interesting topic');
    prompt = prompt.replace(/{words}/g, words.join(', '));
    prompt = prompt.replace(/{difficulty}/g, options.difficulty || 'intermediate');
    
    const lengthDesc = this.getLengthDescription(options.length || 'medium');
    prompt = prompt.replace(/{lengthDescription}/g, lengthDesc);
    
    const translationReq = options.includeTranslation 
      ? '- Provide English translation of the entire article'
      : '- No translation needed';
    prompt = prompt.replace(/{translationRequirement}/g, translationReq);

    return prompt;
  }

  private buildContextualSentencePrompt(
    words: string[], 
    context: string, 
    options: Omit<SentenceGenerationOptions, 'customPrompt'>
  ): string {
    let prompt = DEFAULT_CONTENT_PROMPTS.contextualSentences;
    
    prompt = prompt.replace(/{count}/g, (options.count || 3).toString());
    prompt = prompt.replace(/{language}/g, LANGUAGE_NAMES[options.targetLanguage]);
    prompt = prompt.replace(/{words}/g, words.join(', '));
    prompt = prompt.replace(/{context}/g, context);
    prompt = prompt.replace(/{difficulty}/g, options.difficulty || 'intermediate');

    return prompt;
  }

  private replacePlaceholders(template: string, replacements: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return result;
  }

  private async parseSentenceResponse(
    words: string[],
    response: LLMResponse
  ): Promise<GeneratedContentWithHighlights> {
    try {
      // Extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response.content;
      
      const parsed = JSON.parse(jsonStr);
      const sentences = parsed.sentences || [];

      // Combine all sentences into content
      const content = sentences.map((s: any) => s.content || '').join(' ');
      
      // Find all used words
      const usedWords = new Set<string>();
      sentences.forEach((s: any) => {
        if (s.usedWords) {
          s.usedWords.forEach((word: string) => usedWords.add(word));
        }
      });

      const result: GeneratedContentWithHighlights = {
        type: 'sentence',
        content,
        usedWords: Array.from(usedWords),
        generatedAt: new Date(),
        highlightedContent: this.highlightWords(content, Array.from(usedWords)),
        wordPositions: this.findWordPositions(content, Array.from(usedWords))
      };

      return result;

    } catch (error) {
      // Fallback to text parsing
      const content = response.content.trim();
      const usedWords = this.findUsedWords(content, words);

      return {
        type: 'sentence',
        content,
        usedWords,
        generatedAt: new Date(),
        highlightedContent: this.highlightWords(content, usedWords),
        wordPositions: this.findWordPositions(content, usedWords)
      };
    }
  }

  private async parseArticleResponse(
    words: string[],
    response: LLMResponse
  ): Promise<GeneratedContentWithHighlights> {
    try {
      // Extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response.content;
      
      const parsed = JSON.parse(jsonStr);
      
      const content = parsed.content || response.content;
      const usedWords = parsed.usedWords || this.findUsedWords(content, words);

      const result: GeneratedContentWithHighlights = {
        type: 'article',
        content,
        usedWords,
        generatedAt: new Date(),
        highlightedContent: this.highlightWords(content, usedWords),
        wordPositions: this.findWordPositions(content, usedWords)
      };

      return result;

    } catch (error) {
      // Fallback to text parsing
      const content = response.content.trim();
      const usedWords = this.findUsedWords(content, words);

      return {
        type: 'article',
        content,
        usedWords,
        generatedAt: new Date(),
        highlightedContent: this.highlightWords(content, usedWords),
        wordPositions: this.findWordPositions(content, usedWords)
      };
    }
  }

  private findUsedWords(content: string, vocabularyWords: string[]): string[] {
    const usedWords: string[] = [];
    const contentLower = content.toLowerCase();

    for (const word of vocabularyWords) {
      const wordLower = word.toLowerCase();
      if (contentLower.includes(wordLower)) {
        usedWords.push(word);
      }
    }

    return usedWords;
  }

  private highlightWords(content: string, words: string[]): string {
    let highlighted = content;
    
    for (const word of words) {
      // Use word boundaries that exclude hyphens and other word connectors
      const escapedWord = this.escapeRegex(word);
      const regex = new RegExp(`(^|\\s|[.!?,:;])${escapedWord}(?=\\s|[.!?,:;]|$)`, 'gi');
      highlighted = highlighted.replace(regex, (match, prefix) => {
        const wordMatch = match.slice(prefix.length);
        return prefix + `<mark>${wordMatch}</mark>`;
      });
    }

    return highlighted;
  }

  private findWordPositions(content: string, words: string[]): Array<{word: string; start: number; end: number}> {
    const positions: Array<{word: string; start: number; end: number}> = [];
    
    for (const word of words) {
      const escapedWord = this.escapeRegex(word);
      const regex = new RegExp(`(^|\\s|[.!?,:;])${escapedWord}(?=\\s|[.!?,:;]|$)`, 'gi');
      let match;
      
      while ((match = regex.exec(content)) !== null) {
        const prefix = match[1];
        const wordStart = match.index + prefix.length;
        positions.push({
          word: match[0].slice(prefix.length),
          start: wordStart,
          end: wordStart + word.length
        });
      }
    }

    return positions.sort((a, b) => a.start - b.start);
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private getLengthDescription(length: string): string {
    switch (length) {
      case 'short': return '150-250 words';
      case 'medium': return '300-500 words';
      case 'long': return '600-800 words';
      default: return '300-500 words';
    }
  }

  private getMaxTokensForLength(length: string): number {
    switch (length) {
      case 'short': return 800;
      case 'medium': return 1500;
      case 'long': return 2500;
      default: return 1500;
    }
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return this.llmClient.isConfigured();
  }

  /**
   * Get the underlying LLM provider
   */
  getProvider(): APIProvider {
    return this.llmClient.getProvider();
  }
}

/**
 * Content Generation Service Factory
 */
export class ContentGenerationServiceFactory {
  static create(provider: APIProvider, config: ProviderConfig): ContentGenerationService {
    const llmClient = new LLMClient(provider, config);
    return new ContentGenerationService(llmClient);
  }

  static createFromLLMClient(llmClient: LLMClient): ContentGenerationService {
    return new ContentGenerationService(llmClient);
  }
}