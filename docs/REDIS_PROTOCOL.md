# Redis Protocol Specification

Low-level Redis communication protocol for Clawd.

## Connection

```typescript
import { Redis } from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,      // e.g., redis.nuts.cash
  port: parseInt(process.env.REDIS_PORT), // e.g., 443
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {
    servername: process.env.REDIS_HOST
  } : undefined
});
```

## Data Types

### VM Heartbeat (Hash)

VM agents report capacity every 30 seconds.

```
Key: vm:{vm_id}
Type: Hash
TTL: 120 seconds

Fields:
  status           string    "healthy" | "unhealthy"
  vm_id            string    VM identifier
  ram_total        string    Total RAM in GB
  ram_used         string    Used RAM in GB
  ram_available    string    Available RAM in GB
  cpus             string    Number of CPUs
  bot_count        string    Number of running bots
  bots_ram_allocated string  RAM allocated to bots
  last_heartbeat   string    Unix timestamp
  agent_version    string    Agent version
  bot_list         string    JSON array of bot IDs
```

**Example:**
```bash
redis-cli HGETALL vm:vm-0
# 1) "status"
# 2) "healthy"
# 3) "vm_id"
# 4) "vm-0"
# 5) "ram_total"
# 6) "15"
# 7) "ram_available"
# 8) "14"
# ...
```

**Commands:**
```bash
# Read VM status
HGETALL vm:vm-0

# List all VMs
KEYS vm:*

# Get specific field
HGET vm:vm-0 ram_available
```

### VM Command Queue (List)

Scheduler sends commands to VMs via a queue.

```
Key: vm:{vm_id}:queue
Type: List (queue)
Persistence: Yes (survives agent restart)

Operations:
  LPUSH vm:{vm_id}:queue {json}  - Scheduler adds command
  BLPOP vm:{vm_id}:queue 0       - Agent waits for command
```

**Command Format:**
```typescript
interface Command {
  type: 'CREATE' | 'DELETE' | 'START' | 'STOP' | 'CREDIT_ADD' | 'SCALE';
  bot_id: string;
  // Type-specific fields...
}
```

**CREATE Command:**
```json
{
  "type": "CREATE",
  "bot_id": "bot-abc123",
  "team_id": "tm-xyz789",
  "profiles": ["trader"],
  "extra_skills": ["custom-skill"],
  "config": {
    "memory": "2g",
    "cpus": "1",
    "model": "moonshot/kimi-k2.5",
    "api_key": "sk-xxx",
    "telegram_token": "bot:xxx"
  }
}
```

**DELETE Command:**
```json
{
  "type": "DELETE",
  "bot_id": "bot-abc123"
}
```

**STOP/START Commands:**
```json
{
  "type": "STOP",
  "bot_id": "bot-abc123"
}
```

**CREDIT_ADD Command:**
```json
{
  "type": "CREDIT_ADD",
  "bot_id": "bot-abc123",
  "amount": 100
}
```

**SCALE Command:**
```json
{
  "type": "SCALE",
  "bot_id": "bot-abc123",
  "memory": "4g",
  "cpus": "2"
}
```

**Commands:**
```bash
# Send command to VM (scheduler)
LPUSH vm:vm-0:queue '{"type":"CREATE","bot_id":"bot-123"}'

# Read command (agent - blocks until available)
BLPOP vm:vm-0:queue 0

# Peek at queue length
LLEN vm:vm-0:queue

# Clear queue (emergency)
DEL vm:vm-0:queue
```

### Bot Registry (Hash)

Tracks bot location and metadata.

```
Key: bot:{bot_id}
Type: Hash

Fields:
  vm_id        string    VM where bot runs
  team_id      string    Team/organization
  profiles     string    Comma-separated profile names
  status       string    "pending" | "running" | "stopped"
  memory       string    Allocated memory
  created_at   string    ISO timestamp
```

**Example:**
```bash
redis-cli HGETALL bot:bot-abc123
# 1) "vm_id"
# 2) "vm-0"
# 3) "team_id"
# 4) "tm-xyz789"
# 5) "profiles"
# 6) "trader"
# 7) "status"
# 8) "running"
```

**Commands:**
```bash
# Register bot location (scheduler)
HSET bot:bot-123 vm_id vm-0 team_id tm-abc status pending

# Update status
HSET bot:bot-123 status running

# Get bot location
HGETALL bot:bot-123

# Find bot's VM (for routing)
HGET bot:bot-123 vm_id

# Delete bot record
DEL bot:bot-123
```

### Team Bot Index (Set)

Tracks all bots belonging to a team.

```
Key: team:{team_id}:bots
Type: Set

Members:
  "bot-abc123"
  "bot-def456"
  ...
```

**Commands:**
```bash
# Add bot to team
SADD team:tm-abc:bots bot-123

# List team bots
SMEMBERS team:tm-abc:bots

# Check if bot in team
SISMEMBER team:tm-abc:bots bot-123

# Remove bot from team
SREM team:tm-abc:bots bot-123

# Count team bots
SCARD team:tm-abc:bots
```

### Bot Commands (Pub/Sub)

Real-time commands to running bots.

```
Channel: bot:{bot_id}:commands
Type: Pub/Sub

Publisher: clawd-agent
Subscriber: Bot container
```

**Message Format:**
```json
{
  "type": "CREDIT_ADD",
  "amount": 100
}
```

**Commands:**
```bash
# Send command to bot (agent)
PUBLISH bot:bot-123:commands '{"type":"CREDIT_ADD","amount":100}'

# Subscribe to commands (bot)
SUBSCRIBE bot:bot-123:commands
```

## Complete Workflows

### 1. Create Bot Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│Scheduler │────►│  Redis   │────►│  Agent   │────►│  Docker  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘

1. Scheduler: HGETALL vm:*
                 ↓
2. Scheduler: Select VM with most RAM
                 ↓
3. Scheduler: LPUSH vm:vm-0:queue '{"type":"CREATE",...}'
                 ↓
4. Scheduler: HSET bot:bot-123 vm_id vm-0 status pending
                 ↓
5. Agent:      BLPOP vm:vm-0:queue → receives CREATE
                 ↓
6. Agent:      docker run ...
                 ↓
7. Agent:      HSET bot:bot-123 status running
```

**Redis Commands:**
```bash
# Step 1: Get all VMs
KEYS vm:*
HGETALL vm:vm-0
HGETALL vm:vm-1
...

# Step 3: Send command
LPUSH vm:vm-0:queue '{"type":"CREATE","bot_id":"bot-123","team_id":"tm-abc","profiles":["trader"],"config":{"memory":"2g"}}'

# Step 4: Track bot
HSET bot:bot-123 vm_id vm-0 team_id tm-abc status pending profiles trader memory 2g created_at "2026-02-09T12:00:00Z"
SADD team:tm-abc:bots bot-123

# Step 7: Agent confirms
HSET bot:bot-123 status running
```

### 2. Route Command to Bot

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│Scheduler │────►│  Redis   │────►│  Agent   │
└──────────┘     └──────────┘     └──────────┘

1. Scheduler: HGET bot:bot-123 vm_id → "vm-0"
                 ↓
2. Scheduler: LPUSH vm:vm-0:queue '{"type":"STOP","bot_id":"bot-123"}'
                 ↓
3. Agent:      BLPOP vm:vm-0:queue
                 ↓
4. Agent:      docker stop clawd-bot-bot-123
                 ↓
5. Agent:      HSET bot:bot-123 status stopped
```

**Redis Commands:**
```bash
# Step 1: Find bot's VM
HGET bot:bot-123 vm_id
# Returns: "vm-0"

# Step 2: Route command
LPUSH vm:vm-0:queue '{"type":"STOP","bot_id":"bot-123"}'

# Step 5: Update status
HSET bot:bot-123 status stopped
```

### 3. Add Credits to Bot

```bash
# Scheduler finds bot's VM
HGET bot:bot-123 vm_id
# Returns: "vm-0"

# Scheduler sends command to agent
LPUSH vm:vm-0:queue '{"type":"CREDIT_ADD","bot_id":"bot-123","amount":100}'

# Agent receives command, publishes to bot
PUBLISH bot:bot-123:commands '{"type":"CREDIT_ADD","amount":100}'

# Bot (subscribed) receives and processes
```

## Monitoring Queries

### System Health

```bash
# Count healthy VMs
KEYS vm:* | xargs -I {} redis-cli HGET {} status | grep -c "healthy"

# Total capacity
KEYS vm:* | xargs -I {} redis-cli HGET {} ram_available | awk '{s+=$1} END {print s}'

# Total running bots
KEYS vm:* | xargs -I {} redis-cli HGET {} bot_count | awk '{s+=$1} END {print s}'

# Orchards with offline VMs
KEYS vm:* | xargs -I {} sh -c 'redis-cli HGET {} last_heartbeat | xargs -I ts expr $(date +%s) - ts' | awk '$1 > 120 {print "offline"}'
```

### Team Stats

```bash
# List all bots for team
SMEMBERS team:tm-abc:bots

# Get full info for all team bots
redis-cli SMEMBERS team:tm-abc:bots | xargs -I {} redis-cli HGETALL bot:{}

# Count bots per VM
KEYS vm:* | xargs -I {} sh -c 'echo -n "{}: "; redis-cli HGET {} bot_count'
```

### Bot Lifecycle

```bash
# Create → Running timeline
HGET bot:bot-123 created_at
HGET bot:bot-123 status

# Which VM has this bot
HGET bot:bot-123 vm_id

# Find bots on specific VM
KEYS bot:* | xargs -I {} sh -c 'redis-cli HGET {} vm_id | grep -q "vm-0" && echo {}'
```

## Error Handling

### VM Timeout Detection

```bash
# Find VMs that haven't reported in > 2 minutes
current_time=$(date +%s)
KEYS vm:* | while read key; do
  last=$(redis-cli HGET $key last_heartbeat)
  if [ $(($current_time - $last)) -gt 120 ]; then
    echo "VM $key is offline (last seen: $last)"
  fi
done
```

### Orphaned Bots

```bash
# Find bots pointing to non-existent VMs
KEYS bot:* | while read bot_key; do
  vm_id=$(redis-cli HGET $bot_key vm_id)
  if [ -z "$(redis-cli EXISTS vm:$vm_id)" ]; then
    echo "Bot $bot_key orphaned (VM $vm_id missing)"
  fi
done
```

### Queue Backlog

```bash
# Find VMs with backed-up queues
KEYS vm:*:queue | while read queue; do
  len=$(redis-cli LLEN $queue)
  if [ $len -gt 10 ]; then
    echo "Queue $queue has $len pending commands"
  fi
done
```

## Performance Considerations

### Use Pipelining

```typescript
// Bad: N round trips
const vms = await redis.keys('vm:*');
for (const key of vms) {
  await redis.hgetall(key); // N round trips
}

// Good: 1 round trip
const pipeline = redis.pipeline();
const vms = await redis.keys('vm:*');
for (const key of vms) {
  pipeline.hgetall(key);
}
const results = await pipeline.exec();
```

### Use SCAN Instead of KEYS

```typescript
// Bad for production (blocks Redis)
const keys = await redis.keys('bot:*');

// Good for production
const stream = redis.scanStream({ match: 'bot:*' });
stream.on('data', (keys) => {
  // Process keys in batches
});
```

### Connection Pooling

```typescript
// Dedicated connection for pub/sub
const subscriber = new Redis(redisConfig);
subscriber.subscribe('bot:*:commands');

// Separate connection for commands
const redis = new Redis(redisConfig);
```

## Security

### ACL Rules (Redis 6+)

```bash
# Create user for scheduler
ACL SETUSER scheduler on >scheduler-password ~vm:* ~bot:* ~team:* +@all

# Create user for agents (more restricted)
ACL SETUSER agent on >agent-password ~vm:${VM_ID}* ~vm:${VM_ID}*:queue +@all
```

### TLS Configuration

```typescript
const redis = new Redis({
  host: 'redis.nuts.cash',
  port: 443,
  password: 'password',
  tls: {
    servername: 'redis.nuts.cash',
    // For self-signed certs:
    // rejectUnauthorized: false
  }
});
```

## Testing

```bash
# Simulate scheduler - create bot
LPUSH vm:vm-0:queue '{"type":"CREATE","bot_id":"test-123","team_id":"tm-test","profiles":["trader"],"config":{"memory":"1g"}}'

# Watch agent process it
MONITOR | grep vm:vm-0

# Check bot registered
HGETALL bot:test-123

# Clean up
DEL bot:test-123
```
