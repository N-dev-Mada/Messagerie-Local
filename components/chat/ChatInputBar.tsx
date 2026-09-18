'use client';

import React from 'react';
import { Message } from '@/lib/types';
import { AttachedFileInfo } from '@/hooks/useChatSync';
import { formatBytes } from '@/lib/imageUtils';
import EmojiPicker from '@/components/EmojiPicker';
import VoiceRecorder from '@/components/VoiceRecorder';
import {
  Smile,
  Paperclip,
  Mic,
  Send,
  Check,
  X,
  Pencil,
  Reply,
  Loader2,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';

interface ChatInputBarProps {
  newMessageBody: string;
  attachedFile: AttachedFileInfo | null;
  editingMessage: Message | null;
  replyingToMessage: Message | null;
  currentUserId: number;
  isCompressing: boolean;
  isVoiceRecording: boolean;
  showEmojiPicker: boolean;
  messageInputRef: React.RefObject<HTMLInputElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onTextChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  onSelectEmoji: (emoji: string) => void;
  onToggleEmojiPicker: () => void;
  onCloseEmojiPicker: () => void;
  onCancelEdit: () => void;
  onCancelReply: () => void;
  onStartVoiceRecording: () => void;
  onCancelVoiceRecording: () => void;
  onSendVoice: (audioData: string, durationSeconds: number) => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  newMessageBody,
  attachedFile,
  editingMessage,
  replyingToMessage,
  currentUserId,
  isCompressing,
  isVoiceRecording,
  showEmojiPicker,
  messageInputRef,
  fileInputRef,
  onTextChange,
  onSendMessage,
  onFileChange,
  onClearFile,
  onSelectEmoji,
  onToggleEmojiPicker,
  onCloseEmojiPicker,
  onCancelEdit,
  onCancelReply,
  onStartVoiceRecording,
  onCancelVoiceRecording,
  onSendVoice,
}) => {
  return (
    <div className="p-2.5 bg-[#f0f2f5] border-t border-gray-200 flex flex-col sticky bottom-0 z-20 relative">
      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <EmojiPicker
          onSelectEmoji={onSelectEmoji}
          onClose={onCloseEmojiPicker}
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
            onClick={onCancelEdit}
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
                  (replyingToMessage.sender_id === currentUserId ? 'Vous-même' : 'Contact')}
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
            onClick={onCancelReply}
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
            onClick={onClearFile}
            className="text-red-500 font-bold hover:text-red-700 ml-2 cursor-pointer"
          >
            Annuler
          </button>
        </div>
      )}

      {/* Voice Recorder active state OR Standard Form */}
      {isVoiceRecording ? (
        <VoiceRecorder
          onSendVoice={onSendVoice}
          onCancel={onCancelVoiceRecording}
        />
      ) : (
        <form onSubmit={onSendMessage} className="flex items-center space-x-2">
          {/* Emoji toggle button */}
          <button
            type="button"
            id="emoji-picker-toggle-button"
            onClick={onToggleEmojiPicker}
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
                onChange={onFileChange}
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
            onChange={onTextChange}
            placeholder={editingMessage ? 'Modifier le message...' : 'Tapez un message'}
            className="flex-1 bg-white rounded-lg px-4 py-2.5 text-sm border-none outline-hidden focus:ring-1 focus:ring-emerald-500 text-gray-700 shadow-inner"
          />

          {/* Voice recording button or Send/Save button */}
          {!newMessageBody.trim() && !attachedFile && !editingMessage ? (
            <button
              type="button"
              id="voice-record-button"
              onClick={onStartVoiceRecording}
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
  );
};
