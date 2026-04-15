import { PrismaClient, AiProvider } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const models = [
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: AiProvider.GEMINI,
      contextWindow: 1000000,
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: AiProvider.OPENAI,
      contextWindow: 128000,
    },
  ];

  for (const model of models) {
    await prisma.aiModel.upsert({
      where: { id: model.id },
      update: {},
      create: model,
    });
  }
  console.log('Modèles IA initialisés');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());