/**
 * Unit tests for LLM Integration Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  LLMClient, 
  LLMClientFactory, 
  LLMError, 
  LLMErrorCode,
  type ProviderConfig,
  type OpenAIConfig,
  type AnthropicConfig,
  type CustomConfig,
  type LLMRequest
} from '../services/llm.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('LLMClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor and Configuration Validation', () => {
    it('should create OpenAI client with valid config', () => {
      const config: OpenAIConfig = {
        apiKey: 'sk-test123',
        model: 'gpt-3.5-turbo'
      };

      const client = new LLMClient('openai', config);
      expect(client.getProvider()).toBe('openai');
      expect(client.isConfigured()).toBe(true);
    });

    it('should create Anthropic client with valid config', () => {
      const config: AnthropicConfig = {
        apiKey: 'sk-ant-test123',
        model: 'claude-3-haiku-20240307'
      };

      const client = new LLMClient('anthropic', config);
      expect(client.getProvider()).toBe('anthropic');
      expect(client.isConfigured()).toBe(true);
    });

    it('should create custom client with valid config', () => {
      const config: CustomConfig = {
        apiKey: 'custom-key-123',
        baseUrl: 'https://api.custom.com/v1/chat',
        headers: { 'Custom-Header': 'value' }
      };

      const client = new LLMClient('custom', config);
      expect(client.getProvider()).toBe('custom');
      expect(client.isConfigured()).toBe(true);
    });

    it('should throw error for empty API key', () => {
      const config: ProviderConfig = {
        apiKey: ''
      };

      expect(() => new LLMClient('openai', config)).toThrow(LLMError);
      expect(() => new LLMClient('openai', config)).toThrow('API key is required');
    });

    it('should throw error for invalid OpenAI API key format', () => {
      const config: OpenAIConfig = {
        apiKey: 'invalid-key'
      };

      expect(() => new LLMClient('openai', config)).toThrow(LLMError);
      expect(() => new LLMClient('openai', config)).toThrow('OpenAI API key must start with "sk-"');
    });

    it('should throw error for invalid Anthropic API key format', () => {
      const config: AnthropicConfig = {
        apiKey: 'invalid-key'
      };

      expect(() => new LLMClient('anthropic', config)).toThrow(LLMError);
      expect(() => new LLMClient('anthropic', config)).toThrow('Anthropic API key must start with "sk-ant-"');
    });

    it('should throw error for custom provider without base URL', () => {
      const config: CustomConfig = {
        apiKey: 'custom-key'
      };

      expect(() => new LLMClient('custom', config)).toThrow(LLMError);
      expect(() => new LLMClient('custom', config)).toThrow('Base URL is required for custom provider');
    });
  });

  describe('API Key Validation', () => {
    it('should validate API key successfully', async () => {
      const config: OpenAIConfig = {
        apiKey: 'sk-test123'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Test response' } }]
        })
      });

      const client = new LLMClient('openai', config);
      const isValid = await client.validateApiKey();
      
      expect(isValid).toBe(true);
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it('should return false for invalid API key', async () => {
      const config: OpenAIConfig = {
        apiKey: 'sk-invalid'
      };

      mockFetch.mockRejectedValueOnce(new Error('HTTP 401: Unauthorized'));

      const client = new LLMClient('openai', config);
      const isValid = await client.validateApiKey();
      
      expect(isValid).toBe(false); // Returns false for auth errors
    });
  });

  describe('Request Handling', () => {
    it('should send OpenAI request successfully', async () => {
      const config: OpenAIConfig = {
        apiKey: 'sk-test123',
        model: 'gpt-4'
      };

      const mockResponse = {
        choices: [{ message: { content: 'Translation result' } }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15
        },
        model: 'gpt-4'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const client = new LLMClient('openai', config);
      const request: LLMRequest = {
        prompt: 'Translate: Hello',
        maxTokens: 100,
        temperature: 0.7
      };

      const response = await client.sendRequest(request);

      expect(response.content).toBe('Translation result');
      expect(response.usage?.totalTokens).toBe(15);
      expect(response.model).toBe('gpt-4');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test123',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"model":"gpt-4"')
        })
      );
    });

    it('should send Anthropic request successfully', async () => {
      const config: AnthropicConfig = {
        apiKey: 'sk-ant-test123',
        model: 'claude-3-sonnet-20240229'
      };

      const mockResponse = {
        content: [{ text: 'Translation result' }],
        usage: {
          input_tokens: 10,
          output_tokens: 5
        },
        model: 'claude-3-sonnet-20240229'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const client = new LLMClient('anthropic', config);
      const request: LLMRequest = {
        prompt: 'Translate: Hello',
        maxTokens: 100
      };

      const response = await client.sendRequest(request);

      expect(response.content).toBe('Translation result');
      expect(response.usage?.totalTokens).toBe(15);
      expect(response.model).toBe('claude-3-sonnet-20240229');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'sk-ant-test123',
            'anthropic-version': '2023-06-01'
          })
        })
      );
    });

    it('should send custom provider request successfully', async () => {
      const config: CustomConfig = {
        apiKey: 'custom-key',
        baseUrl: 'https://api.custom.com/v1/chat',
        headers: { 'Custom-Header': 'value' }
      };

      const mockResponse = {
        content: 'Custom translation result'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const client = new LLMClient('custom', config);
      const request: LLMRequest = {
        prompt: 'Translate: Hello'
      };

      const response = await client.sendRequest(request);

      expect(response.content).toBe('Custom translation result');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.custom.com/v1/chat',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Custom-Header': 'value',
            'Authorization': 'Bearer custom-key'
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const config: OpenAIConfig = {
        apiKey: 'sk-test123'
      };

      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const client = new LLMClient('openai', config);
      const request: LLMRequest = { prompt: 'Test' };

      try {
        await client.sendRequest(request);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe(LLMErrorCode.NETWORK_ERROR);
        expect((error as LLMError).message).toBe('Network connection failed');
      }
    });

    it('should handle 401 unauthorized errors', async () => {
      const config: OpenAIConfig = {
        apiKey: 'sk-test123'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as Response);

      const client = new LLMClient('openai', config);
      const request: LLMRequest = { prompt: 'Test' };

      try {
        await client.sendRequest(request);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe(LLMErrorCode.INVALID_API_KEY);
      }
    });

    it('should handle 429 rate limit errors', async () => {
      const config: OpenAIConfig = {
        apiKey: 'sk-test123'
      };

      mockFetch.mockRejectedValueOnce(new Error('HTTP 429: Too Many Requests'));

      const client = new LLMClient('openai', config);
      const request: LLMRequest = { prompt: 'Test' };

      try {
        await client.sendRequest(request);
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe(LLMErrorCode.RATE_LIMIT);
      }
    });

    it('should handle invalid response format', async () => {
      const config: OpenAIConfig = {
        apiKey: 'sk-test123'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' })
      });

      const client = new LLMClient('openai', config);
      const request: LLMRequest = { prompt: 'Test' };

      try {
        await client.sendRequest(request);
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe(LLMErrorCode.INVALID_RESPONSE);
      }
    });
  });

  describe('LLMClientFactory', () => {
    it('should create OpenAI client through factory', () => {
      const config: OpenAIConfig = {
        apiKey: 'sk-test123',
        model: 'gpt-4'
      };

      const client = LLMClientFactory.createOpenAI(config);
      expect(client.getProvider()).toBe('openai');
      expect(client.isConfigured()).toBe(true);
    });

    it('should create Anthropic client through factory', () => {
      const config: AnthropicConfig = {
        apiKey: 'sk-ant-test123',
        model: 'claude-3-haiku-20240307'
      };

      const client = LLMClientFactory.createAnthropic(config);
      expect(client.getProvider()).toBe('anthropic');
      expect(client.isConfigured()).toBe(true);
    });

    it('should create custom client through factory', () => {
      const config: CustomConfig = {
        apiKey: 'custom-key',
        baseUrl: 'https://api.custom.com/v1/chat'
      };

      const client = LLMClientFactory.createCustom(config);
      expect(client.getProvider()).toBe('custom');
      expect(client.isConfigured()).toBe(true);
    });

    it('should create client through generic factory method', () => {
      const config: ProviderConfig = {
        apiKey: 'sk-test123'
      };

      const client = LLMClientFactory.create('openai', config);
      expect(client.getProvider()).toBe('openai');
      expect(client.isConfigured()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle custom provider with alternative response formats', async () => {
      const config: CustomConfig = {
        apiKey: 'custom-key',
        baseUrl: 'https://api.custom.com/v1/chat'
      };

      // Test with 'text' field
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: 'Response with text field' })
      });

      const client = new LLMClient('custom', config);
      let response = await client.sendRequest({ prompt: 'Test' });
      expect(response.content).toBe('Response with text field');

      // Test with 'response' field
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'Response with response field' })
      });

      response = await client.sendRequest({ prompt: 'Test' });
      expect(response.content).toBe('Response with response field');

      // Test with no recognized field (should stringify)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ unknown: 'field' })
      });

      response = await client.sendRequest({ prompt: 'Test' });
      expect(response.content).toBe('{"unknown":"field"}');
    });

    it('should use default values when optional parameters are not provided', async () => {
      const config: OpenAIConfig = {
        apiKey: 'sk-test123'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Test response' } }]
        })
      });

      const client = new LLMClient('openai', config);
      await client.sendRequest({ prompt: 'Test' });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      
      expect(body.model).toBe('gpt-3.5-turbo'); // Default model
      expect(body.max_tokens).toBe(1000); // Default max tokens
      expect(body.temperature).toBe(0.7); // Default temperature
    });
  });
});