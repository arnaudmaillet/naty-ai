'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Conversation } from '@naty-ai/shared-types';
import { chatApi } from '../../../app/api/chat';

export function Sidebar() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentId = searchParams.get('id');

  const fetchConversations = useCallback(async () => {
    try {
      const data = await chatApi.getConversations();
      
      // Sécurité : On ne met à jour que si data est un vrai tableau
      if (data && Array.isArray(data)) {
        setConversations(data);
      } else {
        // Si l'API renvoie une erreur (ex: {message: "Unauthorized"}), on met un tableau vide
        console.warn("L'API n'a pas renvoyé un tableau:", data);
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
    <aside className="w-64 bg-gray-900 text-white flex flex-col hidden md:flex h-full border-r border-gray-800 shrink-0">
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
        {/* Utilisation du chaînage optionnel ?. pour être sûr de ne pas crash */}
        {conversations?.length > 0 ? (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => navigateTo(conv.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm truncate ${
                currentId === conv.id
                  ? 'bg-gray-800 text-white ring-1 ring-gray-700'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              {conv.title || 'Discussion sans titre'}
            </button>
          ))
        ) : (
          <div className="px-3 py-2 text-xs text-gray-500 italic">
            Aucune discussion
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-gray-800 flex flex-col gap-1">
        <div className="text-xs text-gray-400">Connecté en tant que</div>
        <div className="text-sm font-medium truncate">Arnaud</div>
      </div>
    </aside>
  );
}