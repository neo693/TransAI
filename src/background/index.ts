// Background service worker for TransAI extension

import { BackgroundService } from './background-service';

// Initialize background service
const backgroundService = new BackgroundService();

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('TransAI extension installed');
  await backgroundService.initialize();
});

// Initialize on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('TransAI extension startup');
  await backgroundService.initialize();
});

// Handle extension suspension
chrome.runtime.onSuspend.addListener(() => {
  console.log('TransAI extension suspending');
  backgroundService.cleanup();
});

console.log('TransAI background service worker loaded');

export {};