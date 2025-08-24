// Unit tests for MessageRouter

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { MessageRouter, MessageRouterError } from '../background/message-router.js';
import { MessageType, type RequestMessage, type ResponseMessage } from '../types/messages.js';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    onMessage: {
      addListener: vi.fn()
    },
    sendMessage: vi.fn()
  },
  tabs: {
    sendMessage: vi.fn()
  }
};

// @ts-ignore
global.chrome = mockChrome;

describe('MessageRouter', () => {
  let router: MessageRouter;
  let mockHandler: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    router = new MessageRouter({ enableLogging: false });
    mockHandler = vi.fn();
  });

  afterEach(() => {
    router.cleanup();
  });

  describe('Handler Registration', () => {
    it('should register a message handler', () => {
      router.registerHandler(MessageType.TRANSLATE_TEXT, mockHandler);
      
      expect(router.getHandlersCount()).toBe(1);
      expect(router.getRegisteredTypes()).toContain(MessageType.TRANSLATE_TEXT);
    });

    it('should throw error when registering duplicate handler', () => {
      router.registerHandler(MessageType.TRANSLATE_TEXT, mockHandler);
      
      expect(() => {
        router.registerHandler(MessageType.TRANSLATE_TEXT, mockHandler);
      }).toThrow(MessageRouterError);
    });

    it('should unregister a message handler', () => {
      router.registerHandler(MessageType.TRANSLATE_TEXT, mockHandler);
      router.unregisterHandler(MessageType.TRANSLATE_TEXT);
      
      expect(router.getHandlersCount()).toBe(0);
      expect(router.getRegisteredTypes()).not.toContain(MessageType.TRANSLATE_TEXT);
    });

    it('should throw error when unregistering non-existent handler', () => {
      expect(() => {
        router.unregisterHandler(MessageType.TRANSLATE_TEXT);
      }).toThrow(MessageRouterError);
    });

    it('should clear all handlers', () => {
      router.registerHandler(MessageType.TRANSLATE_TEXT, mockHandler);
      router.registerHandler(MessageType.ADD_TO_VOCABULARY, mockHandler);
      
      router.clearHandlers();
      
      expect(router.getHandlersCount()).toBe(0);
    });
  });

  describe('Message Validation', () => {
    it('should validate correct message structure', () => {
      const validMessage: RequestMessage = {
        id: 'test-id',
        type: MessageType.TRANSLATE_TEXT,
        timestamp: Date.now(),
        payload: {
          text: 'Hello',
          options: {
            targetLanguage: 'es',
            includeExamples: true
          }
        }
      };

      // Access private method for testing
      const isValid = (router as any).isValidMessage(validMessage);
      expect(isValid).toBe(true);
    });

    it('should reject invalid message structure', () => {
      const invalidMessages = [
        null,
        undefined,
        {},
        { id: 'test' },
        { id: 'test', type: 'INVALID_TYPE' },
        { id: 'test', type: MessageType.TRANSLATE_TEXT },
        { id: 123, type: MessageType.TRANSLATE_TEXT, timestamp: Date.now() }
      ];

      invalidMessages.forEach(message => {
        const isValid = (router as any).isValidMessage(message);
        expect(isValid).toBeFalsy();
      });
    });
  });

  describe('Message Handling', () => {
    it('should handle valid message with registered handler', async () => {
      const mockResponse: ResponseMessage = {
        id: 'test-id',
        type: MessageType.SUCCESS,
        timestamp: Date.now(),
        payload: { message: 'Success' }
      };

      mockHandler.mockResolvedValue(mockResponse);
      router.registerHandler(MessageType.TRANSLATE_TEXT, mockHandler);

      const message: RequestMessage = {
        id: 'test-id',
        type: MessageType.TRANSLATE_TEXT,
        timestamp: Date.now(),
        payload: {
          text: 'Hello',
          options: {
            targetLanguage: 'es',
            includeExamples: true
          }
        }
      };

      const sendResponse = vi.fn();
      const sender = {} as chrome.runtime.MessageSender;

      await (router as any).handleMessage(message, sender, sendResponse);

      expect(mockHandler).toHaveBeenCalledWith(message, sender);
      expect(sendResponse).toHaveBeenCalledWith(mockResponse);
    });

    it('should handle message with no registered handler', async () => {
      const message: RequestMessage = {
        id: 'test-id',
        type: MessageType.TRANSLATE_TEXT,
        timestamp: Date.now(),
        payload: {
          text: 'Hello',
          options: {
            targetLanguage: 'es',
            includeExamples: true
          }
        }
      };

      const sendResponse = vi.fn();
      const sender = {} as chrome.runtime.MessageSender;

      await (router as any).handleMessage(message, sender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.ERROR,
          payload: expect.objectContaining({
            code: 'HANDLER_NOT_FOUND'
          })
        })
      );
    });

    it('should handle handler errors', async () => {
      const error = new Error('Handler failed');
      mockHandler.mockRejectedValue(error);
      router.registerHandler(MessageType.TRANSLATE_TEXT, mockHandler);

      const message: RequestMessage = {
        id: 'test-id',
        type: MessageType.TRANSLATE_TEXT,
        timestamp: Date.now(),
        payload: {
          text: 'Hello',
          options: {
            targetLanguage: 'es',
            includeExamples: true
          }
        }
      };

      const sendResponse = vi.fn();
      const sender = {} as chrome.runtime.MessageSender;

      await (router as any).handleMessage(message, sender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.ERROR,
          payload: expect.objectContaining({
            error: 'Handler failed',
            code: 'HANDLER_ERROR'
          })
        })
      );
    });

    it('should handle invalid message structure', async () => {
      const invalidMessage = {
        id: 123,
        type: 'INVALID'
      };

      const sendResponse = vi.fn();
      const sender = {} as chrome.runtime.MessageSender;

      await (router as any).handleMessage(invalidMessage, sender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.ERROR,
          payload: expect.objectContaining({
            code: 'INVALID_MESSAGE_STRUCTURE'
          })
        })
      );
    });
  });

  describe('Message Sending', () => {
    it('should send message via runtime API', () => {
      const message: RequestMessage = {
        id: 'test-id',
        type: MessageType.TRANSLATE_TEXT,
        timestamp: Date.now(),
        payload: {
          text: 'Hello',
          options: {
            targetLanguage: 'es',
            includeExamples: true
          }
        }
      };

      mockChrome.runtime.sendMessage.mockResolvedValue(undefined);

      // Start the message but don't await to avoid timeout
      router.sendMessage(message).catch(() => {
        // Ignore cleanup errors
      });
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(message);
    });

    it('should send message to specific tab', () => {
      const message: RequestMessage = {
        id: 'test-id',
        type: MessageType.TRANSLATE_TEXT,
        timestamp: Date.now(),
        payload: {
          text: 'Hello',
          options: {
            targetLanguage: 'es',
            includeExamples: true
          }
        }
      };

      const tabId = 123;
      mockChrome.tabs.sendMessage.mockResolvedValue(undefined);

      // Start the message but don't await to avoid timeout
      router.sendMessage(message, tabId).catch(() => {
        // Ignore cleanup errors
      });
      
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(tabId, message);
    });

    it('should handle send errors', async () => {
      const message: RequestMessage = {
        id: 'test-id',
        type: MessageType.TRANSLATE_TEXT,
        timestamp: Date.now(),
        payload: {
          text: 'Hello',
          options: {
            targetLanguage: 'es',
            includeExamples: true
          }
        }
      };

      const error = new Error('Send failed');
      mockChrome.runtime.sendMessage.mockRejectedValue(error);

      await expect(router.sendMessage(message)).rejects.toThrow(MessageRouterError);
    });
  });

  describe('Utility Methods', () => {
    it('should generate unique message IDs', () => {
      const id1 = router.generateMessageId();
      const id2 = router.generateMessageId();
      
      expect(id1).toMatch(/^msg_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^msg_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should create success response', () => {
      const response = router.createSuccessResponse('test-id', { data: 'test' }, 'Success');
      
      expect(response).toEqual({
        id: 'test-id',
        type: MessageType.SUCCESS,
        timestamp: expect.any(Number),
        payload: {
          data: { data: 'test' },
          message: 'Success'
        }
      });
    });

    it('should create error response', () => {
      const response = (router as any).createErrorResponse(
        'test-id',
        'Test error',
        'TEST_ERROR',
        { detail: 'test' }
      );
      
      expect(response).toEqual({
        id: 'test-id',
        type: MessageType.ERROR,
        timestamp: expect.any(Number),
        payload: {
          error: 'Test error',
          code: 'TEST_ERROR',
          details: { detail: 'test' }
        }
      });
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const defaultRouter = new MessageRouter();
      
      expect((defaultRouter as any).config).toEqual({
        enableLogging: false,
        timeout: 30000,
        maxRetries: 3
      });
      
      defaultRouter.cleanup();
    });

    it('should use custom configuration', () => {
      const customRouter = new MessageRouter({
        enableLogging: true,
        timeout: 5000,
        maxRetries: 1
      });
      
      expect((customRouter as any).config).toEqual({
        enableLogging: true,
        timeout: 5000,
        maxRetries: 1
      });
      
      customRouter.cleanup();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup pending messages', async () => {
      const message: RequestMessage = {
        id: 'test-id',
        type: MessageType.TRANSLATE_TEXT,
        timestamp: Date.now(),
        payload: {
          text: 'Hello',
          options: {
            targetLanguage: 'es',
            includeExamples: true
          }
        }
      };

      // Start a message that will be pending
      const promise = router.sendMessage(message);
      
      // Cleanup should reject pending messages
      router.cleanup();
      
      await expect(promise).rejects.toThrow(MessageRouterError);
    });
  });
});