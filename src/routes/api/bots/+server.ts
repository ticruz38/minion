import { json, type RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getHealthyVms, selectBestVm } from '$lib/server/scheduler.js';
import { registerBot, sendCommand, getTeamBots, type BotConfig, type BotCommand } from '$lib/server/bot-service.js';

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
 * Bot Creation Request Schema
 * Validates the user-provided fields for bot creation with multi-channel support
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

const botCreationSchema = z.object({
	// Bot name (3-30 chars, alphanumeric + hyphens)
	name: z.string()
		.min(3, 'Name must be at least 3 characters')
		.max(30, 'Name must be at most 30 characters')
		.regex(/^[a-zA-Z0-9-]+$/, 'Name must be alphanumeric with hyphens only'),
	// Team ID that owns the bot
	team_id: z.string()
		.min(1, 'Team ID is required'),
	// Multi-channel support with detailed configuration
	channels: channelsSchema,
	// Minion type/profile
	minionId: z.string()
		.min(1, 'Minion ID is required')
});

type BotCreationRequest = z.infer<typeof botCreationSchema>;

/**
 * Build the bot configuration from the creation request
 */
function buildBotConfig(request: BotCreationRequest): BotConfig {
	return {
		name: request.name,
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
		config
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
	try {
		// Parse request body
		const body = await request.json();
		
		// Validate with Zod
		const validationResult = botCreationSchema.safeParse(body);
		
		if (!validationResult.success) {
			const errors = validationResult.error.issues.map(issue => ({
				field: issue.path.join('.'),
				message: issue.message
			}));
			
			return json({
				success: false,
				message: 'Validation failed',
				errors
			}, { status: 400 });
		}
		
		const validatedData = validationResult.data;
		
		// Get healthy VMs and select the best one
		const healthyVms = await getHealthyVms();
		const selectedVm = selectBestVm(healthyVms);
		
		if (!selectedVm) {
			return json({
				success: false,
				message: 'No healthy VMs available. Please try again later.'
			}, { status: 503 });
		}
		
		// Generate unique bot ID
		const botId = `bot_${nanoid(10)}`;
		const vmId = selectedVm.vm_id;
		const teamId = validatedData.team_id;
		
		// Build bot configuration
		const botConfig = buildBotConfig(validatedData);
		
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
		
		console.log(`[Bot Creation] Created bot ${botId} for team ${teamId} on VM ${vmId}`);
		
		// Return success with bot details
		return json({
			success: true,
			message: 'Bot created successfully',
			bot_id: botId,
			vm_id: vmId
		}, { status: 201 });
		
	} catch (err) {
		console.error('[Bot Creation Error]', err);
		
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
	try {
		// Parse team_id query parameter
		const teamId = url.searchParams.get('team_id');
		
		if (!teamId) {
			return json({
				success: false,
				message: 'Missing required query parameter: team_id'
			}, { status: 400 });
		}
		
		// Get all bots for the team from Redis
		const bots = await getTeamBots(teamId);
		
		console.log(`[Bot List] Retrieved ${bots.length} bots for team ${teamId}`);
		
		// Return array of bot objects with all Redis fields
		return json({
			success: true,
			bots
		}, { status: 200 });
		
	} catch (err) {
		console.error('[Bot List Error]', err);
		
		return json({
			success: false,
			message: err instanceof Error ? err.message : 'Failed to retrieve bots'
		}, { status: 500 });
	}
};
