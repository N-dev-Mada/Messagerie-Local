'use client';

import React from 'react';
import { Message, User } from '@/lib/types';
import AudioMessagePlayer from '@/components/AudioMessagePlayer';
import {
  FileText,
  Download,
  Check,
  CheckCheck,
  Clock,
  Reply,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';

interface MessageItemProps {
  message: Message;
  currentUser: User;
  isGroup: boolean;
  highlightedMessageId: number | null;
  activeMenuMessageId: number | null;
  onToggleMenu: (msgId: number) => void;
  onReply: (msg: Message) => void;
  onStartEdit: (msg: Message) => void;
  onOpenDeleteModal: (msg: Message) => void;
  onOpenLightbox: (url: string, name?: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUser,
  isGroup,
  highlightedMessageId,
  activeMenuMessageId,
  onToggleMenu,
  onReply,
  onStartEdit,
  onOpenDeleteModal,
  onOpenLightbox,
}) => {
  const isMe = message.sender_id === currentUser.id;
  const time = message.created_at
    ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  // Case: Message deleted for everyone
  if (message.is_deleted_for_all) {
    return (
      <div
        id={`msg-${message.id}`}
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
      id={`msg-${message.id}`}
      className={`flex w-full group transition-all duration-300 rounded-lg relative items-end ${
        isMe ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* Left actions for incoming messages */}
      {!isMe && (
        <div className="flex items-center space-x-1 self-center mr-1 relative">
          <button
            type="button"
            onClick={() => onReply(message)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/10 rounded-full text-gray-500 hover:text-[#008069] cursor-pointer"
            title="Répondre à ce message"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onToggleMenu(message.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/10 rounded-full text-gray-500 hover:text-gray-800 cursor-pointer"
            title="Options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {/* Dropdown Menu */}
          {activeMenuMessageId === message.id && (
            <div
              onClick={e => e.stopPropagation()}
              className="absolute left-0 bottom-7 z-30 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-36 text-xs text-gray-700 animate-in fade-in zoom-in-95 duration-100"
            >
              <button
                type="button"
                onClick={() => {
                  onToggleMenu(message.id);
                  onReply(message);
                }}
                className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-gray-100 transition text-left cursor-pointer"
              >
                <Reply className="w-3.5 h-3.5 text-[#008069]" />
                <span>Répondre</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleMenu(message.id);
                  onOpenDeleteModal(message);
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
          highlightedMessageId === message.id
            ? 'ring-3 ring-emerald-500 ring-offset-2 shadow-lg scale-[1.02]'
            : ''
        }`}
      >
        {/* Quoted / Replied-to message header preview */}
        {message.reply_to && (
          <div
            onClick={() => {
              const targetEl = document.getElementById(`msg-${message.reply_to!.id}`);
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
              {message.reply_to.sender_name}
            </p>
            <p className="text-gray-600 truncate text-[11px] mt-0.5">
              {message.reply_to.body ||
                (message.reply_to.file_type?.startsWith('audio/')
                  ? '🎤 Message vocal'
                  : message.reply_to.file_type?.startsWith('image/')
                  ? '📷 Photo'
                  : message.reply_to.file_name
                  ? `📎 ${message.reply_to.file_name}`
                  : 'Pièce jointe')}
            </p>
          </div>
        )}

        {/* Sender name for group chats */}
        {isGroup && !isMe && (
          <p className="text-[10px] text-emerald-600 font-bold mb-1">
            {message.sender?.name || 'Utilisateur'}
          </p>
        )}

        <div className="leading-relaxed pr-10 space-y-1">
          {/* Audio voice message player */}
          {message.file_path && message.file_type && message.file_type.startsWith('audio/') ? (
            <div className="my-1">
              <AudioMessagePlayer src={message.file_path} isMe={isMe} />
            </div>
          ) : message.file_path && message.file_type && message.file_type.startsWith('image/') ? (
            /* Image attachment */
            <div
              onClick={() => onOpenLightbox(message.file_path!, message.file_name || undefined)}
              className="rounded-md overflow-hidden max-w-xs my-1 bg-black/5 border border-black/10 cursor-pointer hover:opacity-95 transition"
              title="Cliquer pour agrandir la photo"
            >
              <img
                src={message.file_path}
                alt={message.file_name || 'Image'}
                className="object-cover max-h-72 w-full"
                loading="lazy"
              />
              {message.file_name && (
                <div className="bg-black/40 text-white text-[10px] px-2 py-0.5 truncate">
                  {message.file_name}
                </div>
              )}
            </div>
          ) : message.file_path ? (
            /* Other document attachment */
            <a
              href={message.file_path}
              download={message.file_name || 'document'}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-2 bg-black/5 p-2 rounded-md text-emerald-800 hover:underline font-medium text-xs my-1"
            >
              <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
              <span className="truncate max-w-[180px]">{message.file_name || 'Télécharger le document'}</span>
              <Download className="h-4 w-4 text-emerald-600 ml-auto" />
            </a>
          ) : null}

          {message.body && <p className="whitespace-pre-wrap">{message.body}</p>}
        </div>

        {/* Timestamp, status ticks, pending clock, and edited indicator */}
        <div className="absolute bottom-1 right-2 flex items-center space-x-1 select-none">
          {message.is_edited && (
            <span className="text-[10px] text-gray-400 italic mr-0.5" title="Message modifié">
              (modifié)
            </span>
          )}
          <span className="text-[10px] text-gray-400 font-light">{time}</span>
          {isMe && (
            <span
              className="inline-flex items-center"
              title={
                message.status === 'pending' || message.is_offline_queued
                  ? "En attente d'envoi (hors-ligne)"
                  : message.status === 'read'
                  ? 'Lu'
                  : message.status === 'delivered'
                  ? 'Distribué'
                  : 'Envoyé'
              }
            >
              {message.status === 'pending' || message.is_offline_queued ? (
                <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              ) : message.status === 'read' ? (
                <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
              ) : message.status === 'delivered' ? (
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
            onClick={e => {
              e.stopPropagation();
              onToggleMenu(message.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/10 rounded-full text-gray-500 hover:text-gray-800 cursor-pointer"
            title="Options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onReply(message)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/10 rounded-full text-gray-500 hover:text-[#008069] cursor-pointer"
            title="Répondre à ce message"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>

          {/* Dropdown Menu */}
          {activeMenuMessageId === message.id && (
            <div
              onClick={e => e.stopPropagation()}
              className="absolute right-0 bottom-7 z-30 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-36 text-xs text-gray-700 animate-in fade-in zoom-in-95 duration-100"
            >
              <button
                type="button"
                onClick={() => {
                  onToggleMenu(message.id);
                  onReply(message);
                }}
                className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-gray-100 transition text-left cursor-pointer"
              >
                <Reply className="w-3.5 h-3.5 text-[#008069]" />
                <span>Répondre</span>
              </button>

              {message.body && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleMenu(message.id);
                    onStartEdit(message);
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
                  onToggleMenu(message.id);
                  onOpenDeleteModal(message);
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
};
