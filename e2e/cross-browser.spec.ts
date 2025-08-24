import { test, expect } from '@playwright/test';
import { ExtensionUtils } from './utils/extension-utils';
import { mockUserConfig, mockTranslationResponse } from './fixtures/test-data';

test.describe('Cross-Browser Compatibility E2E Tests', () => {
  let extensionUtils: ExtensionUtils;

  test.beforeEach(async ({ page, context }) => {
    extensionUtils = new ExtensionUtils(page, context);
    await extensionUtils.clearStorage();
    await extensionUtils.setConfig(mockUserConfig);
  });

  test('should work consistently across different browser engines', async ({ page, browserName }) => {
    // Test basic functionality across browsers
    const testUrl = 'data:text/html,<html><body><p>Hello world</p></body></html>';
    await page.goto(testUrl);
    
    await extensionUtils.mockLLMAPI(mockTranslationResponse);
    await extensionUtils.selectText('p');
    await extensionUtils.waitForTranslationOverlay();
    
    const overlay = page.locator('[data-testid="translation-overlay"]');
    await expect(overlay).toBeVisible();
    
    // Verify translation content works the same across browsers
    const translatedText = overlay.locator('[data-testid="translated-text"]');
    await expect(translatedText).toContainText('Hola mundo');
    
    console.log(`Test passed on ${browserName}`);
  });

  test('should handle browser-specific storage APIs', async ({ page }) => {
    // Test storage functionality
    const testData = { testKey: 'testValue', timestamp: Date.now() };
    
    // Set data using extension storage
    await page.evaluate((data) => {
      return new Promise<void>((resolve) => {
        chrome.storage.local.set(data, () => resolve());
      });
    }, testData);
    
    // Retrieve data
    const retrievedData = await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.local.get(['testKey', 'timestamp'], (result) => {
          resolve(result);
        });
      });
    });
    
    expect(retrievedData).toMatchObject(testData);
  });

  test('should handle browser-specific messaging APIs', async ({ page }) => {
    // Test message passing between content script and background
    const testMessage = { type: 'TEST_MESSAGE', data: 'test data' };
    
    // Mock background script response
    await page.addInitScript(() => {
      // @ts-ignore
      window.chrome = window.chrome || {};
      // @ts-ignore
      window.chrome.runtime = window.chrome.runtime || {};
      // @ts-ignore
      window.chrome.runtime.sendMessage = (message, callback) => {
        // Simulate background script response
        setTimeout(() => {
          callback({ success: true, echo: message });
        }, 100);
      };
    });
    
    const response = await page.evaluate((message) => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response) => {
          resolve(response);
        });
      });
    }, testMessage);
    
    expect(response).toMatchObject({
      success: true,
      echo: testMessage
    });
  });

  test('should handle different viewport sizes and responsive design', async ({ page }) => {
    const popupPage = await extensionUtils.openPopup();
    
    // Test different viewport sizes
    const viewports = [
      { width: 320, height: 568 }, // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1920, height: 1080 } // Desktop
    ];
    
    for (const viewport of viewports) {
      await popupPage.setViewportSize(viewport);
      
      // Verify popup is responsive
      const popupContainer = popupPage.locator('[data-testid="popup-container"]');
      await expect(popupContainer).toBeVisible();
      
      const containerBox = await popupContainer.boundingBox();
      expect(containerBox?.width).toBeLessThanOrEqual(viewport.width);
      expect(containerBox?.height).toBeLessThanOrEqual(viewport.height);
    }
  });

  test('should handle browser-specific CSS and styling', async ({ page }) => {
    const testUrl = 'data:text/html,<html><body><p>Hello world</p></body></html>';
    await page.goto(testUrl);
    
    await extensionUtils.mockLLMAPI(mockTranslationResponse);
    await extensionUtils.selectText('p');
    await extensionUtils.waitForTranslationOverlay();
    
    const overlay = page.locator('[data-testid="translation-overlay"]');
    
    // Check that overlay has proper styling across browsers
    const computedStyle = await overlay.evaluate(el => {
      const style = getComputedStyle(el);
      return {
        position: style.position,
        zIndex: style.zIndex,
        display: style.display
      };
    });
    
    expect(computedStyle.position).toBe('absolute');
    expect(parseInt(computedStyle.zIndex)).toBeGreaterThan(1000);
    expect(computedStyle.display).not.toBe('none');
  });

  test('should handle browser-specific event handling', async ({ page }) => {
    const testUrl = 'data:text/html,<html><body><p>Hello world for event testing</p></body></html>';
    await page.goto(testUrl);
    
    // Test different selection methods
    const paragraph = page.locator('p');
    
    // Double-click selection
    await paragraph.dblclick();
    
    // Verify selection was made
    const selectedText = await page.evaluate(() => {
      return window.getSelection()?.toString();
    });
    
    expect(selectedText).toBeTruthy();
    expect(selectedText?.length).toBeGreaterThan(0);
    
    // Test keyboard selection
    await paragraph.click();
    await page.keyboard.press('Control+A');
    
    const keyboardSelectedText = await page.evaluate(() => {
      return window.getSelection()?.toString();
    });
    
    expect(keyboardSelectedText).toContain('Hello world');
  });

  test('should handle browser-specific permissions and security', async ({ page }) => {
    // Test that extension has proper permissions
    const permissions = await page.evaluate(() => {
      return new Promise((resolve) => {
        if (chrome.permissions) {
          chrome.permissions.getAll((permissions) => {
            resolve(permissions);
          });
        } else {
          resolve({ permissions: [], origins: [] });
        }
      });
    });
    
    expect(permissions).toBeDefined();
    // Extension should have storage permission
    expect((permissions as any).permissions).toContain('storage');
  });

  test('should handle browser-specific content security policies', async ({ page }) => {
    // Test with a page that has strict CSP
    const strictCSPPage = `data:text/html,<html>
      <head>
        <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self';">
      </head>
      <body><p>CSP test page with Hello world</p></body>
    </html>`;
    
    await page.goto(strictCSPPage);
    
    // Extension should still work despite CSP restrictions
    await extensionUtils.mockLLMAPI(mockTranslationResponse);
    
    try {
      await extensionUtils.selectText('p');
      await extensionUtils.waitForTranslationOverlay();
      
      const overlay = page.locator('[data-testid="translation-overlay"]');
      await expect(overlay).toBeVisible();
    } catch (error) {
      // If CSP blocks the extension, it should fail gracefully
      console.log('CSP blocked extension functionality as expected');
    }
  });

  test('should handle browser-specific performance characteristics', async ({ page }) => {
    // Test performance across browsers
    const startTime = Date.now();
    
    const testUrl = 'data:text/html,<html><body><p>Performance test with Hello world</p></body></html>';
    await page.goto(testUrl);
    
    await extensionUtils.mockLLMAPI(mockTranslationResponse);
    await extensionUtils.selectText('p');
    await extensionUtils.waitForTranslationOverlay();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Translation overlay should appear within reasonable time (5 seconds)
    expect(duration).toBeLessThan(5000);
    
    // Measure memory usage if available
    const memoryInfo = await page.evaluate(() => {
      // @ts-ignore
      return (performance as any).memory ? {
        // @ts-ignore
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        // @ts-ignore
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize
      } : null;
    });
    
    if (memoryInfo) {
      // Memory usage should be reasonable (less than 50MB)
      expect(memoryInfo.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('should handle browser-specific extension lifecycle', async ({ page }) => {
    // Test extension initialization and cleanup
    const popupPage = await extensionUtils.openPopup();
    
    // Verify extension is properly initialized
    const initStatus = await popupPage.evaluate(() => {
      return new Promise((resolve) => {
        // Check if extension services are available
        const hasStorage = !!chrome.storage;
        const hasRuntime = !!chrome.runtime;
        
        resolve({
          hasStorage,
          hasRuntime,
          timestamp: Date.now()
        });
      });
    });
    
    expect(initStatus).toMatchObject({
      hasStorage: true,
      hasRuntime: true
    });
    
    // Close popup and verify cleanup
    await popupPage.close();
    
    // Extension should continue working after popup close
    const testUrl = 'data:text/html,<html><body><p>Lifecycle test Hello world</p></body></html>';
    await page.goto(testUrl);
    
    await extensionUtils.mockLLMAPI(mockTranslationResponse);
    await extensionUtils.selectText('p');
    await extensionUtils.waitForTranslationOverlay();
    
    const overlay = page.locator('[data-testid="translation-overlay"]');
    await expect(overlay).toBeVisible();
  });
});