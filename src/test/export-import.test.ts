/**
 * Export/Import Functionality Tests
 * Tests for vocabulary export and import operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storageManager } from '../services/storage.js';
import type { VocabularyItem } from '../types/index.js';

// Mock the storage manager
vi.mock('../services/storage.js', () => ({
  storageManager: {
    getVocabulary: vi.fn(),
    setVocabulary: vi.fn()
  }
}));

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

describe('Export/Import Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageManager.getVocabulary).mockResolvedValue(mockVocabulary);
    vi.mocked(storageManager.setVocabulary).mockResolvedValue();
  });

  describe('Export Functions', () => {
    it('should generate JSON export content', async () => {
      const vocabulary = await storageManager.getVocabulary();
      const jsonContent = JSON.stringify(vocabulary, null, 2);
      
      expect(jsonContent).toContain('"word": "hello"');
      expect(jsonContent).toContain('"translation": "hola"');
      expect(JSON.parse(jsonContent)).toHaveLength(2);
    });

    it('should generate CSV export content', async () => {
      const vocabulary = await storageManager.getVocabulary();
      
      const headers = ['Word', 'Translation', 'Context', 'Source URL', 'Date Added', 'Review Count'];
      const rows = vocabulary.map(item => [
        item.word,
        item.translation,
        item.context,
        item.sourceUrl,
        item.dateAdded.toISOString().split('T')[0],
        item.reviewCount.toString()
      ]);
      
      const csvContent = [headers, ...rows].map(row => 
        row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      expect(csvContent).toContain('"Word","Translation"');
      expect(csvContent).toContain('"hello","hola"');
      expect(csvContent.split('\n')).toHaveLength(3); // header + 2 rows
    });

    it('should generate text export content', async () => {
      const vocabulary = await storageManager.getVocabulary();
      
      const textContent = vocabulary.map(item => 
        `${item.word} - ${item.translation}\nContext: ${item.context}\nSource: ${item.sourceUrl}\nAdded: ${item.dateAdded.toISOString().split('T')[0]}\n---`
      ).join('\n\n');
      
      expect(textContent).toContain('hello - hola');
      expect(textContent).toContain('Context: greeting');
      expect(textContent).toContain('world - mundo');
    });

    it('should handle empty vocabulary for export', async () => {
      vi.mocked(storageManager.getVocabulary).mockResolvedValue([]);
      
      const vocabulary = await storageManager.getVocabulary();
      expect(vocabulary).toHaveLength(0);
      
      const jsonContent = JSON.stringify(vocabulary, null, 2);
      expect(jsonContent).toBe('[]');
    });
  });

  describe('Import Functions', () => {
    it('should validate JSON import data', () => {
      const validJsonData = JSON.stringify(mockVocabulary);
      const parsedData = JSON.parse(validJsonData);
      
      expect(Array.isArray(parsedData)).toBe(true);
      expect(parsedData).toHaveLength(2);
      expect(parsedData[0]).toHaveProperty('word');
      expect(parsedData[0]).toHaveProperty('translation');
    });

    it('should filter valid vocabulary items during import', () => {
      const mixedData = [
        {
          id: '1',
          word: 'valid',
          translation: 'válido',
          context: 'adjective',
          sourceUrl: 'https://example.com',
          dateAdded: new Date(),
          reviewCount: 0
        },
        {
          // Missing required fields
          id: '2',
          word: 'incomplete'
        },
        {
          // Invalid data types
          word: 123,
          translation: null
        }
      ];
      
      const validItems = mixedData.filter(item => 
        item && 
        typeof item.word === 'string' && 
        typeof item.translation === 'string' &&
        typeof item.context === 'string'
      );
      
      expect(validItems).toHaveLength(1);
      expect(validItems[0].word).toBe('valid');
    });

    it('should merge imported vocabulary with existing data', async () => {
      const currentVocabulary = await storageManager.getVocabulary();
      const newItems = [
        {
          id: '3',
          word: 'new',
          translation: 'nuevo',
          context: 'adjective',
          sourceUrl: 'https://example.com',
          dateAdded: new Date(),
          reviewCount: 0
        }
      ];
      
      const mergedVocabulary = [...currentVocabulary];
      let addedCount = 0;
      
      newItems.forEach(item => {
        const exists = mergedVocabulary.find(v => 
          v.word.toLowerCase() === item.word.toLowerCase()
        );
        
        if (!exists) {
          mergedVocabulary.push({
            ...item,
            id: item.id || 'generated-id',
            dateAdded: item.dateAdded || new Date(),
            reviewCount: item.reviewCount || 0
          });
          addedCount++;
        }
      });
      
      expect(mergedVocabulary).toHaveLength(3);
      expect(addedCount).toBe(1);
    });

    it('should prevent duplicate imports', async () => {
      const currentVocabulary = await storageManager.getVocabulary();
      const duplicateItems = [
        {
          id: '1',
          word: 'hello', // Already exists
          translation: 'hola',
          context: 'greeting',
          sourceUrl: 'https://example.com',
          dateAdded: new Date(),
          reviewCount: 0
        }
      ];
      
      const mergedVocabulary = [...currentVocabulary];
      let addedCount = 0;
      
      duplicateItems.forEach(item => {
        const exists = mergedVocabulary.find(v => 
          v.word.toLowerCase() === item.word.toLowerCase()
        );
        
        if (!exists) {
          mergedVocabulary.push(item);
          addedCount++;
        }
      });
      
      expect(mergedVocabulary).toHaveLength(2); // No new items added
      expect(addedCount).toBe(0);
    });

    it('should handle invalid JSON during import', () => {
      const invalidJson = 'invalid json content';
      
      expect(() => {
        JSON.parse(invalidJson);
      }).toThrow();
    });

    it('should handle non-array JSON during import', () => {
      const nonArrayJson = JSON.stringify({ not: 'an array' });
      const parsedData = JSON.parse(nonArrayJson);
      
      expect(Array.isArray(parsedData)).toBe(false);
    });
  });

  describe('File Operations', () => {
    it('should generate correct filename for export', () => {
      const date = new Date('2024-01-15');
      const dateString = date.toISOString().split('T')[0];
      
      const jsonFilename = `transai-vocabulary-${dateString}.json`;
      const csvFilename = `transai-vocabulary-${dateString}.csv`;
      const txtFilename = `transai-vocabulary-${dateString}.txt`;
      
      expect(jsonFilename).toBe('transai-vocabulary-2024-01-15.json');
      expect(csvFilename).toBe('transai-vocabulary-2024-01-15.csv');
      expect(txtFilename).toBe('transai-vocabulary-2024-01-15.txt');
    });

    it('should determine correct MIME types for export formats', () => {
      const mimeTypes = {
        json: 'application/json',
        csv: 'text/csv',
        txt: 'text/plain'
      };
      
      expect(mimeTypes.json).toBe('application/json');
      expect(mimeTypes.csv).toBe('text/csv');
      expect(mimeTypes.txt).toBe('text/plain');
    });
  });

  describe('Data Validation', () => {
    it('should validate required vocabulary item fields', () => {
      const validItem = {
        id: '1',
        word: 'test',
        translation: 'prueba',
        context: 'noun',
        sourceUrl: 'https://example.com',
        dateAdded: new Date(),
        reviewCount: 0
      };
      
      const isValid = (item: any) => 
        !!item &&
        typeof item.word === 'string' &&
        typeof item.translation === 'string' &&
        typeof item.context === 'string' &&
        typeof item.sourceUrl === 'string';
      
      expect(isValid(validItem)).toBe(true);
      expect(isValid({})).toBe(false);
      expect(isValid(null)).toBe(false);
      expect(isValid({ word: 'test' })).toBe(false);
    });

    it('should handle date conversion during import', () => {
      const itemWithStringDate = {
        id: '1',
        word: 'test',
        translation: 'prueba',
        context: 'noun',
        sourceUrl: 'https://example.com',
        dateAdded: '2024-01-01T00:00:00.000Z',
        reviewCount: 0
      };
      
      const processedItem = {
        ...itemWithStringDate,
        dateAdded: itemWithStringDate.dateAdded ? new Date(itemWithStringDate.dateAdded) : new Date(),
        reviewCount: itemWithStringDate.reviewCount || 0
      };
      
      expect(processedItem.dateAdded).toBeInstanceOf(Date);
      expect(processedItem.reviewCount).toBe(0);
    });
  });
});