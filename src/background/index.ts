// Background service worker for TransAI extension

import { BackgroundService } from './background-service';

// Initialize background service
const backgroundService = new BackgroundService();

// Initialize immediately when service worker loads
(async () => {
  try {
    await backgroundService.initialize();
  } catch (error) {
    console.error('Failed to initialize background service:', error);
  }
})();

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('TransAI extension installed/updated:', details.reason);
  try {
    await backgroundService.initialize();
  } catch (error) {
    console.error('Failed to initialize on install:', error);
  }
});

// Initialize on startup
chrome.runtime.onStartup.addListener(async () => {
  try {
    await backgroundService.initialize();
  } catch (error) {
    console.error('Failed to initialize on startup:', error);
  }
});

// Handle extension suspension
chrome.runtime.onSuspend.addListener(() => {
  backgroundService.cleanup();
});

export {};