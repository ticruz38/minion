import { test, expect } from '@playwright/test';

test('keyboard navigation works', async ({ page }) => {
  await page.goto('/minions');
  
  // Wait for list to load
  await page.waitForSelector('.minion-item');
  await page.waitForTimeout(1000);
  
  // Press ArrowRight to select first minion
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  
  // Verify first minion is selected
  const firstActive = await page.locator('.minion-item.active').count();
  expect(firstActive).toBe(1);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/test-keyboard-1.png' });
  
  // Press ArrowRight again to go to next minion
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  
  // Verify still only one active
  const secondActive = await page.locator('.minion-item.active').count();
  expect(secondActive).toBe(1);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/test-keyboard-2.png' });
  
  // Press ArrowLeft to go back
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(500);
  
  // Verify still active
  const thirdActive = await page.locator('.minion-item.active').count();
  expect(thirdActive).toBe(1);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/test-keyboard-3.png' });
  
  // Press Escape to deselect
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  
  // Verify no selection
  const afterEscape = await page.locator('.minion-item.active').count();
  expect(afterEscape).toBe(0);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/test-keyboard-4.png' });
});
