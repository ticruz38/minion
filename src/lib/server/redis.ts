/**
 * Redis pub/sub service for VM creation real-time status updates
 * Subscribes to 'clawd:responses' channel for async VM creation events
 */

import Redis from 'ioredis';

// VM Status event types
export type VMStatus = 
  | 'ACKNOWLEDGED' 
  | 'SUCCESS' 
  | 'ERROR';

// VM Status event payload
export interface VMStatusEvent {
  status: VMStatus;
  commandId: string;
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

// Subscription callback type
export type VMStatusCallback = (event: VMStatusEvent) => void;

// Subscription metadata
interface Subscription {
  commandId: string;
  callback: VMStatusCallback;
  timeoutId: NodeJS.Timeout;
  createdAt: number;
}

/**
 * VMStatusSubscriber - Manages Redis subscriptions for VM creation status updates
 * 
 * Usage:
 * ```typescript
 * const subscriber = new VMStatusSubscriber(redisUrl);
 * 
 * // Subscribe to a specific command
 * subscriber.subscribe(commandId, (event) => {
 *   if (event.status === 'SUCCESS') {
 *     console.log('VM created:', event.data?.vmId);
 *   } else if (event.status === 'ERROR') {
 *     console.error('VM creation failed:', event.error?.message);
 *   }
 * });
 * 
 * // Unsubscribe when done
 * subscriber.unsubscribe(commandId);
 * 
 * // Clean up all resources
 * subscriber.disconnect();
 * ```
 */
export class VMStatusSubscriber {
  private subscriber: Redis | null = null;
  private publisher: Redis | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private readonly channel = 'clawd:responses';
  private readonly autoUnsubscribeMs: number;
  private isConnected = false;
  private redisUrl: string;

  /**
   * Create a new VMStatusSubscriber
   * @param redisUrl - Redis connection URL (defaults to localhost)
   * @param autoUnsubscribeMs - Auto-unsubscribe timeout in milliseconds (default: 10 minutes)
   */
  constructor(
    redisUrl = 'redis://localhost:6379',
    autoUnsubscribeMs = 10 * 60 * 1000 // 10 minutes
  ) {
    this.redisUrl = redisUrl;
    this.autoUnsubscribeMs = autoUnsubscribeMs;
  }

  /**
   * Initialize Redis connections
   * Must be called before subscribing
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    // Parse Redis URL to extract connection details
    const url = new URL(this.redisUrl);
    const isTls = url.protocol === 'rediss:';
    
    // Build connection options
    const connectionOptions: Redis.RedisOptions = {
      host: url.hostname,
      port: parseInt(url.port, 10) || (isTls ? 443 : 6379),
      retryStrategy: (times) => Math.min(times * 50, 2000),
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

    // Create separate connections for pub/sub (required by Redis)
    this.subscriber = new Redis(connectionOptions);

    this.publisher = new Redis(connectionOptions);

    // Handle connection events
    this.subscriber.on('error', (err) => {
      console.error('[VMStatusSubscriber] Redis subscriber error:', err.message);
    });

    this.publisher?.on('error', (err) => {
      console.error('[VMStatusSubscriber] Redis publisher error:', err.message);
    });

    // Subscribe to the responses channel
    await this.subscriber.subscribe(this.channel);
    
    // Handle incoming messages
    this.subscriber.on('message', (channel, message) => {
      if (channel === this.channel) {
        this.handleMessage(message);
      }
    });

    this.isConnected = true;
    console.log('[VMStatusSubscriber] Connected to Redis and subscribed to', this.channel);
  }

  /**
   * Handle incoming Redis messages
   */
  private handleMessage(message: string): void {
    try {
      const event: VMStatusEvent = JSON.parse(message);
      
      // Validate required fields
      if (!event.commandId || !event.status) {
        console.warn('[VMStatusSubscriber] Invalid event format:', message);
        return;
      }

      // Find and notify the subscription for this commandId
      const subscription = this.subscriptions.get(event.commandId);
      if (subscription) {
        subscription.callback(event);

        // Auto-unsubscribe on terminal states (SUCCESS or ERROR)
        if (event.status === 'SUCCESS' || event.status === 'ERROR') {
          this.unsubscribe(event.commandId);
        }
      }
    } catch (err) {
      console.error('[VMStatusSubscriber] Failed to parse message:', err);
    }
  }

  /**
   * Subscribe to status updates for a specific commandId
   * @param commandId - The UUID command ID to subscribe to
   * @param callback - Function called when status updates are received
   * @returns Unsubscribe function
   */
  subscribe(commandId: string, callback: VMStatusCallback): () => void {
    if (!this.isConnected) {
      throw new Error('VMStatusSubscriber not connected. Call connect() first.');
    }

    // Remove existing subscription if any
    if (this.subscriptions.has(commandId)) {
      this.unsubscribe(commandId);
    }

    // Set up auto-unsubscribe timeout to prevent memory leaks
    const timeoutId = setTimeout(() => {
      console.log(`[VMStatusSubscriber] Auto-unsubscribing from ${commandId} after ${this.autoUnsubscribeMs}ms`);
      this.unsubscribe(commandId);
    }, this.autoUnsubscribeMs);

    // Store subscription
    this.subscriptions.set(commandId, {
      commandId,
      callback,
      timeoutId,
      createdAt: Date.now(),
    });

    console.log(`[VMStatusSubscriber] Subscribed to commandId: ${commandId}`);

    // Return unsubscribe function
    return () => this.unsubscribe(commandId);
  }

  /**
   * Unsubscribe from a specific commandId
   * @param commandId - The command ID to unsubscribe from
   */
  unsubscribe(commandId: string): boolean {
    const subscription = this.subscriptions.get(commandId);
    if (!subscription) {
      return false;
    }

    // Clear the auto-unsubscribe timeout
    clearTimeout(subscription.timeoutId);

    // Remove subscription
    this.subscriptions.delete(commandId);

    console.log(`[VMStatusSubscriber] Unsubscribed from commandId: ${commandId}`);
    return true;
  }

  /**
   * Get list of active subscriptions
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Get count of active subscriptions
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Publish a status event (for testing or manual triggering)
   * @param event - The status event to publish
   */
  async publishEvent(event: VMStatusEvent): Promise<void> {
    if (!this.isConnected || !this.publisher) {
      throw new Error('VMStatusSubscriber not connected. Call connect() first.');
    }

    await this.publisher.publish(this.channel, JSON.stringify(event));
  }

  /**
   * Disconnect from Redis and clean up all subscriptions
   */
  async disconnect(): Promise<void> {
    // Clear all subscription timeouts
    for (const subscription of this.subscriptions.values()) {
      clearTimeout(subscription.timeoutId);
    }
    this.subscriptions.clear();

    // Unsubscribe from channel and close connections
    if (this.subscriber) {
      await this.subscriber.unsubscribe(this.channel);
      await this.subscriber.quit();
      this.subscriber = null;
    }

    if (this.publisher) {
      await this.publisher.quit();
      this.publisher = null;
    }

    this.isConnected = false;
    console.log('[VMStatusSubscriber] Disconnected from Redis');
  }
}

/**
 * Singleton instance for server-wide use
 * Use this for shared Redis connections across the app
 */
let sharedSubscriber: VMStatusSubscriber | null = null;

/**
 * Get or create the shared VMStatusSubscriber instance
 * @param redisUrl - Redis connection URL
 */
export function getSharedVMStatusSubscriber(redisUrl?: string): VMStatusSubscriber {
  if (!sharedSubscriber) {
    sharedSubscriber = new VMStatusSubscriber(
      redisUrl || process.env.REDIS_URL || 'redis://localhost:6379'
    );
  }
  return sharedSubscriber;
}

/**
 * Reset the shared subscriber (useful for testing)
 */
export function resetSharedVMStatusSubscriber(): void {
  sharedSubscriber = null;
}
