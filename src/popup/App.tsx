import React, { useState, useEffect, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { Globe, BookOpen, Sparkles, Settings, Edit2, Trash2, Calendar, RotateCcw } from 'lucide-react';
import { audioService } from '../services/audio.js';
import type {
  VocabularyItem,
  TranslationResult,
  LanguageCode,
  VocabularyFilter,
  GeneratedContent
} from '../types/index.js';
import { MessageType } from '../types/index.js';
import { PronunciationButton, InlinePronunciation } from '../components/pronunciation-button.js';
import { storageManager } from '../services/storage.js';
import { useTranslation } from '../hooks/useTranslation.js';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
          <p className="text-sm text-red-600 mb-2">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Navigation tabs
type TabType = 'translate' | 'vocabulary' | 'generate' | 'settings';

// Component interfaces
interface VocabularyListProps {
  items: VocabularyItem[];
  onItemClick: (item: VocabularyItem) => void;
  onDeleteItem: (id: string) => void;
  onEditItem: (item: VocabularyItem) => void;
  loading: boolean;
}

interface VocabularyStatsProps {
  totalWords: number;
  averageReviewCount: number;
  mostRecentWord?: VocabularyItem;
  mostReviewedWord?: VocabularyItem;
}

interface VocabularyEditModalProps {
  item: VocabularyItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: VocabularyItem) => void;
}

interface VocabularyFilterProps {
  onFilterChange: (filter: VocabularyFilter) => void;
  currentFilter: VocabularyFilter;
}

interface QuickTranslateProps {
  onTranslate: (text: string, targetLang: LanguageCode) => void;
  loading: boolean;
  result?: TranslationResult;
  defaultTargetLang?: LanguageCode;
  onAddToVocabulary?: (word: string, translation: string, context: string, sourceLanguage: string, targetLanguage: string) => void;
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface SentenceGenerationProps {
  vocabularyItems: VocabularyItem[];
  onGenerate: (words: string[], count: number, sourceLanguage?: LanguageCode) => void;
  loading: boolean;
  generatedContent?: GeneratedContent;
  onSaveContent?: (content: GeneratedContent) => void;
}

interface WordSelectionProps {
  vocabularyItems: VocabularyItem[];
  selectedWords: string[];
  onSelectionChange: (words: string[]) => void;
  maxSelection?: number;
}

interface GeneratedContentDisplayProps {
  content: GeneratedContent;
  onSave?: (content: GeneratedContent) => void;
  onPractice?: (content: GeneratedContent) => void;
}

interface ArticleGenerationProps {
  vocabularyItems: VocabularyItem[];
  onGenerate: (words: string[], topic?: string, sourceLanguage?: LanguageCode) => void;
  loading: boolean;
  generatedContent?: GeneratedContent;
  onSaveContent?: (content: GeneratedContent) => void;
}

// Vocabulary Statistics Component
const VocabularyStats: React.FC<VocabularyStatsProps> = ({
  totalWords,
  averageReviewCount,
  mostRecentWord
}) => {
  return (
    <div className="p-3 bg-gray-50 rounded-lg mb-4">
      <div className="text-xs font-medium text-gray-700 mb-2">Statistics</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Total:</span>
          <span className="ml-1 font-medium">{totalWords}</span>
        </div>
        <div>
          <span className="text-gray-500">Avg Reviews:</span>
          <span className="ml-1 font-medium">{averageReviewCount.toFixed(1)}</span>
        </div>
        {mostRecentWord && (
          <div className="col-span-2">
            <span className="text-gray-500">Recent:</span>
            <span className="ml-1 font-medium">{mostRecentWord.word}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Vocabulary Filter Component
const VocabularyFilter: React.FC<VocabularyFilterProps> = ({ onFilterChange, currentFilter }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleReviewCountChange = (value: string) => {
    const reviewCountMin = value ? parseInt(value) : undefined;
    onFilterChange({ ...currentFilter, reviewCountMin });
  };

  const handleDateRangeChange = (days: number | null) => {
    if (days === null) {
      onFilterChange({ ...currentFilter, dateRange: undefined });
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      onFilterChange({ ...currentFilter, dateRange: { start, end } });
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-700">Filters</span>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          {showAdvanced ? 'Simple' : 'Advanced'}
        </button>
      </div>

      {showAdvanced && (
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Min Reviews:</label>
            <input
              type="number"
              min="0"
              value={currentFilter.reviewCountMin || ''}
              onChange={(e) => handleReviewCountChange(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Any"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Added:</label>
            <select
              onChange={(e) => handleDateRangeChange(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Any time</option>
              <option value="1">Last day</option>
              <option value="7">Last week</option>
              <option value="30">Last month</option>
              <option value="90">Last 3 months</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// Vocabulary Edit Modal Component
const VocabularyEditModal: React.FC<VocabularyEditModalProps> = ({ item, isOpen, onClose, onSave }) => {
  const [editedItem, setEditedItem] = useState<VocabularyItem | null>(null);

  useEffect(() => {
    setEditedItem(item);
  }, [item]);

  if (!isOpen || !editedItem) return null;

  const handleSave = () => {
    if (editedItem) {
      onSave(editedItem);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 w-72 max-h-80 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">Edit Vocabulary</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Word</label>
            <input
              type="text"
              value={editedItem.word}
              onChange={(e) => setEditedItem({ ...editedItem, word: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Translation</label>
            <input
              type="text"
              value={editedItem.translation}
              onChange={(e) => setEditedItem({ ...editedItem, translation: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Context</label>
            <textarea
              value={editedItem.context}
              onChange={(e) => setEditedItem({ ...editedItem, context: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Pronunciation</label>
            <input
              type="text"
              value={editedItem.pronunciation || ''}
              onChange={(e) => setEditedItem({ ...editedItem, pronunciation: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            className="flex-1 px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Search Bar Component
const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder = "Search..." }) => {
  return (
    <div className="relative mb-4">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  );
};

// Word Selection Component
const WordSelection: React.FC<WordSelectionProps> = ({
  vocabularyItems,
  selectedWords,
  onSelectionChange,
  maxSelection = 10
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = vocabularyItems.filter(item =>
    item.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.translation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleWordToggle = (word: string) => {
    if (selectedWords.includes(word)) {
      onSelectionChange(selectedWords.filter(w => w !== word));
    } else if (selectedWords.length < maxSelection) {
      onSelectionChange([...selectedWords, word]);
    }
  };

  const handleSelectAll = () => {
    const availableWords = filteredItems.slice(0, maxSelection).map(item => item.word);
    onSelectionChange(availableWords);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Select Words ({selectedWords.length}/{maxSelection})
        </span>
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            disabled={filteredItems.length === 0}
            className="text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400"
          >
            Select All
          </button>
          <button
            onClick={handleClearAll}
            disabled={selectedWords.length === 0}
            className="text-xs text-red-600 hover:text-red-700 disabled:text-gray-400"
          >
            Clear
          </button>
        </div>
      </div>

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search vocabulary..."
      />

      <div className="max-h-32 overflow-y-auto space-y-1">
        {filteredItems.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-4">
            {vocabularyItems.length === 0 ? 'No vocabulary items available' : 'No matching words found'}
          </div>
        ) : (
          filteredItems.map((item) => {
            const isSelected = selectedWords.includes(item.word);
            const canSelect = isSelected || selectedWords.length < maxSelection;

            return (
              <div
                key={item.id}
                className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${isSelected
                  ? 'bg-blue-50 border-blue-200'
                  : canSelect
                    ? 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    : 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                  }`}
                onClick={() => canSelect && handleWordToggle(item.word)}
              >
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 truncate flex-shrink-0">
                      {item.word}
                    </span>
                    <span className="text-xs text-gray-500 flex-shrink-0">→</span>
                    <span className="text-sm text-gray-700 truncate">
                      {item.translation}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => canSelect && handleWordToggle(item.word)}
                    disabled={!canSelect}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// Generated Content Display Component
const GeneratedContentDisplay: React.FC<GeneratedContentDisplayProps> = ({
  content,
  // onSave,
  // onPractice
}) => {
  const [showFullContent, setShowFullContent] = useState(false);

  const displayContent = content.content.length > 200 && !showFullContent
    ? content.content.substring(0, 200) + '...'
    : content.content;

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content.content);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <div className="p-3 bg-gray-50 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Generated {content.type === 'sentence' ? 'Sentences' : 'Article'}
        </span>
        <span className="text-xs text-gray-500">
          {new Date(content.generatedAt).toLocaleTimeString()}
        </span>
      </div>

      <div className="text-sm text-gray-900 leading-relaxed">
        {displayContent}
        {content.content.length > 200 && (
          <button
            onClick={() => setShowFullContent(!showFullContent)}
            className="ml-2 text-blue-600 hover:text-blue-700 text-xs"
          >
            {showFullContent ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {content.usedWords.length > 0 && (
        <div>
          <span className="text-xs font-medium text-gray-600">Used words: </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {content.usedWords.map((word, index) => (
              <span
                key={index}
                className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-gray-200">
        <button
          onClick={handleCopyToClipboard}
          className="flex-1 px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Copy
        </button>
        {/* {onSave && (
          <button
            onClick={() => onSave(content)}
            className="flex-1 px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save
          </button>
        )}
        {onPractice && (
          <button
            onClick={() => onPractice(content)}
            className="flex-1 px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Practice
          </button>
        )} */}
      </div>
    </div>
  );
};

// Quick Translate Component
const QuickTranslate: React.FC<QuickTranslateProps> = ({ onTranslate, loading, result, defaultTargetLang = 'en', onAddToVocabulary }) => {
  const [text, setText] = useState('');
  const [targetLang, setTargetLang] = useState<LanguageCode>(defaultTargetLang);
  const [phonetic, setPhonetic] = useState<string>('');
  const [originalPhonetic, setOriginalPhonetic] = useState<string>('');
  const [addingToVocab, setAddingToVocab] = useState(false);
  const [vocabMessage, setVocabMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Update target language when default changes
  useEffect(() => {
    setTargetLang(defaultTargetLang);
  }, [defaultTargetLang]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onTranslate(text.trim(), targetLang);
    }
  };

  // Check if text is a single word (for phonetic display)
  const isSingleWord = (str: string): boolean => {
    return str.trim().split(/\s+/).length === 1;
  };

  // Get phonetic transcription when translation result changes
  useEffect(() => {
    if (result) {
      // Get phonetic for translated text
      audioService.getPhoneticTranscription(result.translatedText, result.targetLanguage as LanguageCode)
        .then(setPhonetic)
        .catch(() => setPhonetic(''));

      // Get phonetic for original text if it's a single word
      if (isSingleWord(text)) {
        audioService.getPhoneticTranscription(text, result.sourceLanguage as LanguageCode)
          .then(setOriginalPhonetic)
          .catch(() => setOriginalPhonetic(''));
      } else {
        setOriginalPhonetic('');
      }
    }
  }, [result, text]);

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to translate..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value as LanguageCode)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="ru">Russian</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="zh">Chinese</option>
            <option value="ar">Arabic</option>
          </select>

          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Translating...' : 'Translate'}
          </button>
        </div>
      </form>

      {result && (
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Header with language indicator */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white text-xs font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              <span>{result.sourceLanguage.toUpperCase()} → {result.targetLanguage.toUpperCase()}</span>
            </div>
            {result.confidence && (
              <div className="flex items-center gap-1 text-white text-xs">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{Math.round(result.confidence * 100)}%</span>
              </div>
            )}
          </div>

          <div className="p-4 space-y-4">
            {/* Original Text Section */}
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Original</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-base text-gray-800 leading-relaxed">{text}</p>
                    <PronunciationButton
                      word={text}
                      language={result.sourceLanguage}
                      size="sm"
                      onError={(error) => console.warn('Pronunciation error:', error)}
                    />
                  </div>
                  {originalPhonetic && (
                    <div className="inline-flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full border border-gray-200 mt-1">
                      <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      <span className="text-sm text-gray-600 font-mono">{originalPhonetic}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Translation Section */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Translation</span>
                <div className="flex-1 h-px bg-blue-200"></div>
              </div>

              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1">
                  <p className="text-lg font-medium text-gray-900 leading-relaxed mb-2">{result.translatedText}</p>
                  {phonetic && (
                    <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-blue-200">
                      <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-blue-700 font-mono">{phonetic}</span>
                    </div>
                  )}
                </div>
                <PronunciationButton
                  word={result.translatedText}
                  language={result.targetLanguage}
                  size="sm"
                  onError={(error) => console.warn('Pronunciation error:', error)}
                />
              </div>
            </div>

            {/* Examples Section */}
            {result.examples.length > 0 && (
              <div className="bg-white rounded-lg p-3 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Example Usage</span>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>
                <div className="space-y-2">
                  {result.examples.slice(0, 3).map((example, index) => (
                    <div key={index} className="group hover:bg-gray-50 rounded-lg p-2 transition-colors">
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-green-100 text-green-700 rounded-full text-xs font-medium mt-0.5">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 leading-relaxed mb-1">{example.original}</p>
                          {example.context && (
                            <p className="text-xs text-gray-500 italic">{example.context}</p>
                          )}
                        </div>
                        <InlinePronunciation
                          word={example.original}
                          language={result.sourceLanguage as LanguageCode}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vocabulary Status Message */}
            {vocabMessage && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${vocabMessage.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                {vocabMessage.type === 'success' ? (
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <span>{vocabMessage.text}</span>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-2">
              <button
                onClick={async () => {
                  if (!onAddToVocabulary || addingToVocab) return;

                  setAddingToVocab(true);
                  setVocabMessage(null);

                  try {
                    await onAddToVocabulary(
                      text,
                      result.translatedText,
                      '', // context
                      result.sourceLanguage,
                      result.targetLanguage
                    );
                    setVocabMessage({ type: 'success', text: '✓ Added to vocabulary!' });

                    // Clear message after 3 seconds
                    setTimeout(() => setVocabMessage(null), 3000);
                  } catch (error: any) {
                    const errorMsg = error?.message || 'Failed to add to vocabulary';
                    setVocabMessage({ type: 'error', text: errorMsg });

                    // Clear error message after 5 seconds
                    setTimeout(() => setVocabMessage(null), 5000);
                  } finally {
                    setAddingToVocab(false);
                  }
                }}
                disabled={addingToVocab}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 shadow-sm"
              >
                {addingToVocab ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add to Vocabulary</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sentence Generation Component
const SentenceGeneration: React.FC<SentenceGenerationProps> = ({
  vocabularyItems,
  onGenerate,
  loading,
  generatedContent,
  onSaveContent
}) => {
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [sentenceCount] = useState(1);
  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceIndex, setPracticeIndex] = useState(0);

  const handleGenerate = () => {
    if (selectedWords.length > 0) {
      // Get source language from the first selected word
      const firstWord = vocabularyItems.find(item => item.word === selectedWords[0]);
      const sourceLanguage = firstWord?.sourceLanguage || 'en';
      onGenerate(selectedWords, sentenceCount, sourceLanguage);
    }
  };

  const handlePractice = () => {
    setPracticeMode(true);
    setPracticeIndex(0);
  };

  const exitPracticeMode = () => {
    setPracticeMode(false);
    setPracticeIndex(0);
  };

  // Practice mode sentences (split content by periods for simple sentence separation)
  const practiceSentences = generatedContent?.content
    .split(/[.!?]+/)
    .filter(s => s.trim().length > 0)
    .map(s => s.trim()) || [];

  if (practiceMode && practiceSentences.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Practice Mode</h3>
          <button
            onClick={exitPracticeMode}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Exit Practice
          </button>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-xs text-blue-600 mb-2">
            Sentence {practiceIndex + 1} of {practiceSentences.length}
          </div>
          <div className="text-sm text-gray-900 mb-3">
            {practiceSentences[practiceIndex]}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setPracticeIndex(Math.max(0, practiceIndex - 1))}
              disabled={practiceIndex === 0}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPracticeIndex(Math.min(practiceSentences.length - 1, practiceIndex + 1))}
              disabled={practiceIndex === practiceSentences.length - 1}
              className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Generate Sentences</h3>

        {vocabularyItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-sm text-gray-500 mb-2">No vocabulary items available</div>
            <div className="text-xs text-gray-400">Add some words to your vocabulary first</div>
          </div>
        ) : (
          <>
            <WordSelection
              vocabularyItems={vocabularyItems}
              selectedWords={selectedWords}
              onSelectionChange={setSelectedWords}
              maxSelection={8}
            />

            <div className="flex items-center gap-3 pt-3">
              {/* <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-700">Count:</label>
                <select
                  value={sentenceCount}
                  onChange={(e) => setSentenceCount(parseInt(e.target.value))}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                </select>
              </div> */}

              <button
                onClick={handleGenerate}
                disabled={loading || selectedWords.length === 0}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating...' : 'Generate Sentences'}
              </button>
            </div>
          </>
        )}
      </div>

      {generatedContent && (
        <GeneratedContentDisplay
          content={generatedContent}
          onSave={onSaveContent}
          onPractice={handlePractice}
        />
      )}
    </div>
  );
};

// Article Generation Component
const ArticleGeneration: React.FC<ArticleGenerationProps> = ({
  vocabularyItems,
  onGenerate,
  loading,
  generatedContent,
  onSaveContent
}) => {
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [showHighlights, setShowHighlights] = useState(true);

  const handleGenerate = () => {
    if (selectedWords.length > 0) {
      // Get source language from the first selected word
      const firstWord = vocabularyItems.find(item => item.word === selectedWords[0]);
      const sourceLanguage = firstWord?.sourceLanguage || 'en';
      onGenerate(selectedWords, topic.trim() || undefined, sourceLanguage);
    }
  };

  const handleExportArticle = () => {
    if (generatedContent) {
      const blob = new Blob([generatedContent.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `article-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleShareArticle = async () => {
    if (generatedContent && navigator.share) {
      try {
        await navigator.share({
          title: 'Generated Article',
          text: generatedContent.content
        });
      } catch (error) {
        console.log('Sharing failed:', error);
        // Fallback to clipboard
        await navigator.clipboard.writeText(generatedContent.content);
      }
    } else if (generatedContent) {
      // Fallback to clipboard
      await navigator.clipboard.writeText(generatedContent.content);
    }
  };

  const renderArticleWithHighlights = (content: string, usedWords: string[]) => {
    if (!showHighlights) {
      return content;
    }

    let highlightedContent = content;
    usedWords.forEach((word, index) => {
      const colors = ['bg-yellow-200', 'bg-blue-200', 'bg-green-200', 'bg-pink-200', 'bg-purple-200'];
      const color = colors[index % colors.length];
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      highlightedContent = highlightedContent.replace(regex, `<span class="${color} px-1 rounded">${word}</span>`);
    });

    return highlightedContent;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Generate Article</h3>

        {vocabularyItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-sm text-gray-500 mb-2">No vocabulary items available</div>
            <div className="text-xs text-gray-400">Add some words to your vocabulary first</div>
          </div>
        ) : (
          <>
            <WordSelection
              vocabularyItems={vocabularyItems}
              selectedWords={selectedWords}
              onSelectionChange={setSelectedWords}
              maxSelection={15}
            />

            <div className="space-y-3 pt-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Topic (optional)
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., travel, food, technology..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || selectedWords.length === 0}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating Article...' : 'Generate Article'}
              </button>
            </div>
          </>
        )}
      </div>

      {generatedContent && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Generated Article</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHighlights(!showHighlights)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {showHighlights ? 'Hide' : 'Show'} Highlights
              </button>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg space-y-3">
            <div className="text-sm text-gray-900 leading-relaxed max-h-48 overflow-y-auto">
              {showHighlights ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: renderArticleWithHighlights(generatedContent.content, generatedContent.usedWords)
                  }}
                />
              ) : (
                generatedContent.content
              )}
            </div>

            {generatedContent.usedWords.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-600">Used vocabulary: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {generatedContent.usedWords.map((word, index) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-gray-200">
              <button
                onClick={handleExportArticle}
                className="flex-1 px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Export
              </button>
              <button
                onClick={handleShareArticle}
                className="flex-1 px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Share
              </button>
              {onSaveContent && (
                <button
                  onClick={() => onSaveContent(generatedContent)}
                  className="flex-1 px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Save
                </button>
              )}
            </div>
          </div>

          {/* Article-based learning exercises */}
          {/* <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-xs font-medium text-blue-800 mb-2">Learning Exercise</div>
            <div className="text-xs text-blue-700 mb-2">
              Try to identify and understand each vocabulary word in context.
              Click the highlights toggle to practice without visual aids.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowHighlights(false)}
                className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Practice Mode
              </button>
              <button
                onClick={() => setShowHighlights(true)}
                className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Show Answers
              </button>
            </div>
          </div> */}
        </div>
      )}
    </div>
  );
};

// Vocabulary List Component
const VocabularyList: React.FC<VocabularyListProps> = ({ items, onItemClick, onDeleteItem, onEditItem, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">Loading vocabulary...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <div className="text-sm text-gray-500 mb-2">No vocabulary items found</div>
          <div className="text-xs text-gray-400">Start translating text to build your vocabulary</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer group"
          onClick={() => onItemClick(item)}
        >
          {/* Word and Translation */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-900">{item.word}</span>
                  <PronunciationButton
                    word={item.word}
                    language={item.sourceLanguage || 'en'}
                    size="sm"
                    onError={(error) => console.warn('Pronunciation error:', error)}
                  />
                  {item.pronunciation && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-mono">
                      /{item.pronunciation}/
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-600">→</span>
                <span className="text-base text-gray-800">{item.translation}</span>
                {/* <PronunciationButton
                  word={item.translation}
                  language={item.targetLanguage || 'en'}
                  size="sm"
                  onError={(error) => console.warn('Pronunciation error:', error)}
                /> */}
              </div>

              {item.context && (
                <div className="text-sm text-gray-600 bg-gray-50 rounded-md p-2 mb-2">
                  <span className="font-medium">Context:</span> {item.context}
                </div>
              )}
            </div>

            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditItem(item);
                }}
                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                title="Edit item"
              >
                <Edit2 size={16} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteItem(item.id);
                }}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                title="Delete item"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                <span>{item.dateAdded.toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <RotateCcw size={12} />
                <span>{item.reviewCount} reviews</span>
              </div>
            </div>
            {item.sourceUrl && (
              <div className="text-blue-500 hover:text-blue-600 truncate max-w-24">
                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                  Source
                </a>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Main App Component
function App() {
  const [activeTab, setActiveTab] = useState<TabType>('translate');
  const [searchQuery, setSearchQuery] = useState('');
  const [vocabularyItems, setVocabularyItems] = useState<VocabularyItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<VocabularyItem[]>([]);
  const [translationResult, setTranslationResult] = useState<TranslationResult>();
  const [defaultTargetLang, setDefaultTargetLang] = useState<LanguageCode>('en');

  // Use translation hook
  const { translate, loading, error: translationError, isConfigured } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [vocabularyFilter, setVocabularyFilter] = useState<VocabularyFilter>({});
  const [editingItem, setEditingItem] = useState<VocabularyItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [vocabularyStats, setVocabularyStats] = useState({
    totalWords: 0,
    averageReviewCount: 0,
    mostRecentWord: undefined as VocabularyItem | undefined,
    mostReviewedWord: undefined as VocabularyItem | undefined
  });
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent>();
  const [contentGenerationLoading, setContentGenerationLoading] = useState(false);
  const [generationMode, setGenerationMode] = useState<'sentences' | 'article'>('sentences');
  const [vocabularyLoading, setVocabularyLoading] = useState(false);
  const itemsPerPage = 5;

  // Load default target language from config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await storageManager.getConfig();
        if (config?.defaultTargetLanguage) {
          setDefaultTargetLang(config.defaultTargetLanguage);
        }
      } catch (error) {
        console.error('Failed to load config:', error);
      }
    };
    loadConfig();
  }, []);

  // Initialize vocabulary items from storage
  useEffect(() => {
    const loadVocabulary = async () => {
      setVocabularyLoading(true);
      try {
        const message = {
          id: `get_vocab_${Date.now()}`,
          type: MessageType.GET_VOCABULARY,
          timestamp: Date.now(),
          payload: {
            filter: {},
            limit: 100
          }
        };

        const response = await chrome.runtime.sendMessage(message);

        if (response && response.type === MessageType.SUCCESS) {
          // The data is in response.payload.data
          const vocabularyData = response.payload?.data;

          if (vocabularyData && vocabularyData.items) {
            // Convert dateAdded to Date objects if they're not already
            const items = vocabularyData.items.map((item: VocabularyItem) => ({
              ...item,
              dateAdded: item.dateAdded instanceof Date ? item.dateAdded : new Date(item.dateAdded)
            }));
            setVocabularyItems(items);
          } else {
            // If no items, set empty array
            setVocabularyItems([]);
          }
        } else {
          console.warn('Unexpected response type:', response?.type);
          setVocabularyItems([]);
        }
      } catch (error) {
        console.error('Failed to load vocabulary:', error);
        setVocabularyItems([]);
      } finally {
        setVocabularyLoading(false);
      }
    };
    loadVocabulary();
  }, []);

  // Calculate vocabulary statistics
  useEffect(() => {
    if (vocabularyItems.length === 0) {
      setVocabularyStats({
        totalWords: 0,
        averageReviewCount: 0,
        mostRecentWord: undefined,
        mostReviewedWord: undefined
      });
      return;
    }

    const totalReviews = vocabularyItems.reduce((sum, item) => sum + item.reviewCount, 0);
    const averageReviewCount = totalReviews / vocabularyItems.length;

    const mostRecentWord = vocabularyItems.reduce((latest, item) =>
      item.dateAdded > latest.dateAdded ? item : latest
    );

    const mostReviewedWord = vocabularyItems.reduce((mostReviewed, item) =>
      item.reviewCount > mostReviewed.reviewCount ? item : mostReviewed
    );

    setVocabularyStats({
      totalWords: vocabularyItems.length,
      averageReviewCount: Math.round(averageReviewCount * 100) / 100,
      mostRecentWord,
      mostReviewedWord
    });
  }, [vocabularyItems]);

  // Filter vocabulary items based on search query and filters
  useEffect(() => {
    let filtered = vocabularyItems;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.word.toLowerCase().includes(query) ||
        item.translation.toLowerCase().includes(query) ||
        item.context.toLowerCase().includes(query)
      );
    }

    // Apply advanced filters
    if (vocabularyFilter.reviewCountMin !== undefined) {
      filtered = filtered.filter(item => item.reviewCount >= vocabularyFilter.reviewCountMin!);
    }

    if (vocabularyFilter.dateRange) {
      filtered = filtered.filter(item =>
        item.dateAdded >= vocabularyFilter.dateRange!.start &&
        item.dateAdded <= vocabularyFilter.dateRange!.end
      );
    }

    setFilteredItems(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchQuery, vocabularyItems, vocabularyFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  // Handle translation
  const handleTranslate = useCallback(async (text: string, targetLang: LanguageCode) => {
    if (!isConfigured) {
      alert('Please configure your API settings first');
      setActiveTab('settings');
      return;
    }

    try {
      const result = await translate(text, targetLang);
      setTranslationResult(result);
    } catch (error) {
      console.error('Translation failed:', error);
      alert('Translation failed. Please check your API configuration.');
    }
  }, [translate, isConfigured]);

  // Handle vocabulary item click
  const handleVocabularyItemClick = useCallback((item: VocabularyItem) => {
    // For now, just log the item. Later this could open a detail view
    console.log('Vocabulary item clicked:', item);
  }, []);

  // Handle vocabulary item deletion
  const handleDeleteVocabularyItem = useCallback(async (id: string) => {
    try {
      const message = {
        id: `delete_vocab_${Date.now()}`,
        type: MessageType.DELETE_VOCABULARY_ITEM,
        timestamp: Date.now(),
        payload: { id }
      };

      const response = await chrome.runtime.sendMessage(message);

      if (response.type === MessageType.SUCCESS) {
        // Update local state after successful deletion
        setVocabularyItems(prev => prev.filter(item => item.id !== id));
      } else {
        console.error('Failed to delete vocabulary item:', response.payload?.error);
        alert('Failed to delete vocabulary item');
      }
    } catch (error) {
      console.error('Failed to delete vocabulary item:', error);
      alert('Failed to delete vocabulary item');
    }
  }, []);

  // Handle vocabulary item editing
  const handleEditVocabularyItem = useCallback((item: VocabularyItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  }, []);

  // Handle vocabulary item save
  const handleSaveVocabularyItem = useCallback(async (updatedItem: VocabularyItem) => {
    try {
      const message = {
        id: `update_vocab_${Date.now()}`,
        type: MessageType.UPDATE_VOCABULARY_ITEM,
        timestamp: Date.now(),
        payload: {
          id: updatedItem.id,
          updates: {
            word: updatedItem.word,
            translation: updatedItem.translation,
            context: updatedItem.context,
            pronunciation: updatedItem.pronunciation
          }
        }
      };

      const response = await chrome.runtime.sendMessage(message);

      if (response.type === MessageType.SUCCESS) {
        // Update local state after successful update
        setVocabularyItems(prev =>
          prev.map(item => item.id === updatedItem.id ? updatedItem : item)
        );
      } else {
        console.error('Failed to update vocabulary item:', response.payload?.error);
        alert('Failed to update vocabulary item');
      }
    } catch (error) {
      console.error('Failed to update vocabulary item:', error);
      alert('Failed to update vocabulary item');
    }
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((filter: VocabularyFilter) => {
    setVocabularyFilter(filter);
  }, []);

  // Handle add to vocabulary
  const handleAddToVocabulary = useCallback(async (
    word: string,
    translation: string,
    context: string,
    sourceLanguage: string,
    targetLanguage: string
  ) => {
    try {
      const message = {
        id: `add_vocab_${Date.now()}`,
        type: MessageType.ADD_TO_VOCABULARY,
        timestamp: Date.now(),
        payload: {
          word,
          translation,
          context,
          sourceUrl: window.location.href,
          sourceLanguage,
          targetLanguage
        }
      };

      const response = await chrome.runtime.sendMessage(message);

      if (response.type === MessageType.SUCCESS) {
        // Reload vocabulary items to show the new word
        const vocabMessage = {
          id: `get_vocab_${Date.now()}`,
          type: MessageType.GET_VOCABULARY,
          timestamp: Date.now(),
          payload: {
            filter: {},
            limit: 100
          }
        };

        const vocabResponse = await chrome.runtime.sendMessage(vocabMessage);
        console.log('Vocabulary refresh response:', vocabResponse);

        if (vocabResponse && vocabResponse.type === MessageType.SUCCESS) {
          const vocabularyData = vocabResponse.payload?.data;
          if (vocabularyData && vocabularyData.items) {
            // Convert dateAdded to Date objects if they're not already
            const items = vocabularyData.items.map((item: VocabularyItem) => ({
              ...item,
              dateAdded: item.dateAdded instanceof Date ? item.dateAdded : new Date(item.dateAdded)
            }));
            setVocabularyItems(items);
          }
        }

        return; // Success
      } else if (response.type === MessageType.ERROR) {
        if (response.payload?.code === 'WORD_EXISTS') {
          throw new Error('Word already exists in vocabulary');
        }
        throw new Error(response.payload?.error || 'Failed to add to vocabulary');
      }
    } catch (error) {
      console.error('Failed to add to vocabulary:', error);
      throw error;
    }
  }, []);

  // Handle sentence generation
  const handleGenerateSentences = useCallback(async (words: string[], count: number, sourceLanguage?: LanguageCode) => {
    setContentGenerationLoading(true);
    try {
      // Send message to background service
      const message = {
        id: `generate-sentences-${Date.now()}`,
        type: MessageType.GENERATE_SENTENCES,
        timestamp: Date.now(),
        payload: {
          words,
          count,
          customPrompt: undefined,
          sourceLanguage
        }
      };

      const response = await chrome.runtime.sendMessage(message);

      if (response.type === MessageType.CONTENT_GENERATED) {
        // Convert generatedAt from string to Date object
        const content = {
          ...response.payload.content,
          generatedAt: new Date(response.payload.content.generatedAt)
        };
        setGeneratedContent(content);
      } else if (response.type === 'ERROR') {
        console.error('Content generation failed:', response.payload.error);
        // Could show error toast here
      }
    } catch (error) {
      console.error('Failed to generate sentences:', error);
    } finally {
      setContentGenerationLoading(false);
    }
  }, []);

  // Handle article generation
  const handleGenerateArticle = useCallback(async (words: string[], topic?: string, sourceLanguage?: LanguageCode) => {
    setContentGenerationLoading(true);
    try {
      // Send message to background service
      const message = {
        id: `generate-article-${Date.now()}`,
        type: MessageType.GENERATE_ARTICLE,
        timestamp: Date.now(),
        payload: {
          words,
          topic,
          customPrompt: undefined,
          sourceLanguage
        }
      };

      const response = await chrome.runtime.sendMessage(message);

      if (response.type === MessageType.CONTENT_GENERATED) {
        // Convert generatedAt from string to Date object
        const content = {
          ...response.payload.content,
          generatedAt: new Date(response.payload.content.generatedAt)
        };
        setGeneratedContent(content);
      } else if (response.type === 'ERROR') {
        console.error('Article generation failed:', response.payload.error);
        // Could show error toast here
      }
    } catch (error) {
      console.error('Failed to generate article:', error);
    } finally {
      setContentGenerationLoading(false);
    }
  }, []);

  // Handle saving generated content
  const handleSaveGeneratedContent = useCallback((content: GeneratedContent) => {
    // For now, just log. Later this could save to a separate storage
    console.log('Saving generated content:', content);
    // Could implement saving to browser storage or export functionality
  }, []);

  // Tab navigation
  const tabs = [
    { id: 'translate' as TabType, label: 'Translate', icon: Globe },
    { id: 'vocabulary' as TabType, label: 'Vocabulary', icon: BookOpen },
    { id: 'generate' as TabType, label: 'Generate', icon: Sparkles },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings }
  ];


  return (
    <div className="popup-container bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">TransAI</h1>
          <div className="text-xs text-gray-500">
            {vocabularyItems.length} words
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex-shrink-0 flex border-b border-gray-200">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-2 py-3 text-center transition-colors min-w-0 ${activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              title={tab.label}
            >
              <div className="flex items-center justify-center">
                <IconComponent size={20} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'translate' && (
          <div className="h-full overflow-y-auto">
            <div className="p-4">
              <QuickTranslate
                onTranslate={handleTranslate}
                loading={loading}
                result={translationResult}
                defaultTargetLang={defaultTargetLang}
                onAddToVocabulary={handleAddToVocabulary}
              />
            </div>
          </div>
        )}

        {activeTab === 'vocabulary' && (
          <div className="h-full flex flex-col min-h-0">
            <div className="flex-shrink-0 p-4 border-b border-gray-100">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search vocabulary..."
              />

              <VocabularyFilter
                onFilterChange={handleFilterChange}
                currentFilter={vocabularyFilter}
              />

              <VocabularyStats
                totalWords={vocabularyStats.totalWords}
                averageReviewCount={vocabularyStats.averageReviewCount}
                mostRecentWord={vocabularyStats.mostRecentWord}
                mostReviewedWord={vocabularyStats.mostReviewedWord}
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-4">
                <VocabularyList
                  items={paginatedItems}
                  onItemClick={handleVocabularyItemClick}
                  onDeleteItem={handleDeleteVocabularyItem}
                  onEditItem={handleEditVocabularyItem}
                  loading={vocabularyLoading}
                />
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex-shrink-0 p-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'generate' && (
          <div className="h-full flex flex-col min-h-0">
            {/* Generation Mode Tabs */}
            <div className="flex-shrink-0 flex border-b border-gray-200 px-4 pt-2">
              <button
                onClick={() => {
                  setGenerationMode('sentences');
                  setGeneratedContent(undefined);
                }}
                className={`flex-1 px-3 py-2 text-xs font-medium text-center transition-colors ${generationMode === 'sentences'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
              >
                Sentences
              </button>
              <button
                onClick={() => {
                  setGenerationMode('article');
                  setGeneratedContent(undefined);
                }}
                className={`flex-1 px-3 py-2 text-xs font-medium text-center transition-colors ${generationMode === 'article'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
              >
                Article
              </button>
            </div>

            {/* Generation Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-4">
                {generationMode === 'sentences' ? (
                  <SentenceGeneration
                    vocabularyItems={vocabularyItems}
                    onGenerate={handleGenerateSentences}
                    loading={contentGenerationLoading}
                    generatedContent={generatedContent?.type === 'sentence' ? generatedContent : undefined}
                    onSaveContent={handleSaveGeneratedContent}
                  />
                ) : (
                  <ArticleGeneration
                    vocabularyItems={vocabularyItems}
                    onGenerate={handleGenerateArticle}
                    loading={contentGenerationLoading}
                    generatedContent={generatedContent?.type === 'article' ? generatedContent : undefined}
                    onSaveContent={handleSaveGeneratedContent}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="h-full overflow-y-auto">
            <div className="p-4">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700 mb-4">Settings</div>

                  {/* Configuration Status */}
                  <div className="mb-6 p-3 rounded-lg border">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm font-medium">
                        {isConfigured ? 'API Configured' : 'API Not Configured'}
                      </span>
                    </div>
                    {translationError && (
                      <div className="text-xs text-red-600 mb-2">{translationError}</div>
                    )}
                    {!isConfigured && (
                      <div className="text-xs text-gray-500">
                        Configure your API settings to enable translation features
                      </div>
                    )}
                  </div>

                  {/* Quick Settings Options */}
                  <div className="space-y-3 mb-6">
                    <button
                      onClick={() => {
                        chrome.runtime.openOptionsPage();
                      }}
                      className="w-full flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div className="text-left min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900">Advanced Settings</div>
                          <div className="text-xs text-gray-500">API keys, prompts, and preferences</div>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Quick Actions */}
                  <div className="text-left">
                    <div className="text-xs font-medium text-gray-600 mb-2">Quick Actions</div>
                    <div className="space-y-2">
                      <button
                        onClick={async () => {
                          try {
                            const vocabulary = await storageManager.getVocabulary();
                            const content = JSON.stringify(vocabulary, null, 2);
                            const blob = new Blob([content], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `transai-vocabulary-${new Date().toISOString().split('T')[0]}.json`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          } catch (error) {
                            console.error('Export failed:', error);
                          }
                        }}
                        className="w-full flex items-center justify-between p-2 text-sm text-gray-700 hover:bg-gray-50 rounded border border-gray-200"
                      >
                        <span className="truncate">Export Vocabulary</span>
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>

                      <button
                        onClick={async () => {
                          if (confirm('Are you sure you want to clear all vocabulary? This action cannot be undone.')) {
                            try {
                              await storageManager.setVocabulary([]);
                              // Refresh vocabulary display if needed
                              window.location.reload();
                            } catch (error) {
                              console.error('Clear failed:', error);
                            }
                          }
                        }}
                        className="w-full flex items-center justify-between p-2 text-sm text-red-600 hover:bg-red-50 rounded border border-red-200"
                      >
                        <span className="truncate">Clear All Vocabulary</span>
                        <svg className="w-4 h-4 text-red-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <VocabularyEditModal
        item={editingItem}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveVocabularyItem}
      />
    </div>
  );
}

// Wrap App with ErrorBoundary
function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithErrorBoundary;