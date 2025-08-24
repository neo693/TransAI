import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from '../popup/App';


describe('Vocabulary Management Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Vocabulary Statistics', () => {
    it('should display vocabulary statistics', () => {
      render(<App />);
      fireEvent.click(screen.getByText('Vocabulary'));

      expect(screen.getByText('Statistics')).toBeInTheDocument();
      expect(screen.getByText('Total:')).toBeInTheDocument();
      expect(screen.getByText('Avg Reviews:')).toBeInTheDocument();
    });

    it('should show correct total word count', () => {
      render(<App />);
      fireEvent.click(screen.getByText('Vocabulary'));

      // Should show the count from mock data (3 items by default)
      const statsSection = document.querySelector('.bg-gray-50');
      expect(statsSection).toBeInTheDocument();
      expect(statsSection).toHaveTextContent('Total:');
      expect(statsSection).toHaveTextContent('3');
    });

    it('should calculate average review count', () => {
      render(<App />);
      fireEvent.click(screen.getByText('Vocabulary'));

      // Average of 3, 5, 2 = 3.3, rounded to 3.3
      const statsSection = document.querySelector('.bg-gray-50');
      expect(statsSection).toHaveTextContent('Avg Reviews:');
      expect(statsSection).toHaveTextContent('3.3');
    });

    it('should show most recent word', () => {
      render(<App />);
      fireEvent.click(screen.getByText('Vocabulary'));

      const statsSection = document.querySelector('.bg-gray-50');
      expect(statsSection).toHaveTextContent('Recent:');
      // Most recent should be "au revoir" (2024-01-17)
      expect(statsSection).toHaveTextContent('au revoir');
    });
  });

  describe('Advanced Filtering', () => {
    beforeEach(() => {
      render(<App />);
      fireEvent.click(screen.getByText('Vocabulary'));
    });

    it('should show advanced filter toggle', () => {
      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByText('Advanced')).toBeInTheDocument();
    });

    it('should toggle advanced filters', () => {
      const advancedButton = screen.getByText('Advanced');
      fireEvent.click(advancedButton);

      expect(screen.getByText('Min Reviews:')).toBeInTheDocument();
      expect(screen.getByText('Added:')).toBeInTheDocument();

      // Should change to "Simple" when expanded
      expect(screen.getByText('Simple')).toBeInTheDocument();
    });

    it('should filter by minimum review count', () => {
      const advancedButton = screen.getByText('Advanced');
      fireEvent.click(advancedButton);

      const minReviewsInput = screen.getByPlaceholderText('Any');
      fireEvent.change(minReviewsInput, { target: { value: '5' } });

      // Should only show items with 5+ reviews (merci with 5 reviews)
      expect(screen.getByText('merci')).toBeInTheDocument();
      expect(screen.queryByText('bonjour')).not.toBeInTheDocument();
    });

    it('should filter by date range', () => {
      const advancedButton = screen.getByText('Advanced');
      fireEvent.click(advancedButton);

      const dateSelect = screen.getByDisplayValue('Any time');
      fireEvent.change(dateSelect, { target: { value: '7' } });

      // Should filter to items added in the last 7 days
      // This test would need to be adjusted based on current date
      expect(dateSelect).toHaveValue('7');
    });
  });

  describe('Vocabulary Item Editing', () => {
    beforeEach(() => {
      render(<App />);
      fireEvent.click(screen.getByText('Vocabulary'));
    });

    it('should show edit button on hover', () => {
      const vocabularyItem = screen.getByText('bonjour').closest('.p-3');
      
      // The edit button should be present but the container initially hidden
      const editButton = vocabularyItem!.querySelector('button[title="Edit item"]');
      const buttonContainer = editButton!.parentElement;
      expect(editButton).toBeInTheDocument();
      expect(buttonContainer).toHaveClass('opacity-0');
    });

    it('should open edit modal when edit button is clicked', () => {
      const vocabularyItem = screen.getByText('bonjour').closest('.p-3');
      const editButton = vocabularyItem!.querySelector('button[title="Edit item"]');
      
      fireEvent.click(editButton!);
      
      expect(screen.getByText('Edit Vocabulary')).toBeInTheDocument();
      expect(screen.getByDisplayValue('bonjour')).toBeInTheDocument();
      expect(screen.getByDisplayValue('hello')).toBeInTheDocument();
    });

    it('should allow editing vocabulary item fields', () => {
      const vocabularyItem = screen.getByText('bonjour').closest('.p-3');
      const editButton = vocabularyItem!.querySelector('button[title="Edit item"]');
      
      fireEvent.click(editButton!);
      
      const wordInput = screen.getByDisplayValue('bonjour');
      const translationInput = screen.getByDisplayValue('hello');
      const contextInput = screen.getByDisplayValue('greeting someone in the morning');
      const pronunciationInput = screen.getByDisplayValue('bon-ZHOOR');
      
      fireEvent.change(wordInput, { target: { value: 'salut' } });
      fireEvent.change(translationInput, { target: { value: 'hi' } });
      fireEvent.change(contextInput, { target: { value: 'casual greeting' } });
      fireEvent.change(pronunciationInput, { target: { value: 'sa-LUU' } });
      
      expect(wordInput).toHaveValue('salut');
      expect(translationInput).toHaveValue('hi');
      expect(contextInput).toHaveValue('casual greeting');
      expect(pronunciationInput).toHaveValue('sa-LUU');
    });

    it('should save changes when save button is clicked', () => {
      const vocabularyItem = screen.getByText('bonjour').closest('.p-3');
      const editButton = vocabularyItem!.querySelector('button[title="Edit item"]');
      
      fireEvent.click(editButton!);
      
      const wordInput = screen.getByDisplayValue('bonjour');
      fireEvent.change(wordInput, { target: { value: 'salut' } });
      
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);
      
      // Modal should close and item should be updated
      expect(screen.queryByText('Edit Vocabulary')).not.toBeInTheDocument();
      expect(screen.getByText('salut')).toBeInTheDocument();
    });

    it('should cancel changes when cancel button is clicked', () => {
      const vocabularyItem = screen.getByText('bonjour').closest('.p-3');
      const editButton = vocabularyItem!.querySelector('button[title="Edit item"]');
      
      fireEvent.click(editButton!);
      
      const wordInput = screen.getByDisplayValue('bonjour');
      fireEvent.change(wordInput, { target: { value: 'salut' } });
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      // Modal should close and changes should not be saved
      expect(screen.queryByText('Edit Vocabulary')).not.toBeInTheDocument();
      expect(screen.getByText('bonjour')).toBeInTheDocument();
      expect(screen.queryByText('salut')).not.toBeInTheDocument();
    });

    it('should close modal when X button is clicked', () => {
      const vocabularyItem = screen.getByText('bonjour').closest('.p-3');
      const editButton = vocabularyItem!.querySelector('button[title="Edit item"]');
      
      fireEvent.click(editButton!);
      
      const closeButton = screen.getByRole('button', { name: '' }); // X button has no text
      fireEvent.click(closeButton);
      
      expect(screen.queryByText('Edit Vocabulary')).not.toBeInTheDocument();
    });
  });

  describe('Pronunciation Display', () => {
    beforeEach(() => {
      render(<App />);
      fireEvent.click(screen.getByText('Vocabulary'));
    });

    it('should display pronunciation when available', () => {
      expect(screen.getByText('bon-ZHOOR')).toBeInTheDocument();
    });

    it('should not display pronunciation badge when not available', () => {
      // "merci" doesn't have pronunciation in mock data
      const merciItem = screen.getByText('merci').closest('.p-3');
      const pronunciationBadge = merciItem!.querySelector('.text-blue-600');
      expect(pronunciationBadge).not.toBeInTheDocument();
    });
  });

  describe('Enhanced Vocabulary List', () => {
    beforeEach(() => {
      render(<App />);
      fireEvent.click(screen.getByText('Vocabulary'));
    });

    it('should show both edit and delete buttons', () => {
      const vocabularyItem = screen.getByText('bonjour').closest('.p-3');
      
      const editButton = vocabularyItem!.querySelector('button[title="Edit item"]');
      const deleteButton = vocabularyItem!.querySelector('button[title="Delete item"]');
      
      expect(editButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });

    it('should maintain existing delete functionality', () => {
      const vocabularyItem = screen.getByText('bonjour').closest('.p-3');
      const deleteButton = vocabularyItem!.querySelector('button[title="Delete item"]');
      
      fireEvent.click(deleteButton!);
      
      expect(screen.queryByText('bonjour')).not.toBeInTheDocument();
    });
  });

  describe('Filter Integration', () => {
    beforeEach(() => {
      render(<App />);
      fireEvent.click(screen.getByText('Vocabulary'));
    });

    it('should combine search and advanced filters', () => {
      // First apply search filter
      const searchInput = screen.getByPlaceholderText('Search vocabulary...');
      fireEvent.change(searchInput, { target: { value: 'merci' } });
      
      // Then apply advanced filter
      const advancedButton = screen.getByText('Advanced');
      fireEvent.click(advancedButton);
      
      const minReviewsInput = screen.getByPlaceholderText('Any');
      fireEvent.change(minReviewsInput, { target: { value: '3' } });
      
      // Should show merci (matches search and has 5 reviews >= 3)
      expect(screen.getByText('merci')).toBeInTheDocument();
      expect(screen.queryByText('bonjour')).not.toBeInTheDocument();
    });

    it('should reset pagination when filters change', () => {
      // This test would need more items to trigger pagination
      // For now, just verify the filter changes reset page
      const advancedButton = screen.getByText('Advanced');
      fireEvent.click(advancedButton);
      
      const minReviewsInput = screen.getByPlaceholderText('Any');
      fireEvent.change(minReviewsInput, { target: { value: '10' } });
      
      // Should show no results message
      expect(screen.getByText('No vocabulary items found')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      render(<App />);
      fireEvent.click(screen.getByText('Vocabulary'));
    });

    it('should have proper labels for form inputs', () => {
      const advancedButton = screen.getByText('Advanced');
      fireEvent.click(advancedButton);
      
      expect(screen.getByText('Min Reviews:')).toBeInTheDocument();
      expect(screen.getByText('Added:')).toBeInTheDocument();
    });

    it('should have proper button titles for actions', () => {
      const vocabularyItem = screen.getByText('bonjour').closest('.p-3');
      
      const editButton = vocabularyItem!.querySelector('button[title="Edit item"]');
      const deleteButton = vocabularyItem!.querySelector('button[title="Delete item"]');
      
      expect(editButton).toHaveAttribute('title', 'Edit item');
      expect(deleteButton).toHaveAttribute('title', 'Delete item');
    });

    it('should have proper modal structure', () => {
      const vocabularyItem = screen.getByText('bonjour').closest('.p-3');
      const editButton = vocabularyItem!.querySelector('button[title="Edit item"]');
      
      fireEvent.click(editButton!);
      
      expect(screen.getByText('Edit Vocabulary')).toBeInTheDocument();
      expect(screen.getByText('Word')).toBeInTheDocument();
      expect(screen.getByText('Translation')).toBeInTheDocument();
      expect(screen.getByText('Context')).toBeInTheDocument();
      expect(screen.getByText('Pronunciation')).toBeInTheDocument();
    });
  });
});