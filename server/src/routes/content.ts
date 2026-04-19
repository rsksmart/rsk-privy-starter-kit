/**
 * Content Routes
 *
 * GET  /api/content            — public metadata (no premium content)
 * POST /api/verify-access      — on-chain verify → issue JWT
 * GET  /api/content/:id/full   — JWT-gated full content
 *
 * H1: fullContent never leaves this file unless a valid JWT is present.
 * H2: Access is verified server-side via hasAccess() contract call before
 *     issuing any token.
 */

import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { verifyOnChainAccess } from "../services/blockchain.js";
import {
  getAllContentMeta,
  getContentMeta,
  getFullContent,
} from "../services/content.js";
import { requireContentToken } from "../middleware/auth.js";

export const contentRouter = Router();

/** Stricter rate limit for the payment verification endpoint */
const verifyAccessLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many verification attempts. Please wait a minute." },
});

// ---------------------------------------------------------------------------
// GET /api/content
// Returns public metadata for all content items.
// fullContent is never included here.
// ---------------------------------------------------------------------------
contentRouter.get("/", (_req: Request, res: Response) => {
  res.json({ content: getAllContentMeta() });
});

// ---------------------------------------------------------------------------
// POST /api/verify-access
// Body: { address: string; contentId: string }
// Verifies on-chain access via hasAccess() and issues a signed JWT.
//
// H2: This is the authoritative access gate. The client's hasAccess() result
// is never trusted — this server re-verifies independently.
// ---------------------------------------------------------------------------
contentRouter.post(
  "/verify-access",
  verifyAccessLimiter,
  async (req: Request, res: Response) => {
    const { address, contentId } = req.body as {
      address?: unknown;
      contentId?: unknown;
    };

    // --- Input validation ---
    if (typeof address !== "string" || !address.match(/^0x[0-9a-fA-F]{40}$/)) {
      res.status(400).json({ error: "Invalid wallet address" });
      return;
    }
    if (typeof contentId !== "string" || !contentId.match(/^\d+$/)) {
      res.status(400).json({ error: "Invalid contentId" });
      return;
    }

    const meta = getContentMeta(contentId);
    if (!meta) {
      res.status(404).json({ error: "Content not found" });
      return;
    }

    // --- On-chain verification (H2) ---
    let hasAccess: boolean;
    try {
      hasAccess = await verifyOnChainAccess(address, contentId);
    } catch {
      res.status(502).json({
        error: "Failed to verify on-chain access. Please try again.",
      });
      return;
    }

    if (!hasAccess) {
      res.status(403).json({
        error:
          "Access not found on-chain. Complete the payment transaction first.",
      });
      return;
    }

    // --- Issue signed JWT ---
    const payload = { address: address.toLowerCase(), contentId };
    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });

    res.json({ token });
  },
);

// ---------------------------------------------------------------------------
// GET /api/content/:id/full
// Requires a valid JWT issued by POST /api/verify-access.
// Returns the full premium content string.
//
// H1: Content is only served here — it never exists in the JS bundle.
// ---------------------------------------------------------------------------
contentRouter.get(
  "/:id/full",
  requireContentToken,
  (req: Request, res: Response) => {
    const { id } = req.params;
    const tokenPayload = req.tokenPayload!;

    // JWT must match the requested content ID
    if (tokenPayload.contentId !== id) {
      res.status(403).json({
        error: "Token is not valid for this content item",
      });
      return;
    }

    const fullContent = getFullContent(id);
    if (!fullContent) {
      res.status(404).json({ error: "Content not found" });
      return;
    }

    res.json({ contentId: id, fullContent });
  },
);
