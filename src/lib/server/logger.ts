/**
 * Configurable logger for bot-related debugging
 * 
 * Usage:
 * ```typescript
 * import { botLogger } from '$lib/server/logger';
 * 
 * botLogger.debug('Creating bot', { botId, teamId });
 * botLogger.info('Bot created successfully', { botId });
 * botLogger.warn('Redis connection slow', { latency });
 * botLogger.error('Bot creation failed', { botId, error });
 * ```
 * 
 * Enable logging by setting environment variable:
 * DEBUG_BOT=true  # Enables all bot-related logs
 * DEBUG_BOT=redis # Only Redis-related logs
 * DEBUG_BOT=error # Only errors
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
	[key: string]: unknown;
}

class Logger {
	private prefix: string;
	private enabled: boolean;
	private minLevel: LogLevel;
	private levelPriority: Record<LogLevel, number> = {
		debug: 0,
		info: 1,
		warn: 2,
		error: 3,
	};

	constructor(prefix = '[Bot]', minLevel: LogLevel = 'debug') {
		this.prefix = prefix;
		this.enabled = this.checkEnabled();
		this.minLevel = this.getMinLevel();
	}

	/**
	 * Check if logging is enabled via environment variable
	 */
	private checkEnabled(): boolean {
		const debugEnv = process.env.DEBUG_BOT;
		if (!debugEnv) return false;
		if (debugEnv === 'false' || debugEnv === '0') return false;
		return true;
	}

	/**
	 * Get minimum log level from environment
	 */
	private getMinLevel(): LogLevel {
		const debugEnv = process.env.DEBUG_BOT;
		if (!debugEnv) return 'error';
		
		// If just 'true', enable all levels
		if (debugEnv === 'true' || debugEnv === '1') return 'debug';
		
		// Check for specific level
		const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
		const level = debugEnv.toLowerCase() as LogLevel;
		if (levels.includes(level)) {
			return level;
		}
		
		return 'debug';
	}

	/**
	 * Format log message with context
	 */
	private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
		const timestamp = new Date().toISOString();
		const contextStr = context ? ` ${JSON.stringify(context)}` : '';
		return `${timestamp} ${this.prefix}[${level.toUpperCase()}] ${message}${contextStr}`;
	}

	/**
	 * Check if this log level should be output
	 */
	private shouldLog(level: LogLevel): boolean {
		if (!this.enabled) return level === 'error'; // Always log errors
		return this.levelPriority[level] >= this.levelPriority[this.minLevel];
	}

	/**
	 * Log a debug message
	 */
	debug(message: string, context?: LogContext): void {
		if (this.shouldLog('debug')) {
			console.log(this.formatMessage('debug', message, context));
		}
	}

	/**
	 * Log an info message
	 */
	info(message: string, context?: LogContext): void {
		if (this.shouldLog('info')) {
			console.info(this.formatMessage('info', message, context));
		}
	}

	/**
	 * Log a warning message
	 */
	warn(message: string, context?: LogContext): void {
		if (this.shouldLog('warn')) {
			console.warn(this.formatMessage('warn', message, context));
		}
	}

	/**
	 * Log an error message
	 */
	error(message: string, context?: LogContext): void {
		// Errors are always logged unless explicitly disabled
		console.error(this.formatMessage('error', message, context));
	}

	/**
	 * Log Redis-specific operations
	 */
	redis(operation: string, context?: LogContext): void {
		if (this.enabled || process.env.DEBUG_BOT === 'redis') {
			console.log(this.formatMessage('debug', `[Redis] ${operation}`, context));
		}
	}

	/**
	 * Log bot lifecycle events
	 */
	lifecycle(event: string, context?: LogContext): void {
		if (this.enabled || process.env.DEBUG_BOT === 'lifecycle') {
			console.log(this.formatMessage('info', `[Lifecycle] ${event}`, context));
		}
	}

	/**
	 * Time an operation and log the duration
	 */
	time<T>(label: string, operation: () => T): T;
	time<T>(label: string, operation: () => Promise<T>): Promise<T>;
	time<T>(label: string, operation: () => T | Promise<T>): T | Promise<T> {
		if (!this.enabled) {
			return operation() as T;
		}

		const start = performance.now();
		const result = operation();

		const logDuration = () => {
			const duration = Math.round(performance.now() - start);
			this.debug(`${label} took ${duration}ms`);
		};

		if (result instanceof Promise) {
			return result.finally(logDuration) as Promise<T>;
		} else {
			logDuration();
			return result as T;
		}
	}

	/**
	 * Create a child logger with additional context
	 */
	child(additionalPrefix: string): Logger {
		const childLogger = new Logger(`${this.prefix}${additionalPrefix}`, this.minLevel);
		// Copy the enabled state
		(childLogger as unknown as { enabled: boolean }).enabled = this.enabled;
		return childLogger;
	}
}

// Singleton logger instances
export const botLogger = new Logger('[Bot]');
export const redisLogger = new Logger('[Redis]');
export const sseLogger = new Logger('[SSE]');
export const apiLogger = new Logger('[API]');

// Default export for convenience
export default botLogger;
