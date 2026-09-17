'use client';

import React from 'react';
import { Message } from '@/lib/types';
import { Trash2, Users, User, X } from 'lucide-react';

interface DeleteMessageModalProps {
  message: Message | null;
  currentUserId: number;
  isGroupAdmin?: boolean;
  onClose: () => void;
  onConfirmDelete: (messageId: number, deleteFor: 'me' | 'everyone') => Promise<void>;
}

export const DeleteMessageModal: React.FC<DeleteMessageModalProps> = ({
  message,
  currentUserId,
  isGroupAdmin = false,
  onClose,
  onConfirmDelete,
}) => {
  if (!message) return null;

  const canDeleteForEveryone = message.sender_id === currentUserId || isGroupAdmin;

  return (
    <div
      id="delete-message-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="delete-message-modal-card"
        className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-5 border border-gray-100 flex flex-col space-y-4 animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-gray-800">
            <Trash2 className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-base">Supprimer le message ?</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed">
          Choisissez si vous souhaitez supprimer ce message pour vous uniquement ou pour tous les participants.
        </p>

        <div className="flex flex-col space-y-2 pt-1">
          {canDeleteForEveryone && (
            <button
              type="button"
              id="btn-delete-for-everyone"
              onClick={() => onConfirmDelete(message.id, 'everyone')}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-red-200 bg-red-50/60 hover:bg-red-100/70 text-red-700 transition cursor-pointer text-left font-medium text-sm group"
            >
              <div className="flex items-center space-x-2.5">
                <Users className="w-4 h-4 text-red-600 flex-shrink-0" />
                <div>
                  <span className="block font-semibold">Supprimer pour tous</span>
                  <span className="block text-xs text-red-500/80 font-normal">
                    Remplacé par « Ce message a été supprimé »
                  </span>
                </div>
              </div>
            </button>
          )}

          <button
            type="button"
            id="btn-delete-for-me"
            onClick={() => onConfirmDelete(message.id, 'me')}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/80 hover:bg-gray-100 text-gray-800 transition cursor-pointer text-left font-medium text-sm group"
          >
            <div className="flex items-center space-x-2.5">
              <User className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <div>
                <span className="block font-semibold">Supprimer pour moi</span>
                <span className="block text-xs text-gray-500 font-normal">
                  Masqué uniquement dans votre fil
                </span>
              </div>
            </div>
          </button>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition cursor-pointer"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};
