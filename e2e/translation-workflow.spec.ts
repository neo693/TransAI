import { test, expect } from '@playwright/test';
import { ExtensionUtils } from './utils/extension-utils';
import { mockTranslationResponse, mockUserConfig, testWebsites } from './fixtures/test-data';

test.describe('Translation Workflow E2E Tests', () => {
  let extensionUtils: ExtensionUtils;

  test.beforeEach(async ({ page, context }) => {
    extensionUtils = new ExtensionUtils(page, context);
    
    // Clear storage and set up test configuration
    await extensionUtils.clearStorage();
    await extensionUtils.setConfig(mockUserConfig);
    
    // Mock LLM API responses
    await extensionUtils.mockLLMAPI(mockTranslationResponse);
  });

  test('should translate selected text and show overlay', async ({ page }) => {
    // Navigate to a test page
    await page.goto(testWebsites[0].url);
    
    // Select text on the page
    await extensionUtils.selectText(testWebsites[0].textSelector);
    
    // Wait for translation overlay to appear
    await extensionUtils.waitForTranslationOverlay();
    
    // Verify overlay content
    const overlay = page.locator('[data-testid="translation-overlay"]');
    await expect(overlay).toBeVisible();
    
    // Check translation content
    const originalText = overlay.locator('[data-testid="original-text"]');
    const translatedText = overlay.locator('[data-testid="translated-text"]');
    
    await expect(originalText).toContainText('Hello world');
    await expect(translatedText).toContainText('Hola mundo');
    
    // Check examples are displayed
    const examples = overlay.locator('[data-testid="translation-examples"]');
    await expect(examples).toBeVisible();
    await expect(examples).toContainText('Hello everyone');
  });

  test('should handle translation errors gracefully', async ({ page }) => {
    // Mock API error response
    await page.route('**/api/translate', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'API Error' })
      });
    });
    
    await page.goto(testWebsites[0].url);
    await extensionUtils.selectText(testWebsites[0].textSelector);
    
    // Wait for error state in overlay
    const overlay = page.locator('[data-testid="translation-overlay"]');
    await expect(overlay).toBeVisible();
    
    const errorMessage = overlay.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('translation failed');
  });

  test('should work across different page layouts', async ({ page }) => {
    for (const website of testWebsites) {
      await page.goto(website.url);
      await extensionUtils.selectText(website.textSelector);
      
      await extensionUtils.waitForTranslationOverlay();
      
      const overlay = page.locator('[data-testid="translation-overlay"]');
      await expect(overlay).toBeVisible();
      
      // Close overlay before next test
      await page.keyboard.press('Escape');
      await expect(overlay).not.toBeVisible();
    }
  });

  test('should maintain overlay position correctly', async ({ page }) => {
    await page.goto(testWebsites[0].url);
    
    // Test overlay positioning
    await extensionUtils.selectText(testWebsites[0].textSelector);
    await extensionUtils.waitForTranslationOverlay();
    
    const overlay = page.locator('[data-testid="translation-overlay"]');
    const overlayBox = await overlay.boundingBox();
    
    expect(overlayBox).toBeTruthy();
    expect(overlayBox!.x).toBeGreaterThan(0);
    expect(overlayBox!.y).toBeGreaterThan(0);
  });

  test('should handle rapid text selections', async ({ page }) => {
    await page.goto(testWebsites[1].url);
    
    // Rapidly select different text elements
    const selectors = ['h2', '.content'];
    
    for (const selector of selectors) {
      await extensionUtils.selectText(selector);
      await page.waitForTimeout(100); // Brief pause between selections
    }
    
    // Should show overlay for the last selection
    await extensionUtils.waitForTranslationOverlay();
    const overlay = page.locator('[data-testid="translation-overlay"]');
    await expect(overlay).toBeVisible();
  });

  test('should close overlay with escape key', async ({ page }) => {
    await page.goto(testWebsites[0].url);
    await extensionUtils.selectText(testWebsites[0].textSelector);
    await extensionUtils.waitForTranslationOverlay();
    
    const overlay = page.locator('[data-testid="translation-overlay"]');
    await expect(overlay).toBeVisible();
    
    // Press escape to close
    await page.keyboard.press('Escape');
    await expect(overlay).not.toBeVisible();
  });

  test('should handle long text selections', async ({ page }) => {
    const longTextPage = `data:text/html,<html><body><p>This is a very long text that should be translated properly even when it contains multiple sentences and complex punctuation. It should handle various edge cases and maintain proper formatting throughout the translation process.</p></body></html>`;
    
    await page.goto(longTextPage);
    await extensionUtils.selectText('p');
    await extensionUtils.waitForTranslationOverlay();
    
    const overlay = page.locator('[data-testid="translation-overlay"]');
    await expect(overlay).toBeVisible();
    
    // Verify the overlay can handle long content
    const translatedText = overlay.locator('[data-testid="translated-text"]');
    await expect(translatedText).toBeVisible();
  });
});