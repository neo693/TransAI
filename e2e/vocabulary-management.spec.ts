import { test, expect } from '@playwright/test';
import { ExtensionUtils } from './utils/extension-utils';
import { mockTranslationResponse, mockUserConfig, mockVocabularyItem } from './fixtures/test-data';

test.describe('Vocabulary Management E2E Tests', () => {
  let extensionUtils: ExtensionUtils;

  test.beforeEach(async ({ page, context }) => {
    extensionUtils = new ExtensionUtils(page, context);
    await extensionUtils.clearStorage();
    await extensionUtils.setConfig(mockUserConfig);
    await extensionUtils.mockLLMAPI(mockTranslationResponse);
  });

  test('should add word to vocabulary from translation overlay', async ({ page }) => {
    // Navigate to test page and translate text
    const testUrl = 'data:text/html,<html><body><p>Hello world</p></body></html>';
    await page.goto(testUrl);
    
    await extensionUtils.selectText('p');
    await extensionUtils.waitForTranslationOverlay();
    
    // Click add to vocabulary button
    const addButton = page.locator('[data-testid="add-to-vocabulary"]');
    await expect(addButton).toBeVisible();
    await addButton.click();
    
    // Verify success feedback
    const successMessage = page.locator('[data-testid="vocabulary-success"]');
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toContainText('Added to vocabulary');
    
    // Verify word was saved to storage
    const vocabulary = await extensionUtils.getVocabulary();
    expect(vocabulary).toHaveLength(1);
    expect(vocabulary[0].word).toBe('Hello world');
    expect(vocabulary[0].translation).toBe('Hola mundo');
  });

  test('should prevent duplicate vocabulary entries', async ({ page }) => {
    // Add initial vocabulary item
    await page.evaluate((item) => {
      return new Promise<void>((resolve) => {
        chrome.storage.local.set({ vocabulary: [item] }, () => resolve());
      });
    }, mockVocabularyItem);
    
    const testUrl = 'data:text/html,<html><body><p>Hello</p></body></html>';
    await page.goto(testUrl);
    
    await extensionUtils.selectText('p');
    await extensionUtils.waitForTranslationOverlay();
    
    // Try to add duplicate word
    const addButton = page.locator('[data-testid="add-to-vocabulary"]');
    await addButton.click();
    
    // Should show already exists message
    const existsMessage = page.locator('[data-testid="vocabulary-exists"]');
    await expect(existsMessage).toBeVisible();
    await expect(existsMessage).toContainText('already in vocabulary');
  });

  test('should manage vocabulary in popup interface', async ({ page }) => {
    // Add test vocabulary items
    const testVocab = [
      { ...mockVocabularyItem, id: 'vocab-1', word: 'Hello', translation: 'Hola' },
      { ...mockVocabularyItem, id: 'vocab-2', word: 'World', translation: 'Mundo' },
      { ...mockVocabularyItem, id: 'vocab-3', word: 'Test', translation: 'Prueba' }
    ];
    
    await page.evaluate((vocab) => {
      return new Promise<void>((resolve) => {
        chrome.storage.local.set({ vocabulary: vocab }, () => resolve());
      });
    }, testVocab);
    
    // Open popup
    const popupPage = await extensionUtils.openPopup();
    
    // Verify vocabulary list is displayed
    const vocabularyList = popupPage.locator('[data-testid="vocabulary-list"]');
    await expect(vocabularyList).toBeVisible();
    
    // Check all vocabulary items are shown
    const vocabularyItems = popupPage.locator('[data-testid="vocabulary-item"]');
    await expect(vocabularyItems).toHaveCount(3);
    
    // Verify item content
    const firstItem = vocabularyItems.first();
    await expect(firstItem).toContainText('Hello');
    await expect(firstItem).toContainText('Hola');
  });

  test('should search vocabulary items', async ({ page }) => {
    const testVocab = [
      { ...mockVocabularyItem, id: 'vocab-1', word: 'Hello', translation: 'Hola' },
      { ...mockVocabularyItem, id: 'vocab-2', word: 'Goodbye', translation: 'Adiós' },
      { ...mockVocabularyItem, id: 'vocab-3', word: 'Thank you', translation: 'Gracias' }
    ];
    
    await page.evaluate((vocab) => {
      return new Promise<void>((resolve) => {
        chrome.storage.local.set({ vocabulary: vocab }, () => resolve());
      });
    }, testVocab);
    
    const popupPage = await extensionUtils.openPopup();
    
    // Use search functionality
    const searchInput = popupPage.locator('[data-testid="vocabulary-search"]');
    await searchInput.fill('Hello');
    
    // Should show only matching items
    const vocabularyItems = popupPage.locator('[data-testid="vocabulary-item"]');
    await expect(vocabularyItems).toHaveCount(1);
    await expect(vocabularyItems.first()).toContainText('Hello');
  });

  test('should delete vocabulary items', async ({ page }) => {
    const testVocab = [
      { ...mockVocabularyItem, id: 'vocab-1', word: 'Hello', translation: 'Hola' }
    ];
    
    await page.evaluate((vocab) => {
      return new Promise<void>((resolve) => {
        chrome.storage.local.set({ vocabulary: vocab }, () => resolve());
      });
    }, testVocab);
    
    const popupPage = await extensionUtils.openPopup();
    
    // Click delete button
    const deleteButton = popupPage.locator('[data-testid="delete-vocabulary"]').first();
    await deleteButton.click();
    
    // Confirm deletion
    const confirmButton = popupPage.locator('[data-testid="confirm-delete"]');
    await confirmButton.click();
    
    // Verify item is removed
    const vocabularyItems = popupPage.locator('[data-testid="vocabulary-item"]');
    await expect(vocabularyItems).toHaveCount(0);
    
    // Verify empty state message
    const emptyMessage = popupPage.locator('[data-testid="vocabulary-empty"]');
    await expect(emptyMessage).toBeVisible();
  });

  test('should export vocabulary data', async ({ page }) => {
    const testVocab = [
      { ...mockVocabularyItem, id: 'vocab-1', word: 'Hello', translation: 'Hola' },
      { ...mockVocabularyItem, id: 'vocab-2', word: 'World', translation: 'Mundo' }
    ];
    
    await page.evaluate((vocab) => {
      return new Promise<void>((resolve) => {
        chrome.storage.local.set({ vocabulary: vocab }, () => resolve());
      });
    }, testVocab);
    
    const popupPage = await extensionUtils.openPopup();
    
    // Set up download handler
    const downloadPromise = popupPage.waitForEvent('download');
    
    // Click export button
    const exportButton = popupPage.locator('[data-testid="export-vocabulary"]');
    await exportButton.click();
    
    // Select CSV format
    const csvOption = popupPage.locator('[data-testid="export-csv"]');
    await csvOption.click();
    
    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should import vocabulary data', async ({ page }) => {
    const popupPage = await extensionUtils.openPopup();
    
    // Create test CSV content
    const csvContent = 'word,translation,context\nHello,Hola,greeting\nWorld,Mundo,noun';
    
    // Set up file input
    const fileInput = popupPage.locator('[data-testid="import-file"]');
    
    // Create a temporary file for testing
    await fileInput.setInputFiles({
      name: 'test-vocabulary.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });
    
    // Click import button
    const importButton = popupPage.locator('[data-testid="import-vocabulary"]');
    await importButton.click();
    
    // Verify success message
    const successMessage = popupPage.locator('[data-testid="import-success"]');
    await expect(successMessage).toBeVisible();
    
    // Verify imported items appear in list
    const vocabularyItems = popupPage.locator('[data-testid="vocabulary-item"]');
    await expect(vocabularyItems).toHaveCount(2);
  });

  test('should show vocabulary statistics', async ({ page }) => {
    const testVocab = Array.from({ length: 15 }, (_, i) => ({
      ...mockVocabularyItem,
      id: `vocab-${i}`,
      word: `Word${i}`,
      translation: `Palabra${i}`,
      reviewCount: i % 3
    }));
    
    await page.evaluate((vocab) => {
      return new Promise<void>((resolve) => {
        chrome.storage.local.set({ vocabulary: vocab }, () => resolve());
      });
    }, testVocab);
    
    const popupPage = await extensionUtils.openPopup();
    
    // Check statistics display
    const statsSection = popupPage.locator('[data-testid="vocabulary-stats"]');
    await expect(statsSection).toBeVisible();
    
    const totalWords = popupPage.locator('[data-testid="total-words"]');
    await expect(totalWords).toContainText('15');
    
    const reviewedWords = popupPage.locator('[data-testid="reviewed-words"]');
    await expect(reviewedWords).toBeVisible();
  });
});