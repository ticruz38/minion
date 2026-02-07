import { test, expect, type Page } from '@playwright/test';

/**
 * VM Creation Modal Test Suite
 * Tests the multi-step modal for creating VM bots
 */

// Test data
const TEST_DATA = {
	botName: 'test-bot-123',
	invalidBotName: 'ab', // Too short
	telegramToken: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
	invalidToken: 'invalid-token-format',
	passcode: 'Secure123',
	shortPasscode: '12', // Too short
	commandId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID v4 for testing
};

// Helper function to open the modal
async function openModal(page: Page): Promise<void> {
	await page.goto('/');
	
	// Set testing flag immediately after page load
	await page.evaluate(() => {
		(window as { __TESTING__?: boolean }).__TESTING__ = true;
	});
	
	// Wait for the page to load
	await page.waitForSelector('.character-selector', { state: 'visible' });
	await page.waitForTimeout(300);
	
	// Click the HIRE button
	await page.click('.hire-button');
	
	// Wait for modal to appear
	await page.waitForSelector('[data-testid="modal-overlay"]', { state: 'visible' });
}

// Helper to fill Step 1
async function fillStep1(page: Page, botName: string): Promise<void> {
	await page.fill('#bot-name', botName);
}

// Helper to fill Step 2
async function fillStep2(page: Page, token: string): Promise<void> {
	await page.fill('#telegram-token', token);
}

// Helper to fill Step 3
async function fillStep3(page: Page, passcode: string): Promise<void> {
	await page.fill('#passcode', passcode);
}

// Helper to navigate to next step
async function goToNextStep(page: Page): Promise<void> {
	await page.click('[data-testid="next-button"]');
}

// Helper to go back
async function goBack(page: Page): Promise<void> {
	await page.click('[data-testid="back-button"]');
}

test.describe('VM Creation Modal', () => {
	test.describe('Modal Opening', () => {
		test('should open modal when clicking HIRE button', async ({ page }) => {
			await page.goto('/');
			await page.evaluate(() => {
				(window as { __TESTING__?: boolean }).__TESTING__ = true;
			});
			await page.waitForSelector('.character-selector', { state: 'visible' });
			await page.waitForTimeout(300);
			
			// Verify modal is not visible initially
			const modalBefore = await page.$('[data-testid="modal-overlay"]');
			expect(modalBefore).toBeNull();
			
			// Click HIRE button
			await page.click('.hire-button');
			
			// Wait for modal to appear
			await page.waitForSelector('[data-testid="modal-overlay"]', { state: 'visible' });
			
			// Verify modal elements are visible
			await expect(page.locator('.modal-title')).toHaveText('Create Your Bot');
			await expect(page.locator('.step-text')).toContainText('Step 1 of 4');
			await expect(page.locator('.step-title')).toHaveText('Name Your Bot');
			
			// Take screenshot for visual regression baseline
			await page.screenshot({ path: 'test-results/modal-step1-initial.png', fullPage: true });
		});

		test('should display selected minion info in modal', async ({ page }) => {
			await page.goto('/');
			await page.evaluate(() => {
				(window as { __TESTING__?: boolean }).__TESTING__ = true;
			});
			await page.waitForSelector('.character-selector', { state: 'visible' });
			await page.waitForTimeout(300);
			
			// Get the selected minion name from the page
			const minionName = await page.locator('.minion-name').first().textContent();
			
			// Open modal
			await page.click('.hire-button');
			await page.waitForSelector('[data-testid="modal-overlay"]', { state: 'visible' });
			
			// Verify minion name is shown in modal subtitle
			await expect(page.locator('.modal-subtitle')).toContainText('Hiring');
			
			// Verify minion preview is shown
			await expect(page.locator('.minion-preview')).toBeVisible();
			await expect(page.locator('.minion-role')).toContainText(minionName || '');
		});
	});

	test.describe('Step 1 - Name Your Bot', () => {
		test.beforeEach(async ({ page }) => {
			await openModal(page);
		});

		test('should validate bot name in real-time', async ({ page }) => {
			// Initially Next button should be disabled
			const nextButton = page.locator('[data-testid="next-button"]');
			await expect(nextButton).toBeDisabled();
			
			// Enter invalid name (too short)
			await fillStep1(page, TEST_DATA.invalidBotName);
			await page.waitForTimeout(100);
			
			// Error message should appear
			await expect(page.locator('.error-message')).toBeVisible();
			await expect(page.locator('.error-message')).toContainText('at least 3 characters');
			
			// Input wrapper should have error class
			await expect(page.locator('.input-wrapper')).toHaveClass(/error/);
			
			// Next button should still be disabled
			await expect(nextButton).toBeDisabled();
			
			// Clear and enter valid name
			await page.fill('#bot-name', TEST_DATA.botName);
			await page.waitForTimeout(100);
			
			// Error should be gone
			await expect(page.locator('.error-message')).not.toBeVisible();
			
			// Input wrapper should have valid class
			await expect(page.locator('.input-wrapper')).toHaveClass(/valid/);
			
			// Next button should be enabled
			await expect(nextButton).toBeEnabled();
		});

		test('should show character counter', async ({ page }) => {
			await expect(page.locator('.char-count')).toContainText('/30');
			
			await fillStep1(page, 'test');
			await expect(page.locator('.char-count')).toContainText('4/30');
		});

		test('should validate invalid characters', async ({ page }) => {
			// Enter name with spaces (invalid)
			await page.fill('#bot-name', 'invalid name');
			await page.waitForTimeout(100);
			
			await expect(page.locator('.error-message')).toContainText('Only letters, numbers, and hyphens allowed');
		});

		test('should proceed to Step 2 with valid name', async ({ page }) => {
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			
			await expect(page.locator('.step-text')).toContainText('Step 2 of 4');
			await expect(page.locator('.step-title')).toHaveText('Connect Telegram');
		});
	});

	test.describe('Step 2 - Telegram Configuration', () => {
		test.beforeEach(async ({ page }) => {
			await openModal(page);
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
		});

		test('should display token input with password masking', async ({ page }) => {
			const tokenInput = page.locator('#telegram-token');
			await expect(tokenInput).toHaveAttribute('type', 'password');
			
			// Help box should be visible
			await expect(page.locator('.help-box')).toBeVisible();
			await expect(page.locator('.help-box-title')).toContainText("Don't have a bot token?");
		});

		test('should toggle token visibility', async ({ page }) => {
			const tokenInput = page.locator('#telegram-token');
			const toggleButton = page.locator('.visibility-toggle');
			
			// Initially password type
			await expect(tokenInput).toHaveAttribute('type', 'password');
			
			// Click toggle
			await toggleButton.click();
			
			// Should be text type now
			await expect(tokenInput).toHaveAttribute('type', 'text');
			
			// Click again
			await toggleButton.click();
			
			// Back to password
			await expect(tokenInput).toHaveAttribute('type', 'password');
		});

		test('should validate token format', async ({ page }) => {
			const nextButton = page.locator('[data-testid="next-button"]');
			
			// Enter invalid token
			await fillStep2(page, TEST_DATA.invalidToken);
			await page.waitForTimeout(100);
			
			await expect(page.locator('.error-message')).toBeVisible();
			await expect(page.locator('.error-message')).toContainText('Token format');
			await expect(nextButton).toBeDisabled();
			
			// Clear and enter valid token
			await page.fill('#telegram-token', TEST_DATA.telegramToken);
			await page.waitForTimeout(100);
			
			await expect(page.locator('.error-message')).not.toBeVisible();
			await expect(nextButton).toBeEnabled();
		});

		test('should navigate back to Step 1', async ({ page }) => {
			await goBack(page);
			
			await expect(page.locator('.step-text')).toContainText('Step 1 of 4');
			await expect(page.locator('.step-title')).toHaveText('Name Your Bot');
			
			// Form data should be preserved
			await expect(page.locator('#bot-name')).toHaveValue(TEST_DATA.botName);
		});

		test('should proceed to Step 3 with valid token', async ({ page }) => {
			await fillStep2(page, TEST_DATA.telegramToken);
			await goToNextStep(page);
			
			await expect(page.locator('.step-text')).toContainText('Step 3 of 4');
			await expect(page.locator('.step-title')).toHaveText('Security Passcode');
		});
	});

	test.describe('Step 3 - Security Passcode', () => {
		test.beforeEach(async ({ page }) => {
			await openModal(page);
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			await fillStep2(page, TEST_DATA.telegramToken);
			await goToNextStep(page);
		});

		test('should display passcode input with validation', async ({ page }) => {
			const nextButton = page.locator('[data-testid="next-button"]');
			
			// Initially disabled
			await expect(nextButton).toBeDisabled();
			
			// Enter short passcode
			await fillStep3(page, TEST_DATA.shortPasscode);
			await page.waitForTimeout(100);
			
			await expect(page.locator('.error-message')).toContainText('at least 4 characters');
			await expect(nextButton).toBeDisabled();
		});

		test('should toggle passcode visibility', async ({ page }) => {
			const passcodeInput = page.locator('#passcode');
			const toggleButton = page.locator('.passcode-visibility-toggle');
			
			await expect(passcodeInput).toHaveAttribute('type', 'password');
			
			await toggleButton.click();
			await expect(passcodeInput).toHaveAttribute('type', 'text');
			
			await toggleButton.click();
			await expect(passcodeInput).toHaveAttribute('type', 'password');
		});

		test('should generate random passcode with dice button', async ({ page }) => {
			const generateButton = page.locator('.generate-passcode-btn');
			
			// Click generate button
			await generateButton.click();
			await page.waitForTimeout(100);
			
			// Should have generated an 8-character passcode
			const passcodeValue = await page.locator('#passcode').inputValue();
			expect(passcodeValue.length).toBe(8);
			
			// Next button should be enabled
			await expect(page.locator('[data-testid="next-button"]')).toBeEnabled();
		});

		test('should show security help box', async ({ page }) => {
			await expect(page.locator('.security-help-box')).toBeVisible();
			await expect(page.locator('.security-help-box')).toContainText('Why do I need a passcode?');
		});

		test('should proceed to Step 4 with valid passcode', async ({ page }) => {
			await fillStep3(page, TEST_DATA.passcode);
			await goToNextStep(page);
			
			await expect(page.locator('.step-text')).toContainText('Step 4 of 4');
			await expect(page.locator('.step-title')).toHaveText('Review and Launch');
		});
	});

	test.describe('Step 4 - Review and Launch', () => {
		test.beforeEach(async ({ page }) => {
			await openModal(page);
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			await fillStep2(page, TEST_DATA.telegramToken);
			await goToNextStep(page);
			await fillStep3(page, TEST_DATA.passcode);
			await goToNextStep(page);
		});

		test('should display configuration summary', async ({ page }) => {
			// Summary card should be visible
			await expect(page.locator('.summary-card')).toBeVisible();
			
			// Bot name should be displayed in summary
			const summaryCard = page.locator('.summary-card');
			await expect(summaryCard).toContainText(TEST_DATA.botName);
			
			// Telegram status should be connected
			await expect(page.locator('.status-connected')).toContainText('Connected');
			
			// Passcode should be masked
			const passcodeDisplay = await page.locator('.passcode-value').textContent();
			expect(passcodeDisplay).toContain('•');
		});

		test('should toggle passcode visibility in review', async ({ page }) => {
			const toggleButton = page.locator('.passcode-toggle');
			
			// Initially masked
			let passcodeText = await page.locator('.passcode-value').textContent();
			expect(passcodeText).toContain('•');
			
			// Click toggle
			await toggleButton.click();
			
			// Should show actual passcode
			passcodeText = await page.locator('.passcode-value').textContent();
			expect(passcodeText).toBe(TEST_DATA.passcode);
			
			// Click again to hide
			await toggleButton.click();
			passcodeText = await page.locator('.passcode-value').textContent();
			expect(passcodeText).toContain('•');
		});

		test('should display credit cost breakdown', async ({ page }) => {
			await expect(page.locator('.credits-section')).toBeVisible();
			await expect(page.locator('.credits-title')).toContainText('Credit Usage');
			
			// Get the credits card content
			const creditsCard = page.locator('.credits-card');
			
			// Hourly rate should be displayed
			await expect(creditsCard).toContainText('95 credits/hour');
			
			// Balance should be displayed
			await expect(creditsCard).toContainText('500 credits');
		});

		test('should show Launch Bot button', async ({ page }) => {
			const launchButton = page.locator('[data-testid="launch-button"]');
			await expect(launchButton).toBeVisible();
			await expect(launchButton).toContainText('Launch Bot');
			await expect(launchButton).toBeEnabled();
		});

		test('should navigate back to Step 3', async ({ page }) => {
			await goBack(page);
			
			await expect(page.locator('.step-text')).toContainText('Step 3 of 4');
			await expect(page.locator('.step-title')).toHaveText('Security Passcode');
			
			// Passcode should be preserved
			await expect(page.locator('#passcode')).toHaveValue(TEST_DATA.passcode);
		});
	});

	test.describe('Multi-Channel API Tests', () => {
		test('should accept multi-channel configuration with UUID', async ({ page }) => {
			// Mock the API endpoint with multi-channel schema validation
			await page.route('/api/vms', async (route) => {
				const request = route.request();
				const postData = await request.postDataJSON();
				
				// Verify the new multi-channel schema
				expect(postData).toHaveProperty('id');
				expect(postData.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i); // UUID v4 format
				expect(postData).toHaveProperty('channels');
				expect(postData.channels).toHaveProperty('telegram');
				expect(postData.channels.telegram).toHaveProperty('enabled', true);
				expect(postData.channels.telegram).toHaveProperty('token');
				expect(postData.channels.telegram).toHaveProperty('dmPolicy');
				
				await route.fulfill({
					status: 202,
					contentType: 'application/json',
					body: JSON.stringify({
						success: true,
						message: 'VM creation request accepted for processing',
						commandId: postData.id
					}),
				});
			});
			
			await openModal(page);
			
			// Complete all steps
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			await fillStep2(page, TEST_DATA.telegramToken);
			await goToNextStep(page);
			await fillStep3(page, TEST_DATA.passcode);
			await goToNextStep(page);
			
			// Launch
			await page.click('[data-testid="launch-button"]');
			await page.waitForTimeout(300);
			
			// Modal should close on success
			await page.waitForSelector('[data-testid="modal-overlay"]', { state: 'hidden', timeout: 5000 });
		});

		test('should reject request without UUID', async ({ page }) => {
			// Mock API to simulate validation error for missing UUID
			await page.route('/api/vms', async (route) => {
				const request = route.request();
				const postData = await request.postDataJSON();
				
				// Simulate validation - reject if no valid UUID
				if (!postData.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(postData.id)) {
					await route.fulfill({
						status: 400,
						contentType: 'application/json',
						body: JSON.stringify({
							success: false,
							message: 'Validation failed',
							errors: [{ field: 'id', message: 'Invalid command ID format. Expected UUID v4' }]
						}),
					});
					return;
				}
				
				await route.fulfill({
					status: 202,
					contentType: 'application/json',
					body: JSON.stringify({ success: true, commandId: postData.id }),
				});
			});
			
			await openModal(page);
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			await fillStep2(page, TEST_DATA.telegramToken);
			await goToNextStep(page);
			await fillStep3(page, TEST_DATA.passcode);
			await goToNextStep(page);
			
			await page.click('[data-testid="launch-button"]');
			await page.waitForTimeout(300);
		});

		test('should reject request without any channel configured', async ({ page }) => {
			// Mock API to simulate validation error for no channels
			await page.route('/api/vms', async (route) => {
				await route.fulfill({
					status: 400,
					contentType: 'application/json',
					body: JSON.stringify({
						success: false,
						message: 'Validation failed',
						errors: [{ field: 'channels', message: 'At least one messaging channel must be configured' }]
					}),
				});
			});
			
			await openModal(page);
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			await fillStep2(page, TEST_DATA.telegramToken);
			await goToNextStep(page);
			await fillStep3(page, TEST_DATA.passcode);
			await goToNextStep(page);
			
			await page.click('[data-testid="launch-button"]');
			await page.waitForTimeout(300);
			
			// Should show error
			await expect(page.locator('.launch-error')).toBeVisible();
		});

		test('should return HTTP 202 status for async processing', async ({ page }) => {
			await page.route('/api/vms', async (route) => {
				await route.fulfill({
					status: 202, // Accepted for async processing
					contentType: 'application/json',
					body: JSON.stringify({
						success: true,
						message: 'VM creation request accepted for processing',
						commandId: TEST_DATA.commandId
					}),
				});
			});
			
			await openModal(page);
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			await fillStep2(page, TEST_DATA.telegramToken);
			await goToNextStep(page);
			await fillStep3(page, TEST_DATA.passcode);
			await goToNextStep(page);
			
			await page.click('[data-testid="launch-button"]');
			await page.waitForTimeout(300);
			
			// Success - modal should close
			await page.waitForSelector('[data-testid="modal-overlay"]', { state: 'hidden', timeout: 5000 });
		});
	});

	test.describe('Full Happy Path', () => {
		test('should complete full flow and launch bot successfully', async ({ page }) => {
			// Mock the API endpoint with new schema
			await page.route('/api/vms', async (route) => {
				const request = route.request();
				const postData = await request.postDataJSON();
				
				// Verify request has new multi-channel format
				expect(postData).toHaveProperty('id');
				expect(postData).toHaveProperty('channels');
				
				await route.fulfill({
					status: 202,
					contentType: 'application/json',
					body: JSON.stringify({
						success: true,
						message: 'VM creation request accepted for processing',
						commandId: postData.id || TEST_DATA.commandId
					}),
				});
			});
			
			await openModal(page);
			
			// Step 1: Enter bot name
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			
			// Step 2: Enter token
			await fillStep2(page, TEST_DATA.telegramToken);
			await goToNextStep(page);
			
			// Step 3: Enter passcode
			await fillStep3(page, TEST_DATA.passcode);
			await goToNextStep(page);
			
			// Step 4: Launch
			const launchButton = page.locator('[data-testid="launch-button"]');
			await expect(launchButton).toContainText('Launch Bot');
			
			// Click launch
			await launchButton.click();
			
			// Should show loading state
			await expect(page.locator('.spinner')).toBeVisible();
			await expect(page.locator('[data-testid="launch-button"]')).toContainText('Launching...');
			
			// Wait for API response
			await page.waitForTimeout(300);
			
			// Modal should close
			await page.waitForSelector('[data-testid="modal-overlay"]', { state: 'hidden', timeout: 5000 });
			
			// Success toast should appear (toast-notification class)
			await expect(page.locator('.toast-notification')).toBeVisible();
			await expect(page.locator('.toast-notification')).toContainText('is being deployed');
			
			// Take screenshot of success state
			await page.screenshot({ path: 'test-results/happy-path-success.png', fullPage: true });
		});
	});

	test.describe('Error Handling', () => {
		test('should display error message on API failure', async ({ page }) => {
			// Mock the API to return an error
			await page.route('/api/vms', async (route) => {
				await route.fulfill({
					status: 500,
					contentType: 'application/json',
					body: JSON.stringify({
						success: false,
						message: 'Failed to publish to Redis: Connection refused'
					}),
				});
			});
			
			await openModal(page);
			
			// Complete all steps
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			await fillStep2(page, TEST_DATA.telegramToken);
			await goToNextStep(page);
			await fillStep3(page, TEST_DATA.passcode);
			await goToNextStep(page);
			
			// Try to launch
			await page.click('[data-testid="launch-button"]');
			await page.waitForTimeout(300);
			
			// Error message should be displayed
			await expect(page.locator('.launch-error')).toBeVisible();
			await expect(page.locator('.launch-error')).toContainText('Failed to publish to Redis');
			
			// Modal should still be open
			await expect(page.locator('[data-testid="modal-overlay"]')).toBeVisible();
			
			// Should be on Step 4 still
			await expect(page.locator('.step-text')).toContainText('Step 4 of 4');
			
			// Launch button should no longer be loading
			await expect(page.locator('.spinner')).not.toBeVisible();
			
			// Take screenshot
			await page.screenshot({ path: 'test-results/api-error-displayed.png', fullPage: true });
		});

		test('should handle network error gracefully', async ({ page }) => {
			// Mock the API to fail with network error
			await page.route('/api/vms', async (route) => {
				await route.abort('failed');
			});
			
			await openModal(page);
			
			// Complete all steps
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			await fillStep2(page, TEST_DATA.telegramToken);
			await goToNextStep(page);
			await fillStep3(page, TEST_DATA.passcode);
			await goToNextStep(page);
			
			// Try to launch
			await page.click('[data-testid="launch-button"]');
			await page.waitForTimeout(300);
			
			// Network error message should be displayed
			await expect(page.locator('.launch-error')).toBeVisible();
			await expect(page.locator('.launch-error')).toContainText('Network error');
		});

		test('should handle validation error from API', async ({ page }) => {
			// Mock the API to return validation error
			await page.route('/api/vms', async (route) => {
				await route.fulfill({
					status: 400,
					contentType: 'application/json',
					body: JSON.stringify({
						success: false,
						message: 'Validation failed: Invalid token format',
						errors: [
							{ field: 'channels.telegram.token', message: 'Invalid token format' }
						]
					}),
				});
			});
			
			await openModal(page);
			
			// Complete all steps
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			await fillStep2(page, TEST_DATA.telegramToken);
			await goToNextStep(page);
			await fillStep3(page, TEST_DATA.passcode);
			await goToNextStep(page);
			
			// Try to launch
			await page.click('[data-testid="launch-button"]');
			await page.waitForTimeout(300);
			
			// Validation error should be displayed
			await expect(page.locator('.launch-error')).toBeVisible();
			await expect(page.locator('.launch-error')).toContainText('Validation failed');
		});
	});

	test.describe('Modal Close Behavior', () => {
		test('should close modal when clicking X button', async ({ page }) => {
			await openModal(page);
			
			// Click close button
			await page.click('.close-button');
			
			// Modal should be closed
			await page.waitForSelector('[data-testid="modal-overlay"]', { state: 'hidden', timeout: 5000 });
			await expect(page.locator('[data-testid="modal-overlay"]')).not.toBeVisible();
		});

		test('should show confirmation dialog when closing with dirty form', async ({ page }) => {
			await openModal(page);
			
			// Enter some data
			await fillStep1(page, TEST_DATA.botName);
			
			// Try to close
			await page.click('.close-button');
			
			// Confirmation dialog should appear
			await page.waitForSelector('[data-testid="confirm-dialog"]', { state: 'visible' });
			await expect(page.locator('.confirm-title')).toContainText('Discard Changes?');
			
			// Take screenshot
			await page.screenshot({ path: 'test-results/close-confirmation-dialog.png', fullPage: true });
		});

		test('should close modal after confirming discard', async ({ page }) => {
			await openModal(page);
			
			// Enter some data
			await fillStep1(page, TEST_DATA.botName);
			
			// Try to close
			await page.click('.close-button');
			await page.waitForSelector('[data-testid="confirm-dialog"]', { state: 'visible' });
			
			// Click discard button
			await page.click('[data-testid="discard-button"]');
			
			// Modal should be closed
			await page.waitForSelector('[data-testid="modal-overlay"]', { state: 'hidden', timeout: 5000 });
			await expect(page.locator('[data-testid="modal-overlay"]')).not.toBeVisible();
		});

		test('should keep modal open when canceling close', async ({ page }) => {
			await openModal(page);
			
			// Enter some data
			await fillStep1(page, TEST_DATA.botName);
			
			// Try to close
			await page.click('.close-button');
			await page.waitForSelector('[data-testid="confirm-dialog"]', { state: 'visible' });
			
			// Click keep editing button
			await page.click('[data-testid="keep-editing-button"]');
			
			// Modal should still be open
			await expect(page.locator('[data-testid="modal-overlay"]')).toBeVisible();
			
			// Form data should be preserved
			await expect(page.locator('#bot-name')).toHaveValue(TEST_DATA.botName);
		});

		test('should close modal with Escape key', async ({ page }) => {
			await openModal(page);
			
			// Enter some data to make form dirty
			await fillStep1(page, TEST_DATA.botName);
			
			// Press Escape
			await page.keyboard.press('Escape');
			
			// Should show confirmation since form is dirty
			await page.waitForSelector('[data-testid="confirm-dialog"]', { state: 'visible' });
			await expect(page.locator('.confirm-dialog')).toBeVisible();
			
			// Click discard
			await page.click('[data-testid="discard-button"]');
			
			// Modal should be closed
			await page.waitForSelector('[data-testid="modal-overlay"]', { state: 'hidden', timeout: 5000 });
			await expect(page.locator('[data-testid="modal-overlay"]')).not.toBeVisible();
		});
	});

	test.describe('Navigation Between All Steps', () => {
		test('should navigate through all 4 steps and back', async ({ page }) => {
			await openModal(page);
			
			// Step 1
			await expect(page.locator('.step-text')).toContainText('Step 1 of 4');
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			
			// Step 2
			await expect(page.locator('.step-text')).toContainText('Step 2 of 4');
			await fillStep2(page, TEST_DATA.telegramToken);
			await goToNextStep(page);
			
			// Step 3
			await expect(page.locator('.step-text')).toContainText('Step 3 of 4');
			await fillStep3(page, TEST_DATA.passcode);
			await goToNextStep(page);
			
			// Step 4
			await expect(page.locator('.step-text')).toContainText('Step 4 of 4');
			
			// Go back through all steps
			await goBack(page); // To Step 3
			await expect(page.locator('.step-text')).toContainText('Step 3 of 4');
			
			await goBack(page); // To Step 2
			await expect(page.locator('.step-text')).toContainText('Step 2 of 4');
			
			await goBack(page); // To Step 1
			await expect(page.locator('.step-text')).toContainText('Step 1 of 4');
			
			// Verify data is preserved
			await expect(page.locator('#bot-name')).toHaveValue(TEST_DATA.botName);
		});
	});

	test.describe('Visual Regression Screenshots', () => {
		test('should capture all steps for visual baseline', async ({ page }) => {
			await openModal(page);
			
			// Step 1
			await page.screenshot({ path: 'test-results/baseline-step1.png' });
			await fillStep1(page, TEST_DATA.botName);
			await page.screenshot({ path: 'test-results/baseline-step1-filled.png' });
			await goToNextStep(page);
			
			// Step 2
			await page.screenshot({ path: 'test-results/baseline-step2.png' });
			await fillStep2(page, TEST_DATA.telegramToken);
			await page.screenshot({ path: 'test-results/baseline-step2-filled.png' });
			await goToNextStep(page);
			
			// Step 3
			await page.screenshot({ path: 'test-results/baseline-step3.png' });
			await fillStep3(page, TEST_DATA.passcode);
			await page.screenshot({ path: 'test-results/baseline-step3-filled.png' });
			await goToNextStep(page);
			
			// Step 4
			await page.screenshot({ path: 'test-results/baseline-step4.png' });
		});
	});
});
