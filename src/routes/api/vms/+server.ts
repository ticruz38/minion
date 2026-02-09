import { json, type RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import Redis, { type RedisOptions } from 'ioredis';
import { getHealthyVms, selectBestVm, type VMWithHealth } from '$lib/server/scheduler.js';
import { registerBot, sendCommand, type BotConfig, type BotCommand } from '$lib/server/bot-service.js';


/**
 * DM Policy types for channel security configuration
 */
type DMPolicy = 'pairing' | 'allowlist' | 'open';

/**
 * Channel configuration types
 */
interface TelegramChannel {
	enabled: true;
	token: string;
	dmPolicy: DMPolicy;
	allowedUsers?: string[];
}

interface DiscordChannel {
	enabled: true;
	token: string;
	dmPolicy: DMPolicy;
	allowedUsers?: string[];
}

interface WhatsAppChannel {
	enabled: true;
	phoneNumber: string;
	apiKey: string;
	webhookUrl?: string;
	dmPolicy: DMPolicy;
	allowedUsers?: string[];
}

interface ChannelsConfig {
	telegram?: TelegramChannel;
	discord?: DiscordChannel;
	whatsapp?: WhatsAppChannel;
}

/**
 * VM Creation Request Schema
 * Validates the user-provided fields for VM creation with multi-channel support
 */

// Telegram token format: digits:alphanumeric (e.g., 123456789:ABCdefGHIjklMNOpqrsTUVwxyz)
const telegramTokenRegex = /^\d+:[a-zA-Z0-9_-]+$/;

// Discord token format: alphanumeric with dots and underscores
const discordTokenRegex = /^[a-zA-Z0-9_.-]+$/;

// E.164 phone number format
const phoneNumberRegex = /^\+[1-9]\d{1,14}$/;

// Telegram channel schema
const telegramSchema = z.object({
	enabled: z.literal(true),
	token: z.string()
		.regex(telegramTokenRegex, 'Invalid Telegram token format. Expected: numbers:letters'),
	dmPolicy: z.enum(['pairing', 'allowlist', 'open'])
		.default('pairing'),
	allowedUsers: z.array(z.string()).optional()
});

// Discord channel schema
const discordSchema = z.object({
	enabled: z.literal(true),
	token: z.string()
		.min(1, 'Discord bot token is required')
		.regex(discordTokenRegex, 'Invalid Discord token format'),
	dmPolicy: z.enum(['pairing', 'allowlist', 'open'])
		.default('pairing'),
	allowedUsers: z.array(z.string()).optional()
});

// WhatsApp channel schema
const whatsappSchema = z.object({
	enabled: z.literal(true),
	phoneNumber: z.string()
		.regex(phoneNumberRegex, 'Phone number must be in E.164 format (e.g., +1234567890)'),
	apiKey: z.string()
		.min(1, 'WhatsApp API key is required'),
	webhookUrl: z.string()
		.url('Invalid webhook URL')
		.optional(),
	dmPolicy: z.enum(['pairing', 'allowlist', 'open'])
		.default('pairing'),
	allowedUsers: z.array(z.string()).optional()
});

// Channels schema - at least one channel must be enabled
const channelsSchema = z.object({
	telegram: telegramSchema.optional(),
	discord: discordSchema.optional(),
	whatsapp: whatsappSchema.optional()
}).refine(
	(channels) => {
		// Check if at least one channel is enabled
		return Object.values(channels).some(channel => channel?.enabled === true);
	},
	{
		message: 'At least one messaging channel must be configured',
		path: ['channels']
	}
);

const vmCreationSchema = z.object({
	// UUID v4 for Redis correlation ID (required for multi-channel)
	id: z.string()
		.uuid('Invalid command ID format. Expected UUID v4'),
	name: z.string()
		.min(3, 'Name must be at least 3 characters')
		.max(30, 'Name must be at most 30 characters')
		.regex(/^[a-zA-Z0-9-]+$/, 'Name must be alphanumeric with hyphens only'),
	// Legacy: single channel support (deprecated, use channels instead)
	token: z.string()
		.regex(telegramTokenRegex, 'Invalid token format')
		.optional(),
	passcode: z.string()
		.min(4)
		.max(20)
		.optional(),
	// New: multi-channel support with detailed configuration
	channels: channelsSchema.optional(),
	minionId: z.string()
		.min(1, 'Minion ID is required')
});

type VMCreationRequest = z.infer<typeof vmCreationSchema>;

/**
 * Redis client singleton
 * Uses environment variables for connection
 */
let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
	if (redisClient) return redisClient;
	
	const redisUrl = process.env.REDIS_URL;
	if (!redisUrl) {
		console.warn('[VM Creation] REDIS_URL not set, Redis publishing will be skipped');
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
		console.error('[VM Creation] Failed to connect to Redis:', err);
		return null;
	}
}

/**
 * Build the Redis payload for VM creation with multi-channel configuration
 */
function buildRedisPayload(request: VMCreationRequest, commandId: string): Record<string, unknown> {
	// Support both legacy (token) and new (channels) formats
	let channels: ChannelsConfig;
	
	if (request.channels) {
		// Use new multi-channel format
		channels = request.channels as ChannelsConfig;
	} else if (request.token) {
		// Legacy format: convert to channels
		channels = {
			telegram: {
				enabled: true,
				token: request.token,
				dmPolicy: 'pairing'
			}
		};
	} else {
		// This shouldn't happen due to validation, but handle gracefully
		throw new Error('No channel configuration provided');
	}
	
	return {
		id: commandId,
		timestamp: new Date().toISOString(),
		type: 'CREATE',
		clientId: 'default',  // TODO: Get from session
		payload: {
			name: request.name,
			model: 'moonshot/kimi-k2.5',
			ram: 4,
			cpus: 2,
			disk: 20,
			profiles: [request.minionId],
			channels
		}
	};
}

/**
 * Build the bot configuration from the VM creation request
 */
function buildBotConfigFromVmRequest(request: VMCreationRequest): BotConfig {
	// Support both legacy (token) and new (channels) formats
	let channels: ChannelsConfig;
	
	if (request.channels) {
		channels = request.channels as ChannelsConfig;
	} else if (request.token) {
		channels = {
			telegram: {
				enabled: true,
				token: request.token,
				dmPolicy: 'pairing'
			}
		};
	} else {
		throw new Error('No channel configuration provided');
	}
	
	return {
		name: request.name,
		channels
	};
}

/**
 * Build the CREATE command payload per Redis Protocol
 */
function buildCreateCommand(
	botId: string,
	teamId: string,
	profiles: string[],
	config: BotConfig
): BotCommand {
	return {
		type: 'CREATE',
		bot_id: botId,
		team_id: teamId,
		profiles,
		config
	};
}

/**
 * POST /api/vms
 * 
 * ⚠️ DEPRECATED: Use POST /api/bots instead
 * 
 * This endpoint is kept for backward compatibility.
 * It now forwards to the new bot creation logic.
 * 
 * Request body: {
 *   id: string;            // Required: UUID v4 for Redis subscription correlation
 *   name: string;          // 3-30 chars, alphanumeric + hyphens
 *   token?: string;        // Telegram bot token (legacy - deprecated)
 *   passcode?: string;     // Legacy passcode (deprecated)
 *   channels?: {           // New: multi-channel config (required if no legacy token)
 *     telegram?: { enabled: true, token: string, dmPolicy: 'pairing'|'allowlist'|'open', allowedUsers?: string[] }
 *     discord?: { enabled: true, token: string, dmPolicy: 'pairing'|'allowlist'|'open', allowedUsers?: string[] }
 *     whatsapp?: { enabled: true, phoneNumber: string, apiKey: string, webhookUrl?: string, dmPolicy: 'pairing'|'allowlist'|'open', allowedUsers?: string[] }
 *   }
 *   minionId: string;      // Selected minion type
 * }
 * 
 * Response: HTTP 202 Accepted (with X-Deprecated header)
 * {
 *   success: boolean;
 *   message: string;
 *   commandId: string;     // Use this to subscribe to Redis updates via clawd:responses
 *   vm?: { name: string; minionId: string; }
 * }
 */
export const POST: RequestHandler = async ({ request }) => {
	// Log deprecation warning
	console.warn('[DEPRECATED] POST /api/vms is deprecated, use POST /api/bots');
	
	try {
		// Parse request body
		const body = await request.json();
		
		// Validate with Zod
		const validationResult = vmCreationSchema.safeParse(body);
		
		if (!validationResult.success) {
			const errors = validationResult.error.issues.map(issue => ({
				field: issue.path.join('.'),
				message: issue.message
			}));
			
			return json({
				success: false,
				message: 'Validation failed',
				errors
			}, { 
				status: 400,
				headers: { 'X-Deprecated': 'true' }
			});
		}
		
		const validatedData = validationResult.data;
		
		// Get healthy VMs and select the best one (new bot creation logic)
		const healthyVms = await getHealthyVms();
		const selectedVm = selectBestVm(healthyVms);
		
		if (!selectedVm) {
			return json({
				success: false,
				message: 'No healthy VMs available. Please try again later.'
			}, { 
				status: 503,
				headers: { 'X-Deprecated': 'true' }
			});
		}
		
		// Generate unique bot ID
		const botId = `bot_${nanoid(10)}`;
		const vmId = selectedVm.vm_id;
		
		// For deprecated endpoint, use a default team_id if not provided
		const teamId = body.team_id || 'default';
		
		// Build bot configuration
		const botConfig = buildBotConfigFromVmRequest(validatedData);
		
		// Register bot in Redis
		await registerBot(
			botId,
			vmId,
			teamId,
			[validatedData.minionId],
			botConfig
		);
		
		// Build and send CREATE command to VM queue
		const createCommand = buildCreateCommand(
			botId,
			teamId,
			[validatedData.minionId],
			botConfig
		);
		await sendCommand(vmId, createCommand);
		
		console.log(`[VM Creation - DEPRECATED] Created bot ${botId} for team ${teamId} on VM ${vmId}`);
		
		// Return HTTP 202 Accepted with deprecation header (maintaining old response format for compatibility)
		return json({
			success: true,
			message: 'VM creation request accepted for processing (deprecated endpoint, use POST /api/bots)',
			commandId: validatedData.id,  // Keep old commandId for compatibility
			vm: {
				name: validatedData.name,
				minionId: validatedData.minionId
			}
		}, { 
			status: 202,  // Keep old status code for compatibility
			headers: { 'X-Deprecated': 'true' }
		});
		
	} catch (err) {
		console.error('[VM Creation Error]', err);
		
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		
		return json({
			success: false,
			message: err instanceof Error ? err.message : 'Failed to create VM'
		}, { 
			status: 500,
			headers: { 'X-Deprecated': 'true' }
		});
	}
};

/**
 * GET /api/vms
 * 
 * Returns list of all VMs with capacity and health status
 * Queries Redis for vm:* keys and returns parsed metrics
 */
export const GET: RequestHandler = async () => {
	try {
		// Get all VMs with health information from scheduler
		const vms = await getHealthyVms();

		return json({
			success: true,
			vms: vms.map((vm: VMWithHealth) => ({
				vm_id: vm.vm_id,
				status: vm.status,
				ram_total: vm.ram_total,
				ram_available: vm.ram_available,
				ram_used: vm.ram_used,
				cpus: vm.cpus,
				bot_count: vm.bot_count,
				last_heartbeat: vm.last_heartbeat,
				is_healthy: vm.is_healthy
			}))
		});
	} catch (err) {
		console.error('[VM List Error]', err);

		return json({
			success: false,
			message: err instanceof Error ? err.message : 'Failed to fetch VM list',
			vms: []
		}, { status: 500 });
	}
};
