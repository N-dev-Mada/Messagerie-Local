'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { User, Conversation, Message } from '@/lib/types';
import { playMessageSound, showBrowserNotification } from '@/lib/soundUtils';

export interface AttachedFileInfo {
  name: string;
  type: string;
  data: string;
  originalSize?: number;
  compressedSize?: number;
  reductionPercentage?: number;
}

export interface OfflineQueueItem {
  tempId: number;
  conversationId: number;
  senderId: number;
  messageBody: string | null;
  file?: AttachedFileInfo | null;
  replyToId?: number | null;
  createdAt: string;
}

export interface GlobalSearchResult {
  message: Message;
  conversationId: number;
  conversationName: string;
  isGroup: boolean;
  senderName: string;
  matchedText: string;
  createdAt: string;
}

export type ConnectionState = 'connected' | 'reconnecting' | 'offline';

export interface UseChatSyncProps {
  currentUser: User;
  selectedConversationId: number | null;
  soundEnabled: boolean;
  onAutoSelectConversation?: (convId: number) => void;
}

export function useChatSync({
  currentUser,
  selectedConversationId,
  soundEnabled,
}: UseChatSyncProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<number, { userId: number; name: string }>>({});
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);

  // Offline & connection state resilience
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !navigator.onLine;
    }
    return false;
  });
  const [connectionState, setConnectionState] = useState<ConnectionState>(() => {
    if (typeof window !== 'undefined' && !navigator.onLine) {
      return 'offline';
    }
    return 'connected';
  });

  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([]);
  const offlineQueueRef = useRef<OfflineQueueItem[]>([]);
  const isProcessingQueueRef = useRef(false);

  // Sound and notification tracking
  const knownMessageIdsRef = useRef<Set<number>>(new Set());
  const isFirstLoadRef = useRef(true);

  // SSE tracking
  const sseRef = useRef<EventSource | null>(null);
  const sseReconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialScrollRef = useRef(true);

  // Load offline queue on currentUser change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(`messagerie_offline_queue_${currentUser.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setOfflineQueue(parsed);
          offlineQueueRef.current = parsed;
        }
      }
    } catch {}
  }, [currentUser.id]);

  // Persist offline queue to localStorage
  const updateOfflineQueue = useCallback((newQueue: OfflineQueueItem[]) => {
    setOfflineQueue(newQueue);
    offlineQueueRef.current = newQueue;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`messagerie_offline_queue_${currentUser.id}`, JSON.stringify(newQueue));
      } catch {}
    }
  }, [currentUser.id]);

  // Process queued offline messages
  const processOfflineQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || offlineQueueRef.current.length === 0) return;
    isProcessingQueueRef.current = true;

    const currentQueue = [...offlineQueueRef.current];
    const failedQueue: typeof currentQueue = [];

    for (const item of currentQueue) {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sendMessage',
            conversationId: item.conversationId,
            senderId: item.senderId,
            messageBody: item.messageBody,
            file: item.file,
            replyToId: item.replyToId,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.message) {
            setMessages(prev =>
              prev.map(m => (m.id === item.tempId ? { ...data.message, status: 'sent' } : m))
            );
          }
        } else {
          failedQueue.push(item);
        }
      } catch {
        failedQueue.push(item);
        break; // Stop processing if still offline
      }
    }

    updateOfflineQueue(failedQueue);
    isProcessingQueueRef.current = false;

    if (failedQueue.length === 0 && typeof window !== 'undefined' && window.BroadcastChannel) {
      new BroadcastChannel('messagerie_local_sync').postMessage({
        type: 'CONVERSATION_UPDATE',
      });
    }
  }, [updateOfflineQueue]);

  // Fetch full data snapshot
  const refreshData = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`/api/chat?userId=${currentUser.id}&limit=40`);
      if (!res.ok) {
        setIsOffline(true);
        return;
      }
      if (isOffline) {
        setIsOffline(false);
        processOfflineQueue();
      }
      const data = await res.json();
      const newConversations: Conversation[] = data.conversations || [];
      setConversations(newConversations);
      setTypingUsers(data.typing || {});
      setOnlineUsers(data.onlineUsers || []);

      // Check for incoming new messages to trigger sound / browser notification
      const allCurrentMessages: Message[] = [];
      newConversations.forEach(c => {
        if (c.messages) allCurrentMessages.push(...c.messages);
      });

      if (isFirstLoadRef.current) {
        allCurrentMessages.forEach(m => knownMessageIdsRef.current.add(m.id));
        isFirstLoadRef.current = false;
      } else {
        let hasIncomingFromOther = false;
        let latestIncomingMessage: Message | null = null;

        allCurrentMessages.forEach(m => {
          if (!knownMessageIdsRef.current.has(m.id)) {
            knownMessageIdsRef.current.add(m.id);
            if (m.sender_id !== currentUser.id) {
              hasIncomingFromOther = true;
              latestIncomingMessage = m;
            }
          }
        });

        if (hasIncomingFromOther && latestIncomingMessage) {
          if (soundEnabled) {
            playMessageSound();
          }
          const senderName = (latestIncomingMessage as Message).sender?.name || 'Nouveau message';
          const bodyPreview = (latestIncomingMessage as Message).body ||
            ((latestIncomingMessage as Message).file_type?.startsWith('audio/')
              ? '🎤 Message vocal'
              : (latestIncomingMessage as Message).file_name || '📎 Fichier joint');
          showBrowserNotification(`💬 ${senderName}`, bodyPreview);
        }
      }

      if (selectedConversationId) {
        const currentConv = newConversations.find(c => c.id === selectedConversationId);
        if (currentConv && currentConv.messages) {
          const incomingMsgs = currentConv.messages;
          setMessages(prev => {
            // Keep already loaded older messages if present
            if (prev.length > incomingMsgs.length) {
              const prevMap = new Map(prev.map(m => [m.id, m]));
              incomingMsgs.forEach(m => prevMap.set(m.id, m));
              return Array.from(prevMap.values()).sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            }
            return incomingMsgs;
          });
          if (currentConv.hasMore !== undefined) {
            setHasMoreMessages(currentConv.hasMore);
          }
        }
      }
    } catch {
      setIsOffline(true);
    }
  }, [currentUser?.id, selectedConversationId, soundEnabled, isOffline, processOfflineQueue]);

  // Online / Offline window listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setConnectionState('reconnecting');
      processOfflineQueue();
      refreshData();
    };
    const handleOffline = () => {
      setIsOffline(true);
      setConnectionState('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processOfflineQueue, refreshData]);

  // Manual reconnect check
  const triggerManualReconnect = async () => {
    setConnectionState('reconnecting');
    try {
      const res = await fetch(`/api/chat?userId=${currentUser.id}&limit=1`);
      if (res.ok) {
        setIsOffline(false);
        setConnectionState('connected');
        await processOfflineQueue();
        refreshData();
      } else {
        setIsOffline(true);
        setConnectionState('offline');
      }
    } catch {
      setIsOffline(true);
      setConnectionState('offline');
    }
  };

  // Setup persistent Server-Sent Events (SSE) stream with auto-reconnection
  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser?.id) return;

    let isSubscribed = true;

    const connectSSE = () => {
      if (sseRef.current) {
        sseRef.current.close();
      }

      setConnectionState(prev => (prev === 'offline' && !navigator.onLine ? 'offline' : 'reconnecting'));

      const eventSource = new EventSource(`/api/chat/stream?userId=${currentUser.id}`);
      sseRef.current = eventSource;

      eventSource.onopen = () => {
        setIsOffline(false);
        setConnectionState('connected');
        if (offlineQueueRef.current.length > 0) {
          processOfflineQueue();
        }
      };

      eventSource.addEventListener('chat_event', (e: MessageEvent) => {
        if (!isSubscribed) return;
        try {
          const eventData = JSON.parse(e.data);
          // When any chat event arrives, instantly trigger light synchronization
          refreshData();

          // If it's a message created event
          if (eventData.type === 'message_created' && eventData.data?.message) {
            const incomingMsg: Message = eventData.data.message;
            if (incomingMsg.conversation_id === selectedConversationId) {
              setMessages(prev => {
                if (prev.some(m => m.id === incomingMsg.id)) return prev;
                return [...prev, incomingMsg];
              });
            }
          }
        } catch (err) {
          console.error('Failed to parse SSE event:', err);
        }
      });

      eventSource.onerror = () => {
        eventSource.close();
        sseRef.current = null;
        setConnectionState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'reconnecting');
        // Exponential fallback: retry connecting in 4 seconds
        if (isSubscribed) {
          if (sseReconnectTimerRef.current) clearTimeout(sseReconnectTimerRef.current);
          sseReconnectTimerRef.current = setTimeout(connectSSE, 4000);
        }
      };
    };

    connectSSE();

    // Initial snapshot load
    refreshData();

    // Low-frequency heartbeat backup poll (12s instead of 2.5s) to guarantee consistency
    const backupInterval = setInterval(refreshData, 12000);

    return () => {
      isSubscribed = false;
      if (sseReconnectTimerRef.current) clearTimeout(sseReconnectTimerRef.current);
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      clearInterval(backupInterval);
    };
  }, [currentUser?.id, selectedConversationId, refreshData, processOfflineQueue]);

  // Sync via BroadcastChannel for multi-tab instantaneous updates
  useEffect(() => {
    if (typeof window === 'undefined' || !window.BroadcastChannel) return;
    const channel = new BroadcastChannel('messagerie_local_sync');
    channel.onmessage = event => {
      if (event.data?.type === 'NEW_MESSAGE' || event.data?.type === 'CONVERSATION_UPDATE') {
        refreshData();
      }
    };
    return () => channel.close();
  }, [refreshData]);

  // Load earlier messages upwards
  const loadEarlierMessages = async (container: HTMLDivElement | null) => {
    if (
      !selectedConversationId ||
      typeof selectedConversationId !== 'number' ||
      isLoadingEarlier ||
      !hasMoreMessages ||
      messages.length === 0
    ) {
      return;
    }

    if (!container) return;

    const prevScrollHeight = container.scrollHeight;
    const prevScrollTop = container.scrollTop;
    const oldestMessageId = messages[0]?.id;
    if (!oldestMessageId) return;

    setIsLoadingEarlier(true);

    try {
      const res = await fetch(
        `/api/chat?conversationId=${selectedConversationId}&beforeId=${oldestMessageId}&limit=40`
      );
      if (res.ok) {
        const data = await res.json();
        const olderMessages: Message[] = data.messages || [];

        if (olderMessages.length > 0) {
          setMessages(prev => [...olderMessages, ...prev]);
          setHasMoreMessages(Boolean(data.hasMore));

          requestAnimationFrame(() => {
            if (container) {
              const heightDifference = container.scrollHeight - prevScrollHeight;
              container.scrollTop = prevScrollTop + heightDifference;
            }
          });
        } else {
          setHasMoreMessages(false);
        }
      }
    } catch {
      // Ignore network glitch
    } finally {
      setIsLoadingEarlier(false);
    }
  };

  return {
    conversations,
    setConversations,
    messages,
    setMessages,
    hasMoreMessages,
    setHasMoreMessages,
    isLoadingEarlier,
    loadEarlierMessages,
    isInitialScrollRef,
    typingUsers,
    onlineUsers,
    isOffline,
    setIsOffline,
    connectionState,
    offlineQueue,
    offlineQueueRef,
    updateOfflineQueue,
    processOfflineQueue,
    triggerManualReconnect,
    refreshData,
  };
}
