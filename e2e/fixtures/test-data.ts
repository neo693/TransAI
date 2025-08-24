export const mockTranslationResponse = {
  originalText: 'Hello world',
  translatedText: 'Hola mundo',
  sourceLanguage: 'en',
  targetLanguage: 'es',
  examples: [
    {
      original: 'Hello everyone',
      translated: 'Hola a todos',
      context: 'greeting'
    },
    {
      original: 'Hello there',
      translated: 'Hola ahí',
      context: 'casual greeting'
    }
  ],
  confidence: 0.95,
  timestamp: new Date().toISOString()
};

export const mockVocabularyItem = {
  id: 'test-vocab-1',
  word: 'Hello',
  translation: 'Hola',
  context: 'greeting on a webpage',
  sourceUrl: 'https://example.com',
  dateAdded: new Date().toISOString(),
  reviewCount: 0,
  pronunciation: 'həˈloʊ'
};

export const mockUserConfig = {
  apiKey: 'sk-test-key-123456789',
  apiProvider: 'openai' as const,
  defaultTargetLanguage: 'es',
  customPrompts: {
    translation: 'Translate "{text}" to {targetLanguage} and provide examples',
    sentenceGeneration: 'Create {count} sentences using these words: {words}',
    articleGeneration: 'Write an article about {topic} using vocabulary: {words}'
  },
  uiPreferences: {
    theme: 'light' as const,
    overlayPosition: 'auto' as const,
    autoPlayPronunciation: false
  }
};

export const mockGeneratedContent = {
  type: 'sentence' as const,
  content: 'Hello world, this is a test sentence using vocabulary words.',
  usedWords: ['Hello', 'world', 'test'],
  generatedAt: new Date().toISOString()
};

export const testWebsites = [
  {
    name: 'Simple HTML Page',
    url: 'data:text/html,<html><body><h1>Test Page</h1><p>Hello world, this is a test paragraph with some text to translate.</p></body></html>',
    textSelector: 'p',
    expectedText: 'Hello world'
  },
  {
    name: 'Complex Layout',
    url: 'data:text/html,<html><body><div class="container"><article><h2>Article Title</h2><p class="content">Bonjour le monde, ceci est un texte en français.</p></article></div></body></html>',
    textSelector: '.content',
    expectedText: 'Bonjour le monde'
  }
];

export const accessibilityTestData = {
  keyboardNavigation: [
    { key: 'Tab', expectedFocus: 'translate-button' },
    { key: 'Enter', expectedAction: 'translate' },
    { key: 'Escape', expectedAction: 'close-overlay' }
  ],
  ariaLabels: [
    { selector: '[data-testid="translation-overlay"]', expectedLabel: 'Translation popup' },
    { selector: '[data-testid="add-to-vocabulary"]', expectedLabel: 'Add to vocabulary' },
    { selector: '[data-testid="play-pronunciation"]', expectedLabel: 'Play pronunciation' }
  ]
};