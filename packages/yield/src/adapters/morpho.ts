/**
 * Morpho Yield Adapter
 * Fetches lending yields from Morpho Blue markets
 */

import { createPublicClient, http, type Address, formatUnits } from "viem";
import { katana, KATANA_RPC, CONTRACTS, TOKENS, type YieldOpportunity } from "../config.js";

// Known Morpho markets on Katana (simplified - real impl would query factory)
const MORPHO_MARKETS: {
  id: string;
  name: string;
  loanToken: Address;
  loanSymbol: string;
  collateralToken: Address;
  collateralSymbol: string;
  estimatedApy: number; // placeholder until we can query real rates
}[] = [
  {
    id: "morpho-usdc-weth",
    name: "USDC/WETH Market",
    loanToken: TOKENS.USDC.address,
    loanSymbol: "USDC",
    collateralToken: TOKENS.WETH.address,
    collateralSymbol: "WETH",
    estimatedApy: 0.045, // 4.5%
  },
  {
    id: "morpho-usdc-wbtc",
    name: "USDC/WBTC Market",
    loanToken: TOKENS.USDC.address,
    loanSymbol: "USDC",
    collateralToken: TOKENS.WBTC.address,
    collateralSymbol: "WBTC",
    estimatedApy: 0.038, // 3.8%
  },
  {
    id: "morpho-weth-wsteth",
    name: "WETH/wstETH Market",
    loanToken: TOKENS.WETH.address,
    loanSymbol: "WETH",
    collateralToken: TOKENS.wstETH.address,
    collateralSymbol: "wstETH",
    estimatedApy: 0.025, // 2.5%
  },
  {
    id: "morpho-usdt-weth",
    name: "USDT/WETH Market",
    loanToken: TOKENS.USDT.address,
    loanSymbol: "USDT",
    collateralToken: TOKENS.WETH.address,
    collateralSymbol: "WETH",
    estimatedApy: 0.042, // 4.2%
  },
];

/**
 * Fetch Morpho lending yields
 */
export async function fetchMorphoYields(): Promise<YieldOpportunity[]> {
  const client = createPublicClient({
    chain: katana,
    transport: http(KATANA_RPC),
  });

  const opportunities: YieldOpportunity[] = [];

  for (const market of MORPHO_MARKETS) {
    // In production, we'd query the actual market state for real APY
    // For now, use estimated APYs
    opportunities.push({
      id: market.id,
      protocol: "morpho",
      name: market.name,
      asset: market.loanSymbol,
      assetAddress: market.loanToken,
      apy: market.estimatedApy,
      tvl: 0n, // TODO: query real TVL
      contractAddress: CONTRACTS.MORPHO,
      risk: "low",
      description: `Lend ${market.loanSymbol} against ${market.collateralSymbol} collateral`,
    });
  }

  return opportunities;
}

/**
 * Get best Morpho yield for an asset
 */
export async function getBestMorphoYield(asset: string): Promise<YieldOpportunity | null> {
  const yields = await fetchMorphoYields();
  const filtered = yields.filter((y) => y.asset.toUpperCase() === asset.toUpperCase());

  if (filtered.length === 0) return null;

  return filtered.reduce((best, current) => (current.apy > best.apy ? current : best));
}
