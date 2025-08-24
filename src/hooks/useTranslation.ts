/**
 * Translation Hook
 * Provides translation functionality using the configured LLM service
 */

import { useState, useCallback, useEffect } from 'react';
import type { 
  TranslationResult, 
  TranslationOptions, 
  LanguageCode
} from '../types/index.js';
import { TranslationService, TranslationServiceFactory } from '../services/translation.js';
import { LLMClientFactory } from '../services/llm.js';
import { storageManager } from '../services/storage.js';

interface UseTranslationReturn {
  translate: (text: string, targetLang: LanguageCode, options?: Partial<TranslationOptions>) => Promise<TranslationResult>;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
}

export function useTranslation(): UseTranslationReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translationService, setTranslationService] = useState<TranslationService | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  // Initialize translation service when config changes
  useEffect(() => {
    const initializeService = async () => {
      try {
        const config = await storageManager.getConfig();
        
        if (!config.apiKey || !config.apiProvider) {
          setIsConfigured(false);
          setTranslationService(null);
          return;
        }

        // Create LLM client configuration
        const llmConfig = {
          apiKey: config.apiKey,
          baseUrl: config.apiBaseUrl,
          model: config.selectedModel
        };

        // Create LLM client
        const llmClient = LLMClientFactory.create(config.apiProvider, llmConfig);
        
        // Create translation service
        const service = TranslationServiceFactory.createFromLLMClient(llmClient);
        
        setTranslationService(service);
        setIsConfigured(service.isConfigured());
        setError(null);
      } catch (err) {
        console.error('Failed to initialize translation service:', err);
        setError('Failed to initialize translation service');
        setIsConfigured(false);
        setTranslationService(null);
      }
    };

    initializeService();
  }, []);

  const translate = useCallback(async (
    text: string, 
    targetLang: LanguageCode, 
    options: Partial<TranslationOptions> = {}
  ): Promise<TranslationResult> => {
    if (!translationService) {
      throw new Error('Translation service not configured');
    }

    setLoading(true);
    setError(null);

    try {
      const translationOptions: TranslationOptions = {
        targetLanguage: targetLang,
        includeExamples: true,
        ...options
      };

      const result = await translationService.translate(text, translationOptions);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Translation failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [translationService]);

  return {
    translate,
    loading,
    error,
    isConfigured
  };
}