/** Skip binding HTTP port when Vitest loads `src/index.ts` for supertest. */
process.env.SKIP_SERVER_LISTEN = "1";
