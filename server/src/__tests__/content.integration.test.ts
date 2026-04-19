/**
 * Server integration tests for ContentPaywall API
 *
 * Tests the core security flow:
 *  1. verify-access returns 403 when no on-chain access
 *  2. verify-access returns JWT when on-chain access confirmed
 *  3. /full returns 401 without valid JWT
 *  4. /full returns content with valid JWT
 *  5. /full returns 403 when JWT contentId mismatches route param
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

vi.mock("../services/blockchain.js", () => ({
  verifyOnChainAccess: vi.fn(),
}));

vi.mock("../config.js", () => ({
  config: {
    port: 3099,
    jwtSecret: "test-secret-key-for-unit-tests-only",
    jwtExpiresIn: "1h",
    contractAddress: "0xb5C7ED1CEd1098974FDf2a9060948F13138e9dC6",
    rskRpcUrl: "https://public-node.testnet.rsk.co",
    chainId: 31,
    corsOrigins: ["http://localhost:5173"],
  },
}));

import { app } from "../index.js";
import { verifyOnChainAccess } from "../services/blockchain.js";

const TEST_ADDRESS = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
const TEST_CONTENT_ID = "0";
const JWT_SECRET = "test-secret-key-for-unit-tests-only";

describe("GET /api/content", () => {
  it("returns public metadata without fullContent", async () => {
    const res = await request(app).get("/api/content");
    expect(res.status).toBe(200);
    expect(res.body.content).toBeInstanceOf(Array);
    expect(res.body.content[0]).toHaveProperty("title");
    expect(res.body.content[0]).not.toHaveProperty("fullContent");
  });
});

describe("POST /api/content/verify-access", () => {
  beforeEach(() => {
    vi.mocked(verifyOnChainAccess).mockReset();
  });

  it("returns 400 for invalid wallet address", async () => {
    const res = await request(app)
      .post("/api/content/verify-access")
      .send({ address: "not-an-address", contentId: TEST_CONTENT_ID });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid wallet address/);
  });

  it("returns 400 for invalid contentId", async () => {
    const res = await request(app)
      .post("/api/content/verify-access")
      .send({ address: TEST_ADDRESS, contentId: "abc" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid contentId/);
  });

  it("returns 403 when on-chain access is false", async () => {
    vi.mocked(verifyOnChainAccess).mockResolvedValue(false);
    const res = await request(app)
      .post("/api/content/verify-access")
      .send({ address: TEST_ADDRESS, contentId: TEST_CONTENT_ID });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Access not found/);
  });

  it("returns JWT when on-chain access is true", async () => {
    vi.mocked(verifyOnChainAccess).mockResolvedValue(true);
    const res = await request(app)
      .post("/api/content/verify-access")
      .send({ address: TEST_ADDRESS, contentId: TEST_CONTENT_ID });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    const decoded = jwt.verify(res.body.token, JWT_SECRET) as {
      address: string;
      contentId: string;
    };
    expect(decoded.contentId).toBe(TEST_CONTENT_ID);
    expect(decoded.address).toBe(TEST_ADDRESS.toLowerCase());
  });
});

describe("GET /api/content/:id/full", () => {
  function makeToken(address: string, contentId: string, expiresIn = "1h") {
    return jwt.sign({ address, contentId }, JWT_SECRET, { expiresIn });
  }

  it("returns 401 without Authorization header", async () => {
    const res = await request(app).get(`/api/content/${TEST_CONTENT_ID}/full`);
    expect(res.status).toBe(401);
  });

  it("returns 401 with expired token", async () => {
    const token = makeToken(TEST_ADDRESS, TEST_CONTENT_ID, "-1s");
    const res = await request(app)
      .get(`/api/content/${TEST_CONTENT_ID}/full`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/expired/i);
  });

  it("returns 403 when token contentId does not match route", async () => {
    const token = makeToken(TEST_ADDRESS, "1");
    const res = await request(app)
      .get("/api/content/0/full")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("returns fullContent with valid matching token", async () => {
    const token = makeToken(TEST_ADDRESS, TEST_CONTENT_ID);
    const res = await request(app)
      .get(`/api/content/${TEST_CONTENT_ID}/full`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.fullContent).toBe("string");
    expect(res.body.fullContent.length).toBeGreaterThan(100);
    expect(res.body.contentId).toBe(TEST_CONTENT_ID);
  });
});
