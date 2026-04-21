'use client';

import React, { useEffect, useState, useCallback, memo } from "react";
import { useMainStore } from "apps/frontend/src/store/useMainStore";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "../../../lib/utils";

export interface AskBubbleProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
    onForkRequest: (text: string, blockId: string) => void;
}

export const AskBubble = memo(({ containerRef, onForkRequest }: AskBubbleProps) => {
    const hasSelection = useMainStore((state) => !!state.selection?.blockId);
    const setSelection = useMainStore((state) => state.setSelection);

    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

    const updatePosition = useCallback(() => {
        const domSelection = window.getSelection();
        if (!domSelection || domSelection.rangeCount === 0 || domSelection.isCollapsed || !containerRef.current) {
            setCoords(null);
            return;
        }

        const scroller = containerRef.current;
        const scrollerRect = scroller.getBoundingClientRect();
        const range = domSelection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        if (rect.top < scrollerRect.top || rect.bottom > scrollerRect.bottom) {
            setCoords(null);
            return;
        }

        setCoords({
            top: rect.top - scrollerRect.top + scroller.scrollTop - 42,
            left: rect.left - scrollerRect.left
        });
    }, [containerRef]);

    useEffect(() => {
        const scroller = containerRef.current;
        if (!scroller || !hasSelection) {
            if (coords) setCoords(null);
            return;
        }

        updatePosition();

        scroller.addEventListener('scroll', updatePosition, { passive: true });
        window.addEventListener('resize', updatePosition);

        return () => {
            scroller.removeEventListener('scroll', updatePosition);
            window.removeEventListener('resize', updatePosition);
        };
    }, [hasSelection, containerRef, updatePosition]);

    const handleAction = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const state = useMainStore.getState();
        if (state.selection?.text && state.selection?.blockId) {
            onForkRequest(state.selection.text, state.selection.blockId);
            setSelection(null);
            window.getSelection()?.removeAllRanges();
        }
    };

    if (!hasSelection) return null;

    return (
        <AnimatePresence>
            {coords && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                    className="absolute z-[100] pointer-events-auto"
                    style={{
                        top: coords.top,
                        left: coords.left,
                        willChange: 'transform, opacity'
                    }}
                >
                    <button
                        onMouseDown={handleAction}
                        className={cn(
                            "flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-zinc-100",
                            "bg-zinc-50 hover:bg-zinc-200 text-gray-800 transition-all active:scale-95 shadow-lg"
                        )}
                    >
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[11px] font-bold uppercase whitespace-nowrap">
                            Ask about this
                        </span>
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
});

AskBubble.displayName = 'AskBubble';