import 'dotenv/config';

import type { Handle } from '@sveltejs/kit';
import { getSharedVMStatusSubscriber, resetSharedVMStatusSubscriber } from '$lib/server/redis.js';

/**
 * Server startup Redis connectivity check
 * 
 * Verifies Redis is accessible before allowing the server to start.
 * If Redis is unavailable or not configured, the server exits with a clear error.
 * 
 * Environment variables are loaded from .env file via 'dotenv/config' import above.
 */

// Flag to track if startup check has been performed
let startupCheckPerformed = false;

async function checkRedisConnection(): Promise<void> {
	const redisUrl = process.env.REDIS_URL;
	
	if (!redisUrl) {
		console.error('[Startup] ❌ REDIS_URL environment variable is not set');
		console.error('[Startup] Please configure Redis:');
		console.error('  1. Create a .env file in project root with: REDIS_URL=redis://localhost:6379');
		console.error('  2. Or set the environment variable: export REDIS_URL=redis://localhost:6379');
		console.error('  3. With auth: redis://username:password@host:port');
		process.exit(1);
	}
	
	console.log('[Startup] Checking Redis connection...');
	console.log(`[Startup] Redis URL: ${redisUrl.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@')}`);
	
	const subscriber = getSharedVMStatusSubscriber(redisUrl);
	
	try {
		await subscriber.connect();
		console.log('[Startup] ✅ Redis connection established successfully');
		
		// Verify we can actually communicate by checking subscription count
		const subCount = subscriber.getSubscriptionCount();
		console.log(`[Startup] Redis subscriber ready (active subscriptions: ${subCount})`);
		
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		console.error('[Startup] ❌ Failed to connect to Redis');
		console.error(`[Startup] Error: ${errorMessage}`);
		console.error('[Startup] Please verify:');
		console.error(`  - REDIS_URL is correct: ${redisUrl.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@')}`);
		console.error('  - Redis server is running and accessible');
		console.error('  - Network connectivity to Redis host');
		
		// Reset the shared subscriber so it can be retried later if needed
		resetSharedVMStatusSubscriber();
		
		process.exit(1);
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	// Perform startup check only once
	if (!startupCheckPerformed) {
		await checkRedisConnection();
		startupCheckPerformed = true;
	}
	
	return resolve(event);
};
