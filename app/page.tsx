'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import ChatComponent from '@/components/ChatComponent';
import ProfileModal from '@/components/ProfileModal';
import MobileConnectModal from '@/components/MobileConnectModal';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ConnectionState } from '@/components/ConnectionStatusBadge';
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
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('connected');
  const reconnectTriggerRef = useRef<(() => void) | null>(null);

  // Sync session cookie with server
  const syncSession = useCallback(async (userId: number) => {
    try {
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch (err) {
      console.error('Erreur lors de la synchronisation de la session:', err);
    }
  }, []);

  // Load initial users & verify active session
  useEffect(() => {
    async function initializeSessionAndUsers() {
      try {
        // 1. Fetch available users
        const res = await fetch('/api/chat');
        if (!res.ok) return;
        const data = await res.json();
        const users: User[] = data.users || [];

        if (users.length > 0) {
          setAllUsers(users);

          // 2. Check if a valid session cookie already exists on the server
          let resolvedUser: User | null = null;
          try {
            const authRes = await fetch('/api/auth/session');
            if (authRes.ok) {
              const authData = await authRes.json();
              if (authData.authenticated && authData.user) {
                resolvedUser = users.find(u => u.id === authData.user.id) || authData.user;
              }
            }
          } catch {
            // Ignore auth check error
          }

          // 3. If no server session, check local storage fallback
          if (!resolvedUser) {
            const savedId = localStorage.getItem('messagerie_current_user_id');
            if (savedId) {
              const matched = users.find((u: User) => u.id === parseInt(savedId, 10));
              if (matched) {
                resolvedUser = matched;
              }
            }
          }

          // 4. Default to first user if none resolved
          if (!resolvedUser) {
            resolvedUser = users[0];
          }

          setCurrentUser(resolvedUser);
          localStorage.setItem('messagerie_current_user_id', resolvedUser.id.toString());
          // Ensure session cookie is issued for resolved user
          await syncSession(resolvedUser.id);
        }
      } catch (e) {
        console.error('Failed to initialize chat session', e);
      }
    }
    initializeSessionAndUsers();
  }, [syncSession]);

  const handleSwitchUser = async (user: User) => {
    setCurrentUser(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('messagerie_current_user_id', user.id.toString());
    }
    await syncSession(user.id);
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
        await handleSwitchUser(data.user);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleProfileSave = (updated: User) => {
    setCurrentUser(updated);
    setAllUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
  };

  const handleReconnect = () => {
    if (reconnectTriggerRef.current) {
      reconnectTriggerRef.current();
    }
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
        connectionStatus={connectionStatus}
        onReconnect={handleReconnect}
      />

      <main className="flex-1 py-2 sm:py-3">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 h-full">
          <ErrorBoundary>
            <ChatComponent
              currentUser={currentUser}
              allUsers={allUsers}
              onOpenMobileConnect={() => setShowMobileModal(true)}
              onConnectionStatusChange={setConnectionStatus}
              reconnectTriggerRef={reconnectTriggerRef}
            />
          </ErrorBoundary>
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
