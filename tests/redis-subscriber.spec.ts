import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { VMStatusSubscriber, type VMStatusEvent, type VMStatusCallback } from '../src/lib/server/redis.js';
import Redis from 'ioredis';

// Mock ioredis
vi.mock('ioredis', () => {
  const mockSubscribe = vi.fn().mockResolvedValue(undefined);
  const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
  const mockPublish = vi.fn().mockResolvedValue(1);
  const mockQuit = vi.fn().mockResolvedValue(undefined);
  const mockOn = vi.fn();

  return {
    default: vi.fn().mockImplementation(() => ({
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
      publish: mockPublish,
      quit: mockQuit,
      on: mockOn,
    })),
  };
});

describe('VMStatusSubscriber', () => {
  let subscriber: VMStatusSubscriber;
  const mockRedisUrl = 'redis://localhost:6379';
  const shortTimeoutMs = 100; // Short timeout for faster tests

  beforeEach(() => {
    subscriber = new VMStatusSubscriber(mockRedisUrl, shortTimeoutMs);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await subscriber.disconnect();
  });

  describe('Connection', () => {
    test('should connect to Redis successfully', async () => {
      await subscriber.connect();
      expect(subscriber.getSubscriptionCount()).toBe(0);
    });

    test('should not connect twice', async () => {
      await subscriber.connect();
      await subscriber.connect(); // Second connect should be no-op
      // Should not throw
    });

    test('should handle connection errors gracefully', async () => {
      // The error handler is registered in connect(), so this shouldn't throw
      await subscriber.connect();
      expect(subscriber.getSubscriptionCount()).toBe(0);
    });
  });

  describe('Subscription Management', () => {
    test('should subscribe to a commandId', async () => {
      await subscriber.connect();
      
      const commandId = '550e8400-e29b-41d4-a716-446655440000';
      const callback = vi.fn();
      
      const unsubscribe = subscriber.subscribe(commandId, callback);
      
      expect(subscriber.getSubscriptionCount()).toBe(1);
      expect(subscriber.getActiveSubscriptions()).toContain(commandId);
      expect(typeof unsubscribe).toBe('function');
    });

    test('should throw if subscribing before connecting', () => {
      const commandId = '550e8400-e29b-41d4-a716-446655440000';
      const callback = vi.fn();
      
      expect(() => subscriber.subscribe(commandId, callback)).toThrow(
        'VMStatusSubscriber not connected'
      );
    });

    test('should unsubscribe from a commandId', async () => {
      await subscriber.connect();
      
      const commandId = '550e8400-e29b-41d4-a716-446655440000';
      const callback = vi.fn();
      
      subscriber.subscribe(commandId, callback);
      const result = subscriber.unsubscribe(commandId);
      
      expect(result).toBe(true);
      expect(subscriber.getSubscriptionCount()).toBe(0);
      expect(subscriber.getActiveSubscriptions()).not.toContain(commandId);
    });

    test('should return false when unsubscribing from non-existent commandId', async () => {
      await subscriber.connect();
      
      const result = subscriber.unsubscribe('non-existent-id');
      expect(result).toBe(false);
    });

    test('should replace existing subscription for same commandId', async () => {
      await subscriber.connect();
      
      const commandId = '550e8400-e29b-41d4-a716-446655440000';
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      subscriber.subscribe(commandId, callback1);
      subscriber.subscribe(commandId, callback2);
      
      expect(subscriber.getSubscriptionCount()).toBe(1);
    });

    test('should return unsubscribe function that works', async () => {
      await subscriber.connect();
      
      const commandId = '550e8400-e29b-41d4-a716-446655440000';
      const callback = vi.fn();
      
      const unsubscribe = subscriber.subscribe(commandId, callback);
      expect(subscriber.getSubscriptionCount()).toBe(1);
      
      unsubscribe();
      expect(subscriber.getSubscriptionCount()).toBe(0);
    });
  });

  describe('Event Handling', () => {
    test('should call callback when ACKNOWLEDGED event is received', async () => {
      await subscriber.connect();
      
      const commandId = '550e8400-e29b-41d4-a716-446655440000';
      const callback = vi.fn();
      
      subscriber.subscribe(commandId, callback);
      
      // Get the message handler registered with Redis
      const RedisConstructor = (await import('ioredis')).default;
      const mockInstance = vi.mocked(RedisConstructor).mock.results[0].value;
      const messageHandler = mockInstance.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'message'
      )?.[1];
      
      expect(messageHandler).toBeDefined();
      
      // Simulate incoming message
      const event: VMStatusEvent = {
        status: 'ACKNOWLEDGED',
        commandId,
        message: 'Request received',
        timestamp: new Date().toISOString(),
      };
      
      messageHandler('clawd:responses', JSON.stringify(event));
      
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        status: 'ACKNOWLEDGED',
        commandId,
      }));
    });

    test('should auto-unsubscribe on SUCCESS event', async () => {
      await subscriber.connect();
      
      const commandId = '550e8400-e29b-41d4-a716-446655440000';
      const callback = vi.fn();
      
      subscriber.subscribe(commandId, callback);
      
      // Get the message handler
      const RedisConstructor = (await import('ioredis')).default;
      const mockInstance = vi.mocked(RedisConstructor).mock.results[0].value;
      const messageHandler = mockInstance.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'message'
      )?.[1];
      
      // Simulate SUCCESS event
      const event: VMStatusEvent = {
        status: 'SUCCESS',
        commandId,
        message: 'VM created successfully',
        data: {
          vmId: 'vm-123',
          connectionInfo: {
            telegram: { botUsername: 'test_bot' },
          },
        },
        timestamp: new Date().toISOString(),
      };
      
      messageHandler('clawd:responses', JSON.stringify(event));
      
      // Should call callback
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        status: 'SUCCESS',
        commandId,
        data: expect.objectContaining({ vmId: 'vm-123' }),
      }));
      
      // Should auto-unsubscribe
      expect(subscriber.getSubscriptionCount()).toBe(0);
    });

    test('should auto-unsubscribe on ERROR event', async () => {
      await subscriber.connect();
      
      const commandId = '550e8400-e29b-41d4-a716-446655440000';
      const callback = vi.fn();
      
      subscriber.subscribe(commandId, callback);
      
      // Get the message handler
      const RedisConstructor = (await import('ioredis')).default;
      const mockInstance = vi.mocked(RedisConstructor).mock.results[0].value;
      const messageHandler = mockInstance.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'message'
      )?.[1];
      
      // Simulate ERROR event
      const event: VMStatusEvent = {
        status: 'ERROR',
        commandId,
        message: 'VM creation failed',
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: 'Not enough credits',
        },
        timestamp: new Date().toISOString(),
      };
      
      messageHandler('clawd:responses', JSON.stringify(event));
      
      // Should call callback
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        status: 'ERROR',
        commandId,
        error: expect.objectContaining({ code: 'INSUFFICIENT_CREDITS' }),
      }));
      
      // Should auto-unsubscribe
      expect(subscriber.getSubscriptionCount()).toBe(0);
    });

    test('should handle invalid JSON gracefully', async () => {
      await subscriber.connect();
      
      const commandId = '550e8400-e29b-41d4-a716-446655440000';
      const callback = vi.fn();
      
      subscriber.subscribe(commandId, callback);
      
      // Get the message handler
      const RedisConstructor = (await import('ioredis')).default;
      const mockInstance = vi.mocked(RedisConstructor).mock.results[0].value;
      const messageHandler = mockInstance.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'message'
      )?.[1];
      
      // Simulate invalid JSON
      messageHandler('clawd:responses', 'invalid json{');
      
      // Should not throw and should not call callback
      expect(callback).not.toHaveBeenCalled();
    });

    test('should ignore events without commandId', async () => {
      await subscriber.connect();
      
      const callback = vi.fn();
      subscriber.subscribe('some-id', callback);
      
      // Get the message handler
      const RedisConstructor = (await import('ioredis')).default;
      const mockInstance = vi.mocked(RedisConstructor).mock.results[0].value;
      const messageHandler = mockInstance.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'message'
      )?.[1];
      
      // Simulate event without commandId
      messageHandler('clawd:responses', JSON.stringify({
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
      }));
      
      // Should not call callback
      expect(callback).not.toHaveBeenCalled();
    });

    test('should ignore events for unsubscribed commandIds', async () => {
      await subscriber.connect();
      
      const callback = vi.fn();
      subscriber.subscribe('command-id-1', callback);
      
      // Get the message handler
      const RedisConstructor = (await import('ioredis')).default;
      const mockInstance = vi.mocked(RedisConstructor).mock.results[0].value;
      const messageHandler = mockInstance.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'message'
      )?.[1];
      
      // Simulate event for different commandId
      messageHandler('clawd:responses', JSON.stringify({
        status: 'SUCCESS',
        commandId: 'different-command-id',
        timestamp: new Date().toISOString(),
      }));
      
      // Should not call callback
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Auto-unsubscribe Timer', () => {
    test('should auto-unsubscribe after timeout period', async () => {
      const shortTimeout = 50; // 50ms for fast test
      const testSubscriber = new VMStatusSubscriber(mockRedisUrl, shortTimeout);
      
      await testSubscriber.connect();
      
      const commandId = '550e8400-e29b-41d4-a716-446655440000';
      const callback = vi.fn();
      
      testSubscriber.subscribe(commandId, callback);
      expect(testSubscriber.getSubscriptionCount()).toBe(1);
      
      // Wait for auto-unsubscribe
      await new Promise(resolve => setTimeout(resolve, shortTimeout + 20));
      
      expect(testSubscriber.getSubscriptionCount()).toBe(0);
      
      await testSubscriber.disconnect();
    });

    test('should clear timeout when manually unsubscribing', async () => {
      await subscriber.connect();
      
      const commandId = '550e8400-e29b-41d4-a716-446655440000';
      const callback = vi.fn();
      
      subscriber.subscribe(commandId, callback);
      subscriber.unsubscribe(commandId);
      
      expect(subscriber.getSubscriptionCount()).toBe(0);
      
      // Wait to ensure no timeout issues
      await new Promise(resolve => setTimeout(resolve, shortTimeoutMs + 20));
    });
  });

  describe('Publishing Events', () => {
    test('should publish events', async () => {
      await subscriber.connect();
      
      const event: VMStatusEvent = {
        status: 'ACKNOWLEDGED',
        commandId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: new Date().toISOString(),
      };
      
      await subscriber.publishEvent(event);
      
      // Get the publish function
      const RedisConstructor = (await import('ioredis')).default;
      const mockInstance = vi.mocked(RedisConstructor).mock.results[1].value; // Second instance is publisher
      
      expect(mockInstance.publish).toHaveBeenCalledWith(
        'clawd:responses',
        JSON.stringify(event)
      );
    });

    test('should throw if publishing before connecting', async () => {
      const event: VMStatusEvent = {
        status: 'ACKNOWLEDGED',
        commandId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: new Date().toISOString(),
      };
      
      await expect(subscriber.publishEvent(event)).rejects.toThrow(
        'VMStatusSubscriber not connected'
      );
    });
  });

  describe('Disconnect', () => {
    test('should clear all subscriptions on disconnect', async () => {
      await subscriber.connect();
      
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      subscriber.subscribe('id-1', callback1);
      subscriber.subscribe('id-2', callback2);
      
      expect(subscriber.getSubscriptionCount()).toBe(2);
      
      await subscriber.disconnect();
      
      expect(subscriber.getSubscriptionCount()).toBe(0);
    });

    test('should handle disconnect when not connected', async () => {
      // Should not throw
      await subscriber.disconnect();
    });
  });
});

describe('VMStatusSubscriber Singleton', () => {
  test('should return same instance for getSharedVMStatusSubscriber', async () => {
    const { getSharedVMStatusSubscriber, resetSharedVMStatusSubscriber } = await import('../src/lib/server/redis.js');
    
    resetSharedVMStatusSubscriber();
    
    const instance1 = getSharedVMStatusSubscriber('redis://test:6379');
    const instance2 = getSharedVMStatusSubscriber('redis://different:6379');
    
    expect(instance1).toBe(instance2);
  });
});
