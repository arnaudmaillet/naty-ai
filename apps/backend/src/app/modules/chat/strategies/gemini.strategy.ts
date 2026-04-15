import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiStrategy, ChatMessage } from './../interfaces/ai-strategy';

@Injectable()
export class GeminiStrategy implements AiStrategy {
  async generateResponse(messages: ChatMessage[], modelId: string, apiKey: string): Promise<string> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelId });
    const lastMessage = messages[messages.length - 1].content;
    
    const result = await model.generateContent(lastMessage);
    const response = await result.response;
    return response.text();
  }
}