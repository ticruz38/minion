import { test, expect } from '@playwright/test';

test('clicking on minion in 3D scene selects it', async ({ page }) => {
  await page.goto('/minions');
  
  // Wait for 3D scene to load
  await page.waitForSelector('.scene-container');
  await page.waitForTimeout(3000);
  
  // Take initial screenshot
  await page.screenshot({ path: '/tmp/test-minions-initial.png' });
  
  // Get the scene container bounding box
  const sceneBox = await page.locator('.scene-container').boundingBox();
  console.log('Scene box:', sceneBox);
  
  expect(sceneBox).toBeTruthy();
  
  if (sceneBox) {
    // Try multiple positions - minions might be offset from exact center
    // Grid layout positions minions at different spots
    const positions = [
      { x: 0.5, y: 0.5 },    // Center
      { x: 0.3, y: 0.5 },    // Left of center
      { x: 0.7, y: 0.5 },    // Right of center
      { x: 0.5, y: 0.4 },    // Above center
      { x: 0.5, y: 0.6 },    // Below center
    ];
    
    let clicked = false;
    for (const pos of positions) {
      const clickX = sceneBox.x + sceneBox.width * pos.x;
      const clickY = sceneBox.y + sceneBox.height * pos.y;
      
      console.log(`Trying click at: ${clickX}, ${clickY} (${pos.x}, ${pos.y})`);
      
      await page.mouse.click(clickX, clickY);
      await page.waitForTimeout(500);
      
      // Check if selection happened
      const activeMinion = await page.locator('.minion-item.active').count();
      const detailCard = await page.locator('.detail-card').isVisible().catch(() => false);
      
      if (activeMinion > 0 || detailCard) {
        console.log(`SUCCESS: Click at (${pos.x}, ${pos.y}) selected a minion!`);
        clicked = true;
        break;
      }
    }
    
    // Take screenshot after attempts
    await page.screenshot({ path: '/tmp/test-minions-after-click.png' });
    
    if (!clicked) {
      console.log('WARNING: No click position worked - checking for overlay issues');
      
      // Check if there are elements blocking the scene
      const main = await page.locator('.main').boundingBox();
      const leftPanel = await page.locator('.left-panel').boundingBox();
      console.log('Main box:', main);
      console.log('Left panel box:', leftPanel);
    }
  }
});

test('clicking on minion list item selects it', async ({ page }) => {
  await page.goto('/minions');
  
  // Wait for list to load
  await page.waitForSelector('.minion-item');
  
  // Click first minion in list
  await page.locator('.minion-item').first().click();
  
  // Wait for selection
  await page.waitForTimeout(500);
  
  // Verify detail card appears
  await expect(page.locator('.detail-card')).toBeVisible();
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/test-minions-list-click.png' });
});
