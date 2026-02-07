import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Minion project
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  
  /* Run tests sequentially to avoid conflicts with modal state */
  fullyParallel: false,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use */
  reporter: 'list',
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3011',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video recording on first retry */
    video: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-features=PaintHolding', '--disable-smooth-scrolling'],
        },
        // Reduce motion to disable CSS animations
        contextOptions: {
          reducedMotion: 'reduce',
        },
      },
    },
    {
      name: 'chromium-mobile',
      use: { 
        ...devices['iPhone 13'],
        contextOptions: {
          reducedMotion: 'reduce',
        },
      },
    },
  ],

  /* Run preview server before starting the tests */
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:3011',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
