import { Page, BrowserContext } from '@playwright/test';

export class ExtensionUtils {
  constructor(private page: Page, private context: BrowserContext) {}

  /**
   * Get the extension ID from the loaded extension
   */
  async getExtensionId(): Promise<string> {
    // Navigate to chrome://extensions to get the extension ID
    await this.page.goto('chrome://extensions/');
    
    // Enable developer mode if not already enabled
    const devModeToggle = this.page.locator('#devMode');
    if (await devModeToggle.isVisible()) {
      await devModeToggle.click();
    }

    // Find the extension card and extract ID
    const extensionCard = this.page.locator('.extension-list-item').first();
    const extensionId = await extensionCard.getAttribute('id');
    
    if (!extensionId) {
      throw new Error('Extension ID not found');
    }

    return extensionId.replace('extension-', '');
  }

  /**
   * Navigate to the extension popup
   */
  async openPopup(): Promise<Page> {
    const extensionId = await this.getExtensionId();
    const popupUrl = `chrome-extension://${extensionId}/popup/index.html`;
    
    const popupPage = await this.context.newPage();
    await popupPage.goto(popupUrl);
    return popupPage;
  }

  /**
   * Navigate to the extension options page
   */
  async openOptionsPage(): Promise<Page> {
    const extensionId = await this.getExtensionId();
    const optionsUrl = `chrome-extension://${extensionId}/options/index.html`;
    
    const optionsPage = await this.context.newPage();
    await optionsPage.goto(optionsUrl);
    return optionsPage;
  }

  /**
   * Simulate text selection on a page
   */
  async selectText(selector: string, text?: string): Promise<void> {
    const element = this.page.locator(selector);
    
    if (text) {
      // Select specific text within the element
      await element.click();
      await this.page.keyboard.press('Control+A');
    } else {
      // Select the entire element
      await element.click({ clickCount: 3 });
    }
  }

  /**
   * Wait for the translation overlay to appear
   */
  async waitForTranslationOverlay(): Promise<void> {
    await this.page.waitForSelector('[data-testid="translation-overlay"]', {
      timeout: 5000
    });
  }

  /**
   * Mock API responses for testing
   */
  async mockLLMAPI(response: any): Promise<void> {
    await this.page.route('**/api/translate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Clear extension storage
   */
  async clearStorage(): Promise<void> {
    await this.page.evaluate(() => {
      return new Promise<void>((resolve) => {
        chrome.storage.local.clear(() => {
          chrome.storage.sync.clear(() => {
            resolve();
          });
        });
      });
    });
  }

  /**
   * Set extension configuration
   */
  async setConfig(config: any): Promise<void> {
    await this.page.evaluate((configData) => {
      return new Promise<void>((resolve) => {
        chrome.storage.sync.set({ config: configData }, () => {
          resolve();
        });
      });
    }, config);
  }

  /**
   * Get vocabulary items from storage
   */
  async getVocabulary(): Promise<any[]> {
    return await this.page.evaluate(() => {
      return new Promise<any[]>((resolve) => {
        chrome.storage.local.get(['vocabulary'], (result) => {
          resolve(result.vocabulary || []);
        });
      });
    });
  }
}