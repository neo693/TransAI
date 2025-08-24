import React, { useState, useEffect } from 'react';
import { storageManager } from '../services/storage.js';
import type { 
  UserConfig, 
  APIProvider, 
  LanguageCode, 
  Theme, 
  OverlayPosition,
  VocabularyItem,
  ExportFormat 
} from '../types/index.js';

// Language options for the UI
const LANGUAGE_OPTIONS: { code: LanguageCode; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' }
];

const API_PROVIDERS: { value: APIProvider; name: string; description: string }[] = [
  { 
    value: 'openai', 
    name: 'OpenAI', 
    description: 'GPT-3.5/GPT-4 models for high-quality translations' 
  },
  { 
    value: 'anthropic', 
    name: 'Anthropic', 
    description: 'Claude models for accurate and contextual translations' 
  },
  { 
    value: 'custom', 
    name: 'Custom API', 
    description: 'Use your own API endpoint' 
  }
];

const THEME_OPTIONS: { value: Theme; name: string }[] = [
  { value: 'light', name: 'Light' },
  { value: 'dark', name: 'Dark' },
  { value: 'auto', name: 'Auto (System)' }
];

const OVERLAY_POSITIONS: { value: OverlayPosition; name: string }[] = [
  { value: 'auto', name: 'Auto' },
  { value: 'top', name: 'Top' },
  { value: 'bottom', name: 'Bottom' }
];

function App() {
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'api' | 'language' | 'ui' | 'prompts' | 'export'>('api');

  // Load configuration on component mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const userConfig = await storageManager.getConfig();
      setConfig(userConfig);
    } catch (error) {
      setErrors({ general: 'Failed to load configuration' });
    } finally {
      setLoading(false);
    }
  };

  const validateApiKey = (apiKey: string, provider: APIProvider): string | null => {
    if (!apiKey.trim()) {
      return 'API key is required';
    }
    
    switch (provider) {
      case 'openai':
        if (!apiKey.startsWith('sk-')) {
          return 'OpenAI API key should start with "sk-"';
        }
        break;
      case 'anthropic':
        if (!apiKey.startsWith('sk-ant-')) {
          return 'Anthropic API key should start with "sk-ant-"';
        }
        break;
      case 'custom':
        // Custom API keys can have any format
        break;
    }
    
    return null;
  };

  const validatePrompt = (prompt: string, type: string): string | null => {
    if (!prompt.trim()) {
      return `${type} prompt cannot be empty`;
    }
    if (prompt.length > 1000) {
      return `${type} prompt is too long (max 1000 characters)`;
    }
    return null;
  };

  const handleConfigChange = (updates: Partial<UserConfig>) => {
    if (!config) return;
    
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    
    // Clear related errors
    const newErrors = { ...errors };
    Object.keys(updates).forEach(key => {
      delete newErrors[key];
    });
    setErrors(newErrors);
  };

  const handleSave = async () => {
    if (!config) return;
    
    setSaving(true);
    setErrors({});
    setSuccessMessage('');
    
    try {
      // Validate configuration
      const validationErrors: Record<string, string> = {};
      
      const apiKeyError = validateApiKey(config.apiKey, config.apiProvider);
      if (apiKeyError) {
        validationErrors.apiKey = apiKeyError;
      }
      
      const translationPromptError = validatePrompt(config.customPrompts.translation, 'Translation');
      if (translationPromptError) {
        validationErrors.translationPrompt = translationPromptError;
      }
      
      const sentencePromptError = validatePrompt(config.customPrompts.sentenceGeneration, 'Sentence generation');
      if (sentencePromptError) {
        validationErrors.sentencePrompt = sentencePromptError;
      }
      
      const articlePromptError = validatePrompt(config.customPrompts.articleGeneration, 'Article generation');
      if (articlePromptError) {
        validationErrors.articlePrompt = articlePromptError;
      }
      
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
      
      // Save configuration
      await storageManager.setConfig(config);
      setSuccessMessage('Settings saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
      setErrors({ general: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: ExportFormat) => {
    try {
      const vocabulary = await storageManager.getVocabulary();
      
      if (vocabulary.length === 0) {
        setErrors({ export: 'No vocabulary items to export' });
        return;
      }
      
      let content: string;
      let filename: string;
      let mimeType: string;
      
      switch (format) {
        case 'json':
          content = JSON.stringify(vocabulary, null, 2);
          filename = `transai-vocabulary-${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
          break;
          
        case 'csv':
          const headers = ['Word', 'Translation', 'Context', 'Source URL', 'Date Added', 'Review Count'];
          const rows = vocabulary.map(item => [
            item.word,
            item.translation,
            item.context,
            item.sourceUrl,
            item.dateAdded.toISOString().split('T')[0],
            item.reviewCount.toString()
          ]);
          content = [headers, ...rows].map(row => 
            row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
          ).join('\n');
          filename = `transai-vocabulary-${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
          break;
          
        case 'txt':
          content = vocabulary.map(item => 
            `${item.word} - ${item.translation}\nContext: ${item.context}\nSource: ${item.sourceUrl}\nAdded: ${item.dateAdded.toISOString().split('T')[0]}\n---`
          ).join('\n\n');
          filename = `transai-vocabulary-${new Date().toISOString().split('T')[0]}.txt`;
          mimeType = 'text/plain';
          break;
      }
      
      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccessMessage(`Vocabulary exported as ${format.toUpperCase()}`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
      setErrors({ export: 'Failed to export vocabulary' });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      let importedData: VocabularyItem[];
      
      if (file.name.endsWith('.json')) {
        importedData = JSON.parse(text);
      } else {
        setErrors({ import: 'Only JSON files are supported for import' });
        return;
      }
      
      // Validate imported data
      if (!Array.isArray(importedData)) {
        setErrors({ import: 'Invalid file format' });
        return;
      }
      
      const validItems = importedData.filter(item => 
        item && 
        typeof item.word === 'string' && 
        typeof item.translation === 'string' &&
        typeof item.context === 'string'
      );
      
      if (validItems.length === 0) {
        setErrors({ import: 'No valid vocabulary items found' });
        return;
      }
      
      // Import vocabulary
      const currentVocabulary = await storageManager.getVocabulary();
      const mergedVocabulary = [...currentVocabulary];
      
      let addedCount = 0;
      validItems.forEach(item => {
        const exists = mergedVocabulary.find(v => 
          v.word.toLowerCase() === item.word.toLowerCase()
        );
        
        if (!exists) {
          mergedVocabulary.push({
            ...item,
            id: item.id || crypto.randomUUID(),
            dateAdded: item.dateAdded ? new Date(item.dateAdded) : new Date(),
            reviewCount: item.reviewCount || 0
          });
          addedCount++;
        }
      });
      
      await storageManager.setVocabulary(mergedVocabulary);
      setSuccessMessage(`Imported ${addedCount} new vocabulary items`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
      setErrors({ import: 'Failed to import vocabulary file' });
    }
    
    // Reset file input
    event.target.value = '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load configuration</p>
          <button 
            onClick={loadConfig}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">TransAI Settings</h1>
            <p className="text-gray-600 mt-1">Configure your translation extension preferences</p>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">{successMessage}</p>
            </div>
          )}
          
          {errors.general && (
            <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{errors.general}</p>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'api', label: 'API Configuration' },
                { id: 'language', label: 'Language Settings' },
                { id: 'ui', label: 'UI Preferences' },
                { id: 'prompts', label: 'Custom Prompts' },
                { id: 'export', label: 'Export & Import' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'api' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">API Configuration</h3>
                  
                  {/* API Provider Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Provider
                    </label>
                    <div className="space-y-3">
                      {API_PROVIDERS.map(provider => (
                        <label key={provider.value} className="flex items-start">
                          <input
                            type="radio"
                            name="apiProvider"
                            value={provider.value}
                            checked={config.apiProvider === provider.value}
                            onChange={(e) => handleConfigChange({ 
                              apiProvider: e.target.value as APIProvider 
                            })}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {provider.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {provider.description}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* API Key Input */}
                  <div>
                    <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                      API Key
                    </label>
                    <input
                      type="password"
                      id="apiKey"
                      value={config.apiKey}
                      onChange={(e) => handleConfigChange({ apiKey: e.target.value })}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                        errors.apiKey ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your API key"
                    />
                    {errors.apiKey && (
                      <p className="mt-1 text-sm text-red-600">{errors.apiKey}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Your API key is stored securely and only used for translation requests.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'language' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Language Settings</h3>
                  
                  <div>
                    <label htmlFor="defaultLanguage" className="block text-sm font-medium text-gray-700 mb-2">
                      Default Target Language
                    </label>
                    <select
                      id="defaultLanguage"
                      value={config.defaultTargetLanguage}
                      onChange={(e) => handleConfigChange({ 
                        defaultTargetLanguage: e.target.value as LanguageCode 
                      })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {LANGUAGE_OPTIONS.map(lang => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      The default language for translations when not specified.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ui' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">UI Preferences</h3>
                  
                  {/* Theme Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Theme
                    </label>
                    <select
                      value={config.uiPreferences.theme}
                      onChange={(e) => handleConfigChange({
                        uiPreferences: {
                          ...config.uiPreferences,
                          theme: e.target.value as Theme
                        }
                      })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {THEME_OPTIONS.map(theme => (
                        <option key={theme.value} value={theme.value}>
                          {theme.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Overlay Position */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Translation Overlay Position
                    </label>
                    <select
                      value={config.uiPreferences.overlayPosition}
                      onChange={(e) => handleConfigChange({
                        uiPreferences: {
                          ...config.uiPreferences,
                          overlayPosition: e.target.value as OverlayPosition
                        }
                      })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {OVERLAY_POSITIONS.map(position => (
                        <option key={position.value} value={position.value}>
                          {position.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Auto-play Pronunciation */}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.uiPreferences.autoPlayPronunciation}
                        onChange={(e) => handleConfigChange({
                          uiPreferences: {
                            ...config.uiPreferences,
                            autoPlayPronunciation: e.target.checked
                          }
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Auto-play pronunciation when available
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'prompts' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Prompts</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Customize the prompts used for different operations. Use placeholders like {'{targetLanguage}'} and {'{words}'}.
                  </p>
                  
                  {/* Translation Prompt */}
                  <div className="mb-6">
                    <label htmlFor="translationPrompt" className="block text-sm font-medium text-gray-700 mb-2">
                      Translation Prompt
                    </label>
                    <textarea
                      id="translationPrompt"
                      rows={3}
                      value={config.customPrompts.translation}
                      onChange={(e) => handleConfigChange({
                        customPrompts: {
                          ...config.customPrompts,
                          translation: e.target.value
                        }
                      })}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                        errors.translationPrompt ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter translation prompt..."
                    />
                    {errors.translationPrompt && (
                      <p className="mt-1 text-sm text-red-600">{errors.translationPrompt}</p>
                    )}
                  </div>

                  {/* Sentence Generation Prompt */}
                  <div className="mb-6">
                    <label htmlFor="sentencePrompt" className="block text-sm font-medium text-gray-700 mb-2">
                      Sentence Generation Prompt
                    </label>
                    <textarea
                      id="sentencePrompt"
                      rows={3}
                      value={config.customPrompts.sentenceGeneration}
                      onChange={(e) => handleConfigChange({
                        customPrompts: {
                          ...config.customPrompts,
                          sentenceGeneration: e.target.value
                        }
                      })}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                        errors.sentencePrompt ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter sentence generation prompt..."
                    />
                    {errors.sentencePrompt && (
                      <p className="mt-1 text-sm text-red-600">{errors.sentencePrompt}</p>
                    )}
                  </div>

                  {/* Article Generation Prompt */}
                  <div>
                    <label htmlFor="articlePrompt" className="block text-sm font-medium text-gray-700 mb-2">
                      Article Generation Prompt
                    </label>
                    <textarea
                      id="articlePrompt"
                      rows={3}
                      value={config.customPrompts.articleGeneration}
                      onChange={(e) => handleConfigChange({
                        customPrompts: {
                          ...config.customPrompts,
                          articleGeneration: e.target.value
                        }
                      })}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                        errors.articlePrompt ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter article generation prompt..."
                    />
                    {errors.articlePrompt && (
                      <p className="mt-1 text-sm text-red-600">{errors.articlePrompt}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Export & Import</h3>
                  
                  {/* Export Section */}
                  <div className="mb-8">
                    <h4 className="text-md font-medium text-gray-800 mb-3">Export Vocabulary</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Download your vocabulary in different formats for backup or use in other applications.
                    </p>
                    
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handleExport('json')}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Export as JSON
                      </button>
                      <button
                        onClick={() => handleExport('csv')}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        Export as CSV
                      </button>
                      <button
                        onClick={() => handleExport('txt')}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Export as Text
                      </button>
                    </div>
                    
                    {errors.export && (
                      <p className="mt-2 text-sm text-red-600">{errors.export}</p>
                    )}
                  </div>

                  {/* Import Section */}
                  <div>
                    <h4 className="text-md font-medium text-gray-800 mb-3">Import Vocabulary</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Import vocabulary from a JSON backup file. Existing words will not be duplicated.
                    </p>
                    
                    <div>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImport}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      
                      {errors.import && (
                        <p className="mt-2 text-sm text-red-600">{errors.import}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer with Save Button */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;