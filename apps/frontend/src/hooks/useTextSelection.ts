import { useEffect, useCallback, useRef } from 'react';
import { useMainStore } from '../store/useMainStore';

export const useTextSelection = () => {
  const setSelection = useMainStore((state) => state.setSelection);
  const isMouseDown = useRef(false);

  const updateSelection = useCallback(() => {
    const sel = window.getSelection();
    const blockId = useMainStore.getState().activeBlockId;

    // Si pas de sélection ou sélection vide -> on ferme
    if (
      !sel ||
      sel.isCollapsed ||
      sel.toString().trim().length === 0 ||
      !blockId
    ) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelection({
      text: sel.toString(),
      rect: rect,
      blockId: blockId,
    });
  }, [setSelection]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      isMouseDown.current = true;

      const target = e.target as HTMLElement;
      // SI on clique hors de la bulle, on ferme TOUT DE SUITE
      // sans attendre le mouseup. C'est ça qui évite le double clic.
      if (!target.closest('.precision-bubble')) {
        setSelection(null);
      }
    };

    const handleMouseUp = () => {
      isMouseDown.current = false;
      // On utilise requestAnimationFrame plutôt que setTimeout
      // pour être synchrone avec le prochain rendu navigateur
      requestAnimationFrame(() => {
        updateSelection();
      });
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [updateSelection, setSelection]);
};
