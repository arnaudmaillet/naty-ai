'use client';

import React, { useRef } from 'react';
import { Message, MessageRole } from '@naty-ai/shared-types';
import { useTextSelection } from 'apps/frontend/src/hooks/useTextSelection';
import { MessageBlock } from './MessageBlock';

interface MessageListProps {
    messages: Message[];
    annotations?: any[];
    isLoading: boolean;
    onForkRequest?: (selectedText: string, blockId: string) => void;
    onAnnotationClick?: (annotationId: string) => void;
    canFork?: boolean;
}

export function MainThread({
    messages,
    annotations = [],
    isLoading,
    onForkRequest,
    onAnnotationClick,
    canFork = true
}: MessageListProps) {
    // 1. Référence du conteneur pour limiter la sélection
    const containerRef = useRef<HTMLDivElement>(null);

    // 2. Hook de sélection optimisé passant la ref
    const selection = useTextSelection(containerRef);

    // 3. Handler pour déclencher le fork au clic sur la bulle
    const handleForkClick = (e: React.MouseEvent) => {
        e.preventDefault();
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || !selection || !onForkRequest) return;

        // On utilise le Range pour garantir qu'on prend le point le plus bas dans le DOM
        const range = sel.getRangeAt(0);
        const endElement = range.endContainer.parentElement?.closest('[data-block-id]');

        const blockId = endElement?.getAttribute('data-block-id');
        const role = endElement?.closest('[data-role]')?.getAttribute('data-role');

        // On ne fork que si le bloc appartient à l'Assistant
        if (blockId && role === MessageRole.ASSISTANT) {
            onForkRequest(selection.text, blockId);
        }
    };

    return (
        <div
            ref={containerRef}
            className="flex-1 overflow-y-auto bg-white relative"
        >
            <div className={`mx-auto px-4 py-8 space-y-10 ${canFork ? 'max-w-3xl' : 'max-w-full'}`}>

                {messages.map((msg, i) => {
                    const isUser = msg.role === MessageRole.USER;

                    return (
                        <div key={msg.id || i} data-role={msg.role} className="flex flex-col animate-in fade-in duration-500">
                            <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                <div className={`w-full ${isUser ? 'flex justify-end' : ''}`}>

                                    {msg.blocks?.map((block) => {
                                        const blockAnnotations = annotations.filter(a => a.blockId === block.id);
                                        return (
                                            <div
                                                key={block.id}
                                                data-block-id={block.id}
                                                className="relative mb-6 last:mb-0">
                                                <MessageBlock role={msg.role} content={block.content} type={block.type} />

                                                {/* Affichage des pilules d'annotations existantes */}
                                                {blockAnnotations.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-3 animate-in fade-in slide-in-from-top-1 duration-300">
                                                        {blockAnnotations.map((anno) => (
                                                            <button
                                                                key={anno.id}
                                                                onClick={() => onAnnotationClick?.(anno.id)}
                                                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-full text-[11px] font-semibold hover:bg-blue-100 hover:border-blue-200 transition-all shadow-sm"
                                                            >
                                                                <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                                </svg>
                                                                <span className="max-w-[120px] truncate italic">
                                                                    "{anno.selectedText}"
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Bulle flottante "Précision" contextuelle */}
                {canFork && selection && selection.mousePos && (
                    <div
                        className="fixed z-50 flex items-center bg-gray-900 text-white rounded-full shadow-2xl border border-gray-700 p-1 animate-in zoom-in duration-200"
                        style={{
                            top: selection.mousePos.y - 60,
                            left: selection.mousePos.x + 20,
                        }}
                    >
                        <button
                            onMouseDown={handleForkClick}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800 rounded-full transition-all"
                        >
                            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="text-xs font-bold uppercase tracking-wide">Précision</span>
                        </button>
                    </div>
                )}

                {isLoading && (
                    <div className="flex justify-start p-4">
                        <div className="flex space-x-2 animate-pulse">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full [animation-delay:0.2s]"></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full [animation-delay:0.4s]"></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}