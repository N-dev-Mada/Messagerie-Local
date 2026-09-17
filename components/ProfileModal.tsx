'use client';

import React, { useState } from 'react';
import { User } from '@/lib/types';
import { X, Check, User as UserIcon, Mail } from 'lucide-react';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onSave: (updated: User) => void;
}

export default function ProfileModal({ user, onClose, onSave }: ProfileModalProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [statusMessage, setStatusMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSaving(true);
    setStatusMessage('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateUser',
          id: user.id,
          name: name.trim(),
          email: email.trim(),
        }),
      });
      const data = await res.json();
      if (data.user) {
        onSave(data.user);
        setStatusMessage('Profil mis à jour avec succès !');
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage('Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-1">Mon Profil</h2>
        <p className="text-xs text-gray-500 mb-5">
          Modifiez les informations de votre compte sur la messagerie locale.
        </p>

        {statusMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center space-x-2 border border-emerald-200">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nom d'affichage</label>
            <div className="relative flex items-center">
              <UserIcon className="w-4 h-4 text-gray-400 absolute left-3" />
              <input
                id="profile-name-input"
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Adresse e-mail</label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3" />
              <input
                id="profile-email-input"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Fermer
            </button>
            <button
              id="save-profile-button"
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-bold text-white bg-[#00a884] hover:bg-[#008069] rounded-lg shadow-sm transition"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
