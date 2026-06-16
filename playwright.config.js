import { defineConfig, devices } from '@playwright/test'

// E2E tests run against the Vite dev server in demo mode (localStorage seed),
// so they need no Supabase credentials. Playwright boots the server for you.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    // `--mode test` carga .env.test (placeholders) por encima de .env, forzando
    // el modo demo (localStorage + seed) aunque haya credenciales reales en .env.
    command: 'npm run dev -- --mode test',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
})
