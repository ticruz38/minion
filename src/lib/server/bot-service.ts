/**
 * Bot service module
 * Handles all Redis operations for bot lifecycle management
 */

import Redis, { type RedisOptions } from 'ioredis';
import { botLogger } from './logger.js';

// Child loggers for specific operations
const redisLog = botLogger.child('[Redis]');
const lifecycleLog = botLogger.child('[Lifecycle]');

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
	credits?: string; // Credit balance (stored as string for Redis hash)
	credits_updated_at?: string; // Last credit update timestamp
}

/**
 * Bot configuration from the creation request
 */
export interface BotConfig {
	name: string;
	model?: string; // AI model to use (e.g., 'moonshot/kimi-k2.5')
	api_key?: string; // LLM API key (from server env, not frontend)
	memory?: string; // VM memory allocation (e.g., '2g')
	cpus?: string; // VM CPU allocation (e.g., '1')
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
	// Resource allocation (VM-level config)
	resources?: {
		memory?: string;
		cpus?: string;
		disk?: string;
	};
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
	if (redisClient) {
		redisLog.debug('Reusing existing Redis connection');
		return redisClient;
	}

	const redisUrl = process.env.REDIS_URL;
	if (!redisUrl) {
		redisLog.warn('REDIS_URL not set, Redis operations will be skipped');
		return null;
	}

	try {
		redisLog.info('Creating new Redis connection', { 
			host: new URL(redisUrl).hostname,
			tls: new URL(redisUrl).protocol === 'rediss:' 
		});

		// Parse Redis URL to extract connection details
		const url = new URL(redisUrl);
		const isTls = url.protocol === 'rediss:';

		// Build connection options
		const connectionOptions: RedisOptions = {
			host: url.hostname,
			port: parseInt(url.port, 10) || (isTls ? 443 : 6379),
			retryStrategy: (times: number) => {
				redisLog.warn(`Redis retry attempt ${times}`);
				return Math.min(times * 50, 2000);
			},
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
		
		// Set up event listeners for connection monitoring
		redisClient.on('connect', () => {
			redisLog.info('Redis connection established');
		});
		
		redisClient.on('ready', () => {
			redisLog.info('Redis client ready');
		});
		
		redisClient.on('error', (err) => {
			redisLog.error('Redis connection error', { error: err.message });
		});
		
		redisClient.on('close', () => {
			redisLog.warn('Redis connection closed');
		});
		
		redisClient.on('reconnecting', () => {
			redisLog.info('Redis reconnecting...');
		});

		return redisClient;
	} catch (err) {
		redisLog.error('Failed to connect to Redis', { 
			error: err instanceof Error ? err.message : String(err) 
		});
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
	lifecycleLog.info('Registering bot', { botId, vmId, teamId, profiles });
	
	const redis = getRedisClient();
	if (!redis) {
		lifecycleLog.error('Cannot register bot - Redis unavailable', { botId });
		return;
	}

	const now = new Date().toISOString();

	try {
		// Store bot data as hash
		redisLog.debug('Storing bot hash', { 
			key: `bot:${botId}`,
			botId, 
			vmId, 
			teamId,
			status: 'running'
		});
		
		await redis.hset(`bot:${botId}`, {
			bot_id: botId,
			vm_id: vmId,
			team_id: teamId,
			status: 'running',
			profiles: JSON.stringify(profiles),
			config: JSON.stringify(config),
			created_at: now,
			credits: '0',
			credits_updated_at: now,
		});

		// Add bot ID to team's bot set
		redisLog.debug('Adding bot to team set', { 
			key: `team:${teamId}:bots`,
			botId, 
			teamId 
		});
		
		await redis.sadd(`team:${teamId}:bots`, botId);

		lifecycleLog.info('Bot registered successfully', { 
			botId, 
			teamId, 
			vmId,
			configSummary: {
				name: config.name,
				model: config.model,
				hasApiKey: !!config.api_key,
				channels: Object.keys(config.channels)
			}
		});
	} catch (err) {
		lifecycleLog.error('Failed to register bot', { 
			botId, 
			error: err instanceof Error ? err.message : String(err) 
		});
		throw err;
	}
}

/**
 * Get a bot by ID from Redis
 * @param botId - Bot ID to look up
 * @returns Bot object or null if not found
 */
export async function getBot(botId: string): Promise<Bot | null> {
	redisLog.debug('Getting bot from Redis', { botId, key: `bot:${botId}` });
	
	const redis = getRedisClient();
	if (!redis) {
		redisLog.error('Cannot get bot - Redis unavailable', { botId });
		return null;
	}

	try {
		const data = await redis.hgetall(`bot:${botId}`);

		// If no data returned, bot doesn't exist
		if (!data || Object.keys(data).length === 0) {
			redisLog.debug('Bot not found in Redis', { botId });
			return null;
		}

		redisLog.debug('Bot retrieved from Redis', { 
			botId, 
			status: data.status,
			vmId: data.vm_id 
		});

		return data as unknown as Bot;
	} catch (err) {
		redisLog.error('Failed to get bot from Redis', { 
			botId, 
			error: err instanceof Error ? err.message : String(err) 
		});
		throw err;
	}
}

/**
 * Get all bots for a team from Redis
 * Uses SMEMBERS to get bot IDs, then pipelined HGETALL for efficient fetching
 * @param teamId - Team ID to look up
 * @returns Array of bot objects
 */
export async function getTeamBots(teamId: string): Promise<Bot[]> {
	redisLog.debug('Getting team bots from Redis', { teamId, key: `team:${teamId}:bots` });
	
	const redis = getRedisClient();
	if (!redis) {
		redisLog.error('Cannot get team bots - Redis unavailable', { teamId });
		return [];
	}

	try {
		// Get all bot IDs for the team
		const botIds = await redis.smembers(`team:${teamId}:bots`);
		redisLog.debug('Retrieved bot IDs for team', { teamId, count: botIds.length });

		if (botIds.length === 0) {
			return [];
		}

		// Fetch all bot data using pipelined HGETALL
		redisLog.debug('Fetching bot details via pipeline', { teamId, botCount: botIds.length });
		
		const pipeline = redis.pipeline();
		for (const botId of botIds) {
			pipeline.hgetall(`bot:${botId}`);
		}
		const results = await pipeline.exec();

		if (!results) {
			redisLog.warn('Pipeline returned no results', { teamId });
			return [];
		}

		const bots: Bot[] = [];
		let errorCount = 0;
		
		for (const [err, data] of results) {
			if (err) {
				errorCount++;
				continue;
			}
			if (!data) continue;
			
			const botData = data as Record<string, string>;
			if (Object.keys(botData).length > 0) {
				bots.push(botData as unknown as Bot);
			}
		}

		redisLog.info('Retrieved team bots', { 
			teamId, 
			requested: botIds.length,
			retrieved: bots.length,
			errors: errorCount 
		});

		return bots;
	} catch (err) {
		redisLog.error('Failed to get team bots', { 
			teamId, 
			error: err instanceof Error ? err.message : String(err) 
		});
		throw err;
	}
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
	lifecycleLog.info('Updating bot status', { botId, newStatus: status });
	
	const redis = getRedisClient();
	if (!redis) {
		lifecycleLog.error('Cannot update bot status - Redis unavailable', { botId, status });
		return;
	}

	try {
		redisLog.debug('Updating bot status in Redis', { 
			key: `bot:${botId}`,
			botId, 
			status 
		});
		
		await redis.hset(`bot:${botId}`, 'status', status);
		
		lifecycleLog.info('Bot status updated successfully', { botId, status });
	} catch (err) {
		lifecycleLog.error('Failed to update bot status', { 
			botId, 
			status,
			error: err instanceof Error ? err.message : String(err) 
		});
		throw err;
	}
}

/**
 * Get bot credits from Redis
 * @param botId - Bot ID to look up
 * @returns Credit balance (default 0 if not set)
 */
export async function getBotCredits(botId: string): Promise<number> {
	redisLog.debug('Getting bot credits', { botId });
	
	const redis = getRedisClient();
	if (!redis) {
		redisLog.error('Cannot get bot credits - Redis unavailable', { botId });
		return 0;
	}

	try {
		const credits = await redis.hget(`bot:${botId}`, 'credits');
		return parseInt(credits || '0', 10);
	} catch (err) {
		redisLog.error('Failed to get bot credits', { 
			botId, 
			error: err instanceof Error ? err.message : String(err) 
		});
		return 0;
	}
}

/**
 * Add credits to a bot (atomic operation)
 * @param botId - Bot ID to update
 * @param amount - Amount to add (positive integer)
 * @returns New credit balance
 */
export async function addBotCredits(botId: string, amount: number): Promise<number> {
	lifecycleLog.info('Adding credits to bot', { botId, amount });
	
	const redis = getRedisClient();
	if (!redis) {
		lifecycleLog.error('Cannot add bot credits - Redis unavailable', { botId });
		return 0;
	}

	try {
		// Use HINCRBY for atomic increment
		const newCredits = await redis.hincrby(`bot:${botId}`, 'credits', amount);
		await redis.hset(`bot:${botId}`, 'credits_updated_at', new Date().toISOString());
		
		lifecycleLog.info('Bot credits added successfully', { botId, amount, newCredits });
		return newCredits;
	} catch (err) {
		lifecycleLog.error('Failed to add bot credits', { 
			botId, 
			amount,
			error: err instanceof Error ? err.message : String(err) 
		});
		throw err;
	}
}

/**
 * Deduct credits from a bot (atomic operation)
 * @param botId - Bot ID to update
 * @param amount - Amount to deduct (positive integer)
 * @returns New credit balance, or null if insufficient credits
 */
export async function deductBotCredits(botId: string, amount: number): Promise<number | null> {
	lifecycleLog.info('Deducting credits from bot', { botId, amount });
	
	const redis = getRedisClient();
	if (!redis) {
		lifecycleLog.error('Cannot deduct bot credits - Redis unavailable', { botId });
		return null;
	}

	try {
		// Get current credits first
		const currentCredits = await getBotCredits(botId);
		
		if (currentCredits < amount) {
			lifecycleLog.warn('Insufficient bot credits', { 
				botId, 
				currentCredits, 
				requested: amount 
			});
			return null;
		}

		// Use HINCRBY with negative value for atomic decrement
		const newCredits = await redis.hincrby(`bot:${botId}`, 'credits', -amount);
		await redis.hset(`bot:${botId}`, 'credits_updated_at', new Date().toISOString());
		
		lifecycleLog.info('Bot credits deducted successfully', { botId, amount, newCredits });
		return newCredits;
	} catch (err) {
		lifecycleLog.error('Failed to deduct bot credits', { 
			botId, 
			amount,
			error: err instanceof Error ? err.message : String(err) 
		});
		throw err;
	}
}

/**
 * Delete a bot from Redis
 * Removes bot from team's bot set and deletes bot hash
 * @param botId - Bot ID to delete
 * @param teamId - Team ID that owns the bot
 */
export async function deleteBot(botId: string, teamId: string): Promise<void> {
	lifecycleLog.info('Deleting bot', { botId, teamId });
	
	const redis = getRedisClient();
	if (!redis) {
		lifecycleLog.error('Cannot delete bot - Redis unavailable', { botId, teamId });
		return;
	}

	try {
		// Remove bot from team's set
		redisLog.debug('Removing bot from team set', { 
			key: `team:${teamId}:bots`,
			botId, 
			teamId 
		});
		await redis.srem(`team:${teamId}:bots`, botId);

		// Delete bot hash
		redisLog.debug('Deleting bot hash', { 
			key: `bot:${botId}`,
			botId 
		});
		await redis.del(`bot:${botId}`);

		lifecycleLog.info('Bot deleted successfully', { botId, teamId });
	} catch (err) {
		lifecycleLog.error('Failed to delete bot', { 
			botId, 
			teamId,
			error: err instanceof Error ? err.message : String(err) 
		});
		throw err;
	}
}

/**
 * Send a command to a VM's queue
 * Uses LPUSH to add command to vm:{vm_id}:queue
 * @param vmId - VM ID to send command to
 * @param command - Command object to send
 */
export async function sendCommand(vmId: string, command: BotCommand): Promise<void> {
	lifecycleLog.info('Sending command to VM queue', { 
		vmId, 
		commandType: command.type,
		botId: command.bot_id 
	});
	
	const redis = getRedisClient();
	if (!redis) {
		lifecycleLog.error('Cannot send command - Redis unavailable', { 
			vmId, 
			commandType: command.type,
			botId: command.bot_id 
		});
		return;
	}

	try {
		const queueKey = `vm:${vmId}:queue`;
		const commandJson = JSON.stringify(command);
		
		redisLog.debug('Pushing command to VM queue', { 
			key: queueKey,
			vmId,
			commandType: command.type,
			botId: command.bot_id,
			commandSize: commandJson.length 
		});
		
		await redis.lpush(queueKey, commandJson);
		
		lifecycleLog.info('Command sent successfully', { 
			vmId, 
			commandType: command.type,
			botId: command.bot_id,
			queueKey
		});
	} catch (err) {
		lifecycleLog.error('Failed to send command', { 
			vmId, 
			commandType: command.type,
			botId: command.bot_id,
			error: err instanceof Error ? err.message : String(err) 
		});
		throw err;
	}
}
