/**
 * Scheduler service module
 * Queries VMs from Redis and selects the best one based on available resources
 */

import Redis, { type RedisOptions } from 'ioredis';
import { botLogger } from './logger.js';

const schedulerLog = botLogger.child('[Scheduler]');

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
 * Clock skew tolerance in milliseconds (1 minute)
 * Allows for VMs with slightly ahead clocks
 */
const CLOCK_SKEW_MS = 60 * 1000;

/**
 * Minimum RAM required in GB (1GB)
 */
const MIN_RAM_GB = 1;

/**
 * Parse heartbeat timestamp from Redis
 * Handles both Unix timestamps (seconds) and ISO strings
 * @param heartbeat - Raw heartbeat value from Redis
 * @returns Timestamp in milliseconds
 */
function parseHeartbeatTimestamp(heartbeat: string | undefined): number {
	if (!heartbeat) {
		return 0; // Return epoch if no heartbeat
	}

	// Try parsing as number first (Unix timestamp in seconds)
	const asNumber = parseInt(heartbeat, 10);
	if (!isNaN(asNumber) && heartbeat.length <= 10) {
		// It's a Unix timestamp in seconds, convert to milliseconds
		return asNumber * 1000;
	}

	// Try parsing as ISO string
	const asDate = new Date(heartbeat);
	if (!isNaN(asDate.getTime())) {
		return asDate.getTime();
	}

	// Fallback: try parsing as milliseconds timestamp
	if (!isNaN(asNumber)) {
		return asNumber;
	}

	schedulerLog.warn('Unable to parse heartbeat timestamp', { heartbeat });
	return 0;
}

/**
 * Get all healthy VMs from Redis
 * Queries vm:* keys and filters by status === 'healthy' and heartbeat < 2 min
 * @returns Array of healthy VMs with parsed metrics
 */
export async function getHealthyVms(): Promise<VMWithHealth[]> {
	schedulerLog.debug('Fetching healthy VMs from Redis');
	
	const redis = getRedisClient();
	if (!redis) {
		schedulerLog.error('No Redis client available');
		return [];
	}

	try {
		// Get all vm:* keys
		const vmKeys = await redis.keys('vm:*');
		schedulerLog.debug('Found VM keys in Redis', { count: vmKeys.length, keys: vmKeys });
		
		if (vmKeys.length === 0) {
			schedulerLog.warn('No VM keys found in Redis');
			return [];
		}

		// Fetch all VM data using pipelined HGETALL
		const pipeline = redis.pipeline();
		for (const key of vmKeys) {
			pipeline.hgetall(key);
		}
		const results = await pipeline.exec();

		if (!results) {
			schedulerLog.error('Pipeline returned no results');
			return [];
		}

		const now = Date.now();
		const healthyVms: VMWithHealth[] = [];

		for (let i = 0; i < results.length; i++) {
			const [err, data] = results[i];
			const vmId = vmKeys[i].replace('vm:', '');
			
			if (err) {
				schedulerLog.error('Error fetching VM data', { vmId, error: String(err) });
				continue;
			}
			
			if (!data) {
				schedulerLog.warn('No data returned for VM', { vmId });
				continue;
			}

			const vmData = data as Record<string, string>;
			
			schedulerLog.debug('Raw VM data from Redis', { vmId, rawData: vmData });

			// Parse heartbeat timestamp (handles both Unix timestamps and ISO strings)
			const heartbeatMs = parseHeartbeatTimestamp(vmData.last_heartbeat);
			
			// Parse VM fields
			const vm: VM = {
				vm_id: vmId,
				status: vmData.status || 'unknown',
				ram_total: parseFloat(vmData.ram_total) || 0,
				ram_available: parseFloat(vmData.ram_available) || 0,
				ram_used: parseFloat(vmData.ram_used) || 0,
				cpus: parseInt(vmData.cpus, 10) || 0,
				bot_count: parseInt(vmData.bot_count, 10) || 0,
				last_heartbeat: heartbeatMs ? new Date(heartbeatMs).toISOString() : new Date(0).toISOString(),
			};

			// Check if VM is healthy:
			// 1. status === 'healthy'
			// 2. heartbeat < 2 minutes old (allow 1 min clock skew for future timestamps)
			const heartbeatAge = now - heartbeatMs;
			const isStatusHealthy = vm.status === 'healthy';
			const isHeartbeatFresh = heartbeatAge < HEARTBEAT_THRESHOLD_MS && heartbeatAge > -CLOCK_SKEW_MS;
			const isHealthy = isStatusHealthy && isHeartbeatFresh;
			
			schedulerLog.debug('VM health check', {
				vmId,
				status: vm.status,
				isStatusHealthy,
				heartbeatTimestamp: vmData.last_heartbeat,
				heartbeatParsedMs: heartbeatMs,
				now,
				heartbeatAge: `${Math.round(heartbeatAge / 1000)}s`,
				isHeartbeatFresh,
				clockSkewAllowed: `${CLOCK_SKEW_MS / 1000}s`,
				ramAvailable: vm.ram_available,
				isHealthy,
				meetsRamRequirement: vm.ram_available >= MIN_RAM_GB
			});

			// Only include healthy VMs with at least 1GB available RAM
			if (isHealthy && vm.ram_available >= MIN_RAM_GB) {
				healthyVms.push({
					...vm,
					is_healthy: true,
				});
				schedulerLog.info('VM is healthy and available', { vmId, ramAvailable: vm.ram_available });
			} else {
				schedulerLog.warn('VM filtered out', {
					vmId,
					reason: !isHealthy 
						? `Unhealthy (status=${vm.status}, heartbeatAge=${Math.round(heartbeatAge/1000)}s)` 
						: `Insufficient RAM (${vm.ram_available}GB < ${MIN_RAM_GB}GB)`
				});
			}
		}

		schedulerLog.info('Healthy VMs summary', {
			totalVms: vmKeys.length,
			healthyCount: healthyVms.length,
			healthyVmIds: healthyVms.map(v => v.vm_id)
		});

		return healthyVms;
	} catch (err) {
		schedulerLog.error('Error fetching healthy VMs', { 
			error: err instanceof Error ? err.message : String(err) 
		});
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
		schedulerLog.warn('No VMs available to select from');
		return null;
	}

	// Sort by ram_available descending and return the best one
	const sorted = vms.sort((a, b) => b.ram_available - a.ram_available);
	const best = sorted[0];
	
	schedulerLog.info('Selected best VM', {
		vmId: best.vm_id,
		ramAvailable: best.ram_available,
		totalCandidates: vms.length,
		allOptions: vms.map(v => ({ id: v.vm_id, ram: v.ram_available }))
	});
	
	return best;
}
