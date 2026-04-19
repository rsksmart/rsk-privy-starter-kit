/**
 * contract.ts unit tests — H3
 *
 * Tests pure utility functions that require no network or wallet.
 * Viem contract calls are integration-tested separately.
 */

import { describe, it, expect } from "vitest";
import {
  formatRBTC,
  parseRBTC,
  isValidAddress,
  shortenAddress,
  getTxUrl,
  getAddressUrl,
  getContractUrl,
} from "../contract";

const VALID_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const DUMMY_TX =
  "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc123";

describe("formatRBTC", () => {
  it("formats 1 rBTC correctly", () => {
    expect(formatRBTC(1_000_000_000_000_000_000n)).toBe("1.0000");
  });

  it("formats 0.001 rBTC correctly", () => {
    expect(formatRBTC(1_000_000_000_000_000n)).toBe("0.0010");
  });

  it("formats with custom decimal precision", () => {
    expect(formatRBTC(1_000_000_000_000_000_000n, 2)).toBe("1.00");
  });

  it("formats 0 as 0.0000", () => {
    expect(formatRBTC(0n)).toBe("0.0000");
  });
});

describe("parseRBTC", () => {
  it("parses '1' as 1e18 wei", () => {
    expect(parseRBTC("1")).toBe(1_000_000_000_000_000_000n);
  });

  it("parses '0.001' as 1e15 wei", () => {
    expect(parseRBTC("0.001")).toBe(1_000_000_000_000_000n);
  });

  it("returns 0n for invalid input", () => {
    expect(parseRBTC("not-a-number")).toBe(0n);
  });
});

describe("isValidAddress", () => {
  it("returns true for a valid checksummed address", () => {
    expect(isValidAddress(VALID_ADDRESS)).toBe(true);
  });

  it("returns true for a lowercase address", () => {
    expect(isValidAddress(VALID_ADDRESS.toLowerCase())).toBe(true);
  });

  it("returns false for an empty string", () => {
    expect(isValidAddress("")).toBe(false);
  });

  it("returns false for a short address", () => {
    expect(isValidAddress("0x1234")).toBe(false);
  });

  it("returns false for a non-hex address", () => {
    expect(isValidAddress("not-an-address")).toBe(false);
  });
});

describe("shortenAddress", () => {
  it("shortens to 0x1234...5678 format by default (4 chars)", () => {
    const result = shortenAddress(VALID_ADDRESS);
    expect(result).toMatch(/^0x[0-9a-fA-F]{4}\.\.\.([0-9a-fA-F]{4})$/);
  });

  it("returns empty string for falsy input", () => {
    expect(shortenAddress("")).toBe("");
  });

  it("respects custom char count", () => {
    const result = shortenAddress(VALID_ADDRESS, 6);
    expect(result).toMatch(/^0x[0-9a-fA-F]{6}\.\.\.([0-9a-fA-F]{6})$/);
  });
});

describe("getTxUrl", () => {
  it("returns explorer URL for a tx hash", () => {
    const url = getTxUrl(DUMMY_TX);
    expect(url).toContain("explorer.testnet.rsk.co/tx/");
    expect(url).toContain(DUMMY_TX);
  });
});

describe("getAddressUrl", () => {
  it("returns explorer URL for a wallet address", () => {
    const url = getAddressUrl(VALID_ADDRESS);
    expect(url).toContain("explorer.testnet.rsk.co/address/");
    expect(url).toContain(VALID_ADDRESS);
  });
});

describe("getContractUrl", () => {
  it("returns explorer URL for the paywall contract", () => {
    const url = getContractUrl();
    expect(url).toContain("explorer.testnet.rsk.co/address/");
    expect(url).toContain("0xb5C7ED1CEd1098974FDf2a9060948F13138e9dC6");
  });
});
