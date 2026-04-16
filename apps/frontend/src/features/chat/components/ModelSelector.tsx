import { AiModel } from '@naty-ai/shared-types';

interface ModelSelectorProps {
    models: AiModel[];
    selectedModelId: string;
    onModelChange: (id: string) => void;
    disabled?: boolean;
}

export function ModelSelector({ models, selectedModelId, onModelChange, disabled }: ModelSelectorProps) {
    if (models.length === 0) return null;

    return (
        <div className="flex items-center space-x-2 p-3 bg-gray-50 border-b">
            <select
                value={selectedModelId}
                onChange={(e) => onModelChange(e.target.value)}
                disabled={disabled}
                className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer"
            >
                {models.map((m) => (
                    <option key={m.id} value={m.id}>
                        {m.name}
                    </option>
                ))}
            </select>
        </div>
    );
}