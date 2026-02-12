/**
 * GET /api/bots/[id]/events
 * 
 * Server-Sent Events (SSE) endpoint for real-time bot status updates.
 * Subscribes to Redis 'clawd:responses' channel and streams events
 * related to the specific bot to the frontend.
 * 
 * Usage:
 *   const eventSource = new EventSource(`/api/bots/${botId}/events`);
 *   eventSource.onmessage = (e) => {
 *     const event = JSON.parse(e.data);
 *     // event.status: 'ACKNOWLEDGED' | 'SUCCESS' | 'ERROR'
 *     // event.message?: string
 *     // event.data?: { vmId?, connectionInfo? }
 *     // event.error?: { code, message }
 *   };
 */

import type { RequestHandler } from '@sveltejs/kit';
import Redis, { type RedisOptions } from 'ioredis';
import { sseLogger } from '$lib/server/logger.js';

// Event types from Redis protocol
type BotStatus = 'ACKNOWLEDGED' | 'SUCCESS' | 'ERROR';

interface BotStatusEvent {
	status: BotStatus;
	bot_id?: string;
	commandId?: string;
	message?: string;
	data?: {
		vmId?: string;
		connectionInfo?: {
			telegram?: { botUsername: string };
			discord?: { botUsername: string };
			whatsapp?: { phoneNumber: string };
		};
		[key: string]: unknown;
	};
	error?: {
		code: string;
		message: string;
		details?: unknown;
	};
	timestamp: string;
}

// Redis client singleton for SSE
let redisSubscriber: Redis | null = null;

function getRedisSubscriber(): Redis | null {
	if (redisSubscriber) return redisSubscriber;

	const redisUrl = process.env.REDIS_URL;
	if (!redisUrl) {
		console.warn('[SSE] REDIS_URL not set, SSE will not work');
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

		redisSubscriber = new Redis(connectionOptions);
		return redisSubscriber;
	} catch (err) {
		console.error('[SSE] Failed to connect to Redis:', err);
		return null;
	}
}

/**
 * GET handler for SSE stream
 * Returns a text/event-stream that clients can connect to for real-time updates
 */
export const GET: RequestHandler = async ({ params }) => {
	const botId = params.id;
	sseLogger.info('[GET /api/bots/[id]/events] SSE connection request', { botId });

	if (!botId) {
		sseLogger.warn('SSE request missing bot ID');
		return new Response(
			JSON.stringify({ success: false, message: 'Bot ID is required' }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const redis = getRedisSubscriber();
	if (!redis) {
		sseLogger.error('SSE unavailable - Redis not connected', { botId });
		return new Response(
			JSON.stringify({ success: false, message: 'Redis not available' }),
			{ status: 503, headers: { 'Content-Type': 'application/json' } }
		);
	}

	sseLogger.debug('Creating SSE stream', { botId });

	// Create a ReadableStream for SSE
	const stream = new ReadableStream({
		start(controller) {
			sseLogger.info('SSE stream starting', { botId });

			// Send initial connection event
			const connectEvent: BotStatusEvent = {
				status: 'ACKNOWLEDGED',
				bot_id: botId,
				message: 'SSE connection established',
				timestamp: new Date().toISOString(),
			};
			controller.enqueue(`data: ${JSON.stringify(connectEvent)}\n\n`);
			sseLogger.debug('Sent initial ACKNOWLEDGED event', { botId });

			// Set up Redis subscription handler
			const messageHandler = (channel: string, message: string) => {
				if (channel !== 'clawd:responses') return;

				try {
					const event: BotStatusEvent = JSON.parse(message);

					// Filter events for this bot
					// Events should have bot_id field (set by the VM/worker)
					if (event.bot_id !== botId) {
						return;
					}

					sseLogger.info('Received Redis event for bot', { 
						botId, 
						status: event.status,
						message: event.message 
					});

					// Send the event to the client
					controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);

					// Close stream on terminal states
					if (event.status === 'SUCCESS' || event.status === 'ERROR') {
						sseLogger.info('Closing SSE stream - terminal state reached', { 
							botId, 
							status: event.status 
						});
						controller.close();
					}
				} catch (err) {
					sseLogger.error('Failed to parse Redis message', { 
						botId, 
						error: err instanceof Error ? err.message : String(err) 
					});
				}
			};

			// Subscribe to the channel
			redis.subscribe('clawd:responses').then(() => {
				sseLogger.info('Subscribed to Redis channel', { 
					botId, 
					channel: 'clawd:responses' 
				});
			}).catch((err) => {
				sseLogger.error('Failed to subscribe to Redis channel', { 
					botId, 
					error: err instanceof Error ? err.message : String(err) 
				});
				controller.error(err);
			});

			// Listen for messages
			redis.on('message', messageHandler);

			// Handle client disconnect
			return () => {
				sseLogger.info('Client disconnecting from SSE', { botId });
				redis.off('message', messageHandler);
				// Note: We don't unsubscribe from Redis here because other clients
				// might be connected. The shared subscriber is cleaned up on process exit.
			};
		},

		cancel(reason) {
			sseLogger.info('SSE stream cancelled', { botId, reason: String(reason) });
		},
	});

	// Return the SSE response with appropriate headers
	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		},
	});
};
