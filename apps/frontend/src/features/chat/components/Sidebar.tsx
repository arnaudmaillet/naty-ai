'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getConversations } from '../../../services/api';

export function Sidebar() {
  const [conversations, setConversations] = useState<any[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentId = searchParams.get('id');

  useEffect(() => {
    getConversations()
      .then(data => setConversations(data))
      .catch(err => console.error(err));
  }, []);

  const navigateTo = (id?: string) => {
    if (id) {
      router.push(`/?id=${id}`);
    } else {
      router.push('/');
    }
  };

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col hidden md:flex h-full border-r border-gray-800">
      <div className="p-4 font-bold text-xl border-b border-gray-800 flex items-center gap-2">
        <span className="text-blue-400">Naty</span> AI
      </div>

      <div className="p-3">
        <button 
          onClick={() => navigateTo()} 
          className="w-full text-left px-3 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
        >
          <span>+</span> Nouvelle discussion
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => navigateTo(conv.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm truncate ${
              currentId === conv.id 
                ? 'bg-gray-800 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            {conv.title || 'Discussion sans titre'}
          </button>
        ))}
      </nav>
      
      <div className="p-4 border-t border-gray-800 flex flex-col gap-1">
        <div className="text-xs text-gray-400">Connecté en tant que</div>
        <div className="text-sm font-medium truncate">Arnaud</div>
      </div>
    </aside>
  );
}