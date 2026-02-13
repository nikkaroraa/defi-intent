'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { Sword, History, Settings, ArrowLeftRight, TrendingUp, Skull, Lock, Waves } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sword className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg gradient-text">Katana Intent</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link 
            href="/" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Chat
          </Link>
          <Link 
            href="/swap" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Swap
          </Link>
          <Link 
            href="/rebalance" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <TrendingUp className="w-4 h-4" />
            Yields
          </Link>
          <Link 
            href="/spectra" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Lock className="w-4 h-4" />
            Spectra
          </Link>
          <Link 
            href="/hyperliquid" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Waves className="w-4 h-4" />
            HLP
          </Link>
          <Link 
            href="/liquidator" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Skull className="w-4 h-4" />
            Liquidator
          </Link>
          <Link 
            href="/history" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <History className="w-4 h-4" />
            History
          </Link>
          <Link 
            href="/settings" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </nav>

        {/* Wallet Connect */}
        <ConnectButton 
          showBalance={false}
          chainStatus="icon"
          accountStatus={{
            smallScreen: 'avatar',
            largeScreen: 'full',
          }}
        />
      </div>
    </header>
  );
}
