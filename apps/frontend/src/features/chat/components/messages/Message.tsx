// MessageRow.tsx (partie mise à jour dans ton fichier)

import React, { memo } from 'react';
import { Message, MessageRole } from '@naty-ai/shared-types';
import { MessageBlock } from './MessageBlock';
import { useMainStore } from 'apps/frontend/src/store/useMainStore';
import { AnnotationPills } from '../AnnotationPills';
import { cn } from "../../../../lib/utils";
import { Copy, RotateCcw } from 'lucide-react';

export const MessageRow = memo(({
    msg,
    index,
    annotations,
    isStreaming,
    onAnnotationClick,
    canFork
}: {
    msg: Message;
    index: number;
    annotations: any[];
    isStreaming: boolean;
    onAnnotationClick?: (id: string) => void;
    canFork: boolean;
}) => {
    const isUser = msg.role === MessageRole.USER;
    const isAssistant = msg.role === MessageRole.ASSISTANT;
    const isThisMsgStreaming = isStreaming && (
        msg.id === 'streaming-assistant' ||
        msg.id === 'fork-streaming-assistant' ||
        msg.id.toString().includes('temp') ||
        msg.id.toString().includes('fork-stream')
    );

    return (
        <div
            className={cn(
                "flex flex-col pb-12 group transition-all",
                isUser ? "items-end" : "items-start"
            )}
            data-role={msg.role}
        >
            <div className={cn(
                "flex w-full gap-4",
                isUser ? "flex-row-reverse" : "flex-row",
                canFork ? "max-w-3xl" : "max-w-full",
                "mx-auto"
            )}>
                <div className="flex-1 flex flex-col min-w-0">
                    <div className={cn(
                        "w-full",
                        isUser ? "flex justify-end" : "justify-start"
                    )}>
                        {isThisMsgStreaming ? (
                            <div className="w-full">
                                <MessageBlock
                                    role={msg.role}
                                    content={msg.content || ""}
                                    isStreaming={true}
                                />
                            </div>
                        ) : (
                            <div className="w-full space-y-4">
                                {msg.blocks?.map((block, blockIdx) => {
                                    const blockAnnos = annotations.filter(a => a.blockId === block.id);

                                    return (
                                        <div
                                            key={block.id || `block-${index}-${blockIdx}`}
                                            className="relative group/block"
                                            onMouseDown={() => {
                                                const store = useMainStore.getState();
                                                if (isAssistant && block.id) {
                                                    store.setActiveBlockId(block.id);
                                                } else {
                                                    store.setActiveBlockId(null);
                                                }
                                            }}
                                        >
                                            <MessageBlock
                                                role={msg.role}
                                                content={block.content}
                                                type={block.type}
                                                isStreaming={false}
                                            />

                                            <div className="clear-both" />

                                            <AnnotationPills
                                                annotations={blockAnnos}
                                                onAnnotationClick={onAnnotationClick}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* METADATA (affichée uniquement quand le message est complet) */}
                    <div className={cn(
                        "mt-3 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest min-h-[20px]",
                        isUser ? "justify-end text-zinc-400" : "justify-start text-zinc-400"
                    )}>
                        {isThisMsgStreaming ? (
                            // S'affiche sans coupure tant que isThisMsgStreaming est vrai
                            <div className="flex items-center gap-2 animate-pulse">
                                <div className="w-1 h-1 rounded-full bg-current" />
                                <span>Generating...</span>
                            </div>
                        ) : (
                            // Apparaît uniquement quand le stream est terminé
                            !isUser && (
                                <div className="flex items-center gap-3 animate-in fade-in duration-500">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => navigator.clipboard.writeText(msg.content ?? "")} className="p-1 hover:bg-zinc-100 rounded-md">
                                            <Copy size={12} strokeWidth={2.5} />
                                        </button>
                                        <button className="p-1 hover:bg-zinc-100 rounded-md">
                                            <RotateCcw size={12} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                    <span className="w-px h-3 bg-zinc-200" />
                                    <span>Gemini 1.5 Pro</span>
                                    <span className="opacity-40">•</span>
                                    <span>{msg.content?.length || 0} Tokens</span>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}, (prev, next) => {
    return (
        prev.msg.content === next.msg.content &&
        prev.isStreaming === next.isStreaming &&
        prev.annotations.length === next.annotations.length &&
        prev.canFork === next.canFork
    );
});