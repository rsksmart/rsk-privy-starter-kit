/**
 * Blockchain Service
 *
 * Server-side on-chain access verification using viem.
 * This is the authoritative access check — it queries the deployed
 * ContentPaywall contract directly, not from the client.
 *
 * H2 fix: Backend verification layer — access decisions are never
 * made solely from client-side state or contract reads.
 */

import { createPublicClient, http, isAddress } from "viem";
import { config } from "../config.js";

/**
 * ContentPaywall ABI — only the functions the server needs.
 * Keeping this minimal reduces surface area.
 */
const CONTENT_PAYWALL_ABI = [
  {
    name: "hasAccess",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "contentId", type: "string" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

/** Viem public client connected to Rootstock Testnet via server-side RPC */
const publicClient = createPublicClient({
  transport: http(config.rskRpcUrl),
  chain: {
    id: config.chainId,
    name: "Rootstock Testnet",
    nativeCurrency: { name: "Test RBTC", symbol: "tRBTC", decimals: 18 },
    rpcUrls: { default: { http: [config.rskRpcUrl] } },
  },
});

/**
 * Verify whether a wallet address has paid for (or been granted) access
 * to a specific content item.
 *
 * Calls hasAccess(user, contentId) on the deployed ContentPaywall contract.
 * This is a view call — no gas is consumed.
 *
 * @param userAddress - EVM wallet address (0x-prefixed)
 * @param contentId   - Content identifier (e.g. "0", "1", "2")
 * @returns true if access is verified on-chain, false otherwise
 * @throws if the address is malformed or the RPC call fails
 */
export async function verifyOnChainAccess(
  userAddress: string,
  contentId: string,
): Promise<boolean> {
  if (!isAddress(userAddress)) {
    throw new Error(`Invalid wallet address: ${userAddress}`);
  }

  const hasAccess = await publicClient.readContract({
    address: config.contractAddress,
    abi: CONTENT_PAYWALL_ABI,
    functionName: "hasAccess",
    args: [userAddress as `0x${string}`, contentId],
  });

  return hasAccess;
}
