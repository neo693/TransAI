// Core data models and interfaces for TransAI Browser Extension

// API Provider types
export type APIProvider = 'openai' | 'anthropic' | 'custom';

// Language codes (ISO 639-1)
export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'ja' | 'ko' | 'zh' | 'ar';

// Export formats for vocabulary
export type ExportFormat = 'csv' | 'json' | 'txt';

// Content generation types
export type ContentType = 'sentence' | 'article';

// UI Theme options
export type Theme = 'light' | 'dark' | 'auto';

// Overlay position options
export type OverlayPosition = 'auto' | 'top' | 'bottom';

// Translation confidence levels
export enum ConfidenceLevel {
  LOW = 0.3,
  MEDIUM = 0.6,
  HIGH = 0.8,
  VERY_HIGH = 0.9
}

// Example sentence with translation
export interface Example {
  original: string;
  translated: string;
  context?: string;
}

// Translation result from LLM
export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  examples: Example[];
  confidence: number;
  timestamp: Date;
}

// Vocabulary item stored in extension
export interface VocabularyItem {
  id: string;
  word: string;
  translation: string;
  context: string;
  sourceUrl: string;
  dateAdded: Date;
  reviewCount: number;
  pronunciation?: string;
}

// User interface preferences
export interface UIPreferences {
  theme: Theme;
  overlayPosition: OverlayPosition;
  autoPlayPronunciation: boolean;
}

// Custom prompts for different operations
export interface CustomPrompts {
  translation: string;
  sentenceGeneration: string;
  articleGeneration: string;
}

// Complete user configuration
export interface UserConfig {
  apiKey: string;
  apiProvider: APIProvider;
  defaultTargetLanguage: LanguageCode;
  customPrompts: CustomPrompts;
  uiPreferences: UIPreferences;
}

// Generated content from LLM
export interface GeneratedContent {
  type: ContentType;
  content: string;
  usedWords: string[];
  generatedAt: Date;
}

// Text selection data from content script
export interface TextSelection {
  text: string;
  position: { x: number; y: number };
  context: string;
  url: string;
}

// Translation request options
export interface TranslationOptions {
  sourceLanguage?: LanguageCode;
  targetLanguage: LanguageCode;
  includeExamples: boolean;
  customPrompt?: string;
  cacheTime?: number;
  promptType?: string;
  context?: string;
}

// Vocabulary filter options
export interface VocabularyFilter {
  searchQuery?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  reviewCountMin?: number;
  sourceUrl?: string;
}

// Extension statistics
export interface ExtensionStatistics {
  translationsCount: number;
  wordsLearned: number;
  lastUsed: Date;
}

// Complete extension storage structure
export interface ExtensionStorage {
  vocabulary: VocabularyItem[];
  config: UserConfig;
  cache: {
    translations: Record<string, TranslationResult>;
    audio: Record<string, ArrayBuffer>;
  };
  statistics: ExtensionStatistics;
}

// Re-export message types
export * from './messages.js';

// Re-export utilities
export { DEFAULT_CONFIG, isCreateVocabularyItem } from './utilities';
export type { CreateVocabularyItem } from './utilities';