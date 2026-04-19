/**
 * Dashboard Page
 *
 * H1/H2 fix: fullContent strings removed entirely from the JS bundle.
 *            After unlock, the backend issues a JWT; ContentCard uses
 *            that JWT to fetch full content from /api/content/:id/full.
 * L5  fix: Merged CONTENT_IDS + CONTENT_META into a single typed
 *           CONTENT_CATALOG — no more parallel arrays with implicit
 *           index coupling.
 * I3  fix: Passes address + login to ContentCard (no duplicate useAccount).
 */

import { useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import type { Abi } from "viem";
import { rootstockTestnet } from "viem/chains";
import ContentCard from "../components/ContentCard";
import { CONTENT_PAYWALL_ADDRESS } from "../lib/constants";
import { abi as ContentPaywallABI } from "../assets/abis/ContentPaywall";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// ---------------------------------------------------------------------------
// L5: Single unified catalog — no parallel arrays, no index coupling.
//
// H1: previewContent is the ONLY content in the JS bundle.
//     fullContent lives exclusively on the backend (server/src/services/content.ts).
// ---------------------------------------------------------------------------
interface ContentItem {
  contentId: string;
  title: string;
  description: string;
  previewContent: string;
  imageUrl: string;
}

const CONTENT_CATALOG: ContentItem[] = [
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

/** Stable array of content IDs derived from the catalog (no separate constant) */
const CATALOG_IDS = CONTENT_CATALOG.map((c) => c.contentId);

export function Dashboard() {
  const { authenticated, login } = usePrivy();
  // I3: address defined here, passed as prop — ContentCard won't duplicate useAccount
  const { address } = useAccount();

  // H1/H2: Map of contentId → JWT token (issued by backend after on-chain verify)
  const [accessTokens, setAccessTokens] = useState<Record<string, string>>({});

  const {
    data: accessList,
    refetch: refetchAccess,
    isLoading: isLoadingAccess,
  } = useReadContract({
    address: CONTENT_PAYWALL_ADDRESS as `0x${string}`,
    abi: ContentPaywallABI as Abi,
    functionName: "checkMultipleAccess",
    args: [address ?? ZERO_ADDRESS, [...CATALOG_IDS]],
    chainId: rootstockTestnet.id,
  });

  const {
    data: pricesData,
    refetch: refetchPrices,
    isLoading: isLoadingPrices,
  } = useReadContracts({
    contracts: CATALOG_IDS.map((id) => ({
      address: CONTENT_PAYWALL_ADDRESS as `0x${string}`,
      abi: ContentPaywallABI as Abi,
      functionName: "contentPrices" as const,
      args: [id],
      chainId: rootstockTestnet.id,
    })),
  });

  const isLoading = isLoadingAccess || isLoadingPrices;

  // L5: contentItems derived from unified CONTENT_CATALOG — no index assumptions
  const contentItems = useMemo(() => {
    const access = (accessList as boolean[] | undefined) ?? [];
    return CONTENT_CATALOG.map((item, i) => ({
      ...item,
      hasAccess: access[i] ?? false,
      price: (pricesData?.[i]?.result as bigint | undefined) ?? 0n,
    }));
  }, [accessList, pricesData]);

  const handleUnlock = (contentId: string, token: string) => {
    // Store JWT issued by backend; ContentCard uses it to fetch full content
    setAccessTokens((prev) => ({ ...prev, [contentId]: token }));
    refetchAccess();
    refetchPrices();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Premium Content <span className="text-orange-400">Marketplace</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Unlock exclusive content with rBTC. All purchases are secured on the
            Rootstock blockchain.
          </p>
        </div>

        {/* M2: End-user disclosure — contract owner trust assumptions (see contracts/README.md) */}
        <div
          role="note"
          aria-label="Paywall trust notice"
          className="max-w-3xl mx-auto mb-10 rounded-xl border border-amber-600/40 bg-amber-950/20 px-5 py-4 text-left text-sm text-amber-100/90"
        >
          <p className="font-semibold text-amber-200 mb-1">Before you pay</p>
          <p className="leading-relaxed text-amber-100/80">
            This marketplace uses an on-chain paywall contract. The contract owner can revoke access
            for moderation purposes{" "}
            <span className="text-amber-200">without an automatic on-chain refund</span>. Premium
            text is delivered only from this app&apos;s backend after your wallet is verified on-chain
            — treat this as a developer starter pattern, not financial or legal advice.
          </p>
        </div>

        {/* Stats — visible when authenticated */}
        {authenticated && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-3">
                <div className="bg-orange-500 bg-opacity-20 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Available Content</p>
                  <p className="text-white text-2xl font-bold">{contentItems.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 bg-opacity-20 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Blockchain Secured</p>
                  <p className="text-white text-2xl font-bold">Rootstock</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 bg-opacity-20 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Instant Access</p>
                  <p className="text-white text-2xl font-bold">~30s</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Unauthenticated prompt */}
        {!authenticated && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 text-center mb-12">
            <svg className="w-16 h-16 text-orange-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-6">
              Sign in with your social account to start unlocking premium content
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Secured by Bitcoin • No seed phrases required
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            <>
              {CATALOG_IDS.map((id) => (
                <div key={id} className="bg-gray-800 rounded-xl p-6 animate-pulse">
                  <div className="h-48 bg-gray-700 rounded-lg mb-4" />
                  <div className="h-6 bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-700 rounded w-full mb-4" />
                </div>
              ))}
            </>
          ) : (
            contentItems.map((item) => (
              <ContentCard
                key={item.contentId}
                contentId={item.contentId}
                title={item.title}
                description={item.description}
                previewContent={item.previewContent}
                imageUrl={item.imageUrl}
                hasAccess={item.hasAccess}
                accessToken={accessTokens[item.contentId]}
                price={item.price}
                address={address}
                onConnect={login}
                onUnlock={(token) => handleUnlock(item.contentId, token)}
              />
            ))
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-full px-6 py-3">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-gray-400">
              Connected to{" "}
              <span className="text-white font-semibold">Rootstock Testnet</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
