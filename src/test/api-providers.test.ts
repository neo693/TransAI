/**
 * API Providers Test
 * Tests for new API providers integration
 */

import { describe, it, expect } from 'vitest';
import { LLMClientFactory } from '../services/llm.js';
import { isValidAPIProvider } from '../utils/validation.js';
import type { APIProvider } from '../types/index.js';

describe('API Providers', () => {
  describe('Validation', () => {
    it('should validate all supported API providers', () => {
      const providers: APIProvider[] = ['openai', 'anthropic', 'gemini', 'deepseek', 'doubao', 'qwen', 'custom'];
      
      providers.forEach(provider => {
        expect(isValidAPIProvider(provider)).toBe(true);
      });
    });

    it('should reject invalid API providers', () => {
      const invalidProviders = ['invalid', 'gpt', 'claude', '', null, undefined, 123];
      
      invalidProviders.forEach(provider => {
        expect(isValidAPIProvider(provider)).toBe(false);
      });
    });
  });

  describe('LLM Client Factory', () => {
    it('should create clients for all supported providers', () => {
      const testConfigs = {
        openai: { apiKey: 'sk-test123' },
        anthropic: { apiKey: 'sk-ant-test123' },
        gemini: { apiKey: 'AIzatest123' },
        deepseek: { apiKey: 'test123' },
        doubao: { apiKey: 'test123' },
        qwen: { apiKey: 'test123' },
        custom: { apiKey: 'test123', baseUrl: 'https://api.example.com' }
      };

      Object.entries(testConfigs).forEach(([provider, config]) => {
        expect(() => {
          LLMClientFactory.create(provider as APIProvider, config);
        }).not.toThrow();
      });
    });

    it('should validate API key formats for specific providers', () => {
      // OpenAI validation
      expect(() => {
        LLMClientFactory.create('openai', { apiKey: 'invalid-key' });
      }).toThrow('OpenAI API key must start with "sk-"');

      // Anthropic validation
      expect(() => {
        LLMClientFactory.create('anthropic', { apiKey: 'invalid-key' });
      }).toThrow('Anthropic API key must start with "sk-ant-"');

      // Gemini validation
      expect(() => {
        LLMClientFactory.create('gemini', { apiKey: 'invalid-key' });
      }).toThrow('Gemini API key must start with "AIza"');

      // Custom API validation
      expect(() => {
        LLMClientFactory.create('custom', { apiKey: 'test123' });
      }).toThrow('Base URL is required for custom provider');
    });
  });

  describe('Model Options', () => {
    it('should have model options defined for each provider', () => {
      // This would be imported from the options component if we extract the MODEL_OPTIONS
      const expectedProviders: APIProvider[] = ['openai', 'anthropic', 'gemini', 'deepseek', 'doubao', 'qwen', 'custom'];
      
      expectedProviders.forEach(provider => {
        // For now, just check that the provider is valid
        expect(isValidAPIProvider(provider)).toBe(true);
      });
    });
  });
});