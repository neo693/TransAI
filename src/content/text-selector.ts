import { TextSelection } from '../types/index';

/**
 * TextSelector class handles mouse selection events and text extraction
 * for the TransAI browser extension content script
 */
export class TextSelector {
  private isSelectionActive = false;
  private selectionTimeout: number | null = null;
  private readonly SELECTION_DELAY = 500; // ms to wait after selection change (increased for better debouncing)
  private lastSelectionText = '';
  private debounceTimeout: number | null = null;

  constructor(
    private onSelectionChange: (selection: TextSelection | null) => void
  ) {
    this.bindEvents();
  }



  /**
   * Handle mouse up events to detect text selection
   */
  private handleMouseUp(event: MouseEvent): void {
    // Small delay to ensure selection is complete
    setTimeout(() => {
      this.processSelection(event);
    }, 50);
  }

  /**
   * Handle selection change events with debouncing
   */
  private handleSelectionChange(): void {
    // Clear existing timeouts
    if (this.selectionTimeout) {
      clearTimeout(this.selectionTimeout);
    }
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    // Debounce selection processing to avoid excessive API calls
    this.debounceTimeout = window.setTimeout(() => {
      this.processSelection();
    }, this.SELECTION_DELAY);
  }

  /**
   * Handle keyboard events that might affect selection
   */
  private handleKeyUp(event: KeyboardEvent): void {
    // Handle Ctrl+A, Shift+Arrow keys, etc.
    if (event.ctrlKey || event.shiftKey || event.key.includes('Arrow')) {
      setTimeout(() => {
        this.processSelection();
      }, 50);
    }
  }

  /**
   * Process current text selection and extract relevant data
   */
  private processSelection(mouseEvent?: MouseEvent): void {
    const selection = window.getSelection();
    
    if (!selection || selection.rangeCount === 0) {
      this.clearSelection();
      return;
    }

    const selectedText = selection.toString().trim();
    
    if (!selectedText || selectedText.length === 0) {
      this.clearSelection();
      return;
    }

    // Avoid processing the same selection multiple times
    if (selectedText === this.lastSelectionText) {
      return;
    }
    
    this.lastSelectionText = selectedText;

    // Validate selection (must be reasonable length and contain valid characters)
    if (!this.isValidSelection(selectedText)) {
      this.clearSelection();
      return;
    }

    const range = selection.getRangeAt(0);
    
    // Check if selection is within TransAI overlay - if so, ignore it
    if (this.isSelectionInOverlay(range)) {
      this.clearSelection();
      return;
    }
    
    // Handle complex layouts and problematic elements
    if (!this.handleComplexLayouts(range)) {
      this.clearSelection();
      return;
    }

    const position = this.calculateOverlayPosition(range, mouseEvent);
    const context = this.extractContext(range);

    const textSelection: TextSelection = {
      text: selectedText,
      position,
      context,
      url: window.location.href
    };

    this.isSelectionActive = true;
    this.onSelectionChange(textSelection);
  }

  /**
   * Clear current selection state
   */
  private clearSelection(): void {
    if (this.isSelectionActive) {
      this.isSelectionActive = false;
    }
    this.lastSelectionText = '';
    this.onSelectionChange(null);
  }

  /**
   * Validate if the selected text is appropriate for translation
   */
  private isValidSelection(text: string): boolean {
    try {
      // Check length constraints
      if (text.length < 1 || text.length > 500) {
        return false;
      }

      // Simplified validation - check if text contains letters
      const hasLetters = /[a-zA-Z\u00C0-\u017F\u0400-\u04FF\u4e00-\u9fff]/.test(text);
      if (!hasLetters) {
        return false;
      }

      // Check if text is not just whitespace or special characters
      const trimmedText = text.trim();
      if (trimmedText.length === 0) {
        return false;
      }

      // Reject selections that are mostly numbers or special characters
      const letterCount = (text.match(/[a-zA-Z\u00C0-\u017F\u0400-\u04FF\u4e00-\u9fff]/g) || []).length;
      if (letterCount < text.length * 0.2) {
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Error validating selection:', error);
      return false;
    }
  }

  /**
   * Check if selection is within TransAI overlay elements
   */
  private isSelectionInOverlay(range: Range): boolean {
    try {
      const container = range.commonAncestorContainer;
      const element = container.nodeType === Node.TEXT_NODE 
        ? container.parentElement 
        : container as Element;

      if (!element) {
        return false;
      }

      // Check if selection is within any TransAI overlay elements
      const transaiElements = [
        '#transai-overlay-container',
        '.transai-simple-overlay',
        '.transai-overlay',
        '[id^="transai-"]',
        '[class*="transai-"]',
        '[data-transai-overlay]'
      ];

      for (const selector of transaiElements) {
        if (element.matches?.(selector) || element.closest?.(selector)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.warn('Error checking overlay selection:', error);
      return false;
    }
  }

  /**
   * Calculate optimal position for translation overlay
   */
  private calculateOverlayPosition(
    range: Range, 
    mouseEvent?: MouseEvent
  ): { x: number; y: number } {
    try {
      // Get bounding rectangle of selected text
      const rect = range.getBoundingClientRect();
      
      // Use mouse position if available and within selection bounds
      if (mouseEvent && this.isMouseInSelection(mouseEvent, rect)) {
        return {
          x: mouseEvent.clientX,
          y: mouseEvent.clientY
        };
      }

      // Default to center of selection
      return {
        x: rect.left + rect.width / 2,
        y: rect.top
      };
    } catch (error) {
      console.warn('Error calculating overlay position:', error);
      
      // Fallback to mouse position or viewport center
      if (mouseEvent) {
        return { x: mouseEvent.clientX, y: mouseEvent.clientY };
      }
      
      return {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      };
    }
  }

  /**
   * Check if mouse position is within selection bounds
   */
  private isMouseInSelection(mouseEvent: MouseEvent, selectionRect: DOMRect): boolean {
    return (
      mouseEvent.clientX >= selectionRect.left &&
      mouseEvent.clientX <= selectionRect.right &&
      mouseEvent.clientY >= selectionRect.top &&
      mouseEvent.clientY <= selectionRect.bottom
    );
  }

  /**
   * Extract surrounding context for better translation
   */
  private extractContext(range: Range): string {
    try {
      const container = range.commonAncestorContainer;
      const containerElement = container.nodeType === Node.TEXT_NODE 
        ? container.parentElement 
        : container as Element;

      if (!containerElement) {
        return '';
      }

      // Get text content from the containing element
      const fullText = containerElement.textContent || '';
      const selectedText = range.toString();
      
      // Find the position of selected text within the container
      const selectedIndex = fullText.indexOf(selectedText);
      
      if (selectedIndex === -1) {
        return fullText.slice(0, 200); // Fallback to first 200 chars
      }

      // Extract context around the selection (50 chars before and after)
      const contextStart = Math.max(0, selectedIndex - 50);
      const contextEnd = Math.min(fullText.length, selectedIndex + selectedText.length + 50);
      
      let context = fullText.slice(contextStart, contextEnd);
      
      // Add ellipsis if we truncated
      if (contextStart > 0) {
        context = '...' + context;
      }
      if (contextEnd < fullText.length) {
        context = context + '...';
      }

      return context;
    } catch (error) {
      console.warn('Error extracting context:', error);
      return '';
    }
  }

  /**
   * Handle edge cases for complex page layouts
   */
  private handleComplexLayouts(range: Range): boolean {
    try {
      // Check if selection spans multiple elements
      const startContainer = range.startContainer;
      const endContainer = range.endContainer;
      
      if (startContainer !== endContainer) {
        // Selection spans multiple elements - validate it's still coherent
        const selectedText = range.toString();
        return this.isValidSelection(selectedText);
      }

      // Check if we're inside problematic elements
      const problematicSelectors = [
        'script', 'style', 'noscript', 'iframe', 'object', 'embed',
        '[contenteditable="false"]', '.no-translate', '[translate="no"]'
      ];

      const container = range.commonAncestorContainer;
      const element = container.nodeType === Node.TEXT_NODE 
        ? container.parentElement 
        : container as Element;

      if (element) {
        for (const selector of problematicSelectors) {
          if (element.matches?.(selector) || element.closest?.(selector)) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.warn('Error handling complex layouts:', error);
      return false;
    }
  }

  // Store bound methods for proper cleanup
  private boundHandleMouseUp = this.handleMouseUp.bind(this);
  private boundHandleSelectionChange = this.handleSelectionChange.bind(this);
  private boundHandleKeyUp = this.handleKeyUp.bind(this);

  /**
   * Initialize event listeners for text selection
   */
  private bindEvents(): void {
    try {
      document.addEventListener('mouseup', this.boundHandleMouseUp);
      document.addEventListener('selectionchange', this.boundHandleSelectionChange);
      document.addEventListener('keyup', this.boundHandleKeyUp);
    } catch (error) {
      console.error('Failed to bind text selection events:', error);
    }
  }

  /**
   * Clean up event listeners
   */
  public destroy(): void {
    try {
      document.removeEventListener('mouseup', this.boundHandleMouseUp);
      document.removeEventListener('selectionchange', this.boundHandleSelectionChange);
      document.removeEventListener('keyup', this.boundHandleKeyUp);
    } catch (error) {
      console.warn('Error removing event listeners:', error);
    }
    
    if (this.selectionTimeout) {
      clearTimeout(this.selectionTimeout);
      this.selectionTimeout = null;
    }
    
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
  }

  /**
   * Get current selection state
   */
  public isActive(): boolean {
    return this.isSelectionActive;
  }

  /**
   * Manually trigger selection processing (for testing)
   */
  public processCurrentSelection(): void {
    this.processSelection();
  }
}