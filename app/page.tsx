'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ChatComponent from '@/components/ChatComponent';
import ProfileModal from '@/components/ProfileModal';
import MobileConnectModal from '@/components/MobileConnectModal';
import { User } from '@/lib/types';

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<User>({
    id: 1,
    name: 'John Doe',
    email: 'test@example.com',
  });
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);

  // Load initial users
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch('/api/chat');
        if (res.ok) {
          const data = await res.json();
          if (data.users && data.users.length > 0) {
            setAllUsers(data.users);
            // Check if saved user exists in local storage
            const savedId = localStorage.getItem('messagerie_current_user_id');
            if (savedId) {
              const matched = data.users.find((u: User) => u.id === parseInt(savedId, 10));
              if (matched) {
                setCurrentUser(matched);
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to load users', e);
      }
    }
    loadUsers();
  }, []);

  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('messagerie_current_user_id', user.id.toString());
    }
  };

  const handleNewUser = async (name: string, email: string) => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'registerUser', name, email }),
      });
      const data = await res.json();
      if (data.user) {
        setAllUsers(prev => [...prev.filter(u => u.id !== data.user.id), data.user]);
        handleSwitchUser(data.user);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleProfileSave = (updated: User) => {
    setCurrentUser(updated);
    setAllUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col">
      <Navbar
        currentUser={currentUser}
        allUsers={allUsers}
        onSwitchUser={handleSwitchUser}
        onNewUser={handleNewUser}
        onOpenProfile={() => setShowProfile(true)}
        onOpenMobileConnect={() => setShowMobileModal(true)}
      />

      <main className="flex-1 py-2 sm:py-3">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 h-full">
          <ChatComponent currentUser={currentUser} allUsers={allUsers} onOpenMobileConnect={() => setShowMobileModal(true)} />
        </div>
      </main>

      {showProfile && (
        <ProfileModal
          user={currentUser}
          onClose={() => setShowProfile(false)}
          onSave={handleProfileSave}
        />
      )}

      <MobileConnectModal
        isOpen={showMobileModal}
        onClose={() => setShowMobileModal(false)}
      />
    </div>
  );
}
