'use client';

import { Suspense } from 'react';
import { LayoutContent } from '../features/chat/components/LayoutContent';

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <LayoutContent />
    </Suspense>
  );
}