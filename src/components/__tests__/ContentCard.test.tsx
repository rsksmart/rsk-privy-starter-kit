/**
 * ContentCard component tests — H3
 *
 * Tests: locked state shows blurred preview, unlock button behavior,
 * connect-wallet button triggers onConnect (I5), backend fetch for
 * full content when hasAccess+token provided (H1).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ContentCard from "../ContentCard";

// Mock Privy so PaymentModal can render without PrivyProvider (useWallets)
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ authenticated: false, login: vi.fn() }),
  useWallets: () => ({ wallets: [] }),
}));

// Mock unlockContent so PaymentModal doesn't try real blockchain calls
vi.mock("../../utils/contract", () => ({
  unlockContent: vi.fn(),
}));

// Stable mock fetch — returns a valid JSON response by default
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ fullContent: "Mock full content." }),
});
global.fetch = mockFetch;

const baseProps = {
  contentId: "0",
  title: "Bitcoin Security Deep Dive",
  description: "Learn about merged mining",
  previewContent: "This is the preview text only.",
  imageUrl: undefined,
  hasAccess: false,
  accessToken: undefined,
  price: 1_000_000_000_000_000n, // 0.001 rBTC
  address: undefined,
  onConnect: vi.fn(),
  onUnlock: vi.fn(),
};

describe("ContentCard — locked state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default successful fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ fullContent: "Mock full content." }),
    });
  });

  it("renders title and description", () => {
    render(<ContentCard {...baseProps} />);
    expect(screen.getByText("Bitcoin Security Deep Dive")).toBeInTheDocument();
    expect(screen.getByText("Learn about merged mining")).toBeInTheDocument();
  });

  it("shows preview content when locked", () => {
    render(<ContentCard {...baseProps} />);
    expect(screen.getByText("This is the preview text only.")).toBeInTheDocument();
  });

  it("shows price badge when locked and price > 0", () => {
    render(<ContentCard {...baseProps} />);
    expect(screen.getByText(/0.00100000 rBTC/)).toBeInTheDocument();
  });

  it("shows 'Unlocked' badge when hasAccess is true", async () => {
    render(
      <ContentCard
        {...baseProps}
        hasAccess={true}
        accessToken="tok"
      />,
    );
    // Wait for the fetch to settle (content load useEffect)
    await waitFor(() => {
      expect(screen.getByText("Unlocked")).toBeInTheDocument();
    });
  });
});

describe("ContentCard — unlock button (I5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ fullContent: "Mock full content." }),
    });
  });

  it("shows 'Connect Wallet to Unlock' when no address", () => {
    render(<ContentCard {...baseProps} />);
    expect(screen.getByText("Connect Wallet to Unlock")).toBeInTheDocument();
  });

  it("clicking 'Connect Wallet to Unlock' calls onConnect (I5)", () => {
    const onConnect = vi.fn();
    render(<ContentCard {...baseProps} onConnect={onConnect} />);
    fireEvent.click(screen.getByText("Connect Wallet to Unlock"));
    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it("shows 'Unlock Content' when address is present", () => {
    render(
      <ContentCard
        {...baseProps}
        address="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
      />,
    );
    expect(screen.getByText(/Unlock Content/i)).toBeInTheDocument();
  });

  it("clicking 'Unlock Content' opens payment modal (PaymentModal renders)", () => {
    render(
      <ContentCard
        {...baseProps}
        address="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
      />,
    );
    fireEvent.click(screen.getByText(/Unlock Content/i));
    // PaymentModal dialog should appear
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Unlock Content", { selector: "h2" })).toBeInTheDocument();
  });
});

describe("ContentCard — backend content fetch (H1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches full content from backend when hasAccess + accessToken provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ fullContent: "Full premium content text here." }),
    });

    render(
      <ContentCard
        {...baseProps}
        hasAccess={true}
        accessToken="valid-jwt-token"
      />,
    );

    // Loading state first
    expect(screen.getByText(/Loading premium content/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Full premium content text here.")).toBeInTheDocument();
    });

    // Verify fetch was called with correct JWT header
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/content/0/full"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer valid-jwt-token",
        }),
      }),
    );
  });

  it("shows error message when backend fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Token expired" }),
    });

    render(
      <ContentCard
        {...baseProps}
        hasAccess={true}
        accessToken="expired-token"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Token expired")).toBeInTheDocument();
    });
  });

  it("does NOT fetch when hasAccess is true but no accessToken", () => {
    render(<ContentCard {...baseProps} hasAccess={true} accessToken={undefined} />);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
