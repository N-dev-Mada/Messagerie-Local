'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Conversation, Message } from '@/lib/types';
import { compressImage, formatBytes } from '@/lib/imageUtils';
import EmojiPicker from '@/components/EmojiPicker';
import VoiceRecorder from '@/components/VoiceRecorder';
import AudioMessagePlayer from '@/components/AudioMessagePlayer';
import { playMessageSound, requestNotificationPermission, showBrowserNotification } from '@/lib/soundUtils';
import {
  Users,
  Search,
  Paperclip,
  Send,
  ArrowLeft,
  FileText,
  Download,
  Check,
  CheckCheck,
  Smartphone,
  X,
  Smile,
  Loader2,
  Image as ImageIcon,
  Reply,
  Volume2,
  VolumeX,
  Bell,
  BellRing,
  Mic,
  Pencil,
  Trash2,
  MoreVertical,
  Info,
  Clock,
  Wifi,
  WifiOff,
  MessageSquare,
  QrCode,
} from 'lucide-react';
import { ConversationInfoDrawer } from '@/components/ConversationInfoDrawer';
import { DeleteMessageModal } from '@/components/DeleteMessageModal';
import { MediaLightboxModal } from '@/components/MediaLightboxModal';
import { MobileConnectModal } from '@/components/MobileConnectModal';

interface ChatComponentProps {
  currentUser: User;
  allUsers: User[];
  onOpenMobileConnect?: () => void;
}

interface AttachedFileInfo {
  name: string;
  type: string;
  data: string;
  originalSize?: number;
  compressedSize?: number;
  reductionPercentage?: number;
}

export default function ChatComponent({ currentUser, allUsers, onOpenMobileConnect }: ChatComponentProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageBody, setNewMessageBody] = useState('');
  const [attachedFile, setAttachedFile] = useState<AttachedFileInfo | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Phase 2 states: replies, voice recorder, audio & web notifications
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const knownMessageIdsRef = useRef<Set<number>>(new Set());
  const isFirstLoadRef = useRef(true);

  // Phase 3 states: Info drawer, message edit/delete, lightbox, context menu
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [deleteModalMessage, setDeleteModalMessage] = useState<Message | null>(null);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<number | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; name?: string } | null>(null);

  // Phase 4 states: Offline resilience, mobile QR connect, global message search
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !navigator.onLine;
    }
    return false;
  });
  const [offlineQueue, setOfflineQueue] = useState<Array<{
    tempId: number;
    conversationId: number;
    senderId: number;
    messageBody: string | null;
    file?: AttachedFileInfo | null;
    replyToId?: number | null;
    createdAt: string;
  }>>([]);
  const offlineQueueRef = useRef<typeof offlineQueue>([]);
  const isProcessingQueueRef = useRef(false);

  // Global search in messages
  const [searchedMessages, setSearchedMessages] = useState<Array<{
    message: Message;
    conversationId: number;
    conversationName: string;
    isGroup: boolean;
    senderName: string;
    matchedText: string;
    createdAt: string;
  }>>([]);
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [isLocalMobileModalOpen, setIsLocalMobileModalOpen] = useState(false);

  // Pagination states
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  const isInitialScrollRef = useRef(true);

  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState<Record<number, { userId: number; name: string }>>({});
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Save offline queue whenever it changes
  const updateOfflineQueue = useCallback((newQueue: typeof offlineQueue) => {
    setOfflineQueue(newQueue);
    offlineQueueRef.current = newQueue;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`messagerie_offline_queue_${currentUser.id}`, JSON.stringify(newQueue));
      } catch {}
    }
  }, [currentUser.id]);

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationsAllowed(Notification.permission === 'granted');
    }
  }, []);

  // Close message dropdown on click outside
  useEffect(() => {
    const handleGlobalClick = () => setActiveMenuMessageId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleToggleNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotificationsAllowed(perm === 'granted');
    if (perm === 'granted') {
      playMessageSound();
    }
  };

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
        break; // stop processing if still offline
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

  // Network offline / online event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      processOfflineQueue();
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processOfflineQueue]);

  // Manual reconnect check
  const triggerManualReconnect = async () => {
    try {
      const res = await fetch(`/api/chat?userId=${currentUser.id}&limit=1`);
      if (res.ok) {
        setIsOffline(false);
        await processOfflineQueue();
        refreshData();
      }
    } catch {
      setIsOffline(true);
    }
  };

  // Debounced search across messages
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchedMessages([]);
      setIsSearchingMessages(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingMessages(true);
      try {
        const res = await fetch(`/api/chat?search=${encodeURIComponent(q)}&userId=${currentUser.id}`);
        if (res.ok) {
          const data = await res.json();
          setSearchedMessages(data.results || []);
        }
      } catch {
        // Quietly handle search failure
      } finally {
        setIsSearchingMessages(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUser.id]);

  // Fetch current conversations & active state with sound & notification triggers
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

  // Initial load & polling interval (every 2.5s)
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 2500);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Sync via BroadcastChannel for instant multi-tab responses in the browser
  useEffect(() => {
    if (typeof window === 'undefined' || !window.BroadcastChannel) return;
    const channel = new BroadcastChannel('messagerie_local_sync');
    channel.onmessage = (event) => {
      if (event.data?.type === 'NEW_MESSAGE' || event.data?.type === 'CONVERSATION_UPDATE') {
        refreshData();
      }
    };
    return () => channel.close();
  }, [refreshData]);

  // Scroll to bottom on conversation change or when sending new messages
  useEffect(() => {
    if (isInitialScrollRef.current && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      isInitialScrollRef.current = false;
    }
  }, [messages]);

  // Jump directly to message from search
  const handleJumpToMessage = async (convId: number, messageId: number) => {
    await handleSelectConversation(convId);
    setSearchQuery('');
    setHighlightedMessageId(messageId);

    setTimeout(() => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 350);

    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 4000);
  };

  // Select conversation & mark as read
  const handleSelectConversation = async (convId: number) => {
    if (!convId) return;
    setSelectedConversationId(convId);
    setShowEmojiPicker(false);
    setReplyingToMessage(null);
    setIsVoiceRecording(false);
    setIsInfoDrawerOpen(false);
    setEditingMessage(null);
    setDeleteModalMessage(null);
    setActiveMenuMessageId(null);
    isInitialScrollRef.current = true;

    const conv = conversations.find(c => c.id === convId);
    if (conv && conv.messages) {
      setMessages(conv.messages);
      setHasMoreMessages(Boolean(conv.hasMore));
    }

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markAsRead',
          conversationId: convId,
          userId: currentUser.id,
        }),
      });
      refreshData();
      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        new BroadcastChannel('messagerie_local_sync').postMessage({
          type: 'CONVERSATION_UPDATE',
          conversationId: convId,
        });
      }
    } catch {
      // Ignore
    }
  };

  // Load earlier messages dynamically without losing scroll position
  const loadEarlierMessages = async () => {
    if (!selectedConversationId || typeof selectedConversationId !== 'number' || isLoadingEarlier || !hasMoreMessages || messages.length === 0) {
      return;
    }

    const container = messagesContainerRef.current;
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
          // Prepend older messages
          setMessages(prev => [...olderMessages, ...prev]);
          setHasMoreMessages(Boolean(data.hasMore));

          // Restore scroll position after DOM update to prevent any jump
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
      // Quietly ignore transient network glitches
    } finally {
      setIsLoadingEarlier(false);
    }
  };

  // Scroll handler for infinite scroll upwards
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (container.scrollTop < 60 && hasMoreMessages && !isLoadingEarlier) {
      loadEarlierMessages();
    }
  };

  // Start 1-on-1 conversation
  const handleStartConversation = async (targetUserId: number) => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'startConversation',
          userId: currentUser.id,
          targetUserId,
        }),
      });
      const data = await res.json();
      if (data.conversation) {
        setSearchQuery('');
        await refreshData();
        handleSelectConversation(data.conversation.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Group creation
  const toggleGroupMode = () => {
    setIsCreatingGroup(!isCreatingGroup);
    setGroupName('');
    setSelectedParticipants([]);
  };

  const handleToggleParticipant = (userId: number) => {
    if (selectedParticipants.includes(userId)) {
      setSelectedParticipants(selectedParticipants.filter(id => id !== userId));
    } else {
      setSelectedParticipants([...selectedParticipants, userId]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedParticipants.length === 0) return;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createGroup',
          name: groupName.trim(),
          creatorId: currentUser.id,
          participantIds: selectedParticipants,
        }),
      });
      const data = await res.json();
      if (data.group) {
        setIsCreatingGroup(false);
        setGroupName('');
        setSelectedParticipants([]);
        await refreshData();
        handleSelectConversation(data.group.id);

        if (typeof window !== 'undefined' && window.BroadcastChannel) {
          new BroadcastChannel('messagerie_local_sync').postMessage({ type: 'CONVERSATION_UPDATE' });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Client-side image compression & file handling
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if image for canvas WebP compression
    if (file.type.startsWith('image/')) {
      setIsCompressing(true);
      try {
        const compressed = await compressImage(file, 1920, 1920, 0.82);
        setAttachedFile({
          name: compressed.name,
          type: compressed.type,
          data: compressed.data,
          originalSize: compressed.originalSize,
          compressedSize: compressed.compressedSize,
          reductionPercentage: compressed.reductionPercentage,
        });
      } catch (err) {
        console.warn('Canvas compression failed, falling back to raw reader', err);
        const reader = new FileReader();
        reader.onload = () => {
          setAttachedFile({
            name: file.name,
            type: file.type || 'image/jpeg',
            data: reader.result as string,
            originalSize: file.size,
          });
        };
        reader.readAsDataURL(file);
      } finally {
        setIsCompressing(false);
      }
    } else {
      // Standard documents, PDFs, zips
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedFile({
          name: file.name,
          type: file.type || 'application/octet-stream',
          data: reader.result as string,
          originalSize: file.size,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Insert emoji at cursor or append
  const handleSelectEmoji = (emojiChar: string) => {
    const input = messageInputRef.current;
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const updated = newMessageBody.slice(0, start) + emojiChar + newMessageBody.slice(end);
      setNewMessageBody(updated);

      // Restore focus and move cursor after inserted emoji
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + emojiChar.length, start + emojiChar.length);
      }, 10);
    } else {
      setNewMessageBody(prev => prev + emojiChar);
    }
  };

  // Typing signal
  const handleTypingInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessageBody(e.target.value);
    if (!selectedConversationId) return;

    if (!typingTimeoutRef.current) {
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setTyping',
          conversationId: selectedConversationId,
          userId: currentUser.id,
          userName: currentUser.name,
          isTyping: true,
        }),
      }).catch(() => {});
    } else {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setTyping',
          conversationId: selectedConversationId,
          userId: currentUser.id,
          userName: currentUser.name,
          isTyping: false,
        }),
      }).catch(() => {});
    }, 2000);
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMessage) {
      handleSaveEditedMessage();
      return;
    }
    if ((!newMessageBody.trim() && !attachedFile) || !selectedConversationId) return;

    const currentText = newMessageBody;
    const currentFile = attachedFile;
    const replyId = replyingToMessage?.id || null;

    // Clear input fields immediately for snappy UI
    setNewMessageBody('');
    setAttachedFile(null);
    setReplyingToMessage(null);
    setShowEmojiPicker(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const tempId = -Date.now();
    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: selectedConversationId,
      sender_id: currentUser.id,
      sender: currentUser,
      body: currentText || null,
      file_path: currentFile?.data || null,
      file_type: currentFile?.type || null,
      file_name: currentFile?.name || null,
      reply_to_id: replyId,
      reply_to: replyingToMessage
        ? {
            id: replyingToMessage.id,
            sender_name: replyingToMessage.sender?.name || 'Contact',
            body: replyingToMessage.body,
            file_name: replyingToMessage.file_name,
            file_type: replyingToMessage.file_type,
          }
        : null,
      is_read: false,
      status: 'pending',
      is_offline_queued: true,
      created_at: new Date().toISOString(),
    };

    const queueItem = {
      tempId,
      conversationId: selectedConversationId,
      senderId: currentUser.id,
      messageBody: currentText,
      file: currentFile,
      replyToId: replyId,
      createdAt: optimisticMsg.created_at,
    };

    if (isOffline) {
      setMessages(prev => [...prev, optimisticMsg]);
      updateOfflineQueue([...offlineQueueRef.current, queueItem]);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
      return;
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendMessage',
          conversationId: selectedConversationId,
          senderId: currentUser.id,
          messageBody: currentText,
          file: currentFile,
          replyToId: replyId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
          refreshData();

          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 50);

          if (typeof window !== 'undefined' && window.BroadcastChannel) {
            new BroadcastChannel('messagerie_local_sync').postMessage({
              type: 'NEW_MESSAGE',
              conversationId: selectedConversationId,
            });
          }
        }
      } else {
        setMessages(prev => [...prev, optimisticMsg]);
        updateOfflineQueue([...offlineQueueRef.current, queueItem]);
        setIsOffline(true);
      }
    } catch {
      setMessages(prev => [...prev, optimisticMsg]);
      updateOfflineQueue([...offlineQueueRef.current, queueItem]);
      setIsOffline(true);
    }
  };

  // Save edited message
  const handleSaveEditedMessage = async () => {
    if (!editingMessage || !newMessageBody.trim()) return;
    const msgId = editingMessage.id;
    const newBody = newMessageBody.trim();

    // Optimistic update
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, body: newBody, is_edited: true } : m))
    );
    setEditingMessage(null);
    setNewMessageBody('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'editMessage',
          messageId: msgId,
          userId: currentUser.id,
          newBody,
        }),
      });
      if (res.ok) {
        refreshData();
        if (typeof window !== 'undefined' && window.BroadcastChannel) {
          new BroadcastChannel('messagerie_local_sync').postMessage({
            type: 'CONVERSATION_UPDATE',
            conversationId: selectedConversationId,
          });
        }
      }
    } catch (err) {
      console.error('Failed to edit message', err);
    }
  };

  // Delete message handler
  const handleDeleteMessage = async (messageId: number, deleteFor: 'me' | 'everyone') => {
    setDeleteModalMessage(null);
    // Optimistic update
    if (deleteFor === 'me') {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } else {
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? {
                ...m,
                is_deleted_for_all: true,
                body: '🚫 Ce message a été supprimé',
                file_path: null,
                file_type: null,
                file_name: null,
                reply_to: null,
                reply_to_id: null,
              }
            : m
        )
      );
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteMessage',
          messageId,
          userId: currentUser.id,
          deleteFor,
        }),
      });
      if (res.ok) {
        refreshData();
        if (typeof window !== 'undefined' && window.BroadcastChannel) {
          new BroadcastChannel('messagerie_local_sync').postMessage({
            type: 'CONVERSATION_UPDATE',
            conversationId: selectedConversationId,
          });
        }
      }
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  };

  // Group management handlers
  const handleAddGroupMember = async (memberId: number) => {
    if (!selectedConversationId) return;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addGroupMember',
          conversationId: selectedConversationId,
          userId: currentUser.id,
          memberId,
        }),
      });
      if (res.ok) {
        await refreshData();
        if (typeof window !== 'undefined' && window.BroadcastChannel) {
          new BroadcastChannel('messagerie_local_sync').postMessage({
            type: 'CONVERSATION_UPDATE',
            conversationId: selectedConversationId,
          });
        }
      }
    } catch (err) {
      console.error('Failed to add group member', err);
    }
  };

  const handleRemoveGroupMember = async (memberId: number) => {
    if (!selectedConversationId) return;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'removeGroupMember',
          conversationId: selectedConversationId,
          userId: currentUser.id,
          memberId,
        }),
      });
      if (res.ok) {
        await refreshData();
        if (typeof window !== 'undefined' && window.BroadcastChannel) {
          new BroadcastChannel('messagerie_local_sync').postMessage({
            type: 'CONVERSATION_UPDATE',
            conversationId: selectedConversationId,
          });
        }
      }
    } catch (err) {
      console.error('Failed to remove group member', err);
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedConversationId) return;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leaveGroup',
          conversationId: selectedConversationId,
          userId: currentUser.id,
        }),
      });
      if (res.ok) {
        setIsInfoDrawerOpen(false);
        setSelectedConversationId(null);
        await refreshData();
        if (typeof window !== 'undefined' && window.BroadcastChannel) {
          new BroadcastChannel('messagerie_local_sync').postMessage({
            type: 'CONVERSATION_UPDATE',
            conversationId: selectedConversationId,
          });
        }
      }
    } catch (err) {
      console.error('Failed to leave group', err);
    }
  };

  const handleOpenLightbox = (url: string, name?: string) => {
    setLightboxMedia({ url, name });
  };

  // Send audio voice message
  const handleSendVoice = async (audioData: string, durationSeconds: number) => {
    if (!selectedConversationId) return;
    const replyId = replyingToMessage?.id || null;
    setIsVoiceRecording(false);
    setReplyingToMessage(null);

    const tempId = -Date.now();
    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: selectedConversationId,
      sender_id: currentUser.id,
      sender: currentUser,
      body: null,
      file_path: audioData,
      file_type: 'audio/webm',
      file_name: `vocal-${Math.round(durationSeconds)}s.webm`,
      reply_to_id: replyId,
      reply_to: replyingToMessage
        ? {
            id: replyingToMessage.id,
            sender_name: replyingToMessage.sender?.name || 'Contact',
            body: replyingToMessage.body,
            file_name: replyingToMessage.file_name,
            file_type: replyingToMessage.file_type,
          }
        : null,
      is_read: false,
      status: 'pending',
      is_offline_queued: true,
      created_at: new Date().toISOString(),
    };

    const queueItem = {
      tempId,
      conversationId: selectedConversationId,
      senderId: currentUser.id,
      messageBody: null,
      file: {
        data: audioData,
        type: 'audio/webm',
        name: `vocal-${Math.round(durationSeconds)}s.webm`,
      },
      replyToId: replyId,
      createdAt: optimisticMsg.created_at,
    };

    if (isOffline) {
      setMessages(prev => [...prev, optimisticMsg]);
      updateOfflineQueue([...offlineQueueRef.current, queueItem]);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
      return;
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendMessage',
          conversationId: selectedConversationId,
          senderId: currentUser.id,
          messageBody: null,
          file: {
            data: audioData,
            type: 'audio/webm',
            name: `vocal-${Math.round(durationSeconds)}s.webm`,
          },
          replyToId: replyId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
          refreshData();

          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 50);

          if (typeof window !== 'undefined' && window.BroadcastChannel) {
            new BroadcastChannel('messagerie_local_sync').postMessage({
              type: 'NEW_MESSAGE',
              conversationId: selectedConversationId,
            });
          }
        }
      } else {
        setMessages(prev => [...prev, optimisticMsg]);
        updateOfflineQueue([...offlineQueueRef.current, queueItem]);
        setIsOffline(true);
      }
    } catch {
      setMessages(prev => [...prev, optimisticMsg]);
      updateOfflineQueue([...offlineQueueRef.current, queueItem]);
      setIsOffline(true);
    }
  };

  // Selected conversation details
  const selectedConv = conversations.find(c => c.id === selectedConversationId);
  const isGroup = selectedConv?.is_group ?? false;
  const chatName = selectedConv
    ? isGroup
      ? selectedConv.name
      : selectedConv.user_one_id === currentUser.id
      ? selectedConv.userTwo?.name || 'Contact'
      : selectedConv.userOne?.name || 'Contact'
    : '';

  const receiverId = selectedConv && !isGroup
    ? selectedConv.user_one_id === currentUser.id
      ? selectedConv.user_two_id
      : selectedConv.user_one_id
    : null;

  const isReceiverOnline = receiverId ? onlineUsers.includes(receiverId) : false;
  const currentTyping = selectedConversationId ? typingUsers[selectedConversationId] : null;

  // Search filter
  const searchResults = searchQuery.trim()
    ? allUsers.filter(
        u =>
          u.id !== currentUser.id &&
          (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const filteredConversations = searchQuery.trim()
    ? conversations.filter(c => {
        const name = c.is_group
          ? c.name
          : c.user_one_id === currentUser.id
          ? c.userTwo?.name
          : c.userOne?.name;
        return name?.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : [];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#efeae2] font-sans antialiased select-none rounded-xl overflow-hidden shadow-lg border border-gray-200/80">
      {/* Offline Status Banner */}
      {isOffline && (
        <div className="bg-amber-600 text-white px-4 py-2 flex items-center justify-between text-xs shadow-sm z-30 transition-all">
          <div className="flex items-center space-x-2 font-medium truncate">
            <WifiOff className="w-4 h-4 animate-pulse flex-shrink-0" />
            <span className="truncate">
              Mode hors-ligne — Reconnexion en cours... Vos messages sont mis en attente (🕒) et partiront dès le rétablissement du réseau.
            </span>
            {offlineQueue.length > 0 && (
              <span className="bg-white/25 px-2 py-0.5 rounded-full font-bold text-[11px] flex-shrink-0">
                {offlineQueue.length} en attente
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={triggerManualReconnect}
            className="px-2.5 py-1 bg-white text-amber-900 font-bold rounded-lg hover:bg-amber-50 transition cursor-pointer text-[11px] shadow-2xs flex-shrink-0 ml-2"
          >
            Tester la connexion
          </button>
        </div>
      )}

      <div className="flex flex-row flex-1 h-full min-h-0 overflow-hidden">
        {/* ----------------- SIDEBAR CONVERSATIONS ----------------- */}
        <div
          className={`${
            selectedConversationId ? 'hidden md:flex' : 'flex'
          } flex-col w-full md:w-80 lg:w-96 flex-shrink-0 h-full bg-white border-r border-gray-200`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-[#008069] text-white flex items-center justify-between shadow-xs">
            <h1 className="text-xl font-bold tracking-wide">Messagerie</h1>
            <div className="flex items-center space-x-1.5">
              <button
                id="sidebar-mobile-connect-button"
                type="button"
                onClick={() => {
                  if (onOpenMobileConnect) onOpenMobileConnect();
                  else setIsLocalMobileModalOpen(true);
                }}
                className="p-1.5 rounded-full hover:bg-white/15 text-white/90 transition cursor-pointer"
                title="Se connecter depuis un smartphone (QR Code LAN)"
              >
                <Smartphone className="h-5 w-5" />
              </button>
              <button
                id="toggle-group-button"
                onClick={toggleGroupMode}
                className={`p-1.5 rounded-full transition-colors ${
                  isCreatingGroup ? 'bg-[#005c4b] text-white' : 'hover:bg-white/10 text-white/90'
                }`}
                title="Nouveau groupe"
              >
                <Users className="h-5 w-5" />
              </button>
            </div>
          </div>

          {isCreatingGroup ? (
            /* GROUP CREATION VIEW */
            <div className="flex flex-col h-full bg-white">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <input
                  id="group-name-input"
                  type="text"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder="Nom du groupe..."
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 mb-3 outline-hidden"
                />
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={toggleGroupMode}
                    className="w-1/2 py-2 text-xs font-semibold text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
                  >
                    Annuler
                  </button>
                  <button
                    id="submit-create-group"
                    type="button"
                    onClick={handleCreateGroup}
                    disabled={!groupName.trim() || selectedParticipants.length === 0}
                    className="w-1/2 py-2 text-xs font-bold text-white bg-[#00a884] hover:bg-[#008069] disabled:opacity-50 rounded-lg shadow-xs transition"
                  >
                    Créer ({selectedParticipants.length})
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                <p className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50">
                  Sélectionnez les participants
                </p>
                {allUsers
                  .filter(u => u.id !== currentUser.id)
                  .map(user => {
                    const isSelected = selectedParticipants.includes(user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => handleToggleParticipant(user.id)}
                        className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-emerald-50/70' : ''
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold mr-3 shadow-xs">
                          {user.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 text-[#00a884] rounded-sm focus:ring-emerald-500 pointer-events-none"
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            /* STANDARD CONVERSATION LIST */
            <>
              {/* Search */}
              <div className="p-2 border-b border-gray-100 bg-[#f0f2f5]">
                <div className="relative flex items-center bg-white rounded-lg px-3 py-1.5 shadow-2xs">
                  <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                  <input
                    id="contact-search-input"
                    type="text"
                    placeholder="Rechercher contacts, discussions ou messages..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full text-xs bg-transparent border-none outline-hidden text-gray-700 placeholder-gray-400"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 ml-1">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Content: Multi-tier search results or active conversations */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {searchQuery.trim() ? (
                  /* Multi-tier Search results */
                  <div className="divide-y divide-gray-100">
                    {/* Matching active conversations */}
                    {filteredConversations.length > 0 && (
                      <div>
                        <p className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50">
                          Discussions ({filteredConversations.length})
                        </p>
                        {filteredConversations.map(conv => {
                          const name = conv.is_group
                            ? conv.name
                            : conv.user_one_id === currentUser.id
                            ? conv.userTwo?.name || 'Contact'
                            : conv.userOne?.name || 'Contact';
                          return (
                            <div
                              key={`search-conv-${conv.id}`}
                              onClick={() => {
                                handleSelectConversation(conv.id);
                                setSearchQuery('');
                              }}
                              className="flex items-center px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold mr-3 shadow-xs text-sm flex-shrink-0">
                                {name?.charAt(0) || 'D'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                                <p className="text-xs text-gray-500 truncate">
                                  {conv.is_group ? '👥 Groupe' : '👤 Contact direct'}
                                </p>
                              </div>
                              <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-md">
                                Ouvrir
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Matching messages across conversations */}
                    <div>
                      <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 flex items-center justify-between">
                        <span>Messages trouvés ({searchedMessages.length})</span>
                        {isSearchingMessages && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />}
                      </div>
                      {searchedMessages.length > 0 ? (
                        searchedMessages.map((item, idx) => (
                          <div
                            key={`search-msg-${item.message.id}-${idx}`}
                            onClick={() => handleJumpToMessage(item.conversationId, item.message.id)}
                            className="px-4 py-2.5 hover:bg-emerald-50/70 cursor-pointer transition-colors border-b border-gray-100/70"
                          >
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-0.5">
                              <span className="font-semibold text-emerald-700 truncate max-w-[65%] flex items-center gap-1">
                                <MessageSquare className="w-3 h-3 flex-shrink-0 text-emerald-600" />
                                <span className="truncate">{item.conversationName}</span>
                              </span>
                              <span className="text-[10px] text-gray-400 flex-shrink-0">
                                {new Date(item.createdAt).toLocaleDateString([], {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-gray-700 line-clamp-2">
                              <span className="font-medium text-gray-900 mr-1">{item.senderName}:</span>
                              <span>{item.matchedText}</span>
                            </p>
                          </div>
                        ))
                      ) : !isSearchingMessages && searchQuery.trim().length >= 2 ? (
                        <div className="px-4 py-3 text-center text-xs text-gray-400 italic">
                          Aucun message trouvé pour "{searchQuery}"
                        </div>
                      ) : null}
                    </div>

                    {/* Contacts to start discussion */}
                    <div>
                      <p className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50">
                        Contacts ({searchResults.length})
                      </p>
                      {searchResults.length > 0 ? (
                        searchResults.map(user => (
                          <div
                            key={user.id}
                            onClick={() => handleStartConversation(user.id)}
                            className="flex items-center px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold mr-3 shadow-xs text-sm flex-shrink-0">
                              {user.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                              <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-md">
                              Discuter
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-gray-400">
                          Aucun contact correspondant
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                /* Conversation List */
                <div>
                  {conversations.length > 0 ? (
                    conversations.map(conv => {
                      const isSelected = selectedConversationId === conv.id;
                      const isGroupConv = conv.is_group;

                      let name = isGroupConv
                        ? conv.name
                        : conv.user_one_id === currentUser.id
                        ? conv.userTwo?.name
                        : conv.userOne?.name;
                      name = name || 'Discussion';

                      const targetId = !isGroupConv
                        ? conv.user_one_id === currentUser.id
                          ? conv.user_two_id
                          : conv.user_one_id
                        : null;
                      const isOnline = targetId ? onlineUsers.includes(targetId) : false;

                      const lastMsg = conv.messages && conv.messages.length > 0
                        ? conv.messages[conv.messages.length - 1]
                        : null;

                      const unreadCount = (conv.messages || []).filter(
                        m => !m.is_read && m.sender_id !== currentUser.id
                      ).length;

                      const timeStr = lastMsg?.created_at
                        ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '';

                      return (
                        <div
                          key={conv.id}
                          id={`conversation-item-${conv.id}`}
                          onClick={() => handleSelectConversation(conv.id)}
                          className={`flex items-center px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 ${
                            isSelected ? 'bg-[#f0f2f5]' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="relative mr-3 flex-shrink-0">
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-xs ${
                                isGroupConv ? 'bg-[#008069]' : 'bg-emerald-600'
                              }`}
                            >
                              {isGroupConv ? <Users className="w-6 h-6" /> : name.charAt(0)}
                            </div>
                            {!isGroupConv && isOnline && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-gray-900 truncate">{name}</h3>
                              {timeStr && (
                                <span className={`text-[11px] ${unreadCount > 0 ? 'text-[#00a884] font-bold' : 'text-gray-400'}`}>
                                  {timeStr}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between mt-0.5">
                              <p
                                className={`text-xs truncate pr-2 ${
                                  unreadCount > 0 ? 'text-gray-900 font-bold' : 'text-gray-500'
                                }`}
                              >
                                {lastMsg ? (
                                  lastMsg.file_path ? (
                                    '📷 Fichier'
                                  ) : (
                                    lastMsg.body
                                  )
                                ) : (
                                  <span className="italic text-gray-400">Aucun message</span>
                                )}
                              </p>

                              {unreadCount > 0 && (
                                <span className="bg-[#00a884] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-xs">
                                  {unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-sm text-gray-400">
                      Aucune discussion active. Utilisez la recherche ou créez un groupe ci-dessus.
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ----------------- CHAT WINDOW ----------------- */}
      <div
        className={`${
          selectedConversationId ? 'flex' : 'hidden md:flex'
        } flex-1 h-full bg-[#efeae2] relative overflow-hidden`}
      >
        {selectedConv ? (
          <div className="flex flex-1 h-full w-full overflow-hidden">
            {/* Main Chat Column */}
            <div className="flex flex-col flex-1 h-full min-w-0 bg-[#efeae2] relative">
              {/* Header */}
              <div className="px-4 py-2.5 bg-[#f0f2f5] border-b border-gray-200 flex items-center justify-between sticky top-0 z-10 shadow-xs">
                <div
                  onClick={() => setIsInfoDrawerOpen(prev => !prev)}
                  className="flex items-center min-w-0 cursor-pointer hover:opacity-85 transition rounded-md p-1 -ml-1 select-none"
                  title="Afficher les informations du contact ou du groupe"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedConversationId(null);
                    }}
                    className="mr-2 p-1 text-gray-600 hover:bg-gray-200 rounded-full md:hidden transition-colors"
                  >
                    <ArrowLeft className="h-6 w-6" />
                  </button>
                  <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold uppercase shadow-xs flex-shrink-0">
                    {chatName?.charAt(0) || 'C'}
                  </div>
                  <div className="ml-3 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{chatName}</p>
                    <div className="text-xs text-gray-500">
                      {isGroup ? (
                        <span>{selectedConv.participantsList?.length || selectedConv.participants.length} participants</span>
                      ) : currentTyping ? (
                        <span className="text-emerald-600 italic font-medium animate-pulse">en train d'écrire...</span>
                      ) : isReceiverOnline ? (
                        <span className="text-emerald-600 font-medium">en ligne</span>
                      ) : (
                        <span className="text-gray-400">hors ligne</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Sound alert toggle */}
                  <button
                    type="button"
                    onClick={() => setSoundEnabled(prev => !prev)}
                    className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                      soundEnabled
                        ? 'text-[#008069] bg-emerald-100/70 hover:bg-emerald-200/70'
                        : 'text-gray-400 hover:bg-gray-200'
                    }`}
                    title={soundEnabled ? 'Sons activés (cliquer pour couper)' : 'Sons désactivés (cliquer pour activer)'}
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>

                  {/* System notification permission toggle */}
                  <button
                    type="button"
                    onClick={handleToggleNotifications}
                    className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                      notificationsAllowed
                        ? 'text-[#008069] bg-emerald-100/70 hover:bg-emerald-200/70'
                        : 'text-gray-400 hover:bg-gray-200'
                    }`}
                    title={
                      notificationsAllowed
                        ? 'Notifications système autorisées'
                        : 'Activer les notifications système du navigateur'
                    }
                  >
                    {notificationsAllowed ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  </button>

                  {/* Info Drawer button */}
                  <button
                    type="button"
                    onClick={() => setIsInfoDrawerOpen(prev => !prev)}
                    className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                      isInfoDrawerOpen
                        ? 'text-[#008069] bg-emerald-100/70 hover:bg-emerald-200/70'
                        : 'text-gray-500 hover:bg-gray-200'
                    }`}
                    title="Détails du groupe ou contact"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  {/* Message count badge */}
                  {selectedConv.totalMessages && selectedConv.totalMessages > 0 && (
                    <div className="text-[11px] text-gray-500 bg-white/80 px-2.5 py-1 rounded-full border border-gray-200 shadow-2xs">
                      {messages.length} / {selectedConv.totalMessages}
                    </div>
                  )}
                </div>
              </div>

              {/* Messages Feed (with Infinite Scroll Upwards) */}
              <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 flex flex-col min-h-0 bg-[#efeae2]"
                style={{
                  backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`,
                  backgroundRepeat: 'repeat',
                }}
              >
                {/* Load Earlier Messages Button / Indicator */}
                {hasMoreMessages && (
                  <div className="flex justify-center my-2">
                    <button
                      type="button"
                      onClick={loadEarlierMessages}
                      disabled={isLoadingEarlier}
                      className="px-3.5 py-1.5 bg-white/90 hover:bg-white text-gray-700 text-xs font-semibold rounded-full shadow-xs border border-gray-200 flex items-center space-x-2 transition cursor-pointer disabled:opacity-60"
                    >
                      {isLoadingEarlier ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 text-[#00a884] animate-spin" />
                          <span>Chargement des messages précédents...</span>
                        </>
                      ) : (
                        <span>↑ Charger les messages précédents</span>
                      )}
                    </button>
                  </div>
                )}

                {messages.map(msg => {
                  const isMe = msg.sender_id === currentUser.id;
                  const time = msg.created_at
                    ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';

                  // Case: Message deleted for everyone
                  if (msg.is_deleted_for_all) {
                    return (
                      <div
                        key={msg.id}
                        id={`msg-${msg.id}`}
                        className={`flex w-full group transition-all duration-300 rounded-lg ${
                          isMe ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-xs relative break-words border border-gray-200/60 ${
                            isMe ? 'bg-[#d9fdd3]/70 text-gray-500' : 'bg-white/80 text-gray-500'
                          }`}
                        >
                          <div className="flex items-center space-x-2 italic text-xs py-0.5 pr-14 select-none">
                            <span className="text-gray-400">🚫</span>
                            <span>Ce message a été supprimé</span>
                          </div>
                          <div className="absolute bottom-1 right-2 flex items-center space-x-1 select-none">
                            <span className="text-[10px] text-gray-400 font-light">{time}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      id={`msg-${msg.id}`}
                      className={`flex w-full group transition-all duration-300 rounded-lg relative items-end ${
                        isMe ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {/* Left actions for incoming messages */}
                      {!isMe && (
                        <div className="flex items-center space-x-1 self-center mr-1 relative">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingToMessage(msg);
                              setEditingMessage(null);
                              setIsVoiceRecording(false);
                              messageInputRef.current?.focus();
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/10 rounded-full text-gray-500 hover:text-[#008069] cursor-pointer"
                            title="Répondre à ce message"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuMessageId(prev => (prev === msg.id ? null : msg.id));
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/10 rounded-full text-gray-500 hover:text-gray-800 cursor-pointer"
                            title="Options"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {/* Dropdown Menu */}
                          {activeMenuMessageId === msg.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute left-0 bottom-7 z-30 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-36 text-xs text-gray-700 animate-in fade-in zoom-in-95 duration-100"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuMessageId(null);
                                  setReplyingToMessage(msg);
                                  setEditingMessage(null);
                                  setIsVoiceRecording(false);
                                  messageInputRef.current?.focus();
                                }}
                                className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-gray-100 transition text-left cursor-pointer"
                              >
                                <Reply className="w-3.5 h-3.5 text-[#008069]" />
                                <span>Répondre</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuMessageId(null);
                                  setDeleteModalMessage(msg);
                                }}
                                className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-red-50 text-red-600 transition text-left cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Supprimer</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-3 py-1.5 text-sm shadow-xs relative break-words transition-all duration-300 ${
                          isMe ? 'bg-[#d9fdd3] text-gray-900' : 'bg-white text-gray-900'
                        } ${
                          highlightedMessageId === msg.id
                            ? 'ring-3 ring-emerald-500 ring-offset-2 shadow-lg scale-[1.02]'
                            : ''
                        }`}
                      >
                        {/* Quoted / Replied-to message header preview */}
                        {msg.reply_to && (
                          <div
                            onClick={() => {
                              const targetEl = document.getElementById(`msg-${msg.reply_to!.id}`);
                              if (targetEl) {
                                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                targetEl.classList.add('ring-2', 'ring-[#00a884]', 'ring-offset-2');
                                setTimeout(() => {
                                  targetEl.classList.remove('ring-2', 'ring-[#00a884]', 'ring-offset-2');
                                }, 1800);
                              }
                            }}
                            className="mb-1.5 p-2 rounded-md bg-black/5 hover:bg-black/10 transition-colors border-l-4 border-[#00a884] text-xs cursor-pointer select-none"
                            title="Cliquer pour afficher le message d'origine"
                          >
                            <p className="font-bold text-[#008069] text-[11px] truncate">
                              {msg.reply_to.sender_name}
                            </p>
                            <p className="text-gray-600 truncate text-[11px] mt-0.5">
                              {msg.reply_to.body ||
                                (msg.reply_to.file_type?.startsWith('audio/')
                                  ? '🎤 Message vocal'
                                  : msg.reply_to.file_type?.startsWith('image/')
                                  ? '📷 Photo'
                                  : msg.reply_to.file_name
                                  ? `📎 ${msg.reply_to.file_name}`
                                  : 'Pièce jointe')}
                            </p>
                          </div>
                        )}

                        {/* Sender name for group chats */}
                        {isGroup && !isMe && (
                          <p className="text-[10px] text-emerald-600 font-bold mb-1">
                            {msg.sender?.name || 'Utilisateur'}
                          </p>
                        )}

                        <div className="leading-relaxed pr-10 space-y-1">
                          {/* Audio voice message player */}
                          {msg.file_path && msg.file_type && msg.file_type.startsWith('audio/') ? (
                            <div className="my-1">
                              <AudioMessagePlayer src={msg.file_path} isMe={isMe} />
                            </div>
                          ) : msg.file_path && msg.file_type && msg.file_type.startsWith('image/') ? (
                            /* Image attachment */
                            <div
                              onClick={() => handleOpenLightbox(msg.file_path!, msg.file_name || undefined)}
                              className="rounded-md overflow-hidden max-w-xs my-1 bg-black/5 border border-black/10 cursor-pointer hover:opacity-95 transition"
                              title="Cliquer pour agrandir la photo"
                            >
                              <img
                                src={msg.file_path}
                                alt={msg.file_name || 'Image'}
                                className="object-cover max-h-72 w-full"
                                loading="lazy"
                              />
                              {msg.file_name && (
                                <div className="bg-black/40 text-white text-[10px] px-2 py-0.5 truncate">
                                  {msg.file_name}
                                </div>
                              )}
                            </div>
                          ) : msg.file_path ? (
                            /* Other document attachment */
                            <a
                              href={msg.file_path}
                              download={msg.file_name || 'document'}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center space-x-2 bg-black/5 p-2 rounded-md text-emerald-800 hover:underline font-medium text-xs my-1"
                            >
                              <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
                              <span className="truncate max-w-[180px]">{msg.file_name || 'Télécharger le document'}</span>
                              <Download className="h-4 w-4 text-emerald-600 ml-auto" />
                            </a>
                          ) : null}

                          {msg.body && <p className="whitespace-pre-wrap">{msg.body}</p>}
                        </div>

                        {/* Timestamp, status ticks, pending clock, and edited indicator */}
                        <div className="absolute bottom-1 right-2 flex items-center space-x-1 select-none">
                          {msg.is_edited && (
                            <span className="text-[10px] text-gray-400 italic mr-0.5" title="Message modifié">
                              (modifié)
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400 font-light">{time}</span>
                          {isMe && (
                            <span
                              className="inline-flex items-center"
                              title={
                                msg.status === 'pending' || msg.is_offline_queued
                                  ? 'En attente d\'envoi (hors-ligne)'
                                  : msg.status === 'read'
                                  ? 'Lu'
                                  : msg.status === 'delivered'
                                  ? 'Distribué'
                                  : 'Envoyé'
                              }
                            >
                              {msg.status === 'pending' || msg.is_offline_queued ? (
                                <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                              ) : msg.status === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                              ) : msg.status === 'delivered' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-gray-400" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right actions for outgoing messages */}
                      {isMe && (
                        <div className="flex items-center space-x-1 self-center ml-1 relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuMessageId(prev => (prev === msg.id ? null : msg.id));
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/10 rounded-full text-gray-500 hover:text-gray-800 cursor-pointer"
                            title="Options"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingToMessage(msg);
                              setEditingMessage(null);
                              setIsVoiceRecording(false);
                              messageInputRef.current?.focus();
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/10 rounded-full text-gray-500 hover:text-[#008069] cursor-pointer"
                            title="Répondre à ce message"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>

                          {/* Dropdown Menu */}
                          {activeMenuMessageId === msg.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 bottom-7 z-30 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-36 text-xs text-gray-700 animate-in fade-in zoom-in-95 duration-100"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuMessageId(null);
                                  setReplyingToMessage(msg);
                                  setEditingMessage(null);
                                  setIsVoiceRecording(false);
                                  messageInputRef.current?.focus();
                                }}
                                className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-gray-100 transition text-left cursor-pointer"
                              >
                                <Reply className="w-3.5 h-3.5 text-[#008069]" />
                                <span>Répondre</span>
                              </button>

                              {msg.body && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuMessageId(null);
                                    setReplyingToMessage(null);
                                    setEditingMessage(msg);
                                    setNewMessageBody(msg.body || '');
                                    messageInputRef.current?.focus();
                                  }}
                                  className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-gray-100 transition text-left cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Modifier</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuMessageId(null);
                                  setDeleteModalMessage(msg);
                                }}
                                className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-red-50 text-red-600 transition text-left cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Supprimer</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar & Actions */}
              <div className="p-2.5 bg-[#f0f2f5] border-t border-gray-200 flex flex-col sticky bottom-0 z-20 relative">
                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                  <EmojiPicker
                    onSelectEmoji={handleSelectEmoji}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}

                {/* Edit Message Banner */}
                {editingMessage && (
                  <div className="p-2 mb-2 bg-[#fff8e6] rounded-lg flex items-center justify-between text-xs border-l-4 border-amber-500 shadow-xs animate-in slide-in-from-bottom-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center space-x-1.5 text-amber-800 font-bold">
                        <Pencil className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Modifier le message</span>
                      </div>
                      <p className="text-gray-600 truncate mt-0.5 italic">
                        {editingMessage.body}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMessage(null);
                        setNewMessageBody('');
                      }}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition cursor-pointer"
                      title="Annuler la modification"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Reply Preview Banner */}
                {replyingToMessage && !editingMessage && (
                  <div className="p-2 mb-2 bg-[#e7f8f3] rounded-lg flex items-center justify-between text-xs border-l-4 border-[#00a884] shadow-xs animate-in slide-in-from-bottom-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center space-x-1.5 text-[#008069] font-bold">
                        <Reply className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>
                          Répondre à{' '}
                          {replyingToMessage.sender?.name ||
                            (replyingToMessage.sender_id === currentUser.id ? 'Vous-même' : 'Contact')}
                        </span>
                      </div>
                      <p className="text-gray-600 truncate mt-0.5 italic">
                        {replyingToMessage.body ||
                          (replyingToMessage.file_type?.startsWith('audio/')
                            ? '🎤 Message vocal'
                            : replyingToMessage.file_type?.startsWith('image/')
                            ? '📷 Photo'
                            : `📎 ${replyingToMessage.file_name || 'Fichier joint'}`)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingToMessage(null)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition cursor-pointer"
                      title="Annuler la réponse"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Compression in progress banner */}
                {isCompressing && (
                  <div className="p-2 mb-2 bg-amber-50 rounded-lg flex items-center space-x-2 text-xs text-amber-800 border border-amber-200">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600 flex-shrink-0" />
                    <span>Compression de l'image en WebP (max 1920px)...</span>
                  </div>
                )}

                {/* Attached file preview banner */}
                {attachedFile && (
                  <div className="p-2 mb-2 bg-emerald-50 rounded-lg flex items-center justify-between text-xs text-gray-700 border border-emerald-200">
                    <div className="flex items-center space-x-2 truncate">
                      {attachedFile.type.startsWith('image/') ? (
                        <ImageIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      )}
                      <span className="truncate font-semibold">{attachedFile.name}</span>
                      {attachedFile.reductionPercentage !== undefined && attachedFile.reductionPercentage > 0 && (
                        <span className="bg-emerald-600 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-full">
                          -{attachedFile.reductionPercentage}% ({formatBytes(attachedFile.originalSize || 0)} →{' '}
                          {formatBytes(attachedFile.compressedSize || 0)})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-red-500 font-bold hover:text-red-700 ml-2 cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                )}

                {/* Voice Recorder active state OR Standard Form */}
                {isVoiceRecording ? (
                  <VoiceRecorder
                    onSendVoice={handleSendVoice}
                    onCancel={() => setIsVoiceRecording(false)}
                  />
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                    {/* Emoji toggle button */}
                    <button
                      type="button"
                      id="emoji-picker-toggle-button"
                      onClick={() => setShowEmojiPicker(prev => !prev)}
                      className={`p-2 rounded-full transition-colors flex items-center justify-center cursor-pointer ${
                        showEmojiPicker ? 'text-[#00a884] bg-gray-200' : 'text-gray-500 hover:bg-gray-200'
                      }`}
                      title="Émojis"
                    >
                      <Smile className="h-5 w-5" />
                    </button>

                    {/* File attach button */}
                    {!editingMessage && (
                      <label
                        htmlFor="file-upload"
                        className="p-2 text-gray-500 hover:bg-gray-200 rounded-full cursor-pointer transition-colors flex items-center justify-center"
                        title="Joindre un fichier (Images automatiquement compressées en WebP)"
                      >
                        <Paperclip className="h-5 w-5" />
                        <input
                          id="file-upload"
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}

                    {/* Text input */}
                    <input
                      id="message-input"
                      ref={messageInputRef}
                      type="text"
                      value={newMessageBody}
                      onChange={handleTypingInput}
                      placeholder={editingMessage ? 'Modifier le message...' : 'Tapez un message'}
                      className="flex-1 bg-white rounded-lg px-4 py-2.5 text-sm border-none outline-hidden focus:ring-1 focus:ring-emerald-500 text-gray-700 shadow-inner"
                    />

                    {/* Voice recording button or Send/Save button */}
                    {!newMessageBody.trim() && !attachedFile && !editingMessage ? (
                      <button
                        type="button"
                        id="voice-record-button"
                        onClick={() => setIsVoiceRecording(true)}
                        className="p-2.5 bg-gray-100 hover:bg-emerald-50 text-gray-600 hover:text-[#00a884] rounded-full transition-all duration-150 shadow-2xs flex items-center justify-center cursor-pointer"
                        title="Enregistrer un message vocal"
                      >
                        <Mic className="h-5 w-5 text-[#00a884]" />
                      </button>
                    ) : (
                      <button
                        id="send-message-button"
                        type="submit"
                        disabled={(!newMessageBody.trim() && !attachedFile) || isCompressing}
                        className={`p-2.5 rounded-full text-white transition-all duration-150 shadow-md flex items-center justify-center cursor-pointer disabled:opacity-50 ${
                          editingMessage
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-[#00a884] hover:bg-[#008069]'
                        }`}
                        title={editingMessage ? 'Enregistrer la modification' : 'Envoyer'}
                      >
                        {editingMessage ? <Check className="h-5 w-5" /> : <Send className="h-5 w-5" />}
                      </button>
                    )}
                  </form>
                )}
              </div>
            </div>

            {/* Conversation / Group Info Drawer */}
            {isInfoDrawerOpen && (
              <ConversationInfoDrawer
                conversation={selectedConv}
                currentUser={currentUser}
                allUsers={allUsers}
                messages={messages}
                onClose={() => setIsInfoDrawerOpen(false)}
                onAddMember={handleAddGroupMember}
                onRemoveMember={handleRemoveGroupMember}
                onLeaveGroup={handleLeaveGroup}
                onOpenLightbox={handleOpenLightbox}
              />
            )}
          </div>
        ) : (
          /* EMPTY STATE */
          <div className="hidden md:flex flex-col flex-1 items-center justify-center text-center p-8 bg-[#f8f9fa]">
            <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400 shadow-inner">
              <Smartphone className="h-16 w-16 stroke-1 text-[#008069]" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Messagerie Web Locale</h2>
            <p className="text-sm text-gray-500 max-w-sm mt-2 leading-relaxed">
              Sélectionnez une discussion dans la liste de gauche ou créez un nouveau groupe pour discuter avec plusieurs
              utilisateurs en réseau local.
            </p>
          </div>
        )}
      </div>
      </div>

      {/* Delete Message Confirmation Modal */}
      <DeleteMessageModal
        message={deleteModalMessage}
        currentUserId={currentUser.id}
        isGroupAdmin={Boolean(selectedConv?.is_group && selectedConv.admin_ids?.includes(currentUser.id))}
        onClose={() => setDeleteModalMessage(null)}
        onConfirmDelete={handleDeleteMessage}
      />

      {/* Media Lightbox */}
      <MediaLightboxModal
        mediaUrl={lightboxMedia?.url || null}
        fileName={lightboxMedia?.name}
        onClose={() => setLightboxMedia(null)}
      />

      {/* Local Mobile QR Modal fallback */}
      {isLocalMobileModalOpen && (
        <MobileConnectModal isOpen={isLocalMobileModalOpen} onClose={() => setIsLocalMobileModalOpen(false)} />
      )}
    </div>
  );
}
