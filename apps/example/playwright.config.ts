import { defineConfig, devices } from '@playwright/test'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultPort = process.env['CI'] ? '3100' : '3000'
const port = Number(process.env['PORT'] ?? defaultPort)
const projectDir = dirname(fileURLToPath(import.meta.url))
const browserChannel = process.env['PLAYWRIGHT_BROWSER_CHANNEL']
const reuseExistingServer = process.env['CI']
  ? false
  : process.env['PLAYWRIGHT_REUSE_EXISTING_SERVER'] !== 'false'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 2 : 1,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(browserChannel ? { channel: browserChannel } : {}),
      },
    },
  ],
  webServer: {
    command: `PORT=${port} bun x next dev --hostname 127.0.0.1 --port ${port}`,
    cwd: projectDir,
    port,
    reuseExistingServer,
    timeout: 120_000,
  },
})
