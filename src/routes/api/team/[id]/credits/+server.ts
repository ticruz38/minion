import { json, type RequestHandler } from '@sveltejs/kit';
import { addTeamCredits, getTeamCredits } from '$lib/server/team-service.js';
import { apiLogger } from '$lib/server/logger.js';

/**
 * POST /api/team/[id]/credits
 * 
 * Add credits to a team.
 * Called when user wants to add credits to their team account.
 * 
 * Path params: id - Team ID
 * Body: { amount: number } - Amount must be positive integer
 * 
 * Response: HTTP 200 OK
 * {
 *   success: boolean;
 *   message: string;
 *   team_id: string;
 *   amount: number;
 *   new_balance: number;
 * }
 * 
 * Error: HTTP 400 (invalid amount)
 */
export const POST: RequestHandler = async ({ params, request }) => {
	const requestId = crypto.randomUUID().slice(0, 8);
	apiLogger.info('[POST /api/team/[id]/credits] Add credits', { requestId });

	try {
		const teamId = params.id;

		if (!teamId) {
			apiLogger.warn('Missing team ID', { requestId });
			return json({
				success: false,
				message: 'Team ID is required'
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

		// Add credits to team
		const newBalance = await addTeamCredits(teamId, amount);

		apiLogger.info('Credits added to team', { 
			requestId, 
			teamId, 
			amount,
			newBalance 
		});

		return json({
			success: true,
			message: `Added ${amount} credits to team`,
			team_id: teamId,
			amount,
			new_balance: newBalance
		}, { status: 200 });

	} catch (err) {
		apiLogger.error('Failed to add credits', { 
			requestId, 
			error: err instanceof Error ? err.message : String(err) 
		});

		return json({
			success: false,
			message: err instanceof Error ? err.message : 'Failed to add credits'
		}, { status: 500 });
	}
};

/**
 * GET /api/team/[id]/credits
 * 
 * Get current credit balance for a team.
 * 
 * Path params: id - Team ID
 * 
 * Response: HTTP 200 OK
 * {
 *   success: boolean;
 *   team_id: string;
 *   credits: number;
 * }
 */
export const GET: RequestHandler = async ({ params }) => {
	const requestId = crypto.randomUUID().slice(0, 8);
	apiLogger.info('[GET /api/team/[id]/credits] Get credits', { requestId });

	try {
		const teamId = params.id;

		if (!teamId) {
			return json({
				success: false,
				message: 'Team ID is required'
			}, { status: 400 });
		}

		const credits = await getTeamCredits(teamId);

		return json({
			success: true,
			team_id: teamId,
			credits
		}, { status: 200 });

	} catch (err) {
		apiLogger.error('Failed to get credits', { 
			requestId, 
			error: err instanceof Error ? err.message : String(err) 
		});

		return json({
			success: false,
			message: err instanceof Error ? err.message : 'Failed to get credits'
		}, { status: 500 });
	}
};
