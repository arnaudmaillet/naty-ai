// apps/frontend/src/store/useChatStore.ts

import { create } from 'zustand';
import { Message } from '@naty-ai/shared-types';

interface MainStore {
  input: string;
  isStreaming: boolean;
  messages: Message[];
  selectedModelId: string;
  selection: {
    text: string;
    rect: DOMRect | null;
    blockId: string | null;
  } | null;
  activeBlockId: string | null;

  // Actions
  setInput: (val: string) => void;
  setStreaming: (val: boolean) => void;
  setSelectedModelId: (id: string) => void;
  setMessages: (updater: Message[] | ((prev: Message[]) => Message[])) => void;
  setSelection: (sel: MainStore['selection']) => void;
  setActiveBlockId: (id: string | null) => void;
  resetChat: () => void;
}

export const useMainStore = create<MainStore>((set) => ({
  input: '',
  isStreaming: false,
  messages: [],
  selectedModelId: '',
  selection: null,
  activeBlockId: null,

  setInput: (input) => set({ input }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
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
      selectedModelId: '',
      selection: null,
      activeBlockId: null,
    }),
}));
