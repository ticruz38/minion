import { json, type RequestHandler } from '@sveltejs/kit';
import { getTeamBots } from '$lib/server/bot-service.js';
import { getTeam, getTeamStats } from '$lib/server/team-service.js';
import { apiLogger } from '$lib/server/logger.js';

/**
 * GET /api/team/[id]
 * 
 * Get complete team dashboard data including:
 * - Team info (name, credits)
 * - All bots with parsed details
 * - Team statistics
 * 
 * Path params: id - Team ID
 * 
 * Response: HTTP 200 OK
 * {
 *   success: boolean;
 *   team: {
 *     team_id: string;
 *     name: string;
 *     credits: number;
 *   };
 *   bots: ParsedBot[];
 *   stats: {
 *     totalBots: number;
 *     runningBots: number;
 *     stoppedBots: number;
 *     errorBots: number;
 *   };
 * }
 */
export const GET: RequestHandler = async ({ params }) => {
	const requestId = crypto.randomUUID().slice(0, 8);
	apiLogger.info('[GET /api/team/[id]] Team dashboard request', { requestId });

	try {
		const teamId = params.id;

		if (!teamId) {
			apiLogger.warn('Missing team ID', { requestId });
			return json({
				success: false,
				message: 'Team ID is required'
			}, { status: 400 });
		}

		apiLogger.debug('Fetching team data', { requestId, teamId });

		// Fetch team data, bots, and stats in parallel
		const [team, bots, stats] = await Promise.all([
			getTeam(teamId),
			getTeamBots(teamId),
			getTeamStats(teamId)
		]);

		// Parse bot configs for frontend
		const parsedBots = bots.map(bot => {
			try {
				const config = JSON.parse(bot.config);
				const profiles = JSON.parse(bot.profiles);
				
				return {
					...bot,
					config,
					profiles,
					// Add computed fields for easier frontend display
					hasTelegram: !!config.channels?.telegram,
					hasDiscord: !!config.channels?.discord,
					hasWhatsApp: !!config.channels?.whatsapp,
					displayName: config.name || bot.bot_id,
					minionType: profiles[0] || 'unknown',
				};
			} catch (err) {
				apiLogger.warn('Failed to parse bot config', { 
					requestId, 
					botId: bot.bot_id,
					error: err instanceof Error ? err.message : String(err)
				});
				return {
					...bot,
					config: { name: 'Unknown', channels: {} },
					profiles: [],
					hasTelegram: false,
					hasDiscord: false,
					hasWhatsApp: false,
					displayName: bot.bot_id,
					minionType: 'unknown',
				};
			}
		});

		apiLogger.info('Team dashboard data retrieved', { 
			requestId, 
			teamId, 
			botCount: bots.length 
		});

		return json({
			success: true,
			team: {
				team_id: team?.team_id || teamId,
				name: team?.name || 'My Team',
				credits: team?.credits || 0,
			},
			bots: parsedBots,
			stats
		}, { status: 200 });

	} catch (err) {
		apiLogger.error('Failed to retrieve team data', { 
			requestId, 
			error: err instanceof Error ? err.message : String(err) 
		});

		return json({
			success: false,
			message: err instanceof Error ? err.message : 'Failed to retrieve team data'
		}, { status: 500 });
	}
};

/**
 * PATCH /api/team/[id]
 * 
 * Update team settings (name, etc.)
 * Does NOT handle credits - use /api/team/[id]/credits for that
 * 
 * Body: { name?: string }
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
	const requestId = crypto.randomUUID().slice(0, 8);
	apiLogger.info('[PATCH /api/team/[id]] Update team', { requestId });

	try {
		const teamId = params.id;

		if (!teamId) {
			return json({
				success: false,
				message: 'Team ID is required'
			}, { status: 400 });
		}

		const body = await request.json();

		// Validate updates
		if (body.name !== undefined && (typeof body.name !== 'string' || body.name.length < 1)) {
			return json({
				success: false,
				message: 'Name must be a non-empty string'
			}, { status: 400 });
		}

		// Import updateTeam dynamically to avoid circular dependency
		const { updateTeam } = await import('$lib/server/team-service.js');
		await updateTeam(teamId, { name: body.name });

		apiLogger.info('Team updated', { requestId, teamId });

		return json({
			success: true,
			message: 'Team updated successfully'
		}, { status: 200 });

	} catch (err) {
		apiLogger.error('Failed to update team', { 
			requestId, 
			error: err instanceof Error ? err.message : String(err) 
		});

		return json({
			success: false,
			message: err instanceof Error ? err.message : 'Failed to update team'
		}, { status: 500 });
	}
};
