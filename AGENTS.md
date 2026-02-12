# AGENTS.md - Project Context for AI Assistants

> **⚠️ IMPORTANT:** This file MUST be updated when making significant changes to architecture, dependencies, or conventions. Keep it current!

## Project Overview

**Minion** is a web application for deploying AI-powered assistant "minions" that integrate with cloud services and communicate via WhatsApp/Telegram.

- **Framework:** SvelteKit with TypeScript
- **Styling:** CSS (no Tailwind)
- **3D Graphics:** Three.js for character avatars
- **Deployment:** Docker container (`ticruz38/minion`)
- **Auth:** Google OAuth 2.0 (Web application type)

---

## Architecture

```
src/
├── lib/
│   ├── components/          # Reusable Svelte components
│   │   ├── MinionAvatar3D.svelte    # Three.js 3D character renderer
│   │   ├── CharacterSelector.svelte # Video game-style character picker
│   │   └── VMCreationModal.svelte   # Multi-step VM creation modal
│   ├── server/
│   │   ├── auth.ts          # Server-side auth session management
│   │   ├── bot-service.ts   # Bot lifecycle Redis operations
│   │   ├── team-service.ts  # Team management Redis operations
│   │   ├── redis.ts         # VM status subscriber
│   │   └── logger.ts        # Debug logging utilities
│   └── types.ts             # Shared TypeScript interfaces
├── routes/
│   ├── +page.svelte         # Homepage with hero + character selector
│   ├── team/[id]/           # Team dashboard page
│   ├── auth/callback/       # OAuth callback page
│   ├── api/auth/            # Auth endpoints (init, callback, notify)
│   ├── api/bots/            # Bot CRUD endpoints
│   ├── api/team/            # Team management endpoints
│   └── api/vms/             # VM creation endpoint (deprecated)
├── app.html                 # HTML template
└── app.css                  # Global styles + CSS variables
```

---

## Key Dependencies

```json
{
  "@sveltejs/kit": "^2.0.0",
  "@sveltejs/adapter-node": "^5.5.2",
  "three": "^0.160.0",
  "svelte": "^4.2.7",
  "vite": "^5.0.3"
}
```

**CRITICAL:** This project uses **Three.js** for 3D rendering. Always ensure Three.js components are properly disposed to avoid memory leaks.

---

## Coding Conventions

### Component Structure
- Use TypeScript interfaces for props
- Prefer CSS custom properties (variables) for theming
- Use CSS modules (scoped `<style>`) over global styles
- Implement proper cleanup in `onDestroy` for Three.js components

### Naming
- Components: PascalCase (`MinionAvatar3D.svelte`)
- Utilities: camelCase (`auth.ts`)
- CSS variables: kebab-case (`--minion-color`)

### Styling
- Use CSS variables defined in `app.css` for consistency
- Color format: `rgba()` or hex with alpha channel
- Responsive breakpoints:
  - Mobile: `max-width: 768px`
  - Tablet: `max-width: 1100px`

### 3D Components (Three.js)
Always include cleanup:
```typescript
onDestroy(() => {
  if (animationId) cancelAnimationFrame(animationId);
  if (renderer) {
    renderer.dispose();
    container?.removeChild(renderer.domElement);
  }
  // Dispose geometries and materials
});
```

### SSR-Safe Browser APIs
**CRITICAL:** SvelteKit renders on the server where `window` and `document` don't exist.

Always guard browser-only code:
```typescript
onMount(() => {
  // This only runs in browser, safe to use window
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handler);
  }
  
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handler);
    }
  };
});
```

**Never access `window`/`document` at module level or during SSR** - it will cause 500 errors.

---

## Environment Variables

Required for OAuth (Google):
```bash
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
PUBLIC_BASE_URL=https://minion.nuts.cash
```

Required for Bot Creation (LLM):
```bash
# LLM API Key for bot AI model (required for bot creation)
# Get from: https://platform.moonshot.cn/ (for Kimi K2.5)
LLM_API_KEY=sk-your-api-key-here

# LLM Model to use (optional, defaults to moonshot/kimi-k2.5)
LLM_MODEL=moonshot/kimi-k2.5
```

Required for VM/Bot Orchestration:
```bash
REDIS_URL=redis://localhost:6379
# or with TLS: rediss://:password@host:port
```

Debug Logging:
```bash
# Enable detailed logging for bot operations
DEBUG_BOT=true           # Enable all logs
DEBUG_BOT=debug          # Debug level and above
DEBUG_BOT=info           # Info level and above  
DEBUG_BOT=warn           # Warnings and errors only
DEBUG_BOT=error          # Errors only (default if not set)
DEBUG_BOT=redis          # Redis-specific logs only
DEBUG_BOT=lifecycle      # Bot lifecycle logs only
DEBUG_BOT=false          # Disable all logs (errors still shown)
```

**Note:** OAuth callback URL must be registered in Google Cloud Console:
- `https://minion.nuts.cash/auth/callback`

---

## Development Server Ports

**⚠️ AGENTS:** This app uses deterministic ports configured in `vite.config.ts`:

| Command | Port | Config |
|---------|------|--------|
| `npm run dev` | **3010** | `server.port` |
| `npm run preview` | **3011** | `preview.port` |

---

## Docker Build

AMD64 image for Linux servers:
```bash
docker build --platform linux/amd64 -t ticruz38/minion:amd64 .
docker push ticruz38/minion:amd64
```

**Automated via GitHub Actions:** Pushes to `main` trigger automatic builds.

---

## Important Notes

### Character Selector (3D)
- Located in `src/lib/components/CharacterSelector.svelte`
- Uses `MinionAvatar3D.svelte` for rendering
- Supports keyboard navigation (← → Enter) and touch swipes
- Mobile has different UI (single avatar + thumbnails vs 3D carousel)
- **Hire button** dispatches `hireMinion` custom event with selected minion data

### VM Creation Modal
- Located in `src/lib/components/VMCreationModal.svelte`
- Multi-step modal for configuring and launching VM bots
- Uses Svelte transitions (`fade`, `scale`) for smooth animations
- Props: `isOpen`, `selectedMinion` (with `id`, `name`, `color`)
- Events: `on:close`, `on:success`
- Full-screen overlay with `backdrop-filter: blur(12px)`
- Mobile: full viewport height with bottom-fixed action buttons
- Tracks form dirty state for close confirmation

### VM Creation Flow
1. User clicks **HIRE** on a Minion → `hire` event dispatched via Svelte's `createEventDispatcher`
2. Modal opens with selected Minion data (id, name, color)
3. User configures bot through 5 steps (name, channels, config, security, review)
4. On successful launch: modal shows progress with real-time SSE updates
5. API POST `/api/bots` creates bot and returns `bot_id`
6. Frontend connects to SSE endpoint `/api/bots/[id]/events` for real-time status updates
7. Backend subscribes to Redis `clawd:responses` and streams events to frontend
8. On `SUCCESS` or `ERROR`, SSE connection closes and modal shows final state

### Redis Pub/Sub Service (VM Status Updates)
Located at `src/lib/server/redis.ts`

**NEW: Server-Sent Events (SSE) for Real-Time Updates**

The frontend now receives real-time bot creation status via SSE:

```typescript
// Connect to SSE endpoint
const eventSource = new EventSource(`/api/bots/${botId}/events`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // data.status: 'ACKNOWLEDGED' | 'SUCCESS' | 'ERROR'
  // data.message?: string
  // data.data?: { vmId?, connectionInfo? }
  // data.error?: { code, message }
};
```

**SSE Endpoint:** `GET /api/bots/[id]/events`
- Returns `text/event-stream` with real-time status updates
- Subscribes to Redis `clawd:responses` channel
- Filters events by `bot_id`
- Auto-closes on terminal states (SUCCESS/ERROR)
- Located at `src/routes/api/bots/[id]/events/+server.ts`

**Event Flow:**
```
Frontend → POST /api/bots → Backend creates bot → Returns bot_id
     ↓
Frontend → EventSource(`/api/bots/${bot_id}/events`)
     ↓
Backend → Subscribe to Redis 'clawd:responses' → Stream matching events
     ↓
VM/Worker → Publish events with bot_id → Frontend receives real-time updates
```

**VMStatusSubscriber Class:**
```typescript
import { VMStatusSubscriber } from '$lib/server/redis.js';

const subscriber = new VMStatusSubscriber(
  process.env.REDIS_URL || 'redis://localhost:6379',
  10 * 60 * 1000 // 10 minute auto-unsubscribe timeout
);

// Connect to Redis
await subscriber.connect();

// Subscribe to a commandId for real-time updates
const unsubscribe = subscriber.subscribe(commandId, (event) => {
  switch (event.status) {
    case 'ACKNOWLEDGED':
      console.log('Request received by backend');
      break;
    case 'SUCCESS':
      console.log('VM created:', event.data?.vmId);
      break;
    case 'ERROR':
      console.error('VM creation failed:', event.error?.message);
      break;
  }
});

// Clean up when done
unsubscribe(); // or subscriber.unsubscribe(commandId)
await subscriber.disconnect();
```

**Features:**
- Subscribes to `clawd:responses` channel
- Auto-unsubscribes after 10 minutes (configurable) to prevent memory leaks
- Auto-unsubscribes on terminal states (SUCCESS/ERROR)
- Handles ACKNOWLEDGED, SUCCESS, and ERROR events
- Singleton pattern via `getSharedVMStatusSubscriber()` for server-wide use

**Event Types:**
```typescript
type VMStatus = 'ACKNOWLEDGED' | 'SUCCESS' | 'ERROR';
interface VMStatusEvent {
  status: VMStatus;
  commandId: string;
  message?: string;
  data?: { vmId?: string; connectionInfo?: {...} };
  error?: { code: string; message: string };
  timestamp: string;
}
```

**Bot Creation Command (Redis Protocol):**
```typescript
interface BotCommand {
  type: 'CREATE';
  bot_id: string;
  team_id: string;
  profiles: string[];
  config: {
    name: string;
    model: string;        // From LLM_MODEL env var
    api_key: string;      // From LLM_API_KEY env var
    memory: string;       // e.g., '2g'
    cpus: string;         // e.g., '1'
    channels: {...};      // Telegram/Discord/WhatsApp config
  };
  resources: {
    memory: string;
    cpus: string;
    disk: string;
  };
}
```
**Note:** The `api_key` comes from the server environment (`LLM_API_KEY`), NOT from the frontend request (security).

---

### Debug Logging
Located at `src/lib/server/logger.ts`

**Configure via environment:**
```bash
DEBUG_BOT=true      # All logs
DEBUG_BOT=debug     # Debug+
DEBUG_BOT=info      # Info+
DEBUG_BOT=warn      # Warnings+
DEBUG_BOT=error     # Errors only (default)
DEBUG_BOT=redis     # Redis-specific only
DEBUG_BOT=lifecycle # Lifecycle events only
DEBUG_BOT=false     # Minimal logging
```

**Usage:**
```typescript
import { botLogger, redisLogger, sseLogger, apiLogger } from '$lib/server/logger.js';

botLogger.debug('Debug message', { context: 'value' });
botLogger.info('Bot created', { botId, vmId });
botLogger.warn('Slow operation', { duration: 5000 });
botLogger.error('Failed', { botId, error: err.message });

// Timing operations
const result = await botLogger.time('Redis op', () => redis.hgetall(key));
```

**Log Output:**
```
2026-02-09T15:30:00.000Z [Bot][INFO] Bot created {"botId":"bot_abc123","vmId":"vm-001"}
2026-02-09T15:30:00.500Z [Redis][DEBUG] [Redis] HSET bot:bot_abc123 {...}
```

### Bot Creation API (Multi-Channel) - NEW
Located at `src/routes/api/bots/+server.ts`

**NEW:** The bot creation API has been moved from `/api/vms` to `/api/bots` with real-time SSE updates.

**Request Schema:**
```typescript
POST /api/bots
Content-Type: application/json

{
  name: string;              // 3-30 chars, alphanumeric + hyphens
  team_id: string;           // Team that owns the bot (required)
  minionId: string;          // Selected minion type
  channels: {                // At least one channel required
    telegram?: { enabled: true, token: string, dmPolicy: 'pairing'|'allowlist'|'open', allowedUsers?: string[] }
    discord?: { enabled: true, token: string, dmPolicy: 'pairing'|'allowlist'|'open', allowedUsers?: string[] }
    whatsapp?: { enabled: true, phoneNumber: string, apiKey: string, webhookUrl?: string, dmPolicy: 'pairing'|'allowlist'|'open', allowedUsers?: string[] }
  }
}
```

**Response:**
```typescript
HTTP 201 Created
{
  success: true;
  message: 'Bot created successfully';
  bot_id: string;            // Unique bot identifier (e.g., bot_abc123xyz)
  vm_id: string;             // VM where bot is scheduled
}
```

**Real-Time Status Updates (SSE):**
```typescript
// After getting bot_id, connect to SSE endpoint
const eventSource = new EventSource(`/api/bots/${bot_id}/events`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  switch (data.status) {
    case 'ACKNOWLEDGED':
      console.log('Request acknowledged');
      break;
    case 'SUCCESS':
      console.log('Bot ready:', data.data.connectionInfo);
      eventSource.close();
      break;
    case 'ERROR':
      console.error('Failed:', data.error.message);
      eventSource.close();
      break;
  }
};
```

### VM Creation API (DEPRECATED)
Located at `src/routes/api/vms/+server.ts`

**⚠️ DEPRECATED:** Use `/api/bots` instead. This endpoint is kept for backward compatibility and returns `X-Deprecated: true` header.

**Request Schema:**
```typescript
POST /api/vms
Content-Type: application/json

{
  id: string;              // Required: UUID v4 for Redis correlation
  name: string;            // 3-30 chars, alphanumeric + hyphens
  minionId: string;        // Selected minion type
  channels: {              // At least one channel required
    telegram?: {
      enabled: true;
      token: string;       // Format: digits:alphanumeric
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
      phoneNumber: string; // E.164 format: +1234567890
      apiKey: string;
      webhookUrl?: string;
      dmPolicy: 'pairing' | 'allowlist' | 'open';
      allowedUsers?: string[];
    };
  }
}
```

**Response:**
```typescript
HTTP 202 Accepted
{
  success: true;
  message: 'VM creation request accepted for processing';
  commandId: string;       // Use to subscribe to Redis clawd:responses
  vm: { name: string; minionId: string; };
}
```

**Important:**
- Frontend must generate UUID v4 for `id` field before sending request
- Use this `id` to subscribe to `clawd:responses` Redis channel for real-time updates
- Returns HTTP 202 (Accepted) not 201 (Created) since processing is async
- At least one channel must have `enabled: true`

### Authentication Flow
1. User clicks "Connect" → backend creates session
2. Redirect to Google OAuth
3. Google redirects to `/auth/callback`
4. Frontend exchanges code with backend at `/api/auth/callback`
5. Backend polls `/api/auth/callback?state=xxx` for completion

**API Response Format (when completed):**
```json
{
  "status": "completed",
  "userInfo": { "email": "...", "name": "..." },
  "access_token": "ya29...",
  "refresh_token": "1//0d...",
  "expires_in": 3600
}
```
**Note:** OAuth tokens are now returned in API responses so external bots/clients can use them directly.

### Scroll-Driven 3D Story Experience
Located at `src/lib/components/ScrollStory3D.svelte` + `StoryOverlay.svelte`

**Homepage Experience:**
Instead of traditional scrolling, the homepage uses **wheel/trackpad input** to drive a 3D animation timeline that tells the story of hiring a minion.

**Story Phases (scroll-driven):**

| Phase | Scroll Range | 3D Animation | HTML Overlay |
|-------|--------------|--------------|--------------|
| **INTRO** | 0-15% | Robot idle, floating | "Meet Your New Assistant" |
| **WAKE_UP** | 15-25% | Robot wakes, eyes brighten | "They Wake Up Ready" |
| **CAPABILITY_1** | 25-40% | Robot turns, message bubbles appear | "Read & Understand" + email preview |
| **CAPABILITY_2** | 40-55% | Robot processes, invoice animation | "Organize & Track" + invoice flow |
| **CAPABILITY_3** | 55-70% | Chat bubbles, app icons orbit | "Respond & Act" + chat preview |
| **SUMMARY** | 70-85% | All features visible, icons pulse | "All In One Place" + feature grid |
| **CTA** | 85-100% | Robot scales up, inviting | "Ready to Hire?" + CTA button |

**Key Features:**
- **Scroll controls 3D timeline** - No HTML scrolling, scene evolves
- **Smooth interpolation** - Scroll position smoothly animates 3D elements
- **HTML overlays fade** synchronized with 3D phases
- **Message bubbles** - 3D rounded squares with "glass" material
- **App icons** - Floating 3D squares with Telegram/Discord/WhatsApp colors
- **Progress dots** - Right side indicator showing story progress
- **Mouse parallax** - Camera subtly follows cursor

**Technical:**
```typescript
// Scroll progress 0-1 controls entire experience
// Reduced sensitivity (0.0003) for smoother scrolling
targetScrollProgress += wheelEvent.deltaY * 0.0003;

// Smooth interpolation (0.08 factor)
scrollProgress += (targetScrollProgress - scrollProgress) * 0.08;

// Bidirectional fly transitions
in:fly={{ y: 30 * direction, duration: 500, delay: 100 }}
out:fly={{ y: -30 * direction, duration: 300 }}

// Smooth interpolation
scrollProgress += (targetScrollProgress - scrollProgress) * 0.08;

// Phase detection
const phase = detectPhase(scrollProgress);
```

**Visual Elements:**
- 3D message bubbles with "tails"
- Floating app icons that orbit
- Email/invoice/chat preview cards in HTML overlay
- Glowing robot eyes that brighten on wake
- Particle system that rotates with scroll

### Shared 3D Scene Component
Located at `src/lib/components/Minion3DScene.svelte`

**Usage:**
```svelte
<Minion3DScene 
  selectedMinionIndex={0}
  onSelectMinion={(index) => console.log(index)}
  filterIndices={[0, 1, 2, 3]} // null = show all
  layout="carousel" // 'carousel' | 'grid'
/>
```

**Features:**
- 15 floating robot avatars with procedural geometry
- Warm atmospheric lighting (orange/gold tones)
- Mouse parallax camera movement
- Floating animation with sine wave motion
- Click to select minions
- Supports filtering (shows subset of minions)
- Two layout modes: carousel (hero) or grid (filtered view)
- Dust particles for atmosphere

**Used on:**
- **Homepage** (`/`) - Full carousel, all 15 minions
- **Minions page** (`/minions`) - With filtering, switches to grid when filtered

### Brand Design System
Located at `docs/BRAND_DESIGN.md`

**Visual Identity:** "The Professional Automaton" - Vintage-inspired AI assistants with a tangible, artisanal feel.

**Color Palette:**

| Category | Colors |
|----------|--------|
| **Backgrounds** | Cream `#F7F5F0`, Warm White `#FAF9F6`, Dusty Blue `#6B7B8C`, Slate `#3D4A5C` |
| **Accents** | Mustard `#D4A853`, Ochre `#C9963C`, Copper `#B87333`, Terracotta `#C17A5C` |
| **Text** | Charcoal `#2C3E50`, Graphite `#5A6B7C`, Mist `#9AA5B1` |
| **Borders** | Stone `#E5E1D8`, Cloud `#F0EDE6` |

**Typography:**
- **Headings**: Space Grotesk (600-700 weight)
- **Body**: Inter (400-600 weight)
- **Code/Mono**: JetBrains Mono

**Key Design Principles:**
- Muted pastel colors inspired by vintage robots (see `/root/code/minion/u4267255975_I_am_creating_an_army_of_bots_as_diverse_as_an_ac_71dbc415-25d4-4027-a92a-ecb467d5b4a0_2.png`)
- Minimalist yet serious aesthetic
- Subtle shadows and soft elevations
- Warm mustard/yellow accents for CTAs
- Dusty blues and greens for minion differentiation

**CSS Variables:** All brand colors available in `src/app.css`:
```css
var(--color-cream)
var(--color-mustard)
var(--color-charcoal)
/* etc. */
```

### Minions Directory Page
Located at `src/routes/minions/+page.svelte`

**Features:**
- Grid layout showing all 15 minion profiles
- Search by name, role, skill, or tag
- Tag-based filtering (finance, accounting, etc.)
- Skill preview with P0/P1/P2 priority indicators
- Skill detail modal showing all skills with descriptions
- Direct hire flow from any minion card

**Data Source:** `src/lib/minions-data.ts`
- Contains all 15 minion profiles
- Each minion has 5 skills with priority levels (P0/P1/P2)
- Skills are searchable and filterable

**15 Minion Profiles:**

| ID | Name | Role | Color |
|----|------|------|-------|
| accountant | **Benny** | Accountant | `#10b981` |
| secretary | **Terry** | Secretary | `#06b6d4` |
| trader | **Troy** | Trader | `#6366f1` |
| realtor | **Owen** | Realtor | `#f59e0b` |
| analyst | **Barry** | Analyst | `#8b5cf6` |
| restaurant | **Sergio** | Restaurant | `#ef4444` |
| support | **Tim** | Support | `#ec4899` |
| content-creator | **Casey** | Content Creator | `#f43f5e` |
| invoice-chaser | **Chase** | Invoice Chaser | `#f59e0b` |
| receipt-tracker | **Rex** | Receipt Tracker | `#14b8a6` |
| researcher | **Russ** | Researcher | `#3b82f6` |
| email-handler | **Ian** | Email Handler | `#0ea5e9` |
| gift-guru | **Gigi** | Gift Guru | `#8b5cf6` |
| meal-planner | **Chip** | Meal Planner | `#10b981` |
| handyman | **Hank** | Handyman | `#eab308` |
| trip-planner | **Tina** | Trip Planner | `#ec4899` |

**Skill Priority Levels:**
- **P0 (Critical):** 35 skills - Core functionality
- **P1 (Important):** 20 skills - Feature complete
- **P2 (Nice-to-have):** 15 skills - Polish

### Team Dashboard Page
Located at `src/routes/team/[id]/+page.svelte`

**Team Management Interface:**
- View all bots for a team with parsed configurations
- Display bot status (running/stopped/error) with visual indicators
- Show connected channels (Telegram/Discord/WhatsApp) as tags
- Start/Stop/Delete bot actions with loading states
- Credit management UI with "Add Credits" modal
- Team statistics cards (total/running/stopped/error bots)

**API Endpoints:**
```typescript
// Get team dashboard data
GET /api/team/[id]
Response: {
  success: boolean;
  team: { team_id, name, credits };
  bots: ParsedBot[];      // Bots with parsed config and computed fields
  stats: { totalBots, runningBots, stoppedBots, errorBots };
}

// Add credits to team
POST /api/team/[id]/credits
Body: { amount: number }
Response: { success, message, team_id, amount, new_balance }

// Get team credits
GET /api/team/[id]/credits
Response: { success, team_id, credits }
```

**Team Service (`src/lib/server/team-service.ts`):**
```typescript
import { getTeam, getTeamStats, addTeamCredits, deductTeamCredits } from '$lib/server/team-service.js';

// Get team data (returns default if not in Redis)
const team = await getTeam(teamId);

// Get team statistics
const stats = await getTeamStats(teamId);

// Add credits (atomic HINCRBY)
const newBalance = await addTeamCredits(teamId, amount);

// Deduct credits (returns false if insufficient)
const success = await deductTeamCredits(teamId, amount);
```

**Redis Schema for Teams:**
```
Hash: team:{team_id}
  - team_id: string
  - name: string
  - credits: string (number)
  - created_at: ISO timestamp

Set: team:{team_id}:bots
  - Contains bot_id values for the team
```

### When to Update This File

**MUST update AGENTS.md when:**
- [ ] Adding/removing major dependencies (Three.js, adapters, etc.)
- [ ] Changing project structure or file locations
- [ ] Modifying OAuth flow or auth architecture
- [ ] Adding new environment variables
- [ ] Changing Docker build process
- [ ] Updating responsive breakpoints or CSS conventions
- [ ] Modifying the 3D avatar system or character selector

**Update checklist:**
1. Edit this file with the changes
2. Commit with message mentioning "Update AGENTS.md"
3. Ensure the change is documented in both code comments AND this file

---

## Common Tasks

### Add a new Minion type
1. Update `minions` array in `CharacterSelector.svelte`
2. Add profession shape/accessory mapping in `MinionAvatar3D.svelte`
3. Update this file's documentation

## Current Minions (with funny names!)

| ID | Name | Role | Color |
|----|------|------|-------|
| accountant | **Benny** | Accounting & bookkeeping | `#10b981` (Green) |
| realtor | **Owen** | Real estate scouting | `#f59e0b` (Orange) |
| analyst | **Barry** | Financial analysis | `#8b5cf6` (Purple) |
| restaurant | **Sergio** | Restaurant management | `#ef4444` (Red) |
| scheduler | **Terry** | Calendar & scheduling | `#06b6d4` (Cyan) |
| support | **Tim** | Customer support | `#ec4899` (Pink) |

### Update 3D avatar
1. Edit `MinionAvatar3D.svelte`
2. Ensure proper disposal in cleanup
3. Test on both desktop and mobile

### Modify auth
1. Check `src/lib/server/auth.ts` for session logic
2. Update OAuth callback handling in `src/routes/api/auth/callback/+server.ts`
3. Update environment variable docs in this file

---

## Last Updated

2025-02-05 - Added 3D character selector, mobile responsiveness, GitHub Actions  
2025-02-05 - OAuth tokens now returned in API responses for external bot integration
2025-02-06 - Added VMCreationModal component, VM creation API endpoint, SSR-safe patterns
2025-02-06 - US-007: Integrated modal with CharacterSelector, added toast notification system  
2026-02-07 - Deterministic ports (3010 dev, 3011 preview) configured in vite.config.ts
2026-02-07 - US-001: Multi-channel VM creation API with UUID correlation and Redis pub/sub
2026-02-07 - US-002: Redis subscription service for real-time VM status updates with auto-cleanup
2026-02-09 - Added SSE endpoint `/api/bots/[id]/events` for real-time bot creation status updates
2026-02-09 - Added configurable debug logging system (`DEBUG_BOT` env var)
2026-02-10 - Added Team Dashboard page (`/team/[id]`) for managing bots and credits
2026-02-10 - Added Minions Directory page (`/minions`) with all 15 profiles and 60 skills
2026-02-10 - **BRAND REFRESH**: New vintage/minimalist design system with pastel colors
2026-02-10 - **SHARED 3D SCENE**: Both homepage and /minions use same immersive 3D scene

**Maintainers:** Update this date when modifying this file.
