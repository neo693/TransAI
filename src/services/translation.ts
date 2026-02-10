/**
 * Translation Service
 * Handles translation requests using LLM with prompt management and response parsing
 */

import type { 
  TranslationResult, 
  TranslationOptions, 
  LanguageCode,
  Example,
  APIProvider
} from '../types/index.js';
import { isLanguageCode } from '../types/utilities.js';
import { 
  LLMClient, 
  LLMError,
  type LLMRequest,
  type LLMResponse,
  type ProviderConfig
} from './llm.js';
import { 
  CachedRequest, 
  LoadingStateManager,
  PerformanceMonitor
} from '../utils/performance.js';

// Translation service error types
export enum TranslationErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  PROMPT_ERROR = 'PROMPT_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  LLM_ERROR = 'LLM_ERROR',
  LANGUAGE_NOT_SUPPORTED = 'LANGUAGE_NOT_SUPPORTED'
}

export class TranslationError extends Error {
  constructor(
    public code: TranslationErrorCode,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'TranslationError';
  }
}

// Built-in translation prompts
export const DEFAULT_TRANSLATION_PROMPTS = {
  basic: `Translate the following text from {sourceLanguage} to {targetLanguage}. 
Provide only the translation without any additional explanation.

Text to translate: "{text}"

Translation:`,

  withExamples: `Translate the following text to {targetLanguage}. 
Detect the source language of the text and return its BCP-47 code.

Text to translate: "{text}"

You must respond in the following JSON format:
{
  "translation": "the translated text",
  "sourceLanguage": "the detected BCP-47 language code (e.g., en, es, fr)",
  "examples": [
    {
      "original": "example sentence in the source language",
      "translated": "example sentence in the source language (same as original)"
    }
  ]
}

IMPORTANT: The examples should be in the SOURCE language (the language being learned), NOT in the target language. For example, if translating English to Chinese, provide English example sentences.`,

  contextual: `Translate the following text from {sourceLanguage} to {targetLanguage}. 
Consider the context provided and give the most appropriate translation.

Text to translate: "{text}"
Context: "{context}"

You must respond in the following JSON format:
{
  "translation": "the translated text",
  "sourceLanguage": "the detected BCP-47 language code (e.g., en, es, fr)",
  "confidence": 0.95,
  "examples": [
    {
      "original": "example sentence in {sourceLanguage}",
      "translated": "example sentence in {sourceLanguage} (same as original)",
      "context": "brief context explanation"
    }
  ]
}

IMPORTANT: The examples should be in the SOURCE language (the language being learned), NOT in the target language.`,

  detailed: `You are a professional translator. Translate the following text from {sourceLanguage} to {targetLanguage}.
Provide a high-quality translation with examples and confidence score.

Text to translate: "{text}"
{contextSection}

Requirements:
1. Provide accurate translation
2. Include 2-3 example sentences showing usage IN THE SOURCE LANGUAGE (the language being learned)
3. Assign confidence score (0.0-1.0)
4. Detect and return the source language BCP-47 code

Please respond in the following JSON format:
{
  "translation": "the translated text",
  "sourceLanguage": "the detected BCP-47 language code (e.g., en, es, fr)",
  "confidence": 0.95,
  "examples": [
    {
      "original": "example sentence in {sourceLanguage}",
      "translated": "example sentence in {sourceLanguage} (same as original)",
      "context": "brief context explanation if needed"
    }
  ]
}

CRITICAL: The examples MUST be in the SOURCE language (the language being learned), NOT in the target language. For example, if translating English to Chinese, provide English example sentences to help learn English.`
};

// Language name mappings for prompts
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

// Prompt template interface
export interface PromptTemplate {
  template: string;
  requiresExamples: boolean;
  expectsJSON: boolean;
}

// Custom prompt validation
export interface CustomPromptValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Translation Service with prompt management and response parsing
 */
export class TranslationService {
  private llmClient: LLMClient;
  private customPrompts: Map<string, PromptTemplate> = new Map();
  private cachedRequest: CachedRequest<TranslationResult>;
  private loadingManager: LoadingStateManager;
  private performanceMonitor: PerformanceMonitor;
  private debouncedTranslate: (text: string, options: TranslationOptions) => Promise<TranslationResult>;

  constructor(llmClient: LLMClient) {
    this.llmClient = llmClient;
    this.cachedRequest = new CachedRequest<TranslationResult>(
      5 * 60 * 1000, // 5 minute cache TTL
      200 // Cache up to 200 translations
    );
    this.loadingManager = new LoadingStateManager();
    this.performanceMonitor = new PerformanceMonitor();
    
    // Create debounced translate function with promise support
    this.debouncedTranslate = this.createDebouncedTranslate();
    
    this.initializeDefaultPrompts();
  }

  private initializeDefaultPrompts(): void {
    this.customPrompts.set('basic', {
      template: DEFAULT_TRANSLATION_PROMPTS.basic,
      requiresExamples: false,
      expectsJSON: false
    });

    this.customPrompts.set('withExamples', {
      template: DEFAULT_TRANSLATION_PROMPTS.withExamples,
      requiresExamples: true,
      expectsJSON: true
    });

    this.customPrompts.set('contextual', {
      template: DEFAULT_TRANSLATION_PROMPTS.contextual,
      requiresExamples: true,
      expectsJSON: true
    });

    this.customPrompts.set('detailed', {
      template: DEFAULT_TRANSLATION_PROMPTS.detailed,
      requiresExamples: true,
      expectsJSON: true
    });
  }

  /**
   * Create a debounced translate function that supports promises
   */
  private createDebouncedTranslate(): (text: string, options: TranslationOptions) => Promise<TranslationResult> {
    let timeoutId: number | null = null;
    let pendingRequest: {
      text: string;
      options: TranslationOptions;
      resolve: (result: TranslationResult) => void;
      reject: (error: Error) => void;
    } | null = null;

    return (text: string, options: TranslationOptions): Promise<TranslationResult> => {
      return new Promise((resolve, reject) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (pendingRequest) {
          pendingRequest.reject(new Error('Translation request superseded by newer input'));
        }

        pendingRequest = { text, options, resolve, reject };

        timeoutId = setTimeout(async () => {
          const currentRequest = pendingRequest;
          pendingRequest = null;
          timeoutId = null;

          if (!currentRequest) return;

          try {
            const result = await this.translateInternal(currentRequest.text, currentRequest.options);
            currentRequest.resolve(result);
          } catch (error) {
            currentRequest.reject(error instanceof Error ? error : new Error(String(error)));
          }
        }, 300);
      });
    };
  }

  /**
   * Translate text using the configured LLM with caching and performance optimizations
   */
  async translate(
    text: string, 
    options: TranslationOptions
  ): Promise<TranslationResult> {
    // Create cache key based on text and options
    const cacheKey = this.createCacheKey(text, options);
    
    // Use cached request with performance monitoring
    return this.cachedRequest.execute(
      cacheKey,
      () => this.translateInternal(text, options),
      {
        ttl: options.cacheTime || 5 * 60 * 1000, // 5 minutes default
        retries: 3,
        loadingMessage: `Translating "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`
      }
    );
  }

  /**
   * Debounced translate method for user input
   */
  async translateDebounced(
    text: string, 
    options: TranslationOptions
  ): Promise<TranslationResult> {
    return new Promise((resolve, reject) => {
      this.debouncedTranslate(text, options)
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Internal translate method without caching
   */
  private async translateInternal(
    text: string, 
    options: TranslationOptions
  ): Promise<TranslationResult> {
    const startTime = Date.now();
    
    try {
      this.validateTranslationInput(text, options);

      const prompt = this.buildPrompt(text, options);
      const llmRequest: LLMRequest = {
        prompt,
        maxTokens: 1000,
        temperature: 0.3 // Lower temperature for more consistent translations
      };

      const llmResponse = await this.llmClient.sendRequest(llmRequest);
      const result = this.parseTranslationResponse(text, llmResponse, options);
      
      // Record performance metrics
      this.performanceMonitor.recordRequest(Date.now() - startTime);
      
      return result;

    } catch (error) {
      this.performanceMonitor.recordError();
      
      if (error instanceof LLMError) {
        throw new TranslationError(
          TranslationErrorCode.LLM_ERROR,
          `LLM error: ${error.message}`,
          error
        );
      }
      
      if (error instanceof TranslationError) {
        throw error;
      }

      throw new TranslationError(
        TranslationErrorCode.PARSING_ERROR,
        `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Create cache key for translation request
   */
  private createCacheKey(text: string, options: TranslationOptions): string {
    const keyParts = [
      text.toLowerCase().trim(),
      options.sourceLanguage || 'auto',
      options.targetLanguage,
      options.promptType || 'withExamples',
      options.context || '',
      options.customPrompt || ''
    ];
    
    // Create a hash-like key
    return keyParts.join('|');
  }

  /**
   * Add or update a custom prompt template
   */
  setCustomPrompt(
    name: string, 
    template: string, 
    options: { requiresExamples?: boolean; expectsJSON?: boolean } = {}
  ): CustomPromptValidation {
    const validation = this.validateCustomPrompt(template);
    
    if (validation.isValid) {
      this.customPrompts.set(name, {
        template,
        requiresExamples: options.requiresExamples ?? true,
        expectsJSON: options.expectsJSON ?? true
      });
    }

    return validation;
  }

  /**
   * Get available prompt templates
   */
  getAvailablePrompts(): string[] {
    return Array.from(this.customPrompts.keys());
  }

  /**
   * Get a specific prompt template
   */
  getPromptTemplate(name: string): PromptTemplate | undefined {
    return this.customPrompts.get(name);
  }

  /**
   * Validate custom prompt template
   */
  validateCustomPrompt(template: string): CustomPromptValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required placeholders
    const requiredPlaceholders = ['{text}', '{targetLanguage}'];

    for (const placeholder of requiredPlaceholders) {
      if (!template.includes(placeholder)) {
        errors.push(`Missing required placeholder: ${placeholder}`);
      }
    }

    // Check for common issues
    if (template.length < 50) {
      warnings.push('Prompt template is very short, consider adding more context');
    }

    if (template.length > 2000) {
      warnings.push('Prompt template is very long, this may affect performance');
    }

    if (!template.includes('JSON') && template.includes('{')) {
      warnings.push('Template contains placeholders but doesn\'t specify JSON format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateTranslationInput(text: string, options: TranslationOptions): void {
    if (!text || text.trim().length === 0) {
      throw new TranslationError(
        TranslationErrorCode.INVALID_INPUT,
        'Text to translate cannot be empty'
      );
    }

    if (text.length > 5000) {
      throw new TranslationError(
        TranslationErrorCode.INVALID_INPUT,
        'Text is too long (maximum 5000 characters)'
      );
    }

    if (!options.targetLanguage) {
      throw new TranslationError(
        TranslationErrorCode.INVALID_INPUT,
        'Target language is required'
      );
    }

    if (!LANGUAGE_NAMES[options.targetLanguage]) {
      throw new TranslationError(
        TranslationErrorCode.LANGUAGE_NOT_SUPPORTED,
        `Target language '${options.targetLanguage}' is not supported`
      );
    }

    if (options.sourceLanguage && options.sourceLanguage !== 'auto' && !LANGUAGE_NAMES[options.sourceLanguage]) {
      throw new TranslationError(
        TranslationErrorCode.LANGUAGE_NOT_SUPPORTED,
        `Source language '${options.sourceLanguage}' is not supported`
      );
    }
  }

  private buildPrompt(text: string, options: TranslationOptions): string {
    const promptName = this.selectPromptTemplate(options);
    const promptTemplate = this.customPrompts.get(promptName);

    if (!promptTemplate) {
      throw new TranslationError(
        TranslationErrorCode.PROMPT_ERROR,
        `Prompt template '${promptName}' not found`
      );
    }

    let prompt = promptTemplate.template;

    // Replace placeholders
    prompt = prompt.replace(/{text}/g, text);
    prompt = prompt.replace(/{targetLanguage}/g, LANGUAGE_NAMES[options.targetLanguage]);
    
    if (options.sourceLanguage && options.sourceLanguage !== 'auto') {
      prompt = prompt.replace(/{sourceLanguage}/g, LANGUAGE_NAMES[options.sourceLanguage]);
    } else {
      prompt = prompt.replace(/{sourceLanguage}/g, 'the source language');
    }

    // Handle context
    if (prompt.includes('{context}')) {
      const context = this.extractContext(options.context);
      prompt = prompt.replace(/{context}/g, context);
    }

    // Handle contextSection for detailed prompt
    if (prompt.includes('{contextSection}')) {
      const context = this.extractContext(options.context);
      const contextSection = context ? `Context: "${context}"` : '';
      prompt = prompt.replace(/{contextSection}/g, contextSection);
    }

    return prompt;
  }

  private selectPromptTemplate(options: TranslationOptions): string {
    if (options.customPrompt) {
      // If custom prompt is provided, use it as template name or create temporary template
      if (this.customPrompts.has(options.customPrompt)) {
        return options.customPrompt;
      } else {
        // Treat as inline custom prompt
        const validation = this.validateCustomPrompt(options.customPrompt);
        if (!validation.isValid) {
          throw new TranslationError(
            TranslationErrorCode.PROMPT_ERROR,
            `Invalid custom prompt: ${validation.errors.join(', ')}`
          );
        }
        
        this.customPrompts.set('_temp_custom', {
          template: options.customPrompt,
          requiresExamples: true,
          expectsJSON: true
        });
        return '_temp_custom';
      }
    }

    // Select based on options
    if (options.includeExamples) {
      return 'detailed';
    } else {
      return 'basic';
    }
  }

  private extractContext(context?: string): string {
    return context?.trim() || '';
  }

  private async parseTranslationResponse(
    originalText: string,
    response: LLMResponse,
    options: TranslationOptions
  ): Promise<TranslationResult> {
    const promptName = this.selectPromptTemplate(options);
    const promptTemplate = this.customPrompts.get(promptName);

    if (!promptTemplate) {
      throw new TranslationError(
        TranslationErrorCode.PARSING_ERROR,
        'Prompt template not found during parsing'
      );
    }

    try {
      if (promptTemplate.expectsJSON) {
        return this.parseJSONResponse(originalText, response, options);
      } else {
        return this.parseTextResponse(originalText, response, options);
      }
    } catch (error) {
      // Fallback to text parsing if JSON parsing fails
      if (promptTemplate.expectsJSON) {
        console.warn('JSON parsing failed, falling back to text parsing');
        return this.parseTextResponse(originalText, response, options);
      }
      throw error;
    }
  }

  private parseJSONResponse(
    originalText: string,
    response: LLMResponse,
    options: TranslationOptions
  ): TranslationResult {
    try {
      // Extract JSON from response (handle cases where LLM adds extra text)
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response.content;
      
      const parsed = JSON.parse(jsonStr);

      const examples: Example[] = (parsed.examples || []).map((ex: any) => ({
        original: ex.original || '',
        translated: ex.translated || '',
        context: ex.context
      }));

      const sourceLanguage = isLanguageCode(parsed.sourceLanguage)
        ? parsed.sourceLanguage
        : options.sourceLanguage && options.sourceLanguage !== 'auto'
        ? options.sourceLanguage
        : 'en';

      return {
        originalText,
        translatedText: parsed.translation || response.content,
        sourceLanguage,
        targetLanguage: options.targetLanguage,
        examples,
        confidence: parsed.confidence || 0.8,
        timestamp: new Date()
      };
    } catch (error) {
      throw new TranslationError(
        TranslationErrorCode.PARSING_ERROR,
        `Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private parseTextResponse(
    originalText: string,
    response: LLMResponse,
    options: TranslationOptions
  ): TranslationResult {
    // For simple text responses, just use the content as translation
    const translatedText = response.content.trim();

    const sourceLanguage = options.sourceLanguage && options.sourceLanguage !== 'auto' 
      ? options.sourceLanguage 
      : 'en';

    return {
      originalText,
      translatedText,
      sourceLanguage,
      targetLanguage: options.targetLanguage,
      examples: [],
      confidence: 0.8, // Default confidence for text responses
      timestamp: new Date()
    };
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): Record<LanguageCode, string> {
    return { ...LANGUAGE_NAMES };
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

  /**
   * Subscribe to loading state changes
   */
  onLoadingChange(listener: (state: { isLoading: boolean; progress?: number; message?: string; error?: string }) => void): () => void {
    return this.loadingManager.subscribe(listener);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const baseMetrics = this.performanceMonitor.getMetrics();
    const cacheMetrics = this.cachedRequest.getMetrics();
    
    return {
      ...baseMetrics,
      cacheHitRate: cacheMetrics.cacheHitRate,
      errorRate: cacheMetrics.errorRate,
      totalRequests: baseMetrics.requestCount,
      averageResponseTime: baseMetrics.averageResponseTime
    };
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.cachedRequest.clearCache();
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.cachedRequest.resetMetrics();
    this.performanceMonitor.reset();
  }

  /**
   * Preload common translations for better performance
   */
  async preloadCommonTranslations(
    commonPhrases: Array<{ text: string; options: TranslationOptions }>
  ): Promise<void> {
    const preloadPromises = commonPhrases.map(({ text, options }) =>
      this.translate(text, options).catch(error => {
        console.warn(`Failed to preload translation for "${text}":`, error);
      })
    );

    await Promise.allSettled(preloadPromises);
  }
}

/**
 * Translation Service Factory
 */
export class TranslationServiceFactory {
  static create(provider: APIProvider, config: ProviderConfig): TranslationService {
    const llmClient = new LLMClient(provider, config);
    return new TranslationService(llmClient);
  }

  static createFromLLMClient(llmClient: LLMClient): TranslationService {
    return new TranslationService(llmClient);
  }
}
