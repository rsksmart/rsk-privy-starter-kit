import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";

/** Root install of @noble/hashes (1.8.x exports both `./sha2` and `./sha2.js`). Nested copies under @reown/appkit often stay on 1.7.x and break Vite's dep pre-bundle when @noble/curves imports `@noble/hashes/sha2.js`. */
const nobleHashesRoot = path.resolve(__dirname, "node_modules/@noble/hashes");

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Subpath `.js` imports (used by @noble/curves) → explicit ESM files
      {
        find: /^@noble\/hashes\/(.+)\.js$/,
        replacement: `${nobleHashesRoot}/esm/$1.js`,
      },
      { find: "@noble/hashes", replacement: nobleHashesRoot },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
    dedupe: ["@noble/hashes", "@noble/curves", "viem"],
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
      plugins: [NodeGlobalsPolyfillPlugin({ process: true, buffer: true })],
    },
  },
  server: {
    port: 5173,
  },
});