/**
 * Shared types for the Minion application
 */

/**
 * Bot data structure as returned from API
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
 * Parsed bot configuration
 */
export interface BotConfig {
	name: string;
	model?: string;
	api_key?: string;
	memory?: string;
	cpus?: string;
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
 * Parsed bot data for frontend display
 */
export interface ParsedBot {
	bot_id: string;
	vm_id: string;
	team_id: string;
	status: 'running' | 'stopped' | 'error' | string;
	profiles: string[];
	config: BotConfig;
	created_at: string;
}

/**
 * Team data structure
 */
export interface Team {
	team_id: string;
	name: string;
	credits: number;
	created_at: string;
}

/**
 * Bot with parsed config for display
 */
export interface BotWithDetails extends ParsedBot {
	// Channel status
	hasTelegram: boolean;
	hasDiscord: boolean;
	hasWhatsApp: boolean;
	
	// Display info
	displayName: string;
	minionType: string;
	minionColor: string;
}

/**
 * Minion type definition
 */
export interface MinionType {
	id: string;
	name: string;
	role: string;
	color: string;
}

/**
 * Credit transaction record
 */
export interface CreditTransaction {
	id: string;
	bot_id: string;
	amount: number;
	type: 'add' | 'deduct' | 'refund';
	description: string;
	timestamp: string;
}

/**
 * Team statistics
 */
export interface TeamStats {
	totalBots: number;
	runningBots: number;
	stoppedBots: number;
	errorBots: number;
	totalChannels: number;
	activeChannels: number;
}
