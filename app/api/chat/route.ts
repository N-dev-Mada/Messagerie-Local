import { NextRequest, NextResponse } from 'next/server';
import {
  users,
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Global search across messages
    const searchQuery = searchParams.get('search');
    if (searchQuery !== null) {
      const userIdParam = searchParams.get('userId');
      const userId = userIdParam ? parseInt(userIdParam, 10) || 1 : 1;
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
      const userId = userIdParam ? parseInt(userIdParam, 10) : undefined;

      const result = getPaginatedMessages(convId, limit, validBeforeId, userId);
      return NextResponse.json(result);
    }

    const userIdParam = searchParams.get('userId');
    const userId = userIdParam ? parseInt(userIdParam, 10) || 1 : 1;

    const limitParam = searchParams.get('limit');
    const initialLimit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 40) : 40;

    // Clean stale typing entries (> 3s)
    const now = Date.now();
    for (const [convId, data] of typingMap.entries()) {
      if (now - data.timestamp > 3000) {
        typingMap.delete(convId);
      }
    }

    const conversations = getFullConversationsForUser(userId, initialLimit);
    const activeTyping: Record<number, { userId: number; name: string }> = {};
    for (const [convId, data] of typingMap.entries()) {
      if (data.userId !== userId) {
        activeTyping[convId] = { userId: data.userId, name: data.name };
      }
    }

    return NextResponse.json({
      users,
      conversations,
      typing: activeTyping,
      onlineUsers: users.map(u => u.id),
    });
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
    const body = await req.json();
    const { action } = body;

    if (action === 'sendMessage') {
      const { conversationId, senderId, messageBody, file, replyToId } = body;
      if (!conversationId || !senderId) {
        return NextResponse.json({ error: 'Identifiants conversation ou expéditeur manquants' }, { status: 400 });
      }

      const created = createMessage({
        conversation_id: Number(conversationId),
        sender_id: Number(senderId),
        body: messageBody || null,
        file_path: file?.data || null,
        file_type: file?.type || null,
        file_name: file?.name || null,
        reply_to_id: replyToId ? Number(replyToId) : null,
      });

      // Clear typing for this conversation when sending
      typingMap.delete(Number(conversationId));

      return NextResponse.json({ success: true, message: created });
    }

    if (action === 'createGroup') {
      const { name, creatorId, participantIds } = body;
      if (!name || !participantIds || participantIds.length === 0) {
        return NextResponse.json({ error: 'Missing group details' }, { status: 400 });
      }
      const group = createGroupConversation(name, creatorId, participantIds);
      return NextResponse.json({ success: true, group });
    }

    if (action === 'startConversation') {
      const { userId, targetUserId } = body;
      const conv = getOrCreateOneOnOneConversation(userId, targetUserId);
      return NextResponse.json({ success: true, conversation: conv });
    }

    if (action === 'markAsRead') {
      const { conversationId, userId } = body;
      markConversationAsRead(Number(conversationId), Number(userId));
      return NextResponse.json({ success: true });
    }

    if (action === 'editMessage') {
      const { messageId, userId, newBody } = body;
      if (!messageId || !userId || !newBody?.trim()) {
        return NextResponse.json({ error: 'Texte ou identifiants manquants' }, { status: 400 });
      }
      const updated = editMessage(Number(messageId), Number(userId), newBody);
      if (!updated) {
        return NextResponse.json({ error: 'Impossible de modifier ce message' }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: updated });
    }

    if (action === 'deleteMessage') {
      const { messageId, userId, deleteFor } = body;
      if (!messageId || !userId) {
        return NextResponse.json({ error: 'Identifiants manquants' }, { status: 400 });
      }
      const updated = deleteMessage(Number(messageId), Number(userId), deleteFor || 'me');
      if (!updated) {
        return NextResponse.json({ error: 'Action de suppression non autorisée' }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: updated });
    }

    if (action === 'addGroupMember') {
      const { conversationId, userId, memberId } = body;
      if (!conversationId || !userId || !memberId) {
        return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
      }
      const res = addGroupMember(Number(conversationId), Number(userId), Number(memberId));
      if (res.error) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, conversation: res.conversation });
    }

    if (action === 'removeGroupMember') {
      const { conversationId, userId, memberId } = body;
      if (!conversationId || !userId || !memberId) {
        return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
      }
      const res = removeGroupMember(Number(conversationId), Number(userId), Number(memberId));
      if (res.error) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, conversation: res.conversation });
    }

    if (action === 'leaveGroup') {
      const { conversationId, userId } = body;
      if (!conversationId || !userId) {
        return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
      }
      const res = leaveGroup(Number(conversationId), Number(userId));
      if (res.error) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'setTyping') {
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
      return NextResponse.json({ success: true });
    }

    if (action === 'registerUser') {
      const { name, email } = body;
      const user = registerUser(name, email);
      return NextResponse.json({ success: true, user });
    }

    if (action === 'updateUser') {
      const { id, name, email } = body;
      const user = updateUser(id, name, email);
      return NextResponse.json({ success: true, user });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
