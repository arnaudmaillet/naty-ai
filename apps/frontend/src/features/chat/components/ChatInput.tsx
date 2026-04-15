interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  isLoading: boolean;
}

export function ChatInput({ input, setInput, onSend, isLoading }: ChatInputProps) {
  return (
    <div className="p-4 bg-transparent">
      <div className="max-w-3xl mx-auto relative group">
        <input
          className="w-full bg-white border border-gray-200 rounded-2xl pl-4 pr-12 py-4 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          placeholder="Posez votre question à Naty AI..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSend()}
          disabled={isLoading}
        />
        <button 
          onClick={onSend}
          disabled={isLoading || !input.trim()}
          className="absolute right-2 top-2 bottom-2 px-4 bg-gray-900 text-white rounded-xl hover:bg-blue-600 disabled:bg-gray-200 transition-all flex items-center justify-center"
        >
          ➔
        </button>
      </div>
    </div>
  );
}