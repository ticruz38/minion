import { test, expect } from '@playwright/test';

test('page loads with floating search', async ({ page }) => {
  await page.goto('/minions', { timeout: 60000 });
  
  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');
  
  // Simple screenshot
  await page.screenshot({ path: '/tmp/test-simple.png' });
  
  // Check if floating search exists
  const searchExists = await page.locator('.floating-search').count();
  console.log('Floating search count:', searchExists);
  
  // Check if tag pills exist
  const tagsExist = await page.locator('.tag-pills').count();
  console.log('Tag pills count:', tagsExist);
  
  // Check if 3D scene exists
  const sceneExists = await page.locator('.scene-container').count();
  console.log('Scene count:', sceneExists);
  
  expect(searchExists).toBeGreaterThan(0);
  expect(sceneExists).toBeGreaterThan(0);
});

test('click 3D scene selects minion', async ({ page }) => {
  await page.goto('/minions', { timeout: 60000 });
  await page.waitForTimeout(4000);
  
  // Click on the scene
  await page.mouse.click(400, 400);
  await page.waitForTimeout(1000);
  
  // Screenshot
  await page.screenshot({ path: '/tmp/test-click.png' });
  
  // Check if detail panel appeared
  const detailVisible = await page.locator('.detail-panel').isVisible().catch(() => false);
  console.log('Detail panel visible:', detailVisible);
});
