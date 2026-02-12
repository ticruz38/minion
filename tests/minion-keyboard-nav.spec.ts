import { test, expect } from '@playwright/test';

test('keyboard navigation selects minions', async ({ page }) => {
  await page.goto('/minions', { timeout: 60000 });
  await page.waitForTimeout(3000);
  
  // Screenshot before
  await page.screenshot({ path: '/tmp/test-kb-before.png' });
  
  // Press ArrowRight to select first minion
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(1000);
  
  // Screenshot after first arrow
  await page.screenshot({ path: '/tmp/test-kb-after1.png' });
  
  // Check if detail panel is visible
  const detailCount = await page.locator('.detail-panel').count();
  console.log('Detail panel count after ArrowRight:', detailCount);
  
  // Press ArrowRight again
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/test-kb-after2.png' });
  
  // Press Escape to deselect
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/test-kb-after-esc.png' });
  
  const panelCount = await page.locator('.detail-panel').count();
  console.log('Detail panel count after Escape:', panelCount);
});

test('search with slash key', async ({ page }) => {
  await page.goto('/minions', { timeout: 60000 });
  await page.waitForTimeout(2000);
  
  // Press / to focus search
  await page.keyboard.press('Slash');
  await page.waitForTimeout(500);
  
  // Type 'terry'
  await page.keyboard.type('terry');
  await page.waitForTimeout(500);
  
  await page.screenshot({ path: '/tmp/test-kb-search.png' });
  
  // Check autocomplete
  const autocompleteCount = await page.locator('.autocomplete-dropdown').count();
  console.log('Autocomplete dropdown count:', autocompleteCount);
});
