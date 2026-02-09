import { json, type RequestHandler } from '@sveltejs/kit';
import { getBot, sendCommand, deleteBot, type BotConfig } from '$lib/server/bot-service.js';

/**
 * POST /api/bots/[id]/delete
 * 
 * Permanently delete a bot by sending DELETE command to its VM
 * and removing it from Redis.
 * 
 * Path params: id - Bot ID (e.g., bot_abc123xyz)
 * 
 * Response: HTTP 200 OK
 * {
 *   success: boolean;
 *   message: string;
 *   bot_id: string;
 * }
 * 
 * Error: HTTP 404 (bot not found)
 */
export const POST: RequestHandler = async ({ params }) => {
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

		// Parse profiles and config for the command payload
		const profiles = JSON.parse(bot.profiles) as string[];
		const config = JSON.parse(bot.config) as BotConfig;

		// Send DELETE command to VM queue
		await sendCommand(bot.vm_id, {
			type: 'DELETE',
			bot_id: botId,
			team_id: bot.team_id,
			profiles,
			config
		});

		// Remove bot from Redis
		await deleteBot(botId, bot.team_id);

		console.log(`[Bot Delete] Deleted bot ${botId} from VM ${bot.vm_id}`);

		return json({
			success: true,
			message: `Bot ${botId} deleted successfully`,
			bot_id: botId
		}, { status: 200 });

	} catch (err) {
		console.error('[Bot Delete Error]', err);

		return json({
			success: false,
			message: err instanceof Error ? err.message : 'Failed to delete bot'
		}, { status: 500 });
	}
};
