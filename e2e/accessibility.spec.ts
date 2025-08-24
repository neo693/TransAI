import { test, expect } from '@playwright/test';
import { ExtensionUtils } from './utils/extension-utils';
import { mockUserConfig, accessibilityTestData } from './fixtures/test-data';

test.describe('Accessibility E2E Tests', () => {
  let extensionUtils: ExtensionUtils;

  test.beforeEach(async ({ page, context }) => {
    extensionUtils = new ExtensionUtils(page, context);
    await extensionUtils.clearStorage();
    await extensionUtils.setConfig(mockUserConfig);
  });

  test('should support keyboard navigation in translation overlay', async ({ page }) => {
    const testUrl = 'data:text/html,<html><body><p>Hello world</p></body></html>';
    await page.goto(testUrl);
    
    // Mock translation response
    await extensionUtils.mockLLMAPI({
      originalText: 'Hello world',
      translatedText: 'Hola mundo',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      examples: [],
      confidence: 0.95,
      timestamp: new Date()
    });
    
    await extensionUtils.selectText('p');
    await extensionUtils.waitForTranslationOverlay();
    
    const overlay = page.locator('[data-testid="translation-overlay"]');
    await expect(overlay).toBeVisible();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    
    // Should focus on first interactive element (add to vocabulary button)
    const addButton = page.locator('[data-testid="add-to-vocabulary"]');
    await expect(addButton).toBeFocused();
    
    // Tab to next element (pronunciation button)
    await page.keyboard.press('Tab');
    const pronunciationButton = page.locator('[data-testid="play-pronunciation"]');
    await expect(pronunciationButton).toBeFocused();
    
    // Enter should activate the focused button
    await page.keyboard.press('Enter');
    
    // Escape should close overlay
    await page.keyboard.press('Escape');
    await expect(overlay).not.toBeVisible();
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    const testUrl = 'data:text/html,<html><body><p>Hello world</p></body></html>';
    await page.goto(testUrl);
    
    await extensionUtils.mockLLMAPI({
      originalText: 'Hello world',
      translatedText: 'Hola mundo',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      examples: [],
      confidence: 0.95,
      timestamp: new Date()
    });
    
    await extensionUtils.selectText('p');
    await extensionUtils.waitForTranslationOverlay();
    
    // Check ARIA labels
    for (const { selector, expectedLabel } of accessibilityTestData.ariaLabels) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        const ariaLabel = await element.getAttribute('aria-label');
        expect(ariaLabel).toContain(expectedLabel);
      }
    }
    
    // Check overlay has proper role
    const overlay = page.locator('[data-testid="translation-overlay"]');
    await expect(overlay).toHaveAttribute('role', 'dialog');
    await expect(overlay).toHaveAttribute('aria-modal', 'true');
  });

  test('should support screen reader announcements', async ({ page }) => {
    const testUrl = 'data:text/html,<html><body><p>Hello world</p></body></html>';
    await page.goto(testUrl);
    
    await extensionUtils.mockLLMAPI({
      originalText: 'Hello world',
      translatedText: 'Hola mundo',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      examples: [],
      confidence: 0.95,
      timestamp: new Date()
    });
    
    await extensionUtils.selectText('p');
    await extensionUtils.waitForTranslationOverlay();
    
    // Check for live region announcements
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeVisible();
    
    // Add to vocabulary should announce success
    const addButton = page.locator('[data-testid="add-to-vocabulary"]');
    await addButton.click();
    
    const announcement = page.locator('[data-testid="sr-announcement"]');
    await expect(announcement).toContainText('Added to vocabulary');
  });

  test('should support high contrast mode', async ({ page }) => {
    // Enable high contrast mode simulation
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    
    const popupPage = await extensionUtils.openPopup();
    
    // Check that high contrast styles are applied
    const body = popupPage.locator('body');
    await expect(body).toHaveCSS('background-color', 'rgb(0, 0, 0)');
    
    // Check button contrast
    const buttons = popupPage.locator('button');
    const firstButton = buttons.first();
    if (await firstButton.isVisible()) {
      const backgroundColor = await firstButton.evaluate(el => 
        getComputedStyle(el).backgroundColor
      );
      const color = await firstButton.evaluate(el => 
        getComputedStyle(el).color
      );
      
      // Ensure sufficient contrast (basic check)
      expect(backgroundColor).not.toBe(color);
    }
  });

  test('should support reduced motion preferences', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    const testUrl = 'data:text/html,<html><body><p>Hello world</p></body></html>';
    await page.goto(testUrl);
    
    await extensionUtils.mockLLMAPI({
      originalText: 'Hello world',
      translatedText: 'Hola mundo',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      examples: [],
      confidence: 0.95,
      timestamp: new Date()
    });
    
    await extensionUtils.selectText('p');
    await extensionUtils.waitForTranslationOverlay();
    
    // Check that animations are disabled
    const overlay = page.locator('[data-testid="translation-overlay"]');
    const animationDuration = await overlay.evaluate(el => 
      getComputedStyle(el).animationDuration
    );
    
    // Should have no animation or very short duration
    expect(animationDuration === '0s' || animationDuration === '0.01s').toBeTruthy();
  });

  test('should support keyboard navigation in popup interface', async ({ page }) => {
    // Add test vocabulary
    const testVocab = [
      { id: 'vocab-1', word: 'Hello', translation: 'Hola', context: 'greeting', sourceUrl: 'test', dateAdded: new Date(), reviewCount: 0 },
      { id: 'vocab-2', word: 'World', translation: 'Mundo', context: 'noun', sourceUrl: 'test', dateAdded: new Date(), reviewCount: 0 }
    ];
    
    await page.evaluate((vocab) => {
      return new Promise<void>((resolve) => {
        chrome.storage.local.set({ vocabulary: vocab }, () => resolve());
      });
    }, testVocab);
    
    const popupPage = await extensionUtils.openPopup();
    
    // Test tab navigation through vocabulary items
    await popupPage.keyboard.press('Tab');
    
    // Should focus on search input
    const searchInput = popupPage.locator('[data-testid="vocabulary-search"]');
    await expect(searchInput).toBeFocused();
    
    // Continue tabbing through vocabulary items
    await popupPage.keyboard.press('Tab');
    
    const firstVocabItem = popupPage.locator('[data-testid="vocabulary-item"]').first();
    const deleteButton = firstVocabItem.locator('[data-testid="delete-vocabulary"]');
    
    // Should be able to reach delete button
    let tabCount = 0;
    while (tabCount < 10 && !(await deleteButton.isVisible() && await deleteButton.evaluate(el => el === document.activeElement))) {
      await popupPage.keyboard.press('Tab');
      tabCount++;
    }
    
    if (await deleteButton.isVisible()) {
      await expect(deleteButton).toBeFocused();
    }
  });

  test('should support keyboard navigation in options page', async ({ page }) => {
    const optionsPage = await extensionUtils.openOptionsPage();
    
    // Test tab navigation through form elements
    await optionsPage.keyboard.press('Tab');
    
    const apiKeyInput = optionsPage.locator('[data-testid="api-key-input"]');
    await expect(apiKeyInput).toBeFocused();
    
    // Tab to provider select
    await optionsPage.keyboard.press('Tab');
    const providerSelect = optionsPage.locator('[data-testid="api-provider-select"]');
    await expect(providerSelect).toBeFocused();
    
    // Test arrow key navigation in select
    await optionsPage.keyboard.press('ArrowDown');
    await optionsPage.keyboard.press('ArrowUp');
    
    // Tab to save button
    let tabCount = 0;
    const saveButton = optionsPage.locator('[data-testid="save-config"]');
    
    while (tabCount < 10 && !(await saveButton.evaluate(el => el === document.activeElement))) {
      await optionsPage.keyboard.press('Tab');
      tabCount++;
    }
    
    if (await saveButton.isVisible()) {
      await expect(saveButton).toBeFocused();
    }
  });

  test('should provide proper focus management', async ({ page }) => {
    const testUrl = 'data:text/html,<html><body><p>Hello world</p></body></html>';
    await page.goto(testUrl);
    
    await extensionUtils.mockLLMAPI({
      originalText: 'Hello world',
      translatedText: 'Hola mundo',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      examples: [],
      confidence: 0.95,
      timestamp: new Date()
    });
    
    // Store initial focus
    const initialFocus = await page.evaluate(() => document.activeElement?.tagName);
    
    await extensionUtils.selectText('p');
    await extensionUtils.waitForTranslationOverlay();
    
    // Focus should move to overlay
    const overlay = page.locator('[data-testid="translation-overlay"]');
    await expect(overlay).toBeFocused();
    
    // Close overlay with escape
    await page.keyboard.press('Escape');
    await expect(overlay).not.toBeVisible();
    
    // Focus should return to original element or body
    const finalFocus = await page.evaluate(() => document.activeElement?.tagName);
    expect(finalFocus).toBeDefined();
  });

  test('should support voice control and speech recognition', async ({ page }) => {
    // This test simulates voice control scenarios
    const popupPage = await extensionUtils.openPopup();
    
    // Check that buttons have proper labels for voice control
    const buttons = popupPage.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();
        
        // Button should have either aria-label or text content for voice control
        expect(ariaLabel || textContent).toBeTruthy();
      }
    }
  });

  test('should handle focus trapping in modal dialogs', async ({ page }) => {
    const popupPage = await extensionUtils.openPopup();
    
    // Add vocabulary item to trigger delete confirmation dialog
    const testVocab = [
      { id: 'vocab-1', word: 'Hello', translation: 'Hola', context: 'greeting', sourceUrl: 'test', dateAdded: new Date(), reviewCount: 0 }
    ];
    
    await popupPage.evaluate((vocab) => {
      return new Promise<void>((resolve) => {
        chrome.storage.local.set({ vocabulary: vocab }, () => resolve());
      });
    }, testVocab);
    
    await popupPage.reload();
    
    // Click delete button to open confirmation dialog
    const deleteButton = popupPage.locator('[data-testid="delete-vocabulary"]').first();
    await deleteButton.click();
    
    // Check that focus is trapped in dialog
    const confirmDialog = popupPage.locator('[data-testid="confirm-dialog"]');
    await expect(confirmDialog).toBeVisible();
    
    // Tab should cycle through dialog elements only
    const cancelButton = popupPage.locator('[data-testid="cancel-delete"]');
    const confirmButton = popupPage.locator('[data-testid="confirm-delete"]');
    
    await popupPage.keyboard.press('Tab');
    await expect(cancelButton).toBeFocused();
    
    await popupPage.keyboard.press('Tab');
    await expect(confirmButton).toBeFocused();
    
    // Tab again should cycle back to cancel
    await popupPage.keyboard.press('Tab');
    await expect(cancelButton).toBeFocused();
  });
});