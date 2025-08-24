# Contributing to TransAI Browser Extension

Thank you for your interest in contributing to TransAI! This document provides guidelines and information for contributors.

## 🤝 Ways to Contribute

### 🐛 Bug Reports
- Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md)
- Include detailed reproduction steps
- Provide browser version and extension version
- Include screenshots or videos if helpful

### 💡 Feature Requests
- Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md)
- Describe the problem you're trying to solve
- Explain your proposed solution
- Consider alternative solutions

### 📝 Documentation
- Improve existing documentation
- Add examples and tutorials
- Fix typos and grammar
- Translate documentation to other languages

### 🔧 Code Contributions
- Fix bugs and implement features
- Improve performance and accessibility
- Add tests and improve test coverage
- Refactor and clean up code

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **pnpm** 8 or higher
- **Git** for version control
- **Chrome/Edge** browser for testing

### Development Setup

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/browser-extension.git
   cd browser-extension
   ```
3. **Install** dependencies:
   ```bash
   pnpm install
   ```
4. **Start** development server:
   ```bash
   pnpm dev
   ```
5. **Load** the extension in your browser (see [README.md](README.md#development))

### Development Workflow

1. **Create** a new branch for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Make** your changes with appropriate tests
3. **Test** your changes:
   ```bash
   pnpm test
   pnpm test:e2e
   pnpm lint
   ```
4. **Commit** your changes (see [Commit Guidelines](#commit-guidelines))
5. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Create** a Pull Request

## 📋 Development Guidelines

### Code Style

We use automated tools to maintain consistent code style:

- **ESLint**: Enforces code quality and style rules
- **Prettier**: Formats code consistently
- **TypeScript**: Provides type safety

Run linting and formatting:
```bash
pnpm lint          # Check for issues
pnpm lint:fix      # Fix auto-fixable issues
```

### TypeScript Guidelines

- Use **strict mode** (enabled in `tsconfig.json`)
- Avoid `any` types - use proper typing
- Define interfaces for all data structures
- Use type guards for runtime type checking
- Document complex types with JSDoc comments

Example:
```typescript
// Good
interface VocabularyItem {
  id: string
  word: string
  translation: string
  context?: string
  dateAdded: Date
}

// Avoid
const item: any = { /* ... */ }
```

### React Guidelines

- Use **functional components** with hooks
- Implement **proper error boundaries**
- Use **TypeScript** for all props and state
- Follow **accessibility best practices**
- Implement **proper loading and error states**

Example:
```typescript
interface TranslationOverlayProps {
  translation: TranslationResult
  onAddToVocabulary: (word: string) => void
  onClose: () => void
}

const TranslationOverlay: React.FC<TranslationOverlayProps> = ({
  translation,
  onAddToVocabulary,
  onClose
}) => {
  // Component implementation
}
```

### Testing Guidelines

#### Unit Tests
- Write tests for all new functions and components
- Use descriptive test names
- Test both success and error cases
- Mock external dependencies

```typescript
describe('TranslationService', () => {
  it('should translate text successfully with valid API key', async () => {
    // Test implementation
  })

  it('should handle API errors gracefully', async () => {
    // Test implementation
  })
})
```

#### Integration Tests
- Test component interactions
- Test data flow between services
- Test error handling across components

#### E2E Tests
- Test complete user workflows
- Test accessibility features
- Test cross-browser compatibility

### Accessibility Guidelines

- Use **semantic HTML** elements
- Provide **ARIA labels** and roles
- Ensure **keyboard navigation** works
- Test with **screen readers**
- Support **high contrast mode**
- Respect **reduced motion** preferences

Example:
```typescript
<button
  aria-label="Add word to vocabulary"
  onClick={handleAddToVocabulary}
  disabled={isLoading}
>
  {isLoading ? <LoadingSpinner /> : <PlusIcon />}
</button>
```

## 🧪 Testing

### Running Tests

```bash
# Unit tests
pnpm test                    # Run once
pnpm test:watch             # Watch mode
pnpm test:coverage          # With coverage report

# E2E tests
pnpm test:e2e               # Run all E2E tests
pnpm test:e2e:headed        # With browser UI
pnpm test:e2e:debug         # Debug mode

# Cross-browser tests
pnpm test:cross-browser     # Test browser compatibility
```

### Test Requirements

- **New features** must include tests
- **Bug fixes** should include regression tests
- **Tests must pass** before merging
- **Coverage** should not decrease significantly

### Writing Good Tests

1. **Arrange**: Set up test data and mocks
2. **Act**: Execute the code being tested
3. **Assert**: Verify the expected behavior

```typescript
it('should add word to vocabulary successfully', async () => {
  // Arrange
  const mockStorage = createMockStorage()
  const vocabularyService = new VocabularyService(mockStorage)
  const word = createMockVocabularyItem()

  // Act
  const result = await vocabularyService.addWord(word)

  // Assert
  expect(result.success).toBe(true)
  expect(mockStorage.set).toHaveBeenCalledWith(
    expect.objectContaining({ word: word.word })
  )
})
```

## 📝 Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for consistent commit messages:

### Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples
```bash
feat(translation): add support for custom prompts
fix(vocabulary): prevent duplicate entries
docs(readme): update installation instructions
test(e2e): add accessibility tests
```

### Scope Guidelines
- **translation**: Translation service and UI
- **vocabulary**: Vocabulary management
- **content**: Content generation features
- **ui**: User interface components
- **storage**: Data storage and persistence
- **api**: API integration and communication

## 🔄 Pull Request Process

### Before Submitting

1. **Rebase** your branch on the latest main:
   ```bash
   git fetch origin
   git rebase origin/main
   ```
2. **Run** all tests and linting:
   ```bash
   pnpm test && pnpm test:e2e && pnpm lint
   ```
3. **Update** documentation if needed
4. **Add** changelog entry for significant changes

### Pull Request Template

Use our [PR template](.github/pull_request_template.md) and include:

- **Description** of changes
- **Type** of change (bug fix, feature, etc.)
- **Testing** performed
- **Screenshots** for UI changes
- **Breaking changes** if any

### Review Process

1. **Automated checks** run (CI/CD pipeline)
2. **Code review** by maintainers
3. **Manual testing** if needed
4. **Approval** from at least one maintainer
5. **Merge** after all checks pass

### Review Criteria

- Code follows project standards
- Tests are comprehensive and passing
- Documentation is updated
- No breaking changes without discussion
- Accessibility requirements met

## 🏗 Architecture Guidelines

### Project Structure

Follow the established project structure:

```
src/
├── background/           # Background service worker
├── content/             # Content scripts
├── popup/               # Extension popup
├── options/             # Options page
├── services/            # Business logic
├── components/          # Reusable components
├── types/               # Type definitions
├── utils/               # Utility functions
└── test/                # Test utilities
```

### Service Layer

- Keep business logic in services
- Use dependency injection for testability
- Implement proper error handling
- Use TypeScript interfaces for contracts

### Component Guidelines

- Keep components focused and small
- Use composition over inheritance
- Implement proper prop validation
- Handle loading and error states

### State Management

- Use React hooks for local state
- Use browser storage for persistence
- Implement proper data validation
- Handle storage errors gracefully

## 🐛 Debugging

### Development Tools

- **React DevTools**: Debug React components
- **Chrome DevTools**: Debug extension pages
- **Extension DevTools**: Debug background scripts
- **Playwright Inspector**: Debug E2E tests

### Common Issues

#### Extension Not Loading
1. Check manifest.json syntax
2. Verify file paths in manifest
3. Check console for errors
4. Reload extension in developer mode

#### Tests Failing
1. Check test setup and mocks
2. Verify async operations complete
3. Check for timing issues
4. Review test isolation

#### Build Issues
1. Clear node_modules and reinstall
2. Check TypeScript errors
3. Verify import paths
4. Check for circular dependencies

## 📚 Resources

### Documentation
- [User Guide](docs/USER_GUIDE.md)
- [Developer Guide](docs/DEVELOPER_GUIDE.md)
- [API Reference](docs/API_REFERENCE.md)

### External Resources
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [React Documentation](https://reactjs.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Playwright Documentation](https://playwright.dev/)

### Community
- [GitHub Discussions](https://github.com/transai/browser-extension/discussions)
- [Discord Server](https://discord.gg/transai)
- [Twitter](https://twitter.com/transai)

## 🎯 Contribution Recognition

We value all contributions and recognize contributors in several ways:

- **Contributors list** in README.md
- **Release notes** mention significant contributions
- **Special badges** for regular contributors
- **Maintainer status** for exceptional contributors

## 📞 Getting Help

If you need help with contributing:

1. **Check existing issues** and discussions
2. **Ask in GitHub Discussions**
3. **Join our Discord** for real-time help
4. **Email maintainers** for private questions

## 📄 License

By contributing to TransAI, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to TransAI! Your efforts help make language learning more accessible and effective for everyone. 🌟