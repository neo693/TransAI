# TransAI Browser Extension - Developer Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Core Components](#core-components)
5. [API Integration](#api-integration)
6. [Testing Strategy](#testing-strategy)
7. [Build & Deployment](#build--deployment)
8. [Contributing](#contributing)

## Architecture Overview

TransAI is built using modern web technologies with a focus on maintainability, performance, and cross-browser compatibility.

### Technology Stack
- **TypeScript**: Type-safe JavaScript development
- **React**: UI component framework
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Fast build tool and development server
- **Vitest**: Unit testing framework
- **Playwright**: End-to-end testing
- **pnpm**: Fast, disk space efficient package manager

### Extension Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Content       │    │   Background    │    │   Popup/Options │
│   Script        │◄──►│   Service       │◄──►│   Pages         │
│                 │    │   Worker        │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Text          │    │   LLM API       │    │   Storage       │
│   Selection     │    │   Services      │    │   Management    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Development Setup

### Prerequisites
- Node.js 18+ 
- pnpm 8+
- Chrome/Edge browser for testing

### Installation
```bash
# Clone the repository
git clone https://github.com/transai/browser-extension.git
cd browser-extension

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build:chrome  # or pnpm build:edge
```

### Development Commands
```bash
# Development
pnpm dev                    # Start development server with hot reload
pnpm build                  # Build for all browsers
pnpm build:chrome          # Build for Chrome
pnpm build:edge            # Build for Edge

# Testing
pnpm test                  # Run unit tests
pnpm test:watch           # Run tests in watch mode
pnpm test:e2e             # Run end-to-end tests
pnpm test:cross-browser   # Run cross-browser tests

# Code Quality
pnpm lint                 # Run ESLint
pnpm type-check          # Run TypeScript compiler check
```

## Project Structure

```
src/
├── background/           # Background service worker
│   ├── background-service.ts
│   ├── message-router.ts
│   └── index.ts
├── content/             # Content scripts
│   ├── text-selector.ts
│   ├── translation-overlay.tsx
│   └── styles.css
├── popup/               # Extension popup
│   ├── App.tsx
│   ├── index.tsx
│   └── index.html
├── options/             # Options page
│   ├── App.tsx
│   ├── index.tsx
│   └── index.html
├── services/            # Core services
│   ├── llm.ts
│   ├── translation.ts
│   ├── vocabulary.ts
│   ├── storage.ts
│   ├── audio.ts
│   └── content-generation.ts
├── components/          # Reusable React components
│   ├── loading-indicator.tsx
│   ├── pronunciation-button.tsx
│   └── performance-monitor.tsx
├── types/               # TypeScript type definitions
│   ├── index.ts
│   ├── messages.ts
│   └── utilities.ts
├── utils/               # Utility functions
│   ├── validation.ts
│   ├── performance.ts
│   └── browser-detection.ts
├── test/                # Unit tests
└── manifest.json        # Extension manifest
```

## Core Components

### Background Service Worker

The background service worker (`src/background/background-service.ts`) is the central hub that:
- Handles API communications with LLM services
- Manages storage operations
- Routes messages between components
- Provides vocabulary and translation services

Key responsibilities:
```typescript
class BackgroundService {
  // Initialize services
  async initialize(): Promise<void>
  
  // Handle translation requests
  async handleTranslation(message: TranslationMessage): Promise<MessageResponse>
  
  // Manage vocabulary operations
  async handleAddToVocabulary(message: AddToVocabularyMessage): Promise<MessageResponse>
  
  // Generate content using AI
  async handleContentGeneration(message: ContentGenerationMessage): Promise<MessageResponse>
}
```

### Content Scripts

Content scripts (`src/content/`) inject functionality into web pages:

**Text Selector** (`text-selector.ts`):
- Detects text selection events
- Calculates overlay positioning
- Handles selection validation

**Translation Overlay** (`translation-overlay.tsx`):
- Displays translation popup
- Manages user interactions
- Handles vocabulary addition

### Services Layer

#### LLM Service (`src/services/llm.ts`)
Provides abstraction over different AI providers:
```typescript
interface LLMClient {
  translate(text: string, options: TranslationOptions): Promise<TranslationResult>
  generateContent(prompt: string, options: GenerationOptions): Promise<string>
  validateApiKey(): Promise<boolean>
}
```

#### Translation Service (`src/services/translation.ts`)
Manages translation logic:
- Prompt management and customization
- Response caching
- Error handling and retries
- Context extraction

#### Vocabulary Service (`src/services/vocabulary.ts`)
Handles vocabulary operations:
- CRUD operations for vocabulary items
- Search and filtering
- Export/import functionality
- Statistics tracking

#### Storage Service (`src/services/storage.ts`)
Manages data persistence:
- Browser storage abstraction
- Data validation and migration
- Cache management
- Backup and restore

## API Integration

### LLM Provider Integration

The extension supports multiple AI providers through a unified interface:

```typescript
// Provider configuration
interface ProviderConfig {
  apiKey: string
  baseUrl?: string
  model?: string
  maxTokens?: number
}

// Provider factory
class LLMClientFactory {
  static create(provider: APIProvider, config: ProviderConfig): LLMClient {
    switch (provider) {
      case 'openai':
        return new OpenAIClient(config)
      case 'anthropic':
        return new AnthropicClient(config)
      case 'custom':
        return new CustomClient(config)
    }
  }
}
```

### Message Passing

Communication between components uses a typed message system:

```typescript
// Message types
enum MessageType {
  TRANSLATE = 'TRANSLATE',
  ADD_TO_VOCABULARY = 'ADD_TO_VOCABULARY',
  GENERATE_CONTENT = 'GENERATE_CONTENT'
}

// Message interface
interface Message<T = any> {
  id: string
  type: MessageType
  timestamp: number
  payload: T
}

// Response interface
interface MessageResponse<T = any> {
  id: string
  success: boolean
  payload: T
  error?: string
}
```

### Error Handling

Comprehensive error handling across all layers:

```typescript
// Error types
enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR'
}

// Error handling utility
class ErrorHandler {
  static handle(error: Error, context: string): MessageResponse {
    // Log error, determine type, create response
  }
}
```

## Testing Strategy

### Unit Tests (Vitest)

Located in `src/test/`, covering:
- Service layer logic
- Utility functions
- Component behavior
- Data validation

Example test structure:
```typescript
describe('TranslationService', () => {
  let service: TranslationService
  let mockLLMClient: MockedLLMClient

  beforeEach(() => {
    mockLLMClient = createMockLLMClient()
    service = new TranslationService(mockLLMClient)
  })

  it('should translate text successfully', async () => {
    // Test implementation
  })
})
```

### Integration Tests

Test component interactions and data flow:
- Background service message handling
- Storage operations
- Cross-component communication

### End-to-End Tests (Playwright)

Located in `e2e/`, covering:
- Complete user workflows
- Cross-browser compatibility
- Accessibility compliance
- Performance characteristics

### Test Data Management

Consistent test data using fixtures:
```typescript
// Test fixtures
export const mockTranslationResponse = {
  originalText: 'Hello world',
  translatedText: 'Hola mundo',
  // ... other properties
}

export const mockUserConfig = {
  apiKey: 'test-key',
  apiProvider: 'openai',
  // ... other settings
}
```

## Build & Deployment

### Build Process

The build system uses Vite with custom plugins:

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: './src/manifest.json',
      browser: process.env.TARGET_BROWSER || 'chrome'
    })
  ],
  build: {
    outDir: `dist/${process.env.TARGET_BROWSER || 'chrome'}`,
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        options: 'src/options/index.html',
        background: 'src/background/index.ts',
        content: 'src/content/index.ts'
      }
    }
  }
})
```

### Manifest Generation

Dynamic manifest generation for different browsers:
```typescript
// Browser-specific manifests
const chromeManifest = {
  manifest_version: 3,
  action: { default_popup: 'popup/index.html' }
}

const edgeManifest = {
  manifest_version: 3,
  action: { default_popup: 'popup/index.html' }
}
```

### Release Process

1. **Version Bump**: Update version in `package.json` and `manifest.json`
2. **Build**: Generate production builds for all browsers
3. **Test**: Run full test suite including E2E tests
4. **Package**: Create ZIP files for store submission
5. **Deploy**: Upload to Chrome Web Store and Edge Add-ons

### CI/CD Pipeline

GitHub Actions workflow for automated testing and deployment:
```yaml
name: Build and Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm test
      - run: pnpm test:e2e
      - run: pnpm build:all
```

## Contributing

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/new-feature`
3. **Develop** with tests: Write code and corresponding tests
4. **Test** thoroughly: Run unit, integration, and E2E tests
5. **Submit** pull request with clear description

### Code Standards

- **TypeScript**: Strict mode enabled, no `any` types
- **ESLint**: Enforced code style and best practices
- **Prettier**: Consistent code formatting
- **Conventional Commits**: Structured commit messages

### Pull Request Guidelines

- Include tests for new functionality
- Update documentation as needed
- Ensure all CI checks pass
- Provide clear description of changes
- Reference related issues

### Code Review Process

1. **Automated Checks**: CI pipeline runs tests and linting
2. **Manual Review**: Core team reviews code quality and design
3. **Testing**: Reviewers test functionality manually
4. **Approval**: Two approvals required for merge

### Release Guidelines

- **Semantic Versioning**: Major.Minor.Patch format
- **Changelog**: Document all changes
- **Migration Guide**: For breaking changes
- **Backward Compatibility**: Maintain when possible

---

## Additional Resources

- **API Documentation**: [API Reference](./API_REFERENCE.md)
- **Architecture Decisions**: [ADR Documents](./architecture/)
- **Performance Guide**: [Performance Optimization](./PERFORMANCE.md)
- **Security Guide**: [Security Best Practices](./SECURITY.md)

---

*For questions or support, please open an issue on GitHub or contact the development team.*