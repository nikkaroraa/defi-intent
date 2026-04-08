'use client';

import { useRef, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Sword } from 'lucide-react';
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
              className="py-16 max-w-lg mx-auto"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <Sword className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  Katana Intent
                </h2>
              </div>
              <p className="text-muted-foreground mb-8 text-[15px] leading-relaxed">
                DeFi copilot. Ask about yields, execute swaps, check positions, or explore protocols across Ethereum, Base, and Arbitrum.
              </p>

              {!isConnected ? (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border">
                  <Wallet className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground font-medium">Connect wallet to start</p>
                    <p className="text-xs text-muted-foreground">Supports MetaMask, Rabby, Coinbase, WalletConnect</p>
                  </div>
                  <ConnectButton />
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Try asking</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'Show my balances',
                      'Best yield for USDC?',
                      'Check my positions',
                      'Swap 0.1 ETH to USDC',
                    ].map((example) => (
                      <button
                        key={example}
                        onClick={() => handleSendMessage(example)}
                        className="px-3 py-2.5 rounded-lg bg-card border border-border text-sm text-left hover:bg-accent hover:border-indigo-500/30 transition-all"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
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
