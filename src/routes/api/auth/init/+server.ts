import { json, type RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { createAuthSession } from '$lib/server/auth';

/**
 * POST /api/auth/init
 * 
 * Initiates an OAuth flow for a minion.
 * Called by your minion VM when it needs to authenticate a user.
 * 
 * Request body: {
 *   minionId: string;
 *   chatId: string;
 *   chatPlatform: 'whatsapp' | 'telegram';
 *   scopes?: string[];  // optional, defaults to basic profile
 * }
 * 
 * Response: {
 *   state: string;
 *   authUrl: string;  // URL for the user to click
 * }
 */
export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const body = await request.json();
    const { minionId, chatId, chatPlatform, scopes } = body;

    // Validate required fields
    if (!minionId || !chatId || !chatPlatform) {
      throw error(400, 'Missing required fields: minionId, chatId, chatPlatform');
    }

    if (!['whatsapp', 'telegram'].includes(chatPlatform)) {
      throw error(400, 'Invalid chatPlatform. Must be "whatsapp" or "telegram"');
    }

    // Generate unique state parameter
    const state = generateState();

    // Store session
    createAuthSession(state, {
      minionId,
      chatId,
      chatPlatform,
    });

    // Build Google OAuth URL
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
    const baseUrl = process.env.PUBLIC_BASE_URL || `${url.protocol}//${url.host}`;
    const redirectUri = `${baseUrl}/auth/callback`;

    const defaultScopes = [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/drive.readonly'
    ];

    const authScopes = scopes || defaultScopes;

    const authUrl = buildGoogleAuthUrl({
      clientId: GOOGLE_CLIENT_ID || 'demo_client_id',
      redirectUri,
      state,
      scopes: authScopes,
      // Optional: force consent screen to ensure refresh token
      prompt: 'consent',
      accessType: 'offline'
    });

    console.log(`[Auth Init] Created session for minion ${minionId}, chat ${chatId}`);

    return json({
      success: true,
      state,
      authUrl,
      expiresIn: 300 // 5 minutes
    });

  } catch (err) {
    console.error('[Auth Init Error]', err);
    
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    
    return json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to initialize auth'
    }, { status: 500 });
  }
};

/**
 * Generate a cryptographically secure random state parameter.
 */
function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Build Google OAuth authorization URL.
 */
function buildGoogleAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes: string[];
  prompt?: string;
  accessType?: string;
}): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('state', params.state);
  url.searchParams.set('scope', params.scopes.join(' '));
  url.searchParams.set('response_type', 'code');
  
  if (params.prompt) {
    url.searchParams.set('prompt', params.prompt);
  }
  
  if (params.accessType) {
    url.searchParams.set('access_type', params.accessType);
  }

  return url.toString();
}
