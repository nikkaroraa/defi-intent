'use client';

import { Settings, Wallet, Bell, Shield, ExternalLink } from 'lucide-react';
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function SettingsPage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Wallet Section */}
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold">Wallet</h2>
          </div>

          {isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Connected Address</p>
                  <p className="font-mono text-sm">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                </div>
                <a
                  href={`https://basescan.org/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View on Explorer
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <button
                onClick={() => disconnect()}
                className="w-full py-2 px-4 rounded-lg border border-border text-sm hover:bg-accent transition-colors"
              >
                Disconnect Wallet
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Connect your wallet to use DeFi Intent
              </p>
              <ConnectButton />
            </div>
          )}
        </section>

        {/* Notifications Section */}
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold">Notifications</h2>
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
              Coming Soon
            </span>
          </div>

          <div className="space-y-3 opacity-50">
            <label className="flex items-center justify-between cursor-not-allowed">
              <span className="text-sm">Liquidation Alerts</span>
              <input type="checkbox" disabled className="rounded" />
            </label>
            <label className="flex items-center justify-between cursor-not-allowed">
              <span className="text-sm">Yield Changes</span>
              <input type="checkbox" disabled className="rounded" />
            </label>
            <label className="flex items-center justify-between cursor-not-allowed">
              <span className="text-sm">Transaction Confirmations</span>
              <input type="checkbox" disabled className="rounded" />
            </label>
          </div>
        </section>

        {/* Security Section */}
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold">Security</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Transaction Confirmations</p>
                <p className="text-xs text-muted-foreground">
                  Always confirm before executing
                </p>
              </div>
              <div className="w-10 h-6 bg-primary rounded-full flex items-center justify-end p-1">
                <div className="w-4 h-4 bg-white rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Simulation Mode</p>
                <p className="text-xs text-muted-foreground">
                  Preview transactions before signing
                </p>
              </div>
              <div className="w-10 h-6 bg-primary rounded-full flex items-center justify-end p-1">
                <div className="w-4 h-4 bg-white rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="text-center text-sm text-muted-foreground">
          <p>DeFi Intent v0.1.0</p>
          <p className="mt-1">
            Built by{' '}
            <a
              href="https://twitter.com/nikkaroraa"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              @nikkaroraa
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
