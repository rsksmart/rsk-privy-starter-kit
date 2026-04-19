/**
 * ContentCard Component
 *
 * Displays a single premium content item with a paywall gate.
 *
 * H1 fix: fullContent is no longer a prop — it's fetched from the backend
 *         with a JWT token after payment verification. The JS bundle never
 *         contains premium content strings.
 * H4 fix: Uses viem formatEther; no ethers.js BigNumber bridge.
 * I3 fix: Removed duplicate useAccount hook — receives address + login as props.
 * I5 fix: "Connect Wallet to Unlock" triggers login() instead of being inert.
 */

import { useState, useEffect } from "react";
import { formatEther } from "viem";
import PaymentModal from "./PaymentModal";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

interface ContentCardProps {
  contentId: string;
  title: string;
  description: string;
  previewContent: string;
  /** H1: No fullContent prop — fetched from backend using JWT */
  imageUrl?: string;
  /** From contract: checkMultipleAccess / hasAccess */
  hasAccess: boolean;
  /** Token from /api/verify-access — provided by Dashboard after unlock */
  accessToken?: string;
  /** From contract: contentPrices(contentId) — in wei (bigint) */
  price: bigint;
  /** I3: Passed from Dashboard — avoids duplicate useAccount call */
  address?: string;
  /** I5: Passed from Dashboard — triggers wallet connection */
  onConnect?: () => void;
  onUnlock?: (token: string) => void;
}

export default function ContentCard({
  contentId,
  title,
  description,
  previewContent,
  imageUrl,
  hasAccess,
  accessToken,
  price,
  address,
  onConnect,
  onUnlock,
}: ContentCardProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [fullContent, setFullContent] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // H1/H2: Fetch full content from backend using JWT when access is granted
  useEffect(() => {
    if (!hasAccess || !accessToken) return;

    let cancelled = false;
    setIsFetching(true);
    setFetchError(null);

    fetch(`${API_BASE}/api/content/${contentId}/full`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? "Failed to load content");
        }
        return res.json() as Promise<{ fullContent: string }>;
      })
      .then((data) => {
        if (cancelled || !data) return;
        setFullContent(data.fullContent);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFetchError(err instanceof Error ? err.message : "Failed to load content");
      })
      .finally(() => {
        if (!cancelled) setIsFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasAccess, accessToken, contentId]);

  return (
    <>
      <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700 hover:border-orange-400 transition-all">
        {/* Image */}
        {imageUrl && (
          <div className="relative h-48 overflow-hidden">
            <img
              src={imageUrl}
              alt={title}
              className={`w-full h-full object-cover ${!hasAccess ? "blur-sm" : ""}`}
            />
            {!hasAccess && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <svg className="w-12 h-12 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-xl font-bold text-white">{title}</h3>

            {/* H4: viem formatEther — no ethers.js */}
            {!hasAccess && price > 0n && (
              <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                {parseFloat(formatEther(price)).toFixed(8)} rBTC
              </span>
            )}
            {hasAccess && (
              <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Unlocked
              </span>
            )}
          </div>

          <p className="text-gray-400 text-sm mb-4">{description}</p>

          {/* Content Preview / Full */}
          <div className="bg-gray-900 rounded-lg p-4 mb-4 min-h-[80px]">
            {hasAccess ? (
              isFetching ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-400" />
                  Loading premium content…
                </div>
              ) : fetchError ? (
                <p className="text-red-400 text-sm">{fetchError}</p>
              ) : fullContent ? (
                <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                  {fullContent}
                </p>
              ) : (
                <p className="text-gray-500 text-sm">Content unavailable</p>
              )
            ) : (
              <p className="text-gray-500 text-sm leading-relaxed blur-sm select-none">
                {previewContent}
              </p>
            )}
          </div>

          {/* Action Button */}
          {!hasAccess && (
            <button
              id={`unlock-btn-${contentId}`}
              onClick={() => {
                if (!address) {
                  // I5: trigger login() instead of being disabled/inert
                  onConnect?.();
                } else {
                  setShowPaymentModal(true);
                }
              }}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-105"
            >
              {address ? (
                <>
                  <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Unlock Content
                </>
              ) : (
                "Connect Wallet to Unlock"
              )}
            </button>
          )}

          {hasAccess && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              You have full access — content loaded from server
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && price > 0n && (
        <PaymentModal
          contentId={contentId}
          title={title}
          price={price}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={(token) => {
            setShowPaymentModal(false);
            onUnlock?.(token);
          }}
        />
      )}
    </>
  );
}