# PRD: Bot Orchestration API Alignment

## Introduction

The current VM creation API (`/api/vms`) uses a simplified pub/sub approach that doesn't align with the documented Clawd scheduler protocol. This PRD defines the work needed to align our API with the proper Redis-based orchestration system, enabling proper VM selection, bot lifecycle management, and team-based organization.

**Current Issues:**
- Uses `clawd:commands` pub/sub instead of per-VM queues (`vm:{vm_id}:queue`)
- No automatic VM selection based on available capacity
- No bot tracking in Redis hashes (`bot:{bot_id}`)
- No team-based bot organization
- Missing bot lifecycle management (STOP, START, DELETE)
- Missing credit/billing system

**Target State:**
- Full compliance with documented Redis Protocol
- Automatic VM selection based on RAM availability
- Complete bot lifecycle management
- Team-based organization
- Credit system for billing

## Existing Code & Assets

### Redis Client (REUSE)
**Location:** `src/lib/server/redis.ts`
- Already has working Redis connection with TLS support
- `VMStatusSubscriber` class for pub/sub to `clawd:responses`
- Connection parsing for `rediss://` URLs with `rejectUnauthorized: false`
- **Use this as base** for scheduler queries

### VM Creation API (MODIFY)
**Location:** `src/routes/api/vms/+server.ts`
- Current POST handler uses pub/sub to `clawd:commands`
- Has Zod validation for Telegram/Discord/WhatsApp channels
- Has channel regex patterns (telegramTokenRegex, discordTokenRegex, etc.)
- **Keep:** Channel validation schemas
- **Change:** Replace pub/sub with per-VM queue + bot registry

### Environment Variables (EXISTING)
**Location:** `.env`
```
REDIS_URL=rediss://:password@redis.nuts.cash:443
```

### Dependencies (EXISTING)
**Location:** `package.json`
- `ioredis` - Redis client
- `zod` - Validation
- `nanoid` - NOT installed, need to add for bot ID generation

### TypeScript Types (EXISTING)
**Location:** `src/routes/api/vms/+server.ts`
- `DMPolicy` type
- `TelegramChannel`, `DiscordChannel`, `WhatsAppChannel` interfaces
- `ChannelsConfig` interface

## Goals

- Align API implementation with documented Redis Protocol
- Implement automatic VM selection algorithm
- Add complete bot lifecycle management (CREATE, STOP, START, DELETE)
- Implement team-based bot organization
- Add credit system for bot billing
- Maintain backward compatibility where possible

## User Stories

### US-001: Add nanoid dependency
**Description:** As a developer, I need nanoid installed to generate unique bot IDs.

**Existing Code:** None - need to install

**Acceptance Criteria:**
- [ ] Install `nanoid` package: `npm install nanoid`
- [ ] Typecheck passes

### US-002: Create scheduler service module
**Description:** As a developer, I need a scheduler service to query VMs and select the best one.

**Existing Code:** 
- `src/lib/server/redis.ts` has Redis connection with TLS - reuse connection logic
- `VMStatusSubscriber` class exists but is for pub/sub, not for queries

**Acceptance Criteria:**
- [ ] Create `src/lib/server/scheduler.ts`
- [ ] Export `getHealthyVms()` function that queries `vm:*` keys
- [ ] Filter VMs by `status === 'healthy'` and heartbeat < 2 min old
- [ ] Parse `ram_available` as integer
- [ ] Return array of `VmInfo` objects
- [ ] Export `selectBestVm(vms)` that picks VM with most available RAM
- [ ] Typecheck passes

### US-003: Create bot service module
**Description:** As a developer, I need a bot service to handle Redis operations for bot lifecycle.

**Existing Code:** None - new module

**Acceptance Criteria:**
- [ ] Create `src/lib/server/bot-service.ts`
- [ ] Export `registerBot(botId, vmId, teamId, profiles, config)` - uses `HSET` + `SADD`
- [ ] Export `getBot(botId)` - uses `HGETALL bot:{bot_id}`
- [ ] Export `getTeamBots(teamId)` - uses `SMEMBERS` + pipelined `HGETALL`
- [ ] Export `updateBotStatus(botId, status)` - uses `HSET`
- [ ] Export `deleteBot(botId)` - uses `HGET` to get team_id, then `SREM` + `DEL`
- [ ] Export `sendCommand(vmId, command)` - uses `LPUSH vm:{vm_id}:queue`
- [ ] Typecheck passes

### US-004: Rename and refactor create bot endpoint
**Description:** As a developer, I want the bot creation endpoint to follow the Redis Protocol.

**Existing Code:** 
- `src/routes/api/vms/+server.ts` POST handler exists
- Has channel validation schemas - KEEP these
- Has `buildRedisPayload()` function - REPLACE with new format

**Acceptance Criteria:**
- [ ] Rename file from `api/vms/+server.ts` to `api/bots/+server.ts`
- [ ] Update POST handler to use `getHealthyVms()` + `selectBestVm()`
- [ ] Return 503 if no VMs available
- [ ] Generate bot ID: `bot_${nanoid(10)}`
- [ ] Build CREATE command payload per Redis Protocol
- [ ] Call `registerBot()` to store in Redis
- [ ] Call `sendCommand()` to queue on VM
- [ ] Return `{ bot_id, vm_id, status: 'pending', profiles }`
- [ ] Typecheck passes

### US-005: Add GET /api/bots endpoint
**Description:** As a user, I want to list my team's bots.

**Existing Code:** 
- `src/routes/api/vms/+server.ts` has placeholder GET - REPLACE

**Acceptance Criteria:**
- [ ] Add GET handler to `api/bots/+server.ts`
- [ ] Parse `team_id` query parameter
- [ ] Use `getTeamBots(teamId)` from bot service
- [ ] Return array of bot objects
- [ ] Typecheck passes

### US-006: Add GET /api/bots/[id] endpoint
**Description:** As a user, I want to get details for a specific bot.

**Existing Code:** None - new endpoint

**Acceptance Criteria:**
- [ ] Create `src/routes/api/bots/[id]/+server.ts`
- [ ] Add GET handler
- [ ] Use `getBot(botId)` from bot service
- [ ] Return 404 if bot not found
- [ ] Typecheck passes

### US-007: Add POST /api/bots/[id]/stop endpoint
**Description:** As a user, I want to stop a running bot.

**Existing Code:** None - new endpoint

**Acceptance Criteria:**
- [ ] Create `src/routes/api/bots/[id]/stop/+server.ts`
- [ ] Add POST handler
- [ ] Get bot from Redis, return 404 if not found
- [ ] Send STOP command to VM queue
- [ ] Update bot status to 'stopped'
- [ ] Typecheck passes

### US-008: Add POST /api/bots/[id]/start endpoint
**Description:** As a user, I want to start a stopped bot.

**Existing Code:** None - new endpoint

**Acceptance Criteria:**
- [ ] Create `src/routes/api/bots/[id]/start/+server.ts`
- [ ] Add POST handler
- [ ] Get bot from Redis, return 404 if not found
- [ ] Send START command to VM queue
- [ ] Update bot status to 'running'
- [ ] Typecheck passes

### US-009: Add POST /api/bots/[id]/delete endpoint
**Description:** As a user, I want to delete a bot permanently.

**Existing Code:** None - new endpoint

**Acceptance Criteria:**
- [ ] Create `src/routes/api/bots/[id]/delete/+server.ts`
- [ ] Add POST handler
- [ ] Get bot from Redis, return 404 if not found
- [ ] Send DELETE command to VM queue
- [ ] Call `deleteBot()` to remove from Redis
- [ ] Typecheck passes

### US-010: Add POST /api/bots/[id]/credits endpoint
**Description:** As a user, I want to add credits to my bot.

**Existing Code:** None - new endpoint

**Acceptance Criteria:**
- [ ] Create `src/routes/api/bots/[id]/credits/+server.ts`
- [ ] Add POST handler
- [ ] Validate `{ amount: number }` body
- [ ] Get bot from Redis, return 404 if not found
- [ ] Send CREDIT_ADD command to VM queue
- [ ] Typecheck passes

### US-011: Update GET /api/vms endpoint
**Description:** As a user, I want to see VM capacity and health.

**Existing Code:** 
- `src/routes/api/vms/+server.ts` has placeholder GET - REPLACE

**Acceptance Criteria:**
- [ ] Update GET handler in `api/vms/+server.ts`
- [ ] Use `getHealthyVms()` from scheduler
- [ ] Return all VMs with parsed metrics
- [ ] Include `is_healthy` flag based on heartbeat
- [ ] Typecheck passes

### US-012: Deprecate old VM creation endpoint
**Description:** As a developer, I want to redirect old API calls to the new endpoint.

**Existing Code:** 
- `src/routes/api/vms/+server.ts` POST handler

**Acceptance Criteria:**
- [ ] Keep POST handler but add deprecation warning log
- [ ] Forward request to new bot creation logic
- [ ] Return response with deprecation header
- [ ] Typecheck passes

## Functional Requirements

### Scheduler & VM Selection
- FR-1: `getHealthyVms()` must query Redis for all `vm:*` keys and return VMs with `status === 'healthy'` and heartbeat < 2 minutes old
- FR-2: `selectBestVm(vms)` must return the VM with highest `ram_available` that has at least 1GB free
- FR-3: Return HTTP 503 with message "No VMs available" if no healthy VMs found
- FR-4: Use Redis pipelining for efficient multi-key queries

### Bot Creation (CREATE)
- FR-5: Generate bot IDs in format `bot_{nanoid(10)}`
- FR-6: CREATE command payload must include: `type`, `bot_id`, `team_id`, `profiles`, `config` (memory, cpus, model, channels)
- FR-7: Send CREATE command via `LPUSH vm:{vm_id}:queue {json}`
- FR-8: Register bot immediately with `HSET bot:{bot_id} ...` and `SADD team:{team_id}:bots {bot_id}`
- FR-9: Initial status must be 'pending', updated to 'running' by agent

### Bot Lifecycle (STOP/START/DELETE)
- FR-10: STOP command stops container but preserves data; status changes to 'stopped'
- FR-11: START command resumes stopped container; status changes to 'running'
- FR-12: DELETE command removes container and data; removes from team set and deletes hash
- FR-13: All lifecycle commands route to correct VM via `HGET bot:{bot_id} vm_id`

### Credit System
- FR-14: CREDIT_ADD command includes `amount` field
- FR-15: Credits are sent to VM queue for agent to process
- FR-16: Credit balance stored in `bot:{bot_id} credits` field

### Query APIs
- FR-17: GET `/api/bots?team_id={id}` returns all bots for team using `SMEMBERS` + pipelined `HGETALL`
- FR-18: GET `/api/bots/{id}` returns single bot via `HGETALL bot:{bot_id}`
- FR-19: GET `/api/vms` returns all VMs with parsed capacity metrics
- FR-20: All list endpoints support filtering by status

### Error Handling
- FR-21: Return 404 when bot not found in Redis
- FR-22: Return 503 when no healthy VMs available
- FR-23: Return 400 for invalid request payloads with detailed error messages
- FR-24: Log all errors with context for debugging

## Non-Goals (Out of Scope)

- Custom VM selection by users (always automatic)
- Bot migration between VMs
- Multi-region VM support
- Advanced billing/metering beyond credits
- Bot scaling (memory/CPU changes after creation)
- Real-time WebSocket updates (use polling for now)
- Bot templates/profiles management
- User authentication/authorization (assume team_id is provided)

## Design Considerations

### API Structure
```
/api/bots              GET    List team bots
/api/bots              POST   Create new bot
/api/bots/[id]         GET    Get bot details
/api/bots/[id]/stop    POST   Stop bot
/api/bots/[id]/start   POST   Start bot
/api/bots/[id]/delete  POST   Delete bot
/api/bots/[id]/credits POST   Add credits
/api/vms               GET    List VMs and capacity
```

### Redis Data Structures
```
# VM Heartbeat (set by agent)
HSET vm:{vm_id} status healthy ram_total 15 ram_available 14 cpus 4 bot_count 2 last_heartbeat 1707494400

# Bot Registry (set by scheduler)
HSET bot:{bot_id} vm_id vm-0 team_id tm-abc profiles trader,secretary status pending memory 2g created_at 2026-02-09T12:00:00Z credits 100

# Team Index (set by scheduler)
SADD team:{team_id}:bots bot-abc123

# VM Command Queue (scheduler → agent)
LPUSH vm:{vm_id}:queue '{"type":"CREATE","bot_id":"bot-abc123",...}'
```

### Bot Status Lifecycle
```
pending → running → stopped
   ↓         ↓        ↓
   └─────────┴────────┘
            ↓
        deleted
```

## Technical Considerations

### Redis Connection
- Reuse existing Redis client from `lib/server/redis.ts`
- Ensure TLS configuration supports `rediss://` URLs
- Use connection pooling for pub/sub operations

### Performance
- Use Redis pipelining for batch operations (list bots, list VMs)
- Cache VM list briefly if needed (30 seconds max)
- Bot status polling: 2-second intervals, 60-second timeout default

### Concurrency
- Bot ID generation must be unique (use nanoid)
- Redis operations are atomic, no additional locking needed
- Handle race conditions where VM becomes unavailable during selection

### Backward Compatibility
- Keep old `/api/vms` POST endpoint working during transition
- Add deprecation headers to old endpoint
- Frontend migration in separate story

## Success Metrics

- All bot operations use documented Redis Protocol
- Bot creation latency < 500ms (excluding agent startup)
- API supports 100+ concurrent bot operations
- Zero data loss during bot lifecycle transitions
- 100% test coverage for scheduler logic

## Open Questions

1. Should we implement bot status WebSocket for real-time updates instead of polling?
2. Do we need to track bot credits in a separate billing system or just Redis?
3. Should VM selection consider other factors (CPU, disk) or just RAM?
4. How do we handle bot failures (agent reports error state)?
