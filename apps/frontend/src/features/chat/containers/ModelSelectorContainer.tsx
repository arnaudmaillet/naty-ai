// apps/frontend/src/features/chat/containers/ModelSelectorContainer.tsx

import { memo } from 'react';
import { useMainStore } from 'apps/frontend/src/store/useMainStore';
import { useForkStore } from 'apps/frontend/src/store/useForkStore';
import { ModelSelector } from '../components/ModelSelector';
import { AiModel } from '@naty-ai/shared-types';

interface ContainerProps {
    models: AiModel[];
    disabled?: boolean;
}

/**
 * Version pour le Thread Principal
 */
export const MainModelSelector = memo(({ models, disabled }: ContainerProps) => {
    const selectedModelId = useMainStore(state => state.selectedModelId);
    const setSelectedModelId = useMainStore(state => state.setSelectedModelId);

    return (
        <ModelSelector
            models={models}
            selectedModelId={selectedModelId}
            onModelChange={setSelectedModelId}
            disabled={disabled}
        />
    );
});

MainModelSelector.displayName = 'MainModelSelector';

/**
 * Version pour le Thread Fork
 */
export const ForkModelSelector = memo(({ models, disabled }: ContainerProps) => {
    const selectedModelId = useForkStore(state => state.selectedModelId);
    const setSelectedModelId = useForkStore(state => state.setSelectedModelId);

    return (
        <ModelSelector
            models={models}
            selectedModelId={selectedModelId}
            onModelChange={setSelectedModelId}
            disabled={disabled}
        />
    );
});

ForkModelSelector.displayName = 'ForkModelSelector';