// Message types for cross-component communication in TransAI Browser Extension

import type {
  TranslationResult,
  TranslationOptions,
  VocabularyItem,
  VocabularyFilter,
  GeneratedContent,
  UserConfig,
  ExportFormat,
  ExtensionStatistics
} from './index.js';

// Base message interface
export interface BaseMessage {
  id: string;
  type: MessageType;
  timestamp: number;
}

// Message types enum
export enum MessageType {
  // Translation messages
  TRANSLATE_TEXT = 'TRANSLATE_TEXT',
  TRANSLATION_RESULT = 'TRANSLATION_RESULT',
  
  // Vocabulary messages
  ADD_TO_VOCABULARY = 'ADD_TO_VOCABULARY',
  CHECK_VOCABULARY = 'CHECK_VOCABULARY',
  GET_VOCABULARY = 'GET_VOCABULARY',
  SEARCH_VOCABULARY = 'SEARCH_VOCABULARY',
  DELETE_VOCABULARY_ITEM = 'DELETE_VOCABULARY_ITEM',
  UPDATE_VOCABULARY_ITEM = 'UPDATE_VOCABULARY_ITEM',
  EXPORT_VOCABULARY = 'EXPORT_VOCABULARY',
  
  // Content generation messages
  GENERATE_SENTENCES = 'GENERATE_SENTENCES',
  GENERATE_ARTICLE = 'GENERATE_ARTICLE',
  CONTENT_GENERATED = 'CONTENT_GENERATED',
  
  // Configuration messages
  GET_CONFIG = 'GET_CONFIG',
  UPDATE_CONFIG = 'UPDATE_CONFIG',
  VALIDATE_API_KEY = 'VALIDATE_API_KEY',
  
  // Audio messages
  PLAY_PRONUNCIATION = 'PLAY_PRONUNCIATION',
  GET_PHONETIC = 'GET_PHONETIC',
  
  // Statistics messages
  GET_STATISTICS = 'GET_STATISTICS',
  UPDATE_STATISTICS = 'UPDATE_STATISTICS',
  
  // Error messages
  ERROR = 'ERROR',
  
  // Response messages
  SUCCESS = 'SUCCESS'
}

// Request message interfaces
export interface TranslateTextMessage extends BaseMessage {
  type: MessageType.TRANSLATE_TEXT;
  payload: {
    text: string;
    options: TranslationOptions;
  };
}

export interface AddToVocabularyMessage extends BaseMessage {
  type: MessageType.ADD_TO_VOCABULARY;
  payload: {
    word: string;
    translation: string;
    context: string;
    sourceUrl: string;
    pronunciation?: string;
  };
}

export interface CheckVocabularyMessage extends BaseMessage {
  type: MessageType.CHECK_VOCABULARY;
  payload: {
    word: string;
  };
}

export interface GetVocabularyMessage extends BaseMessage {
  type: MessageType.GET_VOCABULARY;
  payload: {
    filter?: VocabularyFilter;
    limit?: number;
    offset?: number;
  };
}

export interface SearchVocabularyMessage extends BaseMessage {
  type: MessageType.SEARCH_VOCABULARY;
  payload: {
    query: string;
    limit?: number;
  };
}

export interface DeleteVocabularyItemMessage extends BaseMessage {
  type: MessageType.DELETE_VOCABULARY_ITEM;
  payload: {
    id: string;
  };
}

export interface UpdateVocabularyItemMessage extends BaseMessage {
  type: MessageType.UPDATE_VOCABULARY_ITEM;
  payload: {
    id: string;
    updates: Partial<VocabularyItem>;
  };
}

export interface ExportVocabularyMessage extends BaseMessage {
  type: MessageType.EXPORT_VOCABULARY;
  payload: {
    format: ExportFormat;
    filter?: VocabularyFilter;
  };
}

export interface GenerateSentencesMessage extends BaseMessage {
  type: MessageType.GENERATE_SENTENCES;
  payload: {
    words: string[];
    count: number;
    customPrompt?: string;
  };
}

export interface GenerateArticleMessage extends BaseMessage {
  type: MessageType.GENERATE_ARTICLE;
  payload: {
    words: string[];
    topic?: string;
    customPrompt?: string;
  };
}

export interface GetConfigMessage extends BaseMessage {
  type: MessageType.GET_CONFIG;
  payload?: never;
}

export interface UpdateConfigMessage extends BaseMessage {
  type: MessageType.UPDATE_CONFIG;
  payload: {
    config: Partial<UserConfig>;
  };
}

export interface ValidateApiKeyMessage extends BaseMessage {
  type: MessageType.VALIDATE_API_KEY;
  payload: {
    apiKey: string;
    provider: string;
  };
}

export interface PlayPronunciationMessage extends BaseMessage {
  type: MessageType.PLAY_PRONUNCIATION;
  payload: {
    word: string;
    language: string;
  };
}

export interface GetPhoneticMessage extends BaseMessage {
  type: MessageType.GET_PHONETIC;
  payload: {
    word: string;
    language: string;
  };
}

export interface GetStatisticsMessage extends BaseMessage {
  type: MessageType.GET_STATISTICS;
  payload?: never;
}

export interface UpdateStatisticsMessage extends BaseMessage {
  type: MessageType.UPDATE_STATISTICS;
  payload: {
    statistics: Partial<ExtensionStatistics>;
  };
}

// Response message interfaces
export interface TranslationResultMessage extends BaseMessage {
  type: MessageType.TRANSLATION_RESULT;
  payload: {
    result: TranslationResult;
  };
}

export interface ContentGeneratedMessage extends BaseMessage {
  type: MessageType.CONTENT_GENERATED;
  payload: {
    content: GeneratedContent;
  };
}

export interface SuccessMessage extends BaseMessage {
  type: MessageType.SUCCESS;
  payload: {
    data?: any;
    message?: string;
  };
}

export interface ErrorMessage extends BaseMessage {
  type: MessageType.ERROR;
  payload: {
    error: string;
    code?: string;
    details?: any;
  };
}

// Union type for all request messages
export type RequestMessage = 
  | TranslateTextMessage
  | AddToVocabularyMessage
  | CheckVocabularyMessage
  | GetVocabularyMessage
  | SearchVocabularyMessage
  | DeleteVocabularyItemMessage
  | UpdateVocabularyItemMessage
  | ExportVocabularyMessage
  | GenerateSentencesMessage
  | GenerateArticleMessage
  | GetConfigMessage
  | UpdateConfigMessage
  | ValidateApiKeyMessage
  | PlayPronunciationMessage
  | GetPhoneticMessage
  | GetStatisticsMessage
  | UpdateStatisticsMessage;

// Union type for all response messages
export type ResponseMessage = 
  | TranslationResultMessage
  | ContentGeneratedMessage
  | SuccessMessage
  | ErrorMessage;

// Union type for all messages
export type Message = RequestMessage | ResponseMessage;

// Message handler function type
export type MessageHandler<T extends RequestMessage = RequestMessage> = (
  message: T,
  sender?: chrome.runtime.MessageSender
) => Promise<ResponseMessage>;

// Message router configuration
export interface MessageRouterConfig {
  enableLogging?: boolean;
  timeout?: number;
  maxRetries?: number;
}