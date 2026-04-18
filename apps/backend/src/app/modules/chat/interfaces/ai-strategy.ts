import { MessageRole } from "@prisma/client";
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface AiStrategy {
  generateResponse(messages: ChatMessage[], modelId: string, apiKey: string): Promise<string>;
}