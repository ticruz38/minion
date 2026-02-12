import { json, type RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { randomBytes } from 'crypto';
import { getHealthyVms, selectBestVm } from '$lib/server/scheduler.js';
import { registerBot, sendCommand, getTeamBots, type BotConfig, type BotCommand } from '$lib/server/bot-service.js';
import { createTeam } from '$lib/server/team-service.js';
import { apiLogger } from '$lib/server/logger.js';

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

interface SlackChannel {
	enabled: true;
	token: string;
	signingSecret?: string;
	dmPolicy: DMPolicy;
	allowedUsers?: string[];
}

interface ChannelsConfig {
	telegram?: TelegramChannel;
	discord?: DiscordChannel;
	whatsapp?: WhatsAppChannel;
	slack?: SlackChannel;
}

/**
 * Bot Creation Request Schema
 * Validates the user-provided fields for bot creation with multi-channel support
 */

// Telegram token format: digits:alphanumeric (e.g., 123456789:ABCdefGHIjklMNOpqrsTUVwxyz)
const telegramTokenRegex = /^\d+:[a-zA-Z0-9_-]+$/;

// Discord token format: alphanumeric with dots and underscores
const discordTokenRegex = /^[a-zA-Z0-9_.-]+$/;

// Slack token format: starts with xoxb- for bot tokens
const slackTokenRegex = /^xoxb-[a-zA-Z0-9-]+$/;

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

// Slack channel schema
const slackSchema = z.object({
	enabled: z.literal(true),
	token: z.string()
		.regex(slackTokenRegex, 'Invalid Slack token format. Must start with xoxb-'),
	signingSecret: z.string()
		.optional(),
	dmPolicy: z.enum(['pairing', 'allowlist', 'open'])
		.default('pairing'),
	allowedUsers: z.array(z.string()).optional()
});

// Channels schema - at least one channel must be enabled
const channelsSchema = z.object({
	telegram: telegramSchema.optional(),
	discord: discordSchema.optional(),
	whatsapp: whatsappSchema.optional(),
	slack: slackSchema.optional()
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

const botCreationSchema = z.object({
	// Bot name (3-30 chars, alphanumeric + hyphens)
	name: z.string()
		.min(3, 'Name must be at least 3 characters')
		.max(30, 'Name must be at most 30 characters')
		.regex(/^[a-zA-Z0-9-]+$/, 'Name must be alphanumeric with hyphens only'),
	// Team ID that owns the bot (optional - will auto-generate if not provided)
	team_id: z.string()
		.optional(),
	// Multi-channel support with detailed configuration
	channels: channelsSchema,
	// Minion type/profile
	minionId: z.string()
		.min(1, 'Minion ID is required')
});

type BotCreationRequest = z.infer<typeof botCreationSchema>;

/**
 * Generate a secure team ID using crypto-grade entropy
 * Format: team_{base64url-encoded random bytes}
 * Provides ~192 bits of entropy (24 bytes)
 */
function generateSecureTeamId(): string {
	const entropy = randomBytes(24); // 192 bits
	// Convert to base64url (URL-safe base64)
	const base64 = entropy.toString('base64url');
	return `team_${base64}`;
}

/**
 * Build the bot configuration from the creation request
 * Includes model and API key from environment
 */
function buildBotConfig(request: BotCreationRequest): BotConfig {
	return {
		name: request.name,
		model: process.env.LLM_MODEL || 'moonshot/kimi-k2.5',
		api_key: process.env.LLM_API_KEY || '',
		memory: '2g',
		cpus: '1',
		channels: request.channels as ChannelsConfig
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
		config,
		resources: {
			memory: config.memory || '2g',
			cpus: config.cpus || '1',
			disk: '20'
		}
	};
}

/**
 * POST /api/bots
 * 
 * Creates a new bot by:
 * 1. Selecting the best available VM
 * 2. Registering the bot in Redis
 * 3. Sending CREATE command to the VM's queue
 * 
 * Request body: {
 *   name: string;          // 3-30 chars, alphanumeric + hyphens
 *   team_id: string;       // Team that owns the bot
 *   channels: {            // Multi-channel config (required)
 *     telegram?: { enabled: true, token: string, dmPolicy: 'pairing'|'allowlist'|'open', allowedUsers?: string[] }
 *     discord?: { enabled: true, token: string, dmPolicy: 'pairing'|'allowlist'|'open', allowedUsers?: string[] }
 *     whatsapp?: { enabled: true, phoneNumber: string, apiKey: string, webhookUrl?: string, dmPolicy: 'pairing'|'allowlist'|'open', allowedUsers?: string[] }
 *   }
 *   minionId: string;      // Selected minion type/profile
 * }
 * 
 * Response: HTTP 201 Created
 * {
 *   success: boolean;
 *   message: string;
 *   bot_id: string;        // Unique bot identifier
 *   vm_id: string;         // VM where bot is scheduled
 * }
 * 
 * Error: HTTP 503 Service Unavailable (no VMs available)
 */
export const POST: RequestHandler = async ({ request }) => {
	const requestId = nanoid(8);
	apiLogger.info('[POST /api/bots] Bot creation request started', { requestId });
	
	try {
		// Parse request body
		const body = await request.json();
		apiLogger.debug('Request body parsed', { requestId, bodySummary: {
			name: body.name,
			team_id: body.team_id,
			minionId: body.minionId,
			channels: body.channels ? Object.keys(body.channels) : []
		}});
		
		// Validate with Zod
		const validationResult = botCreationSchema.safeParse(body);
		
		if (!validationResult.success) {
			const errors = validationResult.error.issues.map(issue => ({
				field: issue.path.join('.'),
				message: issue.message
			}));
			
			apiLogger.warn('Validation failed', { requestId, errors });
			
			return json({
				success: false,
				message: 'Validation failed',
				errors
			}, { status: 400 });
		}
		
		const validatedData = validationResult.data;
		apiLogger.debug('Validation passed', { requestId, validatedData: {
			name: validatedData.name,
			team_id: validatedData.team_id,
			minionId: validatedData.minionId,
			channels: Object.keys(validatedData.channels)
		}});
		
		// Get healthy VMs and select the best one
		apiLogger.debug('Fetching healthy VMs', { requestId });
		const healthyVms = await getHealthyVms();
		apiLogger.debug('Healthy VMs retrieved', { requestId, count: healthyVms.length });
		
		const selectedVm = selectBestVm(healthyVms);
		
		if (!selectedVm) {
			apiLogger.error('No healthy VMs available', { requestId });
			return json({
				success: false,
				message: 'No healthy VMs available. Please try again later.'
			}, { status: 503 });
		}
		
		apiLogger.info('VM selected for bot', { 
			requestId, 
			vmId: selectedVm.vm_id,
			vmAvailableRam: selectedVm.ram_available 
		});
		
		// Generate unique bot ID
		const botId = `bot_${nanoid(10)}`;
		const vmId = selectedVm.vm_id;
		
		// Generate or use provided team ID
		const teamId = validatedData.team_id || generateSecureTeamId();
		const isNewTeam = !validatedData.team_id;
		
		apiLogger.debug('Generated bot ID', { requestId, botId, vmId, teamId, isNewTeam });
		
		// Create team in Redis if it's a new team
		if (isNewTeam) {
			apiLogger.info('Creating new team', { requestId, teamId });
			await createTeam(teamId, `${validatedData.name}'s Team`);
		}
		
		// Build bot configuration
		const botConfig = buildBotConfig(validatedData);
		apiLogger.debug('Bot config built', { 
			requestId, 
			config: {
				name: botConfig.name,
				model: botConfig.model,
				hasApiKey: !!botConfig.api_key,
				memory: botConfig.memory,
				cpus: botConfig.cpus
			}
		});
		
		// Register bot in Redis
		apiLogger.info('Registering bot in Redis', { requestId, botId, vmId, teamId });
		await registerBot(
			botId,
			vmId,
			teamId,
			[validatedData.minionId],
			botConfig
		);
		
		// Build and send CREATE command to VM queue
		apiLogger.info('Building CREATE command', { requestId, botId, vmId });
		const createCommand = buildCreateCommand(
			botId,
			teamId,
			[validatedData.minionId],
			botConfig
		);
		
		apiLogger.info('Sending CREATE command to VM queue', { 
			requestId, 
			botId, 
			vmId,
			commandType: createCommand.type 
		});
		await sendCommand(vmId, createCommand);
		
		apiLogger.info('Bot creation completed successfully', { 
			requestId, 
			botId, 
			vmId, 
			teamId 
		});
		
		// Return success with bot details and team info
		return json({
			success: true,
			message: 'Bot created successfully',
			bot_id: botId,
			vm_id: vmId,
			team_id: teamId,
			is_new_team: isNewTeam
		}, { status: 201 });
		
	} catch (err) {
		apiLogger.error('Bot creation failed', { 
			requestId, 
			error: err instanceof Error ? err.message : String(err),
			stack: err instanceof Error ? err.stack : undefined
		});
		
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		
		return json({
			success: false,
			message: err instanceof Error ? err.message : 'Failed to create bot'
		}, { status: 500 });
	}
};

/**
 * GET /api/bots
 * 
 * List all bots for a team.
 * Called when user wants to view their team's bots.
 * 
 * Query params: ?team_id=<team_id>
 * 
 * Response: HTTP 200 OK
 * {
 *   success: boolean;
 *   bots: Bot[];           // Array of bot objects with all Redis fields
 * }
 * 
 * Error: HTTP 400 (missing team_id)
 */
export const GET: RequestHandler = async ({ url }) => {
	const requestId = nanoid(8);
	apiLogger.info('[GET /api/bots] Bot list request started', { requestId });
	
	try {
		// Parse team_id query parameter
		const teamId = url.searchParams.get('team_id');
		
		if (!teamId) {
			apiLogger.warn('Missing team_id parameter', { requestId });
			return json({
				success: false,
				message: 'Missing required query parameter: team_id'
			}, { status: 400 });
		}
		
		apiLogger.debug('Fetching bots for team', { requestId, teamId });
		
		// Get all bots for the team from Redis
		const bots = await getTeamBots(teamId);
		
		apiLogger.info('Bot list retrieved', { 
			requestId, 
			teamId, 
			count: bots.length 
		});
		
		// Return array of bot objects with all Redis fields
		return json({
			success: true,
			bots
		}, { status: 200 });
		
	} catch (err) {
		apiLogger.error('Failed to retrieve bot list', { 
			requestId, 
			error: err instanceof Error ? err.message : String(err) 
		});
		
		return json({
			success: false,
			message: err instanceof Error ? err.message : 'Failed to retrieve bots'
		}, { status: 500 });
	}
};
