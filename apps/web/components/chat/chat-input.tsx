'use client';

import { useState, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function ChatInput({ onSend, disabled, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (!input.trim() || disabled || isLoading) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur-sm p-4">
      <div className="container mx-auto max-w-3xl">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={disabled ? "Connect wallet to chat..." : "Ask about yields, swaps, positions..."}
              disabled={disabled || isLoading}
              rows={1}
              className={cn(
                "w-full resize-none rounded-xl border border-border bg-card px-4 py-3 pr-12",
                "text-sm placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "min-h-[48px] max-h-[120px]"
              )}
              style={{
                height: 'auto',
                minHeight: '48px',
              }}
            />
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || disabled || isLoading}
            className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        <div className="mt-2 flex justify-center gap-2 flex-wrap">
          {['Show my balances', 'Best yield for USDC?', 'Swap ETH to USDC'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => !disabled && !isLoading && onSend(suggestion)}
              disabled={disabled || isLoading}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg",
                "border border-border bg-card",
                "text-muted-foreground hover:text-foreground hover:bg-accent hover:border-indigo-500/30",
                "transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
