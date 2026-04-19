/**
 * Express Server Entry Point
 *
 * Starts the ContentPaywall backend API server.
 * All environment variables are validated at startup via config.ts.
 *
 * @see server/src/config.ts for required env variables
 * @see server/src/routes/content.ts for API endpoints
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { contentRouter } from "./routes/content.js";

const app = express();

/** When behind nginx, Fly.io, Render, etc., set TRUST_PROXY=1 so rate limits use X-Forwarded-For. */
if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

// ---------------------------------------------------------------------------
// Security middleware
// ---------------------------------------------------------------------------

/** Set standard security headers */
app.use(helmet());

/** CORS — only allow configured frontend origins */
app.use(
  cors({
    origin: config.corsOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

/** Global rate limiter — 100 req/min per IP */
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again later." },
  }),
);

/** Parse JSON request bodies */
app.use(express.json({ limit: "10kb" }));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use("/api/content", contentRouter);

/** Health check */
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/** 404 handler */
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ---------------------------------------------------------------------------
// Start (skipped when Vitest sets SKIP_SERVER_LISTEN — see vitest.setup.ts)
// ---------------------------------------------------------------------------

let server: ReturnType<typeof app.listen> | undefined;

if (process.env.SKIP_SERVER_LISTEN !== "1") {
  server = app.listen(config.port, () => {
    console.log(`[Server] ContentPaywall API running on port ${config.port}`);
    console.log(`[Server] Allowed origins: ${config.corsOrigins.join(", ")}`);
    console.log(`[Server] Contract: ${config.contractAddress}`);
    console.log(`[Server] RPC: ${config.rskRpcUrl}`);
  });

  const shutdown = (signal: string) => {
    console.log(`[Server] ${signal} received, closing HTTP server`);
    server?.close(() => process.exit(0));
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

export { app, server };
