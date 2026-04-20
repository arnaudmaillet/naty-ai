'use client';

import { useRef, useEffect } from 'react';

interface ChatInputProps {
    value: string;
    onChange: (val: string) => void;
    onSend: (val: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export function ChatInput({
    value,
    onChange,
    onSend,
    disabled,
    placeholder = "Posez votre question..."
}: ChatInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    };

    useEffect(() => { adjustHeight(); }, [value]);

    return (
        <div>
            <div className="relative flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 transition-all focus-within:border-gray-300 focus-within:bg-white">
                <textarea
                    ref={textareaRef}
                    rows={1}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (value.trim()) onSend(value);
                        }
                    }}
                    className="flex-1 bg-transparent border-none resize-none py-2 text-sm text-gray-800 placeholder-gray-400 focus:ring-0 focus:outline-none min-h-[40px] max-h-[200px]"
                    placeholder={placeholder}
                />
                <button
                    onClick={() => value.trim() && onSend(value)}
                    disabled={!value.trim() || disabled}
                    className="mb-1 p-2 bg-blue-600 text-white rounded-xl disabled:bg-gray-200 disabled:text-gray-400 transition-all"
                >
                    {disabled ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    )}
                </button>
            </div>
            <p className="mt-2 text-[10px] text-center text-gray-400 uppercase tracking-widest font-medium">
                Appuyez sur Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne
            </p>
        </div>
    );
}