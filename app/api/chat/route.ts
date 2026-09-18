import { NextRequest, NextResponse } from 'next/server';
import {
  getAllUsers,
  getFullConversationsForUser,
  getPaginatedMessages,
  createMessage,
  createGroupConversation,
  getOrCreateOneOnOneConversation,
  markConversationAsRead,
  editMessage,
  deleteMessage,
  addGroupMember,
  removeGroupMember,
  leaveGroup,
  registerUser,
  updateUser,
  searchGlobalMessages,
  typingMap,
} from '@/lib/data';
import { ChatActionSchema } from '@/lib/validation';
import { chatEventEmitter } from '@/lib/sseEvents';
import { getSessionFromRequest, setSessionCookie } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    const { searchParams } = new URL(req.url);

    // Global search across messages
    const searchQuery = searchParams.get('search');
    if (searchQuery !== null) {
      const userIdParam = searchParams.get('userId');
      const requestedId = userIdParam ? parseInt(userIdParam, 10) || 1 : 1;
      // Enforce authenticated user scope if session exists
      const userId = session ? session.userId : requestedId;
      const results = searchGlobalMessages(userId, searchQuery);
      return NextResponse.json({ results });
    }

    // If specific conversation messages pagination requested
    const conversationIdParam = searchParams.get('conversationId');
    if (conversationIdParam !== null) {
      const convId = parseInt(conversationIdParam, 10);
      if (isNaN(convId) || convId <= 0) {
        return NextResponse.json({
          messages: [],
          hasMore: false,
          totalRemaining: 0,
        });
      }

      const beforeIdParam = searchParams.get('beforeId');
      const beforeId = beforeIdParam ? parseInt(beforeIdParam, 10) : undefined;
      const validBeforeId = beforeId && !isNaN(beforeId) ? beforeId : undefined;

      const limitParam = searchParams.get('limit');
      const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 40) : 40;

      const userIdParam = searchParams.get('userId');
      const requestedId = userIdParam ? parseInt(userIdParam, 10) : undefined;
      const userId = session ? session.userId : requestedId;

      const result = getPaginatedMessages(convId, limit, validBeforeId, userId);
      return NextResponse.json(result);
    }

    const userIdParam = searchParams.get('userId');
    const fallbackId = userIdParam ? parseInt(userIdParam, 10) || 1 : 1;
    const userId = session ? session.userId : fallbackId;

    const limitParam = searchParams.get('limit');
    const initialLimit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 40) : 40;

    // Clean stale typing entries (> 3s)
    const now = Date.now();
    for (const [convId, data] of typingMap.entries()) {
      if (now - data.timestamp > 3000) {
        typingMap.delete(convId);
      }
    }

    const allUsers = getAllUsers();
    const conversations = getFullConversationsForUser(userId, initialLimit);
    const activeTyping: Record<number, { userId: number; name: string }> = {};
    for (const [convId, data] of typingMap.entries()) {
      if (data.userId !== userId) {
        activeTyping[convId] = { userId: data.userId, name: data.name };
      }
    }

    const response = NextResponse.json({
      users: allUsers,
      conversations,
      typing: activeTyping,
      onlineUsers: allUsers.map(u => u.id),
      currentUserId: userId,
    });

    // Auto-bootstrap session cookie on initial GET if no session was present
    if (!session) {
      setSessionCookie(response, userId);
    }

    return response;
  } catch (err: any) {
    console.error('GET /api/chat error:', err);
    return NextResponse.json(
      {
        error: 'Failed to retrieve chat data',
        users: [],
        conversations: [],
        typing: {},
        onlineUsers: [],
      },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 });
    }

    // Validate payload against strict Zod schema
    const validationResult = ChatActionSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMsg = validationResult.error.issues
        .map(i => `${i.path.join('.') || 'root'}: ${i.message}`)
        .join(', ');
      return NextResponse.json({ error: `Validation échouée: ${errorMsg}` }, { status: 400 });
    }

    const body = validationResult.data;

    // Except for user registration, verify session authentication & identity
    if (body.action !== 'registerUser') {
      if (!session) {
        return NextResponse.json(
          { error: 'Non authentifié. Session expirée ou invalide. Veuillez sélectionner un profil.' },
          { status: 401 }
        );
      }

      // Enforce authorization: prevent identity forgery for all actions
      const authenticatedUserId = session.userId;
      let requestedUserId: number | undefined;

      if (body.action === 'sendMessage') requestedUserId = body.senderId;
      else if (body.action === 'createGroup') requestedUserId = body.creatorId;
      else if (body.action === 'updateUser') requestedUserId = body.id;
      else requestedUserId = (body as any).userId;

      if (requestedUserId !== undefined && requestedUserId !== authenticatedUserId) {
        return NextResponse.json(
          { error: 'Action refusée : usurpation d\'identité interdite (userId ne correspond pas à la session).' },
          { status: 403 }
        );
      }
    }

    switch (body.action) {
      case 'sendMessage': {
        const { conversationId, senderId, messageBody, file, replyToId } = body;

        const created = createMessage({
          conversation_id: conversationId,
          sender_id: senderId,
          body: messageBody || null,
          file_path: file?.data || null,
          file_type: file?.type || null,
          file_name: file?.name || null,
          reply_to_id: replyToId || null,
        });

        // Clear typing for this conversation when sending
        typingMap.delete(conversationId);

        // Emit SSE event to all connected clients
        chatEventEmitter.emit('message_created', {
          conversationId,
          messageId: created.id,
          userId: senderId,
          data: { message: created },
        });

        return NextResponse.json({ success: true, message: created });
      }

      case 'createGroup': {
        const { name, creatorId, participantIds } = body;
        const group = createGroupConversation(name, creatorId, participantIds);

        chatEventEmitter.emit('conversation_updated', {
          conversationId: group.id,
          userId: creatorId,
          data: { group },
        });

        return NextResponse.json({ success: true, group });
      }

      case 'startConversation': {
        const { userId, targetUserId } = body;
        const conv = getOrCreateOneOnOneConversation(userId, targetUserId);

        chatEventEmitter.emit('conversation_updated', {
          conversationId: conv.id,
          userId,
          data: { conversation: conv },
        });

        return NextResponse.json({ success: true, conversation: conv });
      }

      case 'markAsRead': {
        const { conversationId, userId } = body;
        markConversationAsRead(conversationId, userId);

        chatEventEmitter.emit('conversation_updated', {
          conversationId,
          userId,
          data: { action: 'markAsRead' },
        });

        return NextResponse.json({ success: true });
      }

      case 'editMessage': {
        const { messageId, userId, newBody } = body;
        const updated = editMessage(messageId, userId, newBody);
        if (!updated) {
          return NextResponse.json({ error: 'Modification non autorisée ou message introuvable' }, { status: 403 });
        }

        chatEventEmitter.emit('message_edited', {
          conversationId: updated.conversation_id,
          messageId: updated.id,
          userId,
          data: { message: updated },
        });

        return NextResponse.json({ success: true, message: updated });
      }

      case 'deleteMessage': {
        const { messageId, userId, deleteFor } = body;
        const updated = deleteMessage(messageId, userId, deleteFor);
        if (!updated) {
          return NextResponse.json({ error: 'Suppression non autorisée ou message introuvable' }, { status: 403 });
        }

        chatEventEmitter.emit('message_deleted', {
          conversationId: updated.conversation_id,
          messageId: updated.id,
          userId,
          data: { message: updated, deleteFor },
        });

        return NextResponse.json({ success: true, message: updated });
      }

      case 'addGroupMember': {
        const { conversationId, userId, memberId } = body;
        const res = addGroupMember(conversationId, userId, memberId);
        if (res.error) {
          return NextResponse.json({ error: res.error }, { status: 403 });
        }

        chatEventEmitter.emit('conversation_updated', {
          conversationId,
          userId,
          data: { memberId, action: 'add' },
        });

        return NextResponse.json({ success: true, conversation: res.conversation });
      }

      case 'removeGroupMember': {
        const { conversationId, userId, memberId } = body;
        const res = removeGroupMember(conversationId, userId, memberId);
        if (res.error) {
          return NextResponse.json({ error: res.error }, { status: 403 });
        }

        chatEventEmitter.emit('conversation_updated', {
          conversationId,
          userId,
          data: { memberId, action: 'remove' },
        });

        return NextResponse.json({ success: true, conversation: res.conversation });
      }

      case 'leaveGroup': {
        const { conversationId, userId } = body;
        const res = leaveGroup(conversationId, userId);
        if (res.error) {
          return NextResponse.json({ error: res.error }, { status: 400 });
        }

        chatEventEmitter.emit('conversation_updated', {
          conversationId,
          userId,
          data: { action: 'leave' },
        });

        return NextResponse.json({ success: true });
      }

      case 'setTyping': {
        const { conversationId, userId, userName, isTyping } = body;
        if (isTyping) {
          typingMap.set(conversationId, {
            userId,
            name: userName,
            timestamp: Date.now(),
          });
        } else {
          typingMap.delete(conversationId);
        }

        chatEventEmitter.emit('typing_changed', {
          conversationId,
          userId,
          data: { userName, isTyping },
        });

        return NextResponse.json({ success: true });
      }

      case 'registerUser': {
        const { name, email } = body;
        const user = registerUser(name, email);

        chatEventEmitter.emit('user_registered', {
          userId: user.id,
          data: { user },
        });

        const response = NextResponse.json({ success: true, user });
        setSessionCookie(response, user.id);
        return response;
      }

      case 'updateUser': {
        const { id, name, email } = body;
        const user = updateUser(id, name, email);
        if (!user) {
          return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
        }

        chatEventEmitter.emit('user_registered', {
          userId: user.id,
          data: { user },
        });

        return NextResponse.json({ success: true, user });
      }
    }
  } catch (error: any) {
    console.error('POST /api/chat error:', error);
    return NextResponse.json({ error: error?.message || 'Erreur interne du serveur' }, { status: 500 });
  }
}
