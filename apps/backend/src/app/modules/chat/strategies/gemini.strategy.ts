import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiStrategy, ChatMessage } from './../interfaces/ai-strategy';
import { MessageRole } from '../types/providers';

@Injectable()
export class GeminiStrategy implements AiStrategy {
    async generateResponse(messages: ChatMessage[], modelId: string, apiKey: string): Promise<string> {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelId });

        // Gemini utilise un format spécifique pour le chat (startChat)
        // On sépare le dernier message (le prompt) de l'historique
        const history = messages.slice(0, -1).map(m => ({
            role: m.role === MessageRole.USER ? 'user' : 'model', // Gemini utilise 'model' au lieu d'assistant
            parts: [{ text: m.content }],
        }));

        const lastMessage = messages[messages.length - 1].content;

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(lastMessage);
        return result.response.text();
    }
}