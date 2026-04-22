export interface IAiGateway {
  streamChat(params: {
    modelId: string;
    provider: string;
    apiKey: string;
    systemPrompt: string;
    messages: any[];
    onFinish: (text: string) => Promise<void>;
  }): Promise<Response>;

  generateText(params: {
    modelId: string;
    provider: string;
    apiKey: string;
    systemPrompt: string;
    prompt: string;
  }): Promise<string>;
}
