import { json, type RequestHandler } from '@sveltejs/kit';
import { getBot } from '$lib/server/bot-service.js';

/**
 * GET /api/bots/[id]
 * 
 * Get details for a specific bot by ID.
 * Called when user wants to view a single bot's details.
 * 
 * Path params: id - Bot ID (e.g., bot_abc123xyz)
 * 
 * Response: HTTP 200 OK
 * {
 *   success: boolean;
 *   bot: Bot;              // Bot object with all Redis fields
 * }
 * 
 * Error: HTTP 404 (bot not found)
 */
export const GET: RequestHandler = async ({ params }) => {
	try {
		// Extract bot ID from path parameters
		const botId = params.id;

		if (!botId) {
			return json({
				success: false,
				message: 'Bot ID is required'
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

		console.log(`[Bot Get] Retrieved bot ${botId}`);

		// Return bot object with all fields
		return json({
			success: true,
			bot
		}, { status: 200 });

	} catch (err) {
		console.error('[Bot Get Error]', err);

		return json({
			success: false,
			message: err instanceof Error ? err.message : 'Failed to retrieve bot'
		}, { status: 500 });
	}
};
