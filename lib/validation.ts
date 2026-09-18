import { z } from 'zod';

export const SendMessageSchema = z.object({
  action: z.literal('sendMessage'),
  conversationId: z.coerce.number().int().positive('conversationId must be a positive integer'),
  senderId: z.coerce.number().int().positive('senderId must be a positive integer'),
  messageBody: z.string().nullable().optional(),
  file: z
    .object({
      data: z.string().min(1, 'File data cannot be empty'),
      type: z.string().optional().nullable(),
      name: z.string().optional().nullable(),
    })
    .nullable()
    .optional(),
  replyToId: z.coerce.number().int().positive().nullable().optional(),
}).refine(data => Boolean(data.messageBody?.trim() || data.file?.data), {
  message: 'A message must contain either text content or an attached file',
});

export const CreateGroupSchema = z.object({
  action: z.literal('createGroup'),
  name: z.string().trim().min(1, 'Group name cannot be empty').max(100, 'Group name too long'),
  creatorId: z.coerce.number().int().positive('creatorId must be a positive integer'),
  participantIds: z.array(z.coerce.number().int().positive()).min(1, 'At least one participant is required'),
});

export const StartConversationSchema = z.object({
  action: z.literal('startConversation'),
  userId: z.coerce.number().int().positive('userId must be a positive integer'),
  targetUserId: z.coerce.number().int().positive('targetUserId must be a positive integer'),
}).refine(data => data.userId !== data.targetUserId, {
  message: 'Cannot start a one-on-one conversation with oneself',
});

export const MarkAsReadSchema = z.object({
  action: z.literal('markAsRead'),
  conversationId: z.coerce.number().int().positive('conversationId must be a positive integer'),
  userId: z.coerce.number().int().positive('userId must be a positive integer'),
});

export const EditMessageSchema = z.object({
  action: z.literal('editMessage'),
  messageId: z.coerce.number().int().positive('messageId must be a positive integer'),
  userId: z.coerce.number().int().positive('userId must be a positive integer'),
  newBody: z.string().trim().min(1, 'Message body cannot be empty').max(5000, 'Message too long'),
});

export const DeleteMessageSchema = z.object({
  action: z.literal('deleteMessage'),
  messageId: z.coerce.number().int().positive('messageId must be a positive integer'),
  userId: z.coerce.number().int().positive('userId must be a positive integer'),
  deleteFor: z.enum(['me', 'everyone']).optional().default('me'),
});

export const AddGroupMemberSchema = z.object({
  action: z.literal('addGroupMember'),
  conversationId: z.coerce.number().int().positive('conversationId must be a positive integer'),
  userId: z.coerce.number().int().positive('userId must be a positive integer'),
  memberId: z.coerce.number().int().positive('memberId must be a positive integer'),
});

export const RemoveGroupMemberSchema = z.object({
  action: z.literal('removeGroupMember'),
  conversationId: z.coerce.number().int().positive('conversationId must be a positive integer'),
  userId: z.coerce.number().int().positive('userId must be a positive integer'),
  memberId: z.coerce.number().int().positive('memberId must be a positive integer'),
});

export const LeaveGroupSchema = z.object({
  action: z.literal('leaveGroup'),
  conversationId: z.coerce.number().int().positive('conversationId must be a positive integer'),
  userId: z.coerce.number().int().positive('userId must be a positive integer'),
});

export const SetTypingSchema = z.object({
  action: z.literal('setTyping'),
  conversationId: z.coerce.number().int().positive('conversationId must be a positive integer'),
  userId: z.coerce.number().int().positive('userId must be a positive integer'),
  userName: z.string().trim().min(1).max(50),
  isTyping: z.boolean(),
});

export const RegisterUserSchema = z.object({
  action: z.literal('registerUser'),
  name: z.string().trim().min(1, 'Name cannot be empty').max(60, 'Name too long'),
  email: z.string().trim().email('Invalid email address').max(100),
});

export const UpdateUserSchema = z.object({
  action: z.literal('updateUser'),
  id: z.coerce.number().int().positive('User ID must be a positive integer'),
  name: z.string().trim().min(1, 'Name cannot be empty').max(60, 'Name too long'),
  email: z.string().trim().email('Invalid email address').max(100),
});

export const ChatActionSchema = z.discriminatedUnion('action', [
  SendMessageSchema,
  CreateGroupSchema,
  StartConversationSchema,
  MarkAsReadSchema,
  EditMessageSchema,
  DeleteMessageSchema,
  AddGroupMemberSchema,
  RemoveGroupMemberSchema,
  LeaveGroupSchema,
  SetTypingSchema,
  RegisterUserSchema,
  UpdateUserSchema,
]);

export type ValidatedChatAction = z.infer<typeof ChatActionSchema>;
