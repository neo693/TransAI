// Simple translation overlay without React
import { MessageType, TextSelection, TranslationResult, UserConfig } from '../types/index';

export class SimpleTranslationOverlay {
  private overlayElement: HTMLDivElement | null = null;
  private currentSelection: TextSelection | null = null;

  constructor(
    private onAddToVocabulary?: (word: string, translation: string) => void,
    private onClose?: () => void
  ) { }

  show(selection: TextSelection): void {
    try {
      console.log('[SimpleOverlay] Showing overlay for selection:', selection);
      this.hide(); // Hide any existing overlay
      this.currentSelection = selection;
      this.createOverlay(selection);
      this.requestTranslation(selection).catch(error => {
        console.error('[SimpleOverlay] Translation request failed:', error);
        // Still show the overlay even if translation fails
        if (this.overlayElement) {
          this.showError(error instanceof Error ? error.message : 'Translation failed');
        }
      });
    } catch (error) {
      console.error('[SimpleOverlay] Failed to show translation overlay:', error);
      // Ensure cleanup on error
      this.hide();
    }
  }

  hide(): void {
    if (this.overlayElement) {
      console.log('[SimpleOverlay] Hiding overlay');
      try {
        if (document.body.contains(this.overlayElement)) {
          this.overlayElement.remove();
        }
      } catch (error) {
        console.error('[SimpleOverlay] Error removing overlay:', error);
      }
      this.overlayElement = null;
    }
    this.currentSelection = null;

    // Call close callback if provided
    if (this.onClose) {
      try {
        this.onClose();
      } catch (error) {
        console.error('[SimpleOverlay] Error in close callback:', error);
      }
    }
  }

  private createOverlay(selection: TextSelection): void {
    // Create overlay container
    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'transai-simple-overlay';
    this.overlayElement.setAttribute('data-transai-overlay', 'true');

    // Calculate position
    const { x, y } = selection.position;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const overlayWidth = 320;
    const overlayHeight = 200;

    let left = x - overlayWidth / 2;
    let top = y - overlayHeight - 10;

    if (left < 10) left = 10;
    else if (left + overlayWidth > viewportWidth - 10) left = viewportWidth - overlayWidth - 10;

    if (top < 10) top = y + 30;
    if (top + overlayHeight > viewportHeight - 10) top = viewportHeight - overlayHeight - 10;

    // Set styles
    this.overlayElement.style.cssText = `
      position: fixed;
      left: ${left}px;
      top: ${top}px;
      width: ${overlayWidth}px;
      min-height: 120px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      padding: 16px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      color: #000;
      opacity: 0;
      transform: scale(0.8);
      transition: all 0.2s ease-out;
      pointer-events: auto;
      isolation: isolate;
    `;

    // Create content
    this.overlayElement.innerHTML = `
      <div class="transai-overlay-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 8px; height: 8px; background: #3b82f6; border-radius: 50%;"></div>
          <span style="font-size: 12px; font-weight: 500; color: #374151;">TransAI</span>
        </div>
        <button class="transai-close-btn" style="background: none; border: none; color: #9ca3af; cursor: pointer; padding: 4px;">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <div class="transai-selected-text" style="margin-bottom: 12px;">
        <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">Selected text:</div>
        <div style="font-size: 13px; font-weight: 500; color: #111827; background: #f9fafb; padding: 8px; border-radius: 4px; display: flex; align-items: center; justify-content: space-between;">
          ${this.escapeHtml(selection.text)}
        </div>
      </div>
      
      <div class="transai-content">
        <div class="transai-loading" style="display: flex; align-items: center; justify-content: center; padding: 24px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top: 2px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <span style="font-size: 13px; color: #6b7280;">Translating...</span>
          </div>
        </div>
      </div>
    `;

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .transai-simple-overlay button:hover {
        color: #374151 !important;
      }
    `;
    document.head.appendChild(style);

    // Add event listeners
    const closeBtn = this.overlayElement.querySelector('.transai-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Handle clicks outside overlay
    const handleClickOutside = (event: MouseEvent) => {
      if (this.overlayElement && !this.overlayElement.contains(event.target as Node)) {
        this.hide();
        document.removeEventListener('mousedown', handleClickOutside);
      }
    };
    // Use setTimeout to avoid immediate closing if the click that triggered the overlay is still propagating
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    // Handle escape key
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.hide();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Append to body
    document.body.appendChild(this.overlayElement);
    console.log('[SimpleOverlay] Overlay element appended to body');

    // Show with animation
    requestAnimationFrame(() => {
      if (this.overlayElement && document.body.contains(this.overlayElement)) {
        this.overlayElement.style.opacity = '1';
        this.overlayElement.style.transform = 'scale(1)';
        console.log('[SimpleOverlay] Overlay animation triggered');
      } else {
        console.warn('[SimpleOverlay] Overlay element was removed before animation');
      }
    });
  }

  private async requestTranslation(selection: TextSelection): Promise<void> {
    try {
      console.log('[SimpleOverlay] Requesting translation for:', selection.text);

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Translation request timeout')), 10000);
      });

      // Get config to find default target language
      const configPromise = chrome.runtime.sendMessage({
        id: `get_config_${Date.now()}`,
        type: MessageType.GET_CONFIG,
        timestamp: Date.now()
      });

      const configResponse = await Promise.race([configPromise, timeoutPromise]) as any;

      if (!configResponse || !configResponse.payload) {
        throw new Error('Failed to get configuration');
      }

      const config: UserConfig = configResponse.payload.data;
      const targetLanguage = config?.defaultTargetLanguage || 'en';

      const translateMessage = {
        id: `translate_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        type: MessageType.TRANSLATE_TEXT,
        timestamp: Date.now(),
        payload: {
          text: selection.text,
          options: {
            targetLanguage,
            sourceLanguage: 'auto',
            context: selection.context
          }
        }
      };

      console.log('[SimpleOverlay] Sending translation message:', translateMessage);

      const translatePromise = chrome.runtime.sendMessage(translateMessage);
      const response = await Promise.race([translatePromise, timeoutPromise]) as any;

      console.log('[SimpleOverlay] Translation response:', response);

      if (!response) {
        throw new Error('No response from translation service');
      }

      if (response.type === MessageType.TRANSLATION_RESULT) {
        this.showTranslationResult(response.payload.result);
      } else if (response.type === MessageType.SUCCESS && response.payload.data) {
        this.showTranslationResult(response.payload.data);
      } else if (response.type === MessageType.ERROR) {
        this.showError(response.payload?.error || 'Translation failed');
      } else {
        this.showError('Unexpected response format');
      }
    } catch (error) {
      console.error('[SimpleOverlay] Translation request failed:', error);
      // Check if overlay still exists before showing error
      if (this.overlayElement) {
        this.showError(error instanceof Error ? error.message : 'Translation failed');
      }
    }
  }

  private showTranslationResult(result: TranslationResult): void {
    if (!this.overlayElement) return;

    const contentDiv = this.overlayElement.querySelector('.transai-content');
    if (!contentDiv) return;

    // Add speaker button to original text (only if not already added)
    const selectedTextDiv = this.overlayElement.querySelector('.transai-selected-text div:last-child');
    if (selectedTextDiv && !selectedTextDiv.querySelector('.transai-play-btn')) {
      const playBtn = this.createPronunciationButton(result.originalText, result.sourceLanguage);
      selectedTextDiv.appendChild(playBtn);
    }

    // Check if the text is a sentence (contains multiple words)
    const isSentence = result.originalText.trim().split(/\s+/).length > 1;
    const showAddToVocab = this.onAddToVocabulary && !isSentence;

    contentDiv.innerHTML = `
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">Translation:</div>
        <div class="transai-translation-text" style="display: flex; align-items: center; justify-content: space-between; font-size: 14px; font-weight: 500; color: #111827; background: #dbeafe; padding: 8px; border-radius: 4px;">
          <span>${this.escapeHtml(result.translatedText)}</span>
        </div>
      </div>
      
      ${result.examples && result.examples.length > 0 ? `
        <div style="margin-bottom: 12px;">
          <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">Example:</div>
          <div style="font-size: 12px; color: #374151; background: #f9fafb; padding: 6px; border-radius: 4px;">
            ${this.escapeHtml(result.examples[0].translated)}
          </div>
        </div>
      ` : ''}
      
      <div style="display: flex; gap: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
        ${showAddToVocab ? `
          <button class="transai-add-vocab-btn" style="flex: 1; background: #10b981; color: white; border: none; padding: 8px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">
            Add to Vocabulary
          </button>
        ` : ''}
        <button class="transai-close-final-btn" style="flex: 1; background: #6b7280; color: white; border: none; padding: 8px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;text-align: center;">
          Close
        </button>
      </div>
    `;

    // Add speaker button to translated text
    // const translatedTextDiv = contentDiv.querySelector('.transai-translation-text');
    // if (translatedTextDiv) {
    //   const playBtn = this.createPronunciationButton(result.translatedText, result.targetLanguage);
    //   translatedTextDiv.appendChild(playBtn);
    // }

    // Add event listeners for new buttons
    const addVocabBtn = contentDiv.querySelector('.transai-add-vocab-btn');
    if (addVocabBtn && this.onAddToVocabulary && this.currentSelection) {
      addVocabBtn.addEventListener('click', () => {
        if (this.onAddToVocabulary && this.currentSelection) {
          this.onAddToVocabulary(this.currentSelection.text, result.translatedText);
          this.hide();
        }
      });
    }

    const closeFinalBtn = contentDiv.querySelector('.transai-close-final-btn');
    if (closeFinalBtn) {
      closeFinalBtn.addEventListener('click', () => this.hide());
    }
  }

  private showError(error: string): void {
    if (!this.overlayElement) return;

    const contentDiv = this.overlayElement.querySelector('.transai-content');
    if (!contentDiv) return;

    contentDiv.innerHTML = `
      <div style="padding: 16px; text-align: center;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; color: #dc2626; margin-bottom: 8px;">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span style="font-size: 13px; font-weight: 500;">Translation failed</span>
        </div>
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 12px;">${this.escapeHtml(error)}</div>
        <button class="transai-retry-btn" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">
          Try Again
        </button>
      </div>
    `;

    const retryBtn = contentDiv.querySelector('.transai-retry-btn');
    if (retryBtn && this.currentSelection) {
      retryBtn.addEventListener('click', () => {
        if (this.currentSelection) {
          this.requestTranslation(this.currentSelection);
        }
      });
    }
  }

  private createPronunciationButton(word: string, language: string): HTMLButtonElement {
    const playBtn = document.createElement('button');
    playBtn.className = 'transai-play-btn';
    playBtn.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #3b82f6;
      border: none;
      color: white;
      cursor: pointer;
      transition: background-color 0.2s;
      flex-shrink: 0;
    `;
    playBtn.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="90%" height="90%">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      </svg>
    `;

    playBtn.addEventListener('mouseenter', () => {
      playBtn.style.background = '#2563eb';
    });

    playBtn.addEventListener('mouseleave', () => {
      playBtn.style.background = '#3b82f6';
    });

    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('Playing pronunciation:', word, language);
      chrome.runtime.sendMessage({
        id: `play_audio_${Date.now()}`,
        type: MessageType.PLAY_PRONUNCIATION,
        timestamp: Date.now(),
        payload: {
          word,
          language
        }
      }).then(response => {
        console.log('Pronunciation response:', response);
      }).catch(error => {
        console.error('Pronunciation error:', error);
      });
    });

    return playBtn;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getCurrentSelection(): TextSelection | null {
    return this.currentSelection;
  }

  isVisible(): boolean {
    return this.overlayElement !== null;
  }

  destroy(): void {
    this.hide();
  }
}