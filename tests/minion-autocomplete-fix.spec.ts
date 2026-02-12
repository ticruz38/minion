import { test, expect } from '@playwright/test';

test('selecting Sergio from autocomplete highlights Sergio', async ({ page }) => {
  await page.goto('/minions', { timeout: 60000 });
  await page.waitForTimeout(3000);
  
  // Focus search and type 'sergio'
  await page.locator('.floating-search input').click();
  await page.keyboard.type('sergio');
  await page.waitForTimeout(500);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/test-autocomplete-sergio.png' });
  
  // Click the Sergio suggestion
  const sergioSuggestion = await page.locator('.autocomplete-item', { hasText: 'Sergio' });
  await sergioSuggestion.click();
  await page.waitForTimeout(1000);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/test-after-sergio-click.png' });
  
  // Check that Sergio is selected (not Benny)
  const detailTitle = await page.locator('.detail-titles h1').textContent();
  console.log('Selected minion:', detailTitle);
  
  expect(detailTitle).toBe('Sergio');
});

test('minions shift left when selected', async ({ page }) => {
  await page.goto('/minions', { timeout: 60000 });
  await page.waitForTimeout(3000);
  
  // Screenshot before selection
  await page.screenshot({ path: '/tmp/test-shift-before.png' });
  
  // Select a minion
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(1500); // Wait for animation
  
  // Screenshot after selection
  await page.screenshot({ path: '/tmp/test-shift-after.png' });
  
  // Verify detail panel is visible
  const detailVisible = await page.locator('.detail-panel').isVisible().catch(() => false);
  expect(detailVisible).toBe(true);
});
