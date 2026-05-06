'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sword,
  MessageSquare,
  ArrowLeftRight,
  TrendingUp,
  History,
  Settings,
  Menu,
  X,
} from 'lucide-react';

type NavLink = { href: string; label: string; icon: any };

const NAV_ITEMS: NavLink[] = [
  { href: '/app', label: 'Chat', icon: MessageSquare },
  { href: '/app/swap', label: 'Swap', icon: ArrowLeftRight },
  { href: '/app/rebalance', label: 'Yields', icon: TrendingUp },
];

const SECONDARY_ITEMS: NavLink[] = [
  { href: '/app/history', label: 'History', icon: History },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  return (
    <header className="border-b border-border/60 backdrop-blur-xl bg-gray-950/80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/app"
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity shrink-0"
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Sword className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-base text-gray-100">
            DeFi<span className="text-indigo-400"> Intent</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                isActive(item.href)
                  ? 'bg-indigo-600/15 text-indigo-400 font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          ))}

          <div className="w-px h-5 bg-border mx-1" />

          {SECONDARY_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                isActive(item.href)
                  ? 'text-indigo-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon className="w-3.5 h-3.5" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus={{
              smallScreen: 'avatar',
              largeScreen: 'full',
            }}
          />

          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border/60 bg-gray-950/95 backdrop-blur-xl">
          <nav className="p-4 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                  isActive(item.href)
                    ? 'bg-indigo-600/15 text-indigo-400 font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
            <div className="border-t border-border/60 pt-2 mt-2">
              {SECONDARY_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                    isActive(item.href)
                      ? 'text-indigo-400'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
