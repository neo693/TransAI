import { test, expect } from '@playwright/test';
import { ExtensionUtils } from './utils/extension-utils';
import { mockUserConfig, mockGeneratedContent } from './fixtures/test-data';

test.describe('Content Generation E2E Tests', () => {
  let extensionUtils: ExtensionUtils;

  test.beforeEach(async ({ page, context }) => {
    extensionUtils = new ExtensionUtils(page, context);
    await extensionUtils.clearStorage();
    await extensionUtils.setConfig(mockUserConfig);
    
    // Add test vocabulary for content generation
    const testVocab = [
      { id: 'vocab-1', word: 'Hello', translation: 'Hola', context: 'greeting', sourceUrl: 'test', dateAdded: new Date(), reviewCount: 0 },
      { id: 'vocab-2', word: 'World', translation: 'Mundo', context: 'noun', sourceUrl: 'test', dateAdded: new Date(), reviewCount: 0 },
      { id: 'vocab-3', word: 'Beautiful', translation: 'Hermoso', context: 'adjective', sourceUrl: 'test', dateAdded: new Date(), reviewCount: 0 }
    ];
    
    await page.evaluate((vocab) => {
      return new Promise<void>((resolve) => {
        chrome.storage.local.set({ vocabulary: vocab }, () => resolve());
      });
    }, testVocab);
  });

  test('should generate sentences using vocabulary words', async ({ page }) => {
    // Mock sentence generation API
    await page.route('**/api/generate-sentences', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sentences: [
            'Hello world, this is a beautiful day.',
            'The world is beautiful and full of opportunities.',
            'Hello everyone, what a beautiful world we live in.'
          ],
          usedWords: ['Hello', 'World', 'Beautiful']
        })
      });
    });
    
    const popupPage = await extensionUtils.openPopup();
    
    // Navigate to content generation section
    const contentTab = popupPage.locator('[data-testid="content-generation-tab"]');
    await contentTab.click();
    
    // Select vocabulary words for generation
    const wordCheckboxes = popupPage.locator('[data-testid="word-checkbox"]');
    await wordCheckboxes.first().check();
    await wordCheckboxes.nth(1).check();
    await wordCheckboxes.nth(2).check();
    
    // Set sentence count
    const sentenceCount = popupPage.locator('[data-testid="sentence-count"]');
    await sentenceCount.fill('3');
    
    // Generate sentences
    const generateButton = popupPage.locator('[data-testid="generate-sentences"]');
    await generateButton.click();
    
    // Wait for generation to complete
    const loadingIndicator = popupPage.locator('[data-testid="generation-loading"]');
    await expect(loadingIndicator).toBeVisible();
    await expect(loadingIndicator).not.toBeVisible();
    
    // Verify generated content
    const generatedSentences = popupPage.locator('[data-testid="generated-sentences"]');
    await expect(generatedSentences).toBeVisible();
    
    const sentences = popupPage.locator('[data-testid="generated-sentence"]');
    await expect(sentences).toHaveCount(3);
    
    // Check that vocabulary words are highlighted
    const highlightedWords = popupPage.locator('[data-testid="highlighted-word"]');
    await expect(highlightedWords.first()).toBeVisible();
  });

  test('should generate articles with vocabulary integration', async ({ page }) => {
    // Mock article generation API
    await page.route('**/api/generate-article', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          article: 'Hello world! This is a beautiful article about learning languages. The world is full of beautiful opportunities to practice new vocabulary words.',
          title: 'Learning Languages in a Beautiful World',
          usedWords: ['Hello', 'World', 'Beautiful'],
          wordCount: 25
        })
      });
    });
    
    const popupPage = await extensionUtils.openPopup();
    
    // Navigate to article generation
    const contentTab = popupPage.locator('[data-testid="content-generation-tab"]');
    await contentTab.click();
    
    const articleTab = popupPage.locator('[data-testid="article-generation-tab"]');
    await articleTab.click();
    
    // Select vocabulary words
    const wordCheckboxes = popupPage.locator('[data-testid="word-checkbox"]');
    await wordCheckboxes.first().check();
    await wordCheckboxes.nth(1).check();
    await wordCheckboxes.nth(2).check();
    
    // Set topic
    const topicInput = popupPage.locator('[data-testid="article-topic"]');
    await topicInput.fill('Language Learning');
    
    // Generate article
    const generateButton = popupPage.locator('[data-testid="generate-article"]');
    await generateButton.click();
    
    // Wait for generation
    await expect(popupPage.locator('[data-testid="generation-loading"]')).toBeVisible();
    await expect(popupPage.locator('[data-testid="generation-loading"]')).not.toBeVisible();
    
    // Verify article content
    const generatedArticle = popupPage.locator('[data-testid="generated-article"]');
    await expect(generatedArticle).toBeVisible();
    
    const articleTitle = popupPage.locator('[data-testid="article-title"]');
    await expect(articleTitle).toContainText('Learning Languages');
    
    const articleContent = popupPage.locator('[data-testid="article-content"]');
    await expect(articleContent).toContainText('Hello world');
    
    // Check vocabulary highlighting
    const highlightedWords = popupPage.locator('[data-testid="highlighted-word"]');
    await expect(highlightedWords).toHaveCount(3);
  });

  test('should save generated content', async ({ page }) => {
    await page.route('**/api/generate-sentences', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sentences: ['Hello world, this is a test sentence.'],
          usedWords: ['Hello', 'World']
        })
      });
    });
    
    const popupPage = await extensionUtils.openPopup();
    
    // Generate content
    const contentTab = popupPage.locator('[data-testid="content-generation-tab"]');
    await contentTab.click();
    
    const wordCheckboxes = popupPage.locator('[data-testid="word-checkbox"]');
    await wordCheckboxes.first().check();
    
    const generateButton = popupPage.locator('[data-testid="generate-sentences"]');
    await generateButton.click();
    
    await expect(popupPage.locator('[data-testid="generation-loading"]')).not.toBeVisible();
    
    // Save generated content
    const saveButton = popupPage.locator('[data-testid="save-content"]');
    await saveButton.click();
    
    // Verify save success
    const saveSuccess = popupPage.locator('[data-testid="save-success"]');
    await expect(saveSuccess).toBeVisible();
    
    // Check saved content appears in history
    const historyTab = popupPage.locator('[data-testid="content-history-tab"]');
    await historyTab.click();
    
    const savedItems = popupPage.locator('[data-testid="saved-content-item"]');
    await expect(savedItems).toHaveCount(1);
  });

  test('should export generated content', async ({ page }) => {
    // Add saved content to storage
    const savedContent = [
      {
        id: 'content-1',
        type: 'sentence',
        content: 'Hello world, this is a test sentence.',
        usedWords: ['Hello', 'World'],
        generatedAt: new Date().toISOString()
      }
    ];
    
    await page.evaluate((content) => {
      return new Promise<void>((resolve) => {
        chrome.storage.local.set({ savedContent: content }, () => resolve());
      });
    }, savedContent);
    
    const popupPage = await extensionUtils.openPopup();
    
    // Navigate to content history
    const contentTab = popupPage.locator('[data-testid="content-generation-tab"]');
    await contentTab.click();
    
    const historyTab = popupPage.locator('[data-testid="content-history-tab"]');
    await historyTab.click();
    
    // Set up download handler
    const downloadPromise = popupPage.waitForEvent('download');
    
    // Export content
    const exportButton = popupPage.locator('[data-testid="export-content"]');
    await exportButton.click();
    
    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('generated-content');
  });

  test('should handle generation errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/generate-sentences', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Generation failed' })
      });
    });
    
    const popupPage = await extensionUtils.openPopup();
    
    const contentTab = popupPage.locator('[data-testid="content-generation-tab"]');
    await contentTab.click();
    
    const wordCheckboxes = popupPage.locator('[data-testid="word-checkbox"]');
    await wordCheckboxes.first().check();
    
    const generateButton = popupPage.locator('[data-testid="generate-sentences"]');
    await generateButton.click();
    
    // Should show error message
    const errorMessage = popupPage.locator('[data-testid="generation-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('generation failed');
  });

  test('should validate vocabulary selection for generation', async ({ page }) => {
    const popupPage = await extensionUtils.openPopup();
    
    const contentTab = popupPage.locator('[data-testid="content-generation-tab"]');
    await contentTab.click();
    
    // Try to generate without selecting words
    const generateButton = popupPage.locator('[data-testid="generate-sentences"]');
    await generateButton.click();
    
    // Should show validation error
    const validationError = popupPage.locator('[data-testid="validation-error"]');
    await expect(validationError).toBeVisible();
    await expect(validationError).toContainText('select at least one word');
  });

  test('should show generation progress and statistics', async ({ page }) => {
    await page.route('**/api/generate-sentences', async route => {
      // Simulate slow response for progress testing
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sentences: ['Test sentence with vocabulary words.'],
          usedWords: ['Test'],
          statistics: {
            wordsUsed: 1,
            sentencesGenerated: 1,
            averageLength: 6
          }
        })
      });
    });
    
    const popupPage = await extensionUtils.openPopup();
    
    const contentTab = popupPage.locator('[data-testid="content-generation-tab"]');
    await contentTab.click();
    
    const wordCheckboxes = popupPage.locator('[data-testid="word-checkbox"]');
    await wordCheckboxes.first().check();
    
    const generateButton = popupPage.locator('[data-testid="generate-sentences"]');
    await generateButton.click();
    
    // Check progress indicator
    const progressBar = popupPage.locator('[data-testid="generation-progress"]');
    await expect(progressBar).toBeVisible();
    
    // Wait for completion
    await expect(progressBar).not.toBeVisible();
    
    // Check statistics
    const statistics = popupPage.locator('[data-testid="generation-statistics"]');
    await expect(statistics).toBeVisible();
    await expect(statistics).toContainText('1 word used');
  });
});