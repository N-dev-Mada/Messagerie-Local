import { User, Conversation, Message, QuotedMessage } from './types';

// Pre-seeded users matching Laravel DatabaseSeeder
export let users: User[] = [
  { id: 1, name: 'John Doe', email: 'test@example.com' },
  { id: 2, name: 'Alice Smith', email: 'alice@example.com' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com' },
  { id: 4, name: 'Charlie Brown', email: 'charlie@example.com' },
  { id: 5, name: 'David Miller', email: 'david@example.com' },
  { id: 6, name: 'Emma Watson', email: 'emma@example.com' },
];

export let conversations: Conversation[] = [
  {
    id: 1,
    is_group: false,
    name: null,
    user_one_id: 1,
    user_two_id: 2,
    participants: [1, 2],
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    updated_at: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 2,
    is_group: true,
    name: 'Équipe Projet Messagerie',
    user_one_id: 1,
    user_two_id: 1,
    participants: [1, 2, 3, 6],
    admin_ids: [1],
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 3,
    is_group: false,
    name: null,
    user_one_id: 1,
    user_two_id: 3,
    participants: [1, 3],
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

// Helper to generate a realistic history of messages in Conversation 1 to test pagination (> 40 messages)
const seededHistoricalMessages: Message[] = [];
let mId = 1;
const baseTime = Date.now() - 3600000 * 20; // 20 hours ago

const dialoguePrompts = [
  { s: 2, t: 'Bonjour John ! As-tu réussi à configurer le routeur local pour le bureau ?' },
  { s: 1, t: 'Salut Alice ! Oui, l’adresse IP locale est bien attribuée et stable.' },
  { s: 2, t: 'Superbe. Le temps de réponse sur le Wi-Fi est quasi instantané.' },
  { s: 1, t: 'Exactement, moins de 5ms entre les deux postes.' },
  { s: 2, t: 'Est-ce qu’on a testé l’envoi de gros fichiers sans compression ?' },
  { s: 1, t: 'On a constaté que les photos brutes de 12 Mo ralentissaient l’affichage.' },
  { s: 2, t: 'Oui, c’est pour ça qu’une conversion WebP automatique côté client est indispensable.' },
  { s: 1, t: 'Tout à fait, le canvas HTML5 redimensionne jusqu’à 1920px max sans perte visible.' },
  { s: 2, t: 'Et pour l’historique des conversations avec des centaines de messages ?' },
  { s: 1, t: 'On charge les 40 derniers messages au démarrage, puis les anciens au scroll vers le haut.' },
  { s: 2, t: 'Génial ! Le scroll virtuel évite de saturer le DOM sur mobile.' },
  { s: 1, t: 'Exact, et la position de défilement est conservée sans aucun saut.' },
  { s: 2, t: 'As-tu pensé au sélecteur d’émojis pour agrémenter les discussions ?' },
  { s: 1, t: 'Oui, avec recherche rapide par mots-clés et catégories.' },
  { s: 2, t: 'Parfait, c’est exactement l’expérience familière de WhatsApp.' },
  { s: 1, t: 'Je prépare une démonstration pour toute l’équipe cet après-midi.' },
  { s: 2, t: 'Bob et Charlie seront là aussi ?' },
  { s: 1, t: 'Oui, ils sont connectés sur le réseau local.' },
  { s: 2, t: 'Très bien, je leur envoie un rappel tout de suite.' },
  { s: 1, t: 'Merci beaucoup Alice.' },
  { s: 2, t: 'De rien ! As-tu vérifié les permissions sur le répertoire partagé ?' },
  { s: 1, t: 'Oui, lecture et écriture sans restriction pour les membres du groupe.' },
  { s: 2, t: 'Top. Et pour la sécurité sur le LAN ?' },
  { s: 1, t: 'L’isolation du sous-réseau est active.' },
  { s: 2, t: 'Impeccable.' },
  { s: 1, t: 'Voici la liste des points techniques validés pour la Phase 1.' },
  { s: 2, t: 'Je la lis attentivement.' },
  { s: 1, t: '1. Compression d’image WebP par canvas.' },
  { s: 2, t: '2. Pagination dynamique 40 messages avec scroll infini ascendant.' },
  { s: 1, t: '3. Sélecteur d’émojis natif intégré dans la barre de saisie.' },
  { s: 2, t: '4. Maintien parfait de l’interface WhatsApp.' },
  { s: 1, t: 'Les tests de performance sont très concluants.' },
  { s: 2, t: 'Le chargement initial est ultra fluide maintenant.' },
  { s: 1, t: 'Oui, plus de latence même sur un vieux smartphone.' },
  { s: 2, t: 'C’est une énorme amélioration par rapport au chargement complet.' },
  { s: 1, t: 'Je vais continuer à ajouter des échanges pour enrichir la base de test.' },
  { s: 2, t: 'Bonne idée, plus on a de messages, mieux on teste le scroll.' },
  { s: 1, t: 'On approche des 50 messages dans ce canal.' },
  { s: 2, t: 'Excellent pour valider le chargement par tranches !' },
  { s: 1, t: 'Tu peux faire défiler tout en haut pour voir les premiers messages apparaître.' },
  { s: 2, t: 'Ça fonctionne immédiatement sans saccade.' },
  { s: 1, t: 'Tous les indicateurs sont au vert.' },
  { s: 2, t: 'Parfait, continuons le suivi sur ce canal !' },
  { s: 1, t: 'Je reste disponible si tu as la moindre remarque.' },
  { s: 2, t: 'Merci John, à tout de suite !' },
];

dialoguePrompts.forEach((item, index) => {
  seededHistoricalMessages.push({
    id: mId++,
    conversation_id: 1,
    sender_id: item.s,
    body: item.t,
    file_path: null,
    file_type: null,
    is_read: true,
    created_at: new Date(baseTime + index * 1200000).toISOString(),
  });
});

// Add group messages for Conversation 2
const groupMessages: Message[] = [
  {
    id: mId++,
    conversation_id: 2,
    sender_id: 3,
    body: 'Bonjour à tous ! Ravi de tester le nouveau groupe de discussion de l’équipe.',
    file_path: null,
    file_type: null,
    is_read: true,
    created_at: new Date(Date.now() - 86400000 + 10000).toISOString(),
  },
  {
    id: mId++,
    conversation_id: 2,
    sender_id: 6,
    body: 'Superbe interface inspirée de WhatsApp ! Les pièces jointes et émojis sont également supportés.',
    file_path: null,
    file_type: null,
    is_read: false,
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

// Add 1-on-1 messages for Conversation 3
const conv3Messages: Message[] = [
  {
    id: mId++,
    conversation_id: 3,
    sender_id: 3,
    body: 'Est-ce que tu as pu regarder les documents envoyés hier ?',
    file_path: null,
    file_type: null,
    is_read: false,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

export let messages: Message[] = [
  ...seededHistoricalMessages,
  ...groupMessages,
  ...conv3Messages,
];

let nextUserId = 7;
let nextConvId = 4;
let nextMsgId = mId;

// In-memory typing indicator store: conversationId -> { [userId: number]: timestamp }
export const typingMap = new Map<number, { userId: number; name: string; timestamp: number }>();

function enrichMessage(m: Message): Message {
  let reply_to = m.reply_to;
  if (m.reply_to_id && !reply_to) {
    const quoted = messages.find(q => q.id === m.reply_to_id);
    if (quoted) {
      const qSender = users.find(u => u.id === quoted.sender_id);
      reply_to = {
        id: quoted.id,
        sender_name: qSender?.name || 'Contact',
        body: quoted.is_deleted_for_all ? '🚫 Ce message a été supprimé' : quoted.body,
        file_name: quoted.is_deleted_for_all ? null : quoted.file_name,
        file_type: quoted.is_deleted_for_all ? null : quoted.file_type,
      };
    }
  }
  return {
    ...m,
    status: m.status || (m.is_read ? 'read' : 'delivered'),
    is_edited: m.is_edited || false,
    is_deleted_for_all: m.is_deleted_for_all || false,
    deleted_for_users: m.deleted_for_users || [],
    sender: users.find(u => u.id === m.sender_id),
    reply_to,
  };
}

export function getFullConversationsForUser(userId: number, initialMessageLimit = 40) {
  const userConvs = conversations.filter(c => {
    if (c.is_group) {
      return c.participants.includes(userId);
    }
    return c.user_one_id === userId || c.user_two_id === userId;
  });

  const enriched = userConvs.map(conv => {
    const allConvMessages = messages
      .filter(m => m.conversation_id === conv.id && (!m.deleted_for_users || !m.deleted_for_users.includes(userId)))
      .map(enrichMessage)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const total = allConvMessages.length;
    // Initial slice: only the last initialMessageLimit messages
    const slicedMessages = initialMessageLimit > 0 && total > initialMessageLimit
      ? allConvMessages.slice(-initialMessageLimit)
      : allConvMessages;

    return {
      ...conv,
      messages: slicedMessages,
      totalMessages: total,
      hasMore: total > slicedMessages.length,
      userOne: users.find(u => u.id === conv.user_one_id),
      userTwo: users.find(u => u.id === conv.user_two_id),
      participantsList: conv.participants.map(pid => users.find(u => u.id === pid)!).filter(Boolean),
    };
  });

  // Sort by last message date descending
  return enriched.sort((a, b) => {
    const aLast = a.messages[a.messages.length - 1]?.created_at || a.created_at;
    const bLast = b.messages[b.messages.length - 1]?.created_at || b.created_at;
    return new Date(bLast).getTime() - new Date(aLast).getTime();
  });
}

/**
 * Paginate older messages for a conversation when scrolling upwards.
 * If beforeId is provided, returns messages strictly before that ID.
 */
export function getPaginatedMessages(conversationId: number, limit = 40, beforeId?: number, userId?: number) {
  if (!conversationId || isNaN(conversationId)) {
    return { messages: [], hasMore: false, totalRemaining: 0 };
  }

  const allConvMessages = messages
    .filter(m => m.conversation_id === conversationId && (!userId || !m.deleted_for_users || !m.deleted_for_users.includes(userId)))
    .map(enrichMessage)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  let filtered = allConvMessages;
  if (beforeId && !isNaN(beforeId)) {
    const index = allConvMessages.findIndex(m => m.id === beforeId);
    if (index !== -1) {
      filtered = allConvMessages.slice(0, index);
    } else {
      filtered = allConvMessages.filter(m => m.id < beforeId);
    }
  }

  const totalOlder = filtered.length;
  const chunk = limit > 0 && totalOlder > limit ? filtered.slice(-limit) : filtered;
  const hasMore = totalOlder > chunk.length;

  return {
    messages: chunk,
    hasMore,
    totalRemaining: Math.max(0, totalOlder - chunk.length),
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
}) {
  let reply_to: QuotedMessage | null = null;
  if (params.reply_to_id) {
    const quoted = messages.find(m => m.id === params.reply_to_id);
    if (quoted) {
      const qSender = users.find(u => u.id === quoted.sender_id);
      reply_to = {
        id: quoted.id,
        sender_name: qSender?.name || 'Contact',
        body: quoted.is_deleted_for_all ? '🚫 Ce message a été supprimé' : quoted.body,
        file_name: quoted.is_deleted_for_all ? null : quoted.file_name,
        file_type: quoted.is_deleted_for_all ? null : quoted.file_type,
      };
    }
  }

  const newMsg: Message = {
    id: nextMsgId++,
    conversation_id: params.conversation_id,
    sender_id: params.sender_id,
    body: params.body ? params.body.trim() : null,
    file_path: params.file_path,
    file_type: params.file_type,
    file_name: params.file_name,
    reply_to_id: params.reply_to_id || null,
    reply_to,
    is_read: false,
    status: 'delivered',
    is_edited: false,
    is_deleted_for_all: false,
    deleted_for_users: [],
    created_at: new Date().toISOString(),
  };

  messages.push(newMsg);

  // Update conversation updated_at
  const conv = conversations.find(c => c.id === params.conversation_id);
  if (conv) {
    conv.updated_at = newMsg.created_at;
  }

  return {
    ...newMsg,
    sender: users.find(u => u.id === newMsg.sender_id),
    reply_to,
  };
}

export function editMessage(messageId: number, userId: number, newBody: string) {
  const msg = messages.find(m => m.id === messageId);
  if (!msg || msg.sender_id !== userId || msg.is_deleted_for_all) {
    return null;
  }
  msg.body = newBody.trim();
  msg.is_edited = true;
  return enrichMessage(msg);
}

export function deleteMessage(messageId: number, userId: number, deleteFor: 'me' | 'everyone') {
  const msg = messages.find(m => m.id === messageId);
  if (!msg) return null;

  if (deleteFor === 'everyone') {
    const conv = conversations.find(c => c.id === msg.conversation_id);
    const isAdmin = Boolean(conv?.is_group && conv?.admin_ids?.includes(userId));
    if (msg.sender_id !== userId && !isAdmin) {
      return null;
    }
    msg.is_deleted_for_all = true;
    msg.body = '🚫 Ce message a été supprimé';
    msg.file_path = null;
    msg.file_type = null;
    msg.file_name = null;
    msg.reply_to = null;
    msg.reply_to_id = null;
    return enrichMessage(msg);
  } else {
    // Delete for me
    if (!msg.deleted_for_users) msg.deleted_for_users = [];
    if (!msg.deleted_for_users.includes(userId)) {
      msg.deleted_for_users.push(userId);
    }
    return enrichMessage(msg);
  }
}

export function createGroupConversation(name: string, creatorId: number, participantIds: number[]) {
  const uniqueParticipants = Array.from(new Set([creatorId, ...participantIds]));
  const conv: Conversation = {
    id: nextConvId++,
    is_group: true,
    name: name.trim(),
    user_one_id: creatorId,
    user_two_id: creatorId,
    participants: uniqueParticipants,
    admin_ids: [creatorId],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  conversations.push(conv);
  return conv;
}

export function addGroupMember(conversationId: number, adminUserId: number, newMemberId: number) {
  const conv = conversations.find(c => c.id === conversationId && c.is_group);
  if (!conv) return { error: 'Groupe introuvable' };
  if (conv.admin_ids && conv.admin_ids.length > 0 && !conv.admin_ids.includes(adminUserId)) {
    return { error: 'Seuls les administrateurs peuvent ajouter des membres' };
  }
  if (!conv.participants.includes(newMemberId)) {
    conv.participants.push(newMemberId);
    conv.updated_at = new Date().toISOString();
  }
  return { success: true, conversation: conv };
}

export function removeGroupMember(conversationId: number, adminUserId: number, targetMemberId: number) {
  const conv = conversations.find(c => c.id === conversationId && c.is_group);
  if (!conv) return { error: 'Groupe introuvable' };
  if (conv.admin_ids && conv.admin_ids.length > 0 && !conv.admin_ids.includes(adminUserId)) {
    return { error: 'Seuls les administrateurs peuvent retirer des membres' };
  }
  conv.participants = conv.participants.filter(id => id !== targetMemberId);
  if (conv.admin_ids) {
    conv.admin_ids = conv.admin_ids.filter(id => id !== targetMemberId);
  }
  conv.updated_at = new Date().toISOString();
  return { success: true, conversation: conv };
}

export function leaveGroup(conversationId: number, userId: number) {
  const conv = conversations.find(c => c.id === conversationId && c.is_group);
  if (!conv) return { error: 'Groupe introuvable' };
  conv.participants = conv.participants.filter(id => id !== userId);
  if (conv.admin_ids) {
    conv.admin_ids = conv.admin_ids.filter(id => id !== userId);
    if (conv.admin_ids.length === 0 && conv.participants.length > 0) {
      conv.admin_ids = [conv.participants[0]];
    }
  }
  conv.updated_at = new Date().toISOString();
  return { success: true, conversation: conv };
}

export function getOrCreateOneOnOneConversation(userA: number, userB: number) {
  const one = Math.min(userA, userB);
  const two = Math.max(userA, userB);

  let conv = conversations.find(c => !c.is_group && c.user_one_id === one && c.user_two_id === two);
  if (!conv) {
    conv = {
      id: nextConvId++,
      is_group: false,
      name: null,
      user_one_id: one,
      user_two_id: two,
      participants: [one, two],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    conversations.push(conv);
  }
  return conv;
}

export function markConversationAsRead(conversationId: number, readerId: number) {
  messages.forEach(m => {
    if (m.conversation_id === conversationId && m.sender_id !== readerId) {
      m.is_read = true;
      m.status = 'read';
    }
  });
}

export function registerUser(name: string, email: string) {
  const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return existing;
  }
  const newUser: User = {
    id: nextUserId++,
    name,
    email,
  };
  users.push(newUser);
  return newUser;
}

export function updateUser(id: number, name: string, email: string) {
  const user = users.find(u => u.id === id);
  if (user) {
    user.name = name;
    user.email = email;
  }
  return user;
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

  // Get conversations the user is a participant of
  const userConvs = conversations.filter(c => c.participants.includes(userId));
  const convMap = new Map<number, Conversation>();
  userConvs.forEach(c => convMap.set(c.id, c));

  const results: SearchResultItem[] = [];

  for (const m of messages) {
    if (!convMap.has(m.conversation_id)) continue;
    if (m.deleted_for_users && m.deleted_for_users.includes(userId)) continue;
    if (m.is_deleted_for_all) continue;

    const bodyMatch = m.body && m.body.toLowerCase().includes(q);
    const fileMatch = m.file_name && m.file_name.toLowerCase().includes(q);

    if (bodyMatch || fileMatch) {
      const conv = convMap.get(m.conversation_id)!;
      let convName = conv.name;
      if (!conv.is_group) {
        const otherId = conv.participants.find(p => p !== userId) || userId;
        const otherUser = users.find(u => u.id === otherId);
        convName = otherUser ? otherUser.name : 'Discussion privée';
      }

      const sender = users.find(u => u.id === m.sender_id);
      const senderName = m.sender_id === userId ? 'Vous' : (sender ? sender.name : 'Utilisateur');

      results.push({
        message: m,
        conversationId: m.conversation_id,
        conversationName: convName || 'Conversation',
        isGroup: conv.is_group,
        senderName,
        matchedText: m.body || m.file_name || '',
        createdAt: m.created_at,
      });
    }
  }

  // Sort by recent first
  return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

