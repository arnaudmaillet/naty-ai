// apps/frontend/src/features/chat/containers/chat-thread-inputs.tsx

'use client';

import { useMainStore } from 'apps/frontend/src/store/useMainStore';
import { memo } from 'react';
import { ChatInput } from '../components/ChatInput';
import { useForkStore } from 'apps/frontend/src/store/useForkStore';


/**
 * Version de l'input liée au thread principal
 */
export const MainThreadInput = memo((props: any) => {
    const input = useMainStore(state => state.input);
    const setInput = useMainStore(state => state.setInput);
    const isStreaming = useMainStore(state => state.isStreaming);

    return (
        <ChatInput
            {...props}
            value={input}
            onChange={setInput}
            disabled={isStreaming || props.disabled}
        />
    );
});

/**
 * Version de l'input liée au thread de fork (panneau latéral)
 */
export const ForkThreadInput = memo((props: any) => {
    const input = useForkStore(state => state.input);
    const setInput = useForkStore(state => state.setInput);
    const isStreaming = useForkStore(state => state.isStreaming);

    return (
        <ChatInput
            {...props}
            value={input}
            onChange={setInput}
            disabled={isStreaming || props.disabled}
        />
    );
});