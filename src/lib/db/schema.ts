import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// projects コレクション相当
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// checklist_items コレクション相当
export const checklistItems = sqliteTable('checklist_items', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  question: text('question').notNull(),
  answer: text('answer'),
  isCompleted: integer('is_completed', { mode: 'boolean' }).default(false),
  order: integer('order').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// conversations コレクション相当
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  checklistItemId: text('checklist_item_id').references(() => checklistItems.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// messages コレクション相当
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// outputs コレクション相当
export const outputs = sqliteTable('outputs', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  type: text('type', { enum: ['sns_post', 'video_script'] }).notNull(),
  platform: text('platform'),
  format: text('format'),
  content: text('content').notNull(),
  status: text('status', { enum: ['draft', 'posted', 'scheduled'] }).default('draft'),
  postedAt: integer('posted_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// user_settings: ユーザーごとの設定（APIキー等）
export const userSettings = sqliteTable('user_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// project_sns_auth コレクション相当
export const projectSnsAuth = sqliteTable('project_sns_auth', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  platform: text('platform').notNull(),
  accessToken: text('access_token'),
  accessTokenSecret: text('access_token_secret'),
  username: text('username'),
  connectedAt: integer('connected_at', { mode: 'timestamp' }),
});
