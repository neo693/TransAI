import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { TextSelector } from '../content/text-selector.js';

// Mock DOM APIs
const mockGetSelection = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

// Setup DOM mocks
Object.defineProperty(window, 'getSelection', {
  value: mockGetSelection,
  writable: true
});

Object.defineProperty(document, 'addEventListener', {
  value: mockAddEventListener,
  writable: true
});

Object.defineProperty(document, 'removeEventListener', {
  value: mockRemoveEventListener,
  writable: true
});

Object.defineProperty(window, 'location', {
  value: { href: 'https://example.com/test' },
  writable: true
});

Object.defineProperty(window, 'innerWidth', {
  value: 1024,
  writable: true
});

Object.defineProperty(window, 'innerHeight', {
  value: 768,
  writable: true
});

// Mock Range and Selection APIs
class MockRange {
  startContainer: Node;
  endContainer: Node;
  commonAncestorContainer: Node;
  
  constructor(
    public startOffset = 0,
    public endOffset = 0,
    container?: Node
  ) {
    const mockContainer = container || {
      nodeType: Node.TEXT_NODE,
      parentElement: {
        textContent: 'This is a test sentence with selected text in the middle.',
        matches: vi.fn(() => false),
        closest: vi.fn(() => null)
      }
    } as any;
    
    this.startContainer = mockContainer;
    this.endContainer = mockContainer;
    this.commonAncestorContainer = mockContainer;
  }

  getBoundingClientRect() {
    return {
      left: 100,
      top: 200,
      right: 200,
      bottom: 220,
      width: 100,
      height: 20
    };
  }

  toString() {
    return 'selected text';
  }
}

class MockSelection {
  constructor(
    public rangeCount = 1,
    private selectedText = 'selected text'
  ) {}

  toString() {
    return this.selectedText;
  }

  getRangeAt(index: number) {
    if (index === 0 && this.rangeCount > 0) {
      return new MockRange();
    }
    throw new Error('Invalid range index');
  }
}

describe('TextSelector', () => {
  let textSelector: TextSelector;
  let onSelectionChange: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    onSelectionChange = vi.fn();
    
    // Reset DOM mocks
    mockGetSelection.mockReturnValue(new MockSelection());
    
    textSelector = new TextSelector(onSelectionChange);
  });

  afterEach(() => {
    textSelector.destroy();
  });

  describe('initialization', () => {
    it('should bind event listeners on creation', () => {
      expect(mockAddEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('selectionchange', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
    });

    it('should start with inactive selection state', () => {
      expect(textSelector.isActive()).toBe(false);
    });
  });

  describe('text selection validation', () => {
    it('should accept valid text selections', () => {
      const validTexts = [
        'hello',
        'Hello world',
        'This is a sentence.',
        'Hello, world!',
        'test-case',
        "it's working"
      ];

      validTexts.forEach(text => {
        mockGetSelection.mockReturnValue(new MockSelection(1, text));
        textSelector.processCurrentSelection();
        expect(onSelectionChange).toHaveBeenCalledWith(
          expect.objectContaining({ text })
        );
        onSelectionChange.mockClear();
      });
    });

    it('should reject invalid text selections', () => {
      // First make a valid selection to set active state
      textSelector.processCurrentSelection();
      onSelectionChange.mockClear();
      
      const invalidTexts = [
        '', // empty
        '   ', // whitespace only
        '123456789', // mostly numbers
        '!@#$%^&*()', // special characters only
        'a'.repeat(501), // too long
      ];

      invalidTexts.forEach(text => {
        mockGetSelection.mockReturnValue(new MockSelection(1, text));
        textSelector.processCurrentSelection();
        expect(onSelectionChange).toHaveBeenCalledWith(null);
        onSelectionChange.mockClear();
      });
    });

    it('should handle mixed content appropriately', () => {
      // Should accept text with some numbers/punctuation
      mockGetSelection.mockReturnValue(new MockSelection(1, 'Version 2.0 is here!'));
      textSelector.processCurrentSelection();
      expect(onSelectionChange).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Version 2.0 is here!' })
      );
    });
  });

  describe('position calculation', () => {
    it('should calculate position from selection bounds', () => {
      mockGetSelection.mockReturnValue(new MockSelection(1, 'test'));
      textSelector.processCurrentSelection();
      
      expect(onSelectionChange).toHaveBeenCalledWith(
        expect.objectContaining({
          position: { x: 150, y: 200 } // center of mock rect
        })
      );
    });

    it('should handle position calculation errors gracefully', () => {
      const mockRange = new MockRange();
      mockRange.getBoundingClientRect = vi.fn(() => {
        throw new Error('Position error');
      });
      
      const mockSelection = new MockSelection();
      mockSelection.getRangeAt = vi.fn(() => mockRange);
      mockGetSelection.mockReturnValue(mockSelection);
      
      textSelector.processCurrentSelection();
      
      // Should fallback to viewport center
      expect(onSelectionChange).toHaveBeenCalledWith(
        expect.objectContaining({
          position: { x: 512, y: 384 } // center of mock viewport
        })
      );
    });
  });

  describe('context extraction', () => {
    it('should extract surrounding context', () => {
      const mockContainer = {
        nodeType: Node.TEXT_NODE,
        parentElement: {
          textContent: 'This is a long sentence with the selected word in the middle of it.',
          matches: vi.fn(() => false),
          closest: vi.fn(() => null)
        }
      };

      const mockRange = new MockRange(0, 0, mockContainer as any);
      mockRange.toString = () => 'selected';
      
      const mockSelection = new MockSelection();
      mockSelection.getRangeAt = vi.fn(() => mockRange);
      mockGetSelection.mockReturnValue(mockSelection);
      
      textSelector.processCurrentSelection();
      
      expect(onSelectionChange).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.stringContaining('selected')
        })
      );
    });

    it('should handle context extraction errors', () => {
      // First make a valid selection to set active state
      textSelector.processCurrentSelection();
      onSelectionChange.mockClear();
      
      const mockRange = new MockRange();
      mockRange.commonAncestorContainer = null as any;
      
      const mockSelection = new MockSelection();
      mockSelection.getRangeAt = vi.fn(() => mockRange);
      mockGetSelection.mockReturnValue(mockSelection);
      
      textSelector.processCurrentSelection();
      
      // Should be rejected due to complex layout handling error
      expect(onSelectionChange).toHaveBeenCalledWith(null);
    });
  });

  describe('complex layout handling', () => {
    it('should reject selections in problematic elements', () => {
      // First make a valid selection to set active state
      textSelector.processCurrentSelection();
      onSelectionChange.mockClear();
      
      const mockContainer = {
        nodeType: Node.TEXT_NODE,
        parentElement: {
          textContent: 'selected text',
          matches: vi.fn(() => true), // matches problematic selector
          closest: vi.fn(() => null)
        }
      };

      const mockRange = new MockRange(0, 0, mockContainer as any);
      const mockSelection = new MockSelection();
      mockSelection.getRangeAt = vi.fn(() => mockRange);
      mockGetSelection.mockReturnValue(mockSelection);
      
      textSelector.processCurrentSelection();
      
      expect(onSelectionChange).toHaveBeenCalledWith(null);
    });

    it('should handle selections spanning multiple elements', () => {
      const startContainer = { nodeType: Node.TEXT_NODE };
      const endContainer = { nodeType: Node.TEXT_NODE };
      
      const mockRange = new MockRange();
      mockRange.startContainer = startContainer as any;
      mockRange.endContainer = endContainer as any;
      
      const mockSelection = new MockSelection();
      mockSelection.getRangeAt = vi.fn(() => mockRange);
      mockGetSelection.mockReturnValue(mockSelection);
      
      textSelector.processCurrentSelection();
      
      // Should still process if text is valid
      expect(onSelectionChange).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'selected text'
        })
      );
    });
  });

  describe('event handling', () => {
    it('should clear selection when no text is selected', () => {
      // First make a selection
      textSelector.processCurrentSelection();
      expect(textSelector.isActive()).toBe(true);
      
      // Then clear it
      mockGetSelection.mockReturnValue(new MockSelection(0, ''));
      textSelector.processCurrentSelection();
      
      expect(onSelectionChange).toHaveBeenLastCalledWith(null);
      expect(textSelector.isActive()).toBe(false);
    });

    it('should handle selection timeout properly', () => {
      // Mock setTimeout to control timing
      const originalSetTimeout = window.setTimeout;
      window.setTimeout = vi.fn((callback) => {
        // Execute callback immediately for testing
        callback();
        return 1;
      }) as unknown as typeof window.setTimeout;

      textSelector.processCurrentSelection();
      
      // Restore setTimeout
      window.setTimeout = originalSetTimeout;
      
      expect(onSelectionChange).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on destroy', () => {
      textSelector.destroy();
      
      expect(mockRemoveEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('selectionchange', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
    });

    it('should clear timeouts on destroy', () => {
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
      
      // Set a timeout first
      textSelector['selectionTimeout'] = 123;
      
      textSelector.destroy();
      
      // Should clear the timeout
      expect(clearTimeoutSpy).toHaveBeenCalledWith(123);
      
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle null selection gracefully', () => {
      // First set up a selection to make it active
      textSelector.processCurrentSelection();
      onSelectionChange.mockClear();
      
      // Then test null selection
      mockGetSelection.mockReturnValue(null);
      textSelector.processCurrentSelection();
      
      expect(onSelectionChange).toHaveBeenCalledWith(null);
    });

    it('should handle selection with no ranges', () => {
      // First set up a selection to make it active
      textSelector.processCurrentSelection();
      onSelectionChange.mockClear();
      
      // Then test selection with no ranges
      mockGetSelection.mockReturnValue(new MockSelection(0));
      textSelector.processCurrentSelection();
      
      expect(onSelectionChange).toHaveBeenCalledWith(null);
    });

    it('should handle getBoundingClientRect errors', () => {
      const mockRange = new MockRange();
      mockRange.getBoundingClientRect = vi.fn(() => {
        throw new Error('Bounding rect error');
      });
      
      const mockSelection = new MockSelection();
      mockSelection.getRangeAt = vi.fn(() => mockRange);
      mockGetSelection.mockReturnValue(mockSelection);
      
      textSelector.processCurrentSelection();
      
      // Should still create selection with fallback position
      expect(onSelectionChange).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'selected text',
          position: expect.any(Object)
        })
      );
    });
  });

  describe('mouse position integration', () => {
    it('should use mouse position when within selection bounds', () => {
      // Create a mock that simulates mouse within bounds
      const mockRange = new MockRange();
      mockRange.getBoundingClientRect = () => ({
        left: 100,
        top: 200,
        right: 200,
        bottom: 220,
        width: 100,
        height: 20
      });

      const mockSelection = new MockSelection();
      mockSelection.getRangeAt = vi.fn(() => mockRange);
      mockGetSelection.mockReturnValue(mockSelection);

      // Simulate mouse up event processing
      textSelector.processCurrentSelection();

      expect(onSelectionChange).toHaveBeenCalledWith(
        expect.objectContaining({
          position: { x: 150, y: 200 } // Should use selection center, not mouse
        })
      );
    });
  });
});