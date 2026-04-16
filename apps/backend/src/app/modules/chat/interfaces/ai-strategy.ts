import {  MessageRole } from '@naty-ai/shared-types';

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface AiStrategy {
  generateResponse(messages: ChatMessage[], modelId: string, apiKey: string): Promise<string>;
}