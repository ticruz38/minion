import { json, type RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import Redis from 'ioredis';

/**
 * VM Creation Request Schema
 * Validates the user-provided fields for VM creation
 */
const vmCreationSchema = z.object({
	name: z.string()
		.min(3, 'Name must be at least 3 characters')
		.max(30, 'Name must be at most 30 characters')
		.regex(/^[a-zA-Z0-9-]+$/, 'Name must be alphanumeric with hyphens only'),
	token: z.string()
		.min(1, 'Token is required')
		.regex(/^\d+:[a-zA-Z0-9_-]+$/, 'Invalid token format. Expected: digits:alphanumeric'),
	passcode: z.string()
		.min(4, 'Passcode must be at least 4 characters')
		.max(20, 'Passcode must be at most 20 characters'),
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
		redisClient = new Redis(redisUrl);
		return redisClient;
	} catch (err) {
		console.error('[VM Creation] Failed to connect to Redis:', err);
		return null;
	}
}

/**
 * Build the VM configuration payload for Redis
 */
function buildVMConfig(request: VMCreationRequest): Record<string, unknown> {
	return {
		name: request.name,
		model: 'moonshot/kimi-k2.5',
		ram: 4,
		cpus: 2,
		disk: 20,
		profiles: [request.minionId],
		channels: {
			telegram: {
				token: request.token,
				dmPolicy: 'passcode'
			}
		},
		env: {
			BOT_PASSCODE: request.passcode
		}
	};
}

/**
 * POST /api/vms
 * 
 * Creates a new VM by publishing configuration to Redis.
 * Called when user completes the VM creation modal flow.
 * 
 * Request body: {
 *   name: string;        // 3-30 chars, alphanumeric + hyphens
 *   token: string;       // Telegram bot token (digits:alphanumeric)
 *   passcode: string;    // 4-20 chars
 *   minionId: string;    // Selected minion type
 * }
 * 
 * Response: {
 *   success: boolean;
 *   message: string;
 *   vm?: { name: string; minionId: string; }
 * }
 */
export const POST: RequestHandler = async ({ request }) => {
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
			}, { status: 400 });
		}
		
		const validatedData = validationResult.data;
		
		// Build VM configuration
		const vmConfig = buildVMConfig(validatedData);
		
		// Publish to Redis
		const redis = getRedisClient();
		
		if (redis) {
			// Publish to clawd:commands channel
			const message = JSON.stringify({
				command: 'create_vm',
				timestamp: Date.now(),
				config: vmConfig
			});
			
			await redis.publish('clawd:commands', message);
			console.log(`[VM Creation] Published VM creation for ${validatedData.name} to Redis`);
		} else {
			// In development/demo mode, just log the config
			console.log('[VM Creation] Demo mode - VM config:', JSON.stringify(vmConfig, null, 2));
		}
		
		// Return success response
		return json({
			success: true,
			message: 'VM creation request submitted successfully',
			vm: {
				name: validatedData.name,
				minionId: validatedData.minionId
			}
		}, { status: 201 });
		
	} catch (err) {
		console.error('[VM Creation Error]', err);
		
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		
		return json({
			success: false,
			message: err instanceof Error ? err.message : 'Failed to create VM'
		}, { status: 500 });
	}
};

/**
 * GET /api/vms
 * 
 * Returns list of VMs (placeholder for future implementation)
 * Currently returns empty array
 */
export const GET: RequestHandler = async () => {
	return json({
		vms: [],
		message: 'VM list endpoint - not yet implemented'
	});
};
