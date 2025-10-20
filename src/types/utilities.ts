// Utility types and enums for TransAI Browser Extension

import { VocabularyItem, TranslationResult, UserConfig } from './index';

// Utility type to make all properties optional
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

// Utility type to make all properties required
export type Required<T> = {
  [P in keyof T]-?: T[P];
};

// Utility type to pick specific properties
export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Utility type to omit specific properties
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// Create vocabulary item without auto-generated fields
export type CreateVocabularyItem = Omit<VocabularyItem, 'id' | 'dateAdded' | 'reviewCount'>;

// Update vocabulary item (all fields optional except id)
export type UpdateVocabularyItem = Pick<VocabularyItem, 'id'> & Partial<Omit<VocabularyItem, 'id'>>;

// Vocabulary item for display (with computed fields)
export type VocabularyItemDisplay = VocabularyItem & {
  daysSinceAdded: number;
  isRecent: boolean;
};

// Translation request without timestamp
export type CreateTranslationResult = Omit<TranslationResult, 'timestamp'>;

// User config update (all fields optional)
export type UpdateUserConfig = Partial<UserConfig>;

// Default configuration values
export const DEFAULT_CONFIG: Required<UserConfig> = {
  apiKey: '',
  apiProvider: 'openai',
  apiBaseUrl: '',
  selectedModel: '',
  defaultTargetLanguage: 'en',
  customPrompts: {
    translation: 'Translate the following text to {targetLanguage}. Provide the translation and 2-3 example sentences using the translated word or phrase in context.',
    sentenceGeneration: 'Generate {count} example sentences using these vocabulary words: {words}. Make the sentences natural and contextually appropriate.',
    articleGeneration: 'Write a short article (200-300 words) about {topic} that naturally incorporates these vocabulary words: {words}. Highlight the vocabulary words in the text.'
  },
  uiPreferences: {
    theme: 'auto',
    overlayPosition: 'auto',
    overlayTriggerMode: 'auto',
    autoPlayPronunciation: false
  }
};

// Storage keys for browser extension storage
export enum StorageKeys {
  VOCABULARY = 'vocabulary',
  CONFIG = 'config',
  CACHE_TRANSLATIONS = 'cache_translations',
  CACHE_AUDIO = 'cache_audio',
  STATISTICS = 'statistics'
}

// Error types for better error handling
export enum ErrorType {
  VALIDATION_ERROR = 'validation_error',
  API_ERROR = 'api_error',
  STORAGE_ERROR = 'storage_error',
  NETWORK_ERROR = 'network_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// API response status
export enum APIStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  PENDING = 'pending'
}

// Content generation parameters
export interface ContentGenerationParams {
  words: string[];
  type: 'sentence' | 'article';
  count?: number; // For sentences
  topic?: string; // For articles
}

// Export options
export interface ExportOptions {
  format: 'csv' | 'json' | 'txt';
  includeContext: boolean;
  includePronunciation: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Search and filter utilities
export interface SearchOptions {
  query: string;
  caseSensitive: boolean;
  exactMatch: boolean;
  searchFields: ('word' | 'translation' | 'context')[];
}

// Sorting options for vocabulary
export interface SortOptions {
  field: keyof VocabularyItem;
  direction: 'asc' | 'desc';
}

// Pagination options
export interface PaginationOptions {
  page: number;
  limit: number;
}

// Result with pagination info
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Cache configuration
export interface CacheConfig {
  maxTranslations: number;
  maxAudioFiles: number;
  ttlHours: number;
}

// Default cache configuration
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxTranslations: 1000,
  maxAudioFiles: 500,
  ttlHours: 24
};

// Language configuration
export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  ttsSupported: boolean;
}

// Supported languages with configuration
export const SUPPORTED_LANGUAGES: Record<string, LanguageConfig> = {
  en: { code: 'en', name: 'English', nativeName: 'English', rtl: false, ttsSupported: true },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false, ttsSupported: true },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', rtl: false, ttsSupported: true },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false, ttsSupported: true },
  it: { code: 'it', name: 'Italian', nativeName: 'Italiano', rtl: false, ttsSupported: true },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português', rtl: false, ttsSupported: true },
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский', rtl: false, ttsSupported: true },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', rtl: false, ttsSupported: true },
  ko: { code: 'ko', name: 'Korean', nativeName: '한국어', rtl: false, ttsSupported: true },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文', rtl: false, ttsSupported: true },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true, ttsSupported: true }
};

export const LANGUAGE_CODES = Object.keys(SUPPORTED_LANGUAGES) as (keyof typeof SUPPORTED_LANGUAGES)[];

export function isLanguageCode(code: any): code is keyof typeof SUPPORTED_LANGUAGES {
  return typeof code === 'string' && LANGUAGE_CODES.includes(code as any);
}

// Type guards for runtime type checking
export function isCreateVocabularyItem(obj: any): obj is CreateVocabularyItem {
  return !!(
    obj &&
    typeof obj === 'object' &&
    typeof obj.word === 'string' &&
    obj.word.trim().length > 0 &&
    typeof obj.translation === 'string' &&
    obj.translation.trim().length > 0 &&
    typeof obj.context === 'string' &&
    obj.context.trim().length > 0 &&
    typeof obj.sourceUrl === 'string' &&
    obj.sourceUrl.trim().length > 0
  );
}

export function isUpdateVocabularyItem(obj: any): obj is UpdateVocabularyItem {
  return !!(
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    obj.id.trim().length > 0
  );
}

export function isContentGenerationParams(obj: any): obj is ContentGenerationParams {
  return !!(
    obj &&
    typeof obj === 'object' &&
    Array.isArray(obj.words) &&
    obj.words.length > 0 &&
    obj.words.every((word: any) => typeof word === 'string') &&
    typeof obj.type === 'string' &&
    ['sentence', 'article'].includes(obj.type)
  );
}