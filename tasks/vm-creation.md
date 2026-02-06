# Clawd VM Management System - Product Requirements Document

## Overview

A credit-based VM management system where clients pay for credits to run OpenClaw bots. VMs report their actual usage to Redis for accurate billing.

## Architecture

```
                         Redis (Message Broker)
                         ┌─────────────────┐
    ┌─────────────┐      │                 │      ┌──────────────┐
    │   Client    │─────►│    Minion       │◄────►│   Listener   │
    │  (Web/App)  │      │   (SvelteKit)   │      │    (Host)    │
    └─────────────┘      │                 │      └──────────────┘
                         │  Channels:      │              │
                         │  - clawd:cmd    │              │ manages
                         │  - clawd:resp   │              │
                         │  - clawd:usage  │◄─────────────┘
                         │  - clawd:events │
                         └────────┬────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
              ┌─────────┐   ┌─────────┐   ┌─────────┐
              │  VM #1  │   │  VM #2  │   │  VM #N  │
              │(OpenClaw│   │(OpenClaw│   │(OpenClaw│
              │   bot)  │   │   bot)  │   │   bot)  │
              └────┬────┘   └────┬────┘   └────┬────┘
                   │             │             │
                   └─────────────┴─────────────┘
                                 │
                    Posts actual usage to clawd:usage
```

## Credit System

### Credit Model

| Resource | Cost (credits/hour) |
|----------|---------------------|
| 1 GB RAM | 10 credits |
| 1 CPU core | 20 credits |
| 10 GB Disk | 5 credits |
| Base VM | 5 credits |

**Example**: 4GB RAM, 2 CPU, 20GB disk = (4×10) + (2×20) + (2×5) + 5 = **95 credits/hour**

### Credit Tiers (Pricing)

| Package | Credits | Price | Bonus |
|---------|---------|-------|-------|
| Starter | 1,000 | $10 | - |
| Pro | 5,000 | $45 | +500 free |
| Enterprise | 20,000 | $150 | +3,000 free |
| Custom | Variable | Contact | Negotiated |

### Credit States

- **Active**: Available for use
- **Reserved**: Allocated to running VMs
- **Consumed**: Used by VMs (billed hourly)
- **Expired**: Credits past expiration date (if any)

## Redis Channels

### Command Channel: `clawd:commands`
Minion → Host (VM management)

### Response Channel: `clawd:responses`
Host → Minion (command results)

### Event Channel: `clawd:events`
Host → Minion (VM lifecycle events)

### Credit Channel: `clawd:credits`
Minion → Host (credit updates)

### Spending Channel: `clawd:spending`
Host → Minion (usage reports)

## Message Protocol

### 1. CREATE VM

**Direction**: Minion → Host  
**Channel**: `clawd:commands`

```json
{
  "id": "cmd-uuid-v4",
  "timestamp": "2026-02-06T10:30:00Z",
  "type": "CREATE",
  "clientId": "client-uuid",
  "payload": {
    "name": "mybot",
    "model": "moonshot/kimi-k2.5",
    "ram": 4,
    "cpus": 2,
    "disk": 20,
    "profiles": ["coder"],
    "env": {
      "GITHUB_TOKEN": "{{secret}}"
    },
    "channels": {
      "telegram": {
        "token": "bot-token",
        "allowUsers": ["user1", "user2"],
        "dmPolicy": "pairing"
      }
    }
  }
}
```

**Validation Requirements**:
- Client must have sufficient credits
- VM name must be unique per client
- Hourly cost calculated: `cost = (ram × 10) + (cpus × 20) + (disk/10 × 5) + 5`

**Success Response**:
```json
{
  "id": "cmd-uuid",
  "type": "CREATE",
  "status": "SUCCESS",
  "timestamp": "2026-02-06T10:30:05Z",
  "data": {
    "name": "mybot",
    "vmName": "clawd-clientid-mybot",
    "internalIp": "172.30.1.10",
    "tailscaleIp": "100.x.x.x",
    "status": "running",
    "hourlyCost": 95,
    "creditsReserved": 95
  }
}
```

**Error Response**:
```json
{
  "id": "cmd-uuid",
  "type": "CREATE",
  "status": "ERROR",
  "timestamp": "2026-02-06T10:30:05Z",
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Need 95 credits/hour, only 42 available",
    "required": 95,
    "available": 42
  }
}
```

### 2. DELETE VM

**Direction**: Minion → Host  
**Channel**: `clawd:commands`

```json
{
  "id": "cmd-uuid",
  "timestamp": "2026-02-06T10:30:00Z",
  "type": "DELETE",
  "clientId": "client-uuid",
  "payload": {
    "name": "mybot",
    "force": false
  }
}
```

**Success Response**:
```json
{
  "id": "cmd-uuid",
  "type": "DELETE",
  "status": "SUCCESS",
  "data": {
    "name": "mybot",
    "creditsReleased": 95,
    "finalCharge": 47,
    "runtime": "0h 30m"
  }
}
```

### 3. START/STOP VM

**Direction**: Minion → Host  
**Channel**: `clawd:commands`

```json
{
  "id": "cmd-uuid",
  "timestamp": "2026-02-06T10:30:00Z",
  "type": "START",
  "clientId": "client-uuid",
  "payload": {
    "name": "mybot"
  }
}
```

### 4. GET VM STATUS

**Direction**: Minion → Host  
**Channel**: `clawd:commands`

```json
{
  "id": "cmd-uuid",
  "timestamp": "2026-02-06T10:30:00Z",
  "type": "STATUS",
  "clientId": "client-uuid",
  "payload": {
    "name": "mybot"
  },
  "replyTo": "minion:responses:session-123"
}
```

**Response**:
```json
{
  "id": "cmd-uuid",
  "type": "STATUS",
  "status": "SUCCESS",
  "data": {
    "name": "mybot",
    "vmName": "clawd-clientid-mybot",
    "status": "running",
    "internalIp": "172.30.1.10",
    "tailscaleIp": "100.124.70.30",
    "uptime": "3h 45m",
    "hourlyCost": 95,
    "sessionSpend": 356,
    "profiles": ["coder"],
    "channels": ["telegram"]
  }
}
```

### 5. LIST ALL VMS

**Direction**: Minion → Host  
**Channel**: `clawd:commands`

```json
{
  "id": "cmd-uuid",
  "timestamp": "2026-02-06T10:30:00Z",
  "type": "LIST",
  "clientId": "client-uuid"
}
```

**Response**:
```json
{
  "id": "cmd-uuid",
  "type": "LIST",
  "status": "SUCCESS",
  "data": {
    "bots": [
      {
        "name": "mybot",
        "status": "running",
        "hourlyCost": 95,
        "sessionSpend": 356,
        "uptime": "3h 45m"
      }
    ],
    "totalHourlyCost": 95,
    "totalSessionSpend": 356
  }
}
```

### 6. ADD CREDITS

**Direction**: Minion → Host (after payment)  
**Channel**: `clawd:credits`

```json
{
  "id": "credit-uuid",
  "timestamp": "2026-02-06T10:30:00Z",
  "type": "ADD_CREDITS",
  "clientId": "client-uuid",
  "payload": {
    "amount": 5000,
    "source": "stripe_payment",
    "paymentId": "pi_1234567890",
    "package": "Pro",
    "expiresAt": null
  }
}
```

**Success Response**:
```json
{
  "id": "credit-uuid",
  "type": "ADD_CREDITS",
  "status": "SUCCESS",
  "data": {
    "previousBalance": 42,
    "added": 5000,
    "newBalance": 5042,
    "totalReserved": 95,
    "available": 4947
  }
}
```

### 7. GET CREDIT BALANCE

**Direction**: Minion → Host  
**Channel**: `clawd:credits`

```json
{
  "id": "cmd-uuid",
  "timestamp": "2026-02-06T10:30:00Z",
  "type": "GET_BALANCE",
  "clientId": "client-uuid"
}
```

**Response**:
```json
{
  "id": "cmd-uuid",
  "type": "GET_BALANCE",
  "status": "SUCCESS",
  "data": {
    "total": 5042,
    "reserved": 95,
    "available": 4947,
    "vmCosts": [
      {
        "vmName": "mybot",
        "hourlyRate": 95,
        "sessionSpend": 356,
        "uptime": "3h 45m"
      }
    ]
  }
}
```

### 8. SPENDING REPORT (Auto-sent)

**Direction**: Host → Minion  
**Channel**: `clawd:spending`  
**Frequency**: Every 15 minutes + on VM stop/delete

```json
{
  "type": "SPENDING_REPORT",
  "timestamp": "2026-02-06T10:45:00Z",
  "clientId": "client-uuid",
  "data": {
    "reportId": "rep-uuid",
    "period": "15m",
    "vms": [
      {
        "vmName": "mybot",
        "hourlyRate": 95,
        "periodSpend": 23.75,
        "totalSessionSpend": 379.75,
        "runtime": "4h 00m"
      }
    ],
    "totalPeriodSpend": 23.75,
    "balance": {
      "total": 5042,
      "reserved": 95,
      "available": 4947
    }
  }
}
```

### 9. LOW BALANCE ALERT

**Direction**: Host → Minion  
**Channel**: `clawd:events`

```json
{
  "type": "EVENT",
  "event": "LOW_BALANCE",
  "timestamp": "2026-02-06T10:45:00Z",
  "clientId": "client-uuid",
  "data": {
    "currentBalance": 150,
    "reserved": 95,
    "available": 55,
    "projectedHours": 0.6,
    "threshold": 100,
    "recommendedAction": "add_credits"
  }
}
```

### 10. CREDITS DEPLETED

**Direction**: Host → Minion  
**Channel**: `clawd:events`

```json
{
  "type": "EVENT",
  "event": "CREDITS_DEPLETED",
  "timestamp": "2026-02-06T10:45:00Z",
  "clientId": "client-uuid",
  "data": {
    "vmName": "mybot",
    "action": "AUTO_STOPPED",
    "finalCharge": 5042,
    "totalRuntime": "53h 12m"
  }
}
```

### 11. VM USAGE REPORT (From VM to Host) ⭐

**Direction**: VM (OpenClaw) → Host  
**Channel**: `clawd:usage`
**Frequency**: Every 5 minutes + on shutdown

The VM itself reports actual resource usage for accurate billing.

```json
{
  "type": "USAGE_REPORT",
  "timestamp": "2026-02-06T10:45:00Z",
  "vmName": "mybot",
  "clientId": "client-uuid",
  "data": {
    "reportId": "usage-uuid",
    "period": "5m",
    "resources": {
      "ramMB": 3950,
      "cpuPercent": 45.2,
      "diskMB": 8500
    },
    "llmUsage": {
      "requests": 12,
      "tokensInput": 3450,
      "tokensOutput": 1890,
      "cost": 15
    },
    "session": {
      "startTime": "2026-02-06T09:00:00Z",
      "runtime": 105,
      "totalCost": 380
    }
  }
}
```

**Fields**:
- `resources`: Actual resource consumption
- `llmUsage`: API calls made by the bot (costs extra credits)
- `session`: Cumulative session stats

### 12. VM HEARTBEAT (From VM to Host) ⭐

**Direction**: VM (OpenClaw) → Host  
**Channel**: `clawd:usage`
**Frequency**: Every 30 seconds

Simple ping to verify VM is alive and track uptime accurately.

```json
{
  "type": "HEARTBEAT",
  "timestamp": "2026-02-06T10:45:30Z",
  "vmName": "mybot",
  "clientId": "client-uuid",
  "data": {
    "status": "running",
    "uptime": 105,
    "version": "2026.2.3"
  }
}
```

### 13. VM SHUTDOWN NOTICE (From VM to Host) ⭐

**Direction**: VM (OpenClaw) → Host  
**Channel**: `clawd:usage`
**Trigger**: When OpenClaw is stopping

```json
{
  "type": "SHUTDOWN",
  "timestamp": "2026-02-06T10:50:00Z",
  "vmName": "mybot",
  "clientId": "client-uuid",
  "data": {
    "reason": "SIGTERM|CREDITS_DEPLETED|MANUAL|ERROR",
    "finalSessionCost": 425,
    "totalRuntime": 110,
    "llmTotalCost": 125
  }
}
```

## VM Integration (Inside OpenClaw)

### Redis Configuration for OpenClaw

Add to OpenClaw config (`~/.openclaw/openclaw.json`):

```json
{
  "billing": {
    "enabled": true,
    "redisUrl": "redis://172.30.0.1:6379",
    "channels": {
      "usage": "clawd:usage"
    },
    "clientId": "{{CLIENT_ID}}",
    "vmName": "{{VM_NAME}}",
    "heartbeatInterval": 30,
    "usageReportInterval": 300
  }
}
```

Note: VMs use host IP `172.30.0.1` (gateway) to reach Redis.

### How VMs Report Usage

1. **On startup**: Send initial heartbeat
2. **Every 30s**: Send heartbeat
3. **Every 5min**: Send detailed usage report
4. **On shutdown**: Send final shutdown notice

### Credit Costs from VM

| Metric | Cost |
|--------|------|
| Base VM (per hour) | Reserved upfront |
| LLM API calls | Variable based on tokens |
| File storage | Per GB/hour |

## Credit Management Rules

### 1. VM Creation
- Calculate hourly cost upfront
- Check: `available >= hourly_cost`
- Reserve credits on creation
- Deduct from available balance immediately

### 2. VM Running
- Track actual runtime per second
- Bill every 15 minutes
- Update `sessionSpend` continuously

### 3. Auto-Stop Conditions
- Stop VM when `available < hourly_cost`
- Send LOW_BALANCE alert when `available < 2 × hourly_cost`
- Send CREDITS_DEPLETED when stopped

### 4. VM Deletion
- Calculate final prorated charge
- Release reserved credits
- Bill actual usage

### 5. Credit Expiration
- Check expiration daily
- Notify 7 days before expiration
- Move expired credits to separate bucket

## Minion Responsibilities

### 1. Credit Tracking
- Maintain client credit balances in database
- Listen to `clawd:responses` for credit updates
- Listen to `clawd:spending` for usage reports
- Update UI in real-time

### 2. Payment Integration
- Accept payments via Stripe/PayPal
- Send `ADD_CREDITS` message after successful payment
- Update client balance on confirmation

### 3. Client Notifications
- Email/push on LOW_BALANCE
- Email on CREDITS_DEPLETED
- Weekly spending reports

### 4. VM Proxy
- Forward client requests to `clawd:commands`
- Validate requests (sufficient credits)
- Return responses to client

### 5. Admin Dashboard
- View all client VMs and spending
- Adjust credit balances
- Issue refunds
- View system-wide metrics

## Host (Listener) Responsibilities

### 1. VM Lifecycle
- Execute clawd CLI commands
- Track VM status
- Send lifecycle events

### 2. Credit Accounting
- Calculate hourly costs
- Track spending per VM
- Send spending reports
- Enforce credit limits

### 3. Auto-Management
- Auto-stop VMs on depleted credits
- Send low balance alerts
- Cleanup stopped VMs after 24h

### 4. Persistence
- Store VM state
- Store credit transactions
- Store spending logs

## Database Schema (Minion)

### clients
```sql
id: uuid
email: string
totalCredits: integer
availableCredits: integer
reservedCredits: integer
createdAt: timestamp
updatedAt: timestamp
```

### credit_transactions
```sql
id: uuid
clientId: uuid
type: ADD|DEDUCT|REFUND|EXPIRE
amount: integer
balance: integer
source: string -- stripe, admin, etc.
metadata: json
createdAt: timestamp
```

### vms
```sql
id: uuid
clientId: uuid
name: string
vmName: string
status: running|stopped|deleted
hourlyCost: integer
sessionSpend: integer
ram: integer
cpus: integer
disk: integer
profiles: string[]
channels: json
createdAt: timestamp
startedAt: timestamp
stoppedAt: timestamp
```

### spending_logs
```sql
id: uuid
clientId: uuid
vmId: uuid
period: string
amount: integer
runtime: integer -- seconds
createdAt: timestamp
```

## API Endpoints (Minion Web)

### POST /api/vms
Create new VM (checks credits, sends to Redis)

### GET /api/vms
List client VMs (from DB + Redis status)

### POST /api/vms/:id/stop
Stop VM

### POST /api/vms/:id/start
Start VM (checks credits)

### DELETE /api/vms/:id
Delete VM

### GET /api/credits/balance
Get credit balance

### POST /api/credits/purchase
Initiate credit purchase (Stripe)

### POST /api/webhooks/stripe
Stripe webhook for payment confirmation

## Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `INSUFFICIENT_CREDITS` | Not enough credits | Prompt to buy |
| `VM_EXISTS` | Name already used | Suggest new name |
| `VM_NOT_FOUND` | VM doesn't exist | Check list |
| `CREDIT_LIMIT` | Exceeds max credit reservation | Reduce resources |
| `INVALID_CONFIG` | Bad VM configuration | Fix params |

## Testing

```bash
# Test Redis connection
redis-cli ping

# Send test command
redis-cli publish clawd:commands '{
  "id": "test-1",
  "type": "LIST",
  "clientId": "test-client",
  "timestamp": "2026-02-06T10:00:00Z"
}'

# Listen for responses
redis-cli subscribe clawd:responses
```
