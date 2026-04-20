// apps/frontend/src/hooks/useChatQueries.ts

import { useQuery, useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import { chatApi } from '../app/api/chat';

// On définit le type de réponse pour plus de clarté
interface ChatPageResponse {
  messages: any[];
  nextCursor: string | null;
}

export function useChatQueries(idFromUrl: string | null) {
  const modelsQuery = useQuery({
    queryKey: ['models'],
    queryFn: () => chatApi.getAvailableModels(),
    staleTime: Infinity,
  });

  const conversationQuery = useInfiniteQuery<
    ChatPageResponse,
    Error,
    InfiniteData<ChatPageResponse>,
    (string | null)[],
    string | undefined
  >({
    queryKey: ['conversation', idFromUrl],
    queryFn: ({ pageParam }) => 
      chatApi.getConversationMessages(idFromUrl!, pageParam),
    enabled: !!idFromUrl,
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchOnWindowFocus: false,
  });

  return { modelsQuery, conversationQuery };
}