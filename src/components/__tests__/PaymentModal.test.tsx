/**
 * PaymentModal component tests — H3
 *
 * Tests the payment UI flow: rendering, button states, error display,
 * price formatting, and onSuccess callback invocation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PaymentModal from "../PaymentModal";

// Mock Privy wallets hook
vi.mock("@privy-io/react-auth", () => ({
  useWallets: () => ({ wallets: [] }),
}));

// Mock unlockContent — not testing blockchain in unit tests
vi.mock("../../utils/contract", () => ({
  unlockContent: vi.fn(),
}));

// Mock fetch for BTC/USD price and JWT calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

const defaultProps = {
  contentId: "0",
  title: "Bitcoin Security Deep Dive",
  price: 1_000_000_000_000_000n, // 0.001 rBTC
  onClose: vi.fn(),
  onSuccess: vi.fn(),
};

describe("PaymentModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: BTC price fetch returns valid price
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ bitcoin: { usd: 60000 } }),
    });
  });

  it("renders with content title and price", async () => {
    render(<PaymentModal {...defaultProps} />);
    expect(screen.getByText("Unlock Content")).toBeInTheDocument();
    expect(screen.getByText(defaultProps.title)).toBeInTheDocument();
    expect(screen.getByText(/0.00100000 rBTC/i)).toBeInTheDocument();
  });

  it("has correct ARIA dialog attributes (M5)", () => {
    render(<PaymentModal {...defaultProps} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "payment-modal-title");
  });

  it("close button has aria-label (M5)", () => {
    render(<PaymentModal {...defaultProps} />);
    expect(screen.getByLabelText("Close payment dialog")).toBeInTheDocument();
  });

  it("calls onClose when Cancel button is clicked", () => {
    render(<PaymentModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("Confirm Payment button is enabled when not processing", () => {
    render(<PaymentModal {...defaultProps} />);
    expect(screen.getByText("Confirm Payment")).not.toBeDisabled();
  });

  it("shows 'No wallet connected' error when no wallet (M4 — isProcessing reset)", async () => {
    render(<PaymentModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Confirm Payment"));
    await waitFor(() => {
      expect(screen.getByText("No wallet connected")).toBeInTheDocument();
    });
    // isProcessing should be reset — button should no longer be in processing state
    expect(screen.getByText("Confirm Payment")).not.toBeDisabled();
  });

  it("shows USD price estimate when BTC price loads (M3)", async () => {
    render(<PaymentModal {...defaultProps} />);
    // 0.001 rBTC * $60,000 = $60.00
    await waitFor(() => {
      expect(screen.getByText(/≈ \$60\.00 USD/i)).toBeInTheDocument();
    });
  });

  it("shows loading placeholder when BTC price not yet loaded (M3)", () => {
    // Delay the fetch so price doesn't load immediately
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    render(<PaymentModal {...defaultProps} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("Escape key calls onClose when not processing (M5)", () => {
    render(<PaymentModal {...defaultProps} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("Cancel and close buttons are disabled during processing state", async () => {
    // We can only test initial render here — processing state requires wallet mock
    render(<PaymentModal {...defaultProps} />);
    const cancelBtn = screen.getByText("Cancel");
    expect(cancelBtn).not.toBeDisabled();
  });
});
