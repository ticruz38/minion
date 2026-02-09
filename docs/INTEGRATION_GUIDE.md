# Clawd Integration Guide for Frontend Developers

## What You're Building

A web interface where users can:
- Create bots (trader, secretary, accountant, etc.)
- View running bots
- Stop/start/delete bots
- Add credits to bots
- Monitor VM capacity

## Architecture Overview

```
User → Your SvelteKit App → Scheduler API → Redis → VM Agent → Docker Bot
```

You only need to implement the **Scheduler API** part. The rest is handled by Clawd.

## What You Need

1. **Redis Connection** - Credentials for redis.nuts.cash
2. **This Guide** - API reference
3. **Two Doc Files:**
   - `SCHEDULER_API.md` - High-level TypeScript APIs
   - `REDIS_PROTOCOL.md` - Low-level Redis commands

## Quick Start (5 Minutes)

### 1. Install Dependencies

```bash
npm install ioredis nanoid
```

### 2. Create Redis Client

```typescript
// lib/redis.ts
import { Redis } from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST,      // redis.nuts.cash
  port: parseInt(process.env.REDIS_PORT), // 443
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {
    servername: process.env.REDIS_HOST
  } : undefined
});
```

### 3. Create a Bot

```typescript
// routes/api/bots/+server.ts
import { json } from '@sveltejs/kit';
import { redis } from '$lib/redis';
import { nanoid } from 'nanoid';

export async function POST({ request }) {
  const { team_id, profile, config } = await request.json();
  
  // 1. Find best VM
  const vms = await redis.keys('vm:*');
  const vmData = await Promise.all(vms.map(k => redis.hgetall(k)));
  const bestVm = vmData
    .filter(v => v.status === 'healthy')
    .sort((a, b) => parseInt(b.ram_available) - parseInt(a.ram_available))[0];
  
  if (!bestVm) {
    return json({ error: 'No VMs available' }, { status: 503 });
  }
  
  // 2. Create bot
  const botId = `bot_${nanoid(10)}`;
  
  await redis.lpush(`vm:${bestVm.vm_id}:queue`, JSON.stringify({
    type: 'CREATE',
    bot_id: botId,
    team_id,
    profiles: [profile],
    config
  }));
  
  // 3. Track bot
  await redis.hset(`bot:${botId}`, {
    vm_id: bestVm.vm_id,
    team_id,
    status: 'pending',
    created_at: new Date().toISOString()
  });
  
  return json({ bot_id: botId, vm_id: bestVm.vm_id });
}
```

### 4. List Bots

```typescript
// routes/api/bots/+server.ts
export async function GET({ url }) {
  const teamId = url.searchParams.get('team_id');
  
  const botIds = await redis.smembers(`team:${teamId}:bots`);
  const bots = await Promise.all(
    botIds.map(async id => {
      const bot = await redis.hgetall(`bot:${id}`);
      return { id, ...bot };
    })
  );
  
  return json(bots);
}
```

### 5. Frontend Component

```svelte
<!-- routes/bots/+page.svelte -->
<script>
  let bots = [];
  let profile = 'trader';
  
  async function createBot() {
    const res = await fetch('/api/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_id: 'tm-abc',
        profile,
        config: { memory: '2g' }
      })
    });
    const data = await res.json();
    bots = [...bots, data];
  }
  
  async function loadBots() {
    const res = await fetch('/api/bots?team_id=tm-abc');
    bots = await res.json();
  }
</script>

<select bind:value={profile}>
  <option value="trader">Trader</option>
  <option value="secretary">Secretary</option>
  <option value="accountant">Accountant</option>
</select>

<button on:click={createBot}>Create Bot</button>

<ul>
  {#each bots as bot}
    <li>{bot.id} - {bot.status} on {bot.vm_id}</li>
  {/each}
</ul>
```

## Environment Variables

```bash
# .env
REDIS_HOST=redis.nuts.cash
REDIS_PORT=443
REDIS_PASSWORD=your-password
REDIS_TLS=true
```

## API Endpoints You Need

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bots` | GET | List team's bots |
| `/api/bots` | POST | Create new bot |
| `/api/bots/:id/stop` | POST | Stop bot |
| `/api/bots/:id/start` | POST | Start bot |
| `/api/bots/:id/delete` | POST | Delete bot |
| `/api/bots/:id/credits` | POST | Add credits |
| `/api/vms` | GET | List VMs and capacity |

## Key Concepts

### 1. VM Selection (Automatic)

Don't let users pick VMs. The scheduler picks the best one:

```typescript
const bestVm = vms
  .filter(v => v.status === 'healthy')
  .sort((a, b) => b.ram_available - a.ram_available)[0];
```

### 2. Bot Status Lifecycle

```
pending → running → stopped → deleted
   ↑         ↓        ↓
   └─────────┴────────┘
```

- **pending**: Command sent, waiting for agent
- **running**: Bot container active
- **stopped**: Container stopped (can restart)
- **deleted**: Container removed

### 3. Profiles vs Skills

- **Profiles** (required): Pre-defined roles (trader, secretary, accountant)
- **Skills** (optional): Additional capabilities (calendar, email, etc.)

## Common Tasks

### Check System Capacity

```typescript
const vms = await redis.keys('vm:*');
const capacity = await Promise.all(vms.map(async k => {
  const v = await redis.hgetall(k);
  return {
    vm: v.vm_id,
    ram: `${v.ram_available}GB / ${v.ram_total}GB`,
    bots: v.bot_count
  };
}));
```

### Wait for Bot to be Ready

```typescript
async function waitForBot(botId: string, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const bot = await redis.hgetall(`bot:${botId}`);
    if (bot.status === 'running') return;
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('Timeout');
}
```

### Handle Errors

```typescript
try {
  const bot = await createBot({...});
} catch (error) {
  if (error.message === 'No VMs available') {
    // Show: "All servers full, please try later"
  }
}
```

## Files to Read

1. **`SCHEDULER_API.md`** - Complete TypeScript API reference
2. **`REDIS_PROTOCOL.md`** - Low-level Redis commands (for debugging)

## Questions?

- **"How do I know if a bot is ready?"** → Poll `HGET bot:{id} status` or wait for it to be "running"
- **"Can users pick which VM?"** → No, automatic selection based on available RAM
- **"What if Redis is down?"** → Return 503, retry with exponential backoff
- **"How do I add new bot types?"** → Add profile YAML to VMs, no code changes needed

## Testing

```bash
# Test Redis connection
redis-cli -h redis.nuts.cash -p 443 --tls --sni redis.nuts.cash -a 'password' ping

# Check VMs
redis-cli -h redis.nuts.cash -p 443 --tls --sni redis.nuts.cash -a 'password' KEYS 'vm:*'

# Create test bot (manual)
redis-cli -h redis.nuts.cash -p 443 --tls --sni redis.nuts.cash -a 'password' \
  LPUSH vm:vm-0:queue '{"type":"CREATE","bot_id":"test","team_id":"test","profiles":["trader"],"config":{"memory":"1g"}}'
```

That's it! You're ready to build the frontend.
