import { TextSelection } from '../types/index.js';

/**
 * TextSelector class handles mouse selection events and text extraction
 * for the TransAI browser extension content script
 */
export class TextSelector {
  private isSelectionActive = false;
  private selectionTimeout: number | null = null;
  private readonly SELECTION_DELAY = 300; // ms to wait after selection change

  constructor(
    private onSelectionChange: (selection: TextSelection | null) => void
  ) {
    this.bindEvents();
  }

  /**
   * Initialize event listeners for text selection
   */
  private bindEvents(): void {
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
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
   * Handle selection change events
   */
  private handleSelectionChange(): void {
    // Clear existing timeout
    if (this.selectionTimeout) {
      clearTimeout(this.selectionTimeout);
    }

    // Set new timeout to process selection after delay
    this.selectionTimeout = window.setTimeout(() => {
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

    // Validate selection (must be reasonable length and contain valid characters)
    if (!this.isValidSelection(selectedText)) {
      this.clearSelection();
      return;
    }

    const range = selection.getRangeAt(0);
    
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
    this.onSelectionChange(null);
  }

  /**
   * Validate if the selected text is appropriate for translation
   */
  private isValidSelection(text: string): boolean {
    // Check length constraints
    if (text.length < 1 || text.length > 500) {
      return false;
    }

    // Check if text contains mostly valid characters (letters, numbers, basic punctuation, unicode)
    const validCharRegex = /^[\w\s\-.,!?;:'"()[\]{}àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĬĭĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłŃńŅņŇňŉŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽž]+$/u;
    if (!validCharRegex.test(text)) {
      return false;
    }

    // Reject selections that are mostly numbers or special characters
    const letterCount = (text.match(/[a-zA-ZàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĬĭĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłŃńŅņŇňŉŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽž\u0400-\u04FF\u4e00-\u9fff]/g) || []).length;
    if (letterCount < text.length * 0.3) {
      return false;
    }

    return true;
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

  /**
   * Clean up event listeners
   */
  public destroy(): void {
    document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    document.removeEventListener('selectionchange', this.handleSelectionChange.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));
    
    if (this.selectionTimeout) {
      clearTimeout(this.selectionTimeout);
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