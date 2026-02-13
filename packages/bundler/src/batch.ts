/**
 * Batch Builder - Compose multiple actions into a single multicall
 */

import {
  type Address,
  encodeFunctionData,
  createPublicClient,
  http,
} from "viem";
import { katana, KATANA_RPC, CONTRACTS, MULTICALL3_ABI } from "./config.js";
import {
  type Call,
  type SwapParams,
  type ApproveParams,
  type MorphoSupplyParams,
  encodeApprove,
  encodeTransfer,
  encodeSwapV2,
  encodeMorphoSupply,
  encodeWrapETH,
  encodeUnwrapETH,
} from "./actions.js";

// ===========================================
// BATCH BUILDER CLASS
// ===========================================

export class BatchBuilder {
  private calls: Call[] = [];
  private totalValue: bigint = 0n;

  /**
   * Add a raw call
   */
  addCall(call: Call): this {
    this.calls.push(call);
    if (call.value) {
      this.totalValue += call.value;
    }
    return this;
  }

  /**
   * Add multiple calls
   */
  addCalls(calls: Call[]): this {
    for (const call of calls) {
      this.addCall(call);
    }
    return this;
  }

  /**
   * Approve token spending
   */
  approve(params: ApproveParams): this {
    return this.addCall(encodeApprove(params));
  }

  /**
   * Transfer tokens
   */
  transfer(token: string, to: Address, amount: string): this {
    return this.addCall(encodeTransfer(token, to, amount));
  }

  /**
   * Swap via Sushi V2
   */
  swap(params: SwapParams): this {
    return this.addCalls(encodeSwapV2(params));
  }

  /**
   * Supply to Morpho
   */
  supplyMorpho(params: MorphoSupplyParams): this {
    return this.addCalls(encodeMorphoSupply(params));
  }

  /**
   * Wrap ETH to WETH
   */
  wrapETH(amount: string): this {
    return this.addCall(encodeWrapETH(amount));
  }

  /**
   * Unwrap WETH to ETH
   */
  unwrapETH(amount: string): this {
    return this.addCall(encodeUnwrapETH(amount));
  }

  /**
   * Get all calls
   */
  getCalls(): Call[] {
    return [...this.calls];
  }

  /**
   * Get total ETH value needed
   */
  getValue(): bigint {
    return this.totalValue;
  }

  /**
   * Get human-readable description of all calls
   */
  describe(): string[] {
    return this.calls.map((c, i) => `${i + 1}. ${c.description}`);
  }

  /**
   * Build multicall transaction data
   */
  build(): {
    to: Address;
    data: `0x${string}`;
    value: bigint;
    calls: Call[];
  } {
    if (this.calls.length === 0) {
      throw new Error("No calls to batch");
    }

    // Format calls for Multicall3.aggregate3
    const multicallCalls = this.calls.map((call) => ({
      target: call.target,
      allowFailure: call.allowFailure,
      callData: call.callData,
    }));

    const data = encodeFunctionData({
      abi: MULTICALL3_ABI,
      functionName: "aggregate3",
      args: [multicallCalls],
    });

    return {
      to: CONTRACTS.MULTICALL3,
      data,
      value: this.totalValue,
      calls: this.calls,
    };
  }

  /**
   * Simulate the batch (dry run)
   */
  async simulate(from: Address): Promise<{
    success: boolean;
    results: { success: boolean; returnData: string }[];
    error?: string;
  }> {
    const client = createPublicClient({
      chain: katana,
      transport: http(KATANA_RPC),
    });

    const { to, data, value } = this.build();

    try {
      const result = await client.simulateContract({
        address: to,
        abi: MULTICALL3_ABI,
        functionName: "aggregate3",
        args: [
          this.calls.map((call) => ({
            target: call.target,
            allowFailure: call.allowFailure,
            callData: call.callData,
          })),
        ],
        account: from,
        value,
      });

      return {
        success: true,
        results: result.result.map((r) => ({
          success: r.success,
          returnData: r.returnData,
        })),
      };
    } catch (e: any) {
      return {
        success: false,
        results: [],
        error: e.message,
      };
    }
  }

  /**
   * Reset the builder
   */
  clear(): this {
    this.calls = [];
    this.totalValue = 0n;
    return this;
  }
}

/**
 * Create a new batch builder
 */
export function batch(): BatchBuilder {
  return new BatchBuilder();
}
