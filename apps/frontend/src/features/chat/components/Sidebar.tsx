'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Conversation } from '@naty-ai/shared-types';
import { chatApi } from '../../../app/api/chat';

import {
  Plus,
  User,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

export function Sidebar() {

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentId = searchParams.get('id');

  const fetchConversations = useCallback(async () => {
    try {
      const data = await chatApi.getConversations();
      if (data && Array.isArray(data)) {
        setConversations(data);
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.error("Erreur réseau Sidebar:", err);
      setConversations([]);
    }
  }, []);


  useEffect(() => {
    fetchConversations();
    window.addEventListener('refresh-conversations', fetchConversations);
    return () => window.removeEventListener('refresh-conversations', fetchConversations);
  }, [fetchConversations]);

  const navigateTo = (id?: string) => {
    if (id) {
      router.push(`/?id=${id}`);
    } else {
      router.push('/');
    }
  };

  return (
    <aside
      className={`h-full p-2 shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden
        ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      <div className='flex flex-col h-full backdrop-blur-2xl rounded-3xl bg-zinc-50 border border-stone-100'>

        {/* Header */}
        <div className={`px-6 py-4 flex items-center shrink-0 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="font-bold text-xl flex items-center gap-1 whitespace-nowrap">
            <span className="text-blue-400">I</span>
            {!isCollapsed && <span>AI</span>}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-stone-200 rounded-full transition-colors text-gray-500 shrink-0"
          >
            {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>

        <div className="p-3 shrink-0">
          <button
            onClick={() => navigateTo()}
            className={`w-full flex items-center transition-all bg-white border border-stone-200 hover:bg-stone-100 font-semibold overflow-hidden
              ${isCollapsed ? 'justify-center p-2 rounded-full' : 'gap-2 p-2 px-3 rounded-full text-sm'}`}
          >
            <Plus size={18} className="text-gray-800 shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap text-gray-800">New chat</span>}
          </button>
        </div>

        {/* Liste des conversations */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1 custom-scrollbar">
          {conversations?.map((conv) => {
            // On extrait la première lettre (ou '?' si pas de titre)
            const firstLetter = conv.title ? conv.title.charAt(0).toUpperCase() : '?';
            return (
              <button
                key={conv.id}
                onClick={() => navigateTo(conv.id)}
                title={isCollapsed ? String(conv.title || 'Discussion') : undefined}
                className={`w-full flex items-center transition-all group relative
    ${isCollapsed ? 'justify-center p-2.5' : 'gap-3 p-2 px-3 text-sm'} 
    rounded-xl ${currentId === conv.id
                    ? 'bg-stone-100 text-gray-800 shadow-sm'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-stone-100'
                  }`}
              >
                {isCollapsed ? (
                  <div className="flex items-center justify-center rounded-lg text-xs font-bold pointer-events-none">
                    {firstLetter}
                  </div>
                ) : (
                  <span className="truncate whitespace-nowrap text-left font-medium pointer-events-none">
                    {conv.title || 'Discussion sans titre'}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`p-4 border-t border-stone-100 flex items-center gap-3 shrink-0 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-gray-400 shrink-0">
            <User size={16} />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <div className="text-sm font-semibold truncate whitespace-nowrap text-gray-700">Arnaud</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}