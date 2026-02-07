import { test, expect, type Page } from '@playwright/test';

/**
 * VM Creation Modal Test Suite - Multi-Channel Flow
 * Tests the 5-step modal for creating VM bots with multi-channel support
 * 
 * Step 1: Name Your Bot
 * Step 2: Select Channels (Telegram, Discord, WhatsApp)
 * Step 3: Configure Channels
 * Step 4: Security Configuration (Review)
 * Step 5: Review and Launch
 */

// Test data
const TEST_DATA = {
	botName: 'test-bot-123',
	invalidBotName: 'ab', // Too short
	telegramToken: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
	invalidTelegramToken: 'invalid-token-format',
	discordToken: 'MTAxMDI3NzY1NDMyMTA1MzkyMA.GHtJtX.your_token_here',
	invalidDiscordToken: 'invalid token with spaces!',
	whatsappPhone: '+12345678901',
	invalidWhatsappPhone: '1234567890', // Missing +
	whatsappApiKey: 'test_api_key_12345',
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

// Helper to fill Step 1 (Bot Name)
async function fillStep1(page: Page, botName: string): Promise<void> {
	await page.fill('#bot-name', botName);
}

// Helper to select channels in Step 2
async function selectChannel(page: Page, channelId: 'telegram' | 'discord' | 'whatsapp'): Promise<void> {
	await page.click(`[data-testid="channel-card-${channelId}"]`);
}

// Helper to fill Telegram configuration
async function fillTelegramConfig(page: Page, token: string): Promise<void> {
	await page.fill('[data-testid="telegram-token-input"]', token);
}

// Helper to fill Discord configuration
async function fillDiscordConfig(page: Page, token: string): Promise<void> {
	await page.fill('[data-testid="discord-token-input"]', token);
}

// Helper to fill WhatsApp configuration
async function fillWhatsAppConfig(page: Page, phone: string, apiKey: string): Promise<void> {
	await page.fill('[data-testid="whatsapp-phone-input"]', phone);
	await page.fill('[data-testid="whatsapp-api-key-input"]', apiKey);
}

// Helper to select dmPolicy
async function selectDMPolicy(page: Page, channel: 'telegram' | 'discord' | 'whatsapp', policy: 'pairing' | 'allowlist' | 'open'): Promise<void> {
	// The policy buttons are in the config form, need to find the one for the specific channel
	const formSelector = channel === 'telegram' ? '[data-testid="telegram-config-form"]' :
	                     channel === 'discord' ? '[data-testid="discord-config-form"]' :
	                     '[data-testid="whatsapp-config-form"]';
	await page.click(`${formSelector} [data-testid="dm-policy-${policy}"]`);
}

// Helper to navigate to next step
async function goToNextStep(page: Page): Promise<void> {
	await page.click('[data-testid="next-button"]');
}

// Helper to go back
async function goBack(page: Page): Promise<void> {
	await page.click('[data-testid="back-button"]');
}

// Helper to complete full flow with single channel
async function completeSingleChannelFlow(
	page: Page, 
	channel: 'telegram' | 'discord' | 'whatsapp',
	mockApi = true
): Promise<void> {
	if (mockApi) {
		await page.route('/api/vms', async (route) => {
			const request = route.request();
			const postData = await request.postDataJSON();
			
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
	}
	
	await openModal(page);
	
	// Step 1: Name
	await fillStep1(page, TEST_DATA.botName);
	await goToNextStep(page);
	
	// Step 2: Select channel
	await selectChannel(page, channel);
	await goToNextStep(page);
	
	// Step 3: Configure channel
	if (channel === 'telegram') {
		await fillTelegramConfig(page, TEST_DATA.telegramToken);
	} else if (channel === 'discord') {
		await fillDiscordConfig(page, TEST_DATA.discordToken);
	} else if (channel === 'whatsapp') {
		await fillWhatsAppConfig(page, TEST_DATA.whatsappPhone, TEST_DATA.whatsappApiKey);
	}
	await page.waitForTimeout(200); // Wait for validation
	await goToNextStep(page);
	
	// Step 4: Security (review step, just click next)
	await goToNextStep(page);
	
	// Step 5: Review and launch
	await page.click('[data-testid="launch-button"]');
}

test.describe('VM Creation Modal - Multi-Channel Flow', () => {
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
			await expect(page.locator('.step-text')).toContainText('Step 1 of 5');
			
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
			
			await expect(page.locator('.step-text')).toContainText('Step 2 of 5');
			await expect(page.locator('[data-testid="channel-selection-step"]')).toBeVisible();
		});
	});

	test.describe('Step 2 - Channel Selection', () => {
		test.beforeEach(async ({ page }) => {
			await openModal(page);
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
		});

		test('should display channel selection grid', async ({ page }) => {
			// All three channel cards should be visible
			await expect(page.locator('[data-testid="channel-card-telegram"]')).toBeVisible();
			await expect(page.locator('[data-testid="channel-card-discord"]')).toBeVisible();
			await expect(page.locator('[data-testid="channel-card-whatsapp"]')).toBeVisible();
		});

		test('should select single channel', async ({ page }) => {
			// Initially no channels selected
			await expect(page.locator('[data-testid="selection-summary"]')).toContainText('Select at least one channel');
			
			// Select Telegram
			await selectChannel(page, 'telegram');
			
			// Verify selection summary updated
			await expect(page.locator('[data-testid="selection-summary"]')).toContainText('Selected: 1 channel');
			
			// Next button should be enabled
			await expect(page.locator('[data-testid="next-button"]')).toBeEnabled();
		});

		test('should select multiple channels', async ({ page }) => {
			// Select Telegram and Discord
			await selectChannel(page, 'telegram');
			await selectChannel(page, 'discord');
			
			// Verify selection summary
			await expect(page.locator('[data-testid="selection-summary"]')).toContainText('Selected: 2 channels');
			
			// Both channel chips should be visible
			await expect(page.locator('.channel-chip')).toHaveCount(2);
		});

		test('should toggle channel selection', async ({ page }) => {
			// Select and then deselect
			await selectChannel(page, 'telegram');
			await expect(page.locator('[data-testid="selection-summary"]')).toContainText('Selected: 1 channel');
			
			await selectChannel(page, 'telegram');
			await expect(page.locator('[data-testid="selection-summary"]')).toContainText('Select at least one channel');
			
			// Next button should be disabled
			await expect(page.locator('[data-testid="next-button"]')).toBeDisabled();
		});

		test('should require at least one channel', async ({ page }) => {
			// Try to proceed without selecting any channel
			await expect(page.locator('[data-testid="next-button"]')).toBeDisabled();
			
			// Validation message should be visible
			await expect(page.locator('.validation-message')).toContainText('Please select at least one messaging channel');
		});

		test('should navigate back to Step 1', async ({ page }) => {
			await goBack(page);
			
			await expect(page.locator('.step-text')).toContainText('Step 1 of 5');
			
			// Form data should be preserved
			await expect(page.locator('#bot-name')).toHaveValue(TEST_DATA.botName);
		});

		test('should proceed to Step 3 after channel selection', async ({ page }) => {
			await selectChannel(page, 'telegram');
			await goToNextStep(page);
			
			await expect(page.locator('.step-text')).toContainText('Step 3 of 5');
			await expect(page.locator('[data-testid="telegram-config-form"]')).toBeVisible();
		});
	});

	test.describe('Step 3 - Telegram Configuration', () => {
		test.beforeEach(async ({ page }) => {
			await openModal(page);
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			await selectChannel(page, 'telegram');
			await goToNextStep(page);
		});

		test('should display Telegram config form', async ({ page }) => {
			await expect(page.locator('[data-testid="telegram-config-form"]')).toBeVisible();
			await expect(page.locator('[data-testid="telegram-token-input"]')).toBeVisible();
		});

		test('should validate token format', async ({ page }) => {
			const nextButton = page.locator('[data-testid="next-button"]');
			
			// Enter invalid token
			await fillTelegramConfig(page, TEST_DATA.invalidTelegramToken);
			await page.waitForTimeout(100);
			
			await expect(page.locator('.error-message')).toBeVisible();
			await expect(page.locator('.error-message')).toContainText('Token format');
			await expect(nextButton).toBeDisabled();
			
			// Clear and enter valid token
			await fillTelegramConfig(page, TEST_DATA.telegramToken);
			await page.waitForTimeout(100);
			
			await expect(page.locator('.error-message')).not.toBeVisible();
			await expect(nextButton).toBeEnabled();
		});

		test('should toggle token visibility', async ({ page }) => {
			const tokenInput = page.locator('[data-testid="telegram-token-input"]');
			const toggleButton = page.locator('[data-testid="token-visibility-toggle"]');
			
			// Initially password type
			await expect(tokenInput).toHaveAttribute('type', 'password');
			
			// Click toggle
			await toggleButton.click();
			await expect(tokenInput).toHaveAttribute('type', 'text');
			
			// Click again
			await toggleButton.click();
			await expect(tokenInput).toHaveAttribute('type', 'password');
		});

		test('should show dmPolicy options', async ({ page }) => {
			await expect(page.locator('[data-testid="dm-policy-pairing"]')).toBeVisible();
			await expect(page.locator('[data-testid="dm-policy-allowlist"]')).toBeVisible();
			await expect(page.locator('[data-testid="dm-policy-open"]')).toBeVisible();
		});

		test('should change dmPolicy selection', async ({ page }) => {
			// Default is pairing mode
			await expect(page.locator('.pairing-info')).toBeVisible();
			
			// Switch to allowlist
			await selectDMPolicy(page, 'telegram', 'allowlist');
			await expect(page.locator('[data-testid="allowed-users-input"]')).toBeVisible();
			
			// Switch to open
			await selectDMPolicy(page, 'telegram', 'open');
			await expect(page.locator('.warning-box')).toBeVisible();
		});

		test('should allow entering allowed users', async ({ page }) => {
			// Switch to allowlist mode
			await selectDMPolicy(page, 'telegram', 'allowlist');
			
			// Enter usernames
			await page.fill('[data-testid="allowed-users-input"]', 'user1\nuser2\n@user3');
			await page.waitForTimeout(100);
			
			// User chips should appear
			await expect(page.locator('.user-chip')).toHaveCount(3);
		});

		test('should navigate back to Step 2', async ({ page }) => {
			await goBack(page);
			
			await expect(page.locator('.step-text')).toContainText('Step 2 of 5');
			
			// Channel selection should be preserved
			const telegramCard = page.locator('[data-testid="channel-card-telegram"]');
			await expect(telegramCard).toHaveAttribute('aria-checked', 'true');
		});

		test('should proceed to Step 4 with valid token', async ({ page }) => {
			await fillTelegramConfig(page, TEST_DATA.telegramToken);
			await page.waitForTimeout(100);
			await goToNextStep(page);
			
			await expect(page.locator('.step-text')).toContainText('Step 4 of 5');
			await expect(page.locator('[data-testid="security-config-step"]')).toBeVisible();
		});
	});

	test.describe('Step 3 - Discord Configuration', () => {
		test.beforeEach(async ({ page }) => {
			await openModal(page);
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			await selectChannel(page, 'discord');
			await goToNextStep(page);
		});

		test('should display Discord config form', async ({ page }) => {
			await expect(page.locator('[data-testid="discord-config-form"]')).toBeVisible();
			await expect(page.locator('[data-testid="discord-token-input"]')).toBeVisible();
		});

		test('should validate Discord token format', async ({ page }) => {
			const nextButton = page.locator('[data-testid="next-button"]');
			
			// Enter invalid token
			await fillDiscordConfig(page, TEST_DATA.invalidDiscordToken);
			await page.waitForTimeout(100);
			
			await expect(page.locator('.error-message')).toBeVisible();
			await expect(nextButton).toBeDisabled();
			
			// Enter valid token
			await fillDiscordConfig(page, TEST_DATA.discordToken);
			await page.waitForTimeout(100);
			
			await expect(nextButton).toBeEnabled();
		});

		test('should show required intents warning', async ({ page }) => {
			await expect(page.locator('.intents-box')).toBeVisible();
			await expect(page.locator('.intents-box')).toContainText('Message Content Intent');
		});
	});

	test.describe('Step 3 - WhatsApp Configuration', () => {
		test.beforeEach(async ({ page }) => {
			await openModal(page);
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			await selectChannel(page, 'whatsapp');
			await goToNextStep(page);
		});

		test('should display WhatsApp config form', async ({ page }) => {
			await expect(page.locator('[data-testid="whatsapp-config-form"]')).toBeVisible();
			await expect(page.locator('[data-testid="whatsapp-phone-input"]')).toBeVisible();
			await expect(page.locator('[data-testid="whatsapp-api-key-input"]')).toBeVisible();
		});

		test('should validate E.164 phone format', async ({ page }) => {
			const nextButton = page.locator('[data-testid="next-button"]');
			
			// Enter phone without +
			await page.fill('[data-testid="whatsapp-phone-input"]', TEST_DATA.invalidWhatsappPhone);
			await page.waitForTimeout(100);
			
			await expect(page.locator('.error-message')).toContainText('must start with +');
			await expect(nextButton).toBeDisabled();
			
			// Enter valid phone
			await page.fill('[data-testid="whatsapp-phone-input"]', TEST_DATA.whatsappPhone);
			await page.fill('[data-testid="whatsapp-api-key-input"]', TEST_DATA.whatsappApiKey);
			await page.waitForTimeout(100);
			
			await expect(nextButton).toBeEnabled();
		});

		test('should toggle API key visibility', async ({ page }) => {
			const apiKeyInput = page.locator('[data-testid="whatsapp-api-key-input"]');
			const toggleButton = page.locator('[data-testid="api-key-visibility-toggle"]');
			
			await expect(apiKeyInput).toHaveAttribute('type', 'password');
			
			await toggleButton.click();
			await expect(apiKeyInput).toHaveAttribute('type', 'text');
			
			await toggleButton.click();
			await expect(apiKeyInput).toHaveAttribute('type', 'password');
		});

		test('should have optional webhook URL field', async ({ page }) => {
			await expect(page.locator('[data-testid="whatsapp-webhook-input"]')).toBeVisible();
		});
	});

	test.describe('Step 3 - Multi-Channel Configuration', () => {
		test.beforeEach(async ({ page }) => {
			await openModal(page);
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			// Select multiple channels
			await selectChannel(page, 'telegram');
			await selectChannel(page, 'discord');
			await goToNextStep(page);
		});

		test('should display multiple channel config forms', async ({ page }) => {
			await expect(page.locator('[data-testid="telegram-config-form"]')).toBeVisible();
			await expect(page.locator('[data-testid="discord-config-form"]')).toBeVisible();
		});

		test('should require all channel forms to be valid', async ({ page }) => {
			const nextButton = page.locator('[data-testid="next-button"]');
			
			// Fill only Telegram
			await fillTelegramConfig(page, TEST_DATA.telegramToken);
			await page.waitForTimeout(100);
			
			// Still disabled because Discord is empty
			await expect(nextButton).toBeDisabled();
			
			// Fill Discord too
			await fillDiscordConfig(page, TEST_DATA.discordToken);
			await page.waitForTimeout(100);
			
			// Now should be enabled
			await expect(nextButton).toBeEnabled();
		});
	});

	test.describe('Step 4 - Security Configuration', () => {
		test.beforeEach(async ({ page }) => {
			await openModal(page);
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			await selectChannel(page, 'telegram');
			await goToNextStep(page);
			await fillTelegramConfig(page, TEST_DATA.telegramToken);
			await page.waitForTimeout(100);
			await goToNextStep(page);
		});

		test('should display security configuration summary', async ({ page }) => {
			await expect(page.locator('[data-testid="security-config-step"]')).toBeVisible();
			await expect(page.locator('[data-testid="channels-summary"]')).toBeVisible();
		});

		test('should show selected channels with their policies', async ({ page }) => {
			await expect(page.locator('.channel-item')).toContainText('Telegram');
			await expect(page.locator('.channel-policy')).toContainText('Pairing Mode');
		});

		test('should show pairing mode explanation', async ({ page }) => {
			await expect(page.locator('.pairing-info')).toBeVisible();
			await expect(page.locator('.pairing-info')).toContainText('Pairing Mode');
		});

		test('should show allowlist explanation when using allowlist', async ({ page }) => {
			// Go back to config and change to allowlist
			await goBack(page);
			await selectDMPolicy(page, 'telegram', 'allowlist');
			await page.waitForTimeout(100);
			
			// Go back to security step
			await goToNextStep(page);
			await expect(page.locator('.allowlist-info')).toBeVisible();
		});

		test('should show open access warning when using open', async ({ page }) => {
			// Go back to config and change to open
			await goBack(page);
			await selectDMPolicy(page, 'telegram', 'open');
			await page.waitForTimeout(100);
			
			// Go back to security step
			await goToNextStep(page);
			await expect(page.locator('.open-warning')).toBeVisible();
		});

		test('should navigate back to Step 3', async ({ page }) => {
			await goBack(page);
			
			await expect(page.locator('.step-text')).toContainText('Step 3 of 5');
			await expect(page.locator('[data-testid="telegram-config-form"]')).toBeVisible();
		});

		test('should proceed to Step 5', async ({ page }) => {
			await goToNextStep(page);
			
			await expect(page.locator('.step-text')).toContainText('Step 5 of 5');
			await expect(page.locator('[data-testid="review-step"]')).toBeVisible();
		});
	});

	test.describe('Step 5 - Review and Launch', () => {
		test.beforeEach(async ({ page }) => {
			await openModal(page);
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			await selectChannel(page, 'telegram');
			await goToNextStep(page);
			await fillTelegramConfig(page, TEST_DATA.telegramToken);
			await page.waitForTimeout(100);
			await goToNextStep(page);
			await goToNextStep(page);
		});

		test('should display review information', async ({ page }) => {
			await expect(page.locator('[data-testid="review-step"]')).toBeVisible();
			
			// Bot name should be displayed
			await expect(page.locator('.bot-name-value')).toContainText(TEST_DATA.botName);
			
			// Channel summary should be visible
			await expect(page.locator('[data-testid="channel-summary-telegram"]')).toBeVisible();
		});

		test('should display masked credentials', async ({ page }) => {
			const credential = page.locator('[data-testid="masked-credential-telegram"]');
			const text = await credential.textContent();
			expect(text).toContain('•');
			expect(text).not.toContain(TEST_DATA.telegramToken);
		});

		test('should display credit cost breakdown', async ({ page }) => {
			await expect(page.locator('.credits-section')).toBeVisible();
			await expect(page.locator('.credits-section')).toContainText('95 credits/hour');
		});

		test('should show launch button', async ({ page }) => {
			const launchButton = page.locator('[data-testid="launch-button"]');
			await expect(launchButton).toBeVisible();
			await expect(launchButton).toContainText('Launch Bot');
			await expect(launchButton).toBeEnabled();
		});

		test('should navigate back to Step 4', async ({ page }) => {
			await goBack(page);
			
			await expect(page.locator('.step-text')).toContainText('Step 4 of 5');
			await expect(page.locator('[data-testid="security-config-step"]')).toBeVisible();
		});
	});

	test.describe('Multi-Channel API Tests', () => {
		test('should accept multi-channel configuration with UUID', async ({ page }) => {
			await page.route('/api/vms', async (route) => {
				const request = route.request();
				const postData = await request.postDataJSON();
				
				// Verify the new multi-channel schema
				expect(postData).toHaveProperty('id');
				expect(postData.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
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
			
			await completeSingleChannelFlow(page, 'telegram', false);
			
			// Progress modal should appear
			await page.waitForSelector('[data-testid="vm-progress-modal"]', { state: 'visible' });
		});

		test('should send multi-channel request with correct schema', async ({ page }) => {
			let requestBody: Record<string, unknown> | null = null;
			
			await page.route('/api/vms', async (route) => {
				const request = route.request();
				requestBody = await request.postDataJSON();
				
				await route.fulfill({
					status: 202,
					contentType: 'application/json',
					body: JSON.stringify({
						success: true,
						message: 'VM creation request accepted',
						commandId: (requestBody?.id as string) || TEST_DATA.commandId
					}),
				});
			});
			
			// Complete flow with multiple channels
			await openModal(page);
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			await selectChannel(page, 'telegram');
			await selectChannel(page, 'discord');
			await goToNextStep(page);
			await fillTelegramConfig(page, TEST_DATA.telegramToken);
			await fillDiscordConfig(page, TEST_DATA.discordToken);
			await page.waitForTimeout(200);
			await goToNextStep(page);
			await goToNextStep(page);
			
			// Change Telegram to allowlist with users before launching
			await goBack(page);
			await goBack(page);
			await selectDMPolicy(page, 'telegram', 'allowlist');
			await page.fill('[data-testid="telegram-config-form"] [data-testid="allowed-users-input"]', 'user1,user2');
			await page.waitForTimeout(100);
			await goToNextStep(page);
			await goToNextStep(page);
			
			await page.click('[data-testid="launch-button"]');
			await page.waitForTimeout(500);
			
			// Verify request structure
			expect(requestBody).not.toBeNull();
			expect(requestBody).toHaveProperty('name', TEST_DATA.botName);
			expect(requestBody).toHaveProperty('channels.telegram.enabled', true);
			expect(requestBody).toHaveProperty('channels.discord.enabled', true);
			expect(requestBody).toHaveProperty('channels.telegram.token', TEST_DATA.telegramToken);
			expect(requestBody).toHaveProperty('channels.discord.token', TEST_DATA.discordToken);
			expect(requestBody).toHaveProperty('channels.telegram.dmPolicy', 'allowlist');
			expect(requestBody).toHaveProperty('channels.telegram.allowedUsers');
			expect((requestBody?.channels as Record<string, { allowedUsers?: string[] }>)?.telegram?.allowedUsers).toEqual(['user1', 'user2']);
		});
	});

	test.describe('Full Happy Path', () => {
		test('should complete full flow with single channel', async ({ page }) => {
			await page.route('/api/vms', async (route) => {
				await route.fulfill({
					status: 202,
					contentType: 'application/json',
					body: JSON.stringify({
						success: true,
						message: 'VM creation request accepted for processing',
						commandId: TEST_DATA.commandId
					}),
				});
			});
			
			await openModal(page);
			
			// Step 1: Name
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			await expect(page.locator('.step-text')).toContainText('Step 2 of 5');
			
			// Step 2: Select Telegram
			await selectChannel(page, 'telegram');
			await goToNextStep(page);
			await expect(page.locator('.step-text')).toContainText('Step 3 of 5');
			
			// Step 3: Configure Telegram
			await fillTelegramConfig(page, TEST_DATA.telegramToken);
			await page.waitForTimeout(100);
			await goToNextStep(page);
			await expect(page.locator('.step-text')).toContainText('Step 4 of 5');
			
			// Step 4: Security (review)
			await expect(page.locator('[data-testid="security-config-step"]')).toBeVisible();
			await goToNextStep(page);
			await expect(page.locator('.step-text')).toContainText('Step 5 of 5');
			
			// Step 5: Review and launch
			await expect(page.locator('[data-testid="review-step"]')).toBeVisible();
			await page.click('[data-testid="launch-button"]');
			
			// Progress modal should appear
			await page.waitForSelector('[data-testid="vm-progress-modal"]', { state: 'visible' });
			
			// Take screenshot
			await page.screenshot({ path: 'test-results/happy-path-progress-modal.png', fullPage: true });
		});

		test('should complete full flow with all channels', async ({ page }) => {
			await page.route('/api/vms', async (route) => {
				await route.fulfill({
					status: 202,
					contentType: 'application/json',
					body: JSON.stringify({
						success: true,
						message: 'VM creation request accepted for processing',
						commandId: TEST_DATA.commandId
					}),
				});
			});
			
			await openModal(page);
			
			// Step 1
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			
			// Step 2: Select all channels
			await selectChannel(page, 'telegram');
			await selectChannel(page, 'discord');
			await selectChannel(page, 'whatsapp');
			await goToNextStep(page);
			
			// Step 3: Configure all channels
			await fillTelegramConfig(page, TEST_DATA.telegramToken);
			await fillDiscordConfig(page, TEST_DATA.discordToken);
			await fillWhatsAppConfig(page, TEST_DATA.whatsappPhone, TEST_DATA.whatsappApiKey);
			await page.waitForTimeout(200);
			await goToNextStep(page);
			
			// Step 4: Security
			await expect(page.locator('.channel-item')).toHaveCount(3);
			await goToNextStep(page);
			
			// Step 5: Review - verify all channels in summary
			await expect(page.locator('[data-testid="channel-summary-telegram"]')).toBeVisible();
			await expect(page.locator('[data-testid="channel-summary-discord"]')).toBeVisible();
			await expect(page.locator('[data-testid="channel-summary-whatsapp"]')).toBeVisible();
			
			// Launch
			await page.click('[data-testid="launch-button"]');
			
			// Progress modal
			await page.waitForSelector('[data-testid="vm-progress-modal"]', { state: 'visible' });
		});
	});

	test.describe('Error Handling', () => {
		test('should display error message on API failure', async ({ page }) => {
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
			
			await completeSingleChannelFlow(page, 'telegram', false);
			
			// Wait for API response
			await page.waitForTimeout(500);
			
			// Progress modal should show error state
			await page.waitForSelector('[data-testid="vm-progress-modal"]', { state: 'visible' });
			await expect(page.locator('[data-testid="vm-progress-modal"]')).toContainText('Creation Failed');
			await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
		});

		test('should handle validation error from API', async ({ page }) => {
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
			
			await completeSingleChannelFlow(page, 'telegram', false);
			
			await page.waitForTimeout(500);
			
			// Error should be displayed
			await expect(page.locator('[data-testid="vm-progress-modal"]')).toContainText('Creation Failed');
		});

		test('should handle network error', async ({ page }) => {
			await page.route('/api/vms', async (route) => {
				await route.abort('failed');
			});
			
			await completeSingleChannelFlow(page, 'telegram', false);
			
			await page.waitForTimeout(500);
			
			// Should show error state
			await expect(page.locator('[data-testid="vm-progress-modal"]')).toBeVisible();
			await expect(page.locator('[data-testid="vm-progress-modal"]')).toContainText('Creation Failed');
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

		test('should reset form state on reopen', async ({ page }) => {
			await openModal(page);
			
			// Enter data and proceed
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			await selectChannel(page, 'telegram');
			
			// Close without confirmation (cancel button on step 1)
			await goBack(page);
			await page.click('[data-testid="cancel-button"]');
			
			await page.waitForSelector('[data-testid="modal-overlay"]', { state: 'hidden', timeout: 5000 });
			
			// Reopen modal
			await page.click('.hire-button');
			await page.waitForSelector('[data-testid="modal-overlay"]', { state: 'visible' });
			
			// Should be on step 1 with empty form
			await expect(page.locator('.step-text')).toContainText('Step 1 of 5');
			await expect(page.locator('#bot-name')).toHaveValue('');
		});
	});

	test.describe('Navigation Between All Steps', () => {
		test('should navigate through all 5 steps and back', async ({ page }) => {
			await openModal(page);
			
			// Step 1
			await expect(page.locator('.step-text')).toContainText('Step 1 of 5');
			await fillStep1(page, TEST_DATA.botName);
			await goToNextStep(page);
			
			// Step 2
			await expect(page.locator('.step-text')).toContainText('Step 2 of 5');
			await selectChannel(page, 'telegram');
			await goToNextStep(page);
			
			// Step 3
			await expect(page.locator('.step-text')).toContainText('Step 3 of 5');
			await fillTelegramConfig(page, TEST_DATA.telegramToken);
			await page.waitForTimeout(100);
			await goToNextStep(page);
			
			// Step 4
			await expect(page.locator('.step-text')).toContainText('Step 4 of 5');
			await goToNextStep(page);
			
			// Step 5
			await expect(page.locator('.step-text')).toContainText('Step 5 of 5');
			
			// Go back through all steps
			await goBack(page); // To Step 4
			await expect(page.locator('.step-text')).toContainText('Step 4 of 5');
			
			await goBack(page); // To Step 3
			await expect(page.locator('.step-text')).toContainText('Step 3 of 5');
			
			await goBack(page); // To Step 2
			await expect(page.locator('.step-text')).toContainText('Step 2 of 5');
			
			await goBack(page); // To Step 1
			await expect(page.locator('.step-text')).toContainText('Step 1 of 5');
			
			// Verify data is preserved
			await expect(page.locator('#bot-name')).toHaveValue(TEST_DATA.botName);
		});
	});

	test.describe('Visual Regression Screenshots', () => {
		test('should capture all steps for visual baseline', async ({ page }) => {
			await openModal(page);
			
			// Step 1
			await page.screenshot({ path: 'test-results/multi-channel-step1.png' });
			await fillStep1(page, TEST_DATA.botName);
			await page.screenshot({ path: 'test-results/multi-channel-step1-filled.png' });
			await goToNextStep(page);
			
			// Step 2
			await page.waitForTimeout(200);
			await page.screenshot({ path: 'test-results/multi-channel-step2.png' });
			await selectChannel(page, 'telegram');
			await selectChannel(page, 'discord');
			await page.screenshot({ path: 'test-results/multi-channel-step2-selected.png' });
			await goToNextStep(page);
			
			// Step 3
			await page.waitForTimeout(200);
			await page.screenshot({ path: 'test-results/multi-channel-step3.png' });
			await fillTelegramConfig(page, TEST_DATA.telegramToken);
			await fillDiscordConfig(page, TEST_DATA.discordToken);
			await page.screenshot({ path: 'test-results/multi-channel-step3-filled.png' });
			await goToNextStep(page);
			
			// Step 4
			await page.waitForTimeout(200);
			await page.screenshot({ path: 'test-results/multi-channel-step4.png' });
			await goToNextStep(page);
			
			// Step 5
			await page.waitForTimeout(200);
			await page.screenshot({ path: 'test-results/multi-channel-step5.png' });
		});
	});
});
