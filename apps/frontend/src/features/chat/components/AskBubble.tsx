import { useEffect, useState, useCallback } from "react";
import { useChatStore } from "apps/frontend/src/store/useChatStore";

export interface AskBubbleProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
    onForkRequest: (text: string, blockId: string) => void;
}

export const AskBubble = ({ containerRef, onForkRequest }: AskBubbleProps) => {
    const selection = useChatStore((state) => state.selection);
    const setSelection = useChatStore((state) => state.setSelection);
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

    // Fonction de calcul de position ultra-précise
    const updatePosition = useCallback(() => {
        if (!selection?.rect || !containerRef.current) return;

        const scroller = containerRef.current;
        const scrollerRect = scroller.getBoundingClientRect();

        // On récupère la position actuelle du texte sélectionné 
        // (getSelection permet d'avoir la position réelle même après scroll)
        const domSelection = window.getSelection();
        if (!domSelection || domSelection.rangeCount === 0) return;

        const range = domSelection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Si le texte sort du scroller, on cache la bulle
        if (rect.top < scrollerRect.top || rect.bottom > scrollerRect.bottom) {
            setCoords(null);
            return;
        }

        setCoords({
            top: rect.top - scrollerRect.top + scroller.scrollTop,
            left: rect.left - scrollerRect.left
        });
    }, [selection, containerRef]);

    // Écouter le scroll du container
    useEffect(() => {
        const scroller = containerRef.current;
        if (!scroller || !selection) return;

        updatePosition(); // Position initiale

        scroller.addEventListener('scroll', updatePosition, { passive: true });
        window.addEventListener('resize', updatePosition);

        return () => {
            scroller.removeEventListener('scroll', updatePosition);
            window.removeEventListener('resize', updatePosition);
        };
    }, [selection, containerRef, updatePosition]);

    if (!selection || !coords || !selection.blockId) return null;

    const handleAction = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onForkRequest(selection.text, selection.blockId!);
        setSelection(null);
        window.getSelection()?.removeAllRanges();
    };

    return (
        <div
            className="absolute z-[100] pointer-events-auto"
            style={{
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                transform: 'translate(0%, calc(-100% - 12px))',
                transition: 'none',
                willChange: 'transform'
            }}
        >
            <div className="flex items-center bg-gray-900 text-white rounded-xl shadow-2xl border border-white/20 p-1 backdrop-blur-md ring-1 ring-black/5">
                <button
                    onMouseDown={handleAction}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-600 text-white rounded-lg transition-colors active:scale-95"
                >
                    <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">Précision</span>
                </button>
            </div>
        </div>
    );
};