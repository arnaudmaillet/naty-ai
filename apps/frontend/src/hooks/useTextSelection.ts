import { useState, useEffect, useCallback, RefObject } from 'react';

export const useTextSelection = (
  containerRef: React.RefObject<HTMLElement | null>,
) => {
  const [selection, setSelection] = useState<{
    text: string;
    rect: DOMRect | null;
    mousePos: { x: number; y: number } | null;
  } | null>(null);

  const handleSelection = useCallback(
    (e: MouseEvent) => {
      // On récupère l'événement
      const sel = window.getSelection();

      if (!sel || sel.rangeCount === 0 || sel.toString().trim().length === 0) {
        setSelection(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const container = containerRef.current;

      if (container && container.contains(range.commonAncestorContainer)) {
        setSelection({
          text: sel.toString(),
          rect: range.getBoundingClientRect(),
          mousePos: { x: e.clientX, y: e.clientY }, // <-- Coordonnées au moment du mouseup
        });
      } else {
        setSelection(null);
      }
    },
    [containerRef],
  );

  useEffect(() => {
    // On passe l'événement au handler
    const onMouseUp = (e: MouseEvent) => handleSelection(e);

    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, [handleSelection]);

  return selection;
};
