# Implementation Plan

- [x] 1. Set up project structure and development environment
  - Initialize pnpm workspace with TypeScript, React, and Tailwind CSS
  - Configure build tools for browser extension (webpack/vite)
  - Create manifest.json for Chrome/Edge compatibility
  - Set up development scripts and hot reload
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 2. Implement core data models and interfaces
  - Create TypeScript interfaces for TranslationResult, VocabularyItem, UserConfig
  - Implement data validation functions for all models
  - Create utility types and enums for extension configuration
  - Write unit tests for data model validation
  - _Requirements: 1.1, 2.2, 6.2, 7.2_

- [x] 3. Build storage service foundation
- [x] 3.1 Implement browser storage wrapper
  - Create StorageManager class with Chrome extension storage API
  - Implement CRUD operations for vocabulary and configuration
  - Add error handling for storage quota and access issues
  - Write unit tests for storage operations
  - _Requirements: 2.2, 2.3, 6.4, 7.4_

- [x] 3.2 Create vocabulary management service
  - Implement VocabularyStore with add, get, search, and delete methods
  - Add duplicate detection and prevention logic
  - Create vocabulary filtering and sorting functionality
  - Write unit tests for vocabulary operations
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 4. Develop LLM integration service
- [x] 4.1 Create LLM client foundation
  - Implement generic LLMClient class with API key validation
  - Create request/response handling with error management
  - Add support for different LLM providers (OpenAI, Anthropic, custom)
  - Write unit tests with mocked API responses
  - _Requirements: 6.1, 6.2, 6.3, 1.3_

- [x] 4.2 Implement translation service
  - Create TranslationService with prompt management
  - Implement built-in translation prompts with example generation
  - Add custom prompt support and validation
  - Create response parsing and formatting logic
  - Write unit tests for translation logic
  - _Requirements: 1.1, 1.4, 7.1, 7.3, 8.1, 8.2, 8.3_

- [x] 4.3 Add content generation capabilities
  - Implement sentence generation using vocabulary words
  - Create article generation with vocabulary integration
  - Add content highlighting for vocabulary words
  - Write unit tests for content generation
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 5. Build background service worker
- [x] 5.1 Create message routing system
  - Implement MessageRouter for cross-component communication
  - Create message types and handlers for all extension features
  - Add error handling and response validation
  - Write unit tests for message routing
  - _Requirements: 1.1, 2.1, 4.1, 5.1_

- [x] 5.2 Integrate services in background worker
  - Wire TranslationService, VocabularyStore, and StorageManager
  - Implement background message handlers for all operations
  - Add service initialization and configuration loading
  - Create error reporting and logging system
  - Write integration tests for background services
  - _Requirements: 1.3, 2.2, 4.1, 6.4_

- [x] 6. Develop content script for text selection
- [x] 6.1 Implement text selection detection
  - Create TextSelector class to handle mouse selection events
  - Add selection validation and text extraction
  - Implement position calculation for overlay placement
  - Handle edge cases for complex page layouts
  - Write unit tests for selection logic
  - _Requirements: 1.1, 1.2_

- [x] 6.2 Build translation overlay UI
  - Create React component for translation popup
  - Implement overlay positioning and responsive design
  - Add loading states and error handling UI
  - Style with Tailwind CSS for consistent appearance
  - Write component tests for overlay behavior
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 6.3 Add vocabulary integration to overlay
  - Implement "Add to Vocabulary" button in translation overlay
  - Create vocabulary status indicators (already saved, etc.)
  - Add success/error feedback for vocabulary operations
  - Handle vocabulary conflicts and updates
  - Write tests for vocabulary integration
  - _Requirements: 2.1, 2.4_

- [x] 7. Create popup UI interface
- [x] 7.1 Build main popup component
  - Create React-based popup with navigation and search
  - Implement vocabulary list display with pagination
  - Add quick translation input for manual translations
  - Style with Tailwind CSS responsive design
  - Write component tests for popup functionality
  - _Requirements: 2.3, 1.1_

- [x] 7.2 Add vocabulary management features
  - Implement vocabulary item editing and deletion
  - Create search and filter functionality for vocabulary
  - Add vocabulary statistics and learning progress
  - Implement vocabulary review and practice modes
  - Write tests for vocabulary management UI
  - _Requirements: 2.3, 2.4_

- [x] 8. Implement audio and pronunciation features
- [x] 8.1 Create audio service
  - Implement TTSService using Web Speech API or external TTS
  - Add audio caching for offline pronunciation
  - Create pronunciation button components
  - Handle audio playback errors and fallbacks
  - Write unit tests for audio functionality
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 8.2 Add phonetic transcription support
  - Implement phonetic transcription as audio fallback
  - Create pronunciation display components
  - Add language-specific pronunciation handling
  - Integrate pronunciation into translation overlay and popup
  - Write tests for pronunciation features
  - _Requirements: 5.3, 5.4_

- [x] 9. Build options and configuration page
- [x] 9.1 Create options page UI
  - Build React-based options page with form validation
  - Implement API key configuration with secure storage
  - Add language preferences and UI settings
  - Create custom prompt editing interface
  - Style with Tailwind CSS for professional appearance
  - _Requirements: 6.1, 6.2, 7.1, 7.2_

- [x] 9.2 Add export and import functionality
  - Implement vocabulary export in multiple formats (CSV, JSON)
  - Create export download and file generation
  - Add vocabulary import functionality for backup restoration
  - Implement data validation for imported vocabulary
  - Write tests for export/import operations
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 10. Implement content generation features
- [x] 10.1 Add sentence generation UI
  - Create sentence generation interface in popup
  - Implement vocabulary word selection for generation
  - Add generated content display and saving options
  - Create practice mode with generated sentences
  - Write tests for sentence generation UI
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 10.2 Build article generation functionality
  - Implement article generation with topic selection
  - Create article display with vocabulary highlighting
  - Add article export and sharing capabilities
  - Implement article-based learning exercises
  - Write tests for article generation features
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 11. Add cross-browser compatibility and optimization
- [x] 11.1 Ensure Chrome and Edge compatibility
  - Test and fix manifest V3 compatibility issues
  - Implement browser-specific API handling
  - Add feature detection for browser capabilities
  - Create browser-specific build configurations
  - Write cross-browser integration tests
  - _Requirements: 9.5_

- [x] 11.2 Optimize performance and user experience
  - Implement request caching and debouncing
  - Add loading states and progress indicators
  - Optimize bundle size and lazy loading
  - Implement error recovery and retry mechanisms
  - Create performance monitoring and analytics
  - _Requirements: 1.3, 1.4, 6.3, 6.4_

- [x] 12. Comprehensive testing and quality assurance
- [x] 12.1 Write end-to-end tests
  - Create E2E tests for complete user workflows
  - Test translation, vocabulary, and generation features
  - Implement cross-page and cross-site testing
  - Add accessibility and keyboard navigation tests
  - Create automated browser testing pipeline
  - _Requirements: All requirements validation_

- [x] 12.2 Final integration and polish
  - Integrate all components and test complete workflows
  - Fix integration issues and edge cases
  - Optimize UI/UX based on testing feedback
  - Create user documentation and help system
  - Prepare extension for store submission
  - _Requirements: All requirements completion_