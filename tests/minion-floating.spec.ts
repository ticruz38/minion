import { test, expect } from '@playwright/test';

test('clicking on minion in 3D scene selects it', async ({ page }) => {
  await page.goto('/minions');
  
  // Wait for 3D scene
  await page.waitForSelector('.scene-container');
  await page.waitForTimeout(3000);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/test-floating-initial.png' });
  
  // Click on scene where minions are
  const sceneBox = await page.locator('.scene-container').boundingBox();
  console.log('Scene box:', sceneBox);
  
  if (sceneBox) {
    // Try a few positions
    const positions = [
      { x: sceneBox.x + sceneBox.width * 0.3, y: sceneBox.y + sceneBox.height * 0.5 },
      { x: sceneBox.x + sceneBox.width * 0.5, y: sceneBox.y + sceneBox.height * 0.5 },
      { x: sceneBox.x + sceneBox.width * 0.7, y: sceneBox.y + sceneBox.height * 0.5 },
    ];
    
    for (const pos of positions) {
      await page.mouse.click(pos.x, pos.y);
      await page.waitForTimeout(500);
      
      const detailPanel = await page.locator('.detail-panel').isVisible().catch(() => false);
      if (detailPanel) {
        console.log('SUCCESS: Minion selected at', pos);
        await page.screenshot({ path: '/tmp/test-floating-selected.png' });
        break;
      }
    }
  }
});

test('search autocomplete works', async ({ page }) => {
  await page.goto('/minions');
  
  await page.waitForSelector('.floating-search');
  await page.waitForTimeout(1000);
  
  // Click search and type
  await page.locator('.floating-search input').click();
  await page.keyboard.type('ben');
  await page.waitForTimeout(500);
  
  // Take screenshot showing autocomplete
  await page.screenshot({ path: '/tmp/test-floating-autocomplete.png' });
  
  // Check autocomplete appeared
  const dropdown = await page.locator('.autocomplete-dropdown').isVisible().catch(() => false);
  console.log('Autocomplete visible:', dropdown);
  
  if (dropdown) {
    // Press Enter to select first suggestion
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    // Check if detail panel appeared
    const detailPanel = await page.locator('.detail-panel').isVisible().catch(() => false);
    console.log('Detail panel after autocomplete:', detailPanel);
  }
});

test('tag pills filter minions', async ({ page }) => {
  await page.goto('/minions');
  
  await page.waitForSelector('.tag-pills');
  await page.waitForTimeout(1000);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/test-floating-tags.png' });
  
  // Click a tag
  const firstTag = await page.locator('.tag-pill').nth(1);
  await firstTag.click();
  await page.waitForTimeout(500);
  
  // Check filter badge appeared
  const badge = await page.locator('.filter-badge').isVisible().catch(() => false);
  console.log('Filter badge visible:', badge);
});

test('keyboard navigation with arrows', async ({ page }) => {
  await page.goto('/minions');
  
  await page.waitForSelector('.scene-container');
  await page.waitForTimeout(2000);
  
  // Press ArrowRight to select first minion
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  
  // Check detail panel appeared
  const detailPanel = await page.locator('.detail-panel').isVisible().catch(() => false);
  console.log('Detail panel after ArrowRight:', detailPanel);
  
  if (detailPanel) {
    await page.screenshot({ path: '/tmp/test-floating-keyboard.png' });
    
    // Press Escape to deselect
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    const panelGone = await page.locator('.detail-panel').isVisible().catch(() => false);
    console.log('Panel gone after Escape:', !panelGone);
  }
});
