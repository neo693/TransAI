// Background service integration for TransAI Browser Extension

import { messageRouter } from './message-router';
import {
  storageManager,
  vocabularyStore,
  TranslationServiceFactory,
  ContentGenerationServiceFactory,
  LLMClientFactory,
  audioService
} from '../services/index';
import {
  MessageType,
  type ResponseMessage,
  type PingMessage,
  type TranslateTextMessage,
  type AddToVocabularyMessage,
  type CheckVocabularyMessage,
  type GetVocabularyMessage,
  type SearchVocabularyMessage,
  type DeleteVocabularyItemMessage,
  type UpdateVocabularyItemMessage,
  type ExportVocabularyMessage,
  type GenerateSentencesMessage,
  type GenerateArticleMessage,
  type GetConfigMessage,
  type UpdateConfigMessage,
  type ValidateApiKeyMessage,
  type GetStatisticsMessage,
  type UpdateStatisticsMessage,
  type PlayPronunciationMessage,
  type UserConfig,
  type ExtensionStatistics
} from '../types/index';

/**
 * Error class for background service errors
 */
export class BackgroundServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BackgroundServiceError';
  }
}

/**
 * Main background service that integrates all extension services
 */
export class BackgroundService {
  private translationService: any = null;
  private contentGenerationService: any = null;
  private llmClient: any = null;
  private isInitialized = false;
  private config: UserConfig | null = null;

  constructor() {
    this.setupMessageHandlers();
    this.setupStorageListener();
  }

  /**
   * Initialize the background service
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing background service...');

      // Setup context menu
      this.setupContextMenu();

      // Load configuration
      await this.loadConfiguration();

      // Initialize services if config is available
      if (this.config?.apiKey) {
        await this.initializeServices();
      }

      // Initialize default statistics if not exists
      await this.initializeStatistics();

      this.isInitialized = true;
      console.log('Background service initialized successfully');

    } catch (error) {
      console.error('Failed to initialize background service:', error);
      throw new BackgroundServiceError(
        'Failed to initialize background service',
        'INITIALIZATION_ERROR',
        error
      );
    }
  }

  /**
   * Load user configuration from storage
   */
  private async loadConfiguration(): Promise<void> {
    try {
      this.config = await storageManager.getConfig();
      console.log('Configuration loaded:', {
        hasConfig: !!this.config,
        hasApiKey: !!this.config?.apiKey,
        provider: this.config?.apiProvider,
        apiKeyLength: this.config?.apiKey?.length || 0
      });
    } catch (error) {
      console.warn('Failed to load configuration:', error);
      // Only throw if it's a critical error, otherwise continue with null config
      if (error instanceof Error && 'code' in error && error.code === 'CRITICAL_ERROR') {
        throw error;
      }
      this.config = null;
    }
  }

  /**
   * Initialize services with current configuration
   */
  private async initializeServices(): Promise<void> {
    if (!this.config?.apiKey) {
      console.log('No API key configured, skipping service initialization');
      return;
    }

    try {
      // Initialize LLM client with full configuration
      const llmConfig = {
        apiKey: this.config.apiKey,
        baseUrl: this.config.apiBaseUrl,
        model: this.config.selectedModel
      };

      this.llmClient = LLMClientFactory.create(this.config.apiProvider, llmConfig);

      // Initialize translation service
      this.translationService = TranslationServiceFactory.createFromLLMClient(this.llmClient);

      // Initialize content generation service
      this.contentGenerationService = ContentGenerationServiceFactory.createFromLLMClient(this.llmClient);

      console.log('Services initialized successfully with provider:', this.config.apiProvider);
    } catch (error) {
      console.error('Failed to initialize services:', error);
      throw new BackgroundServiceError(
        'Failed to initialize services',
        'SERVICE_INITIALIZATION_ERROR',
        error
      );
    }
  }

  /**
   * Initialize default statistics
   */
  private async initializeStatistics(): Promise<void> {
    try {
      const stats = await storageManager.getStatistics();
      if (!stats) {
        const defaultStats: ExtensionStatistics = {
          translationsCount: 0,
          wordsLearned: 0,
          lastUsed: new Date()
        };
        await storageManager.saveStatistics(defaultStats);
        console.log('Default statistics initialized');
      }
    } catch (error) {
      console.warn('Failed to initialize statistics:', error);
    }
  }

  /**
   * Setup message handlers for all message types
   */
  private setupMessageHandlers(): void {
    // System handlers
    messageRouter.registerHandler(MessageType.PING, this.handlePing.bind(this));
    
    // Translation handlers
    messageRouter.registerHandler(MessageType.TRANSLATE_TEXT, this.handleTranslateText.bind(this));

    // Vocabulary handlers
    messageRouter.registerHandler(MessageType.ADD_TO_VOCABULARY, this.handleAddToVocabulary.bind(this));
    messageRouter.registerHandler(MessageType.CHECK_VOCABULARY, this.handleCheckVocabulary.bind(this));
    messageRouter.registerHandler(MessageType.GET_VOCABULARY, this.handleGetVocabulary.bind(this));
    messageRouter.registerHandler(MessageType.SEARCH_VOCABULARY, this.handleSearchVocabulary.bind(this));
    messageRouter.registerHandler(MessageType.DELETE_VOCABULARY_ITEM, this.handleDeleteVocabularyItem.bind(this));
    messageRouter.registerHandler(MessageType.UPDATE_VOCABULARY_ITEM, this.handleUpdateVocabularyItem.bind(this));
    messageRouter.registerHandler(MessageType.EXPORT_VOCABULARY, this.handleExportVocabulary.bind(this));

    // Content generation handlers
    messageRouter.registerHandler(MessageType.GENERATE_SENTENCES, this.handleGenerateSentences.bind(this));
    messageRouter.registerHandler(MessageType.GENERATE_ARTICLE, this.handleGenerateArticle.bind(this));

    // Configuration handlers
    messageRouter.registerHandler(MessageType.GET_CONFIG, this.handleGetConfig.bind(this));
    messageRouter.registerHandler(MessageType.UPDATE_CONFIG, this.handleUpdateConfig.bind(this));
    messageRouter.registerHandler(MessageType.VALIDATE_API_KEY, this.handleValidateApiKey.bind(this));

    // Statistics handlers
    messageRouter.registerHandler(MessageType.GET_STATISTICS, this.handleGetStatistics.bind(this));
    messageRouter.registerHandler(MessageType.UPDATE_STATISTICS, this.handleUpdateStatistics.bind(this));

    // Audio handlers
    messageRouter.registerHandler(MessageType.PLAY_PRONUNCIATION, this.handlePlayPronunciation.bind(this));

    console.log('Message handlers registered');
  }

  /**
   * Setup storage change listener to reinitialize services when config changes
   */
  private setupStorageListener(): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.config) {
        console.log('Configuration changed, reinitializing services...', {
          oldValue: changes.config.oldValue,
          newValue: changes.config.newValue
        });
        
        this.loadConfiguration().then(() => {
          if (this.config?.apiKey) {
            console.log('Reinitializing services with new config...');
            this.initializeServices().then(() => {
              console.log('Services reinitialized successfully');
            }).catch(error => {
              console.error('Failed to reinitialize services after config change:', error);
            });
          } else {
            console.log('No API key in new config, clearing services');
            this.translationService = null;
            this.contentGenerationService = null;
            this.llmClient = null;
          }
        }).catch(error => {
          console.error('Failed to reload configuration after change:', error);
        });
      }
    });
  }

  /**
   * Setup context menu for text selection
   */
  private setupContextMenu(): void {
    try {
      // Remove existing menu items first to avoid duplicates
      chrome.contextMenus.removeAll(() => {
        // Create the context menu item
        chrome.contextMenus.create({
          id: 'transai-translate',
          title: 'trans ai',
          contexts: ['selection']
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Failed to create context menu:', chrome.runtime.lastError);
          } else {
            console.log('Context menu created successfully');
          }
        });
      });

      // Setup click listener
      chrome.contextMenus.onClicked.addListener((info, tab) => {
        console.log('Context menu clicked:', { menuItemId: info.menuItemId, tabId: tab?.id, selectionText: info.selectionText });
        
        if (info.menuItemId === 'transai-translate' && tab?.id && info.selectionText) {
          const message = {
            id: `show_translation_${Date.now()}`,
            type: MessageType.SHOW_TRANSLATION_OVERLAY,
            timestamp: Date.now(),
            payload: {
              text: info.selectionText
            }
          };
          
          console.log('Sending message to content script:', message);
          
          // Use Promise-based API to handle errors properly
          chrome.tabs.sendMessage(tab.id, message)
            .then((response) => {
              console.log('Message sent successfully, response:', response);
            })
            .catch((error) => {
              // This is expected if content script is not loaded on the page
              console.warn('Could not send message to content script:', error.message || error);
              // Optionally, you could inject the content script here if needed
            });
        }
      });
    } catch (error) {
      console.error('Error setting up context menu:', error);
    }
  }

  /**
   * Handle ping requests from content scripts
   */
  private async handlePing(message: PingMessage): Promise<ResponseMessage> {
    return {
      id: message.id,
      type: MessageType.PONG,
      timestamp: Date.now(),
      payload: {
        success: true
      }
    };
  }

  /**
   * Handle text translation requests
   */
  private async handleTranslateText(message: TranslateTextMessage): Promise<ResponseMessage> {
    try {
      // Always reload configuration before translation to ensure we have the latest config
      await this.loadConfiguration();
      
      // Check if configuration exists and has API key
      if (!this.config?.apiKey) {
        throw new BackgroundServiceError(
          'API key not configured. Please configure your API key in the extension settings.',
          'API_KEY_NOT_CONFIGURED'
        );
      }

      // Reinitialize services if they don't exist or if config has changed
      if (!this.translationService || !this.translationService.isConfigured()) {
        await this.initializeServices();
        
        if (!this.translationService) {
          throw new BackgroundServiceError(
            'Translation service not initialized. Please check your API key configuration.',
            'SERVICE_NOT_INITIALIZED'
          );
        }
      }

      const result = await this.translationService.translate(
        message.payload.text,
        message.payload.options
      );

      // Update statistics
      await this.incrementTranslationCount();

      return {
        id: message.id,
        type: MessageType.TRANSLATION_RESULT,
        timestamp: Date.now(),
        payload: { result }
      };

    } catch (error) {
      return this.createErrorResponse(message.id, error);
    }
  }

  /**
   * Handle add to vocabulary requests
   */
  private async handleAddToVocabulary(message: AddToVocabularyMessage): Promise<ResponseMessage> {
    try {
      // Check if word already exists
      const existingWords = await vocabularyStore.searchWords(message.payload.word);
      const wordExists = existingWords.items.length > 0 && 
        existingWords.items[0].word.toLowerCase() === message.payload.word.toLowerCase();

      if (wordExists) {
        return {
          id: message.id,
          type: MessageType.ERROR,
          timestamp: Date.now(),
          payload: {
            error: 'Word already exists in vocabulary',
            code: 'WORD_EXISTS'
          }
        };
      }

      const result = await vocabularyStore.addWord(
        message.payload.word,
        message.payload.translation,
        message.payload.context,
        message.payload.sourceUrl,
        message.payload.pronunciation,
        message.payload.sourceLanguage,
        message.payload.targetLanguage
      );

      // Update statistics
      await this.incrementWordsLearned();

      return messageRouter.createSuccessResponse(message.id, result);

    } catch (error) {
      return this.createErrorResponse(message.id, error);
    }
  }

  /**
   * Handle check vocabulary requests
   */
  private async handleCheckVocabulary(message: CheckVocabularyMessage): Promise<ResponseMessage> {
    try {
      const result = await vocabularyStore.searchWords(message.payload.word);
      const exists = result.items.length > 0 && result.items[0].word.toLowerCase() === message.payload.word.toLowerCase();

      return messageRouter.createSuccessResponse(message.id, { 
        exists,
        word: message.payload.word
      });

    } catch (error) {
      return this.createErrorResponse(message.id, error);
    }
  }

  /**
   * Handle get vocabulary requests
   */
  private async handleGetVocabulary(message: GetVocabularyMessage): Promise<ResponseMessage> {
    try {
      const result = await vocabularyStore.getWords(
        message.payload.filter,
        undefined, // sort options
        {
          page: 1,
          limit: message.payload.limit || 50
        }
      );

      return messageRouter.createSuccessResponse(message.id, result);

    } catch (error) {
      return this.createErrorResponse(message.id, error);
    }
  }

  /**
   * Handle search vocabulary requests
   */
  private async handleSearchVocabulary(message: SearchVocabularyMessage): Promise<ResponseMessage> {
    try {
      const result = await vocabularyStore.searchWords(
        message.payload.query,
        undefined, // sort options
        {
          page: 1,
          limit: message.payload.limit || 50
        }
      );

      return messageRouter.createSuccessResponse(message.id, result);

    } catch (error) {
      return this.createErrorResponse(message.id, error);
    }
  }

  /**
   * Handle delete vocabulary item requests
   */
  private async handleDeleteVocabularyItem(message: DeleteVocabularyItemMessage): Promise<ResponseMessage> {
    try {
      const result = await vocabularyStore.deleteWord(message.payload.id);
      return messageRouter.createSuccessResponse(message.id, result);

    } catch (error) {
      return this.createErrorResponse(message.id, error);
    }
  }

  /**
   * Handle update vocabulary item requests
   */
  private async handleUpdateVocabularyItem(message: UpdateVocabularyItemMessage): Promise<ResponseMessage> {
    try {
      const result = await vocabularyStore.updateWord(
        message.payload.id,
        message.payload.updates
      );

      return messageRouter.createSuccessResponse(message.id, result);

    } catch (error) {
      return this.createErrorResponse(message.id, error);
    }
  }

  /**
   * Handle export vocabulary requests
   */
  private async handleExportVocabulary(message: ExportVocabularyMessage): Promise<ResponseMessage> {
    try {
      const result = await vocabularyStore.exportWords(
        message.payload.format,
        message.payload.filter
      );

      return messageRouter.createSuccessResponse(message.id, result);

    } catch (error) {
      return this.createErrorResponse(message.id, error);
    }
  }

  /**
   * Handle generate sentences requests
   */
  private async handleGenerateSentences(message: GenerateSentencesMessage): Promise<ResponseMessage> {
    try {
      if (!this.contentGenerationService) {
        throw new BackgroundServiceError(
          'Content generation service not initialized. Please configure API key.',
          'SERVICE_NOT_INITIALIZED'
        );
      }

      // Use source language from message (vocabulary word language), default to 'en'
      const targetLanguage = message.payload.sourceLanguage || 'en';

      const result = await this.contentGenerationService.generateSentences(
        message.payload.words,
        {
          count: message.payload.count,
          customPrompt: message.payload.customPrompt,
          targetLanguage: targetLanguage,
          includeTranslation: true  // Always include translation
        }
      );

      return {
        id: message.id,
        type: MessageType.CONTENT_GENERATED,
        timestamp: Date.now(),
        payload: { content: result }
      };

    } catch (error) {
      return this.createErrorResponse(message.id, error);
    }
  }

  /**
   * Handle generate article requests
   */
  private async handleGenerateArticle(message: GenerateArticleMessage): Promise<ResponseMessage> {
    try {
      if (!this.contentGenerationService) {
        throw new BackgroundServiceError(
          'Content generation service not initialized. Please configure API key.',
          'SERVICE_NOT_INITIALIZED'
        );
      }

      // Use source language from message (vocabulary word language), default to 'en'
      const targetLanguage = message.payload.sourceLanguage || 'en';

      const result = await this.contentGenerationService.generateArticle(
        message.payload.words,
        {
          topic: message.payload.topic,
          customPrompt: message.payload.customPrompt,
          targetLanguage: targetLanguage,
          includeTranslation: true  // Always include translation
        }
      );

      return {
        id: message.id,
        type: MessageType.CONTENT_GENERATED,
        timestamp: Date.now(),
        payload: { content: result }
      };

    } catch (error) {
      return this.createErrorResponse(message.id, error);
    }
  }

  /**
   * Handle get configuration requests
   */
  private async handleGetConfig(message: GetConfigMessage): Promise<ResponseMessage> {
    try {
      const config = await storageManager.getConfig();
      return messageRouter.createSuccessResponse(message.id, config);

    } catch (error) {
      return this.createErrorResponse(message.id, error);
    }
  }

  /**
   * Handle update configuration requests
   */
  private async handleUpdateConfig(message: UpdateConfigMessage): Promise<ResponseMessage> {
    try {
      console.log('Updating configuration:', message.payload.config);
      
      // Update configuration
      const updatedConfig = await storageManager.updateConfig(message.payload.config);
      this.config = updatedConfig;

      console.log('Configuration updated, new config:', {
        hasApiKey: !!updatedConfig.apiKey,
        provider: updatedConfig.apiProvider,
        apiKeyLength: updatedConfig.apiKey?.length || 0
      });

      // Always reinitialize services when config is updated
      if (updatedConfig.apiKey) {
        console.log('Reinitializing services with updated config...');
        await this.initializeServices();
        console.log('Services reinitialized successfully');
      } else {
        console.log('No API key in updated config, clearing services');
        this.translationService = null;
        this.contentGenerationService = null;
        this.llmClient = null;
      }

      return messageRouter.createSuccessResponse(message.id, updatedConfig);

    } catch (error) {
      console.error('Failed to update configuration:', error);
      return this.createErrorResponse(message.id, error);
    }
  }

  /**
   * Handle validate API key requests
   */
  private async handleValidateApiKey(message: ValidateApiKeyMessage): Promise<ResponseMessage> {
    try {
      // Create temporary LLM client for validation
      const tempClient = LLMClientFactory.create(message.payload.provider as any, {
        apiKey: message.payload.apiKey
      });

      // Test the API key with a simple request
      const isValid = await tempClient.validateApiKey();

      return messageRouter.createSuccessResponse(message.id, { isValid });

    } catch (error) {
      return {
        id: message.id,
        type: MessageType.SUCCESS,
        timestamp: Date.now(),
        payload: {
          data: { 
            isValid: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      };
    }
  }

  /**
   * Handle get statistics requests
   */
  private async handleGetStatistics(message: GetStatisticsMessage): Promise<ResponseMessage> {
    try {
      const statistics = await storageManager.getStatistics();
      return messageRouter.createSuccessResponse(message.id, statistics);

    } catch (error) {
      return this.createErrorResponse(message.id, error);
    }
  }

  /**
   * Handle update statistics requests
   */
  private async handleUpdateStatistics(message: UpdateStatisticsMessage): Promise<ResponseMessage> {
    try {
      const updatedStats = await storageManager.updateStatistics(message.payload.statistics);
      return messageRouter.createSuccessResponse(message.id, updatedStats);

    } catch (error) {
      return this.createErrorResponse(message.id, error);
    }
  }

  /**
   * Handle play pronunciation requests
   */
  private async handlePlayPronunciation(message: PlayPronunciationMessage): Promise<ResponseMessage> {
    try {
      const language = message.payload.language;
      console.log(`Playing pronunciation for "${message.payload.word}" in language "${language}"`);
      await audioService.playPronunciation(message.payload.word, language);
      return messageRouter.createSuccessResponse(message.id);
    } catch (error) {
      console.error('Error playing pronunciation:', error);
      return this.createErrorResponse(message.id, error);
    }
  }

  /**
   * Increment translation count in statistics
   */
  private async incrementTranslationCount(): Promise<void> {
    try {
      const stats = await storageManager.getStatistics();
      if (stats) {
        await storageManager.updateStatistics({
          translationsCount: stats.translationsCount + 1,
          lastUsed: new Date()
        });
      }
    } catch (error) {
      console.warn('Failed to update translation count:', error);
    }
  }

  /**
   * Increment words learned count in statistics
   */
  private async incrementWordsLearned(): Promise<void> {
    try {
      const stats = await storageManager.getStatistics();
      if (stats) {
        await storageManager.updateStatistics({
          wordsLearned: stats.wordsLearned + 1,
          lastUsed: new Date()
        });
      }
    } catch (error) {
      console.warn('Failed to update words learned count:', error);
    }
  }

  /**
   * Create error response from error object
   */
  private createErrorResponse(messageId: string, error: any): ResponseMessage {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorCode = error.code || 'UNKNOWN_ERROR';
    
    return {
      id: messageId,
      type: MessageType.ERROR,
      timestamp: Date.now(),
      payload: {
        error: errorMessage,
        code: errorCode,
        details: error
      }
    };
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current configuration
   */
  getCurrentConfig(): UserConfig | null {
    return this.config;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    try {
      messageRouter.cleanup();
      this.translationService = null;
      this.contentGenerationService = null;
      this.llmClient = null;
      this.isInitialized = false;
      console.log('Background service cleanup complete');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}
