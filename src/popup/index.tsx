import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '../styles/globals.css'

// Ensure content script is injected when popup opens
async function ensureContentScriptInjected() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    // Skip special pages where content scripts cannot be injected
    if (tab.url?.startsWith('chrome://') || 
        tab.url?.startsWith('about:') || 
        tab.url?.startsWith('edge://') ||
        tab.url?.startsWith('chrome-extension://')) {
      return;
    }

    // Try to ping content script to check if it's already loaded
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
      console.log('Content script already loaded');
    } catch (error) {
      // Content script not loaded, inject it
      console.log('Injecting content script...');
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/index.js']
      });
      
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['content/styles.css']
      });
      
      console.log('Content script injected successfully');
    }
  } catch (error) {
    console.error('Failed to ensure content script:', error);
  }
}

// Inject content script before rendering popup
ensureContentScriptInjected();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)