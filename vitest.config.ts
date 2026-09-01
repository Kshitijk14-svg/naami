import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Tests drive the real application modules (prepareIntent, reserveStock,
// verifyWebhookSignature, ...) rather than reimplementing their logic, so the
// `@/*` alias from tsconfig.json has to resolve here too.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    // Every suite mutates shared rows — stock, intents, reservations — so they
    // must not interleave. This is the whole reason the file order is stable.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ["./tests/helpers/setup.ts"],
    include: ["tests/**/*.test.ts"],
  },
});
