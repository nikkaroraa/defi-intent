'use client';

import { useState, useEffect, useMemo, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { RainbowKitProvider, darkTheme, getDefaultConfig, connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  rabbyWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base, mainnet, arbitrum } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import '@rainbow-me/rainbowkit/styles.css';

const chains = [mainnet, base, arbitrum] as const;
const transports = {
  [mainnet.id]: http(process.env.NEXT_PUBLIC_ETH_RPC_URL || 'https://eth.llamarpc.com'),
  [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
  [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARB_RPC_URL || 'https://arb1.arbitrum.io/rpc'),
};

// Minimal SSR-safe config (no WalletConnect — just injected wallets)
const ssrConfig = createConfig({
  chains,
  transports,
  connectors: [injected()],
  ssr: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Dynamically import Header to avoid SSR issues
const Header = dynamic(() => import('@/components/header').then(mod => mod.Header), {
  ssr: false,
  loading: () => (
    <header className="border-b border-border/60 bg-gray-950/80 h-14">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600" />
          <span className="font-semibold text-base text-gray-100">DeFi<span className="text-indigo-400"> Intent</span></span>
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

  // Full config with WalletConnect — only created client-side to avoid indexedDB SSR error
  const config = useMemo(() => {
    if (!mounted) return ssrConfig;
    const connectors = connectorsForWallets(
      [
        {
          groupName: 'Popular',
          wallets: [rabbyWallet, metaMaskWallet, coinbaseWallet, walletConnectWallet, injectedWallet],
        },
      ],
      {
        appName: 'DeFi Intent',
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
      }
    );
    return createConfig({
      chains,
      transports,
      connectors,
      ssr: true,
    });
  }, [mounted]);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#6366f1',
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
          })}
        >
          <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-1 flex flex-col">{children}</main>
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
