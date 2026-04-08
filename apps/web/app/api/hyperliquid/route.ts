import { NextResponse } from 'next/server';

/**
 * Hyperliquid API route — fetches real data from Hyperliquid's public API
 */

const HL_API = 'https://api.hyperliquid.xyz/info';

// Cache
let cache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 15_000; // 15 seconds

async function hlRequest(body: Record<string, unknown>) {
  const res = await fetch(HL_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Hyperliquid API: ${res.status}`);
  return res.json();
}

async function fetchHyperliquidData() {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  try {
    // Fetch lending rates and HLP vault details in parallel
    const [lendingRates, hlpDetails] = await Promise.allSettled([
      hlRequest({ type: 'allBorrowLendReserveStates' }),
      hlRequest({ type: 'vaultDetails', vaultAddress: '0xfefefefefefefefefefefefefefefefefefefefe' }),
    ]);

    // Process lending rates
    // Hyperliquid returns tuples: [tokenIndex, { supplyYearlyRate, borrowYearlyRate, ... }]
    const TOKEN_NAMES: Record<number, string> = { 0: 'USDC', 150: 'PURR', 197: 'BTC', 198: 'ETH', 199: 'SOL', 200: 'HYPE', 360: 'USDT' };
    const lending = lendingRates.status === 'fulfilled' ? lendingRates.value : [];
    const lendingData = Array.isArray(lending)
      ? lending
          .map((entry: any) => {
            // Handle both tuple format [tokenIndex, data] and object format
            const tokenIndex = Array.isArray(entry) ? entry[0] : entry.token;
            const r = Array.isArray(entry) ? entry[1] : entry;
            const supplyRate = parseFloat(r.supplyYearlyRate || r.supplyApy || '0');
            const borrowRate = parseFloat(r.borrowYearlyRate || r.borrowApy || '0');
            return {
              asset: TOKEN_NAMES[tokenIndex] || r.tokenName || `Token-${tokenIndex}`,
              supplyApy: supplyRate * 100,
              borrowApy: borrowRate * 100,
              utilization: parseFloat(r.utilization || r.utilizationRate || '0') * 100,
              totalSupply: r.totalSupplied || r.totalSupply || '0',
              totalBorrow: r.totalBorrowed || r.totalBorrow || '0',
            };
          })
          .filter((r: any) => r.supplyApy > 0 || r.borrowApy > 0)
      : [];

    // Process HLP details
    let hlp = {
      tvl: 0,
      apy: 0,
      positions: [] as { coin: string; exposure: number; weight: number }[],
      performance: { daily: 0, weekly: 0, monthly: 0 },
    };

    if (hlpDetails.status === 'fulfilled' && hlpDetails.value) {
      const d = hlpDetails.value;
      const tvl = parseFloat(d.portfolio?.accountValue || '0');
      const apy = d.apr || 0;
      const positions = d.portfolio?.positions || [];
      const totalExposure = positions.reduce(
        (sum: number, p: any) => sum + Math.abs(parseFloat(p.positionValue || '0')),
        0
      );

      hlp = {
        tvl,
        apy,
        positions: positions.slice(0, 5).map((p: any) => {
          const exposure = Math.abs(parseFloat(p.positionValue || '0'));
          return {
            coin: p.coin,
            exposure,
            weight: totalExposure > 0 ? exposure / totalExposure : 0,
          };
        }),
        performance: {
          daily: apy / 365,
          weekly: apy / 52,
          monthly: apy / 12,
        },
      };
    }

    const result = { hlp, lending: lendingData };
    cache = { data: result, timestamp: now };
    return result;
  } catch (err) {
    console.error('Hyperliquid fetch error:', err);
    return { hlp: { tvl: 0, apy: 0, positions: [], performance: { daily: 0, weekly: 0, monthly: 0 } }, lending: [] };
  }
}

export async function GET() {
  const data = await fetchHyperliquidData();
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' },
  });
}
