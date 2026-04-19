/**
 * Server Configuration
 *
 * Reads all environment variables needed by the backend API.
 * Throws at startup if required variables are missing.
 */
import "dotenv/config";


function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[Config] Missing required environment variable: ${key}`);
  }
  return value;
}

const jwtSecret = requireEnv("JWT_SECRET");
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && jwtSecret.length < 32) {
  throw new Error(
    "[Config] JWT_SECRET must be at least 32 characters in production. Generate one with: openssl rand -hex 64",
  );
}

export const config = {
  /** Port for the Express server */
  port: parseInt(process.env.PORT ?? "3001", 10),

  /** Secret used to sign/verify JWT access tokens */
  jwtSecret,

  /** JWT expiry (24 hours) */
  jwtExpiresIn: "24h" as const,

  /** ContentPaywall contract address (Rootstock Testnet) */
  contractAddress: requireEnv("CONTENT_PAYWALL_ADDRESS") as `0x${string}`,

  /** Rootstock Testnet public RPC URL */
  rskRpcUrl: process.env.RSK_RPC_URL ?? "https://public-node.testnet.rsk.co",

  /** Rootstock Testnet chain ID */
  chainId: 31 as const,

  /** Allowed frontend origins for CORS */
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173").split(","),
};
