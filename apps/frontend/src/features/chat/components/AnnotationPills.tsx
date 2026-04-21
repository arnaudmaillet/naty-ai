'use client';

import React, { memo } from 'react';
import { Badge } from "../../../components/ui/badge"
import { Zap } from "lucide-react";
import { cn } from "../../../lib/utils";

interface Annotation {
  id: string;
  blockId: string;
  selectedText: string;
}

interface AnnotationPillsProps {
  annotations: Annotation[];
  onAnnotationClick?: (id: string) => void;
}

export const AnnotationPills = memo(({ 
  annotations, 
  onAnnotationClick 
}: AnnotationPillsProps) => {
  if (!annotations || annotations.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 animate-in fade-in slide-in-from-top-1 duration-300">
      {annotations.map((anno) => (
        <Badge
          key={anno.id}
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            onAnnotationClick?.(anno.id);
          }}
          className={cn(
            "cursor-pointer flex items-center gap-1.5 px-2.5 py-1",
            "bg-zinc-100/80 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200",
            "text-zinc-600 border border-transparent transition-all duration-200",
            "rounded-lg font-medium group/pill shadow-none"
          )}
        >
          <Zap className="w-3 h-3 text-blue-400 group-hover/pill:text-blue-500 transition-colors" />
          <span className="max-w-[150px] truncate">
            {anno.selectedText}
          </span>
        </Badge>
      ))}
    </div>
  );
}, (prev, next) => {
  // Optimisation du memo pour ne comparer que les données vitales
  if (prev.annotations.length !== next.annotations.length) return false;
  return prev.annotations.every((anno, i) => 
    anno.id === next.annotations[i].id && 
    anno.selectedText === next.annotations[i].selectedText
  );
});

AnnotationPills.displayName = 'AnnotationPills';