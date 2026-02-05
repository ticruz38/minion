import { json, type RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { getAuthSession, failAuthSession } from '$lib/server/auth';

/**
 * POST /api/auth/notify
 * 
 * Called by the callback page to notify backend of auth result.
 * This can trigger webhooks to minions or just update session status.
 * 
 * Request body: {
 *   state: string;
 *   success: boolean;
 *   error?: string;
 *   errorDescription?: string;
 * }
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { state, success, error: errorMsg, errorDescription } = body;

    if (!state) {
      throw error(400, 'Missing state parameter');
    }

    const session = getAuthSession(state);
    
    if (!session) {
      throw error(404, 'Session not found');
    }

    // Update session status if error occurred
    if (!success && errorMsg) {
      failAuthSession(state, errorDescription || errorMsg);
      
      console.log(`[Auth Notify] Auth failed for session ${state}: ${errorMsg}`);
      
      // Example webhook to minion (implement this based on your architecture)
      // await notifyMinion(session.minionId, {
      //   type: 'auth_failed',
      //   chatId: session.chatId,
      //   error: errorMsg,
      //   errorDescription: errorDescription
      // });
    }

    return json({
      success: true,
      message: 'Notification received'
    });

  } catch (err) {
    console.error('[Auth Notify Error]', err);
    
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    
    return json({
      success: false,
      message: err instanceof Error ? err.message : 'Notification failed'
    }, { status: 500 });
  }
};

/**
 * Example webhook implementation (uncomment and adapt for your minion infrastructure):
 * 
 * async function notifyMinion(minionId: string, payload: unknown) {
 *   // Option 1: If minions expose HTTP endpoints
 *   await fetch(`https://minion-${minionId}.your-platform.com/webhook`, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(payload)
 *   });
 * 
 *   // Option 2: If using a message queue (Redis pub/sub, RabbitMQ, etc.)
 *   // await redisClient.publish(`minion:${minionId}`, JSON.stringify(payload));
 * 
 *   // Option 3: If using WebSocket connections
 *   // websocketServer.to(minionId).emit('auth_result', payload);
 * }
 */
