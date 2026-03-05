export interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChecklistItem {
  id: string;
  projectId: string;
  question: string;
  answer: string | null;
  isCompleted: boolean | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  projectId: string;
  checklistItemId: string | null;
  createdAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}

export interface Output {
  id: string;
  projectId: string;
  type: 'sns_post' | 'video_script';
  platform: string | null;
  format: string | null;
  content: string;
  status: 'draft' | 'posted' | 'scheduled';
  postedAt: Date | null;
  createdAt: Date;
}

export interface ProjectSnsAuth {
  id: string;
  projectId: string;
  platform: string;
  accessToken: string | null;
  accessTokenSecret: string | null;
  username: string | null;
  connectedAt: Date | null;
}

export interface ProjectWithProgress extends Project {
  checklistTotal: number;
  checklistCompleted: number;
}
