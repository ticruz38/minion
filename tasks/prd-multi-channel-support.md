# PRD: Multi-Channel Bot Configuration

## Introduction

Extend the Minion VM creation modal to support multiple messaging platforms. Currently users can only configure Telegram bots. This feature allows users to choose from 10 different messaging channels (Telegram, Discord, WhatsApp, Slack, Signal, Matrix, Teams, Google Chat, Zalo, LINE) during bot creation, with a modern security model using OpenClaw's native pairing system.

## Goals

- Allow users to select one or more messaging channels for their bot
- Replace custom passcode auth with OpenClaw's native dmPolicy (pairing/allowlist/open)
- Provide real-time feedback during VM creation via Redis events
- Support Phase 1 channels: Telegram, Discord, WhatsApp (MVP)
- Maintain clean UX with 4-step wizard: Name → Channel Selection → Security → Review

## User Stories

### US-001: Update API endpoint for multi-channel VM creation
**Description:** As a developer, I need to update the backend endpoint to accept the new multi-channel schema with Redis correlation ID.

**Acceptance Criteria:**
- [ ] Update POST /api/vms to accept request body with `id` (UUID v4 for Redis correlation)
- [ ] Replace single `token`/`passcode` with new `channels` object schema
- [ ] Support telegram, discord, whatsapp channels in schema
- [ ] Validate at least one channel is configured
- [ ] Return HTTP 202 (Accepted) with commandId for async processing
- [ ] Typecheck passes
- [ ] Unit tests pass

### US-002: Create Redis subscription service for real-time updates
**Description:** As a developer, I need a Redis pub/sub service to receive VM creation events from the backend.

**Acceptance Criteria:**
- [ ] Create src/lib/server/redis.ts with VMStatusSubscriber class
- [ ] Subscribe to 'clawd:responses' channel
- [ ] Support subscribe/unsubscribe by commandId with callback handler
- [ ] Auto-unsubscribe after 10 minutes to prevent memory leaks
- [ ] Handle ACKNOWLEDGED, SUCCESS, and ERROR events
- [ ] Typecheck passes
- [ ] Test with mocked Redis events

### US-003: Build Channel Selection Step component
**Description:** As a user, I want to select which messaging platforms my bot will use from a visual grid.

**Acceptance Criteria:**
- [ ] Create ChannelSelectionStep.svelte component
- [ ] Display grid of channel cards: Telegram, Discord, WhatsApp (P0)
- [ ] Each card shows icon, name, and checkbox for selection
- [ ] Multiple channels can be selected
- [ ] Show 'Selected: X channels' summary
- [ ] Validate at least one channel selected before proceeding
- [ ] Responsive grid: 3 columns desktop, 2 tablet, 1 mobile
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-004: Build Telegram channel configuration form
**Description:** As a user, I want to configure my Telegram bot with token and security policy.

**Acceptance Criteria:**
- [ ] Create TelegramConfigForm.svelte component
- [ ] Bot Token input with password masking and show/hide toggle
- [ ] Help text with link to @BotFather instructions
- [ ] dmPolicy radio buttons: Pairing, Allowlist, Open
- [ ] Optional allowUsers textarea for usernames
- [ ] Real-time validation for token format
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: Build Discord channel configuration form
**Description:** As a user, I want to configure my Discord bot with token and required intents.

**Acceptance Criteria:**
- [ ] Create DiscordConfigForm.svelte component
- [ ] Bot Token input with password masking and show/hide toggle
- [ ] Warning about required intents: Message Content, Server Members
- [ ] Help link to Discord Developer Portal
- [ ] dmPolicy radio buttons: Pairing, Allowlist, Open
- [ ] Real-time validation for token format
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-006: Build WhatsApp channel configuration form
**Description:** As a user, I want to configure WhatsApp with phone number and API credentials.

**Acceptance Criteria:**
- [ ] Create WhatsAppConfigForm.svelte component
- [ ] Phone Number input with E.164 format validation
- [ ] API Key input with password masking
- [ ] Optional Webhook URL input
- [ ] Help text with setup instructions
- [ ] Real-time validation for phone format
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-007: Build Security Configuration Step
**Description:** As a user, I want to review my security settings before launching the bot.

**Acceptance Criteria:**
- [ ] Create SecurityConfigStep.svelte component
- [ ] Display list of selected channels with their dmPolicy setting
- [ ] Explain 'Pairing' mode with visual info box
- [ ] Explain 'Allowlist' and 'Open' modes briefly
- [ ] Next button proceeds to Review step
- [ ] Back button returns to Channel Configuration
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: Update Review and Launch Step for multi-channel
**Description:** As a user, I want to review all my channel configurations before launching.

**Acceptance Criteria:**
- [ ] Update ReviewStep.svelte to show all selected channels
- [ ] Summary cards per channel: icon, name, dmPolicy, masked credentials
- [ ] Credit cost breakdown with warning for low balance
- [ ] Launch Bot button with loading state
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-009: Create real-time progress modal
**Description:** As a user, I want to see real-time progress while my bot is being created.

**Acceptance Criteria:**
- [ ] Create VMProgressModal.svelte component
- [ ] Show after request is acknowledged via Redis
- [ ] Animated progress indicator with current step text
- [ ] Handle SUCCESS: show connection info and close
- [ ] Handle ERROR: show error details and retry option
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-010: Integrate multi-channel modal with CharacterSelector
**Description:** As a user, I want the new multi-step flow when clicking HIRE on a Minion.

**Acceptance Criteria:**
- [ ] Update modal integration to use new flow: Name → Channels → Security → Review
- [ ] Generate UUID v4 for commandId on modal open
- [ ] Subscribe to Redis events before sending POST request
- [ ] Show VMProgressModal after launch
- [ ] Show success toast on completion
- [ ] Reset form state on modal close/reopen
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill - E2E flow

### US-011: Update Playwright tests for multi-channel
**Description:** As a developer, I need updated tests for the new multi-channel flow.

**Acceptance Criteria:**
- [ ] Update tests/vm-creation-modal.spec.ts for new flow
- [ ] Test: Channel selection (single and multiple)
- [ ] Test: Each P0 channel form validation
- [ ] Test: dmPolicy selection persistence
- [ ] Test: Full happy path with mocked API
- [ ] Test: Error handling on API failure
- [ ] Typecheck passes
- [ ] All Playwright tests pass

## Functional Requirements

- FR-1: The system must support configuring at least one messaging channel per bot
- FR-2: Each channel must have required fields validated in real-time
- FR-3: The system must use OpenClaw's native dmPolicy (pairing/allowlist/open) instead of custom passcode
- FR-4: The system must subscribe to Redis 'clawd:responses' for real-time VM creation status
- FR-5: The system must generate UUID v4 for command correlation
- FR-6: The system must show progress feedback during async VM creation
- FR-7: The system must display error details and retry options on failure
- FR-8: The system must reset form state when modal reopens

## Non-Goals

- iMessage support (requires macOS host, we are on Linux)
- Signal P2 support (Phase 2)
- Slack, Matrix, Teams, Google Chat, Zalo, LINE P2 support (Phase 2)
- Granular progress steps (VALIDATING, DOWNLOAD_IMAGE, etc.) - optional enhancement
- Pairing approval UI in dashboard (Phase 2)
- Multi-channel message routing priority settings

## Design Considerations

- Channel cards use platform brand colors where appropriate
- Token inputs always masked by default with show/hide toggle
- Security step explains dmPolicy with visual diagram
- Progress modal blocks interaction until complete or error
- Mobile: full-screen modal with sticky header/footer

## Technical Considerations

- Redis client (ioredis) for pub/sub
- UUID generation for command correlation
- Zod validation for channel schemas
- TypeScript interfaces for channel configs
- SSR-safe Redis subscription handling

## Success Metrics

- Users can configure a bot with single channel in under 2 minutes
- Users can configure a bot with multiple channels in under 3 minutes
- VM creation feedback is received within 2 seconds of ACKNOWLEDGED event
- Error states are clear and actionable

## Open Questions

- Should we allow one bot to have multiple channels active simultaneously? (Yes - per PRD)
- How are messages routed when a bot has multiple channels? (Same session, different channel IDs)
- Should the Minion UI include a pairing approval interface? (Phase 2)

---

## Appendix: Detailed Technical Specification

For detailed technical specifications including API schemas, Redis event formats, and backend integration details, see the original document or implementation notes.

### Supported Channels Reference

| Channel | Phase | Required Fields | Optional Fields |
|---------|-------|-----------------|-----------------|
| Telegram | P0 | Bot Token | allowUsers, dmPolicy |
| Discord | P0 | Bot Token | dmPolicy, guilds |
| WhatsApp | P0 | Phone Number, API Key | webhookUrl |
| Slack | P2 | Bot Token | allowUsers, channels |
| Signal | P2 | Phone Number | cliPath, dmPolicy |
| Matrix | P2 | Homeserver, Token | userId |
| Teams | P2 | App ID, App Password | tenantId |
| Google Chat | P2 | Service Account JSON | - |
| Zalo | P2 | API Credentials | - |
| LINE | P2 | Channel Access Token | - |
| ~~iMessage~~ | ❌ | macOS only | N/A |

### Redis Event Format

```json
{
  "id": "cmd-uuid-v4",
  "type": "CREATE",
  "status": "ACKNOWLEDGED|SUCCESS|ERROR",
  "timestamp": "2026-02-07T10:30:00Z",
  "data": { ... }
}
```
