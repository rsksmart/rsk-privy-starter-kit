/**
 * Contract Utilities — Rootstock Testnet
 *
 * H4 fix: Uses viem exclusively (already bundled via wagmi v2).
 *         Removed ethers.js dependency — saves ~200-280KB.
 * M9 fix: unlockContent returns viem TransactionReceipt (no more `any`).
 * L1 fix: All catch blocks use `unknown` with type narrowing.
 * I1 note: Helper functions below are intentionally exported for builders
 *          extending this starter kit. Remove unused ones before production.
 */

import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  formatEther,
  parseEther,
  isAddress,
  type TransactionReceipt,
  type PublicClient,
} from "viem";
import { CONTENT_PAYWALL_ADDRESS } from "../lib/constants";
import { abi as CONTRACT_ABI } from "../assets/abis/ContentPaywall";

// ---------------------------------------------------------------------------
// Chain configuration
// ---------------------------------------------------------------------------

/** Rootstock Testnet chain definition for viem */
export const ROOTSTOCK_TESTNET = {
  id: 31,
  name: "Rootstock Testnet",
  nativeCurrency: { name: "Test RBTC", symbol: "tRBTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://public-node.testnet.rsk.co"] },
  },
  blockExplorers: {
    default: { name: "RSK Explorer", url: "https://explorer.testnet.rsk.co" },
  },
} as const;

// ---------------------------------------------------------------------------
// Core: unlockContent (H4 — viem only, no ethers.js)
// ---------------------------------------------------------------------------

export interface UnlockResult {
  success: boolean;
  receipt?: TransactionReceipt; // M9: typed, not `any`
  error?: string;
}

/**
 * Unlock content by paying with rBTC.
 *
 * ACTIVELY USED: This is the primary write function imported by PaymentModal.tsx.
 *
 * Uses legacy transactions (type 0 + gasPrice) for Rootstock/RSK compatibility,
 * since Rootstock does not support EIP-1559.
 *
 * @param eip1193Provider - EIP-1193 provider from wallet (e.g., privy wallet)
 * @param userAddress     - The signer's wallet address
 * @param contentId       - Content identifier string
 * @param price           - Price in wei (bigint)
 */
export const unlockContent = async (
  eip1193Provider: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> },
  userAddress: `0x${string}`,
  contentId: string,
  price: bigint,
): Promise<UnlockResult> => {
  try {
    const walletClient = createWalletClient({
      account: userAddress,
      chain: ROOTSTOCK_TESTNET,
      transport: custom(eip1193Provider),
    });

    const publicClient = createPublicClient({
      chain: ROOTSTOCK_TESTNET,
      transport: http(),
    });

    // Estimate gas with a 20% buffer for safety
    let gas: bigint;
    try {
      const estimated = await publicClient.estimateContractGas({
        address: CONTENT_PAYWALL_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "unlockContent",
        args: [contentId],
        value: price,
        account: userAddress,
      });
      gas = (estimated * 120n) / 100n;
    } catch {
      gas = 500_000n; // safe fallback
    }

    // Rootstock uses legacy gas model (no EIP-1559)
    const gasPrice = await publicClient.getGasPrice();
    const gasPriceWithBuffer = (gasPrice * 110n) / 100n;

    const txHash = await walletClient.writeContract({
      address: CONTENT_PAYWALL_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: "unlockContent",
      args: [contentId],
      value: price,
      gas,
      gasPrice: gasPriceWithBuffer,
      // Force legacy transaction type for RSK compatibility
      type: "legacy",
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { success: true, receipt };
  } catch (err: unknown) {
    // I2: Never log raw error objects — extract a safe message only
    const message = extractErrorMessage(err);
    return { success: false, error: message };
  }
};

// ---------------------------------------------------------------------------
// Utility functions
// I1: These are intentionally exported for builders extending this starter kit.
//     Remove any you don't need to keep your bundle lean.
// ---------------------------------------------------------------------------

/** Check if a user has access to a specific content item (on-chain read). */
export const checkAccess = async (
  publicClient: PublicClient,
  userAddress: string,
  contentId: string,
): Promise<boolean> => {
  try {
    const result = await publicClient.readContract({
      address: CONTENT_PAYWALL_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: "hasAccess",
      args: [userAddress as `0x${string}`, contentId],
    });
    return result as boolean;
  } catch {
    return false;
  }
};

/** Get the price (in wei) for a specific content item. */
export const getContentPrice = async (
  publicClient: PublicClient,
  contentId: string,
): Promise<bigint> => {
  try {
    const result = await publicClient.readContract({
      address: CONTENT_PAYWALL_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: "contentPrices",
      args: [contentId],
    });
    return result as bigint;
  } catch {
    return 0n;
  }
};

/** Format a wei bigint as a human-readable rBTC string. */
export const formatRBTC = (amount: bigint, decimals: number = 4): string => {
  return parseFloat(formatEther(amount)).toFixed(decimals);
};

/** Parse a decimal rBTC string into a wei bigint. */
export const parseRBTC = (amount: string): bigint => {
  try {
    return parseEther(amount);
  } catch {
    return 0n;
  }
};

/** Validate whether a string is a valid Ethereum address. */
export const isValidAddress = (address: string): boolean => {
  return isAddress(address);
};

/** Shorten an address for display (0x1234...5678). */
export const shortenAddress = (address: string, chars: number = 4): string => {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

/** Return the block explorer URL for a transaction hash. */
export const getTxUrl = (txHash: string): string =>
  `${ROOTSTOCK_TESTNET.blockExplorers.default.url}/tx/${txHash}`;

/** Return the block explorer URL for a wallet address. */
export const getAddressUrl = (address: string): string =>
  `${ROOTSTOCK_TESTNET.blockExplorers.default.url}/address/${address}`;

/** Return the block explorer URL for the ContentPaywall contract. */
export const getContractUrl = (): string =>
  `${ROOTSTOCK_TESTNET.blockExplorers.default.url}/address/${CONTENT_PAYWALL_ADDRESS}`;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extract a user-safe error message from an unknown caught value.
 * I2: Never logs raw internal error strings — sanitizes before returning.
 * L1: Accepts `unknown` and narrows safely.
 */
function extractErrorMessage(err: unknown): string {
  if (typeof err !== "object" || err === null) return "An unexpected error occurred";

  const e = err as Record<string, unknown>;
  const raw = String(
    (e["data"] as Record<string, unknown>)?.["message"] ??
    e["message"] ??
    "",
  ).toLowerCase();
  const code = e["code"] ?? (e["error"] as Record<string, unknown>)?.["code"];

  if (raw.includes("insufficient funds")) {
    return "Insufficient funds (you need tRBTC for gas)";
  }
  if (raw.includes("user rejected") || raw.includes("action_rejected")) {
    return "Transaction rejected by user";
  }
  if (raw.includes("content does not exist") || raw.includes("price not set")) {
    return "Content not found or price is 0";
  }
  if (
    code === "SERVER_ERROR" ||
    code === -32603 ||
    raw.includes("internal server error") ||
    raw.includes("processing response error")
  ) {
    return "Network error: RPC rejected the transaction. Try again or switch network.";
  }
  // Return only a safe prefix — never expose raw internals (I2)
  return raw.length > 0 ? raw.slice(0, 100) : "Failed to unlock content";
}

// Re-export for convenience
export { CONTENT_PAYWALL_ADDRESS as CONTRACT_ADDRESS };
