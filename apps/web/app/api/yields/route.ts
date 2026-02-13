import { NextResponse } from 'next/server';

// Types matching the yield package
interface HistoricalAPY {
  current: number;
  avg7d: number;
  avg30d: number;
  avg50d: number;
  trend: 'up' | 'down' | 'stable';
  volatility: 'low' | 'medium' | 'high';
}

interface YieldOpportunity {
  id: string;
  protocol: string;
  name: string;
  asset: string;
  apy: number;
  tvl: string;
  risk: 'low' | 'medium' | 'high';
  description: string;
  historical: HistoricalAPY;
  chainId: number;
  chainName: string;
  // Spectra-specific fields
  isFixed?: boolean;
  isYieldToken?: boolean;
  maturity?: string;
  ptPrice?: number;
  ytPrice?: number;
}

// Katana yields (simulated since not on DeFiLlama)
const KATANA_YIELDS: YieldOpportunity[] = [
  {
    id: 'morpho-usdc-katana',
    protocol: 'Morpho',
    name: 'Morpho USDC',
    asset: 'USDC',
    apy: 0.082,
    tvl: '12500000',
    risk: 'low',
    description: 'Supply USDC to Morpho Blue',
    chainId: 747474,
    chainName: 'Katana',
    historical: {
      current: 0.082,
      avg7d: 0.079,
      avg30d: 0.076,
      avg50d: 0.073,
      trend: 'up',
      volatility: 'low',
    },
  },
  {
    id: 'morpho-weth-katana',
    protocol: 'Morpho',
    name: 'Morpho WETH',
    asset: 'WETH',
    apy: 0.045,
    tvl: '8200000',
    risk: 'low',
    description: 'Supply WETH to Morpho Blue',
    chainId: 747474,
    chainName: 'Katana',
    historical: {
      current: 0.045,
      avg7d: 0.043,
      avg30d: 0.041,
      avg50d: 0.039,
      trend: 'up',
      volatility: 'low',
    },
  },
  {
    id: 'yearn-usdc-katana',
    protocol: 'Yearn',
    name: 'Yearn USDC Vault',
    asset: 'USDC',
    apy: 0.095,
    tvl: '6800000',
    risk: 'medium',
    description: 'Yearn auto-compounding vault',
    chainId: 747474,
    chainName: 'Katana',
    historical: {
      current: 0.095,
      avg7d: 0.091,
      avg30d: 0.088,
      avg50d: 0.085,
      trend: 'up',
      volatility: 'medium',
    },
  },
  {
    id: 'yearn-weth-katana',
    protocol: 'Yearn',
    name: 'Yearn WETH Vault',
    asset: 'WETH',
    apy: 0.052,
    tvl: '4500000',
    risk: 'medium',
    description: 'Yearn auto-compounding vault',
    chainId: 747474,
    chainName: 'Katana',
    historical: {
      current: 0.052,
      avg7d: 0.054,
      avg30d: 0.051,
      avg50d: 0.048,
      trend: 'stable',
      volatility: 'medium',
    },
  },
  {
    id: 'spectra-pt-usdc-mar25',
    protocol: 'Spectra',
    name: 'PT-yvUSDC (Mar 2025)',
    asset: 'USDC',
    apy: 0.11,
    tvl: '3200000',
    risk: 'low',
    description: 'Fixed 11% APY, matures Mar 2025',
    chainId: 747474,
    chainName: 'Katana',
    historical: {
      current: 0.11,
      avg7d: 0.11,
      avg30d: 0.11,
      avg50d: 0.11,
      trend: 'stable',
      volatility: 'low',
    },
    isFixed: true,
    maturity: '2025-03-31',
    ptPrice: 0.95,
  },
  {
    id: 'spectra-yt-usdc-mar25',
    protocol: 'Spectra',
    name: 'YT-yvUSDC (Mar 2025)',
    asset: 'USDC',
    apy: 1.7, // Leveraged yield exposure
    tvl: '320000',
    risk: 'high',
    description: 'Leveraged yield exposure, speculative',
    chainId: 747474,
    chainName: 'Katana',
    historical: {
      current: 1.7,
      avg7d: 1.6,
      avg30d: 1.5,
      avg50d: 1.4,
      trend: 'up',
      volatility: 'high',
    },
    isYieldToken: true,
    maturity: '2025-03-31',
    ytPrice: 0.05,
  },
  {
    id: 'spectra-pt-weth-jun25',
    protocol: 'Spectra',
    name: 'PT-yvWETH (Jun 2025)',
    asset: 'WETH',
    apy: 0.065,
    tvl: '1800000',
    risk: 'low',
    description: 'Fixed 6.5% APY, matures Jun 2025',
    chainId: 747474,
    chainName: 'Katana',
    historical: {
      current: 0.065,
      avg7d: 0.065,
      avg30d: 0.065,
      avg50d: 0.065,
      trend: 'stable',
      volatility: 'low',
    },
    isFixed: true,
    maturity: '2025-06-30',
    ptPrice: 0.97,
  },
  {
    id: 'sushi-usdc-weth-katana',
    protocol: 'Sushi LP',
    name: 'Sushi USDC/WETH LP',
    asset: 'USDC-WETH',
    apy: 0.18,
    tvl: '2100000',
    risk: 'high',
    description: 'Provide liquidity, earn fees + rewards',
    chainId: 747474,
    chainName: 'Katana',
    historical: {
      current: 0.18,
      avg7d: 0.165,
      avg30d: 0.155,
      avg50d: 0.145,
      trend: 'up',
      volatility: 'high',
    },
  },
];

// Ethereum yields (from DeFiLlama-like data)
const ETH_YIELDS: YieldOpportunity[] = [
  {
    id: 'aave-usdc-eth',
    protocol: 'Aave V3',
    name: 'Aave USDC',
    asset: 'USDC',
    apy: 0.065,
    tvl: '1200000000',
    risk: 'low',
    description: 'Supply USDC to Aave V3',
    chainId: 1,
    chainName: 'Ethereum',
    historical: {
      current: 0.065,
      avg7d: 0.062,
      avg30d: 0.058,
      avg50d: 0.055,
      trend: 'up',
      volatility: 'low',
    },
  },
  {
    id: 'morpho-usdc-eth',
    protocol: 'Morpho',
    name: 'Morpho USDC',
    asset: 'USDC',
    apy: 0.072,
    tvl: '450000000',
    risk: 'low',
    description: 'Supply USDC to Morpho Blue',
    chainId: 1,
    chainName: 'Ethereum',
    historical: {
      current: 0.072,
      avg7d: 0.069,
      avg30d: 0.066,
      avg50d: 0.063,
      trend: 'up',
      volatility: 'low',
    },
  },
  {
    id: 'yearn-usdc-eth',
    protocol: 'Yearn',
    name: 'Yearn USDC',
    asset: 'USDC',
    apy: 0.085,
    tvl: '180000000',
    risk: 'medium',
    description: 'Yearn auto-compounding',
    chainId: 1,
    chainName: 'Ethereum',
    historical: {
      current: 0.085,
      avg7d: 0.082,
      avg30d: 0.078,
      avg50d: 0.075,
      trend: 'up',
      volatility: 'medium',
    },
  },
];

// Base yields
const BASE_YIELDS: YieldOpportunity[] = [
  {
    id: 'aero-usdc-base',
    protocol: 'Aerodrome',
    name: 'Aerodrome USDC/WETH',
    asset: 'USDC-WETH',
    apy: 0.22,
    tvl: '85000000',
    risk: 'high',
    description: 'Concentrated LP with AERO rewards',
    chainId: 8453,
    chainName: 'Base',
    historical: {
      current: 0.22,
      avg7d: 0.195,
      avg30d: 0.175,
      avg50d: 0.16,
      trend: 'up',
      volatility: 'high',
    },
  },
  {
    id: 'moonwell-usdc-base',
    protocol: 'Moonwell',
    name: 'Moonwell USDC',
    asset: 'USDC',
    apy: 0.058,
    tvl: '120000000',
    risk: 'low',
    description: 'Supply USDC to Moonwell',
    chainId: 8453,
    chainName: 'Base',
    historical: {
      current: 0.058,
      avg7d: 0.055,
      avg30d: 0.052,
      avg50d: 0.049,
      trend: 'up',
      volatility: 'low',
    },
  },
];

// Fixed vs Variable comparison data
const SPECTRA_COMPARISONS = [
  {
    asset: 'USDC',
    maturity: '2025-03-31',
    daysToMaturity: 46,
    fixedAPY: 0.11,
    variableAPY: 0.085,
    ptPrice: 0.95,
    ytPrice: 0.05,
    recommendation: 'fixed',
    reason: 'Fixed yield (11%) beats expected variable (8.5%)',
  },
  {
    asset: 'WETH',
    maturity: '2025-06-30',
    daysToMaturity: 137,
    fixedAPY: 0.065,
    variableAPY: 0.052,
    ptPrice: 0.97,
    ytPrice: 0.03,
    recommendation: 'fixed',
    reason: 'Fixed yield (6.5%) beats expected variable (5.2%)',
  },
  {
    asset: 'DAI',
    maturity: '2025-09-30',
    daysToMaturity: 229,
    fixedAPY: 0.095,
    variableAPY: 0.078,
    ptPrice: 0.92,
    ytPrice: 0.08,
    recommendation: 'fixed',
    reason: 'Fixed yield (9.5%) beats expected variable (7.8%)',
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get('chainId');
  const asset = searchParams.get('asset');
  const type = searchParams.get('type');

  // Return fixed vs variable comparisons
  if (type === 'comparison') {
    let comparisons = SPECTRA_COMPARISONS;
    if (asset) {
      comparisons = comparisons.filter(
        (c) => c.asset.toUpperCase() === asset.toUpperCase()
      );
    }
    return NextResponse.json({ comparisons });
  }

  // Return only fixed yield opportunities
  if (type === 'fixed') {
    const fixedYields = KATANA_YIELDS.filter((y: any) => y.isFixed);
    return NextResponse.json({ yields: fixedYields });
  }

  // Return only variable yield opportunities
  if (type === 'variable') {
    const variableYields = [...KATANA_YIELDS, ...ETH_YIELDS, ...BASE_YIELDS].filter(
      (y: any) => !y.isFixed && !y.isYieldToken
    );
    return NextResponse.json({ yields: variableYields });
  }

  let yields = [...KATANA_YIELDS, ...ETH_YIELDS, ...BASE_YIELDS];

  if (chainId) {
    yields = yields.filter((y) => y.chainId === parseInt(chainId));
  }

  if (asset) {
    yields = yields.filter(
      (y) =>
        y.asset.toUpperCase().includes(asset.toUpperCase()) ||
        y.asset.toUpperCase() === asset.toUpperCase()
    );
  }

  // Sort by 30d average APY (sustained yield)
  yields.sort((a, b) => b.historical.avg30d - a.historical.avg30d);

  return NextResponse.json({ yields });
}
