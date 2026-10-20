import path from "node:path"
import { loadEnv } from "vite"
import { defineConfig } from "vitest/config"

const env = loadEnv("test", process.cwd(), "")
const swapDb = (url?: string) => (url ?? "").replace(/\/athira(\?|$)/, "/athira_test$1")

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "test/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    setupFiles: ["test/setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: {
      ...env,
      NODE_ENV: "test",
      DATABASE_URL: swapDb(env.DATABASE_URL),
      DATABASE_MIGRATE_URL: swapDb(env.DATABASE_MIGRATE_URL),
      STORAGE_DRIVER: "local",
      STRIPE_SECRET_KEY: "sk_test_dummy_key_for_signature_tests",
      STRIPE_WEBHOOK_SECRET: "whsec_test_secret_for_unit_tests",
      NOTIFY_EMAIL: "staff@example.test",
    },
  },
})
