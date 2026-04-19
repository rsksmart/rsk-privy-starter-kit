import { defineChain } from "viem";

export const rsktestnet = defineChain({
  id: 31,
  name: "Rootstock Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Rootstock Smart Bitcoin",
    symbol: "tRBTC",
  },
  rpcUrls: {
    default: {
      http: ["https://public-node.testnet.rsk.co"],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer.testnet.rsk.co" },
  },
  contracts: {
    // Canonical Multicall3 contract — do NOT replace this with the ContentPaywall address.
    // wagmi/viem uses this internally to batch eth_call requests (useReadContracts).
    // See: https://www.multicall3.com/
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
    },
  },
});
