/**
 * Integration tests for pronunciation features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PronunciationButton, PronunciationDisplay, InlinePronunciation } from '../components/pronunciation-button.js';
import { audioService } from '../services/audio.js';

// Mock the audio service
vi.mock('../services/audio.js', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    audioService: {
      playPronunciation: vi.fn(),
      getPhoneticTranscription: vi.fn(),
      isSupported: vi.fn(() => true)
    }
  };
});

const mockAudioService = audioService as any;

describe('Pronunciation Components Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PronunciationButton', () => {
    it('should render pronunciation button with correct props', () => {
      render(
        <PronunciationButton
          word="hello"
          language="en"
          size="md"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('title', 'Play pronunciation of "hello"');
      expect(button).toHaveAttribute('aria-label', 'Play pronunciation of hello');
    });

    it('should call audio service when clicked', async () => {
      mockAudioService.playPronunciation.mockResolvedValue(undefined);

      render(
        <PronunciationButton
          word="hello"
          language="en"
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockAudioService.playPronunciation).toHaveBeenCalledWith('hello', 'en');
      });
    });

    it('should show loading state during pronunciation', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockAudioService.playPronunciation.mockReturnValue(promise);

      render(
        <PronunciationButton
          word="hello"
          language="en"
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should show loading state
      expect(button).toBeDisabled();
      expect(button.querySelector('.animate-spin')).toBeInTheDocument();

      // Resolve the promise
      resolvePromise!();
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('should handle pronunciation errors', async () => {
      const mockError = new Error('TTS not available');
      mockAudioService.playPronunciation.mockRejectedValue(mockError);

      const onError = vi.fn();
      render(
        <PronunciationButton
          word="hello"
          language="en"
          onError={onError}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });

    it('should show phonetic transcription when TTS fails and showPhonetic is true', async () => {
      // Import AudioError and AudioErrorCode from the actual module
      const { AudioError, AudioErrorCode } = await import('../services/audio.js');
      const mockError = new AudioError(AudioErrorCode.TTS_NOT_SUPPORTED, 'TTS not supported');
      mockAudioService.playPronunciation.mockRejectedValue(mockError);
      mockAudioService.getPhoneticTranscription.mockResolvedValue('/həˈloʊ/');

      render(
        <PronunciationButton
          word="hello"
          language="en"
          showPhonetic={true}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should eventually show phonetic transcription as fallback
      await waitFor(() => {
        expect(screen.getByText('/həˈloʊ/')).toBeInTheDocument();
      });
    });

    it('should call onSuccess callback when pronunciation succeeds', async () => {
      mockAudioService.playPronunciation.mockResolvedValue(undefined);
      const onSuccess = vi.fn();

      render(
        <PronunciationButton
          word="hello"
          language="en"
          onSuccess={onSuccess}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('PronunciationDisplay', () => {
    it('should render word with pronunciation button and phonetic', () => {
      render(
        <PronunciationDisplay
          word="hello"
          language="en"
          phonetic="/həˈloʊ/"
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('/həˈloʊ/')).toBeInTheDocument();
    });

    it('should load phonetic transcription when not provided', async () => {
      mockAudioService.getPhoneticTranscription.mockResolvedValue('/həˈloʊ/');

      render(
        <PronunciationDisplay
          word="hello"
          language="en"
        />
      );

      await waitFor(() => {
        expect(mockAudioService.getPhoneticTranscription).toHaveBeenCalledWith('hello', 'en');
      });

      await waitFor(() => {
        expect(screen.getByText('/həˈloʊ/')).toBeInTheDocument();
      });
    });

    it('should show fallback when phonetic loading fails', async () => {
      mockAudioService.getPhoneticTranscription.mockRejectedValue(new Error('API error'));

      render(
        <PronunciationDisplay
          word="hello"
          language="en"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('[hello]')).toBeInTheDocument();
      });
    });
  });

  describe('InlinePronunciation', () => {
    it('should render compact pronunciation button', () => {
      render(
        <InlinePronunciation
          word="hello"
          language="en"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('opacity-70');
    });

    it('should show hover effect', () => {
      render(
        <InlinePronunciation
          word="hello"
          language="en"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:opacity-100');
    });
  });

  describe('Language Support', () => {
    const testCases = [
      { language: 'en', word: 'hello' },
      { language: 'es', word: 'hola' },
      { language: 'fr', word: 'bonjour' },
      { language: 'de', word: 'hallo' },
      { language: 'it', word: 'ciao' },
      { language: 'pt', word: 'olá' },
      { language: 'ru', word: 'привет' },
      { language: 'ja', word: 'こんにちは' },
      { language: 'ko', word: '안녕하세요' },
      { language: 'zh', word: '你好' },
      { language: 'ar', word: 'مرحبا' }
    ];

    testCases.forEach(({ language, word }) => {
      it(`should support ${language} language`, async () => {
        mockAudioService.playPronunciation.mockResolvedValue(undefined);

        render(
          <PronunciationButton
            word={word}
            language={language as any}
          />
        );

        const button = screen.getByRole('button');
        fireEvent.click(button);

        await waitFor(() => {
          expect(mockAudioService.playPronunciation).toHaveBeenCalledWith(word, language);
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <PronunciationButton
          word="hello"
          language="en"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Play pronunciation of hello');
      expect(button).toHaveAttribute('title', 'Play pronunciation of "hello"');
    });

    it('should be keyboard accessible', () => {
      mockAudioService.playPronunciation.mockResolvedValue(undefined);

      render(
        <PronunciationButton
          word="hello"
          language="en"
        />
      );

      const button = screen.getByRole('button');
      button.focus();
      
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.keyUp(button, { key: 'Enter' });
      
      // The button should be focusable and respond to keyboard events
      expect(document.activeElement).toBe(button);
    });

    it('should have proper focus styles', () => {
      render(
        <PronunciationButton
          word="hello"
          language="en"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus:outline-none');
      expect(button).toHaveClass('focus:ring-2');
      expect(button).toHaveClass('focus:ring-blue-500');
    });
  });

  describe('Error Handling', () => {
    it('should show error indicator when pronunciation fails', async () => {
      mockAudioService.playPronunciation.mockRejectedValue(new Error('TTS failed'));

      render(
        <PronunciationButton
          word="hello"
          language="en"
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('⚠️')).toBeInTheDocument();
      });
    });

    it('should recover from errors on retry', async () => {
      mockAudioService.playPronunciation
        .mockRejectedValueOnce(new Error('TTS failed'))
        .mockResolvedValueOnce(undefined);

      render(
        <PronunciationButton
          word="hello"
          language="en"
        />
      );

      const button = screen.getByRole('button');
      
      // First click fails
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('⚠️')).toBeInTheDocument();
      });

      // Second click succeeds
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.queryByText('⚠️')).not.toBeInTheDocument();
      });
    });
  });
});