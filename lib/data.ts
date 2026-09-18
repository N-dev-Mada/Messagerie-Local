import { getDatabase } from './db';
import { saveBase64Media } from './mediaStorage';
import { User, Conversation, Message, QuotedMessage } from './types';

// In-memory ephemeral map for typing indicator states (TTL: 3s)
export const typingMap = new Map<number, { userId: number; name: string; timestamp: number }>();

// Database entity converters
interface DbUserRow {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

interface DbConversationRow {
  id: number;
  is_group: number;
  name: string | null;
  user_one_id: number;
  user_two_id: number;
  participants: string; // JSON array
  admin_ids: string | null; // JSON array
  created_at: string;
  updated_at: string;
}

interface DbMessageRow {
  id: number;
  conversation_id: number;
  sender_id: number;
  body: string | null;
  file_path: string | null;
  file_type: string | null;
  file_name: string | null;
  reply_to_id: number | null;
  is_read: number;
  status: string;
  is_edited: number;
  is_deleted_for_all: number;
  deleted_for_users: string | null; // JSON array
  created_at: string;
}

function rowToUser(row: DbUserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
  };
}

function parseJsonArray<T>(val: string | null | undefined, fallback: T[] = []): T[] {
  if (!val) return fallback;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function rowToConversation(row: DbConversationRow): Conversation {
  return {
    id: row.id,
    is_group: Boolean(row.is_group),
    name: row.name,
    user_one_id: row.user_one_id,
    user_two_id: row.user_two_id,
    participants: parseJsonArray<number>(row.participants),
    admin_ids: parseJsonArray<number>(row.admin_ids),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function rowToMessage(row: DbMessageRow): Message {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    body: row.body,
    file_path: row.file_path,
    file_type: row.file_type,
    file_name: row.file_name,
    reply_to_id: row.reply_to_id,
    is_read: Boolean(row.is_read),
    status: (row.status as any) || (row.is_read ? 'read' : 'delivered'),
    is_edited: Boolean(row.is_edited),
    is_deleted_for_all: Boolean(row.is_deleted_for_all),
    deleted_for_users: parseJsonArray<number>(row.deleted_for_users),
    created_at: row.created_at,
  };
}

export function getAllUsers(): User[] {
  const db = getDatabase();
  const rows: DbUserRow[] = db.prepare('SELECT id, name, email, created_at FROM users ORDER BY id ASC').all();
  return rows.map(rowToUser);
}

export function getUserById(id: number): User | null {
  const db = getDatabase();
  const row: DbUserRow | undefined = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(id);
  return row ? rowToUser(row) : null;
}

export function enrichMessage(msg: Message, userMap?: Map<number, User>): Message {
  const db = getDatabase();

  let sender = userMap ? userMap.get(msg.sender_id) : getUserById(msg.sender_id);
  if (!sender) {
    sender = { id: msg.sender_id, name: 'Utilisateur', email: '' };
  }

  let reply_to: QuotedMessage | null = null;
  if (msg.reply_to_id) {
    const qRow: DbMessageRow | undefined = db.prepare('SELECT * FROM messages WHERE id = ?').get(msg.reply_to_id);
    if (qRow) {
      const qSender = userMap ? userMap.get(qRow.sender_id) : getUserById(qRow.sender_id);
      const isDeleted = Boolean(qRow.is_deleted_for_all);
      reply_to = {
        id: qRow.id,
        sender_name: qSender?.name || 'Contact',
        body: isDeleted ? '🚫 Ce message a été supprimé' : qRow.body,
        file_name: isDeleted ? null : qRow.file_name,
        file_type: isDeleted ? null : qRow.file_type,
      };
    }
  }

  return {
    ...msg,
    sender,
    reply_to,
  };
}

export function getFullConversationsForUser(userId: number, initialMessageLimit = 40) {
  const db = getDatabase();
  const allUsers = getAllUsers();
  const userMap = new Map<number, User>(allUsers.map(u => [u.id, u]));

  const convRows: DbConversationRow[] = db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC').all();

  const userConvs: Conversation[] = [];
  for (const row of convRows) {
    const conv = rowToConversation(row);
    if (conv.is_group) {
      if (conv.participants.includes(userId)) {
        userConvs.push(conv);
      }
    } else {
      if (conv.user_one_id === userId || conv.user_two_id === userId) {
        userConvs.push(conv);
      }
    }
  }

  const enriched = userConvs.map(conv => {
    // Fetch count
    const countRow = db.prepare(`
      SELECT COUNT(*) as count FROM messages
      WHERE conversation_id = ?
    `).get(conv.id);
    const total = countRow ? Number(countRow.count) : 0;

    // Fetch messages for this conversation
    const limit = initialMessageLimit > 0 ? initialMessageLimit : 40;
    const msgRows: DbMessageRow[] = db.prepare(`
      SELECT * FROM (
        SELECT * FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ?
      ) ORDER BY created_at ASC, id ASC
    `).all(conv.id, limit);

    const messages = msgRows
      .map(rowToMessage)
      .filter(m => !m.deleted_for_users || !m.deleted_for_users.includes(userId))
      .map(m => enrichMessage(m, userMap));

    return {
      ...conv,
      messages,
      totalMessages: total,
      hasMore: total > messages.length,
      userOne: userMap.get(conv.user_one_id),
      userTwo: userMap.get(conv.user_two_id),
      participantsList: conv.participants.map(pid => userMap.get(pid)!).filter(Boolean),
    };
  });

  return enriched.sort((a, b) => {
    const aLast = a.messages[a.messages.length - 1]?.created_at || a.created_at;
    const bLast = b.messages[b.messages.length - 1]?.created_at || b.created_at;
    return new Date(bLast).getTime() - new Date(aLast).getTime();
  });
}

export function getPaginatedMessages(conversationId: number, limit = 40, beforeId?: number, userId?: number) {
  if (!conversationId || isNaN(conversationId)) {
    return { messages: [], hasMore: false, totalRemaining: 0 };
  }

  const db = getDatabase();
  const allUsers = getAllUsers();
  const userMap = new Map<number, User>(allUsers.map(u => [u.id, u]));

  let totalRemaining = 0;
  let msgRows: DbMessageRow[] = [];

  if (beforeId && !isNaN(beforeId)) {
    // Count how many messages exist with id < beforeId
    const countRow = db.prepare(`
      SELECT COUNT(*) as count FROM messages
      WHERE conversation_id = ? AND id < ?
    `).get(conversationId, beforeId);
    const countBefore = countRow ? Number(countRow.count) : 0;

    msgRows = db.prepare(`
      SELECT * FROM (
        SELECT * FROM messages
        WHERE conversation_id = ? AND id < ?
        ORDER BY id DESC
        LIMIT ?
      ) ORDER BY id ASC
    `).all(conversationId, beforeId, limit);

    totalRemaining = Math.max(0, countBefore - msgRows.length);
  } else {
    const countRow = db.prepare(`
      SELECT COUNT(*) as count FROM messages
      WHERE conversation_id = ?
    `).get(conversationId);
    const countTotal = countRow ? Number(countRow.count) : 0;

    msgRows = db.prepare(`
      SELECT * FROM (
        SELECT * FROM messages
        WHERE conversation_id = ?
        ORDER BY id DESC
        LIMIT ?
      ) ORDER BY id ASC
    `).all(conversationId, limit);

    totalRemaining = Math.max(0, countTotal - msgRows.length);
  }

  const messages = msgRows
    .map(rowToMessage)
    .filter(m => !userId || !m.deleted_for_users || !m.deleted_for_users.includes(userId))
    .map(m => enrichMessage(m, userMap));

  return {
    messages,
    hasMore: totalRemaining > 0,
    totalRemaining,
  };
}

export function createMessage(params: {
  conversation_id: number;
  sender_id: number;
  body: string | null;
  file_path: string | null;
  file_type: string | null;
  file_name?: string | null;
  reply_to_id?: number | null;
}): Message {
  const db = getDatabase();
  const nowIso = new Date().toISOString();

  let finalFilePath = params.file_path;
  let finalFileType = params.file_type;
  let finalFileName = params.file_name || null;

  // Persist base64 data to disk in /public/uploads/ to prevent RAM saturation (Anti-OOM)
  if (params.file_path && params.file_path.startsWith('data:')) {
    try {
      const stored = saveBase64Media(params.file_path, params.file_type, params.file_name);
      finalFilePath = stored.filePath;
      finalFileType = stored.fileType;
      finalFileName = stored.fileName;
    } catch (err) {
      console.error('Failed to save media file to disk:', err);
    }
  }

  const stmt = db.prepare(`
    INSERT INTO messages (
      conversation_id, sender_id, body, file_path, file_type, file_name,
      reply_to_id, is_read, status, is_edited, is_deleted_for_all, deleted_for_users, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'delivered', 0, 0, '[]', ?)
  `);

  const info = stmt.run(
    params.conversation_id,
    params.sender_id,
    params.body ? params.body.trim() : null,
    finalFilePath,
    finalFileType,
    finalFileName,
    params.reply_to_id || null,
    nowIso
  );

  const insertedId = Number(info.lastInsertRowid);

  // Update conversation updated_at
  db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(nowIso, params.conversation_id);

  const rawRow: DbMessageRow = db.prepare('SELECT * FROM messages WHERE id = ?').get(insertedId);
  return enrichMessage(rowToMessage(rawRow));
}

export function editMessage(messageId: number, userId: number, newBody: string): Message | null {
  const db = getDatabase();
  const row: DbMessageRow | undefined = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
  if (!row || row.sender_id !== userId || row.is_deleted_for_all) {
    return null;
  }

  db.prepare('UPDATE messages SET body = ?, is_edited = 1 WHERE id = ?').run(newBody.trim(), messageId);
  const updatedRow: DbMessageRow = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
  return enrichMessage(rowToMessage(updatedRow));
}

export function deleteMessage(messageId: number, userId: number, deleteFor: 'me' | 'everyone'): Message | null {
  const db = getDatabase();
  const row: DbMessageRow | undefined = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
  if (!row) return null;

  if (deleteFor === 'everyone') {
    const convRow: DbConversationRow | undefined = db.prepare('SELECT * FROM conversations WHERE id = ?').get(row.conversation_id);
    const adminIds = convRow ? parseJsonArray<number>(convRow.admin_ids) : [];
    const isGroup = convRow ? Boolean(convRow.is_group) : false;
    const isAdmin = isGroup && adminIds.includes(userId);

    if (row.sender_id !== userId && !isAdmin) {
      return null;
    }

    db.prepare(`
      UPDATE messages SET
        is_deleted_for_all = 1,
        body = '🚫 Ce message a été supprimé',
        file_path = NULL,
        file_type = NULL,
        file_name = NULL,
        reply_to_id = NULL
      WHERE id = ?
    `).run(messageId);

    const updatedRow: DbMessageRow = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
    return enrichMessage(rowToMessage(updatedRow));
  } else {
    // Delete for me
    const currentDeleted = parseJsonArray<number>(row.deleted_for_users);
    if (!currentDeleted.includes(userId)) {
      currentDeleted.push(userId);
      db.prepare('UPDATE messages SET deleted_for_users = ? WHERE id = ?').run(
        JSON.stringify(currentDeleted),
        messageId
      );
    }
    const updatedRow: DbMessageRow = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
    return enrichMessage(rowToMessage(updatedRow));
  }
}

export function createGroupConversation(name: string, creatorId: number, participantIds: number[]) {
  const db = getDatabase();
  const uniqueParticipants = Array.from(new Set([creatorId, ...participantIds]));
  const nowIso = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO conversations (is_group, name, user_one_id, user_two_id, participants, admin_ids, created_at, updated_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    name.trim(),
    creatorId,
    creatorId,
    JSON.stringify(uniqueParticipants),
    JSON.stringify([creatorId]),
    nowIso,
    nowIso
  );

  const insertedId = Number(info.lastInsertRowid);
  const row: DbConversationRow = db.prepare('SELECT * FROM conversations WHERE id = ?').get(insertedId);
  return rowToConversation(row);
}

export function addGroupMember(conversationId: number, adminUserId: number, newMemberId: number) {
  const db = getDatabase();
  const row: DbConversationRow | undefined = db.prepare('SELECT * FROM conversations WHERE id = ? AND is_group = 1').get(conversationId);
  if (!row) return { error: 'Groupe introuvable' };

  const adminIds = parseJsonArray<number>(row.admin_ids);
  if (adminIds.length > 0 && !adminIds.includes(adminUserId)) {
    return { error: 'Seuls les administrateurs peuvent ajouter des membres' };
  }

  const participants = parseJsonArray<number>(row.participants);
  if (!participants.includes(newMemberId)) {
    participants.push(newMemberId);
    const nowIso = new Date().toISOString();
    db.prepare('UPDATE conversations SET participants = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify(participants),
      nowIso,
      conversationId
    );
  }

  const updated: DbConversationRow = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
  return { success: true, conversation: rowToConversation(updated) };
}

export function removeGroupMember(conversationId: number, adminUserId: number, targetMemberId: number) {
  const db = getDatabase();
  const row: DbConversationRow | undefined = db.prepare('SELECT * FROM conversations WHERE id = ? AND is_group = 1').get(conversationId);
  if (!row) return { error: 'Groupe introuvable' };

  const adminIds = parseJsonArray<number>(row.admin_ids);
  if (adminIds.length > 0 && !adminIds.includes(adminUserId)) {
    return { error: 'Seuls les administrateurs peuvent retirer des membres' };
  }

  const participants = parseJsonArray<number>(row.participants).filter(id => id !== targetMemberId);
  const newAdminIds = adminIds.filter(id => id !== targetMemberId);
  const nowIso = new Date().toISOString();

  db.prepare('UPDATE conversations SET participants = ?, admin_ids = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(participants),
    JSON.stringify(newAdminIds),
    nowIso,
    conversationId
  );

  const updated: DbConversationRow = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
  return { success: true, conversation: rowToConversation(updated) };
}

export function leaveGroup(conversationId: number, userId: number) {
  const db = getDatabase();
  const row: DbConversationRow | undefined = db.prepare('SELECT * FROM conversations WHERE id = ? AND is_group = 1').get(conversationId);
  if (!row) return { error: 'Groupe introuvable' };

  const participants = parseJsonArray<number>(row.participants).filter(id => id !== userId);
  let adminIds = parseJsonArray<number>(row.admin_ids).filter(id => id !== userId);
  if (adminIds.length === 0 && participants.length > 0) {
    adminIds = [participants[0]];
  }
  const nowIso = new Date().toISOString();

  db.prepare('UPDATE conversations SET participants = ?, admin_ids = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(participants),
    JSON.stringify(adminIds),
    nowIso,
    conversationId
  );

  return { success: true };
}

export function getOrCreateOneOnOneConversation(userA: number, userB: number): Conversation {
  const db = getDatabase();
  const one = Math.min(userA, userB);
  const two = Math.max(userA, userB);

  const existingRow: DbConversationRow | undefined = db.prepare(`
    SELECT * FROM conversations
    WHERE is_group = 0 AND user_one_id = ? AND user_two_id = ?
  `).get(one, two);

  if (existingRow) {
    return rowToConversation(existingRow);
  }

  const nowIso = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO conversations (is_group, name, user_one_id, user_two_id, participants, admin_ids, created_at, updated_at)
    VALUES (0, NULL, ?, ?, ?, NULL, ?, ?)
  `);

  const info = stmt.run(one, two, JSON.stringify([one, two]), nowIso, nowIso);
  const insertedId = Number(info.lastInsertRowid);
  const newRow: DbConversationRow = db.prepare('SELECT * FROM conversations WHERE id = ?').get(insertedId);
  return rowToConversation(newRow);
}

export function markConversationAsRead(conversationId: number, readerId: number) {
  const db = getDatabase();
  db.prepare(`
    UPDATE messages
    SET is_read = 1, status = 'read'
    WHERE conversation_id = ? AND sender_id != ?
  `).run(conversationId, readerId);
}

export function registerUser(name: string, email: string): User {
  const db = getDatabase();
  const existingRow: DbUserRow | undefined = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  if (existingRow) {
    return rowToUser(existingRow);
  }

  const info = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name.trim(), email.trim());
  const insertedId = Number(info.lastInsertRowid);
  const newRow: DbUserRow = db.prepare('SELECT * FROM users WHERE id = ?').get(insertedId);
  return rowToUser(newRow);
}

export function updateUser(id: number, name: string, email: string): User | null {
  const db = getDatabase();
  db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name.trim(), email.trim(), id);
  const updatedRow: DbUserRow | undefined = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return updatedRow ? rowToUser(updatedRow) : null;
}

export interface SearchResultItem {
  message: Message;
  conversationId: number;
  conversationName: string;
  isGroup: boolean;
  senderName: string;
  matchedText: string;
  createdAt: string;
}

export function searchGlobalMessages(userId: number, query: string): SearchResultItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const db = getDatabase();
  const allUsers = getAllUsers();
  const userMap = new Map<number, User>(allUsers.map(u => [u.id, u]));

  // Get conversations the user belongs to
  const convRows: DbConversationRow[] = db.prepare('SELECT * FROM conversations').all();
  const userConvs = convRows.map(rowToConversation).filter(c => c.participants.includes(userId));
  const convMap = new Map<number, Conversation>(userConvs.map(c => [c.id, c]));

  if (userConvs.length === 0) return [];

  const msgRows: DbMessageRow[] = db.prepare(`
    SELECT * FROM messages
    WHERE is_deleted_for_all = 0
      AND (LOWER(body) LIKE ? OR LOWER(file_name) LIKE ?)
    ORDER BY created_at DESC
    LIMIT 100
  `).all(`%${q}%`, `%${q}%`);

  const results: SearchResultItem[] = [];

  for (const row of msgRows) {
    if (!convMap.has(row.conversation_id)) continue;

    const deletedFor = parseJsonArray<number>(row.deleted_for_users);
    if (deletedFor.includes(userId)) continue;

    const conv = convMap.get(row.conversation_id)!;
    let convName = conv.name;
    if (!conv.is_group) {
      const otherId = conv.participants.find(p => p !== userId) || userId;
      const otherUser = userMap.get(otherId);
      convName = otherUser ? otherUser.name : 'Discussion privée';
    }

    const sender = userMap.get(row.sender_id);
    const senderName = row.sender_id === userId ? 'Vous' : (sender ? sender.name : 'Utilisateur');
    const msg = enrichMessage(rowToMessage(row), userMap);

    results.push({
      message: msg,
      conversationId: row.conversation_id,
      conversationName: convName || 'Conversation',
      isGroup: conv.is_group,
      senderName,
      matchedText: msg.body || msg.file_name || '',
      createdAt: msg.created_at,
    });
  }

  return results;
}
