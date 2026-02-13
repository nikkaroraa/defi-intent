'use client';

import { useState, useEffect } from 'react';
import {
  Waves,
  TrendingUp,
  DollarSign,
  PieChart,
  RefreshCw,
  ExternalLink,
  Percent,
} from 'lucide-react';

interface HLPInfo {
  tvl: number;
  apy: number;
  positions: Array<{
    coin: string;
    exposure: number;
    weight: number;
  }>;
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

interface LendingRate {
  token: string;
  supplyApy: number;
  borrowApy: number;
  utilization: number;
  totalSupply: number;
}

export default function HyperliquidPage() {
  const [hlp, setHlp] = useState<HLPInfo | null>(null);
  const [lendingRates, setLendingRates] = useState<LendingRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated data for demo
    setHlp({
      tvl: 850_000_000,
      apy: 25.5,
      positions: [
        { coin: 'BTC', exposure: 125_000_000, weight: 0.147 },
        { coin: 'ETH', exposure: 180_000_000, weight: 0.212 },
        { coin: 'SOL', exposure: 95_000_000, weight: 0.112 },
        { coin: 'HYPE', exposure: 75_000_000, weight: 0.088 },
        { coin: 'Others', exposure: 375_000_000, weight: 0.441 },
      ],
      performance: {
        daily: 0.07,
        weekly: 0.52,
        monthly: 2.13,
      },
    });

    setLendingRates([
      { token: 'USDC', supplyApy: 8.5, borrowApy: 12.3, utilization: 75, totalSupply: 125_000_000 },
      { token: 'USDT', supplyApy: 7.2, borrowApy: 10.8, utilization: 68, totalSupply: 98_000_000 },
      { token: 'ETH', supplyApy: 3.1, borrowApy: 5.5, utilization: 45, totalSupply: 45_000_000 },
      { token: 'BTC', supplyApy: 2.8, borrowApy: 4.9, utilization: 38, totalSupply: 32_000_000 },
    ]);

    setLoading(false);
  }, []);

  const formatUSD = (val: number) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString()}`;
  };

  const formatPercent = (val: number, showSign = false) => {
    const sign = showSign && val > 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}%`;
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Waves className="w-8 h-8 text-cyan-500" />
          Hyperliquid
        </h1>
        <p className="text-gray-400">
          HLP vault, lending rates, and yield opportunities
        </p>
        <a
          href="https://app.hyperliquid.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-2"
        >
          Open Hyperliquid App <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* HLP Card */}
      {hlp && (
        <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-800/50 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                🏦 HLP (Hyperliquid Liquidity Provider)
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Protocol vault providing liquidity for all perpetual markets
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-cyan-400">
                {formatPercent(hlp.apy)}
              </div>
              <div className="text-sm text-gray-400">APY</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">TVL</div>
              <div className="text-xl font-semibold">{formatUSD(hlp.tvl)}</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Daily</div>
              <div className={`text-xl font-semibold ${hlp.performance.daily >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatPercent(hlp.performance.daily, true)}
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Weekly</div>
              <div className={`text-xl font-semibold ${hlp.performance.weekly >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatPercent(hlp.performance.weekly, true)}
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Monthly</div>
              <div className={`text-xl font-semibold ${hlp.performance.monthly >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatPercent(hlp.performance.monthly, true)}
              </div>
            </div>
          </div>

          {/* Position Breakdown */}
          <div>
            <h3 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Position Breakdown
            </h3>
            <div className="space-y-2">
              {hlp.positions.map((pos) => (
                <div key={pos.coin} className="flex items-center gap-3">
                  <span className="w-16 text-sm font-medium">{pos.coin}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                      style={{ width: `${pos.weight * 100}%` }}
                    />
                  </div>
                  <span className="w-16 text-sm text-gray-400 text-right">
                    {(pos.weight * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button className="w-full mt-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium transition-colors">
            Deposit into HLP
          </button>
        </div>
      )}

      {/* Lending Rates */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Percent className="w-5 h-5 text-green-500" />
          Lending & Borrowing Rates
        </h2>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3 text-right">Supply APY</th>
                <th className="px-4 py-3 text-right">Borrow APY</th>
                <th className="px-4 py-3 text-right">Utilization</th>
                <th className="px-4 py-3 text-right">Total Supply</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Loading rates...
                  </td>
                </tr>
              ) : (
                lendingRates.map((rate) => (
                  <tr
                    key={rate.token}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{rate.token}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-400">
                      {formatPercent(rate.supplyApy)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-red-400">
                      {formatPercent(rate.borrowApy)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-gray-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              rate.utilization > 80
                                ? 'bg-red-500'
                                : rate.utilization > 60
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${rate.utilization}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-400 w-12">
                          {rate.utilization}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {formatUSD(rate.totalSupply)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button className="text-xs px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors">
                        Supply
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Yield Comparison */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          📊 Yield Comparison: Hyperliquid vs Others
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-2">USDC Supply</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-cyan-400">Hyperliquid</span>
                <span className="font-mono font-semibold">8.50%</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Aave V3</span>
                <span className="font-mono">3.50%</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Morpho</span>
                <span className="font-mono">4.20%</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-2">ETH Supply</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-cyan-400">Hyperliquid</span>
                <span className="font-mono font-semibold">3.10%</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Lido</span>
                <span className="font-mono">3.50%</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Aave V3</span>
                <span className="font-mono">1.80%</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-2">HLP vs GMX GLP</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-cyan-400">HLP</span>
                <span className="font-mono font-semibold">25.50%</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>GMX GLP</span>
                <span className="font-mono">18.20%</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Gains Network</span>
                <span className="font-mono">15.80%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
