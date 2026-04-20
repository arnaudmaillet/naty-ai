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
    
    // Extraction du message système (résumé) s'il existe
    const systemMessage = messages.find(m => m.role === MessageRole.SYSTEM);
    const otherMessages = messages.filter(m => m.role !== MessageRole.SYSTEM);

    // On prépare le modèle
    const model = genAI.getGenerativeModel({ model: modelId });

    // On construit l'historique en respectant l'alternance stricte User/Model
    const history = otherMessages.slice(0, -1).map((m, index) => {
      let content = m.content;
      
      // Si c'est le premier message USER, on lui injecte le résumé système
      if (index === 0 && systemMessage) {
        content = `[CONTEXTE ARCHIVÉ]\n${systemMessage.content}\n\n[DISCUSSION]\n${content}`;
      }

      return {
        role: m.role === MessageRole.ASSISTANT ? 'model' : 'user',
        parts: [{ text: content }],
      };
    });

    const lastMessage = otherMessages[otherMessages.length - 1].content;

    // Sécurité : Si après filtrage il n'y a pas d'historique (1er message de la conv)
    // On peut passer un historique vide.
    const chat = model.startChat({
      history: history.length > 0 ? history : [],
      generationConfig: {
        maxOutputTokens: 2048,
      },
    });

    const result = await chat.sendMessage(lastMessage);
    const response = await result.response;
    return response.text();
  }
}