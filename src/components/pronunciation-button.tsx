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
    <div className="inline-flex items-center gap-2">
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
          <svg className="animate-spin" fill="currentColor" viewBox="0 0 20 20" width="60%" height="60%">
            <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg fill="currentColor" viewBox="0 0 20 20" width="60%" height="60%">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.824L4.5 13.5H2a1 1 0 01-1-1v-5a1 1 0 011-1h2.5l3.883-3.324zM15 8.25a.75.75 0 01.75.75 3.5 3.5 0 010 7 .75.75 0 01-.75-.75.75.75 0 01.75-.75 2 2 0 000-4 .75.75 0 01-.75-.75z" clipRule="evenodd" />
            <path d="M12.5 6.5a.75.75 0 011.5 0 5.5 5.5 0 010 11 .75.75 0 01-1.5 0 4 4 0 000-8 .75.75 0 010-1.5z" />
          </svg>
        )}
      </button>

      {/* Show phonetic transcription if available and requested */}
      {showPhonetic && phonetic && (
        <span className="text-sm text-gray-600 font-mono">
          {phonetic}
        </span>
      )}

      {/* Show error message if pronunciation fails */}
      {error && (
        <span className="text-xs text-red-500" title={error}>
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
      
      <span className="text-sm text-gray-600 font-mono">
        {isLoading ? (
          <span className="animate-pulse">Loading...</span>
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