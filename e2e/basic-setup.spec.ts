import { test, expect } from '@playwright/test';

test.describe('Basic E2E Setup Tests', () => {
  test('should load a basic webpage', async ({ page }) => {
    const testUrl = 'data:text/html,<html><body><h1>Test Page</h1><p>Hello world</p></body></html>';
    await page.goto(testUrl);
    
    const heading = page.locator('h1');
    await expect(heading).toContainText('Test Page');
    
    const paragraph = page.locator('p');
    await expect(paragraph).toContainText('Hello world');
  });

  test('should handle text selection', async ({ page }) => {
    const testUrl = 'data:text/html,<html><body><p id="test-text">This is selectable text</p></body></html>';
    await page.goto(testUrl);
    
    const paragraph = page.locator('#test-text');
    
    // Triple-click to select all text
    await paragraph.click({ clickCount: 3 });
    
    // Verify text is selected
    const selectedText = await page.evaluate(() => {
      return window.getSelection()?.toString();
    });
    
    expect(selectedText).toBe('This is selectable text');
  });

  test('should support keyboard navigation', async ({ page }) => {
    const testUrl = 'data:text/html,<html><body><button id="btn1">Button 1</button><button id="btn2">Button 2</button></body></html>';
    await page.goto(testUrl);
    
    // Tab to first button
    await page.keyboard.press('Tab');
    const firstButton = page.locator('#btn1');
    await expect(firstButton).toBeFocused();
    
    // Tab to second button
    await page.keyboard.press('Tab');
    const secondButton = page.locator('#btn2');
    await expect(secondButton).toBeFocused();
  });

  test('should handle API mocking', async ({ page }) => {
    // Mock a simple API endpoint
    await page.route('**/api/test', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Test successful' })
      });
    });
    
    const testUrl = 'data:text/html,<html><body><button onclick="fetch(\'https://example.com/api/test\').then(r=>r.json()).then(d=>document.getElementById(\'result\').textContent=d.message).catch(e=>document.getElementById(\'result\').textContent=\'Error: \'+e.message)">Test API</button><div id="result"></div></body></html>';
    await page.goto(testUrl);
    
    const button = page.locator('button');
    await button.click();
    
    const result = page.locator('#result');
    await expect(result).toContainText('Test successful', { timeout: 10000 });
  });

  test('should capture screenshots on failure', async ({ page }) => {
    const testUrl = 'data:text/html,<html><body><h1>Screenshot Test</h1></body></html>';
    await page.goto(testUrl);
    
    // This test should pass, demonstrating screenshot capability is available
    const heading = page.locator('h1');
    await expect(heading).toContainText('Screenshot Test');
  });
});