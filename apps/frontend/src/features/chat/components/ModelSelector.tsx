// apps/frontend/src/components/ModelSelector.tsx
'use client';

import { memo } from 'react';
import { AiModel } from '@naty-ai/shared-types';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "../../../components/ui/select";
import { Sparkles, Zap, BrainCircuit } from 'lucide-react';
import { cn } from "../../../lib/utils";

interface ModelSelectorProps {
    models: AiModel[];
    selectedModelId: string;
    onModelChange: (id: string) => void;
    disabled?: boolean;
}

export const ModelSelector = memo(({
    models,
    selectedModelId,
    onModelChange,
    disabled
}: ModelSelectorProps) => {

    if (models.length === 0) return null;

    const getModelIcon = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('gpt-4') || n.includes('claude-3')) return <Sparkles className="w-4 h-4 text-purple-500" />;
        if (n.includes('fast') || n.includes('3.5')) return <Zap className="w-4 h-4 text-amber-500" />;
        return <BrainCircuit className="w-4 h-4 text-blue-500" />;
    };

    return (
        <div className="relative flex items-center justify-center group">
            <Select
                value={selectedModelId}
                onValueChange={onModelChange}
                disabled={disabled}
            >
                <SelectTrigger className={cn(
                    "relative w-fit min-w-[140px] h-10 border border-zinc-100 transition-all rounded-xl gap-2 font-bold text-zinc-700",
                    "bg-zinc-100/40 hover:bg-zinc-100/80 backdrop-blur-md shadow-sm",
                    "focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 outline-none",
                    "data-[state=open]:bg-white"
                )}>
                    <SelectValue placeholder="Modèle" />
                </SelectTrigger>

                <SelectContent className="rounded-2xl border-zinc-200 shadow-xl backdrop-blur-xl bg-white/90">
                    {models.map((m) => (
                        <SelectItem
                            key={m.id}
                            value={m.id}
                            className="rounded-xl cursor-pointer focus:bg-zinc-100 focus:text-zinc-900 transition-colors"
                        >
                            <div className="flex items-center gap-2 py-1">
                                {getModelIcon(m.name)}
                                <span className="text-sm font-semibold">{m.name}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
});

ModelSelector.displayName = 'ModelSelector';