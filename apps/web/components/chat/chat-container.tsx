'use client';

import { useRef, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Sparkles } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useChatStore, generateMessageId } from '@/lib/store';
import { ChatMessageBubble, TypingIndicator } from './chat-message';
import { ChatInput } from './chat-input';

export function ChatContainer() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { messages, isLoading, addMessage, setLoading } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (content: string) => {
    if (!address) return;

    // Add user message
    const userMessage = {
      id: generateMessageId(),
      role: 'user' as const,
      content,
      timestamp: Date.now(),
    };
    addMessage(userMessage);
    setLoading(true);

    try {
      // Call the API to process the intent
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          walletAddress: address,
        }),
      });

      const data = await response.json();

      // Add assistant response
      const assistantMessage = {
        id: generateMessageId(),
        role: 'assistant' as const,
        content: data.response,
        timestamp: Date.now(),
        intent: data.intent,
        data: data.data,
      };
      addMessage(assistantMessage);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: generateMessageId(),
        role: 'assistant' as const,
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: Date.now(),
      };
      addMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state during hydration
  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-3xl py-4">
          {/* Welcome message when empty */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2 gradient-text">
                Welcome to Katana Intent
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Your AI-powered DeFi assistant. Ask me about yields, swaps, positions, 
                or anything else on Katana.
              </p>

              {!isConnected ? (
                <div className="inline-flex flex-col items-center gap-3 p-6 rounded-xl bg-card border border-border">
                  <Wallet className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Connect your wallet to get started
                  </p>
                  <ConnectButton />
                </div>
              ) : (
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    'Show my balances',
                    'What\'s the best yield for USDC?',
                    'Check my positions',
                    'Swap 0.1 ETH to USDC',
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => handleSendMessage(example)}
                      className="px-4 py-2 rounded-xl bg-card border border-border text-sm hover:bg-accent transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Messages */}
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isLoading && <TypingIndicator />}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <ChatInput
        onSend={handleSendMessage}
        disabled={!isConnected}
        isLoading={isLoading}
      />
    </div>
  );
}
