/**
 * Action Encoders - Encode DeFi actions as calldata
 */

import {
  type Address,
  encodeFunctionData,
  parseUnits,
  maxUint256,
} from "viem";
import {
  CONTRACTS,
  TOKENS,
  WRAPPED_NATIVE,
  ERC20_ABI,
  SUSHI_V2_ROUTER_ABI,
  MORPHO_ABI,
  type TokenInfo,
} from "./config.js";

// ===========================================
// TYPES
// ===========================================

export interface Call {
  target: Address;
  allowFailure: boolean;
  callData: `0x${string}`;
  value?: bigint;
  description: string;
}

export interface SwapParams {
  tokenIn: string; // symbol
  tokenOut: string; // symbol
  amountIn: string; // human readable
  amountOutMin?: string; // human readable, defaults to 0 (use slippage in production!)
  recipient: Address;
  deadline?: number; // unix timestamp, defaults to 30 min from now
}

export interface ApproveParams {
  token: string; // symbol
  spender: Address;
  amount?: string; // human readable, defaults to max
}

export interface MorphoSupplyParams {
  asset: string; // symbol (the loan token)
  amount: string; // human readable
  onBehalf: Address;
  // Market params (simplified - in reality need full market ID)
  collateralToken?: Address;
}

// ===========================================
// HELPERS
// ===========================================

function getToken(symbol: string): TokenInfo {
  const token = TOKENS[symbol.toUpperCase()];
  if (!token) {
    throw new Error(`Unknown token: ${symbol}. Supported: ${Object.keys(TOKENS).join(", ")}`);
  }
  return token;
}

function getDeadline(minutes: number = 30): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + minutes * 60);
}

// ===========================================
// ACTION ENCODERS
// ===========================================

/**
 * Encode ERC20 approve
 */
export function encodeApprove(params: ApproveParams): Call {
  const token = getToken(params.token);
  const amount = params.amount
    ? parseUnits(params.amount, token.decimals)
    : maxUint256;

  const callData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "approve",
    args: [params.spender, amount],
  });

  return {
    target: token.address,
    allowFailure: false,
    callData,
    description: `Approve ${params.amount || "max"} ${token.symbol} for ${params.spender.slice(0, 10)}...`,
  };
}

/**
 * Encode ERC20 transfer
 */
export function encodeTransfer(
  token: string,
  to: Address,
  amount: string
): Call {
  const tokenInfo = getToken(token);
  const amountParsed = parseUnits(amount, tokenInfo.decimals);

  const callData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [to, amountParsed],
  });

  return {
    target: tokenInfo.address,
    allowFailure: false,
    callData,
    description: `Transfer ${amount} ${tokenInfo.symbol} to ${to.slice(0, 10)}...`,
  };
}

/**
 * Encode Sushi V2 swap (tokens for tokens)
 */
export function encodeSwapV2(params: SwapParams): Call[] {
  const tokenIn = getToken(params.tokenIn);
  const tokenOut = getToken(params.tokenOut);
  const amountIn = parseUnits(params.amountIn, tokenIn.decimals);
  const amountOutMin = params.amountOutMin
    ? parseUnits(params.amountOutMin, tokenOut.decimals)
    : 0n;
  const deadline = params.deadline
    ? BigInt(params.deadline)
    : getDeadline(30);

  const calls: Call[] = [];

  // Build path (direct or via WETH)
  let path: Address[];
  if (
    tokenIn.address.toLowerCase() === WRAPPED_NATIVE.toLowerCase() ||
    tokenOut.address.toLowerCase() === WRAPPED_NATIVE.toLowerCase()
  ) {
    path = [tokenIn.address, tokenOut.address];
  } else {
    // Route through WETH
    path = [tokenIn.address, WRAPPED_NATIVE, tokenOut.address];
  }

  // 1. Approve router (if not ETH)
  if (tokenIn.symbol !== "ETH") {
    calls.push(
      encodeApprove({
        token: params.tokenIn,
        spender: CONTRACTS.SUSHI_V2_ROUTER,
        amount: params.amountIn,
      })
    );
  }

  // 2. Swap
  const swapCallData = encodeFunctionData({
    abi: SUSHI_V2_ROUTER_ABI,
    functionName: "swapExactTokensForTokens",
    args: [amountIn, amountOutMin, path, params.recipient, deadline],
  });

  calls.push({
    target: CONTRACTS.SUSHI_V2_ROUTER,
    allowFailure: false,
    callData: swapCallData,
    description: `Swap ${params.amountIn} ${tokenIn.symbol} → ${tokenOut.symbol} via Sushi V2`,
  });

  return calls;
}

/**
 * Encode Morpho supply (simplified - needs market params in production)
 */
export function encodeMorphoSupply(params: MorphoSupplyParams): Call[] {
  const asset = getToken(params.asset);
  const amount = parseUnits(params.amount, asset.decimals);

  const calls: Call[] = [];

  // 1. Approve Morpho
  calls.push(
    encodeApprove({
      token: params.asset,
      spender: CONTRACTS.MORPHO,
      amount: params.amount,
    })
  );

  // 2. Supply
  // Note: This is simplified. Real Morpho supply needs full marketParams struct
  // For now, we'll just encode a placeholder that shows the pattern
  const marketParams = {
    loanToken: asset.address,
    collateralToken: params.collateralToken || TOKENS.WETH.address,
    oracle: "0x0000000000000000000000000000000000000000" as Address, // placeholder
    irm: "0x0000000000000000000000000000000000000000" as Address, // placeholder
    lltv: 0n, // placeholder
  };

  const supplyCallData = encodeFunctionData({
    abi: MORPHO_ABI,
    functionName: "supply",
    args: [marketParams, amount, 0n, params.onBehalf, "0x"],
  });

  calls.push({
    target: CONTRACTS.MORPHO,
    allowFailure: false,
    callData: supplyCallData,
    description: `Supply ${params.amount} ${asset.symbol} to Morpho`,
  });

  return calls;
}

/**
 * Encode WETH wrap (ETH → WETH)
 */
export function encodeWrapETH(amount: string): Call {
  const amountParsed = parseUnits(amount, 18);

  // WETH deposit() function
  const callData = encodeFunctionData({
    abi: [
      {
        inputs: [],
        name: "deposit",
        outputs: [],
        stateMutability: "payable",
        type: "function",
      },
    ],
    functionName: "deposit",
  });

  return {
    target: TOKENS.WETH.address,
    allowFailure: false,
    callData,
    value: amountParsed,
    description: `Wrap ${amount} ETH → WETH`,
  };
}

/**
 * Encode WETH unwrap (WETH → ETH)
 */
export function encodeUnwrapETH(amount: string): Call {
  const amountParsed = parseUnits(amount, 18);

  const callData = encodeFunctionData({
    abi: [
      {
        inputs: [{ name: "wad", type: "uint256" }],
        name: "withdraw",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
    ],
    functionName: "withdraw",
    args: [amountParsed],
  });

  return {
    target: TOKENS.WETH.address,
    allowFailure: false,
    callData,
    description: `Unwrap ${amount} WETH → ETH`,
  };
}
