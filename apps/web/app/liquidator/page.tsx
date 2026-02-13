'use client';

import { useState, useEffect } from 'react';
import {
  Skull,
  TrendingDown,
  DollarSign,
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
} from 'lucide-react';

interface Opportunity {
  id: string;
  user: string;
  market: string;
  loanToken: string;
  collateralToken: string;
  healthFactor: number;
  borrowAmount: string;
  collateralAmount: string;
  maxRepayable: string;
  maxSeizable: string;
  estimatedProfit: string;
  timestamp: number;
}

interface Liquidation {
  id: string;
  txHash: string;
  user: string;
  market: string;
  repaidAmount: string;
  seizedAmount: string;
  profit: string;
  timestamp: number;
}

export default function LiquidatorPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [history, setHistory] = useState<Liquidation[]>([]);
  const [stats, setStats] = useState({
    totalOpportunities: 0,
    totalPotentialProfit: '0',
    avgHealthFactor: '0',
  });
  const [historyStats, setHistoryStats] = useState({
    totalLiquidations: 0,
    totalProfit: '0',
  });
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [tab, setTab] = useState<'opportunities' | 'history'>('opportunities');
  const [isConnected, setIsConnected] = useState(false);

  // Check wallet connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { useAccount } = await import('wagmi');
        // This is a simplified check - in production use proper wagmi hooks
        setIsConnected(false);
      } catch {}
    };
    checkConnection();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch opportunities
      const oppRes = await fetch('/api/liquidations?type=opportunities');
      const oppData = await oppRes.json();
      setOpportunities(oppData.opportunities || []);
      setStats(oppData.stats || {});

      // Fetch history
      const histRes = await fetch('/api/liquidations?type=history');
      const histData = await histRes.json();
      setHistory(histData.liquidations || []);
      setHistoryStats(histData.stats || {});
    } catch (e) {
      console.error('Failed to fetch liquidation data:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  const HealthBadge = ({ hf }: { hf: number }) => {
    let color = 'bg-green-500/20 text-green-400 border-green-500/30';
    let icon = <CheckCircle className="w-3 h-3" />;

    if (hf < 0.9) {
      color = 'bg-red-500/20 text-red-400 border-red-500/30';
      icon = <AlertTriangle className="w-3 h-3" />;
    } else if (hf < 1) {
      color = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      icon = <TrendingDown className="w-3 h-3" />;
    }

    return (
      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${color}`}>
        {icon}
        {hf.toFixed(3)}
      </span>
    );
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Skull className="w-8 h-8 text-red-500" />
          Liquidation Bot
        </h1>
        <p className="text-gray-400">
          Monitor and execute Morpho Blue liquidations on Katana
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <AlertTriangle className="w-4 h-4" />
            Opportunities
          </div>
          <div className="text-2xl font-bold text-red-400">{stats.totalOpportunities}</div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            Potential Profit
          </div>
          <div className="text-2xl font-bold text-green-400">${stats.totalPotentialProfit}</div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Activity className="w-4 h-4" />
            Avg Health Factor
          </div>
          <div className="text-2xl font-bold text-yellow-400">{stats.avgHealthFactor}</div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <CheckCircle className="w-4 h-4" />
            Total Liquidated
          </div>
          <div className="text-2xl font-bold text-purple-400">${historyStats.totalProfit}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('opportunities')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              tab === 'opportunities'
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🎯 Opportunities ({opportunities.length})
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              tab === 'history'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            📜 History ({history.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-700"
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-3 py-2 text-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Opportunities Tab */}
      {tab === 'opportunities' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3 text-center">Health</th>
                <th className="px-4 py-3 text-right">Debt</th>
                <th className="px-4 py-3 text-right">Collateral</th>
                <th className="px-4 py-3 text-right">Max Repay</th>
                <th className="px-4 py-3 text-right text-green-400">Est. Profit</th>
                <th className="px-4 py-3 text-center">Age</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Scanning for liquidatable positions...
                  </td>
                </tr>
              ) : opportunities.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    ✅ No liquidatable positions found
                  </td>
                </tr>
              ) : (
                opportunities.map((opp, i) => (
                  <tr
                    key={opp.id}
                    className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                      opp.healthFactor < 0.9 ? 'bg-red-500/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-sm">
                      {formatAddress(opp.user)}
                    </td>
                    <td className="px-4 py-3 font-medium">{opp.market}</td>
                    <td className="px-4 py-3 text-center">
                      <HealthBadge hf={opp.healthFactor} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      ${opp.borrowAmount}
                      <div className="text-xs text-gray-500">{opp.loanToken}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {opp.collateralAmount}
                      <div className="text-xs text-gray-500">{opp.collateralToken}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-400">
                      ${opp.maxRepayable}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-green-400 font-semibold">
                      ${opp.estimatedProfit}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500 text-sm">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {formatTime(opp.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        disabled={!isConnected}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg transition-colors mx-auto"
                      >
                        <Zap className="w-3 h-3" />
                        Liquidate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
                <th className="px-4 py-3">TX</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3 text-right">Repaid</th>
                <th className="px-4 py-3 text-right">Seized</th>
                <th className="px-4 py-3 text-right text-green-400">Profit</th>
                <th className="px-4 py-3 text-center">Time</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No liquidation history yet
                  </td>
                </tr>
              ) : (
                history.map((liq) => (
                  <tr
                    key={liq.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-sm text-purple-400">
                      {liq.txHash}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {formatAddress(liq.user)}
                    </td>
                    <td className="px-4 py-3 font-medium">{liq.market}</td>
                    <td className="px-4 py-3 text-right font-mono">${liq.repaidAmount}</td>
                    <td className="px-4 py-3 text-right font-mono">{liq.seizedAmount}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-400 font-semibold">
                      ${liq.profit}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500 text-sm">
                      {formatTime(liq.timestamp)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Bot Status */}
      <div className="mt-8 bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          🤖 Bot Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Min Profit Threshold</label>
            <input
              type="text"
              defaultValue="$10"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Max Gas Price (gwei)</label>
            <input
              type="text"
              defaultValue="50"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Execution Mode</label>
            <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
              <option>Simulation (Dry Run)</option>
              <option>Direct Liquidation</option>
              <option>Flash Loan</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            disabled={!isConnected}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm transition-colors"
          >
            {isConnected ? 'Start Bot' : 'Connect Wallet to Start'}
          </button>
        </div>
      </div>
    </div>
  );
}
