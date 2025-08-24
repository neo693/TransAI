// Data validation functions for TransAI Browser Extension

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
  CustomPrompts,
  APIProvider,
  LanguageCode,
  ExportFormat,
  ContentType,
  Theme,
  OverlayPosition
} from '../types';

// Utility function to check if a value is a valid date
export function isValidDate(date: any): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

// Utility function to check if a string is not empty
export function isNonEmptyString(value: any): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

// Utility function to check if a number is within range
export function isNumberInRange(value: any, min: number, max: number): value is number {
  return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
}

// Validate API Provider
export function isValidAPIProvider(value: any): value is APIProvider {
  return typeof value === 'string' && ['openai', 'anthropic', 'custom'].includes(value);
}

// Validate Language Code
export function isValidLanguageCode(value: any): value is LanguageCode {
  const validCodes = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar'];
  return typeof value === 'string' && validCodes.includes(value);
}

// Validate Export Format
export function isValidExportFormat(value: any): value is ExportFormat {
  return typeof value === 'string' && ['csv', 'json', 'txt'].includes(value);
}

// Validate Content Type
export function isValidContentType(value: any): value is ContentType {
  return typeof value === 'string' && ['sentence', 'article'].includes(value);
}

// Validate Theme
export function isValidTheme(value: any): value is Theme {
  return typeof value === 'string' && ['light', 'dark', 'auto'].includes(value);
}

// Validate Overlay Position
export function isValidOverlayPosition(value: any): value is OverlayPosition {
  return typeof value === 'string' && ['auto', 'top', 'bottom'].includes(value);
}

// Validate Example interface
export function validateExample(example: any): example is Example {
  if (!example || typeof example !== 'object') return false;
  
  return (
    isNonEmptyString(example.original) &&
    isNonEmptyString(example.translated) &&
    (example.context === undefined || typeof example.context === 'string')
  );
}

// Validate TranslationResult interface
export function validateTranslationResult(result: any): result is TranslationResult {
  if (!result || typeof result !== 'object') return false;
  
  return (
    isNonEmptyString(result.originalText) &&
    isNonEmptyString(result.translatedText) &&
    isNonEmptyString(result.sourceLanguage) &&
    isNonEmptyString(result.targetLanguage) &&
    Array.isArray(result.examples) &&
    result.examples.every(validateExample) &&
    isNumberInRange(result.confidence, 0, 1) &&
    isValidDate(result.timestamp)
  );
}

// Validate VocabularyItem interface
export function validateVocabularyItem(item: any): item is VocabularyItem {
  if (!item || typeof item !== 'object') return false;
  
  return (
    isNonEmptyString(item.id) &&
    isNonEmptyString(item.word) &&
    isNonEmptyString(item.translation) &&
    isNonEmptyString(item.context) &&
    isNonEmptyString(item.sourceUrl) &&
    isValidDate(item.dateAdded) &&
    typeof item.reviewCount === 'number' &&
    item.reviewCount >= 0 &&
    (item.pronunciation === undefined || typeof item.pronunciation === 'string')
  );
}

// Validate UIPreferences interface
export function validateUIPreferences(prefs: any): prefs is UIPreferences {
  if (!prefs || typeof prefs !== 'object') return false;
  
  return (
    isValidTheme(prefs.theme) &&
    isValidOverlayPosition(prefs.overlayPosition) &&
    typeof prefs.autoPlayPronunciation === 'boolean'
  );
}

// Validate CustomPrompts interface
export function validateCustomPrompts(prompts: any): prompts is CustomPrompts {
  if (!prompts || typeof prompts !== 'object') return false;
  
  return (
    isNonEmptyString(prompts.translation) &&
    isNonEmptyString(prompts.sentenceGeneration) &&
    isNonEmptyString(prompts.articleGeneration)
  );
}

// Validate UserConfig interface
export function validateUserConfig(config: any): config is UserConfig {
  if (!config || typeof config !== 'object') return false;
  
  return (
    isNonEmptyString(config.apiKey) &&
    isValidAPIProvider(config.apiProvider) &&
    isValidLanguageCode(config.defaultTargetLanguage) &&
    validateCustomPrompts(config.customPrompts) &&
    validateUIPreferences(config.uiPreferences)
  );
}

// Validate GeneratedContent interface
export function validateGeneratedContent(content: any): content is GeneratedContent {
  if (!content || typeof content !== 'object') return false;
  
  return (
    isValidContentType(content.type) &&
    isNonEmptyString(content.content) &&
    Array.isArray(content.usedWords) &&
    content.usedWords.every((word: any) => typeof word === 'string') &&
    isValidDate(content.generatedAt)
  );
}

// Validate TextSelection interface
export function validateTextSelection(selection: any): selection is TextSelection {
  if (!selection || typeof selection !== 'object') return false;
  
  return (
    isNonEmptyString(selection.text) &&
    selection.position &&
    typeof selection.position === 'object' &&
    typeof selection.position.x === 'number' &&
    typeof selection.position.y === 'number' &&
    isNonEmptyString(selection.context) &&
    isNonEmptyString(selection.url)
  );
}

// Validate TranslationOptions interface
export function validateTranslationOptions(options: any): options is TranslationOptions {
  if (!options || typeof options !== 'object') return false;
  
  return (
    (options.sourceLanguage === undefined || isValidLanguageCode(options.sourceLanguage)) &&
    isValidLanguageCode(options.targetLanguage) &&
    typeof options.includeExamples === 'boolean' &&
    (options.customPrompt === undefined || typeof options.customPrompt === 'string')
  );
}

// Validate VocabularyFilter interface
export function validateVocabularyFilter(filter: any): filter is VocabularyFilter {
  if (!filter || typeof filter !== 'object') return false;
  
  const dateRangeValid = !filter.dateRange || (
    filter.dateRange &&
    typeof filter.dateRange === 'object' &&
    isValidDate(filter.dateRange.start) &&
    isValidDate(filter.dateRange.end)
  );
  
  return (
    (filter.searchQuery === undefined || typeof filter.searchQuery === 'string') &&
    dateRangeValid &&
    (filter.reviewCountMin === undefined || (typeof filter.reviewCountMin === 'number' && filter.reviewCountMin >= 0)) &&
    (filter.sourceUrl === undefined || typeof filter.sourceUrl === 'string')
  );
}

// Validate ExtensionStatistics interface
export function validateExtensionStatistics(stats: any): stats is ExtensionStatistics {
  if (!stats || typeof stats !== 'object') return false;
  
  return (
    typeof stats.translationsCount === 'number' &&
    stats.translationsCount >= 0 &&
    typeof stats.wordsLearned === 'number' &&
    stats.wordsLearned >= 0 &&
    isValidDate(stats.lastUsed)
  );
}

// Validation error class
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Comprehensive validation with detailed error messages
export function validateWithError<T>(
  data: any,
  validator: (data: any) => data is T,
  typeName: string
): T {
  if (!validator(data)) {
    throw new ValidationError(`Invalid ${typeName} data structure`);
  }
  return data;
}