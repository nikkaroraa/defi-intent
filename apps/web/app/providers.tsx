'use client';

import { useState, useEffect, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http } from 'wagmi';
import { base, mainnet } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';

// Define Katana chain
const katana = {
  id: 747474,
  name: 'Katana',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://rpc.katana.network'] },
    public: { http: ['https://rpc.katana.network'] },
  },
  blockExplorers: {
    default: { name: 'Katana Explorer', url: 'https://explorer.katana.network' },
  },
} as const;

const config = getDefaultConfig({
  appName: 'Katana Intent',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
  chains: [base, katana, mainnet],
  transports: {
    [base.id]: http(),
    [katana.id]: http('https://rpc.katana.network'),
    [mainnet.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

// Dynamically import Header to avoid SSR issues
const Header = dynamic(() => import('@/components/header').then(mod => mod.Header), { 
  ssr: false,
  loading: () => (
    <header className="border-b border-border/40 bg-background h-16">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500" />
          <span className="font-bold text-lg">Katana Intent</span>
        </div>
      </div>
    </header>
  )
});

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {mounted ? (
          <RainbowKitProvider
            theme={darkTheme({
              accentColor: '#8b5cf6',
              accentColorForeground: 'white',
              borderRadius: 'medium',
              fontStack: 'system',
            })}
          >
            <div className="min-h-screen flex flex-col bg-background">
              <Header />
              <main className="flex-1 flex flex-col">
                {children}
              </main>
            </div>
          </RainbowKitProvider>
        ) : (
          <div className="min-h-screen flex flex-col bg-background">
            <header className="border-b border-border/40 bg-background h-16">
              <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500" />
                  <span className="font-bold text-lg">Katana Intent</span>
                </div>
              </div>
            </header>
            <main className="flex-1 flex flex-col">
              {children}
            </main>
          </div>
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
