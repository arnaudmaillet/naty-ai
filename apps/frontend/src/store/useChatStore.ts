// apps/frontend/src/store/useChatStore.ts

import { create } from 'zustand';
import { Message } from '@naty-ai/shared-types';

interface ChatStore {
  input: string;
  isStreaming: boolean;
  messages: Message[];
  selection: {
    text: string;
    rect: DOMRect | null;
    blockId: string | null;
  } | null;
  activeBlockId: string | null;

  // Actions
  setInput: (val: string) => void;
  setStreaming: (val: boolean) => void;
  setMessages: (updater: Message[] | ((prev: Message[]) => Message[])) => void;
  setSelection: (sel: ChatStore['selection']) => void;
  setActiveBlockId: (id: string | null) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  input: '',
  isStreaming: false,
  messages: [],
  selection: null,
  activeBlockId: null,

  setInput: (input) => set({ input }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setSelection: (selection) => set({ selection }),
  setActiveBlockId: (activeBlockId) => set({ activeBlockId }),
  setMessages: (updater) =>
    set((state) => ({
      messages:
        typeof updater === 'function' ? updater(state.messages) : updater,
    })),
  resetChat: () =>
    set({
      input: '',
      isStreaming: false,
      messages: [],
      selection: null,
      activeBlockId: null,
    }),
}));
