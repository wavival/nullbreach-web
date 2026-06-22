export type ChatRole = "user" | "assistant";

export interface ChatSession {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  last_message_at?: string | null;
}

export interface ChatMessage {
  id: string;
  session: string;
  role: ChatRole;
  content: string;
  created_at: string;
}

export interface CreateSessionRequest {
  title?: string;
}

export interface CreateMessageRequest {
  content: string;
}

export interface CreateMessageResponse {
  user_message: ChatMessage;
  assistant_message: ChatMessage;
}

export interface UpdateSessionRequest {
  title: string;
}
