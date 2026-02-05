/**
 * Server-side authentication utilities
 * Shared between auth endpoints
 */

// In-memory store for auth sessions (use Redis/DB in production)
const authSessions = new Map<string, {
  status: 'pending' | 'completed' | 'failed';
  minionId?: string;
  chatId?: string;
  chatPlatform?: 'whatsapp' | 'telegram';
  tokens?: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  userInfo?: {
    email: string;
    name: string;
    picture?: string;
  };
  error?: string;
  createdAt: number;
}>();

// Clean up old sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  for (const [state, session] of authSessions.entries()) {
    if (now - session.createdAt > fiveMinutes) {
      authSessions.delete(state);
    }
  }
}, 5 * 60 * 1000);

/**
 * Create a new auth session.
 * Called when a minion initiates OAuth.
 */
export function createAuthSession(
  state: string,
  metadata: {
    minionId: string;
    chatId: string;
    chatPlatform: 'whatsapp' | 'telegram';
  }
): void {
  authSessions.set(state, {
    status: 'pending',
    createdAt: Date.now(),
    ...metadata
  });
}

/**
 * Get session data.
 */
export function getAuthSession(state: string) {
  return authSessions.get(state);
}

/**
 * Update session with tokens and mark as completed.
 */
export function completeAuthSession(
  state: string,
  data: {
    tokens: {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };
    userInfo: {
      email: string;
      name: string;
      picture?: string;
    };
  }
): boolean {
  const session = authSessions.get(state);
  if (!session) return false;

  authSessions.set(state, {
    ...session,
    status: 'completed',
    tokens: data.tokens,
    userInfo: data.userInfo
  });
  return true;
}

/**
 * Mark session as failed.
 */
export function failAuthSession(state: string, error: string): boolean {
  const session = authSessions.get(state);
  if (!session) return false;

  authSessions.set(state, {
    ...session,
    status: 'failed',
    error
  });
  return true;
}
