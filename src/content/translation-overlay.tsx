import React, { useState, useEffect, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { TranslationResult, TextSelection, LanguageCode } from '../types/index.js';
import { PronunciationButton } from '../components/pronunciation-button.js';

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

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

      // Send message to background script for translation
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE_TEXT',
        payload: {
          text: selection.text,
          context: selection.context,
          sourceUrl: selection.url
        }
      });

      if (response.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          translation: response.data,
          error: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Translation failed'
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

      const response = await chrome.runtime.sendMessage({
        type: 'CHECK_VOCABULARY',
        payload: { word: selection.text }
      });

      if (response.success) {
        setState(prev => ({
          ...prev,
          vocabularyStatus: response.data.exists ? 'exists' : 'none',
          vocabularyMessage: response.data.exists ? 'Already in vocabulary' : null
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

      const response = await chrome.runtime.sendMessage({
        type: 'ADD_TO_VOCABULARY',
        payload: {
          word: selection.text,
          translation: state.translation.translatedText,
          context: selection.context,
          sourceUrl: selection.url
        }
      });

      if (response.success) {
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
        const errorMessage = response.error === 'WORD_EXISTS' 
          ? 'Word already in vocabulary'
          : response.error || 'Failed to add to vocabulary';
          
        setState(prev => ({
          ...prev,
          vocabularyStatus: response.error === 'WORD_EXISTS' ? 'exists' : 'error',
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
      className="transai-overlay bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-700">TransAI</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close translation"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Selected text */}
      <div className="mb-3">
        <div className="text-xs text-gray-500 mb-1">Selected text:</div>
        <div className="text-sm font-medium text-gray-900 bg-gray-50 rounded px-2 py-1">
          {selection.text}
        </div>
      </div>

      {/* Loading state */}
      {state.isLoading && (
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-600">Translating...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {state.error && !state.isLoading && (
        <div className="py-4">
          <div className="text-sm text-red-600 mb-3">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Translation failed</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">{state.error}</div>
          </div>
          <button
            onClick={handleRetry}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-3 rounded transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Translation result */}
      {state.translation && !state.isLoading && (
        <div className="space-y-3">
          {/* Original word with pronunciation */}
          <div>
            <div className="text-xs text-gray-500 mb-1">Original:</div>
            <div className="flex items-center space-x-2 text-sm text-gray-900 bg-gray-50 rounded px-2 py-2">
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
            <div className="text-xs text-gray-500 mb-1">Translation:</div>
            <div className="flex items-center space-x-2 text-sm text-gray-900 bg-blue-50 rounded px-2 py-2">
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
              <div className="text-xs text-gray-500 mb-1">Example:</div>
              <div className="text-xs text-gray-700 bg-gray-50 rounded px-2 py-1">
                {state.translation.examples[0].translated}
              </div>
            </div>
          )}

          {/* Vocabulary Status */}
          {state.vocabularyMessage && (
            <div className={`text-xs p-2 rounded mb-2 ${
              state.vocabularyStatus === 'added' 
                ? 'bg-green-100 text-green-700 border border-green-200'
                : state.vocabularyStatus === 'exists'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}>
              <div className="flex items-center space-x-1">
                {state.vocabularyStatus === 'added' && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {state.vocabularyStatus === 'exists' && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {state.vocabularyStatus === 'error' && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span>{state.vocabularyMessage}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2 pt-2">
            {onAddToVocabulary && (
              <button
                onClick={handleAddToVocabulary}
                disabled={state.vocabularyStatus === 'adding' || state.vocabularyStatus === 'exists' || state.vocabularyStatus === 'added'}
                className={`flex-1 text-white text-xs py-2 px-3 rounded transition-colors flex items-center justify-center space-x-1 ${
                  state.vocabularyStatus === 'adding'
                    ? 'bg-gray-400 cursor-not-allowed'
                    : state.vocabularyStatus === 'exists' || state.vocabularyStatus === 'added'
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {state.vocabularyStatus === 'adding' ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    <span>Adding...</span>
                  </>
                ) : state.vocabularyStatus === 'checking' ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    <span>Checking...</span>
                  </>
                ) : state.vocabularyStatus === 'exists' ? (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>In Vocabulary</span>
                  </>
                ) : state.vocabularyStatus === 'added' ? (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Added!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add to Vocabulary</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-xs py-2 px-3 rounded transition-colors"
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
  }

  /**
   * Hide the current overlay
   */
  public hide(): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    
    if (this.overlayContainer) {
      this.overlayContainer.remove();
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
    this.root = createRoot(this.overlayContainer);
  }

  /**
   * Clean up overlay manager
   */
  public destroy(): void {
    this.hide();
  }
}