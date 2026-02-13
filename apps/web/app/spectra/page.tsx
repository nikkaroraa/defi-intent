'use client';

import { useState, useEffect } from 'react';
import {
  Lock,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Zap,
} from 'lucide-react';

interface Comparison {
  asset: string;
  maturity: string;
  daysToMaturity: number;
  fixedAPY: number;
  variableAPY: number;
  ptPrice: number;
  ytPrice: number;
  recommendation: 'fixed' | 'variable' | 'neutral';
  reason: string;
}

interface FixedYield {
  id: string;
  name: string;
  asset: string;
  apy: number;
  tvl: string;
  description: string;
  maturity: string;
  ptPrice: number;
}

export default function SpectraPage() {
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [fixedYields, setFixedYields] = useState<FixedYield[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [compRes, fixedRes] = await Promise.all([
          fetch('/api/yields?type=comparison'),
          fetch('/api/yields?type=fixed'),
        ]);
        const compData = await compRes.json();
        const fixedData = await fixedRes.json();
        setComparisons(compData.comparisons || []);
        setFixedYields(fixedData.yields || []);
      } catch (e) {
        console.error('Failed to fetch Spectra data:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatPercent = (val: number) => `${(val * 100).toFixed(2)}%`;

  const filteredComparisons =
    selectedAsset === 'all'
      ? comparisons
      : comparisons.filter((c) => c.asset === selectedAsset);

  const assets = ['all', ...Array.from(new Set(comparisons.map((c) => c.asset)))];

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Lock className="w-8 h-8 text-blue-500" />
          Spectra Finance
        </h1>
        <p className="text-gray-400">
          Fixed-rate yields via PT/YT tokenization. Lock in your APY.
        </p>
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-800/50 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">⚡ How Spectra Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div>
              <div className="font-medium">Deposit IBT</div>
              <div className="text-sm text-gray-400">
                Deposit yield-bearing tokens (yvUSDC, etc.)
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div>
              <div className="font-medium">Get PT + YT</div>
              <div className="text-sm text-gray-400">
                Receive Principal Token + Yield Token
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div>
              <div className="font-medium">Choose Strategy</div>
              <div className="text-sm text-gray-400">
                Hold PT (fixed yield) or YT (leveraged variable)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Filter */}
      <div className="flex gap-2 mb-6">
        {assets.map((asset) => (
          <button
            key={asset}
            onClick={() => setSelectedAsset(asset)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              selectedAsset === asset
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {asset === 'all' ? 'All Assets' : asset}
          </button>
        ))}
      </div>

      {/* Fixed vs Variable Comparison */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Fixed vs Variable Comparison
        </h2>

        {loading ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
            Loading comparisons...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredComparisons.map((comp) => (
              <div
                key={`${comp.asset}-${comp.maturity}`}
                className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden"
              >
                {/* Header */}
                <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">{comp.asset}</span>
                    <span className="text-sm text-gray-500">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {comp.daysToMaturity} days to maturity
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      comp.recommendation === 'fixed'
                        ? 'bg-blue-500/20 text-blue-400'
                        : comp.recommendation === 'variable'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {comp.recommendation === 'fixed' ? '🔒 Fixed Better' : '📈 Variable Better'}
                  </span>
                </div>

                {/* Comparison */}
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Fixed */}
                    <div
                      className={`p-4 rounded-lg border ${
                        comp.recommendation === 'fixed'
                          ? 'border-blue-500/50 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Fixed (PT)</span>
                        <Lock className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="text-2xl font-bold text-blue-400">
                        {formatPercent(comp.fixedAPY)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        PT Price: {comp.ptPrice.toFixed(4)}
                      </div>
                    </div>

                    {/* Variable */}
                    <div
                      className={`p-4 rounded-lg border ${
                        comp.recommendation === 'variable'
                          ? 'border-purple-500/50 bg-purple-500/10'
                          : 'border-gray-700 bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Variable</span>
                        <TrendingUp className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="text-2xl font-bold text-purple-400">
                        {formatPercent(comp.variableAPY)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Current rate</div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="bg-gray-800/50 rounded-lg p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                      <span className="text-gray-300">{comp.reason}</span>
                    </div>
                  </div>

                  {/* Action */}
                  <button className="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4" />
                    Deposit into PT
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed Yield Opportunities */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-blue-500" />
          Fixed Yield Opportunities
        </h2>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3 text-right">Fixed APY</th>
                <th className="px-4 py-3 text-right">PT Price</th>
                <th className="px-4 py-3 text-right">Maturity</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : fixedYields.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No fixed yield opportunities
                  </td>
                </tr>
              ) : (
                fixedYields.map((y: any) => (
                  <tr
                    key={y.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{y.name}</div>
                      <div className="text-xs text-gray-500">{y.description}</div>
                    </td>
                    <td className="px-4 py-3 font-mono">{y.asset}</td>
                    <td className="px-4 py-3 text-right font-mono text-blue-400 font-semibold">
                      {formatPercent(y.apy)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-400">
                      {y.ptPrice?.toFixed(4) || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {y.maturity || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
                        Deposit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Educational Section */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">📚 Understanding PT & YT</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Principal Token (PT)
            </h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Trades at a discount to underlying</li>
              <li>• Redeemable 1:1 at maturity</li>
              <li>• Discount = your fixed yield</li>
              <li>• Low risk, predictable returns</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-purple-400 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Yield Token (YT)
            </h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Claims yield generated until maturity</li>
              <li>• Leveraged exposure to variable rates</li>
              <li>• Value → 0 at maturity</li>
              <li>• High risk, speculative</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
            <div className="text-sm text-yellow-200">
              <strong>Note:</strong> YT is a speculative instrument. Only invest what you can
              afford to lose. PT is safer for fixed-income strategies.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
