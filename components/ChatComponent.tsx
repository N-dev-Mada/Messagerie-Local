'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Message } from '@/lib/types';
import { compressImage } from '@/lib/imageUtils';
import { playMessageSound, requestNotificationPermission } from '@/lib/soundUtils';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Bell,
  BellRing,
  Info,
  WifiOff,
  Smartphone,
} from 'lucide-react';
import { DeleteMessageModal } from '@/components/DeleteMessageModal';
import { MediaLightboxModal } from '@/components/MediaLightboxModal';
import { MobileConnectModal } from '@/components/MobileConnectModal';

// Modular Sprint 2 Subcomponents & Hook
import { useChatSync, AttachedFileInfo, GlobalSearchResult, ConnectionState } from '@/hooks/useChatSync';
import { ConversationSidebar } from '@/components/chat/ConversationSidebar';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInputBar } from '@/components/chat/ChatInputBar';
import { ChatDrawer } from '@/components/chat/ChatDrawer';

interface ChatComponentProps {
  currentUser: User;
  allUsers: User[];
  onOpenMobileConnect?: () => void;
  onConnectionStatusChange?: (status: ConnectionState) => void;
  reconnectTriggerRef?: React.MutableRefObject<(() => void) | null>;
}

export default function ChatComponent({
  currentUser,
  allUsers,
  onOpenMobileConnect,
  onConnectionStatusChange,
  reconnectTriggerRef,
}: ChatComponentProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [newMessageBody, setNewMessageBody] = useState('');
  const [attachedFile, setAttachedFile] = useState<AttachedFileInfo | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // States: replies, voice recorder, audio & web notifications
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);

  // States: Info drawer, message edit/delete, lightbox, context menu
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [deleteModalMessage, setDeleteModalMessage] = useState<Message | null>(null);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<number | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; name?: string } | null>(null);

  // Global search in messages
  const [searchedMessages, setSearchedMessages] = useState<GlobalSearchResult[]>([]);
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [isLocalMobileModalOpen, setIsLocalMobileModalOpen] = useState(false);

  // Group creation
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // DOM Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom Real-Time Sync Hook (SSE, offline queue, refresh data)
  const {
    conversations,
    messages,
    setMessages,
    hasMoreMessages,
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
    triggerManualReconnect,
    refreshData,
  } = useChatSync({
    currentUser,
    selectedConversationId,
    soundEnabled,
  });

  // Notify parent of connection status changes
  useEffect(() => {
    if (onConnectionStatusChange) {
      onConnectionStatusChange(connectionState);
    }
  }, [connectionState, onConnectionStatusChange]);

  // Provide reconnect handle to parent
  useEffect(() => {
    if (reconnectTriggerRef) {
      reconnectTriggerRef.current = triggerManualReconnect;
    }
  }, [reconnectTriggerRef, triggerManualReconnect]);

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

  // Scroll to bottom on conversation change or when sending new messages
  useEffect(() => {
    if (isInitialScrollRef.current && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      isInitialScrollRef.current = false;
    }
  }, [messages, isInitialScrollRef]);

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

  // Infinite scroll upwards
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (container.scrollTop < 60 && hasMoreMessages && !isLoadingEarlier) {
      loadEarlierMessages(messagesContainerRef.current);
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

  const receiverId =
    selectedConv && !isGroup
      ? selectedConv.user_one_id === currentUser.id
        ? selectedConv.user_two_id
        : selectedConv.user_one_id
      : null;

  const isReceiverOnline = receiverId ? onlineUsers.includes(receiverId) : false;
  const currentTyping = selectedConversationId ? typingUsers[selectedConversationId] : null;

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
        <ConversationSidebar
          currentUser={currentUser}
          allUsers={allUsers}
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onlineUsers={onlineUsers}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectConversation={handleSelectConversation}
          onStartConversation={handleStartConversation}
          onJumpToMessage={handleJumpToMessage}
          onOpenMobileConnect={() => {
            if (onOpenMobileConnect) onOpenMobileConnect();
            else setIsLocalMobileModalOpen(true);
          }}
          isCreatingGroup={isCreatingGroup}
          groupName={groupName}
          selectedParticipants={selectedParticipants}
          onToggleGroupMode={toggleGroupMode}
          onGroupNameChange={setGroupName}
          onToggleParticipant={handleToggleParticipant}
          onCreateGroup={handleCreateGroup}
          searchedMessages={searchedMessages}
          isSearchingMessages={isSearchingMessages}
        />

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
                      onClick={e => {
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
                          <span>
                            {selectedConv.participantsList?.length || selectedConv.participants.length} participants
                          </span>
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
                      title={
                        soundEnabled
                          ? 'Sons activés (cliquer pour couper)'
                          : 'Sons désactivés (cliquer pour activer)'
                      }
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

                {/* Offline Warning Banner */}
                {connectionState === 'offline' && (
                  <div className="bg-amber-500 text-white px-4 py-1.5 text-xs flex items-center justify-between shadow-xs sticky top-0 z-20">
                    <div className="flex items-center space-x-2">
                      <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Connexion réseau interrompue. Les messages envoyés sont mis en attente locale.</span>
                    </div>
                    <button
                      type="button"
                      onClick={triggerManualReconnect}
                      className="underline hover:no-underline font-semibold text-[11px] cursor-pointer ml-3 flex-shrink-0"
                    >
                      Réessayer
                    </button>
                  </div>
                )}

                {/* Messages Feed */}
                <MessageList
                  messages={messages}
                  currentUser={currentUser}
                  isGroup={isGroup}
                  hasMoreMessages={hasMoreMessages}
                  isLoadingEarlier={isLoadingEarlier}
                  highlightedMessageId={highlightedMessageId}
                  activeMenuMessageId={activeMenuMessageId}
                  messagesContainerRef={messagesContainerRef}
                  messagesEndRef={messagesEndRef}
                  onScroll={handleScroll}
                  onLoadEarlier={() => loadEarlierMessages(messagesContainerRef.current)}
                  onToggleMenu={msgId => setActiveMenuMessageId(prev => (prev === msgId ? null : msgId))}
                  onReply={msg => {
                    setReplyingToMessage(msg);
                    setEditingMessage(null);
                    setIsVoiceRecording(false);
                    messageInputRef.current?.focus();
                  }}
                  onStartEdit={msg => {
                    setReplyingToMessage(null);
                    setEditingMessage(msg);
                    setNewMessageBody(msg.body || '');
                    messageInputRef.current?.focus();
                  }}
                  onOpenDeleteModal={msg => setDeleteModalMessage(msg)}
                  onOpenLightbox={handleOpenLightbox}
                />

                {/* Input Bar & Actions */}
                <ChatInputBar
                  newMessageBody={newMessageBody}
                  attachedFile={attachedFile}
                  editingMessage={editingMessage}
                  replyingToMessage={replyingToMessage}
                  currentUserId={currentUser.id}
                  isCompressing={isCompressing}
                  isVoiceRecording={isVoiceRecording}
                  showEmojiPicker={showEmojiPicker}
                  messageInputRef={messageInputRef}
                  fileInputRef={fileInputRef}
                  onTextChange={handleTypingInput}
                  onSendMessage={handleSendMessage}
                  onFileChange={handleFileChange}
                  onClearFile={() => {
                    setAttachedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  onSelectEmoji={handleSelectEmoji}
                  onToggleEmojiPicker={() => setShowEmojiPicker(prev => !prev)}
                  onCloseEmojiPicker={() => setShowEmojiPicker(false)}
                  onCancelEdit={() => {
                    setEditingMessage(null);
                    setNewMessageBody('');
                  }}
                  onCancelReply={() => setReplyingToMessage(null)}
                  onStartVoiceRecording={() => setIsVoiceRecording(true)}
                  onCancelVoiceRecording={() => setIsVoiceRecording(false)}
                  onSendVoice={handleSendVoice}
                />
              </div>

              {/* Conversation / Group Info Drawer */}
              <ChatDrawer
                isOpen={isInfoDrawerOpen}
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
