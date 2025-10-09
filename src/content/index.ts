// Content script for TransAI extension
import { TextSelector } from './text-selector';
import { SimpleTranslationOverlay } from './simple-overlay';
import { TextSelection } from '../types/index';

console.log('TransAI content script loaded');

let textSelector: TextSelector | null = null;
let overlayManager: SimpleTranslationOverlay | null = null;

// Initialize content script
function initializeContentScript() {
  console.log('Initializing TransAI content script on:', window.location.href);
  
  // Add visual indicator that content script is loaded
  const indicator = document.createElement('div');
  indicator.id = 'transai-loaded-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #10b981;
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 999999;
    font-family: Arial, sans-serif;
  `;
  indicator.textContent = 'TransAI Loaded';
  document.body.appendChild(indicator);
  
  // Remove indicator after 3 seconds
  setTimeout(() => {
    indicator.remove();
  }, 3000);
  
  try {
    // Load content script styles
    loadContentStyles();
    
    // Test communication with background script
    const pingMessage = {
      id: `ping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'PING',
      timestamp: Date.now()
    };
    
    chrome.runtime.sendMessage(pingMessage, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to connect to background script:', chrome.runtime.lastError);
        return;
      }
      
      if (response?.payload?.success) {
        console.log('Content script connected to background service worker');
        
        try {
          // Initialize text selection and overlay handling
          initializeTextSelection();
          initializeOverlayManager();
          setupMessageListener();
        } catch (error) {
          console.error('Failed to initialize content script components:', error);
        }
      } else {
        console.warn('Background script not responding');
      }
    });
  } catch (error) {
    console.error('Failed to initialize content script:', error);
  }
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
  
  overlayManager = new SimpleTranslationOverlay(handleAddToVocabulary, handleOverlayClose);
  console.log('Translation overlay manager initialized');
}

// Handle overlay manual close
function handleOverlayClose() {}

// Handle text selection changes
function handleSelectionChange(_selection: TextSelection | null) {}

// Handle adding words to vocabulary
function handleAddToVocabulary(word: string, translation: string) {
  console.log('Adding to vocabulary:', word, '->', translation);
  
  // Send message to background script to add to vocabulary
  const addMessage = {
    id: `add_vocab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'ADD_TO_VOCABULARY',
    timestamp: Date.now(),
    payload: {
      word,
      translation,
      context: overlayManager?.getCurrentSelection()?.context || '',
      sourceUrl: window.location.href
    }
  };
  
  chrome.runtime.sendMessage(addMessage).then((response) => {
    if (response?.type === 'SUCCESS') {
      console.log('Word added to vocabulary successfully');
      // TODO: Show success feedback (will be implemented in next subtask)
    } else {
      console.error('Failed to add word to vocabulary:', response?.payload?.error);
      // TODO: Show error feedback (will be implemented in next subtask)
    }
  }).catch((error) => {
    console.error('Error adding word to vocabulary:', error);
  });
}

// Setup message listener for background script messages
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log('Content script received message:', message);
    
    if (message.type === 'SHOW_TRANSLATION_OVERLAY') {
      console.log('Received SHOW_TRANSLATION_OVERLAY message:', message);
      
      if (!overlayManager) {
        console.error('Overlay manager not initialized');
        sendResponse({ success: false, error: 'Overlay manager not initialized' });
        return true;
      }
      
      if (!message.payload?.text) {
        console.error('No text in message payload');
        sendResponse({ success: false, error: 'No text provided' });
        return true;
      }
      
      try {
        // Create a TextSelection object from the message payload
        const selection: TextSelection = {
          text: message.payload.text,
          position: {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
          },
          context: '',
          url: window.location.href
        };
        
        console.log('Showing overlay with selection:', selection);
        overlayManager.show(selection);
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error showing overlay:', error);
        sendResponse({ success: false, error: String(error) });
      }
      
      return true; // Keep the message channel open for async response
    }
    
    return false;
  });
  
  console.log('Message listener setup complete');
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