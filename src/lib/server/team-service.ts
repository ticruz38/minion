/**
 * Team service module
 * Handles all Redis operations for team management
 */

import Redis, { type RedisOptions } from 'ioredis';
import { botLogger } from './logger.js';
import type { Bot, Team } from '$lib/types.js';

// Child logger for team operations
const teamLog = botLogger.child('[Team]');

// Redis client singleton
let redisClient: Redis | null = null;

/**
 * Get or create Redis client with TLS support
 */
function getRedisClient(): Redis | null {
	if (redisClient) {
		return redisClient;
	}

	const redisUrl = process.env.REDIS_URL;
	if (!redisUrl) {
		teamLog.warn('REDIS_URL not set, Redis operations will be skipped');
		return null;
	}

	try {
		const url = new URL(redisUrl);
		const isTls = url.protocol === 'rediss:';

		const connectionOptions: RedisOptions = {
			host: url.hostname,
			port: parseInt(url.port, 10) || (isTls ? 443 : 6379),
			retryStrategy: (times: number) => Math.min(times * 50, 2000),
			maxRetriesPerRequest: 3,
		};

		if (url.password) {
			connectionOptions.password = decodeURIComponent(url.password);
		}

		if (url.username) {
			connectionOptions.username = decodeURIComponent(url.username);
		}

		if (isTls) {
			connectionOptions.tls = {
				servername: url.hostname,
				rejectUnauthorized: false,
			};
		}

		redisClient = new Redis(connectionOptions);
		return redisClient;
	} catch (err) {
		teamLog.error('Failed to connect to Redis', {
			error: err instanceof Error ? err.message : String(err)
		});
		return null;
	}
}

/**
 * Create a new team in Redis
 */
export async function createTeam(
	teamId: string,
	name: string,
	credits: number = 10
): Promise<Team> {
	teamLog.info('Creating new team in Redis', { teamId, name, credits });

	const redis = getRedisClient();
	if (!redis) {
		teamLog.error('Cannot create team - Redis unavailable', { teamId });
		throw new Error('Redis unavailable');
	}

	const now = new Date().toISOString();
	const team: Team = {
		team_id: teamId,
		name,
		credits,
		created_at: now,
	};

	try {
		await redis.hset(`team:${teamId}`, {
			team_id: teamId,
			name,
			credits: String(credits),
			created_at: now,
		});
		teamLog.info('Team created successfully', { teamId });
		return team;
	} catch (err) {
		teamLog.error('Failed to create team in Redis', {
			teamId,
			error: err instanceof Error ? err.message : String(err)
		});
		throw err;
	}
}

/**
 * Get team data from Redis
 * Returns default team data if not found
 */
export async function getTeam(teamId: string): Promise<Team | null> {
	teamLog.debug('Getting team from Redis', { teamId });

	const redis = getRedisClient();
	if (!redis) {
		teamLog.error('Cannot get team - Redis unavailable', { teamId });
		return null;
	}

	try {
		const data = await redis.hgetall(`team:${teamId}`);

		if (!data || Object.keys(data).length === 0) {
			// Return a default team structure if not found
			return {
				team_id: teamId,
				name: 'My Team', // Default name
				credits: 0,
				created_at: new Date().toISOString(),
			};
		}

		return {
			team_id: data.team_id || teamId,
			name: data.name || 'My Team',
			credits: parseInt(data.credits || '0', 10),
			created_at: data.created_at || new Date().toISOString(),
		};
	} catch (err) {
		teamLog.error('Failed to get team from Redis', {
			teamId,
			error: err instanceof Error ? err.message : String(err)
		});
		throw err;
	}
}

/**
 * Update team data in Redis
 */
export async function updateTeam(
	teamId: string,
	updates: Partial<Omit<Team, 'team_id'>>
): Promise<void> {
	teamLog.debug('Updating team in Redis', { teamId, updates });

	const redis = getRedisClient();
	if (!redis) {
		teamLog.error('Cannot update team - Redis unavailable', { teamId });
		return;
	}

	try {
		const updateData: Record<string, string> = {};

		if (updates.name !== undefined) updateData.name = updates.name;
		if (updates.credits !== undefined) updateData.credits = String(updates.credits);

		if (Object.keys(updateData).length > 0) {
			await redis.hset(`team:${teamId}`, updateData);
			teamLog.info('Team updated successfully', { teamId, updates: updateData });
		}
	} catch (err) {
		teamLog.error('Failed to update team in Redis', {
			teamId,
			error: err instanceof Error ? err.message : String(err)
		});
		throw err;
	}
}

/**
 * Get team credits
 */
export async function getTeamCredits(teamId: string): Promise<number> {
	const team = await getTeam(teamId);
	return team?.credits || 0;
}

/**
 * Add credits to team
 */
export async function addTeamCredits(teamId: string, amount: number): Promise<number> {
	teamLog.info('Adding credits to team', { teamId, amount });

	const redis = getRedisClient();
	if (!redis) {
		teamLog.error('Cannot add credits - Redis unavailable', { teamId });
		return 0;
	}

	try {
		// Use HINCRBY to atomically increment credits
		const newCredits = await redis.hincrby(`team:${teamId}`, 'credits', amount);
		teamLog.info('Credits added successfully', { teamId, amount, newCredits });
		return newCredits;
	} catch (err) {
		teamLog.error('Failed to add credits', {
			teamId,
			amount,
			error: err instanceof Error ? err.message : String(err)
		});
		throw err;
	}
}

/**
 * Deduct credits from team
 * Returns false if insufficient credits
 */
export async function deductTeamCredits(teamId: string, amount: number): Promise<boolean> {
	teamLog.info('Deducting credits from team', { teamId, amount });

	const redis = getRedisClient();
	if (!redis) {
		teamLog.error('Cannot deduct credits - Redis unavailable', { teamId });
		return false;
	}

	try {
		// Get current credits
		const currentCredits = await getTeamCredits(teamId);

		if (currentCredits < amount) {
			teamLog.warn('Insufficient credits', { teamId, currentCredits, requested: amount });
			return false;
		}

		// Deduct credits
		await redis.hincrby(`team:${teamId}`, 'credits', -amount);
		teamLog.info('Credits deducted successfully', { teamId, amount });
		return true;
	} catch (err) {
		teamLog.error('Failed to deduct credits', {
			teamId,
			amount,
			error: err instanceof Error ? err.message : String(err)
		});
		throw err;
	}
}

/**
 * Get team statistics
 */
export async function getTeamStats(teamId: string): Promise<{
	totalBots: number;
	runningBots: number;
	stoppedBots: number;
	errorBots: number;
}> {
	const redis = getRedisClient();
	if (!redis) {
		return { totalBots: 0, runningBots: 0, stoppedBots: 0, errorBots: 0 };
	}

	try {
		// Get all bot IDs for the team
		const botIds = await redis.smembers(`team:${teamId}:bots`);

		if (botIds.length === 0) {
			return { totalBots: 0, runningBots: 0, stoppedBots: 0, errorBots: 0 };
		}

		// Fetch all bot statuses
		const pipeline = redis.pipeline();
		for (const botId of botIds) {
			pipeline.hget(`bot:${botId}`, 'status');
		}

		const results = await pipeline.exec();

		let runningBots = 0;
		let stoppedBots = 0;
		let errorBots = 0;

		if (results) {
			for (const [err, status] of results) {
				if (err) continue;
				const botStatus = status as string;
				if (botStatus === 'running') runningBots++;
				else if (botStatus === 'stopped') stoppedBots++;
				else if (botStatus === 'error') errorBots++;
			}
		}

		return {
			totalBots: botIds.length,
			runningBots,
			stoppedBots,
			errorBots,
		};
	} catch (err) {
		teamLog.error('Failed to get team stats', {
			teamId,
			error: err instanceof Error ? err.message : String(err)
		});
		return { totalBots: 0, runningBots: 0, stoppedBots: 0, errorBots: 0 };
	}
}

/**
 * Get recent credit transactions for a team
 * Returns mock data for now - would need a separate transactions sorted set
 */
export async function getTeamTransactions(
	teamId: string,
	limit: number = 10
): Promise<Array<{
	id: string;
	bot_id: string;
	amount: number;
	type: 'add' | 'deduct';
	description: string;
	timestamp: string;
}>> {
	// This is a placeholder - in production, you'd store transactions in a sorted set
	// For now, return empty array
	return [];
}
