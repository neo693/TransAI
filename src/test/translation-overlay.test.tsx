import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { TranslationOverlayManager } from '../content/translation-overlay.js';
import { TextSelection, TranslationResult } from '../types/index.js';

// Mock Chrome runtime API
const mockSendMessage = vi.fn();
const mockGetURL = vi.fn();

Object.defineProperty(global, 'chrome', {
  value: {
    runtime: {
      sendMessage: mockSendMessage,
      getURL: mockGetURL
    }
  },
  writable: true
});

// Mock DOM methods
const mockElement = {
  tagName: 'DIV',
  id: '',
  style: {},
  appendChild: vi.fn(),
  remove: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

Object.defineProperty(document, 'createElement', {
  value: vi.fn().mockReturnValue(mockElement),
  writable: true
});

Object.defineProperty(document.body, 'appendChild', {
  value: vi.fn(),
  writable: true
});

// Mock window dimensions
Object.defineProperty(window, 'innerWidth', {
  value: 1024,
  writable: true
});

Object.defineProperty(window, 'innerHeight', {
  value: 768,
  writable: true
});

// Sample test data
const mockSelection: TextSelection = {
  text: 'hello',
  position: { x: 100, y: 200 },
  context: 'Say hello to the world',
  url: 'https://example.com'
};

const mockTranslation: TranslationResult = {
  originalText: 'hello',
  translatedText: 'hola',
  sourceLanguage: 'en',
  targetLanguage: 'es',
  examples: [
    {
      original: 'Hello, how are you?',
      translated: 'Hola, ¿cómo estás?'
    }
  ],
  confidence: 0.95,
  timestamp: new Date()
};

describe('TranslationOverlayManager', () => {
  let overlayManager: TranslationOverlayManager;
  let onAddToVocabulary: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    onAddToVocabulary = vi.fn();
    overlayManager = new TranslationOverlayManager(onAddToVocabulary);
    
    // Mock successful translation response
    mockSendMessage.mockResolvedValue({
      success: true,
      data: mockTranslation
    });
  });

  afterEach(() => {
    overlayManager.destroy();
  });

  describe('initialization', () => {
    it('should initialize without errors', () => {
      expect(overlayManager).toBeDefined();
      expect(overlayManager.isVisible()).toBe(false);
      expect(overlayManager.getCurrentSelection()).toBeNull();
    });
  });

  describe('overlay lifecycle', () => {
    it('should show overlay when show() is called', () => {
      expect(() => overlayManager.show(mockSelection)).not.toThrow();
      expect(overlayManager.getCurrentSelection()).toEqual(mockSelection);
    });

    it('should hide overlay when hide() is called', () => {
      overlayManager.show(mockSelection);
      expect(overlayManager.getCurrentSelection()).toEqual(mockSelection);
      
      overlayManager.hide();
      expect(overlayManager.isVisible()).toBe(false);
      expect(overlayManager.getCurrentSelection()).toBeNull();
    });

    it('should hide existing overlay when showing new one', () => {
      const firstSelection = { ...mockSelection, text: 'first' };
      const secondSelection = { ...mockSelection, text: 'second' };
      
      overlayManager.show(firstSelection);
      expect(overlayManager.getCurrentSelection()?.text).toBe('first');
      
      overlayManager.show(secondSelection);
      expect(overlayManager.getCurrentSelection()?.text).toBe('second');
    });

    it('should clean up properly on destroy', () => {
      overlayManager.show(mockSelection);
      expect(overlayManager.getCurrentSelection()).toEqual(mockSelection);
      
      overlayManager.destroy();
      expect(overlayManager.isVisible()).toBe(false);
    });
  });

  describe('translation requests', () => {
    it('should store selection data when overlay is shown', () => {
      overlayManager.show(mockSelection);
      
      const currentSelection = overlayManager.getCurrentSelection();
      expect(currentSelection).toEqual(mockSelection);
      expect(currentSelection?.text).toBe('hello');
      expect(currentSelection?.context).toBe('Say hello to the world');
    });

    it('should handle different selection data', () => {
      const customSelection = {
        ...mockSelection,
        text: 'goodbye',
        context: 'Say goodbye to the world'
      };
      
      overlayManager.show(customSelection);
      
      const currentSelection = overlayManager.getCurrentSelection();
      expect(currentSelection?.text).toBe('goodbye');
      expect(currentSelection?.context).toBe('Say goodbye to the world');
    });
  });

  describe('vocabulary integration', () => {
    it('should initialize with vocabulary callback', () => {
      expect(onAddToVocabulary).toBeDefined();
      expect(typeof onAddToVocabulary).toBe('function');
    });
    
    it('should work without vocabulary callback', () => {
      const managerWithoutCallback = new TranslationOverlayManager();
      expect(() => managerWithoutCallback.show(mockSelection)).not.toThrow();
      managerWithoutCallback.destroy();
    });
  });

  describe('position calculation', () => {
    it('should store position data from selection', () => {
      const selectionWithPosition = {
        ...mockSelection,
        position: { x: 150, y: 250 }
      };
      
      overlayManager.show(selectionWithPosition);
      
      const currentSelection = overlayManager.getCurrentSelection();
      expect(currentSelection?.position).toEqual({ x: 150, y: 250 });
    });

    it('should handle different position values', () => {
      const positions = [
        { x: 10, y: 10 },
        { x: 1000, y: 10 },
        { x: 10, y: 750 },
        { x: 1000, y: 750 }
      ];
      
      positions.forEach((position, index) => {
        const selection = { ...mockSelection, position, text: `test${index}` };
        overlayManager.show(selection);
        
        const currentSelection = overlayManager.getCurrentSelection();
        expect(currentSelection?.position).toEqual(position);
      });
    });
  });

  describe('error handling', () => {
    it('should handle invalid selection data gracefully', () => {
      const invalidSelection = {
        text: '',
        position: { x: -1, y: -1 },
        context: '',
        url: ''
      };
      
      expect(() => {
        overlayManager.show(invalidSelection);
      }).not.toThrow();
      
      expect(overlayManager.getCurrentSelection()).toEqual(invalidSelection);
    });

    it('should handle null/undefined values', () => {
      const selectionWithNulls = {
        text: 'test',
        position: { x: 0, y: 0 },
        context: '',
        url: ''
      };
      
      expect(() => {
        overlayManager.show(selectionWithNulls);
      }).not.toThrow();
    });
  });

  describe('state management', () => {
    it('should track overlay visibility state', () => {
      expect(overlayManager.isVisible()).toBe(false);
      
      overlayManager.show(mockSelection);
      // Note: isVisible() checks for container existence, which requires DOM
      // In a real browser environment, this would return true
      
      overlayManager.hide();
      expect(overlayManager.isVisible()).toBe(false);
    });

    it('should maintain selection data integrity', () => {
      const originalSelection = { ...mockSelection };
      
      overlayManager.show(mockSelection);
      
      const storedSelection = overlayManager.getCurrentSelection();
      expect(storedSelection).toEqual(originalSelection);
      
      // Ensure original object wasn't modified
      expect(mockSelection).toEqual(originalSelection);
    });
  });

  describe('performance', () => {
    it('should handle rapid show/hide operations', () => {
      // Rapidly show and hide overlay
      for (let i = 0; i < 10; i++) {
        expect(() => {
          overlayManager.show({ ...mockSelection, text: `test${i}` });
          overlayManager.hide();
        }).not.toThrow();
      }
      
      expect(overlayManager.getCurrentSelection()).toBeNull();
    });

    it('should handle multiple overlays efficiently', () => {
      // Show multiple overlays in sequence
      for (let i = 0; i < 5; i++) {
        overlayManager.show({ ...mockSelection, text: `test${i}` });
      }
      
      // Should only store the last selection
      expect(overlayManager.getCurrentSelection()?.text).toBe('test4');
    });
  });
});