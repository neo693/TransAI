import { test, expect } from '@playwright/test';
import { ExtensionUtils } from './utils/extension-utils';
import { mockUserConfig } from './fixtures/test-data';

test.describe('Configuration E2E Tests', () => {
  let extensionUtils: ExtensionUtils;

  test.beforeEach(async ({ page, context }) => {
    extensionUtils = new ExtensionUtils(page, context);
    await extensionUtils.clearStorage();
  });

  test('should configure API key and validate it', async ({ page }) => {
    const optionsPage = await extensionUtils.openOptionsPage();
    
    // Navigate to API configuration section
    const apiSection = optionsPage.locator('[data-testid="api-configuration"]');
    await expect(apiSection).toBeVisible();
    
    // Enter API key
    const apiKeyInput = optionsPage.locator('[data-testid="api-key-input"]');
    await apiKeyInput.fill('sk-test-key-123456789');
    
    // Select API provider
    const providerSelect = optionsPage.locator('[data-testid="api-provider-select"]');
    await providerSelect.selectOption('openai');
    
    // Test API key validation
    const validateButton = optionsPage.locator('[data-testid="validate-api-key"]');
    
    // Mock successful validation
    await optionsPage.route('**/api/validate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: true, provider: 'openai' })
      });
    });
    
    await validateButton.click();
    
    // Should show validation success
    const validationSuccess = optionsPage.locator('[data-testid="validation-success"]');
    await expect(validationSuccess).toBeVisible();
    await expect(validationSuccess).toContainText('API key is valid');
    
    // Save configuration
    const saveButton = optionsPage.locator('[data-testid="save-config"]');
    await saveButton.click();
    
    // Verify save success
    const saveSuccess = optionsPage.locator('[data-testid="save-success"]');
    await expect(saveSuccess).toBeVisible();
  });

  test('should handle invalid API key gracefully', async ({ page }) => {
    const optionsPage = await extensionUtils.openOptionsPage();
    
    const apiKeyInput = optionsPage.locator('[data-testid="api-key-input"]');
    await apiKeyInput.fill('invalid-key');
    
    // Mock validation failure
    await optionsPage.route('**/api/validate', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ valid: false, error: 'Invalid API key' })
      });
    });
    
    const validateButton = optionsPage.locator('[data-testid="validate-api-key"]');
    await validateButton.click();
    
    // Should show validation error
    const validationError = optionsPage.locator('[data-testid="validation-error"]');
    await expect(validationError).toBeVisible();
    await expect(validationError).toContainText('Invalid API key');
  });

  test('should configure custom translation prompts', async ({ page }) => {
    const optionsPage = await extensionUtils.openOptionsPage();
    
    // Navigate to prompts section
    const promptsTab = optionsPage.locator('[data-testid="prompts-tab"]');
    await promptsTab.click();
    
    // Edit translation prompt
    const translationPrompt = optionsPage.locator('[data-testid="translation-prompt"]');
    await translationPrompt.clear();
    await translationPrompt.fill('Custom translation prompt: Translate "{text}" to {targetLanguage} with examples');
    
    // Edit sentence generation prompt
    const sentencePrompt = optionsPage.locator('[data-testid="sentence-prompt"]');
    await sentencePrompt.clear();
    await sentencePrompt.fill('Custom sentence prompt: Create {count} sentences using: {words}');
    
    // Save prompts
    const saveButton = optionsPage.locator('[data-testid="save-prompts"]');
    await saveButton.click();
    
    // Verify save success
    const saveSuccess = optionsPage.locator('[data-testid="save-success"]');
    await expect(saveSuccess).toBeVisible();
    
    // Verify prompts are saved by reloading page
    await optionsPage.reload();
    await promptsTab.click();
    
    await expect(translationPrompt).toHaveValue('Custom translation prompt: Translate "{text}" to {targetLanguage} with examples');
  });

  test('should reset prompts to defaults', async ({ page }) => {
    // Set custom prompts first
    await extensionUtils.setConfig({
      ...mockUserConfig,
      customPrompts: {
        translation: 'Custom prompt',
        sentenceGeneration: 'Custom sentence prompt',
        articleGeneration: 'Custom article prompt'
      }
    });
    
    const optionsPage = await extensionUtils.openOptionsPage();
    
    const promptsTab = optionsPage.locator('[data-testid="prompts-tab"]');
    await promptsTab.click();
    
    // Reset to defaults
    const resetButton = optionsPage.locator('[data-testid="reset-prompts"]');
    await resetButton.click();
    
    // Confirm reset
    const confirmButton = optionsPage.locator('[data-testid="confirm-reset"]');
    await confirmButton.click();
    
    // Verify prompts are reset
    const translationPrompt = optionsPage.locator('[data-testid="translation-prompt"]');
    await expect(translationPrompt).not.toHaveValue('Custom prompt');
  });

  test('should configure UI preferences', async ({ page }) => {
    const optionsPage = await extensionUtils.openOptionsPage();
    
    // Navigate to UI preferences
    const uiTab = optionsPage.locator('[data-testid="ui-preferences-tab"]');
    await uiTab.click();
    
    // Change theme
    const themeSelect = optionsPage.locator('[data-testid="theme-select"]');
    await themeSelect.selectOption('dark');
    
    // Change overlay position
    const overlaySelect = optionsPage.locator('[data-testid="overlay-position-select"]');
    await overlaySelect.selectOption('bottom');
    
    // Toggle auto-play pronunciation
    const autoPlayCheckbox = optionsPage.locator('[data-testid="auto-play-pronunciation"]');
    await autoPlayCheckbox.check();
    
    // Save preferences
    const saveButton = optionsPage.locator('[data-testid="save-preferences"]');
    await saveButton.click();
    
    // Verify save success
    const saveSuccess = optionsPage.locator('[data-testid="save-success"]');
    await expect(saveSuccess).toBeVisible();
    
    // Verify theme change is applied
    const body = optionsPage.locator('body');
    await expect(body).toHaveClass(/dark-theme/);
  });

  test('should configure default target language', async ({ page }) => {
    const optionsPage = await extensionUtils.openOptionsPage();
    
    // Change default target language
    const languageSelect = optionsPage.locator('[data-testid="default-language-select"]');
    await languageSelect.selectOption('fr');
    
    // Save configuration
    const saveButton = optionsPage.locator('[data-testid="save-config"]');
    await saveButton.click();
    
    // Verify configuration is saved
    const config = await optionsPage.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.sync.get(['config'], (result) => {
          resolve(result.config);
        });
      });
    });
    
    expect(config).toMatchObject({
      defaultTargetLanguage: 'fr'
    });
  });

  test('should export and import configuration', async ({ page }) => {
    // Set up test configuration
    await extensionUtils.setConfig(mockUserConfig);
    
    const optionsPage = await extensionUtils.openOptionsPage();
    
    // Navigate to backup section
    const backupTab = optionsPage.locator('[data-testid="backup-tab"]');
    await backupTab.click();
    
    // Export configuration
    const downloadPromise = optionsPage.waitForEvent('download');
    const exportButton = optionsPage.locator('[data-testid="export-config"]');
    await exportButton.click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('transai-config');
    
    // Clear configuration
    await extensionUtils.clearStorage();
    
    // Import configuration
    const configContent = JSON.stringify(mockUserConfig);
    const fileInput = optionsPage.locator('[data-testid="import-config-file"]');
    
    await fileInput.setInputFiles({
      name: 'transai-config.json',
      mimeType: 'application/json',
      buffer: Buffer.from(configContent)
    });
    
    const importButton = optionsPage.locator('[data-testid="import-config"]');
    await importButton.click();
    
    // Verify import success
    const importSuccess = optionsPage.locator('[data-testid="import-success"]');
    await expect(importSuccess).toBeVisible();
    
    // Verify configuration is restored
    await optionsPage.reload();
    const apiKeyInput = optionsPage.locator('[data-testid="api-key-input"]');
    await expect(apiKeyInput).toHaveValue(mockUserConfig.apiKey);
  });

  test('should validate configuration before saving', async ({ page }) => {
    const optionsPage = await extensionUtils.openOptionsPage();
    
    // Try to save with empty API key
    const apiKeyInput = optionsPage.locator('[data-testid="api-key-input"]');
    await apiKeyInput.clear();
    
    const saveButton = optionsPage.locator('[data-testid="save-config"]');
    await saveButton.click();
    
    // Should show validation error
    const validationError = optionsPage.locator('[data-testid="config-validation-error"]');
    await expect(validationError).toBeVisible();
    await expect(validationError).toContainText('API key is required');
  });

  test('should show configuration status and health check', async ({ page }) => {
    await extensionUtils.setConfig(mockUserConfig);
    
    const optionsPage = await extensionUtils.openOptionsPage();
    
    // Mock health check API
    await optionsPage.route('**/api/health', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'healthy',
          apiConnected: true,
          storageAvailable: true,
          lastCheck: new Date().toISOString()
        })
      });
    });
    
    // Run health check
    const healthCheckButton = optionsPage.locator('[data-testid="health-check"]');
    await healthCheckButton.click();
    
    // Verify health status
    const healthStatus = optionsPage.locator('[data-testid="health-status"]');
    await expect(healthStatus).toBeVisible();
    await expect(healthStatus).toContainText('healthy');
    
    const apiStatus = optionsPage.locator('[data-testid="api-status"]');
    await expect(apiStatus).toContainText('connected');
  });
});