import { json, type RequestHandler } from '@sveltejs/kit';
import { getBot, sendCommand, type BotConfig } from '$lib/server/bot-service.js';

/**
 * POST /api/bots/[id]/credits
 * 
 * Add credits to a bot for billing.
 * Called when user wants to add credits to their bot.
 * 
 * Path params: id - Bot ID (e.g., bot_abc123xyz)
 * Body: { amount: number } - Amount must be positive integer
 * 
 * Response: HTTP 200 OK
 * {
 *   success: boolean;
 *   message: string;
 *   bot_id: string;
 *   amount: number;
 * }
 * 
 * Error: HTTP 400 (invalid amount), HTTP 404 (bot not found)
 */
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		// Extract bot ID from path parameters
		const botId = params.id;

		if (!botId) {
			return json({
				success: false,
				message: 'Bot ID is required'
			}, { status: 400 });
		}

		// Parse and validate request body
		let body: { amount?: number };
		try {
			body = await request.json();
		} catch {
			return json({
				success: false,
				message: 'Invalid JSON body'
			}, { status: 400 });
		}

		// Validate amount - must be a positive integer
		const amount = body.amount;
		if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
			return json({
				success: false,
				message: 'Amount must be a positive integer'
			}, { status: 400 });
		}

		// Get bot from Redis
		const bot = await getBot(botId);

		// Return 404 if bot not found
		if (!bot) {
			return json({
				success: false,
				message: `Bot not found: ${botId}`
			}, { status: 404 });
		}

		// Parse profiles and config for the command payload
		const profiles = JSON.parse(bot.profiles) as string[];
		const config = JSON.parse(bot.config) as BotConfig;

		// Send CREDIT_ADD command to VM queue with amount
		await sendCommand(bot.vm_id, {
			type: 'CREDIT_ADD',
			bot_id: botId,
			team_id: bot.team_id,
			profiles,
			config,
			amount
		});

		console.log(`[Bot Credits] Added ${amount} credits to bot ${botId} on VM ${bot.vm_id}`);

		return json({
			success: true,
			message: `Added ${amount} credits to bot ${botId}`,
			bot_id: botId,
			amount
		}, { status: 200 });

	} catch (err) {
		console.error('[Bot Credits Error]', err);

		return json({
			success: false,
			message: err instanceof Error ? err.message : 'Failed to add credits'
		}, { status: 500 });
	}
};
