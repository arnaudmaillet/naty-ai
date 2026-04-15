/**
 * Les fournisseurs officiellement supportés
 */
export enum AiProvider {
  GEMINI = 'gemini',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
}

/**
 * Rôles dans une conversation (Standardisé pour la plupart des APIs)
 */
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

/**
 * Structure de configuration pour un modèle spécifique
 */
export interface ModelConfig {
  id: string;
  name: string;
  provider: AiProvider;
  contextWindow: number;
  isAvailable: boolean;
}