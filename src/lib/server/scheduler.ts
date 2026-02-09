/**
 * Scheduler service module
 * Queries VMs from Redis and selects the best one based on available resources
 */

import Redis, { type RedisOptions } from 'ioredis';

/**
 * VM data structure as stored in Redis
 */
export interface VM {
	vm_id: string;
	status: string;
	ram_total: number;
	ram_available: number;
	ram_used: number;
	cpus: number;
	bot_count: number;
	last_heartbeat: string; // ISO timestamp
}

/**
 * VM with parsed health information
 */
export interface VMWithHealth extends VM {
	is_healthy: boolean;
}

// Redis client singleton for scheduler
let redisClient: Redis | null = null;

/**
 * Get or create Redis client with TLS support
 * Reuses connection logic pattern from redis.ts
 */
function getRedisClient(): Redis | null {
	if (redisClient) return redisClient;

	const redisUrl = process.env.REDIS_URL;
	if (!redisUrl) {
		console.warn('[Scheduler] REDIS_URL not set, Redis operations will be skipped');
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
		console.error('[Scheduler] Failed to connect to Redis:', err);
		return null;
	}
}

/**
 * Heartbeat threshold in milliseconds (2 minutes)
 */
const HEARTBEAT_THRESHOLD_MS = 2 * 60 * 1000;

/**
 * Minimum RAM required in GB (1GB)
 */
const MIN_RAM_GB = 1;

/**
 * Get all healthy VMs from Redis
 * Queries vm:* keys and filters by status === 'healthy' and heartbeat < 2 min
 * @returns Array of healthy VMs with parsed metrics
 */
export async function getHealthyVms(): Promise<VMWithHealth[]> {
	const redis = getRedisClient();
	if (!redis) {
		console.warn('[Scheduler] No Redis client available');
		return [];
	}

	try {
		// Get all vm:* keys
		const vmKeys = await redis.keys('vm:*');
		if (vmKeys.length === 0) {
			return [];
		}

		// Fetch all VM data using pipelined HGETALL
		const pipeline = redis.pipeline();
		for (const key of vmKeys) {
			pipeline.hgetall(key);
		}
		const results = await pipeline.exec();

		if (!results) {
			return [];
		}

		const now = Date.now();
		const healthyVms: VMWithHealth[] = [];

		for (let i = 0; i < results.length; i++) {
			const [err, data] = results[i];
			if (err || !data) continue;

			const vmData = data as Record<string, string>;
			const vmId = vmKeys[i].replace('vm:', '');

			// Parse VM fields
			const vm: VM = {
				vm_id: vmId,
				status: vmData.status || 'unknown',
				ram_total: parseFloat(vmData.ram_total) || 0,
				ram_available: parseFloat(vmData.ram_available) || 0,
				ram_used: parseFloat(vmData.ram_used) || 0,
				cpus: parseInt(vmData.cpus, 10) || 0,
				bot_count: parseInt(vmData.bot_count, 10) || 0,
				last_heartbeat: vmData.last_heartbeat || new Date(0).toISOString(),
			};

			// Check if VM is healthy:
			// 1. status === 'healthy'
			// 2. heartbeat < 2 minutes
			const heartbeatAge = now - new Date(vm.last_heartbeat).getTime();
			const isHealthy = vm.status === 'healthy' && heartbeatAge < HEARTBEAT_THRESHOLD_MS;

			// Only include healthy VMs with at least 1GB available RAM
			if (isHealthy && vm.ram_available >= MIN_RAM_GB) {
				healthyVms.push({
					...vm,
					is_healthy: true,
				});
			}
		}

		return healthyVms;
	} catch (err) {
		console.error('[Scheduler] Error fetching healthy VMs:', err);
		return [];
	}
}

/**
 * Select the best VM from a list based on available RAM
 * Returns the VM with the most ram_available
 * @param vms - Array of VMs to choose from
 * @returns The best VM or null if no suitable VM found
 */
export function selectBestVm(vms: VMWithHealth[]): VMWithHealth | null {
	if (vms.length === 0) {
		return null;
	}

	// Sort by ram_available descending and return the best one
	return vms.sort((a, b) => b.ram_available - a.ram_available)[0];
}
