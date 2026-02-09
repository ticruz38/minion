# Scheduler API Integration Guide

For frontend developers integrating with the Clawd bot orchestration system.

## Quick Start

```typescript
import { Redis } from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? { servername: process.env.REDIS_HOST } : undefined
});

// Create a trader bot
const bot = await createBot({
  team_id: 'tm-abc',
  profile: 'trader',
  config: {
    memory: '2g',
    telegram_token: 'bot:xxx'
  }
});
```

## Core API

### Create Bot

Creates a new bot on the best available VM.

```typescript
interface CreateBotRequest {
  team_id: string;           // Required: Team/organization ID
  profile?: string;          // Optional: Single profile name
  profiles?: string[];       // Optional: Multiple profiles (merged)
  extra_skills?: string[];   // Optional: Additional skills beyond profiles
  config: {
    memory?: string;         // Default: "1g"
    cpus?: string;           // Default: "1"
    model?: string;          // Default: "moonshot/kimi-k2.5"
    api_key?: string;        // LLM API key
    telegram_token?: string; // For Telegram bot
    telegram_users?: string; // Allowed Telegram users
    // ... other channel configs
  };
}

interface CreateBotResponse {
  bot_id: string;
  vm_id: string;
  status: 'pending' | 'running';
  profiles: string[];
}
```

**Implementation:**

```typescript
async function createBot(request: CreateBotRequest): Promise<CreateBotResponse> {
  // 1. Find best VM
  const vms = await getHealthyVms();
  const bestVm = selectBestVm(vms);
  
  if (!bestVm) {
    throw new Error('No VMs available');
  }
  
  // 2. Generate bot ID
  const botId = `bot_${nanoid(10)}`;
  const profiles = request.profiles || (request.profile ? [request.profile] : []);
  
  // 3. Send CREATE command to VM queue
  await redis.lpush(`vm:${bestVm.vm_id}:queue`, JSON.stringify({
    type: 'CREATE',
    bot_id: botId,
    team_id: request.team_id,
    profiles: profiles,
    extra_skills: request.extra_skills || [],
    config: {
      memory: request.config.memory || '1g',
      cpus: request.config.cpus || '1',
      model: request.config.model || 'moonshot/kimi-k2.5',
      api_key: request.config.api_key,
      telegram_token: request.config.telegram_token,
      telegram_users: request.config.telegram_users
    }
  }));
  
  // 4. Track bot location
  await redis.hset(`bot:${botId}`, {
    vm_id: bestVm.vm_id,
    team_id: request.team_id,
    profiles: profiles.join(','),
    status: 'pending',
    created_at: new Date().toISOString()
  });
  
  // 5. Add to team's bot list
  await redis.sadd(`team:${request.team_id}:bots`, botId);
  
  return {
    bot_id: botId,
    vm_id: bestVm.vm_id,
    status: 'pending',
    profiles
  };
}
```

### Stop Bot

```typescript
async function stopBot(botId: string): Promise<void> {
  const bot = await redis.hgetall(`bot:${botId}`);
  if (!bot.vm_id) throw new Error('Bot not found');
  
  await redis.lpush(`vm:${bot.vm_id}:queue`, JSON.stringify({
    type: 'STOP',
    bot_id: botId
  }));
  
  await redis.hset(`bot:${botId}`, 'status', 'stopped');
}
```

### Start Bot

```typescript
async function startBot(botId: string): Promise<void> {
  const bot = await redis.hgetall(`bot:${botId}`);
  if (!bot.vm_id) throw new Error('Bot not found');
  
  await redis.lpush(`vm:${bot.vm_id}:queue`, JSON.stringify({
    type: 'START',
    bot_id: botId
  }));
  
  await redis.hset(`bot:${botId}`, 'status', 'running');
}
```

### Delete Bot

```typescript
async function deleteBot(botId: string): Promise<void> {
  const bot = await redis.hgetall(`bot:${botId}`);
  if (!bot.vm_id) throw new Error('Bot not found');
  
  await redis.lpush(`vm:${bot.vm_id}:queue`, JSON.stringify({
    type: 'DELETE',
    bot_id: botId
  }));
  
  await redis.del(`bot:${botId}`);
  await redis.srem(`team:${bot.team_id}:bots`, botId);
}
```

### Add Credits

```typescript
async function addCredits(botId: string, amount: number): Promise<void> {
  const bot = await redis.hgetall(`bot:${botId}`);
  if (!bot.vm_id) throw new Error('Bot not found');
  
  await redis.lpush(`vm:${bot.vm_id}:queue`, JSON.stringify({
    type: 'CREDIT_ADD',
    bot_id: botId,
    amount: amount
  }));
}
```

## VM Selection

### Get Healthy VMs

```typescript
async function getHealthyVms(): Promise<VmInfo[]> {
  const keys = await redis.keys('vm:*');
  const vms = await Promise.all(
    keys.map(async (key) => {
      const vm = await redis.hgetall(key);
      const lastHeartbeat = parseInt(vm.last_heartbeat || '0');
      const isHealthy = 
        vm.status === 'healthy' && 
        Date.now() / 1000 - lastHeartbeat < 120; // 2 min timeout
      
      return {
        vm_id: vm.vm_id,
        status: vm.status,
        ram_total: parseInt(vm.ram_total || '0'),
        ram_available: parseInt(vm.ram_available || '0'),
        cpus: parseInt(vm.cpus || '0'),
        bot_count: parseInt(vm.bot_count || '0'),
        isHealthy
      };
    })
  );
  
  return vms.filter(v => v.isHealthy);
}
```

### Select Best VM

```typescript
function selectBestVm(vms: VmInfo[]): VmInfo | null {
  const candidates = vms.filter(vm => vm.ram_available > 1); // Min 1GB free
  if (candidates.length === 0) return null;
  
  // Pick VM with most available RAM
  return candidates.reduce((best, vm) => 
    vm.ram_available > best.ram_available ? vm : best
  );
}
```

## Query APIs

### Get Bot Status

```typescript
async function getBot(botId: string): Promise<BotInfo | null> {
  const bot = await redis.hgetall(`bot:${botId}`);
  if (!bot.vm_id) return null;
  
  return {
    bot_id: botId,
    vm_id: bot.vm_id,
    team_id: bot.team_id,
    status: bot.status,
    profiles: bot.profiles ? bot.profiles.split(',') : [],
    memory: bot.memory,
    created_at: bot.created_at
  };
}
```

### List Team Bots

```typescript
async function listTeamBots(teamId: string): Promise<string[]> {
  return await redis.smembers(`team:${teamId}:bots`);
}
```

### Get VM Status

```typescript
async function getVm(vmId: string): Promise<VmInfo | null> {
  const vm = await redis.hgetall(`vm:${vmId}`);
  if (!vm.vm_id) return null;
  
  return {
    vm_id: vm.vm_id,
    status: vm.status,
    ram_total: parseInt(vm.ram_total),
    ram_available: parseInt(vm.ram_available),
    cpus: parseInt(vm.cpus),
    bot_count: parseInt(vm.bot_count),
    last_heartbeat: parseInt(vm.last_heartbeat)
  };
}
```

### List All VMs

```typescript
async function listVms(): Promise<VmInfo[]> {
  const keys = await redis.keys('vm:*');
  const vms = await Promise.all(
    keys.map(key => redis.hgetall(key))
  );
  return vms.filter(v => v.vm_id);
}
```

## Error Handling

### Common Errors

```typescript
try {
  const bot = await createBot({...});
} catch (error) {
  if (error.message === 'No VMs available') {
    // All VMs full or offline
    // Suggest user wait or add more VMs
  }
  
  if (error.message === 'Bot not found') {
    // Bot ID doesn't exist in Redis
    // Check if bot was deleted
  }
  
  if (error.message.includes('Redis connection')) {
    // Redis unavailable
    // Retry with exponential backoff
  }
}
```

### Retry Logic

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error('Unreachable');
}
```

## Real-time Updates (Optional)

### Subscribe to Bot Status Changes

```typescript
const subscriber = new Redis(redisConfig);

subscriber.subscribe('bot:status:updates');
subscriber.on('message', (channel, message) => {
  const update = JSON.parse(message);
  console.log(`Bot ${update.bot_id} is now ${update.status}`);
});
```

### Poll for Bot Status

```typescript
async function waitForBotReady(
  botId: string, 
  timeout = 60000
): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    const bot = await getBot(botId);
    if (bot?.status === 'running') return;
    await new Promise(r => setTimeout(r, 2000));
  }
  
  throw new Error('Timeout waiting for bot to be ready');
}
```

## Frontend Examples

### React Hook

```typescript
function useBots(teamId: string) {
  const [bots, setBots] = useState<BotInfo[]>([]);
  
  useEffect(() => {
    const fetchBots = async () => {
      const botIds = await listTeamBots(teamId);
      const bots = await Promise.all(
        botIds.map(id => getBot(id))
      );
      setBots(bots.filter(Boolean) as BotInfo[]);
    };
    
    fetchBots();
    const interval = setInterval(fetchBots, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [teamId]);
  
  return bots;
}
```

### Create Bot Form

```tsx
function CreateBotForm({ teamId }: { teamId: string }) {
  const [profile, setProfile] = useState('trader');
  const [memory, setMemory] = useState('2g');
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      const bot = await createBot({
        team_id: teamId,
        profile,
        config: { memory }
      });
      
      alert(`Bot ${bot.bot_id} created on ${bot.vm_id}`);
    } catch (error) {
      alert(`Failed: ${error.message}`);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <select value={profile} onChange={e => setProfile(e.target.value)}>
        <option value="trader">Trader</option>
        <option value="secretary">Secretary</option>
        <option value="accountant">Accountant</option>
      </select>
      
      <select value={memory} onChange={e => setMemory(e.target.value)}>
        <option value="1g">1 GB</option>
        <option value="2g">2 GB</option>
        <option value="4g">4 GB</option>
      </select>
      
      <button type="submit">Create Bot</button>
    </form>
  );
}
```

## Configuration

```typescript
// .env
REDIS_HOST=redis.nuts.cash
REDIS_PORT=443
REDIS_PASSWORD=your-password
REDIS_TLS=true
```

## Testing

```bash
# Test Redis connection
redis-cli -h redis.nuts.cash -p 443 --tls --sni redis.nuts.cash -a 'password' ping

# Check VMs
redis-cli -h redis.nuts.cash -p 443 --tls --sni redis.nuts.cash -a 'password' KEYS 'vm:*'

# Check specific VM
redis-cli -h redis.nuts.cash -p 443 --tls --sni redis.nuts.cash -a 'password' HGETALL vm:vm-0
```
