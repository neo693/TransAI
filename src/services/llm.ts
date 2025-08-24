/**
 * LLM Integration Service
 * Provides foundation for LLM API communication with support for multiple providers
 */

import type { 
  APIProvider
} from '../types/index.js';

// LLM API Error types
export enum LLMErrorCode {
  INVALID_API_KEY = 'INVALID_API_KEY',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

export class LLMError extends Error {
  constructor(
    public code: LLMErrorCode,
    message: string,
    public provider?: APIProvider,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

// LLM Request/Response interfaces
export interface LLMRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
}

// Provider-specific configurations
export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface OpenAIConfig extends ProviderConfig {
  model?: 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo';
}

export interface AnthropicConfig extends ProviderConfig {
  model?: 'claude-3-haiku-20240307' | 'claude-3-sonnet-20240229' | 'claude-3-opus-20240229';
}

export interface GeminiConfig extends ProviderConfig {
  model?: 'gemini-pro' | 'gemini-pro-vision' | 'gemini-1.5-pro' | 'gemini-1.5-flash';
}

export interface DeepSeekConfig extends ProviderConfig {
  model?: 'deepseek-chat' | 'deepseek-coder';
}

export interface DoubaoConfig extends ProviderConfig {
  model?: 'doubao-lite-4k' | 'doubao-lite-32k' | 'doubao-lite-128k' | 'doubao-pro-4k' | 'doubao-pro-32k' | 'doubao-pro-128k';
}

export interface QwenConfig extends ProviderConfig {
  model?: 'qwen-turbo' | 'qwen-plus' | 'qwen-max' | 'qwen-max-longcontext';
}

export interface CustomConfig extends ProviderConfig {
  headers?: Record<string, string>;
}

// LLM Client interface
export interface ILLMClient {
  validateApiKey(): Promise<boolean>;
  sendRequest(request: LLMRequest): Promise<LLMResponse>;
  getProvider(): APIProvider;
  isConfigured(): boolean;
}

/**
 * Generic LLM Client with support for multiple providers
 */
export class LLMClient implements ILLMClient {
  private config: ProviderConfig;
  private provider: APIProvider;

  constructor(provider: APIProvider, config: ProviderConfig) {
    this.provider = provider;
    this.config = config;
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.apiKey || this.config.apiKey.trim() === '') {
      throw new LLMError(
        LLMErrorCode.INVALID_API_KEY,
        'API key is required',
        this.provider
      );
    }

    // Provider-specific validation
    switch (this.provider) {
      case 'openai':
        if (!this.config.apiKey.startsWith('sk-')) {
          throw new LLMError(
            LLMErrorCode.INVALID_API_KEY,
            'OpenAI API key must start with "sk-"',
            this.provider
          );
        }
        break;
      case 'anthropic':
        if (!this.config.apiKey.startsWith('sk-ant-')) {
          throw new LLMError(
            LLMErrorCode.INVALID_API_KEY,
            'Anthropic API key must start with "sk-ant-"',
            this.provider
          );
        }
        break;
      case 'gemini':
        // Gemini API keys typically start with 'AIza'
        if (!this.config.apiKey.startsWith('AIza')) {
          throw new LLMError(
            LLMErrorCode.INVALID_API_KEY,
            'Gemini API key must start with "AIza"',
            this.provider
          );
        }
        break;
      case 'deepseek':
      case 'doubao':
      case 'qwen':
        // These providers typically use bearer tokens, no specific format validation
        break;
      case 'custom':
        if (!this.config.baseUrl) {
          throw new LLMError(
            LLMErrorCode.VALIDATION_ERROR,
            'Base URL is required for custom provider',
            this.provider
          );
        }
        break;
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const testRequest: LLMRequest = {
        prompt: 'Test connection',
        maxTokens: 5
      };
      
      await this.sendRequest(testRequest);
      return true;
    } catch (error) {
      if (error instanceof LLMError && 
          (error.code === LLMErrorCode.INVALID_API_KEY || 
           error.code === LLMErrorCode.PROVIDER_ERROR)) {
        return false;
      }
      // Other errors might be temporary, so we consider the key potentially valid
      return true;
    }
  }

  async sendRequest(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response = await this.makeAPICall(request);
      return this.parseResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private async makeAPICall(request: LLMRequest): Promise<Response> {
    const { url, headers, body } = this.buildRequest(request);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response || !response.ok) {
      const status = response?.status || 0;
      const statusText = response?.statusText || 'Unknown Error';
      throw new Error(`HTTP ${status}: ${statusText}`);
    }

    return response;
  }

  private buildRequest(request: LLMRequest): {
    url: string;
    headers: Record<string, string>;
    body: any;
  } {
    const baseHeaders = {
      'Content-Type': 'application/json'
    };

    switch (this.provider) {
      case 'openai':
        return {
          url: this.config.baseUrl || 'https://api.openai.com/v1/chat/completions',
          headers: {
            ...baseHeaders,
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: {
            model: this.config.model || 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: request.prompt }],
            max_tokens: request.maxTokens || this.config.maxTokens || 1000,
            temperature: request.temperature ?? this.config.temperature ?? 0.7
          }
        };

      case 'anthropic':
        return {
          url: this.config.baseUrl || 'https://api.anthropic.com/v1/messages',
          headers: {
            ...baseHeaders,
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: {
            model: this.config.model || 'claude-3-haiku-20240307',
            max_tokens: request.maxTokens || this.config.maxTokens || 1000,
            temperature: request.temperature ?? this.config.temperature ?? 0.7,
            messages: [{ role: 'user', content: request.prompt }]
          }
        };

      case 'gemini':
        return {
          url: this.config.baseUrl || `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model || 'gemini-pro'}:generateContent?key=${this.config.apiKey}`,
          headers: baseHeaders,
          body: {
            contents: [{
              parts: [{ text: request.prompt }]
            }],
            generationConfig: {
              maxOutputTokens: request.maxTokens || this.config.maxTokens || 1000,
              temperature: request.temperature ?? this.config.temperature ?? 0.7
            }
          }
        };

      case 'deepseek':
        return {
          url: this.config.baseUrl || 'https://api.deepseek.com/v1/chat/completions',
          headers: {
            ...baseHeaders,
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: {
            model: this.config.model || 'deepseek-chat',
            messages: [{ role: 'user', content: request.prompt }],
            max_tokens: request.maxTokens || this.config.maxTokens || 1000,
            temperature: request.temperature ?? this.config.temperature ?? 0.7
          }
        };

      case 'doubao':
        return {
          url: this.config.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
          headers: {
            ...baseHeaders,
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: {
            model: this.config.model || 'doubao-lite-4k',
            messages: [{ role: 'user', content: request.prompt }],
            max_tokens: request.maxTokens || this.config.maxTokens || 1000,
            temperature: request.temperature ?? this.config.temperature ?? 0.7
          }
        };

      case 'qwen':
        return {
          url: this.config.baseUrl || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
          headers: {
            ...baseHeaders,
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: {
            model: this.config.model || 'qwen-turbo',
            input: {
              messages: [{ role: 'user', content: request.prompt }]
            },
            parameters: {
              max_tokens: request.maxTokens || this.config.maxTokens || 1000,
              temperature: request.temperature ?? this.config.temperature ?? 0.7
            }
          }
        };

      case 'custom':
        const customConfig = this.config as CustomConfig;
        return {
          url: customConfig.baseUrl!,
          headers: {
            ...baseHeaders,
            'Authorization': `Bearer ${this.config.apiKey}`,
            ...(customConfig.headers || {})
          },
          body: {
            prompt: request.prompt,
            max_tokens: request.maxTokens || this.config.maxTokens || 1000,
            temperature: request.temperature ?? this.config.temperature ?? 0.7,
            model: this.config.model
          }
        };

      default:
        throw new LLMError(
          LLMErrorCode.PROVIDER_ERROR,
          `Unsupported provider: ${this.provider}`,
          this.provider
        );
    }
  }

  private async parseResponse(response: Response): Promise<LLMResponse> {
    const data = await response.json();

    switch (this.provider) {
      case 'openai':
      case 'deepseek':
      case 'doubao':
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new LLMError(
            LLMErrorCode.INVALID_RESPONSE,
            `Invalid ${this.provider} response format`,
            this.provider
          );
        }
        return {
          content: data.choices[0].message.content,
          usage: data.usage ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens
          } : undefined,
          model: data.model
        };

      case 'anthropic':
        if (!data.content || !data.content[0] || !data.content[0].text) {
          throw new LLMError(
            LLMErrorCode.INVALID_RESPONSE,
            'Invalid Anthropic response format',
            this.provider
          );
        }
        return {
          content: data.content[0].text,
          usage: data.usage ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens
          } : undefined,
          model: data.model
        };

      case 'gemini':
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
          throw new LLMError(
            LLMErrorCode.INVALID_RESPONSE,
            'Invalid Gemini response format',
            this.provider
          );
        }
        return {
          content: data.candidates[0].content.parts[0].text,
          usage: data.usageMetadata ? {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount
          } : undefined,
          model: this.config.model || 'gemini-pro'
        };

      case 'qwen':
        if (!data.output || !data.output.choices || !data.output.choices[0] || !data.output.choices[0].message) {
          throw new LLMError(
            LLMErrorCode.INVALID_RESPONSE,
            'Invalid Qwen response format',
            this.provider
          );
        }
        return {
          content: data.output.choices[0].message.content,
          usage: data.usage ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: data.usage.total_tokens
          } : undefined,
          model: data.output.choices[0].message.model || this.config.model
        };

      case 'custom':
        // Assume custom provider returns content directly or in a content field
        const content = data.content || data.text || data.response || JSON.stringify(data);
        return {
          content: typeof content === 'string' ? content : JSON.stringify(content),
          model: data.model
        };

      default:
        throw new LLMError(
          LLMErrorCode.PROVIDER_ERROR,
          `Unsupported provider: ${this.provider}`,
          this.provider
        );
    }
  }

  private handleError(error: any): LLMError {
    if (error instanceof LLMError) {
      return error;
    }

    // Network errors (fetch failures)
    if (error instanceof TypeError && (
        error.message.includes('fetch') || 
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError')
      )) {
      return new LLMError(
        LLMErrorCode.NETWORK_ERROR,
        'Network connection failed',
        this.provider
      );
    }

    // HTTP errors
    if (error.message?.includes('HTTP')) {
      const statusMatch = error.message.match(/HTTP (\d+)/);
      const statusCode = statusMatch ? parseInt(statusMatch[1]) : undefined;

      switch (statusCode) {
        case 401:
          return new LLMError(
            LLMErrorCode.INVALID_API_KEY,
            'Invalid API key or unauthorized access',
            this.provider,
            statusCode
          );
        case 429:
          return new LLMError(
            LLMErrorCode.RATE_LIMIT,
            'Rate limit exceeded',
            this.provider,
            statusCode
          );
        case 402:
        case 403:
          return new LLMError(
            LLMErrorCode.QUOTA_EXCEEDED,
            'API quota exceeded or billing issue',
            this.provider,
            statusCode
          );
        default:
          return new LLMError(
            LLMErrorCode.PROVIDER_ERROR,
            `Provider error: ${error.message}`,
            this.provider,
            statusCode
          );
      }
    }

    // Generic error
    return new LLMError(
      LLMErrorCode.PROVIDER_ERROR,
      error.message || 'Unknown error occurred',
      this.provider
    );
  }

  getProvider(): APIProvider {
    return this.provider;
  }

  isConfigured(): boolean {
    try {
      this.validateConfig();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * LLM Client Factory
 */
export class LLMClientFactory {
  static create(provider: APIProvider, config: ProviderConfig): LLMClient {
    return new LLMClient(provider, config);
  }

  static createOpenAI(config: OpenAIConfig): LLMClient {
    return new LLMClient('openai', config);
  }

  static createAnthropic(config: AnthropicConfig): LLMClient {
    return new LLMClient('anthropic', config);
  }

  static createGemini(config: GeminiConfig): LLMClient {
    return new LLMClient('gemini', config);
  }

  static createDeepSeek(config: DeepSeekConfig): LLMClient {
    return new LLMClient('deepseek', config);
  }

  static createDoubao(config: DoubaoConfig): LLMClient {
    return new LLMClient('doubao', config);
  }

  static createQwen(config: QwenConfig): LLMClient {
    return new LLMClient('qwen', config);
  }

  static createCustom(config: CustomConfig): LLMClient {
    return new LLMClient('custom', config);
  }
}