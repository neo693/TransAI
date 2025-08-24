/**
 * Options App Component Tests
 * Tests for the main options page UI with form validation and configuration management
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import App from '../options/App.js';
import { storageManager } from '../services/storage.js';
import type { UserConfig, VocabularyItem } from '../types/index.js';

// Mock the storage manager
vi.mock('../services/storage.js', () => ({
  storageManager: {
    getConfig: vi.fn(),
    setConfig: vi.fn(),
    getVocabulary: vi.fn(),
    setVocabulary: vi.fn()
  }
}));

// Mock URL.createObjectURL and related APIs
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

// Setup global mocks
beforeEach(() => {
  // Mock URL methods
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;
  
  // Mock crypto.randomUUID
  global.crypto.randomUUID = vi.fn(() => 'test-uuid-123' as `${string}-${string}-${string}-${string}-${string}`);
  
  // Mock document methods
  const mockElement = {
    click: vi.fn(),
    href: '',
    download: ''
  } as unknown as HTMLElement;
  
  global.document.createElement = vi.fn(() => mockElement);
  global.document.body.appendChild = vi.fn();
  global.document.body.removeChild = vi.fn();
});

const mockConfig: UserConfig = {
  apiKey: 'sk-test123',
  apiProvider: 'openai',
  defaultTargetLanguage: 'en',
  customPrompts: {
    translation: 'Translate to {targetLanguage}: {text}',
    sentenceGeneration: 'Generate sentences with: {words}',
    articleGeneration: 'Write article with: {words}'
  },
  uiPreferences: {
    theme: 'light',
    overlayPosition: 'auto',
    autoPlayPronunciation: false
  }
};

const mockVocabulary: VocabularyItem[] = [
  {
    id: '1',
    word: 'hello',
    translation: 'hola',
    context: 'greeting',
    sourceUrl: 'https://example.com',
    dateAdded: new Date('2024-01-01'),
    reviewCount: 5
  },
  {
    id: '2',
    word: 'world',
    translation: 'mundo',
    context: 'noun',
    sourceUrl: 'https://example.com',
    dateAdded: new Date('2024-01-02'),
    reviewCount: 3
  }
];

describe('Options App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateObjectURL.mockReturnValue('blob:test-url');
    
    // Mock successful storage operations by default
    vi.mocked(storageManager.getConfig).mockResolvedValue(mockConfig);
    vi.mocked(storageManager.setConfig).mockResolvedValue();
    vi.mocked(storageManager.getVocabulary).mockResolvedValue(mockVocabulary);
    vi.mocked(storageManager.setVocabulary).mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Loading', () => {
    it('should show loading state initially', () => {
      render(<App />);
      expect(screen.getByText('Loading settings...')).toBeInTheDocument();
    });

    it('should load and display configuration', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('TransAI Settings')).toBeInTheDocument();
      });
      
      expect(storageManager.getConfig).toHaveBeenCalled();
    });

    it('should handle loading errors gracefully', async () => {
      vi.mocked(storageManager.getConfig).mockRejectedValue(new Error('Storage error'));
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load configuration')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should render all tab options', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'API Configuration' })).toBeInTheDocument();
      });
      
      expect(screen.getByRole('button', { name: 'Language Settings' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'UI Preferences' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Custom Prompts' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Export & Import' })).toBeInTheDocument();
    });

    it('should switch between tabs', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'API Configuration' })).toBeInTheDocument();
      });
      
      // Click on Language Settings tab
      fireEvent.click(screen.getByRole('button', { name: 'Language Settings' }));
      expect(screen.getByText('Default Target Language')).toBeInTheDocument();
      
      // Click on UI Preferences tab
      fireEvent.click(screen.getByRole('button', { name: 'UI Preferences' }));
      expect(screen.getByText('Theme')).toBeInTheDocument();
    });
  });

  describe('API Configuration Tab', () => {
    it('should display API provider options', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('OpenAI')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Anthropic')).toBeInTheDocument();
      expect(screen.getByText('Custom API')).toBeInTheDocument();
    });

    it('should display current API key (masked)', async () => {
      render(<App />);
      
      await waitFor(() => {
        const apiKeyInput = screen.getByLabelText('API Key') as HTMLInputElement;
        expect(apiKeyInput.value).toBe('sk-test123');
        expect(apiKeyInput.type).toBe('password');
      });
    });

    it('should validate OpenAI API key format', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('API Key')).toBeInTheDocument();
      });
      
      const apiKeyInput = screen.getByLabelText('API Key');
      fireEvent.change(apiKeyInput, { target: { value: 'invalid-key' } });
      
      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('OpenAI API key should start with "sk-"')).toBeInTheDocument();
      });
    });

    it('should validate Anthropic API key format', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Anthropic')).toBeInTheDocument();
      });
      
      // Select Anthropic provider
      const anthropicRadio = screen.getByDisplayValue('anthropic');
      fireEvent.click(anthropicRadio);
      
      const apiKeyInput = screen.getByLabelText('API Key');
      fireEvent.change(apiKeyInput, { target: { value: 'invalid-key' } });
      
      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Anthropic API key should start with "sk-ant-"')).toBeInTheDocument();
      });
    });
  });

  describe('Language Settings Tab', () => {
    it('should display language selection', async () => {
      render(<App />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Language Settings'));
      });
      
      expect(screen.getByLabelText('Default Target Language')).toBeInTheDocument();
      
      const languageSelect = screen.getByLabelText('Default Target Language') as HTMLSelectElement;
      expect(languageSelect.value).toBe('en');
    });

    it('should update default target language', async () => {
      render(<App />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Language Settings'));
      });
      
      const languageSelect = screen.getByLabelText('Default Target Language');
      fireEvent.change(languageSelect, { target: { value: 'es' } });
      
      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(storageManager.setConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            defaultTargetLanguage: 'es'
          })
        );
      });
    });
  });

  describe('UI Preferences Tab', () => {
    it('should display UI preference options', async () => {
      render(<App />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('UI Preferences'));
      });
      
      expect(screen.getByText('Theme')).toBeInTheDocument();
      expect(screen.getByText('Translation Overlay Position')).toBeInTheDocument();
      expect(screen.getByText('Auto-play pronunciation when available')).toBeInTheDocument();
    });

    it('should update theme preference', async () => {
      render(<App />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('UI Preferences'));
      });
      
      const themeSelect = screen.getByDisplayValue('Light');
      fireEvent.change(themeSelect, { target: { value: 'dark' } });
      
      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(storageManager.setConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            uiPreferences: expect.objectContaining({
              theme: 'dark'
            })
          })
        );
      });
    });

    it('should toggle auto-play pronunciation', async () => {
      render(<App />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('UI Preferences'));
      });
      
      const checkbox = screen.getByLabelText('Auto-play pronunciation when available');
      fireEvent.click(checkbox);
      
      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(storageManager.setConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            uiPreferences: expect.objectContaining({
              autoPlayPronunciation: true
            })
          })
        );
      });
    });
  });

  describe('Custom Prompts Tab', () => {
    it('should display custom prompt editors', async () => {
      render(<App />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Custom Prompts'));
      });
      
      expect(screen.getByLabelText('Translation Prompt')).toBeInTheDocument();
      expect(screen.getByLabelText('Sentence Generation Prompt')).toBeInTheDocument();
      expect(screen.getByLabelText('Article Generation Prompt')).toBeInTheDocument();
    });

    it('should validate prompt length', async () => {
      render(<App />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Custom Prompts'));
      });
      
      const translationPrompt = screen.getByLabelText('Translation Prompt');
      fireEvent.change(translationPrompt, { 
        target: { value: 'a'.repeat(1001) } // Exceed 1000 character limit
      });
      
      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Translation prompt is too long (max 1000 characters)')).toBeInTheDocument();
      });
    });

    it('should validate empty prompts', async () => {
      render(<App />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Custom Prompts'));
      });
      
      const translationPrompt = screen.getByLabelText('Translation Prompt');
      fireEvent.change(translationPrompt, { target: { value: '' } });
      
      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Translation prompt cannot be empty')).toBeInTheDocument();
      });
    });
  });

  describe('Export & Import Tab', () => {
    it('should display export and import options', async () => {
      render(<App />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Export & Import'));
      });
      
      expect(screen.getByText('Export as JSON')).toBeInTheDocument();
      expect(screen.getByText('Export as CSV')).toBeInTheDocument();
      expect(screen.getByText('Export as Text')).toBeInTheDocument();
      expect(screen.getByText('Import Vocabulary')).toBeInTheDocument();
    });

    it('should export vocabulary as JSON', async () => {
      // Mock document methods
      const mockClick = vi.fn();
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      const mockElement = {
        click: mockClick,
        href: '',
        download: ''
      };
      const mockCreateElement = vi.fn(() => mockElement) as unknown as typeof document.createElement;
      
      const originalCreateElement = document.createElement;
      const originalAppendChild = document.body.appendChild;
      const originalRemoveChild = document.body.removeChild;
      
      document.createElement = mockCreateElement;
      document.body.appendChild = mockAppendChild;
      document.body.removeChild = mockRemoveChild;
      
      render(<App />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Export & Import' }));
      });
      
      const exportButton = screen.getByText('Export as JSON');
      fireEvent.click(exportButton);
      
      await waitFor(() => {
        expect(storageManager.getVocabulary).toHaveBeenCalled();
        expect(mockCreateObjectURL).toHaveBeenCalled();
        expect(mockClick).toHaveBeenCalled();
      });
      
      // Restore original methods
      document.createElement = originalCreateElement;
      document.body.appendChild = originalAppendChild;
      document.body.removeChild = originalRemoveChild;
    });

    it('should handle empty vocabulary export', async () => {
      vi.mocked(storageManager.getVocabulary).mockResolvedValue([]);
      
      render(<App />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Export & Import' }));
      });
      
      const exportButton = screen.getByText('Export as JSON');
      fireEvent.click(exportButton);
      
      await waitFor(() => {
        expect(screen.getByText('No vocabulary items to export')).toBeInTheDocument();
      });
    });

    it('should import vocabulary from JSON file', async () => {
      const mockFile = new File(
        [JSON.stringify(mockVocabulary)],
        'vocabulary.json',
        { type: 'application/json' }
      );
      
      Object.defineProperty(mockFile, 'text', {
        value: vi.fn().mockResolvedValue(JSON.stringify(mockVocabulary))
      });
      
      render(<App />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Export & Import' }));
      });
      
      const fileInput = screen.getByDisplayValue('');
      
      fireEvent.change(fileInput, { target: { files: [mockFile] } });
      
      await waitFor(() => {
        expect(storageManager.setVocabulary).toHaveBeenCalled();
      });
    });

    it('should handle invalid import file format', async () => {
      const mockFile = new File(
        ['invalid json content'],
        'vocabulary.json',
        { type: 'application/json' }
      );
      
      Object.defineProperty(mockFile, 'text', {
        value: vi.fn().mockResolvedValue('invalid json content')
      });
      
      render(<App />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Export & Import' }));
      });
      
      const fileInput = screen.getByDisplayValue('');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid file format|Failed to import/)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation and Saving', () => {
    it('should save valid configuration', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Save Settings')).toBeInTheDocument();
      });
      
      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(storageManager.setConfig).toHaveBeenCalledWith(mockConfig);
        expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument();
      });
    });

    it('should handle save errors', async () => {
      vi.mocked(storageManager.setConfig).mockRejectedValue(new Error('Save failed'));
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Save Settings')).toBeInTheDocument();
      });
      
      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to save configuration')).toBeInTheDocument();
      });
    });

    it('should show loading state while saving', async () => {
      let resolvePromise: () => void;
      const savePromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      
      vi.mocked(storageManager.setConfig).mockReturnValue(savePromise);
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Save Settings')).toBeInTheDocument();
      });
      
      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);
      
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
      
      resolvePromise!();
      
      await waitFor(() => {
        expect(screen.getByText('Save Settings')).toBeInTheDocument();
        expect(saveButton).not.toBeDisabled();
      });
    });

    it('should clear success message after timeout', async () => {
      vi.useFakeTimers();
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Save Settings')).toBeInTheDocument();
      });
      
      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument();
      });
      
      // Fast-forward time
      vi.advanceTimersByTime(3000);
      
      await waitFor(() => {
        expect(screen.queryByText('Settings saved successfully!')).not.toBeInTheDocument();
      });
      
      vi.useRealTimers();
    });
  });
});