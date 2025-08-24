/**
 * Services module exports
 */

// Storage services
export { StorageManager, storageManager, StorageError, StorageErrorCode, STORAGE_KEYS } from './storage.js';

// Vocabulary services
export { 
  VocabularyStore, 
  vocabularyStore,
  type VocabularyOperationResult,
  type VocabularySearchResult,
  type VocabularySortField,
  type VocabularySortOrder,
  type VocabularySortOptions,
  type VocabularyPaginationOptions
} from './vocabulary.js';

// LLM services
export {
  LLMClient,
  LLMClientFactory,
  LLMError,
  LLMErrorCode,
  type ILLMClient,
  type LLMRequest,
  type LLMResponse,
  type ProviderConfig,
  type OpenAIConfig,
  type AnthropicConfig,
  type CustomConfig
} from './llm.js';

// Translation services
export {
  TranslationService,
  TranslationServiceFactory,
  TranslationError,
  TranslationErrorCode,
  DEFAULT_TRANSLATION_PROMPTS,
  type CustomPromptValidation,
  type PromptTemplate
} from './translation.js';

// Content generation services
export {
  ContentGenerationService,
  ContentGenerationServiceFactory,
  ContentGenerationError,
  ContentGenerationErrorCode,
  DEFAULT_CONTENT_PROMPTS,
  type SentenceGenerationOptions,
  type ArticleGenerationOptions,
  type GeneratedContentWithHighlights
} from './content-generation.js';

// Audio services
export {
  TTSService,
  AudioServiceFactory,
  AudioError,
  AudioErrorCode,
  audioService
} from './audio.js';