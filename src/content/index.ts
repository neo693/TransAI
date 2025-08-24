// Content script for TransAI extension
import { TextSelector } from './text-selector.js';
import { TranslationOverlayManager } from './translation-overlay.js';
import { TextSelection } from '../types/index.js';

console.log('TransAI content script loaded');

let textSelector: TextSelector | null = null;
let overlayManager: TranslationOverlayManager | null = null;

// Initialize content script
function initializeContentScript() {
  console.log('Initializing TransAI content script on:', window.location.href);
  
  // Load content script styles
  loadContentStyles();
  
  // Test communication with background script
  chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
    if (response?.success) {
      console.log('Content script connected to background service worker');
      
      // Initialize text selection and overlay handling
      initializeTextSelection();
      initializeOverlayManager();
    }
  });
}

// Load content script styles
function loadContentStyles() {
  const styleId = 'transai-content-styles';
  
  // Check if styles are already loaded
  if (document.getElementById(styleId)) {
    return;
  }
  
  const link = document.createElement('link');
  link.id = styleId;
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('content/styles.css');
  
  // Insert styles into head or document element
  const target = document.head || document.documentElement;
  target.appendChild(link);
}

// Initialize text selection functionality
function initializeTextSelection() {
  if (textSelector) {
    textSelector.destroy();
  }
  
  textSelector = new TextSelector(handleSelectionChange);
  console.log('Text selection handler initialized');
}

// Initialize overlay manager
function initializeOverlayManager() {
  if (overlayManager) {
    overlayManager.destroy();
  }
  
  overlayManager = new TranslationOverlayManager(handleAddToVocabulary);
  console.log('Translation overlay manager initialized');
}

// Handle text selection changes
function handleSelectionChange(selection: TextSelection | null) {
  if (selection) {
    console.log('Text selected:', selection.text);
    
    // Show translation overlay
    if (overlayManager) {
      overlayManager.show(selection);
    }
  } else {
    console.log('Selection cleared');
    
    // Hide translation overlay
    if (overlayManager) {
      overlayManager.hide();
    }
  }
}

// Handle adding words to vocabulary
function handleAddToVocabulary(word: string, translation: string) {
  console.log('Adding to vocabulary:', word, '->', translation);
  
  // Send message to background script to add to vocabulary
  chrome.runtime.sendMessage({
    type: 'ADD_TO_VOCABULARY',
    payload: {
      word,
      translation,
      context: overlayManager?.getCurrentSelection()?.context || '',
      sourceUrl: window.location.href
    }
  }).then((response) => {
    if (response?.success) {
      console.log('Word added to vocabulary successfully');
      // TODO: Show success feedback (will be implemented in next subtask)
    } else {
      console.error('Failed to add word to vocabulary:', response?.error);
      // TODO: Show error feedback (will be implemented in next subtask)
    }
  }).catch((error) => {
    console.error('Error adding word to vocabulary:', error);
  });
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (textSelector) {
    textSelector.destroy();
    textSelector = null;
  }
  
  if (overlayManager) {
    overlayManager.destroy();
    overlayManager = null;
  }
});

// Handle page navigation (for SPAs)
let currentUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    console.log('Page navigation detected, reinitializing...');
    
    // Small delay to ensure page is ready
    setTimeout(() => {
      initializeContentScript();
    }, 100);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}

export {};