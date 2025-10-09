/**
 * Pronunciation Button Component
 * Provides audio playback functionality for words and translations
 */

import React, { useState, useCallback } from 'react';
import { audioService, AudioError, AudioErrorCode } from '../services/audio.js';
import type { LanguageCode } from '../types/index.js';

// Props for the pronunciation button
interface PronunciationButtonProps {
  word: string;
  language: LanguageCode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showPhonetic?: boolean;
  onError?: (error: AudioError) => void;
  onSuccess?: () => void;
}

// Pronunciation display component props
interface PronunciationDisplayProps {
  word: string;
  language: LanguageCode;
  phonetic?: string;
  className?: string;
}

/**
 * Button component for playing word pronunciation
 */
export const PronunciationButton: React.FC<PronunciationButtonProps> = ({
  word,
  language,
  className = '',
  size = 'md',
  showPhonetic = false,
  onError,
  onSuccess
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [phonetic, setPhonetic] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Size classes for different button sizes
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  // Handle pronunciation playback
  const handlePlayPronunciation = useCallback(async () => {
    if (isPlaying) return;

    setIsPlaying(true);
    setError('');

    try {
      await audioService.playPronunciation(word, language);
      onSuccess?.();
    } catch (err) {
      const audioError = err instanceof AudioError ? err : new AudioError(
        AudioErrorCode.AUDIO_PLAYBACK_FAILED,
        'Unknown audio error'
      );
      
      setError(audioError.message);
      onError?.(audioError);

      // If TTS fails, try to get phonetic transcription as fallback
      if (showPhonetic && audioError.code === AudioErrorCode.TTS_NOT_SUPPORTED) {
        try {
          const phoneticText = await audioService.getPhoneticTranscription(word, language);
          setPhonetic(phoneticText);
        } catch (phoneticError) {
          console.warn('Failed to get phonetic transcription:', phoneticError);
        }
      }
    } finally {
      setIsPlaying(false);
    }
  }, [word, language, isPlaying, showPhonetic, onError, onSuccess]);

  return (
    <div className="tw-inline-flex tw-items-center tw-gap-2">
      <button
        onClick={handlePlayPronunciation}
        disabled={isPlaying}
        className={`
          inline-flex items-center justify-center
          ${sizeClasses[size]}
          rounded-full
          bg-blue-500 hover:bg-blue-600 
          disabled:bg-gray-400 disabled:cursor-not-allowed
          text-white
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${className}
        `}
        title={`Play pronunciation of "${word}"`}
        aria-label={`Play pronunciation of ${word}`}
      >
        {isPlaying ? (
          <svg className="animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="65%" height="65%">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="65%" height="65%">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        )}
      </button>

      {/* Show phonetic transcription if available and requested */}
      {showPhonetic && phonetic && (
        <span className="tw-text-sm tw-text-gray-600 tw-font-mono">
          {phonetic}
        </span>
      )}

      {/* Show error message if pronunciation fails */}
      {error && (
        <span className="tw-text-xs tw-text-red-500" title={error}>
          ⚠️
        </span>
      )}
    </div>
  );
};

/**
 * Component for displaying pronunciation information
 */
export const PronunciationDisplay: React.FC<PronunciationDisplayProps> = ({
  word,
  language,
  phonetic,
  className = ''
}) => {
  const [displayPhonetic, setDisplayPhonetic] = useState(phonetic || '');
  const [isLoading, setIsLoading] = useState(false);

  // Load phonetic transcription if not provided
  const loadPhonetic = useCallback(async () => {
    if (displayPhonetic || isLoading) return;

    setIsLoading(true);
    try {
      const phoneticText = await audioService.getPhoneticTranscription(word, language);
      setDisplayPhonetic(phoneticText);
    } catch (error) {
      console.warn('Failed to load phonetic transcription:', error);
      setDisplayPhonetic(`[${word}]`); // Fallback
    } finally {
      setIsLoading(false);
    }
  }, [word, language, displayPhonetic, isLoading]);

  // Load phonetic on mount if not provided
  React.useEffect(() => {
    if (!phonetic) {
      loadPhonetic();
    }
  }, [phonetic, loadPhonetic]);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <PronunciationButton 
        word={word} 
        language={language} 
        size="sm"
      />
      
      <span className="tw-text-sm tw-text-gray-600 tw-font-mono">
        {isLoading ? (
          <span className="tw-animate-pulse">Loading...</span>
        ) : (
          displayPhonetic || `[${word}]`
        )}
      </span>
    </div>
  );
};

/**
 * Compact pronunciation component for inline use
 */
export const InlinePronunciation: React.FC<{
  word: string;
  language: LanguageCode;
  className?: string;
}> = ({ word, language, className = '' }) => {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <PronunciationButton 
        word={word} 
        language={language} 
        size="sm"
        className="opacity-70 hover:opacity-100"
      />
    </span>
  );
};

export default PronunciationButton;