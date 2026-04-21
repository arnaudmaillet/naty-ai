'use client';

import { useRef, useEffect, useState, memo } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';
import { cn } from "../../../lib/utils";

// On entoure le composant avec memo
export const ChatInput = memo(({
    value: controlledValue,
    onChange,
    onSend,
    disabled,
    placeholder = "Posez votre question..."
}: any) => {
    const [internalValue, setInternalValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : internalValue;

    const adjustHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    };

    useEffect(() => { adjustHeight(); }, [value]);

    const handleSend = () => {
        const text = value?.trim();
        if (text && !disabled) {
            onSend(text);
            if (!isControlled) setInternalValue('');
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-4">
            <div className="relative flex bg-white border border-zinc-200 rounded-3xl shadow-sm focus-within:border-zinc-300 transition-all">
                <textarea
                    ref={textareaRef}
                    rows={1}
                    value={value || ""}
                    onChange={(e) => isControlled ? onChange?.(e.target.value) : setInternalValue(e.target.value)}
                    disabled={disabled}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    className="flex-1 bg-transparent border-none resize-none pl-5 pr-14 py-[14px] text-base text-zinc-800 placeholder:text-zinc-400 focus:ring-0 focus:outline-none min-h-[52px] max-h-[200px] leading-[24px]"
                    placeholder={placeholder}
                />

                <div className="absolute right-2 bottom-2">
                    <button
                        onClick={handleSend}
                        disabled={!value?.trim() || disabled}
                        className={cn(
                            "w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300",
                            value?.trim() && !disabled ? "bg-zinc-800 text-white shadow-sm" : "bg-zinc-100 text-zinc-300"
                        )}
                    >
                        {disabled ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUp size={20} strokeWidth={2.5} />}
                    </button>
                </div>
            </div>
        </div>
    );
});

ChatInput.displayName = 'ChatInput';