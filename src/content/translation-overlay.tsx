import React, { useState, useEffect, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { TranslationResult, TextSelection, LanguageCode } from '../types/index';
import { PronunciationButton } from '../components/pronunciation-button';

interface TranslationOverlayProps {
  selection: TextSelection;
  onClose: () => void;
  onAddToVocabulary?: (word: string, translation: string) => void;
}

interface TranslationOverlayState {
  isLoading: boolean;
  translation: TranslationResult | null;
  error: string | null;
  isVisible: boolean;
  vocabularyStatus: 'none' | 'checking' | 'exists' | 'adding' | 'added' | 'error';
  vocabularyMessage: string | null;
}

/**
 * Translation overlay component that displays translation results
 * and provides vocabulary management options
 */
const TranslationOverlay: React.FC<TranslationOverlayProps> = ({
  selection,
  onClose,
  onAddToVocabulary
}) => {
  const [state, setState] = useState<TranslationOverlayState>({
    isLoading: true,
    translation: null,
    error: null,
    isVisible: false,
    vocabularyStatus: 'none',
    vocabularyMessage: null
  });

  const overlayRef = useRef<HTMLDivElement>(null);

  // Show overlay with animation after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setState(prev => ({ ...prev, isVisible: true }));
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  // Request translation and check vocabulary when component mounts
  useEffect(() => {
    requestTranslation();
    checkVocabularyStatus();
  }, [selection.text]);

  // Handle clicks outside overlay to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Prevent text selection within overlay from triggering translation
    const handleSelectStart = (event: Event) => {
      if (overlayRef.current && overlayRef.current.contains(event.target as Node)) {
        // Allow selection within overlay but mark it as internal
        (event.target as any).__transaiInternal = true;
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('selectstart', handleSelectStart);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, [onClose]);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const requestTranslation = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      console.log('Requesting translation for:', selection.text);

      // Send message to background script for translation
      const translateMessage = {
        id: `translate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'TRANSLATE_TEXT',
        timestamp: Date.now(),
        payload: {
          text: selection.text,
          options: {
            targetLanguage: 'en', // Default target language
            sourceLanguage: 'auto',
            context: selection.context
          }
        }
      };
      
      console.log('Sending translation message:', translateMessage);
      const response = await chrome.runtime.sendMessage(translateMessage);
      console.log('Translation response:', response);

      if (response.type === 'TRANSLATION_RESULT') {
        setState(prev => ({
          ...prev,
          isLoading: false,
          translation: response.payload.result,
          error: null
        }));
      } else if (response.type === 'SUCCESS' && response.payload.data) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          translation: response.payload.data,
          error: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: response.payload?.error || 'Translation failed'
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Translation failed'
      }));
    }
  };

  const checkVocabularyStatus = async () => {
    try {
      setState(prev => ({ ...prev, vocabularyStatus: 'checking' }));
      console.log('Checking vocabulary status for:', selection.text);

      const checkMessage = {
        id: `check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'CHECK_VOCABULARY',
        timestamp: Date.now(),
        payload: { word: selection.text }
      };
      
      console.log('Sending vocabulary check message:', checkMessage);
      const response = await chrome.runtime.sendMessage(checkMessage);
      console.log('Vocabulary check response:', response);

      if (response.type === 'SUCCESS' && response.payload.data) {
        setState(prev => ({
          ...prev,
          vocabularyStatus: response.payload.data.exists ? 'exists' : 'none',
          vocabularyMessage: response.payload.data.exists ? 'Already in vocabulary' : null
        }));
      } else {
        setState(prev => ({
          ...prev,
          vocabularyStatus: 'none',
          vocabularyMessage: null
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        vocabularyStatus: 'none',
        vocabularyMessage: null
      }));
    }
  };

  const handleAddToVocabulary = async () => {
    if (!state.translation) return;

    try {
      setState(prev => ({ 
        ...prev, 
        vocabularyStatus: 'adding',
        vocabularyMessage: 'Adding to vocabulary...'
      }));

      const addMessage = {
        id: `add_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'ADD_TO_VOCABULARY',
        timestamp: Date.now(),
        payload: {
          word: selection.text,
          translation: state.translation.translatedText,
          context: selection.context,
          sourceUrl: selection.url
        }
      };
      
      const response = await chrome.runtime.sendMessage(addMessage);

      if (response.type === 'SUCCESS') {
        setState(prev => ({
          ...prev,
          vocabularyStatus: 'added',
          vocabularyMessage: 'Added to vocabulary!'
        }));

        // Call the callback if provided
        if (onAddToVocabulary) {
          onAddToVocabulary(selection.text, state.translation.translatedText);
        }

        // Auto-hide success message after 2 seconds
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            vocabularyMessage: null
          }));
        }, 2000);
      } else {
        const errorMessage = response.payload?.code === 'WORD_EXISTS' 
          ? 'Word already in vocabulary'
          : response.payload?.error || 'Failed to add to vocabulary';
          
        setState(prev => ({
          ...prev,
          vocabularyStatus: response.payload?.code === 'WORD_EXISTS' ? 'exists' : 'error',
          vocabularyMessage: errorMessage
        }));

        // Auto-hide error message after 3 seconds
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            vocabularyMessage: null
          }));
        }, 3000);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        vocabularyStatus: 'error',
        vocabularyMessage: 'Failed to add to vocabulary'
      }));

      // Auto-hide error message after 3 seconds
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          vocabularyMessage: null
        }));
      }, 3000);
    }
  };

  const handleRetry = () => {
    requestTranslation();
  };

  // Calculate optimal position for overlay
  const getOverlayStyle = (): React.CSSProperties => {
    const { x, y } = selection.position;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Estimate overlay dimensions
    const overlayWidth = 320;
    const overlayHeight = state.translation ? 200 : 120;
    
    // Calculate position with viewport bounds checking
    let left = x - overlayWidth / 2;
    let top = y - overlayHeight - 10; // Position above selection by default
    
    // Adjust horizontal position if overlay would go off-screen
    if (left < 10) {
      left = 10;
    } else if (left + overlayWidth > viewportWidth - 10) {
      left = viewportWidth - overlayWidth - 10;
    }
    
    // Adjust vertical position if overlay would go off-screen
    if (top < 10) {
      top = y + 30; // Position below selection instead
    }
    
    // Final check for bottom overflow
    if (top + overlayHeight > viewportHeight - 10) {
      top = viewportHeight - overlayHeight - 10;
    }

    return {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      zIndex: 2147483647, // Maximum z-index to ensure overlay is on top
      transform: state.isVisible ? 'scale(1)' : 'scale(0.8)',
      opacity: state.isVisible ? 1 : 0,
      transition: 'all 0.2s ease-out'
    };
  };

  return (
    <div
      ref={overlayRef}
      style={getOverlayStyle()}
      className="transai-overlay tw-bg-white tw-rounded-lg tw-shadow-xl tw-border tw-border-gray-200 tw-p-4 tw-max-w-sm"
      data-transai-overlay="true"
    >
      {/* Header */}
      <div className="tw-flex tw-items-center tw-justify-between tw-mb-3">
        <div className="tw-flex tw-items-center tw-space-x-2">
          <div className="tw-w-2 tw-h-2 tw-bg-blue-500 tw-rounded-full"></div>
          <span className="tw-text-sm tw-font-medium tw-text-gray-700">TransAI</span>
        </div>
        <button
          onClick={onClose}
          className="tw-text-gray-400 hover:tw-text-gray-600 tw-transition-colors"
          aria-label="Close translation"
        >
          <svg className="tw-w-4 tw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Selected text */}
      <div className="tw-mb-3">
        <div className="tw-text-xs tw-text-gray-500 tw-mb-1">Selected text:</div>
        <div className="tw-text-sm tw-font-medium tw-text-gray-900 tw-bg-gray-50 tw-rounded tw-px-2 tw-py-1">
          {selection.text}
        </div>
      </div>

      {/* Loading state */}
      {state.isLoading && (
        <div className="tw-flex tw-items-center tw-justify-center tw-py-6">
          <div className="tw-flex tw-items-center tw-space-x-2">
            <div className="tw-animate-spin tw-rounded-full tw-h-4 tw-w-4 tw-border-b-2 tw-border-blue-500"></div>
            <span className="tw-text-sm tw-text-gray-600">Translating...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {state.error && !state.isLoading && (
        <div className="tw-py-4">
          <div className="tw-text-sm tw-text-red-600 tw-mb-3">
            <div className="tw-flex tw-items-center tw-space-x-2">
              <svg className="tw-w-4 tw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Translation failed</span>
            </div>
            <div className="tw-text-xs tw-text-gray-500 tw-mt-1">{state.error}</div>
          </div>
          <button
            onClick={handleRetry}
            className="tw-w-full tw-bg-blue-500 hover:tw-bg-blue-600 tw-text-white tw-text-sm tw-py-2 tw-px-3 tw-rounded tw-transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Translation result */}
      {state.translation && !state.isLoading && (
        <div className="tw-space-y-3">
          {/* Original word with pronunciation */}
          <div>
            <div className="tw-text-xs tw-text-gray-500 tw-mb-1">Original:</div>
            <div className="tw-flex tw-items-center tw-space-x-2 tw-text-sm tw-text-gray-900 tw-bg-gray-50 tw-rounded tw-px-2 tw-py-2">
              <span>{selection.text}</span>
              <PronunciationButton
                word={selection.text}
                language={state.translation.sourceLanguage as LanguageCode}
                size="sm"
                onError={(error) => console.warn('Pronunciation error:', error)}
              />
            </div>
          </div>

          {/* Translation with pronunciation */}
          <div>
            <div className="tw-text-xs tw-text-gray-500 tw-mb-1">Translation:</div>
            <div className="tw-flex tw-items-center tw-space-x-2 tw-text-sm tw-text-gray-900 tw-bg-blue-50 tw-rounded tw-px-2 tw-py-2">
              <span>{state.translation.translatedText}</span>
              <PronunciationButton
                word={state.translation.translatedText}
                language={state.translation.targetLanguage as LanguageCode}
                size="sm"
                onError={(error) => console.warn('Pronunciation error:', error)}
              />
            </div>
          </div>

          {/* Examples */}
          {state.translation.examples && state.translation.examples.length > 0 && (
            <div>
              <div className="tw-text-xs tw-text-gray-500 tw-mb-1">Example:</div>
              <div className="tw-text-xs tw-text-gray-700 tw-bg-gray-50 tw-rounded tw-px-2 tw-py-1">
                {state.translation.examples[0].translated}
              </div>
            </div>
          )}

          {/* Vocabulary Status */}
          {state.vocabularyMessage && (
            <div className={`tw-text-xs tw-p-2 tw-rounded tw-mb-2 ${
              state.vocabularyStatus === 'added' 
                ? 'tw-bg-green-100 tw-text-green-700 tw-border tw-border-green-200'
                : state.vocabularyStatus === 'exists'
                ? 'tw-bg-blue-100 tw-text-blue-700 tw-border tw-border-blue-200'
                : 'tw-bg-red-100 tw-text-red-700 tw-border tw-border-red-200'
            }`}>
              <div className="tw-flex tw-items-center tw-space-x-1">
                {state.vocabularyStatus === 'added' && (
                  <svg className="tw-w-3 tw-h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {state.vocabularyStatus === 'exists' && (
                  <svg className="tw-w-3 tw-h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {state.vocabularyStatus === 'error' && (
                  <svg className="tw-w-3 tw-h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span>{state.vocabularyMessage}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="tw-flex tw-space-x-2 tw-pt-2">
            {onAddToVocabulary && (
              <button
                onClick={handleAddToVocabulary}
                disabled={state.vocabularyStatus === 'adding' || state.vocabularyStatus === 'exists' || state.vocabularyStatus === 'added'}
                className={`tw-flex-1 tw-text-white tw-text-xs tw-py-2 tw-px-3 tw-rounded tw-transition-colors tw-flex tw-items-center tw-justify-center tw-space-x-1 ${
                  state.vocabularyStatus === 'adding'
                    ? 'tw-bg-gray-400 tw-cursor-not-allowed'
                    : state.vocabularyStatus === 'exists' || state.vocabularyStatus === 'added'
                    ? 'tw-bg-gray-400 tw-cursor-not-allowed'
                    : 'tw-bg-green-500 hover:tw-bg-green-600'
                }`}
              >
                {state.vocabularyStatus === 'adding' ? (
                  <>
                    <div className="tw-animate-spin tw-rounded-full tw-h-3 tw-w-3 tw-border-b-2 tw-border-white"></div>
                    <span>Adding...</span>
                  </>
                ) : state.vocabularyStatus === 'checking' ? (
                  <>
                    <div className="tw-animate-spin tw-rounded-full tw-h-3 tw-w-3 tw-border-b-2 tw-border-white"></div>
                    <span>Checking...</span>
                  </>
                ) : state.vocabularyStatus === 'exists' ? (
                  <>
                    <svg className="tw-w-3 tw-h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>In Vocabulary</span>
                  </>
                ) : state.vocabularyStatus === 'added' ? (
                  <>
                    <svg className="tw-w-3 tw-h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Added!</span>
                  </>
                ) : (
                  <>
                    <svg className="tw-w-3 tw-h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add to Vocabulary</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="tw-flex-1 tw-bg-gray-500 hover:tw-bg-gray-600 tw-text-white tw-text-xs tw-py-2 tw-px-3 tw-rounded tw-transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Translation overlay manager class that handles overlay lifecycle
 */
export class TranslationOverlayManager {
  private overlayContainer: HTMLDivElement | null = null;
  private root: Root | null = null;
  private currentSelection: TextSelection | null = null;

  constructor(
    private onAddToVocabulary?: (word: string, translation: string) => void
  ) {}

  /**
   * Show translation overlay for the given selection
   */
  public show(selection: TextSelection): void {
    try {
      this.hide(); // Hide any existing overlay
      
      this.currentSelection = selection;
      this.createOverlayContainer();
      
      if (this.overlayContainer && this.root) {
        this.root.render(
          <TranslationOverlay
            selection={selection}
            onClose={() => this.hide()}
            onAddToVocabulary={this.onAddToVocabulary}
          />
        );
      }
    } catch (error) {
      console.error('Failed to show translation overlay:', error);
      // Clean up on error
      this.hide();
    }
  }

  /**
   * Hide the current overlay
   */
  public hide(): void {
    try {
      if (this.root) {
        this.root.unmount();
        this.root = null;
      }
    } catch (error) {
      console.warn('Error unmounting React root:', error);
      this.root = null;
    }
    
    try {
      if (this.overlayContainer) {
        this.overlayContainer.remove();
        this.overlayContainer = null;
      }
    } catch (error) {
      console.warn('Error removing overlay container:', error);
      this.overlayContainer = null;
    }
    
    this.currentSelection = null;
  }

  /**
   * Check if overlay is currently visible
   */
  public isVisible(): boolean {
    return this.overlayContainer !== null;
  }

  /**
   * Get current selection
   */
  public getCurrentSelection(): TextSelection | null {
    return this.currentSelection;
  }

  /**
   * Create overlay container element
   */
  private createOverlayContainer(): void {
    this.overlayContainer = document.createElement('div');
    this.overlayContainer.id = 'transai-overlay-container';
    
    // Ensure overlay styles don't inherit from page
    this.overlayContainer.style.cssText = `
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      color: #000;
      direction: ltr;
    `;
    
    document.body.appendChild(this.overlayContainer);
    
    try {
      this.root = createRoot(this.overlayContainer);
    } catch (error) {
      console.error('Failed to create React root:', error);
      // Fallback: remove container if React root creation fails
      this.overlayContainer.remove();
      this.overlayContainer = null;
      throw error;
    }
  }

  /**
   * Clean up overlay manager
   */
  public destroy(): void {
    this.hide();
  }
}