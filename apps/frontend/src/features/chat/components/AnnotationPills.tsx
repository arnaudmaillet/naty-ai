'use client';

import React, { memo } from 'react';

interface Annotation {
  id: string;
  blockId: string;
  selectedText: string;
  // Ajoute d'autres propriétés si nécessaire
}

interface AnnotationPillsProps {
  annotations: Annotation[];
  onAnnotationClick?: (id: string) => void;
}

/**
 * Composant isolé pour les pilules d'annotations.
 * Utilise une comparaison profonde pour éviter les re-rendus inutiles
 * même si la référence du tableau change mais que le contenu reste identique.
 */
export const AnnotationPills = memo(({ 
  annotations, 
  onAnnotationClick 
}: AnnotationPillsProps) => {
  if (!annotations || annotations.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 animate-in fade-in slide-in-from-top-1 duration-300">
      {annotations.map((anno) => (
        <button
          key={anno.id}
          onClick={(e) => {
            e.stopPropagation();
            onAnnotationClick?.(anno.id);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-full text-[11px] font-semibold hover:bg-blue-100 hover:border-blue-200 transition-all shadow-sm group/pill"
        >
          <svg 
            className="w-3 h-3 text-blue-400 group-hover/pill:scale-110 transition-transform" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2.5" 
              d="M13 10V3L4 14h7v7l9-11h-7z" 
            />
          </svg>
          <span className="max-w-[120px] truncate italic">
            "{anno.selectedText}"
          </span>
        </button>
      ))}
    </div>
  );
}, (prev, next) => {
  if (prev.annotations.length !== next.annotations.length) return false;
  
  return prev.annotations.every((anno, index) => {
    const nextAnno = next.annotations[index];
    return anno.id === nextAnno.id && anno.selectedText === nextAnno.selectedText;
  });
});

AnnotationPills.displayName = 'AnnotationPills';