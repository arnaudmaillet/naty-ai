import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiStrategy, ChatMessage } from './../interfaces/ai-strategy';
import { MessageRole } from '@prisma/client';

@Injectable()
export class GeminiStrategy implements AiStrategy {
  async generateResponse(
    messages: ChatMessage[],
    modelId: string,
    apiKey: string,
  ): Promise<string> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelId });
    const history = messages.slice(0, -1).map((m) => {
      const geminiRole = m.role === MessageRole.USER ? 'user' : 'model';

      return {
        role: geminiRole,
        parts: [{ text: m.content }],
      };
    });

    const lastMessage = messages[messages.length - 1].content;

    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: 2048,
      },
    });

    const result = await chat.sendMessage(lastMessage);
    const response = await result.response;
    return response.text();
  }
}
