// lib/sseEvents.ts
// Server-Sent Events (SSE) Event Broker for Real-time chat synchronization

export type ChatEventType =
  | 'message_created'
  | 'message_edited'
  | 'message_deleted'
  | 'conversation_updated'
  | 'typing_changed'
  | 'user_registered';

export interface ChatEventPayload {
  type: ChatEventType;
  conversationId?: number;
  messageId?: number;
  userId?: number;
  data?: any;
  timestamp: string;
}

type SSEListener = (event: ChatEventPayload) => void;

class SSEEventEmitter {
  private listeners: Set<SSEListener> = new Set();

  public subscribe(listener: SSEListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public emit(type: ChatEventType, payload: Omit<ChatEventPayload, 'type' | 'timestamp'>) {
    const event: ChatEventPayload = {
      type,
      ...payload,
      timestamp: new Date().toISOString(),
    };
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('SSE listener notification error:', err);
      }
    }
  }

  public get subscriberCount(): number {
    return this.listeners.size;
  }
}

// Global singleton across hot-reloads and API invocations
const globalForSSE = globalThis as unknown as { chatEventEmitter?: SSEEventEmitter };

export const chatEventEmitter = globalForSSE.chatEventEmitter || new SSEEventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForSSE.chatEventEmitter = chatEventEmitter;
}
