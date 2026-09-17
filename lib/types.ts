export interface User {
  id: number;
  name: string;
  email: string;
}

export interface QuotedMessage {
  id: number;
  sender_name: string;
  body: string | null;
  file_name?: string | null;
  file_type?: string | null;
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read';

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender?: User;
  body: string | null;
  file_path: string | null;
  file_type: string | null;
  file_name?: string | null;
  reply_to_id?: number | null;
  reply_to?: QuotedMessage | null;
  is_read: boolean;
  status?: MessageStatus;
  is_edited?: boolean;
  is_deleted_for_all?: boolean;
  deleted_for_users?: number[];
  is_offline_queued?: boolean;
  created_at: string;
}

export interface Conversation {
  id: number;
  is_group: boolean;
  name: string | null;
  user_one_id: number;
  user_two_id: number;
  participants: number[]; // user IDs
  admin_ids?: number[]; // group admins
  created_at: string;
  updated_at: string;
  // Computed / expanded relations
  messages?: Message[];
  hasMore?: boolean;
  totalMessages?: number;
  userOne?: User;
  userTwo?: User;
  participantsList?: User[];
}
