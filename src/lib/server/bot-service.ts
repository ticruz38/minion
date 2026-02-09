/**
 * Bot service module
 * Handles all Redis operations for bot lifecycle management
 */

import Redis, { type RedisOptions } from 'ioredis';

/**
 * Bot data structure as stored in Redis
 */
export interface Bot {
	bot_id: string;
	vm_id: string;
	team_id: string;
	status: 'running' | 'stopped' | 'error' | string;
	profiles: string; // JSON string of profiles array
	config: string; // JSON string of bot configuration
	created_at: string; // ISO timestamp
}

/**
 * Bot configuration from the creation request
 */
export interface BotConfig {
	name: string;
	channels: {
		telegram?: {
			enabled: true;
			token: string;
			dmPolicy: 'pairing' | 'allowlist' | 'open';
			allowedUsers?: string[];
		};
		discord?: {
			enabled: true;
			token: string;
			dmPolicy: 'pairing' | 'allowlist' | 'open';
			allowedUsers?: string[];
		};
		whatsapp?: {
			enabled: true;
			phoneNumber: string;
			apiKey: string;
			webhookUrl?: string;
			dmPolicy: 'pairing' | 'allowlist' | 'open';
			allowedUsers?: string[];
		};
	};
}

/**
 * Command types for bot lifecycle management
 */
export type BotCommandType = 'CREATE' | 'START' | 'STOP' | 'DELETE' | 'CREDIT_ADD';

/**
 * Command payload sent to VM queues
 */
export interface BotCommand {
	type: BotCommandType;
	bot_id: string;
	team_id: string;
	profiles: string[];
	config: BotConfig;
	// For CREDIT_ADD command
	amount?: number;
}

// Redis client singleton for bot service
let redisClient: Redis | null = null;

/**
 * Get or create Redis client with TLS support
 * Reuses connection logic pattern from redis.ts and scheduler.ts
 */
function getRedisClient(): Redis | null {
	if (redisClient) return redisClient;

	const redisUrl = process.env.REDIS_URL;
	if (!redisUrl) {
		console.warn('[BotService] REDIS_URL not set, Redis operations will be skipped');
		return null;
	}

	try {
		// Parse Redis URL to extract connection details
		const url = new URL(redisUrl);
		const isTls = url.protocol === 'rediss:';

		// Build connection options
		const connectionOptions: RedisOptions = {
			host: url.hostname,
			port: parseInt(url.port, 10) || (isTls ? 443 : 6379),
			retryStrategy: (times: number) => Math.min(times * 50, 2000),
			maxRetriesPerRequest: 3,
		};

		// Only set password if present
		if (url.password) {
			connectionOptions.password = decodeURIComponent(url.password);
		}

		// Only set username if present (ACL style auth)
		if (url.username) {
			connectionOptions.username = decodeURIComponent(url.username);
		}

		// Add TLS options for rediss:// connections
		if (isTls) {
			connectionOptions.tls = {
				servername: url.hostname,
				rejectUnauthorized: false, // Allow self-signed certificates
			};
		}

		redisClient = new Redis(connectionOptions);
		return redisClient;
	} catch (err) {
		console.error('[BotService] Failed to connect to Redis:', err);
		return null;
	}
}

/**
 * Register a new bot in Redis
 * Stores bot data as hash and adds bot ID to team's bot set
 * @param botId - Unique bot ID (bot_{nanoid(10)})
 * @param vmId - VM ID where bot will run
 * @param teamId - Team ID that owns the bot
 * @param profiles - Array of profile IDs (minion types)
 * @param config - Bot configuration object
 */
export async function registerBot(
	botId: string,
	vmId: string,
	teamId: string,
	profiles: string[],
	config: BotConfig
): Promise<void> {
	const redis = getRedisClient();
	if (!redis) {
		console.warn('[BotService] No Redis client available, skipping bot registration');
		return;
	}

	const now = new Date().toISOString();

	// Store bot data as hash
	await redis.hset(`bot:${botId}`, {
		bot_id: botId,
		vm_id: vmId,
		team_id: teamId,
		status: 'running',
		profiles: JSON.stringify(profiles),
		config: JSON.stringify(config),
		created_at: now,
	});

	// Add bot ID to team's bot set
	await redis.sadd(`team:${teamId}:bots`, botId);

	console.log(`[BotService] Registered bot ${botId} for team ${teamId} on VM ${vmId}`);
}

/**
 * Get a bot by ID from Redis
 * @param botId - Bot ID to look up
 * @returns Bot object or null if not found
 */
export async function getBot(botId: string): Promise<Bot | null> {
	const redis = getRedisClient();
	if (!redis) {
		console.warn('[BotService] No Redis client available');
		return null;
	}

	const data = await redis.hgetall(`bot:${botId}`);

	// If no data returned, bot doesn't exist
	if (!data || Object.keys(data).length === 0) {
		return null;
	}

	return data as unknown as Bot;
}

/**
 * Get all bots for a team from Redis
 * Uses SMEMBERS to get bot IDs, then pipelined HGETALL for efficient fetching
 * @param teamId - Team ID to look up
 * @returns Array of bot objects
 */
export async function getTeamBots(teamId: string): Promise<Bot[]> {
	const redis = getRedisClient();
	if (!redis) {
		console.warn('[BotService] No Redis client available');
		return [];
	}

	// Get all bot IDs for the team
	const botIds = await redis.smembers(`team:${teamId}:bots`);

	if (botIds.length === 0) {
		return [];
	}

	// Fetch all bot data using pipelined HGETALL
	const pipeline = redis.pipeline();
	for (const botId of botIds) {
		pipeline.hgetall(`bot:${botId}`);
	}
	const results = await pipeline.exec();

	if (!results) {
		return [];
	}

	const bots: Bot[] = [];
	for (const [err, data] of results) {
		if (err || !data) continue;
		const botData = data as Record<string, string>;
		if (Object.keys(botData).length > 0) {
			bots.push(botData as unknown as Bot);
		}
	}

	return bots;
}

/**
 * Update a bot's status in Redis
 * @param botId - Bot ID to update
 * @param status - New status ('running', 'stopped', 'error', etc.)
 */
export async function updateBotStatus(
	botId: string,
	status: string
): Promise<void> {
	const redis = getRedisClient();
	if (!redis) {
		console.warn('[BotService] No Redis client available');
		return;
	}

	await redis.hset(`bot:${botId}`, 'status', status);
	console.log(`[BotService] Updated bot ${botId} status to ${status}`);
}

/**
 * Delete a bot from Redis
 * Removes bot from team's bot set and deletes bot hash
 * @param botId - Bot ID to delete
 * @param teamId - Team ID that owns the bot
 */
export async function deleteBot(botId: string, teamId: string): Promise<void> {
	const redis = getRedisClient();
	if (!redis) {
		console.warn('[BotService] No Redis client available');
		return;
	}

	// Remove bot from team's set
	await redis.srem(`team:${teamId}:bots`, botId);

	// Delete bot hash
	await redis.del(`bot:${botId}`);

	console.log(`[BotService] Deleted bot ${botId} from team ${teamId}`);
}

/**
 * Send a command to a VM's queue
 * Uses LPUSH to add command to vm:{vm_id}:queue
 * @param vmId - VM ID to send command to
 * @param command - Command object to send
 */
export async function sendCommand(vmId: string, command: BotCommand): Promise<void> {
	const redis = getRedisClient();
	if (!redis) {
		console.warn('[BotService] No Redis client available');
		return;
	}

	await redis.lpush(`vm:${vmId}:queue`, JSON.stringify(command));
	console.log(`[BotService] Sent ${command.type} command to VM ${vmId} queue`);
}
