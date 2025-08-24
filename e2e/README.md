# End-to-End Testing Documentation

This directory contains comprehensive end-to-end tests for the TransAI browser extension using Playwright.

## Test Structure

### Test Files

- **`translation-workflow.spec.ts`** - Tests core translation functionality
  - Text selection and translation overlay
  - Error handling and recovery
  - Cross-page translation consistency
  - Overlay positioning and behavior

- **`vocabulary-management.spec.ts`** - Tests vocabulary features
  - Adding words to vocabulary from translations
  - Vocabulary CRUD operations in popup
  - Search and filtering functionality
  - Export/import capabilities
  - Duplicate prevention

- **`content-generation.spec.ts`** - Tests AI content generation
  - Sentence generation using vocabulary
  - Article generation with topic selection
  - Content saving and history
  - Export functionality
  - Error handling for generation failures

- **`configuration.spec.ts`** - Tests extension configuration
  - API key setup and validation
  - Custom prompt configuration
  - UI preferences and themes
  - Configuration backup/restore
  - Health checks and status monitoring

- **`accessibility.spec.ts`** - Tests accessibility compliance
  - Keyboard navigation support
  - ARIA labels and roles
  - Screen reader compatibility
  - High contrast mode support
  - Focus management and trapping

- **`cross-browser.spec.ts`** - Tests browser compatibility
  - Chrome/Edge compatibility
  - Browser-specific API handling
  - Responsive design across viewports
  - Performance characteristics
  - Extension lifecycle management

- **`complete-workflows.spec.ts`** - Tests end-to-end user journeys
  - First-time user setup workflow
  - Complete vocabulary building journey
  - Cross-site translation workflow
  - Error recovery and resilience testing

### Utilities and Fixtures

- **`utils/extension-utils.ts`** - Helper class for extension interactions
  - Extension ID detection
  - Popup and options page navigation
  - Storage management
  - API mocking utilities

- **`fixtures/test-data.ts`** - Test data and mock responses
  - Mock translation responses
  - Sample vocabulary items
  - User configuration templates
  - Accessibility test data

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install chromium
   ```

3. Build the extension:
   ```bash
   pnpm build:chrome
   ```

### Test Commands

```bash
# Run all E2E tests
pnpm test:e2e

# Run tests with browser UI (headed mode)
pnpm test:e2e:headed

# Run tests in debug mode
pnpm test:e2e:debug

# Run tests with Playwright UI
pnpm test:e2e:ui

# Run specific test file
pnpm test:e2e translation-workflow.spec.ts

# Run tests for specific browser
pnpm test:e2e:chrome

# Run all tests (unit + E2E)
pnpm test:all
```

### Test Configuration

The tests are configured in `playwright.config.ts` with:

- **Projects**: Chromium and Chrome Extension specific configurations
- **Reporters**: HTML reporter for detailed results
- **Artifacts**: Screenshots and videos on failure
- **Timeouts**: Appropriate timeouts for extension operations

## Test Patterns

### Extension Setup

Each test follows this pattern:

```typescript
test.beforeEach(async ({ page, context }) => {
  extensionUtils = new ExtensionUtils(page, context);
  await extensionUtils.clearStorage();
  await extensionUtils.setConfig(mockUserConfig);
});
```

### API Mocking

Tests mock external APIs to ensure reliability:

```typescript
await extensionUtils.mockLLMAPI(mockTranslationResponse);

// Or custom mocking
await page.route('**/api/translate', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(response)
  });
});
```

### Extension Interactions

Common patterns for extension testing:

```typescript
// Open extension popup
const popupPage = await extensionUtils.openPopup();

// Open options page
const optionsPage = await extensionUtils.openOptionsPage();

// Simulate text selection
await extensionUtils.selectText('p');
await extensionUtils.waitForTranslationOverlay();

// Manage storage
await extensionUtils.clearStorage();
await extensionUtils.setConfig(config);
const vocabulary = await extensionUtils.getVocabulary();
```

## Test Data Management

### Mock Responses

All API responses are mocked using predefined fixtures:

- Translation responses with examples and confidence scores
- Content generation responses with statistics
- Error responses for failure scenarios

### Test Vocabulary

Tests use consistent vocabulary items for predictable results:

```typescript
const testVocab = [
  { id: 'vocab-1', word: 'Hello', translation: 'Hola', ... },
  { id: 'vocab-2', word: 'World', translation: 'Mundo', ... }
];
```

### Configuration Templates

Standard configuration templates ensure consistent test environments:

```typescript
const mockUserConfig = {
  apiKey: 'sk-test-key-123456789',
  apiProvider: 'openai',
  defaultTargetLanguage: 'es',
  // ... other settings
};
```

## Accessibility Testing

The accessibility tests verify:

- **Keyboard Navigation**: Tab order and keyboard shortcuts
- **ARIA Labels**: Proper labeling for screen readers
- **Focus Management**: Focus trapping in modals
- **High Contrast**: Visual accessibility support
- **Reduced Motion**: Animation preferences

## Cross-Browser Testing

Tests verify compatibility across:

- **Chrome/Chromium**: Primary target browser
- **Edge**: Secondary target browser
- **API Compatibility**: Browser-specific extension APIs
- **Performance**: Consistent performance characteristics
- **Responsive Design**: Various viewport sizes

## Continuous Integration

The GitHub Actions workflow (`../.github/workflows/e2e-tests.yml`) runs:

1. **Pull Request Tests**: Basic E2E test suite
2. **Main Branch Tests**: Full cross-browser test suite
3. **Artifact Collection**: Test reports and failure videos
4. **Matrix Testing**: Multiple browser configurations

## Debugging Tests

### Local Debugging

1. **Headed Mode**: See browser interactions
   ```bash
   pnpm test:e2e:headed
   ```

2. **Debug Mode**: Step through tests
   ```bash
   pnpm test:e2e:debug
   ```

3. **UI Mode**: Interactive test runner
   ```bash
   pnpm test:e2e:ui
   ```

### Test Artifacts

- **Screenshots**: Captured on test failure
- **Videos**: Recorded for failed tests
- **Traces**: Detailed execution traces
- **HTML Reports**: Comprehensive test results

### Common Issues

1. **Extension Not Loaded**: Ensure extension is built before testing
2. **Timing Issues**: Use proper waits for async operations
3. **Storage Conflicts**: Clear storage between tests
4. **API Mocking**: Verify mock routes are set up correctly

## Best Practices

### Test Organization

- Group related tests in describe blocks
- Use descriptive test names
- Keep tests focused and atomic
- Use proper setup and teardown

### Assertions

- Use specific selectors with data-testid attributes
- Verify both positive and negative scenarios
- Check for proper error handling
- Validate accessibility requirements

### Performance

- Mock external dependencies
- Use efficient selectors
- Minimize test data size
- Parallel test execution where possible

### Maintenance

- Update test data when features change
- Keep mock responses realistic
- Document test scenarios
- Regular test review and cleanup

## Coverage

The E2E tests cover:

- ✅ All user-facing workflows
- ✅ Error scenarios and recovery
- ✅ Cross-browser compatibility
- ✅ Accessibility compliance
- ✅ Performance characteristics
- ✅ Extension lifecycle events
- ✅ Storage and configuration management
- ✅ API integration and error handling

This comprehensive test suite ensures the TransAI extension works reliably across different browsers, environments, and user scenarios.