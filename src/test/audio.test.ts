/**
 * Unit tests for Audio Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TTSService, AudioServiceFactory, AudioError, AudioErrorCode } from '../services/audio.js';
import type { LanguageCode } from '../types/index.js';

// Mock Web Speech API
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn(() => [
    { lang: 'en-US', name: 'English US', voiceURI: 'en-US' },
    { lang: 'es-ES', name: 'Spanish Spain', voiceURI: 'es-ES' },
    { lang: 'fr-FR', name: 'French France', voiceURI: 'fr-FR' }
  ])
};

const mockSpeechSynthesisUtterance = vi.fn().mockImplementation((text: string) => ({
  text,
  lang: '',
  voice: null,
  rate: 1,
  pitch: 1,
  volume: 1,
  onend: null,
  onerror: null
}));

// Mock AudioContext
const mockAudioContext = vi.fn().mockImplementation(() => ({
  decodeAudioData: vi.fn().mockResolvedValue({}),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    onended: null,
    onerror: null
  })),
  destination: {}
}));

// Setup global mocks
Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
  value: mockSpeechSynthesisUtterance,
  writable: true,
  configurable: true
});

Object.defineProperty(globalThis, 'AudioContext', {
  value: mockAudioContext,
  writable: true,
  configurable: true
});

Object.defineProperty(globalThis, 'webkitAudioContext', {
  value: mockAudioContext,
  writable: true,
  configurable: true
});

describe('TTSService', () => {
  let ttsService: TTSService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure speechSynthesis is available for most tests
    Object.defineProperty(globalThis, 'speechSynthesis', {
      value: mockSpeechSynthesis,
      writable: true,
      configurable: true
    });
    ttsService = new TTSService();
  });

  afterEach(() => {
    ttsService.clearCache();
  });

  describe('Initialization', () => {
    it('should initialize with speech synthesis support', () => {
      expect(ttsService.isSupported()).toBe(true);
    });

    it('should handle missing speech synthesis', () => {
      // Remove speechSynthesis from globalThis
      delete (globalThis as any).speechSynthesis;
      
      const serviceWithoutTTS = new TTSService();
      expect(serviceWithoutTTS.isSupported()).toBe(false);
      
      // Restore speechSynthesis
      Object.defineProperty(globalThis, 'speechSynthesis', {
        value: mockSpeechSynthesis,
        writable: true,
        configurable: true
      });
    });
  });

  describe('playPronunciation', () => {
    it('should play pronunciation using TTS', async () => {
      const word = 'hello';
      const language: LanguageCode = 'en';

      // Mock successful TTS
      const mockUtterance = {
        text: word,
        lang: '',
        voice: null,
        rate: 1,
        pitch: 1,
        volume: 1,
        onend: null as any,
        onerror: null as any
      };
      
      mockSpeechSynthesisUtterance.mockReturnValue(mockUtterance);

      const playPromise = ttsService.playPronunciation(word, language);
      
      // Simulate successful TTS completion
      setTimeout(() => {
        if (mockUtterance.onend) {
          mockUtterance.onend();
        }
      }, 10);

      await expect(playPromise).resolves.toBeUndefined();
      expect(mockSpeechSynthesis.speak).toHaveBeenCalledWith(mockUtterance);
    });

    it('should handle TTS errors', async () => {
      const word = 'hello';
      const language: LanguageCode = 'en';

      const mockUtterance = {
        text: word,
        lang: '',
        voice: null,
        rate: 1,
        pitch: 1,
        volume: 1,
        onend: null as any,
        onerror: null as any
      };
      
      mockSpeechSynthesisUtterance.mockReturnValue(mockUtterance);

      const playPromise = ttsService.playPronunciation(word, language);
      
      // Simulate TTS error
      setTimeout(() => {
        if (mockUtterance.onerror) {
          mockUtterance.onerror({ error: 'network' } as any);
        }
      }, 10);

      await expect(playPromise).rejects.toThrow(AudioError);
      await expect(playPromise).rejects.toThrow('TTS error: network');
    });

    it('should throw error when TTS is not supported', async () => {
      // Remove speechSynthesis from globalThis
      delete (globalThis as any).speechSynthesis;
      
      const serviceWithoutTTS = new TTSService();
      
      await expect(
        serviceWithoutTTS.playPronunciation('hello', 'en')
      ).rejects.toThrow(AudioError);
      
      await expect(
        serviceWithoutTTS.playPronunciation('hello', 'en')
      ).rejects.toThrow('Text-to-Speech is not supported');

      // Restore speechSynthesis
      Object.defineProperty(globalThis, 'speechSynthesis', {
        value: mockSpeechSynthesis,
        writable: true,
        configurable: true
      });
    });

    it('should set correct language and voice', async () => {
      const word = 'hola';
      const language: LanguageCode = 'es';

      const mockUtterance = {
        text: word,
        lang: '',
        voice: null,
        rate: 1,
        pitch: 1,
        volume: 1,
        onend: null as any,
        onerror: null as any
      };
      
      mockSpeechSynthesisUtterance.mockReturnValue(mockUtterance);

      const playPromise = ttsService.playPronunciation(word, language);
      
      // Simulate successful completion
      setTimeout(() => {
        if (mockUtterance.onend) {
          mockUtterance.onend();
        }
      }, 10);

      await playPromise;

      expect(mockUtterance.lang).toBe('es-ES');
      expect(mockUtterance.voice).toEqual(
        expect.objectContaining({ lang: 'es-ES' })
      );
    });
  });

  describe('preloadAudio', () => {
    it('should preload audio for multiple words', async () => {
      const words = ['hello', 'world', 'test'];
      const language: LanguageCode = 'en';

      // Mock successful preloading
      await expect(
        ttsService.preloadAudio(words, language)
      ).resolves.toBeUndefined();
    });

    it('should handle preload failures gracefully', async () => {
      const words = ['hello', 'world'];
      const language: LanguageCode = 'en';

      // Should not throw even if individual preloads fail
      await expect(
        ttsService.preloadAudio(words, language)
      ).resolves.toBeUndefined();
    });
  });

  describe('getPhoneticTranscription', () => {
    it('should return phonetic transcription for known words', async () => {
      const result = await ttsService.getPhoneticTranscription('hello', 'en');
      expect(result).toBe('/həˈloʊ/');
    });

    it('should return fallback for unknown words', async () => {
      const result = await ttsService.getPhoneticTranscription('unknownword', 'en');
      expect(result).toBe('[unknownword]');
    });

    it('should handle different languages', async () => {
      const resultEs = await ttsService.getPhoneticTranscription('hola', 'es');
      expect(resultEs).toBe('/ˈola/');

      const resultFr = await ttsService.getPhoneticTranscription('bonjour', 'fr');
      expect(resultFr).toBe('/bon.ˈʒuʁ/');
    });

    it('should be case insensitive', async () => {
      const result1 = await ttsService.getPhoneticTranscription('HELLO', 'en');
      const result2 = await ttsService.getPhoneticTranscription('hello', 'en');
      expect(result1).toBe(result2);
    });
  });

  describe('Cache Management', () => {
    it('should provide cache statistics', () => {
      const stats = ttsService.getCacheStats();
      expect(stats).toEqual({
        size: expect.any(Number),
        maxSize: expect.any(Number)
      });
    });

    it('should clear cache', () => {
      ttsService.clearCache();
      const stats = ttsService.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should create AudioError with correct properties', () => {
      const error = new AudioError(
        AudioErrorCode.TTS_NOT_SUPPORTED,
        'Test error message'
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AudioError);
      expect(error.code).toBe(AudioErrorCode.TTS_NOT_SUPPORTED);
      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('AudioError');
    });

    it('should handle original error in AudioError', () => {
      const originalError = new Error('Original error');
      const audioError = new AudioError(
        AudioErrorCode.AUDIO_PLAYBACK_FAILED,
        'Wrapped error',
        originalError
      );

      expect(audioError.originalError).toBe(originalError);
    });
  });
});

describe('AudioServiceFactory', () => {
  afterEach(() => {
    AudioServiceFactory.resetInstance();
  });

  it('should return singleton instance', () => {
    const instance1 = AudioServiceFactory.getInstance();
    const instance2 = AudioServiceFactory.getInstance();
    
    expect(instance1).toBe(instance2);
    expect(instance1).toBeInstanceOf(TTSService);
  });

  it('should reset instance', () => {
    const instance1 = AudioServiceFactory.getInstance();
    AudioServiceFactory.resetInstance();
    const instance2 = AudioServiceFactory.getInstance();
    
    expect(instance1).not.toBe(instance2);
  });
});

describe('Audio Error Codes', () => {
  it('should have all required error codes', () => {
    expect(AudioErrorCode.TTS_NOT_SUPPORTED).toBe('TTS_NOT_SUPPORTED');
    expect(AudioErrorCode.AUDIO_PLAYBACK_FAILED).toBe('AUDIO_PLAYBACK_FAILED');
    expect(AudioErrorCode.CACHE_STORAGE_FAILED).toBe('CACHE_STORAGE_FAILED');
    expect(AudioErrorCode.INVALID_LANGUAGE).toBe('INVALID_LANGUAGE');
    expect(AudioErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR');
    expect(AudioErrorCode.PHONETIC_API_ERROR).toBe('PHONETIC_API_ERROR');
  });
});