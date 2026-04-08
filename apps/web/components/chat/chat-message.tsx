'use client';

import { motion } from 'framer-motion';
import { User, Bot, Loader2 } from 'lucide-react';
import type { ChatMessage } from '@katana-intent/shared';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex gap-3 p-4',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}
      
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-card border border-border'
        )}
      >
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content.split('\n').map((line, i) => (
            <span key={i}>
              {line.split('**').map((part, j) => 
                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
              )}
              {i < message.content.split('\n').length - 1 && <br />}
            </span>
          ))}
        </div>
        
        {message.intent && message.intent.confidence < 0.8 && (
          <p className="text-xs mt-2 opacity-60">
            Confidence: {Math.round(message.intent.confidence * 100)}%
          </p>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
    </motion.div>
  );
}

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex gap-3 p-4"
    >
      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
        <Bot className="w-5 h-5 text-white" />
      </div>
      <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Thinking...</span>
      </div>
    </motion.div>
  );
}
