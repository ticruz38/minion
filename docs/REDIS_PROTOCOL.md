# Redis Protocol for Team Dashboard

## Data Structures

### Bot Hash
```
Key: bot:{bot_id}
Type: Hash

Fields:
  - bot_id: string          // Unique bot identifier (e.g., bot_abc123xyz)
  - vm_id: string           // VM where bot runs (e.g., vm-001)
  - team_id: string         // Team that owns the bot
  - status: string          // running | stopped | error
  - profiles: string        // JSON array of profile IDs ["accountant"]
  - config: string          // JSON object with name, channels, etc.
  - created_at: string      // ISO timestamp
  - credits: string         // Credit balance (optional, managed by VM/worker)
  - credits_updated_at: string // Last credit update timestamp (optional)
```

**Note on Credits:** The `credits` field is managed by the external VM/worker system. When a `CREDIT_ADD` command is sent, the VM should:
1. Receive the command from `vm:{vm_id}:queue`
2. Update the bot's credit balance in Redis via `HINCRBY bot:{bot_id} credits {amount}`
3. Update `credits_updated_at` timestamp
4. Publish status update to `clawd:responses` channel

### Team Hash
```
Key: team:{team_id}
Type: Hash

Fields:
  - team_id: string         // Team identifier
  - name: string            // Display name (default: "My Team")
  - credits: string         // Number of credits (stored as string)
  - created_at: string      // ISO timestamp
```

### Team Bot Set
```
Key: team:{team_id}:bots
Type: Set

Members:
  - bot_id values belonging to the team
```

### VM Queue
```
Key: vm:{vm_id}:queue
Type: List

Commands pushed via LPUSH:
  - CREATE commands
  - START commands
  - STOP commands
  - DELETE commands
  - CREDIT_ADD commands
```

### VM Status Channel
```
Channel: clawd:responses
Type: Pub/Sub

Messages:
  - ACKNOWLEDGED: Command received
  - SUCCESS: Operation completed
  - ERROR: Operation failed
```

## Commands

### Bot Lifecycle Commands

```typescript
// CREATE - Deploy a new bot
{
  type: 'CREATE';
  bot_id: string;
  team_id: string;
  profiles: string[];
  config: BotConfig;
  resources: { memory: string; cpus: string; disk: string };
}

// START - Start a stopped bot
{
  type: 'START';
  bot_id: string;
  team_id: string;
  profiles: string[];
  config: BotConfig;
}

// STOP - Stop a running bot
{
  type: 'STOP';
  bot_id: string;
  team_id: string;
  profiles: string[];
  config: BotConfig;
}

// DELETE - Remove a bot
{
  type: 'DELETE';
  bot_id: string;
  team_id: string;
  profiles: string[];
  config: BotConfig;
}

// CREDIT_ADD - Add credits to a bot
{
  type: 'CREDIT_ADD';
  bot_id: string;
  team_id: string;
  profiles: string[];
  config: BotConfig;
  amount: number;
}
```

## API Endpoints

### Team APIs
```
GET    /api/team/[id]          # Get team dashboard data
PATCH  /api/team/[id]          # Update team settings (name)
GET    /api/team/[id]/credits  # Get credit balance
POST   /api/team/[id]/credits  # Add credits
```

### Bot APIs
```
GET    /api/bots?team_id=xxx   # List team's bots
POST   /api/bots               # Create new bot
GET    /api/bots/[id]          # Get bot details
POST   /api/bots/[id]/start    # Start bot
POST   /api/bots/[id]/stop     # Stop bot
POST   /api/bots/[id]/delete   # Delete bot
POST   /api/bots/[id]/credits  # Add bot credits
GET    /api/bots/[id]/events   # SSE for real-time updates
```

## Frontend Usage

### Team Dashboard Page
```typescript
// Fetch team data
const response = await fetch(`/api/team/${teamId}`);
const { team, bots, stats } = await response.json();

// team: { team_id, name, credits }
// bots: Array of parsed bot objects
// stats: { totalBots, runningBots, stoppedBots, errorBots }
```

### Start/Stop/Delete Bot
```typescript
await fetch(`/api/bots/${botId}/start`, { method: 'POST' });
await fetch(`/api/bots/${botId}/stop`, { method: 'POST' });
await fetch(`/api/bots/${botId}/delete`, { method: 'POST' });
```

### Add Credits
```typescript
await fetch(`/api/team/${teamId}/credits`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 100 })
});
```

## Displayed Information

### Team Page Shows:
1. **Team Info**
   - Team name
   - Team ID
   - Available credits

2. **Statistics Cards**
   - Total bots count
   - Running bots count
   - Stopped bots count
   - Error bots count

3. **Bot List** (for each bot)
   - Bot name from config
   - Minion type and avatar
   - Status (running/stopped/error with colored indicator)
   - Bot ID, VM ID, creation date
   - **Credit balance** (if present in bot hash)
   - Connected channels (Telegram/Discord/WhatsApp tags)
   - Action buttons: Start/Stop, Delete

4. **Credit Management**
   - Add Credits modal with preset amounts
   - Custom amount input
   - Balance preview
