import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run dev',
      url: BASE_URL,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    // AC-96.4. The built app as 4180 serves it, for the service worker,
    // which only a production build registers. A scratch folder and port,
    // never the real app's.
    {
      command:
        'npx vite build --outDir dist-e2e --emptyOutDir --logLevel warn && node scripts/serve.mjs',
      url: 'http://localhost:4190',
      // US-100. Its pid file and sync copy stay in scratch too, or a test run
      // overwrites the real server's pid and the updater restarts the wrong one.
      env: {
        PT_TARGET: 'dist-e2e',
        PT_PORT: '4190',
        PT_PID: 'dist-e2e/server.pid',
        PT_DATA: 'dist-e2e/hub',
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    // US-106. The same build with a shared copy of its own, for the one spec
    // that needs a passcode to arrive where there was none.
    {
      command: 'node scripts/serve.mjs',
      url: 'http://localhost:4191',
      env: {
        PT_TARGET: 'dist-e2e',
        PT_PORT: '4191',
        PT_PID: 'dist-e2e/server2.pid',
        PT_DATA: 'dist-e2e/hub2',
      },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
