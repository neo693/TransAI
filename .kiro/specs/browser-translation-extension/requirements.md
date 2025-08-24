# Requirements Document

## Introduction

TransAI is a browser translation extension that supports Chrome and Edge browsers. The extension leverages LLM (Large Language Model) technology to provide intelligent translation services with vocabulary management and learning features. Users can translate selected text, manage vocabulary, and enhance their language learning through AI-generated content.

## Requirements

### Requirement 1

**User Story:** As a browser user, I want to translate selected words or sentences using LLM technology, so that I can understand foreign language content while browsing.

#### Acceptance Criteria

1. WHEN the user selects a word or sentence on a webpage THEN the system SHALL display a translation popup using LLM
2. WHEN the user hovers over selected text THEN the system SHALL show translation options
3. WHEN translation is requested THEN the system SHALL use the configured LLM API to provide accurate translation
4. WHEN translation is complete THEN the system SHALL display the result with example sentences

### Requirement 2

**User Story:** As a language learner, I want to save new words to a vocabulary book, so that I can review and study them later.

#### Acceptance Criteria

1. WHEN the user translates a word THEN the system SHALL provide an option to add it to the vocabulary book
2. WHEN a word is added to vocabulary THEN the system SHALL store the word, translation, and context
3. WHEN the user accesses vocabulary book THEN the system SHALL display all saved words with their translations
4. WHEN duplicate words are added THEN the system SHALL prevent duplicates or update existing entries

### Requirement 3

**User Story:** As a language learner, I want to export my vocabulary book, so that I can use it in other learning tools or backup my progress.

#### Acceptance Criteria

1. WHEN the user requests vocabulary export THEN the system SHALL provide export functionality
2. WHEN exporting THEN the system SHALL support common formats (CSV, JSON, or text)
3. WHEN export is complete THEN the system SHALL download the file to the user's device
4. WHEN exporting THEN the system SHALL include word, translation, context, and date added

### Requirement 4

**User Story:** As a language learner, I want to generate sentences or articles using my vocabulary words, so that I can practice and reinforce my learning.

#### Acceptance Criteria

1. WHEN the user requests content generation THEN the system SHALL use saved vocabulary to create sentences or articles
2. WHEN generating content THEN the system SHALL use LLM to create contextually appropriate examples
3. WHEN content is generated THEN the system SHALL highlight the vocabulary words being practiced
4. WHEN generation is complete THEN the system SHALL allow users to save or export the generated content

### Requirement 5

**User Story:** As a language learner, I want to hear pronunciation of words, so that I can learn correct pronunciation.

#### Acceptance Criteria

1. WHEN a word is translated THEN the system SHALL provide a pronunciation option
2. WHEN pronunciation is requested THEN the system SHALL play audio of the word
3. WHEN audio is unavailable THEN the system SHALL provide phonetic transcription
4. WHEN playing audio THEN the system SHALL support multiple language pronunciations

### Requirement 6

**User Story:** As a user, I want to configure my own LLM API key, so that I can use my preferred translation service.

#### Acceptance Criteria

1. WHEN the user accesses settings THEN the system SHALL provide API key configuration options
2. WHEN API key is entered THEN the system SHALL validate the key before saving
3. WHEN API key is invalid THEN the system SHALL display appropriate error messages
4. WHEN API key is saved THEN the system SHALL use it for all translation requests

### Requirement 7

**User Story:** As a user, I want to customize translation prompts, so that I can get translations that match my specific needs.

#### Acceptance Criteria

1. WHEN the user accesses settings THEN the system SHALL provide prompt customization options
2. WHEN custom prompts are entered THEN the system SHALL validate prompt format
3. WHEN prompts are saved THEN the system SHALL use them for translation requests
4. WHEN prompts are reset THEN the system SHALL restore default system prompts

### Requirement 8

**User Story:** As a user, I want the system to provide built-in translation prompts with examples, so that I can get comprehensive translation results without configuration.

#### Acceptance Criteria

1. WHEN no custom prompts are configured THEN the system SHALL use built-in prompts
2. WHEN using built-in prompts THEN the system SHALL request translations with example sentences
3. WHEN translation is provided THEN the system SHALL format results consistently
4. WHEN built-in prompts are used THEN the system SHALL optimize for accuracy and context

### Requirement 9

**User Story:** As a developer, I want the extension built with modern web technologies, so that it is maintainable and performant.

#### Acceptance Criteria

1. WHEN building the extension THEN the system SHALL use TypeScript for type safety
2. WHEN creating UI components THEN the system SHALL use React framework
3. WHEN styling components THEN the system SHALL use Tailwind CSS 3.x
4. WHEN managing dependencies THEN the system SHALL use pnpm package manager
5. WHEN deploying THEN the system SHALL support both Chrome and Edge browsers