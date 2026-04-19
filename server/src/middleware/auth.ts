/**
 * JWT Authentication Middleware
 *
 * Verifies the Bearer token on protected routes.
 * Tokens are issued by POST /api/content/verify-access after on-chain verification.
 */

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

/** Shape of the JWT payload issued by /api/verify-access */
export interface ContentTokenPayload {
  /** Wallet address that has been verified on-chain */
  address: string;
  /** Content ID the token grants access to */
  contentId: string;
}

declare global {
  namespace Express {
    interface Request {
      /** Populated by requireContentToken middleware */
      tokenPayload?: ContentTokenPayload;
    }
  }
}

/**
 * Express middleware that verifies a signed JWT in the Authorization header.
 *
 * Rejects with 401 if:
 *  - No Authorization header is present
 *  - The token is expired, malformed, or signed with the wrong key
 *
 * On success, attaches `req.tokenPayload` for downstream handlers.
 */
export function requireContentToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = jwt.verify(token, config.jwtSecret) as ContentTokenPayload;
    req.tokenPayload = payload;
    next();
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "Access token has expired. Please re-verify payment." });
    } else {
      res.status(401).json({ error: "Invalid access token" });
    }
  }
}
