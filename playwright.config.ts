import { defineConfig, devices } from '@playwright/test';

// E2E mobile — le bug ciblé se manifeste sur les petits écrans : projet 320×568
// (iPhone SE, pire cas) + 375×667 (iPhone classique) en attente rapide.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173/sport-app/',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'mobile-se', use: { ...devices['iPhone SE'] } },
    { name: 'mobile-375', use: { viewport: { width: 375, height: 667 } } },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173/sport-app/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
