'use client';

import React, { useState, useMemo } from 'react';
import { Conversation, Message, User } from '@/lib/types';
import {
  X,
  Users,
  UserPlus,
  UserMinus,
  LogOut,
  Image as ImageIcon,
  FileText,
  Music,
  ShieldCheck,
  Download,
  AlertCircle,
} from 'lucide-react';
import { AudioMessagePlayer } from './AudioMessagePlayer';

interface ConversationInfoDrawerProps {
  conversation: Conversation;
  currentUser: User;
  allUsers: User[];
  messages: Message[];
  onClose: () => void;
  onAddMember: (memberId: number) => Promise<void>;
  onRemoveMember: (memberId: number) => Promise<void>;
  onLeaveGroup: () => Promise<void>;
  onOpenLightbox: (imageUrl: string, name?: string) => void;
}

type MediaFilter = 'all' | 'images' | 'docs' | 'audios';

export const ConversationInfoDrawer: React.FC<ConversationInfoDrawerProps> = ({
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
  const [activeMediaFilter, setActiveMediaFilter] = useState<MediaFilter>('all');
  const [showAddMemberSelector, setShowAddMemberSelector] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<number | ''>('');
  const [isAdding, setIsAdding] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);

  const isGroup = conversation.is_group;
  const adminIds = conversation.admin_ids || (isGroup ? [conversation.user_one_id] : []);
  const isAdmin = isGroup && adminIds.includes(currentUser.id);

  // Other user for 1-on-1
  const otherUser = useMemo(() => {
    if (isGroup) return null;
    const otherId = conversation.user_one_id === currentUser.id ? conversation.user_two_id : conversation.user_one_id;
    return allUsers.find(u => u.id === otherId) || { id: otherId, name: 'Contact', email: '' };
  }, [isGroup, conversation, currentUser.id, allUsers]);

  // Participants list resolved
  const participantsList = useMemo(() => {
    if (!isGroup) return [];
    return conversation.participants
      .map(id => allUsers.find(u => u.id === id) || { id, name: `Utilisateur #${id}`, email: '' })
      .sort((a, b) => {
        // Admins first, then current user, then alphabetical
        const aAdmin = adminIds.includes(a.id);
        const bAdmin = adminIds.includes(b.id);
        if (aAdmin && !bAdmin) return -1;
        if (!aAdmin && bAdmin) return 1;
        if (a.id === currentUser.id) return -1;
        if (b.id === currentUser.id) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [isGroup, conversation.participants, allUsers, adminIds, currentUser.id]);

  // Non-participant users available to add
  const availableUsersToAdd = useMemo(() => {
    if (!isGroup) return [];
    return allUsers.filter(u => !conversation.participants.includes(u.id));
  }, [isGroup, allUsers, conversation.participants]);

  // Filter exchanged media
  const mediaItems = useMemo(() => {
    return messages
      .filter(m => Boolean(m.file_path) && !m.is_deleted_for_all)
      .map(m => ({
        id: m.id,
        filePath: m.file_path as string,
        fileType: m.file_type || '',
        fileName: m.file_name || 'Fichier',
        createdAt: m.created_at,
        isImage: Boolean(m.file_type?.startsWith('image/')),
        isAudio: Boolean(m.file_type?.startsWith('audio/')),
        isDoc: !m.file_type?.startsWith('image/') && !m.file_type?.startsWith('audio/'),
      }));
  }, [messages]);

  const imagesCount = mediaItems.filter(m => m.isImage).length;
  const docsCount = mediaItems.filter(m => m.isDoc).length;
  const audiosCount = mediaItems.filter(m => m.isAudio).length;

  const filteredMedia = useMemo(() => {
    switch (activeMediaFilter) {
      case 'images':
        return mediaItems.filter(m => m.isImage);
      case 'docs':
        return mediaItems.filter(m => m.isDoc);
      case 'audios':
        return mediaItems.filter(m => m.isAudio);
      case 'all':
      default:
        return mediaItems;
    }
  }, [mediaItems, activeMediaFilter]);

  const handleExecuteAddMember = async () => {
    if (!selectedUserToAdd) return;
    setIsAdding(true);
    try {
      await onAddMember(Number(selectedUserToAdd));
      setSelectedUserToAdd('');
      setShowAddMemberSelector(false);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div
      id="conversation-info-drawer"
      className="w-80 md:w-96 flex-shrink-0 bg-[#f0f2f5] border-l border-gray-200 flex flex-col h-full overflow-hidden shadow-lg animate-in slide-in-from-right duration-200 z-30"
    >
      {/* Header */}
      <div className="h-16 bg-[#f0f2f5] px-4 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded-full text-gray-600 transition cursor-pointer"
            title="Fermer le panneau"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="font-semibold text-gray-800 text-base">
            {isGroup ? 'Infos du groupe' : 'Infos du contact'}
          </h2>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-8">
        {/* Profile Card */}
        <div className="bg-white p-6 flex flex-col items-center text-center shadow-2xs">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold shadow-md mb-3 ${
              isGroup
                ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300'
                : 'bg-[#dfe5e7] text-gray-700'
            }`}
          >
            {isGroup ? (
              <Users className="w-12 h-12 text-[#00a884]" />
            ) : (
              otherUser?.name.charAt(0).toUpperCase() || 'U'
            )}
          </div>
          <h3 className="text-xl font-bold text-gray-900 leading-tight">
            {isGroup ? conversation.name : otherUser?.name}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {isGroup
              ? `Groupe • ${conversation.participants.length} participants`
              : otherUser?.email || 'Réseau local'}
          </p>
          <div className="mt-2 text-xs text-gray-400">
            Créé le {new Date(conversation.created_at).toLocaleDateString()}
          </div>
        </div>

        {/* Exchanged Media Section */}
        <div className="bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-800 text-sm flex items-center space-x-1.5">
              <span>Médias échangés</span>
              <span className="text-xs font-normal text-gray-400">({mediaItems.length})</span>
            </h4>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setActiveMediaFilter('all')}
              className={`flex-1 py-1 rounded-md transition font-medium cursor-pointer ${
                activeMediaFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Tous ({mediaItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveMediaFilter('images')}
              className={`flex-1 py-1 rounded-md transition font-medium cursor-pointer ${
                activeMediaFilter === 'images'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Photos ({imagesCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveMediaFilter('docs')}
              className={`flex-1 py-1 rounded-md transition font-medium cursor-pointer ${
                activeMediaFilter === 'docs'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Docs ({docsCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveMediaFilter('audios')}
              className={`flex-1 py-1 rounded-md transition font-medium cursor-pointer ${
                activeMediaFilter === 'audios'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Audios ({audiosCount})
            </button>
          </div>

          {/* Media Content Grid/List */}
          {filteredMedia.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-xs italic">
              Aucun média partagé dans cette catégorie
            </div>
          ) : (
            <div className="space-y-2">
              {/* If images filter or all has images */}
              {(activeMediaFilter === 'images' || activeMediaFilter === 'all') && (
                <div className="grid grid-cols-3 gap-1.5">
                  {filteredMedia
                    .filter(m => m.isImage)
                    .slice(0, 9)
                    .map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onOpenLightbox(item.filePath, item.fileName)}
                        className="aspect-square relative rounded-md overflow-hidden bg-gray-100 hover:opacity-90 transition border border-gray-200 cursor-pointer group"
                      >
                        <img
                          src={item.filePath}
                          alt={item.fileName}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                          loading="lazy"
                        />
                      </button>
                    ))}
                </div>
              )}

              {/* Documents List */}
              {(activeMediaFilter === 'docs' || activeMediaFilter === 'all') &&
                filteredMedia.filter(m => m.isDoc).length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {filteredMedia
                      .filter(m => m.isDoc)
                      .slice(0, 6)
                      .map(doc => (
                        <a
                          key={doc.id}
                          href={doc.filePath}
                          download={doc.fileName}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200/70 text-xs transition"
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <FileText className="w-4 h-4 text-[#008069] flex-shrink-0" />
                            <span className="truncate font-medium text-gray-700">{doc.fileName}</span>
                          </div>
                          <Download className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 flex-shrink-0 ml-1.5" />
                        </a>
                      ))}
                  </div>
                )}

              {/* Audios List */}
              {(activeMediaFilter === 'audios' || activeMediaFilter === 'all') &&
                filteredMedia.filter(m => m.isAudio).length > 0 && (
                  <div className="space-y-2 pt-1">
                    {filteredMedia
                      .filter(m => m.isAudio)
                      .slice(0, 4)
                      .map(audio => (
                        <div
                          key={audio.id}
                          className="p-2 rounded-lg bg-gray-50 border border-gray-200/70"
                        >
                          <div className="flex items-center space-x-1.5 text-xs text-gray-500 mb-1">
                            <Music className="w-3.5 h-3.5 text-[#00a884]" />
                            <span className="truncate font-medium">{audio.fileName}</span>
                          </div>
                          <AudioMessagePlayer src={audio.filePath} isMe={false} />
                        </div>
                      ))}
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Group Participants Section */}
        {isGroup && (
          <div className="bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-800 text-sm">
                {participantsList.length} participants
              </h4>
              {isAdmin && !showAddMemberSelector && availableUsersToAdd.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddMemberSelector(true)}
                  className="flex items-center space-x-1 text-xs text-[#008069] font-medium hover:underline cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              )}
            </div>

            {/* Add member inline selector */}
            {showAddMemberSelector && (
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
                  <span>Sélectionner un nouveau membre</span>
                  <button
                    type="button"
                    onClick={() => setShowAddMemberSelector(false)}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <select
                  value={selectedUserToAdd}
                  onChange={e => setSelectedUserToAdd(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-700 outline-hidden focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">-- Choisir un utilisateur --</option>
                  {availableUsersToAdd.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddMemberSelector(false)}
                    className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded-md cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={!selectedUserToAdd || isAdding}
                    onClick={handleExecuteAddMember}
                    className="px-3 py-1 text-xs bg-[#00a884] hover:bg-[#008069] text-white rounded-md font-medium disabled:opacity-50 transition cursor-pointer"
                  >
                    {isAdding ? 'Ajout...' : 'Ajouter'}
                  </button>
                </div>
              </div>
            )}

            {/* Participants list */}
            <div className="divide-y divide-gray-100">
              {participantsList.map(participant => {
                const isPartAdmin = adminIds.includes(participant.id);
                const isPartCurrentUser = participant.id === currentUser.id;

                return (
                  <div
                    key={participant.id}
                    className="py-2.5 flex items-center justify-between hover:bg-gray-50/80 px-1 rounded-md transition"
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-semibold text-gray-800 truncate">
                            {participant.name}
                          </span>
                          {isPartCurrentUser && (
                            <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.2 rounded-sm font-medium">
                              Vous
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 truncate block">
                          {participant.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                      {isPartAdmin ? (
                        <span className="inline-flex items-center space-x-1 text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-300">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Admin</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400">Membre</span>
                      )}

                      {/* Admin remove button */}
                      {isAdmin && !isPartCurrentUser && (
                        <div>
                          {confirmRemoveId === participant.id ? (
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onRemoveMember(participant.id);
                                  setConfirmRemoveId(null);
                                }}
                                className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded-md font-medium cursor-pointer"
                                title="Confirmer le retrait"
                              >
                                Oui
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRemoveId(null)}
                                className="text-xs text-gray-500 hover:bg-gray-200 px-1 py-0.5 rounded-md cursor-pointer"
                              >
                                Non
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmRemoveId(participant.id)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition cursor-pointer"
                              title="Retirer du groupe"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Group Exit Action */}
        {isGroup && (
          <div className="bg-white p-4 shadow-2xs">
            {showConfirmLeave ? (
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-red-700 font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Êtes-vous sûr de vouloir quitter ce groupe ?</span>
                </div>
                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfirmLeave(false)}
                    className="px-3 py-1 text-gray-600 hover:bg-gray-200 rounded-md cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmLeave(false);
                      onLeaveGroup();
                    }}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold cursor-pointer"
                  >
                    Quitter
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                id="btn-leave-group"
                onClick={() => setShowConfirmLeave(true)}
                className="w-full flex items-center space-x-2 text-red-600 hover:bg-red-50/70 p-2 rounded-lg font-medium text-xs transition cursor-pointer"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span>Quitter le groupe</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
