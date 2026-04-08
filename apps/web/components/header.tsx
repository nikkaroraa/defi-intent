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
  Skull,
  Waves,
  History,
  Settings,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';

type NavLink = { href: string; label: string; icon: any; children?: undefined };
type NavGroup = { label: string; icon: any; href?: undefined; children: NavLink[] };
type NavItem = NavLink | NavGroup;

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Chat', icon: MessageSquare },
  { href: '/swap', label: 'Swap', icon: ArrowLeftRight },
  { href: '/rebalance', label: 'Yields', icon: TrendingUp },
  {
    label: 'Advanced',
    icon: ChevronDown,
    children: [
      { href: '/spectra', label: 'Spectra', icon: TrendingUp },
      { href: '/hyperliquid', label: 'Hyperliquid', icon: Waves },
      { href: '/liquidator', label: 'Liquidator', icon: Skull },
    ],
  },
];

const SECONDARY_ITEMS = [
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isActive = (href: string) => pathname === href;
  const isAdvancedActive = ['/spectra', '/hyperliquid', '/liquidator'].includes(pathname);

  return (
    <header className="border-b border-border/60 backdrop-blur-xl bg-gray-950/80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity shrink-0"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sword className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-base text-gray-100">
            Katana<span className="text-indigo-400"> Intent</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 ml-8">
          {NAV_ITEMS.map((item) =>
            item.href !== undefined ? (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200
                  ${
                    isActive(item.href)
                      ? 'bg-indigo-600/15 text-indigo-400 font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }
                `}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            ) : item.children ? (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setDropdownOpen(true)}
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <button
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200
                    ${
                      isAdvancedActive
                        ? 'bg-indigo-600/15 text-indigo-400 font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }
                  `}
                >
                  Advanced
                  <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-44 bg-card border border-border rounded-xl shadow-2xl shadow-black/40 py-1 z-50">
                    {item.children!.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`
                          flex items-center gap-2 px-3 py-2.5 text-sm transition-colors
                          ${
                            isActive(child.href)
                              ? 'text-indigo-400 bg-indigo-600/10'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                          }
                        `}
                      >
                        <child.icon className="w-4 h-4" />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : null
          )}

          <div className="w-px h-5 bg-border mx-1" />

          {SECONDARY_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-200
                ${
                  isActive(item.href)
                    ? 'text-indigo-400'
                    : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              <item.icon className="w-3.5 h-3.5" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Wallet Connect */}
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus={{
              smallScreen: 'avatar',
              largeScreen: 'full',
            }}
          />

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/60 bg-gray-950/95 backdrop-blur-xl">
          <nav className="p-4 space-y-1">
            {NAV_ITEMS.map((item) =>
              item.href !== undefined ? (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors
                    ${
                      isActive(item.href)
                        ? 'bg-indigo-600/15 text-indigo-400 font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }
                  `}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ) : item.children ? (
                <div key={item.label}>
                  <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Advanced
                  </div>
                  {item.children!.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setMobileOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ml-2
                        ${
                          isActive(child.href)
                            ? 'bg-indigo-600/15 text-indigo-400 font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }
                      `}
                    >
                      <child.icon className="w-4 h-4" />
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : null
            )}
            <div className="border-t border-border/60 pt-2 mt-2">
              {SECONDARY_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors
                    ${
                      isActive(item.href)
                        ? 'text-indigo-400'
                        : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
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
