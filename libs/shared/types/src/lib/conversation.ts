import { Message } from "./message";

export interface Conversation {
  id: string;
  title: string;
  userId: string;
  updatedAt: Date | string;
  messages?: Message[];
}