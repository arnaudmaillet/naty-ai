export interface Message {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date | string;
}