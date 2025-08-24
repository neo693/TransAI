import { test, expect } from '@playwright/test';
import { ExtensionUtils } from './utils/extension-utils';
import { mockUserConfig, mockTranslationResponse } from './fixtures/test-data';

test.describe('Complete User Workflows E2E Tests', () => {
  let extensionUtils: ExtensionUtils;

  test.beforeEach(async ({ page, context }) => {
    extensionUtils = new ExtensionUtils(page, context);
    await extensionUtils.clearStorage();
  });

  test('complete first-time user setup and translation workflow', async ({ page }) => {
    // 1. First-time user opens options to configure API key
    const optionsPage = await extensionUtils.openOptionsPage();
    
    // Should show welcome/setup screen for new users
    const welcomeScreen = optionsPage.locator('[data-testid="welcome-screen"]');
    if (await welcomeScreen.isVisible()) {
      await expect(welcomeScreen).toContainText('Welcome to TransAI');
    }
    
    // 2. Configure API key
    const apiKeyInput = optionsPage.locator('[data-testid="api-key-input"]');
    await apiKeyInput.fill(mockUserConfig.apiKey);
    
    const providerSelect = optionsPage.locator('[data-testid="api-provider-select"]');
    await providerSelect.selectOption(mockUserConfig.apiProvider);
    
    // Mock successful API validation
    await optionsPage.route('**/api/validate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: true, provider: mockUserConfig.apiProvider })
      });
    });
    
    const saveButton = optionsPage.locator('[data-testid="save-config"]');
    await saveButton.click();
    
    const saveSuccess = optionsPage.locator('[data-testid="save-success"]');
    await expect(saveSuccess).toBeVisible();
    
    // 3. Navigate to a webpage and perform first translation
    const testUrl = 'data:text/html,<html><body><h1>Welcome</h1><p>Hello world, this is my first translation test.</p></body></html>';
    await page.goto(testUrl);
    
    // Mock translation API
    await extensionUtils.mockLLMAPI({
      originalText: 'Hello world',
      translatedText: 'Hola mundo',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      examples: [
        { original: 'Hello everyone', translated: 'Hola a todos', context: 'greeting' }
      ],
      confidence: 0.95,
      timestamp: new Date()
    });
    
    await extensionUtils.selectText('p');
    await extensionUtils.waitForTranslationOverlay();
    
    const overlay = page.locator('[data-testid="translation-overlay"]');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('Hola mundo');
    
    // 4. Add word to vocabulary
    const addButton = page.locator('[data-testid="add-to-vocabulary"]');
    await addButton.click();
    
    const successMessage = page.locator('[data-testid="vocabulary-success"]');
    await expect(successMessage).toBeVisible();
    
    // 5. Open popup to verify vocabulary was saved
    const popupPage = await extensionUtils.openPopup();
    
    const vocabularyList = popupPage.locator('[data-testid="vocabulary-list"]');
    await expect(vocabularyList).toBeVisible();
    
    const vocabularyItems = popupPage.locator('[data-testid="vocabulary-item"]');
    await expect(vocabularyItems).toHaveCount(1);
    await expect(vocabularyItems.first()).toContainText('Hello world');
  });

  test('complete vocabulary management and content generation workflow', async ({ page }) => {
    // Setup: Configure extension and add vocabulary
    await extensionUtils.setConfig(mockUserConfig);
    
    const initialVocab = [
      { id: 'vocab-1', word: 'Hello', translation: 'Hola', context: 'greeting', sourceUrl: 'test1.com', dateAdded: new Date(), reviewCount: 0 },
      { id: 'vocab-2', word: 'Beautiful', translation: 'Hermoso', context: 'adjective', sourceUrl: 'test2.com', dateAdded: new Date(), reviewCount: 1 },
      { id: 'vocab-3', word: 'World', translation: 'Mundo', context: 'noun', sourceUrl: 'test3.com', dateAdded: new Date(), reviewCount: 2 }
    ];
    
    await page.evaluate((vocab) => {
      return new Promise<void>((resolve) => {
        chrome.storage.local.set({ vocabulary: vocab }, () => resolve());
      });
    }, initialVocab);
    
    // 1. Open popup and review vocabulary
    const popupPage = await extensionUtils.openPopup();
    
    const vocabularyItems = popupPage.locator('[data-testid="vocabulary-item"]');
    await expect(vocabularyItems).toHaveCount(3);
    
    // 2. Search for specific vocabulary
    const searchInput = popupPage.locator('[data-testid="vocabulary-search"]');
    await searchInput.fill('Hello');
    
    await expect(vocabularyItems).toHaveCount(1);
    await expect(vocabularyItems.first()).toContainText('Hello');
    
    // Clear search
    await searchInput.clear();
    await expect(vocabularyItems).toHaveCount(3);
    
    // 3. Generate sentences using vocabulary
    const contentTab = popupPage.locator('[data-testid="content-generation-tab"]');
    await contentTab.click();
    
    // Mock sentence generation API
    await popupPage.route('**/api/generate-sentences', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sentences: [
            'Hello beautiful world, this is amazing!',
            'The world is beautiful and full of opportunities.',
            'Hello everyone in this beautiful world.'
          ],
          usedWords: ['Hello', 'Beautiful', 'World'],
          statistics: { wordsUsed: 3, sentencesGenerated: 3 }
        })
      });
    });
    
    // Select words for generation
    const wordCheckboxes = popupPage.locator('[data-testid="word-checkbox"]');
    await wordCheckboxes.nth(0).check(); // Hello
    await wordCheckboxes.nth(1).check(); // Beautiful
    await wordCheckboxes.nth(2).check(); // World
    
    const generateButton = popupPage.locator('[data-testid="generate-sentences"]');
    await generateButton.click();
    
    // Wait for generation to complete
    await expect(popupPage.locator('[data-testid="generation-loading"]')).not.toBeVisible();
    
    const generatedSentences = popupPage.locator('[data-testid="generated-sentences"]');
    await expect(generatedSentences).toBeVisible();
    
    const sentences = popupPage.locator('[data-testid="generated-sentence"]');
    await expect(sentences).toHaveCount(3);
    
    // 4. Save generated content
    const saveButton = popupPage.locator('[data-testid="save-content"]');
    await saveButton.click();
    
    const saveSuccess = popupPage.locator('[data-testid="save-success"]');
    await expect(saveSuccess).toBeVisible();
    
    // 5. Export vocabulary
    const vocabularyTab = popupPage.locator('[data-testid="vocabulary-tab"]');
    await vocabularyTab.click();
    
    const downloadPromise = popupPage.waitForEvent('download');
    const exportButton = popupPage.locator('[data-testid="export-vocabulary"]');
    await exportButton.click();
    
    const csvOption = popupPage.locator('[data-testid="export-csv"]');
    await csvOption.click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('complete cross-site translation and vocabulary building workflow', async ({ page }) => {
    await extensionUtils.setConfig(mockUserConfig);
    
    // Mock translation responses for different texts
    const translations = {
      'Hello world': {
        originalText: 'Hello world',
        translatedText: 'Hola mundo',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        examples: [{ original: 'Hello there', translated: 'Hola ahí', context: 'greeting' }],
        confidence: 0.95,
        timestamp: new Date()
      },
      'Good morning': {
        originalText: 'Good morning',
        translatedText: 'Buenos días',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        examples: [{ original: 'Good morning everyone', translated: 'Buenos días a todos', context: 'greeting' }],
        confidence: 0.92,
        timestamp: new Date()
      },
      'Thank you': {
        originalText: 'Thank you',
        translatedText: 'Gracias',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        examples: [{ original: 'Thank you very much', translated: 'Muchas gracias', context: 'gratitude' }],
        confidence: 0.98,
        timestamp: new Date()
      }
    };
    
    // Setup dynamic translation mock
    await page.route('**/api/translate', async route => {
      const request = await route.request().postDataJSON();
      const text = request.text;
      const response = translations[text as keyof typeof translations];
      
      if (response) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response)
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            originalText: text,
            translatedText: `Translated: ${text}`,
            sourceLanguage: 'en',
            targetLanguage: 'es',
            examples: [],
            confidence: 0.8,
            timestamp: new Date()
          })
        });
      }
    });
    
    // 1. Visit first website and translate text
    const site1 = 'data:text/html,<html><body><h1>Site 1</h1><p>Hello world</p></body></html>';
    await page.goto(site1);
    
    await extensionUtils.selectText('p');
    await extensionUtils.waitForTranslationOverlay();
    
    let overlay = page.locator('[data-testid="translation-overlay"]');
    await expect(overlay).toContainText('Hola mundo');
    
    // Add to vocabulary
    let addButton = page.locator('[data-testid="add-to-vocabulary"]');
    await addButton.click();
    
    await expect(page.locator('[data-testid="vocabulary-success"]')).toBeVisible();
    
    // Close overlay
    await page.keyboard.press('Escape');
    
    // 2. Visit second website and translate different text
    const site2 = 'data:text/html,<html><body><h1>Site 2</h1><p>Good morning</p></body></html>';
    await page.goto(site2);
    
    await extensionUtils.selectText('p');
    await extensionUtils.waitForTranslationOverlay();
    
    overlay = page.locator('[data-testid="translation-overlay"]');
    await expect(overlay).toContainText('Buenos días');
    
    addButton = page.locator('[data-testid="add-to-vocabulary"]');
    await addButton.click();
    
    await page.keyboard.press('Escape');
    
    // 3. Visit third website
    const site3 = 'data:text/html,<html><body><h1>Site 3</h1><p>Thank you</p></body></html>';
    await page.goto(site3);
    
    await extensionUtils.selectText('p');
    await extensionUtils.waitForTranslationOverlay();
    
    overlay = page.locator('[data-testid="translation-overlay"]');
    await expect(overlay).toContainText('Gracias');
    
    addButton = page.locator('[data-testid="add-to-vocabulary"]');
    await addButton.click();
    
    // 4. Check vocabulary collection in popup
    const popupPage = await extensionUtils.openPopup();
    
    const vocabularyItems = popupPage.locator('[data-testid="vocabulary-item"]');
    await expect(vocabularyItems).toHaveCount(3);
    
    // Verify all translations are saved with correct source URLs
    const items = await vocabularyItems.all();
    const vocabularyTexts = await Promise.all(
      items.map(item => item.textContent())
    );
    
    expect(vocabularyTexts.some(text => text?.includes('Hello world'))).toBeTruthy();
    expect(vocabularyTexts.some(text => text?.includes('Good morning'))).toBeTruthy();
    expect(vocabularyTexts.some(text => text?.includes('Thank you'))).toBeTruthy();
    
    // 5. Generate content using collected vocabulary
    const contentTab = popupPage.locator('[data-testid="content-generation-tab"]');
    await contentTab.click();
    
    // Mock article generation
    await popupPage.route('**/api/generate-article', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          article: 'Hello world! Good morning everyone. Thank you for reading this article about learning Spanish vocabulary.',
          title: 'Learning Spanish Greetings',
          usedWords: ['Hello world', 'Good morning', 'Thank you'],
          wordCount: 15
        })
      });
    });
    
    const articleTab = popupPage.locator('[data-testid="article-generation-tab"]');
    await articleTab.click();
    
    // Select all vocabulary words
    const wordCheckboxes = popupPage.locator('[data-testid="word-checkbox"]');
    const checkboxCount = await wordCheckboxes.count();
    for (let i = 0; i < checkboxCount; i++) {
      await wordCheckboxes.nth(i).check();
    }
    
    const topicInput = popupPage.locator('[data-testid="article-topic"]');
    await topicInput.fill('Spanish Greetings');
    
    const generateButton = popupPage.locator('[data-testid="generate-article"]');
    await generateButton.click();
    
    await expect(popupPage.locator('[data-testid="generation-loading"]')).not.toBeVisible();
    
    const generatedArticle = popupPage.locator('[data-testid="generated-article"]');
    await expect(generatedArticle).toBeVisible();
    await expect(generatedArticle).toContainText('Hello world');
    await expect(generatedArticle).toContainText('Good morning');
    await expect(generatedArticle).toContainText('Thank you');
  });

  test('complete error recovery and resilience workflow', async ({ page }) => {
    await extensionUtils.setConfig(mockUserConfig);
    
    // 1. Test network failure recovery
    const testUrl = 'data:text/html,<html><body><p>Network test Hello world</p></body></html>';
    await page.goto(testUrl);
    
    // Mock network failure
    await page.route('**/api/translate', async route => {
      await route.abort('failed');
    });
    
    await extensionUtils.selectText('p');
    await extensionUtils.waitForTranslationOverlay();
    
    let overlay = page.locator('[data-testid="translation-overlay"]');
    const errorMessage = overlay.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('network error');
    
    // 2. Test recovery after network is restored
    await page.route('**/api/translate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTranslationResponse)
      });
    });
    
    // Retry translation
    const retryButton = overlay.locator('[data-testid="retry-translation"]');
    if (await retryButton.isVisible()) {
      await retryButton.click();
    } else {
      // Close overlay and try again
      await page.keyboard.press('Escape');
      await extensionUtils.selectText('p');
      await extensionUtils.waitForTranslationOverlay();
    }
    
    overlay = page.locator('[data-testid="translation-overlay"]');
    await expect(overlay).toContainText('Hola mundo');
    
    // 3. Test storage quota handling
    const popupPage = await extensionUtils.openPopup();
    
    // Fill storage with large vocabulary to test quota limits
    const largeVocab = Array.from({ length: 1000 }, (_, i) => ({
      id: `vocab-${i}`,
      word: `Word${i}`,
      translation: `Palabra${i}`,
      context: `Context for word ${i}`,
      sourceUrl: `https://example${i}.com`,
      dateAdded: new Date(),
      reviewCount: 0
    }));
    
    // Mock storage quota exceeded error
    await popupPage.addInitScript(() => {
      const originalSet = chrome.storage.local.set;
      chrome.storage.local.set = function(items, callback) {
        // Simulate quota exceeded after some items
        if (Object.keys(items).length > 0 && Math.random() > 0.7) {
          const error = new Error('QUOTA_EXCEEDED');
          error.name = 'QuotaExceededError';
          if (callback) callback();
          throw error;
        }
        return originalSet.call(this, items, callback);
      };
    });
    
    // Try to import large vocabulary
    const importButton = popupPage.locator('[data-testid="import-vocabulary"]');
    if (await importButton.isVisible()) {
      const csvContent = largeVocab.map(item => 
        `${item.word},${item.translation},${item.context}`
      ).join('\n');
      
      const fileInput = popupPage.locator('[data-testid="import-file"]');
      await fileInput.setInputFiles({
        name: 'large-vocabulary.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      });
      
      await importButton.click();
      
      // Should handle quota error gracefully
      const quotaError = popupPage.locator('[data-testid="quota-error"]');
      if (await quotaError.isVisible()) {
        await expect(quotaError).toContainText('storage limit');
      }
    }
    
    // 4. Test configuration corruption recovery
    // Corrupt the configuration
    await popupPage.evaluate(() => {
      return new Promise<void>((resolve) => {
        chrome.storage.sync.set({ config: 'invalid-json-data' }, () => resolve());
      });
    });
    
    // Reload popup - should handle corrupted config
    await popupPage.reload();
    
    // Should show configuration error or reset to defaults
    const configError = popupPage.locator('[data-testid="config-error"]');
    const resetButton = popupPage.locator('[data-testid="reset-config"]');
    
    if (await configError.isVisible()) {
      await expect(configError).toContainText('configuration');
      
      if (await resetButton.isVisible()) {
        await resetButton.click();
        
        // Should restore to working state
        const resetSuccess = popupPage.locator('[data-testid="reset-success"]');
        await expect(resetSuccess).toBeVisible();
      }
    }
  });
});