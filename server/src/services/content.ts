/**
 * Content Service — Server-Side Only
 *
 * H1 fix: Full content strings are stored exclusively on the server.
 * The React JS bundle NEVER contains premium content — it only receives
 * content after the backend has verified on-chain payment (H2).
 *
 * In a production environment, replace these strings with database queries,
 * IPFS fetches, or CMS API calls.
 */

export interface ContentMeta {
  contentId: string;
  title: string;
  description: string;
  previewContent: string;
  imageUrl: string;
}

/** Public metadata — safe to return to unauthenticated clients */
export const CONTENT_CATALOG: ContentMeta[] = [
  {
    contentId: "0",
    title: "Bitcoin Security Deep Dive",
    description:
      "Learn how Bitcoin's merged mining secures Rootstock and why it matters for your dApps",
    previewContent:
      "Bitcoin's security model is the gold standard in cryptocurrency. Through merged mining, Rootstock inherits this security while adding smart contract capabilities. In this comprehensive guide, we'll explore...",
    imageUrl:
      "https://res.cloudinary.com/ducsu6916/image/upload/v1770028051/photo-1639762681485-074b7f938ba0_ptmkor.jpg",
  },
  {
    contentId: "1",
    title: "Building DeFi on Rootstock",
    description:
      "Complete course on creating decentralized finance applications with Bitcoin security",
    previewContent:
      "This comprehensive course covers everything you need to build production-ready DeFi applications on Rootstock. Topics include liquidity pools, yield farming, flash loans, and more...",
    imageUrl:
      "https://res.cloudinary.com/ducsu6916/image/upload/v1770028051/photo-1551288049-bebda4e38f71_bl4uh7.jpg",
  },
  {
    contentId: "2",
    title: "2025 Blockchain Industry Report",
    description:
      "Exclusive analysis of blockchain trends, market data, and investment opportunities",
    previewContent:
      "Our annual blockchain industry report provides deep insights into market trends, emerging technologies, and investment opportunities for 2025. This year's report covers...",
    imageUrl:
      "https://res.cloudinary.com/ducsu6916/image/upload/v1770028051/photo-1460925895917-afdab827c52f_hofi2s.jpg",
  },
];

/**
 * Full content — server-side only, never sent to unauthenticated clients.
 * Keyed by contentId for O(1) lookup.
 */
const FULL_CONTENT: Record<string, string> = {
  "0": `Bitcoin's security model is the gold standard in cryptocurrency. Through merged mining, Rootstock inherits this security while adding smart contract capabilities.

Merged mining allows Bitcoin miners to simultaneously mine both Bitcoin and Rootstock blocks without additional computational cost. This means Rootstock benefits from over 50% of Bitcoin's hash power — billions of dollars worth of mining infrastructure.

When you deploy smart contracts on Rootstock, you're not just getting EVM compatibility. You're getting Bitcoin-grade security that has withstood over a decade of attacks. This makes Rootstock ideal for high-value applications like DeFi, NFTs, and payment systems.

The process works through a clever cryptographic technique where RSK block hashes are embedded in Bitcoin blocks. If a miner successfully mines a Bitcoin block, they've also contributed to securing Rootstock. The economic incentives align perfectly — miners earn fees from both networks.

For developers, this means you can build with confidence knowing your smart contracts are protected by the most secure blockchain network in existence.`,

  "1": `🎥 COURSE CONTENT

Module 1: Introduction to Rootstock DeFi
- Understanding the Rootstock ecosystem
- Why Bitcoin security matters for DeFi
- Setting up your development environment

Module 2: Smart Contract Development
- Writing secure Solidity contracts
- Testing with Hardhat
- Gas optimization techniques

Module 3: Building a DEX
- Automated Market Maker (AMM) design
- Liquidity pool implementation
- Swap functionality and pricing

Module 4: Yield Farming Protocols
- Staking mechanisms
- Reward distribution
- Time-locked vaults

Module 5: Advanced Topics
- Flash loans
- Oracle integration
- Cross-chain bridges

Total Duration: 8 hours
Includes: Source code, exercises, and project templates`,

  "2": `📊 BLOCKCHAIN INDUSTRY REPORT 2025

Executive Summary:
The blockchain industry has reached an inflection point. With Bitcoin ETFs approved and institutional adoption accelerating, we're seeing unprecedented growth across all sectors.

Key Findings:

1. Bitcoin Layer 2 Solutions
- Rootstock and similar platforms experiencing 400% growth
- Smart contract deployments up 650% YoY
- Total Value Locked (TVL) exceeds $5B

2. DeFi Evolution
- Real-world asset tokenization reaching $50B
- Decentralized exchanges handling $2T in annual volume
- Yield opportunities ranging from 5-20% APY

3. Institutional Adoption
- 78% of Fortune 500 companies exploring blockchain
- $100B in institutional capital deployed
- Regulatory clarity improving in major markets

4. Technology Trends
- Zero-knowledge proofs becoming mainstream
- Account abstraction improving UX
- Cross-chain interoperability maturing

5. Investment Opportunities
- Infrastructure: Scaling solutions, bridges, oracles
- Applications: DeFi, gaming, social platforms
- Enterprise: Supply chain, identity, payments

Market Projections:
- Total blockchain market cap: $5T by EOY 2025
- Active users: 500M globally
- Smart contract deployments: 100M+

This report includes 50+ charts, detailed analysis, and actionable insights for investors and builders.`,
};

/**
 * Return full content for a given contentId.
 * Returns null if the contentId is unknown.
 */
export function getFullContent(contentId: string): string | null {
  return FULL_CONTENT[contentId] ?? null;
}

/**
 * Return public metadata for all content items.
 * Never includes fullContent strings.
 */
export function getAllContentMeta(): ContentMeta[] {
  return CONTENT_CATALOG;
}

/**
 * Return public metadata for a single content item.
 * Returns null if the contentId is unknown.
 */
export function getContentMeta(contentId: string): ContentMeta | null {
  return CONTENT_CATALOG.find((c) => c.contentId === contentId) ?? null;
}
