/**
 * PaymentModal Component
 *
 * Handles the payment flow for unlocking premium content.
 * After a successful on-chain transaction, calls the backend
 * POST /api/verify-access to exchange a verified address for a signed JWT.
 *
 * Fixes applied:
 *  H4  — Uses viem formatEther; no ethers.js
 *  H5  — No setTimeout; onSuccess() called directly after tx confirmation
 *  M3  — BTC/USD price fetch with 5s AbortController timeout, 60s cache,
 *         USD plausibility validation (1k–500k range), graceful 429 handling
 *  M2  — Footer copy discloses owner may revoke access without on-chain refund
 *  M4  — setIsProcessing(false) called on success path before onSuccess()
 *  M5  — ARIA role="dialog", aria-modal, aria-labelledby, focus trap,
 *         Escape key dismissal, aria-label on close button
 *  M7  — wallets[0] documented assumption
 *  L1  — catch (err: unknown) with type narrowing
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useWallets } from "@privy-io/react-auth";
import { unlockContent } from "../utils/contract";
import { formatEther } from "viem";

// Rootstock Testnet chain ID
const ROOTSTOCK_TESTNET_CHAIN_ID = 31;

// CoinGecko endpoint
const COINGECKO_BTC_USD_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";

// M3: 60-second in-memory BTC/USD price cache
let cachedBtcUsd: { value: number; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60_000;
const BTC_USD_FETCH_TIMEOUT_MS = 5_000;
const BTC_USD_MIN = 1_000;
const BTC_USD_MAX = 500_000;

async function fetchBtcUsdPrice(): Promise<number | null> {
  // Return cached value if fresh
  if (cachedBtcUsd && Date.now() - cachedBtcUsd.fetchedAt < CACHE_TTL_MS) {
    return cachedBtcUsd.value;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BTC_USD_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(COINGECKO_BTC_USD_URL, { signal: controller.signal });

    // M3: Graceful 429 handling
    if (res.status === 429) {
      return cachedBtcUsd?.value ?? null; // use stale cache if available
    }

    if (!res.ok) return null;

    const data = (await res.json()) as { bitcoin?: { usd?: unknown } };
    const usd = data?.bitcoin?.usd;

    // M3: Plausibility validation
    if (typeof usd !== "number" || usd < BTC_USD_MIN || usd > BTC_USD_MAX) {
      return null;
    }

    cachedBtcUsd = { value: usd, fetchedAt: Date.now() };
    return usd;
  } catch {
    // Timeout or network error — fall back to stale cache
    return cachedBtcUsd?.value ?? null;
  } finally {
    clearTimeout(timer);
  }
}

interface PaymentModalProps {
  contentId: string;
  title: string;
  price: bigint;
  onClose: () => void;
  onSuccess: (token: string) => void;
}

export default function PaymentModal({
  contentId,
  title,
  price,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [btcUsdPrice, setBtcUsdPrice] = useState<number | null>(null);

  // M5: Focus trap refs
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = "payment-modal-title";

  // M7: wallets[0] is the primary wallet from Privy.
  // For multi-wallet scenarios, surface a wallet selection UI
  // or use the wallet the user connected most recently.
  const { wallets } = useWallets();

  // M3: Fetch BTC/USD price with timeout + cache + validation
  useEffect(() => {
    let cancelled = false;
    fetchBtcUsdPrice().then((price) => {
      if (!cancelled) setBtcUsdPrice(price);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // M5: Focus first focusable element on mount
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // M5: Escape key dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isProcessing) {
        onClose();
      }
      // Focus trap: tab cycles within the dialog
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isProcessing, onClose]);

  const handlePayment = useCallback(async () => {
    // M7: Use first connected wallet (documented assumption above)
    const wallet = wallets[0];
    if (!wallet) {
      setError("No wallet connected");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // --- Chain verification ---
      const currentChainId =
        typeof wallet.chainId === "string"
          ? parseInt(wallet.chainId.split(":").pop() ?? "0", 10)
          : wallet.chainId;

      if (currentChainId !== ROOTSTOCK_TESTNET_CHAIN_ID) {
        try {
          await wallet.switchChain(ROOTSTOCK_TESTNET_CHAIN_ID);
        } catch {
          setError(
            "Please switch your wallet to Rootstock Testnet (chain ID 31) and try again.",
          );
          setIsProcessing(false);
          return;
        }
      }

      const eip1193Provider = await wallet.getEthereumProvider();

      // H4: Uses viem-based unlockContent (no ethers.js)
      const result = await unlockContent(
        eip1193Provider,
        wallet.address as `0x${string}`,
        contentId,
        price,
      );

      if (result.success && result.receipt) {
        setTxHash(result.receipt.transactionHash);

        // H2: Exchange on-chain tx for a server-issued JWT
        const verifyRes = await fetch(
          `${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/content/verify-access`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: wallet.address,
              contentId,
            }),
          },
        );

        if (!verifyRes.ok) {
          const body = (await verifyRes.json()) as { error?: string };
          setError(body.error ?? "Failed to verify access with server");
          setIsProcessing(false); // M4: reset on failure
          return;
        }

        const { token } = (await verifyRes.json()) as { token: string };

        // H5: No setTimeout — call onSuccess directly after all async work
        // M4: setIsProcessing(false) before onSuccess()
        setIsProcessing(false);
        onSuccess(token);
      } else {
        setError(result.error ?? "Transaction failed");
        setIsProcessing(false); // M4: ensure reset on failure path
      }
    } catch (err: unknown) {
      // L1: err is unknown — narrow safely
      const msg = err instanceof Error ? err.message : "Failed to process payment";
      setError(msg);
      setIsProcessing(false); // M4: ensure reset on error path
    }
  }, [wallets, contentId, price, onSuccess]);

  const priceEther = parseFloat(formatEther(price));

  return (
    /* M5: Backdrop — click outside closes modal (if not processing) */
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      {/* M5: ARIA dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-gray-800 rounded-2xl max-w-md w-full p-6 border border-gray-700 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 id={titleId} className="text-2xl font-bold text-white">
            Unlock Content
          </h2>
          {/* M5: aria-label on close button */}
          <button
            ref={closeButtonRef}
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Close payment dialog"
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <div className="bg-gray-900 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-400 mb-1">Content</p>
            <p className="text-white font-semibold">{title}</p>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-400 mb-1">Price</p>
            {/* H4: formatEther from viem — no ethers.js */}
            <p className="text-2xl text-orange-400 font-bold">
              {priceEther.toFixed(8)} rBTC
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {btcUsdPrice != null
                ? `≈ $${(priceEther * btcUsdPrice).toFixed(2)} USD`
                : "≈ — USD (loading…)"}
            </p>
          </div>

          {/* Transaction Status */}
          {isProcessing && !txHash && (
            <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400" />
                <div>
                  <p className="text-blue-400 font-semibold">Processing Payment...</p>
                  <p className="text-xs text-gray-400">Please confirm in your wallet</p>
                </div>
              </div>
            </div>
          )}

          {txHash && (
            <div className="bg-green-900 bg-opacity-30 border border-green-500 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-green-400 font-semibold">Payment Successful!</p>
                  <a
                    href={`https://explorer.testnet.rsk.co/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline break-all"
                  >
                    View transaction →
                  </a>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-red-400 font-semibold">Payment Failed</p>
                  <p className="text-xs text-gray-400">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={isProcessing || !!txHash}
            className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 rounded-lg transition-all disabled:cursor-not-allowed"
          >
            {isProcessing ? "Processing..." : txHash ? "Completed" : "Confirm Payment"}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4 leading-relaxed">
          By confirming, you pay the exact on-chain price; the contract owner may revoke access
          without a built-in refund. You agree to unlock access as enforced by the smart contract.
        </p>
      </div>
    </div>
  );
}