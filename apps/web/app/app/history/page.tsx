'use client';

import { useChatStore } from '@/lib/store';
import { History, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HistoryPage() {
  const { messages, clearMessages } = useChatStore();

  const groupedByDate = messages.reduce((acc, msg) => {
    const date = new Date(msg.timestamp).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {} as Record<string, typeof messages>);

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Chat History</h1>
            <p className="text-sm text-muted-foreground">
              {messages.length} messages
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No chat history yet.</p>
          <p className="text-sm">Start a conversation to see your history here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByDate).reverse().map(([date, msgs]) => (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-sm font-medium text-muted-foreground mb-4">
                {date}
              </h2>
              <div className="space-y-3">
                {msgs.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-xl border ${
                      msg.role === 'user'
                        ? 'bg-primary/10 border-primary/20'
                        : 'bg-card border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {msg.role === 'user' ? 'You' : 'DeFi Intent'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
