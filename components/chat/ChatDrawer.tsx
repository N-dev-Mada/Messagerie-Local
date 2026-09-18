'use client';

import React from 'react';
import { ConversationInfoDrawer } from '@/components/ConversationInfoDrawer';
import { Conversation, Message, User } from '@/lib/types';

interface ChatDrawerProps {
  isOpen: boolean;
  conversation?: Conversation;
  currentUser: User;
  allUsers: User[];
  messages: Message[];
  onClose: () => void;
  onAddMember: (memberId: number) => Promise<void>;
  onRemoveMember: (memberId: number) => Promise<void>;
  onLeaveGroup: () => Promise<void>;
  onOpenLightbox: (url: string, name?: string) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  conversation,
  currentUser,
  allUsers,
  messages,
  onClose,
  onAddMember,
  onRemoveMember,
  onLeaveGroup,
  onOpenLightbox,
}) => {
  if (!isOpen || !conversation) return null;

  return (
    <ConversationInfoDrawer
      conversation={conversation}
      currentUser={currentUser}
      allUsers={allUsers}
      messages={messages}
      onClose={onClose}
      onAddMember={onAddMember}
      onRemoveMember={onRemoveMember}
      onLeaveGroup={onLeaveGroup}
      onOpenLightbox={onOpenLightbox}
    />
  );
};
