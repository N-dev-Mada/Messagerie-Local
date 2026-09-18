'use client';

import React from 'react';
import { Message, User } from '@/lib/types';
import { MessageItem } from '@/components/chat/MessageItem';
import { Loader2 } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  currentUser: User;
  isGroup: boolean;
  hasMoreMessages: boolean;
  isLoadingEarlier: boolean;
  highlightedMessageId: number | null;
  activeMenuMessageId: number | null;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onLoadEarlier: () => void;
  onToggleMenu: (msgId: number) => void;
  onReply: (msg: Message) => void;
  onStartEdit: (msg: Message) => void;
  onOpenDeleteModal: (msg: Message) => void;
  onOpenLightbox: (url: string, name?: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUser,
  isGroup,
  hasMoreMessages,
  isLoadingEarlier,
  highlightedMessageId,
  activeMenuMessageId,
  messagesContainerRef,
  messagesEndRef,
  onScroll,
  onLoadEarlier,
  onToggleMenu,
  onReply,
  onStartEdit,
  onOpenDeleteModal,
  onOpenLightbox,
}) => {
  return (
    <div
      ref={messagesContainerRef}
      onScroll={onScroll}
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
            onClick={onLoadEarlier}
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

      {messages.map(msg => (
        <MessageItem
          key={msg.id}
          message={msg}
          currentUser={currentUser}
          isGroup={isGroup}
          highlightedMessageId={highlightedMessageId}
          activeMenuMessageId={activeMenuMessageId}
          onToggleMenu={onToggleMenu}
          onReply={onReply}
          onStartEdit={onStartEdit}
          onOpenDeleteModal={onOpenDeleteModal}
          onOpenLightbox={onOpenLightbox}
        />
      ))}

      <div ref={messagesEndRef} />
    </div>
  );
};
