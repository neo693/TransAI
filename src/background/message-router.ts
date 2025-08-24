// Message routing system for TransAI Browser Extension background service worker

import {
  MessageType,
  type RequestMessage,
  type ResponseMessage,
  type MessageHandler,
  type MessageRouterConfig,
  type ErrorMessage,
  type SuccessMessage
} from '../types/messages';

/**
 * Error class for message routing errors
 */
export class MessageRouterError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MessageRouterError';
  }
}

/**
 * Message router for handling cross-component communication
 */
export class MessageRouter {
  private handlers = new Map<MessageType, MessageHandler>();
  private config: Required<MessageRouterConfig>;
  private pendingMessages = new Map<string, {
    resolve: (value: ResponseMessage) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(config: MessageRouterConfig = {}) {
    this.config = {
      enableLogging: config.enableLogging ?? false,
      timeout: config.timeout ?? 30000, // 30 seconds
      maxRetries: config.maxRetries ?? 3
    };

    this.setupMessageListener();
  }

  /**
   * Register a message handler for a specific message type
   */
  registerHandler<T extends RequestMessage>(
    messageType: MessageType,
    handler: MessageHandler<T>
  ): void {
    if (this.handlers.has(messageType)) {
      throw new MessageRouterError(
        `Handler already registered for message type: ${messageType}`,
        'HANDLER_ALREADY_REGISTERED'
      );
    }

    this.handlers.set(messageType, handler as MessageHandler);
    this.log(`Registered handler for message type: ${messageType}`);
  }

  /**
   * Unregister a message handler
   */
  unregisterHandler(messageType: MessageType): void {
    if (!this.handlers.has(messageType)) {
      throw new MessageRouterError(
        `No handler registered for message type: ${messageType}`,
        'HANDLER_NOT_FOUND'
      );
    }

    this.handlers.delete(messageType);
    this.log(`Unregistered handler for message type: ${messageType}`);
  }

  /**
   * Send a message and wait for response
   */
  async sendMessage(
    message: RequestMessage,
    tabId?: number
  ): Promise<ResponseMessage> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(message.id);
        reject(new MessageRouterError(
          `Message timeout after ${this.config.timeout}ms`,
          'MESSAGE_TIMEOUT',
          { messageId: message.id, messageType: message.type }
        ));
      }, this.config.timeout);

      this.pendingMessages.set(message.id, {
        resolve,
        reject,
        timeout
      });

      // Send message to specific tab or broadcast
      if (tabId) {
        chrome.tabs.sendMessage(tabId, message).catch((error) => {
          this.handleSendError(message.id, error);
        });
      } else {
        chrome.runtime.sendMessage(message).catch((error) => {
          this.handleSendError(message.id, error);
        });
      }

      this.log(`Sent message: ${message.type}`, message);
    });
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(
    message: RequestMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: ResponseMessage) => void
  ): Promise<void> {
    try {
      this.log(`Received message: ${message.type}`, message);

      // Validate message structure
      if (!this.isValidMessage(message)) {
        const errorResponse = this.createErrorResponse(
          'unknown',
          'Invalid message structure',
          'INVALID_MESSAGE_STRUCTURE'
        );
        sendResponse(errorResponse);
        return;
      }

      // Find handler for message type
      const handler = this.handlers.get(message.type);
      if (!handler) {
        const errorResponse = this.createErrorResponse(
          message.id,
          `No handler registered for message type: ${message.type}`,
          'HANDLER_NOT_FOUND'
        );
        sendResponse(errorResponse);
        return;
      }

      // Execute handler
      const response = await handler(message, sender);
      sendResponse(response);
      this.log(`Sent response for message: ${message.type}`, response);

    } catch (error) {
      const errorResponse = this.createErrorResponse(
        message.id || 'unknown',
        error instanceof Error ? error.message : 'Unknown error occurred',
        'HANDLER_ERROR',
        error
      );
      sendResponse(errorResponse);
      this.log(`Error handling message: ${message.type}`, error);
    }
  }

  /**
   * Setup Chrome extension message listener
   */
  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener(
      (message: RequestMessage, sender, sendResponse) => {
        // Handle async response
        this.handleMessage(message, sender, sendResponse);
        return true; // Keep message channel open for async response
      }
    );

    this.log('Message listener setup complete');
  }

  /**
   * Handle message send errors
   */
  private handleSendError(messageId: string, error: any): void {
    const pending = this.pendingMessages.get(messageId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingMessages.delete(messageId);
      pending.reject(new MessageRouterError(
        'Failed to send message',
        'SEND_ERROR',
        error
      ));
    }
  }

  /**
   * Validate message structure
   */
  private isValidMessage(message: any): message is RequestMessage {
    return (
      message &&
      typeof message === 'object' &&
      typeof message.id === 'string' &&
      typeof message.type === 'string' &&
      typeof message.timestamp === 'number' &&
      Object.values(MessageType).includes(message.type)
    );
  }

  /**
   * Create error response message
   */
  private createErrorResponse(
    messageId: string,
    error: string,
    code: string,
    details?: any
  ): ErrorMessage {
    return {
      id: messageId,
      type: MessageType.ERROR,
      timestamp: Date.now(),
      payload: {
        error,
        code,
        details
      }
    };
  }

  /**
   * Create success response message
   */
  createSuccessResponse(
    messageId: string,
    data?: any,
    message?: string
  ): SuccessMessage {
    return {
      id: messageId,
      type: MessageType.SUCCESS,
      timestamp: Date.now(),
      payload: {
        data,
        message
      }
    };
  }

  /**
   * Generate unique message ID
   */
  generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log message if logging is enabled
   */
  private log(message: string, data?: any): void {
    if (this.config.enableLogging) {
      console.log(`[MessageRouter] ${message}`, data || '');
    }
  }

  /**
   * Get registered handlers count
   */
  getHandlersCount(): number {
    return this.handlers.size;
  }

  /**
   * Get registered message types
   */
  getRegisteredTypes(): MessageType[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Clear all handlers
   */
  clearHandlers(): void {
    this.handlers.clear();
    this.log('All handlers cleared');
  }

  /**
   * Cleanup pending messages and timeouts
   */
  cleanup(): void {
    for (const [messageId, pending] of this.pendingMessages) {
      clearTimeout(pending.timeout);
      pending.reject(new MessageRouterError(
        'Message router cleanup',
        'CLEANUP',
        { messageId }
      ));
    }
    this.pendingMessages.clear();
    this.log('Message router cleanup complete');
  }
}

// Singleton instance for background service worker
export const messageRouter = new MessageRouter({
  enableLogging: process.env.NODE_ENV === 'development'
});