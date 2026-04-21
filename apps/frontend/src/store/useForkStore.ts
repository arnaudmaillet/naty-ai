// apps/frontend/src/store/useForkStore.ts
import { create } from 'zustand';

interface ForkState {
  input: string;
  isOpen: boolean;
  selectedText: string;
  selectedModelId: string;
  blockId: string;
  annotationId: string | null;
  messages: any[];
  isStreaming: boolean;

  // Actions
  setInput: (val: string) => void;
  openNew: (text: string, bId: string) => void;
  openExisting: (text: string, bId: string, aId: string) => void;
  setSelectedModelId: (id: string) => void;
  setMessages: (updater: any[] | ((prev: any[]) => any[])) => void;
  updateStreamingMessage: (tempId: string, content: string) => void;
  setStreaming: (loading: boolean) => void;
  setAnnotationId: (id: string) => void;
  close: () => void;
}

export const useForkStore = create<ForkState>((set) => ({
  input: '',
  isOpen: false,
  selectedModelId: '',
  selectedText: '',
  blockId: '',
  annotationId: null,
  messages: [],
  isStreaming: false,

  setInput: (val) => set({ input: val }),

  setSelectedModelId: (id) => set({ selectedModelId: id }),

  openNew: (text, bId) =>
    set({
      isOpen: true,
      selectedText: text,
      blockId: bId,
      annotationId: null,
      messages: [],
    }),

  openExisting: (text, bId, aId) =>
    set({
      isOpen: true,
      selectedText: text,
      blockId: bId,
      annotationId: aId,
      messages: [],
    }),

  setMessages: (updater) =>
    set((state) => ({
      messages:
        typeof updater === 'function' ? updater(state.messages) : updater,
    })),

  updateStreamingMessage: (tempId, content) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === tempId
          ? {
              ...m,
              content,
              blocks: m.blocks ? [{ ...m.blocks[0], content }] : m.blocks,
            }
          : m,
      ),
    })),

  setStreaming: (loading) => set({ isStreaming: loading }),

  setAnnotationId: (id) => set({ annotationId: id }),

  close: () =>
    set({
      isOpen: false,
      messages: [],
      input: '',
      annotationId: null,
    }),
}));
