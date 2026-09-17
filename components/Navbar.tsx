'use client';

import React, { useState } from 'react';
import { User } from '@/lib/types';
import { MessageSquare, UserCheck, ChevronDown, LogOut, User as UserIcon, Plus, Smartphone, QrCode } from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  allUsers: User[];
  onSwitchUser: (user: User) => void;
  onNewUser: (name: string, email: string) => void;
  onOpenProfile: () => void;
  onOpenMobileConnect?: () => void;
}

export default function Navbar({
  currentUser,
  allUsers,
  onSwitchUser,
  onNewUser,
  onOpenProfile,
  onOpenMobileConnect,
}: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    onNewUser(newUserName.trim(), newUserEmail.trim());
    setNewUserName('');
    setNewUserEmail('');
    setShowAddUserModal(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#008069] flex items-center justify-center text-white shadow-sm">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">Messagerie</span>
              <span className="hidden sm:inline-block ml-2 text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                Réseau Local
              </span>
            </div>
          </div>

          {/* User Status and Fast Account Switcher */}
          <div className="flex items-center space-x-2.5">
            {/* Mobile / Smartphone LAN Connect Button */}
            {onOpenMobileConnect && (
              <button
                type="button"
                onClick={onOpenMobileConnect}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-[#008069] border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs cursor-pointer"
                title="Se connecter depuis un smartphone ou un autre appareil sur le réseau local"
              >
                <Smartphone className="w-4 h-4 text-[#008069]" />
                <span className="hidden sm:inline">Connexion Smartphone</span>
                <QrCode className="w-3.5 h-3.5 hidden md:inline text-emerald-600 ml-0.5" />
              </button>
            )}

            {/* Quick Switch Dropdown */}
            <div className="relative">
              <button
                id="user-menu-button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="inline-flex items-center space-x-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 focus:outline-hidden transition"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold uppercase">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-semibold text-gray-800 leading-tight">{currentUser.name}</div>
                  <div className="text-[11px] text-gray-500 leading-tight">{currentUser.email}</div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Connecté en tant que</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{currentUser.name}</p>
                    <p className="text-xs text-gray-500">{currentUser.email}</p>
                  </div>

                  <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1">
                    Changer d'utilisateur (Test multi-appareil)
                  </div>

                  <div className="max-h-48 overflow-y-auto py-1">
                    {allUsers.map(u => (
                      <button
                        key={u.id}
                        onClick={() => onSwitchUser(u)}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-50 transition ${
                          u.id === currentUser.id ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'text-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 uppercase">
                            {u.name.charAt(0)}
                          </span>
                          <span className="truncate max-w-[170px]">{u.name}</span>
                        </div>
                        {u.id === currentUser.id && <UserCheck className="w-4 h-4 text-emerald-600" />}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setShowAddUserModal(true);
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50 flex items-center space-x-2 font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter un compte test...</span>
                    </button>

                    <button
                      onClick={onOpenProfile}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      <span>Modifier mon profil</span>
                    </button>

                    <button
                      onClick={() => onSwitchUser(allUsers.find(u => u.id !== currentUser.id) || currentUser)}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Déconnexion / Changer</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Ajouter un profil utilisateur</h3>
            <p className="text-xs text-gray-500 mb-4">
              Créez un profil pour tester la réception de messages et discussions de groupe en local.
            </p>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom complet</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="Ex: Nancy Fitahiana"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Adresse e-mail</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="Ex: nancy@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-bold text-white bg-[#00a884] hover:bg-[#008069] rounded-lg shadow-sm"
                >
                  Créer et basculer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
