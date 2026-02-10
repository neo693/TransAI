/**
 * Audio and Text-to-Speech Service for TransAI Browser Extension
 * Handles pronunciation playback, audio caching, and phonetic transcription
 */

import type { LanguageCode } from '../types/index.js';
import { CrossBrowserAPI, BrowserCapabilities } from '../utils/browser-detection.js';

// Audio service error codes
export enum AudioErrorCode {
  TTS_NOT_SUPPORTED = 'TTS_NOT_SUPPORTED',
  AUDIO_PLAYBACK_FAILED = 'AUDIO_PLAYBACK_FAILED',
  CACHE_STORAGE_FAILED = 'CACHE_STORAGE_FAILED',
  INVALID_LANGUAGE = 'INVALID_LANGUAGE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PHONETIC_API_ERROR = 'PHONETIC_API_ERROR'
}

// Custom error class for audio operations
export class AudioError extends Error {
  constructor(
    public code: AudioErrorCode,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AudioError';
  }
}

// Audio cache entry
interface AudioCacheEntry {
  audioData: ArrayBuffer;
  timestamp: Date;
  language: LanguageCode;
}

// TTS options
interface TTSOptions {
  language: LanguageCode;
  rate?: number;
  pitch?: number;
  volume?: number;
}

// Phonetic transcription result
// interface PhoneticResult {
//   word: string;
//   phonetic: string;
//   language: LanguageCode;
// }

// Language to voice mapping for Web Speech API
const LANGUAGE_VOICE_MAP: Record<LanguageCode, string[]> = {
  'en': ['en-US', 'en-GB', 'en-AU'],
  'es': ['es-ES', 'es-MX', 'es-AR'],
  'fr': ['fr-FR', 'fr-CA'],
  'de': ['de-DE', 'de-AT'],
  'it': ['it-IT'],
  'pt': ['pt-BR', 'pt-PT'],
  'ru': ['ru-RU'],
  'ja': ['ja-JP'],
  'ko': ['ko-KR'],
  'zh': ['zh-CN', 'zh-TW'],
  'ar': ['ar-SA', 'ar-EG']
};

/**
 * Text-to-Speech Service using Web Speech API
 */
export class TTSService {
  private synthesis: {
    getVoices: () => Array<{ lang: string }>;
    cancel: () => void;
    speak: (utterance: SpeechSynthesisUtterance) => void;
  } | null = null;
  private audioCache = new Map<string, AudioCacheEntry>();
  private phoneticCache = new Map<string, string>();
  private readonly maxCacheSize = 100;
  private readonly cacheExpiryHours = 24;
  private readonly browserAPI: CrossBrowserAPI;
  private readonly capabilities: BrowserCapabilities;

  constructor() {
    this.browserAPI = new CrossBrowserAPI();
    this.capabilities = BrowserCapabilities.getInstance();
    this.initializeTTS();
  }

  /**
   * Initialize TTS service and check browser support
   */
  private initializeTTS(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    } else if (typeof globalThis !== 'undefined' && 'speechSynthesis' in globalThis) {
      this.synthesis = (globalThis as any).speechSynthesis;
    }
  }

  /**
   * Check if TTS is supported in the current browser
   */
  public isSupported(): boolean {
    return this.synthesis !== null;
  }

  /**
   * Get available voices for a specific language
   */
  private getVoicesForLanguage(language: LanguageCode): Array<{ lang: string }> {
    if (!this.synthesis) return [];

    const voices = this.synthesis.getVoices();
    const languageCodes = LANGUAGE_VOICE_MAP[language] || [];

    return voices.filter(voice =>
      languageCodes.some(code => voice.lang.startsWith(code))
    );
  }

  /**
   * Play pronunciation for a word using TTS
   */
  public async playPronunciation(
    word: string,
    language: LanguageCode,
    options: Partial<TTSOptions> = {}
  ): Promise<void> {
    try {
      // Try browser extension TTS API first
      if (this.capabilities.hasTTSAPI()) {
        await this.browserAPI.speak(word, {
          lang: LANGUAGE_VOICE_MAP[language]?.[0] || 'en-US',
          rate: options.rate || 1.0,
          pitch: options.pitch || 1.0,
          volume: options.volume || 1.0
        });
        return;
      }

      // Fallback to Web Speech API
      if (!this.synthesis) {
        throw new AudioError(
          AudioErrorCode.TTS_NOT_SUPPORTED,
          'Text-to-Speech is not supported in this browser'
        );
      }

      // Check cache first
      const cacheKey = this.getCacheKey(word, language);
      const cachedAudio = this.getCachedAudio(cacheKey);

      if (cachedAudio) {
        await this.playAudioBuffer(cachedAudio.audioData);
        return;
      }

      // Use Web Speech API for TTS
      await this.speakWithTTS(word, language, options);

    } catch (error) {
      throw new AudioError(
        AudioErrorCode.AUDIO_PLAYBACK_FAILED,
        `Failed to play pronunciation for "${word}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Speak text using Web Speech API
   */
  private async speakWithTTS(
    text: string,
    language: LanguageCode,
    options: Partial<TTSOptions> = {}
  ): Promise<void> {
    if (!this.synthesis) {
      throw new AudioError(AudioErrorCode.TTS_NOT_SUPPORTED, 'TTS not available');
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);

      // Set language and voice
      const voices = this.getVoicesForLanguage(language);
      if (voices.length > 0) {
        utterance.lang = voices[0].lang;
      } else {
        utterance.lang = LANGUAGE_VOICE_MAP[language]?.[0] || 'en-US';
      }

      // Set TTS options
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;

      // Set up event handlers
      utterance.onend = () => resolve();
      utterance.onerror = (event) => {
        reject(new AudioError(
          AudioErrorCode.AUDIO_PLAYBACK_FAILED,
          `TTS error: ${event.error}`
        ));
      };

      // Cancel any ongoing speech and speak
      if (this.synthesis) {
        this.synthesis.cancel();
        this.synthesis.speak(utterance);
      }
    });
  }

  /**
   * Play audio from ArrayBuffer
   */
  private async playAudioBuffer(audioData: ArrayBuffer): Promise<void> {
    try {
      const AudioContextClass = (typeof window !== 'undefined' && window.AudioContext) ||
        (typeof window !== 'undefined' && (window as any).webkitAudioContext) ||
        (typeof globalThis !== 'undefined' && (globalThis as any).AudioContext) ||
        (typeof globalThis !== 'undefined' && (globalThis as any).webkitAudioContext);

      if (!AudioContextClass) {
        throw new Error('AudioContext not supported');
      }

      const audioContext = new AudioContextClass();
      const audioBuffer = await audioContext.decodeAudioData(audioData.slice(0));

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      return new Promise((resolve, reject) => {
        source.onended = () => resolve();
        source.onerror = () => reject(new AudioError(
          AudioErrorCode.AUDIO_PLAYBACK_FAILED,
          'Failed to play cached audio'
        ));
        source.start();
      });
    } catch (error) {
      throw new AudioError(
        AudioErrorCode.AUDIO_PLAYBACK_FAILED,
        `Audio playback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Preload audio for multiple words
   */
  public async preloadAudio(words: string[], language: LanguageCode): Promise<void> {
    const preloadPromises = words.map(word =>
      this.cacheAudioForWord(word, language).catch(error => {
        console.warn(`Failed to preload audio for "${word}":`, error);
      })
    );

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Cache audio for a specific word
   */
  private async cacheAudioForWord(word: string, language: LanguageCode): Promise<void> {
    const cacheKey = this.getCacheKey(word, language);

    if (this.getCachedAudio(cacheKey)) {
      return; // Already cached
    }

    try {
      // For Web Speech API, we can't easily cache the audio
      // This is a placeholder for future external TTS API integration
      // For now, we'll just mark it as attempted
      const entry: AudioCacheEntry = {
        audioData: new ArrayBuffer(0), // Placeholder
        timestamp: new Date(),
        language
      };

      this.setCachedAudio(cacheKey, entry);
    } catch (error) {
      throw new AudioError(
        AudioErrorCode.CACHE_STORAGE_FAILED,
        `Failed to cache audio for "${word}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get phonetic transcription for a word using AI
   */
  public async getPhoneticTranscription(word: string, language: LanguageCode): Promise<string> {
    try {
      // Check cache first
      const cacheKey = `phonetic:${this.getCacheKey(word, language)}`;
      const cached = this.phoneticCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Generate phonetic transcription using AI
      const phonetic = await this.generatePhoneticWithAI(word, language);

      // Cache the result
      this.phoneticCache.set(cacheKey, phonetic);

      return phonetic;
    } catch (error) {
      console.warn(`Failed to get phonetic transcription for "${word}":`, error);
      // Fallback to simple format
      return `[${word}]`;
    }
  }

  /**
   * Generate phonetic transcription using AI model
   */
  private async generatePhoneticWithAI(word: string, language: LanguageCode): Promise<string> {
    try {
      // Get AI service from the extension
      const aiService = await this.getAIService();

      if (!aiService) {
        throw new Error('AI service not available');
      }

      const prompt = this.buildPhoneticPrompt(word, language);
      const response = await aiService.generateText(prompt);

      // Extract phonetic notation from response
      const phonetic = this.extractPhoneticNotation(response);

      return phonetic || `[${word}]`;
    } catch (error) {
      throw new AudioError(
        AudioErrorCode.PHONETIC_API_ERROR,
        `Failed to generate phonetic transcription: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Build prompt for AI phonetic transcription
   */
  private buildPhoneticPrompt(word: string, language: LanguageCode): string {
    const languageNames: Record<LanguageCode, string> = {
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

    const languageName = languageNames[language] || 'English';

    return `Provide the IPA (International Phonetic Alphabet) pronunciation for the ${languageName} word "${word}".

Requirements:
- Return ONLY the IPA notation enclosed in forward slashes, e.g., /həˈloʊ/
- Use standard IPA symbols appropriate for ${languageName}
- Include stress markers (ˈ for primary stress, ˌ for secondary stress)
- Do not include any explanations, just the IPA notation
- If the word has multiple pronunciations, provide the most common one

Example format: /wɜːrld/

Word: ${word}
IPA:`;
  }

  /**
   * Extract phonetic notation from AI response
   */
  private extractPhoneticNotation(response: string): string | null {
    // Try to extract IPA notation between forward slashes
    const ipaMatch = response.match(/\/([^/]+)\//);
    if (ipaMatch) {
      return `/${ipaMatch[1]}/`;
    }

    // Try to extract IPA notation between square brackets
    const bracketMatch = response.match(/\[([^\]]+)\]/);
    if (bracketMatch) {
      return `[${bracketMatch[1]}]`;
    }

    // If response is clean IPA without delimiters, wrap it
    const cleanResponse = response.trim();
    if (cleanResponse && !cleanResponse.includes('\n') && cleanResponse.length < 50) {
      return `/${cleanResponse}/`;
    }

    return null;
  }

  /**
   * Get AI service instance from extension
   */
  private async getAIService(): Promise<any> {
    // This will be injected by the extension context
    // For now, return null to use fallback
    if (typeof globalThis !== 'undefined' && (globalThis as any).__transai_ai_service) {
      return (globalThis as any).__transai_ai_service;
    }
    return null;
  }

  /**
   * Generate cache key for word and language
   */
  private getCacheKey(word: string, language: LanguageCode): string {
    return `${language}:${word.toLowerCase()}`;
  }

  /**
   * Get cached audio entry
   */
  private getCachedAudio(cacheKey: string): AudioCacheEntry | null {
    const entry = this.audioCache.get(cacheKey);

    if (!entry) return null;

    // Check if cache entry is expired
    const now = new Date();
    const expiryTime = new Date(entry.timestamp.getTime() + this.cacheExpiryHours * 60 * 60 * 1000);

    if (now > expiryTime) {
      this.audioCache.delete(cacheKey);
      return null;
    }

    return entry;
  }

  /**
   * Set cached audio entry
   */
  private setCachedAudio(cacheKey: string, entry: AudioCacheEntry): void {
    // Clean up old entries if cache is full
    if (this.audioCache.size >= this.maxCacheSize) {
      this.cleanupCache();
    }

    this.audioCache.set(cacheKey, entry);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = new Date();
    const expiryTime = this.cacheExpiryHours * 60 * 60 * 1000;

    for (const [key, entry] of this.audioCache.entries()) {
      if (now.getTime() - entry.timestamp.getTime() > expiryTime) {
        this.audioCache.delete(key);
      }
    }

    // If still too many entries, remove oldest ones
    if (this.audioCache.size >= this.maxCacheSize) {
      const entries = Array.from(this.audioCache.entries());
      entries.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());

      const toRemove = entries.slice(0, Math.floor(this.maxCacheSize * 0.3));
      toRemove.forEach(([key]) => this.audioCache.delete(key));
    }
  }

  /**
   * Clear all cached audio
   */
  public clearCache(): void {
    this.audioCache.clear();
    this.phoneticCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.audioCache.size,
      maxSize: this.maxCacheSize
    };
  }
}

/**
 * Audio Service Factory
 */
export class AudioServiceFactory {
  private static instance: TTSService | null = null;

  public static getInstance(): TTSService {
    if (!this.instance) {
      this.instance = new TTSService();
    }
    return this.instance;
  }

  public static resetInstance(): void {
    this.instance = null;
  }
}

// Export singleton instance
export const audioService = AudioServiceFactory.getInstance();
