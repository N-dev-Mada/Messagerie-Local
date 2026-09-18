'use client';

import React from 'react';
import { User, Conversation } from '@/lib/types';
import { GlobalSearchResult } from '@/hooks/useChatSync';
import { Users, Search, X, Smartphone, Loader2, MessageSquare } from 'lucide-react';

interface ConversationSidebarProps {
  currentUser: User;
  allUsers: User[];
  conversations: Conversation[];
  selectedConversationId: number | null;
  onlineUsers: number[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectConversation: (convId: number) => void;
  onStartConversation: (targetUserId: number) => void;
  onJumpToMessage: (convId: number, messageId: number) => void;
  onOpenMobileConnect: () => void;
  // Group creation
  isCreatingGroup: boolean;
  groupName: string;
  selectedParticipants: number[];
  onToggleGroupMode: () => void;
  onGroupNameChange: (name: string) => void;
  onToggleParticipant: (userId: number) => void;
  onCreateGroup: () => void;
  // Global message search
  searchedMessages: GlobalSearchResult[];
  isSearchingMessages: boolean;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  currentUser,
  allUsers,
  conversations,
  selectedConversationId,
  onlineUsers,
  searchQuery,
  onSearchChange,
  onSelectConversation,
  onStartConversation,
  onJumpToMessage,
  onOpenMobileConnect,
  isCreatingGroup,
  groupName,
  selectedParticipants,
  onToggleGroupMode,
  onGroupNameChange,
  onToggleParticipant,
  onCreateGroup,
  searchedMessages,
  isSearchingMessages,
}) => {
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
            onClick={onOpenMobileConnect}
            className="p-1.5 rounded-full hover:bg-white/15 text-white/90 transition cursor-pointer"
            title="Se connecter depuis un smartphone (QR Code LAN)"
          >
            <Smartphone className="h-5 w-5" />
          </button>
          <button
            id="toggle-group-button"
            type="button"
            onClick={onToggleGroupMode}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
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
              onChange={e => onGroupNameChange(e.target.value)}
              placeholder="Nom du groupe..."
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 mb-3 outline-hidden"
            />
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onToggleGroupMode}
                className="w-1/2 py-2 text-xs font-semibold text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                id="submit-create-group"
                type="button"
                onClick={onCreateGroup}
                disabled={!groupName.trim() || selectedParticipants.length === 0}
                className="w-1/2 py-2 text-xs font-bold text-white bg-[#00a884] hover:bg-[#008069] disabled:opacity-50 rounded-lg shadow-xs transition cursor-pointer"
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
                    onClick={() => onToggleParticipant(user.id)}
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
                onChange={e => onSearchChange(e.target.value)}
                className="w-full text-xs bg-transparent border-none outline-hidden text-gray-700 placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="text-gray-400 hover:text-gray-600 ml-1 cursor-pointer"
                >
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
                            onSelectConversation(conv.id);
                            onSearchChange('');
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
                        onClick={() => onJumpToMessage(item.conversationId, item.message.id)}
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
                        onClick={() => onStartConversation(user.id)}
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

                    const lastMsg =
                      conv.messages && conv.messages.length > 0
                        ? conv.messages[conv.messages.length - 1]
                        : null;

                    const unreadCount = (conv.messages || []).filter(
                      m => !m.is_read && m.sender_id !== currentUser.id
                    ).length;

                    const timeStr = lastMsg?.created_at
                      ? new Date(lastMsg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';

                    return (
                      <div
                        key={conv.id}
                        id={`conversation-item-${conv.id}`}
                        onClick={() => onSelectConversation(conv.id)}
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
                              <span
                                className={`text-[11px] ${
                                  unreadCount > 0 ? 'text-[#00a884] font-bold' : 'text-gray-400'
                                }`}
                              >
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
  );
};
