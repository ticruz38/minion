# PRD: VM Creation Modal - Multi-Step Bot Configuration

## Introduction

A streamlined, non-technical flow for creating OpenClaw VM bots after selecting a Minion character. The modal guides users through 4 simple steps to configure their bot, hiding all technical complexity (auto-filled RAM, CPU, disk, and model) while collecting only essential information: bot name, Telegram token, and access passcode.

> **⚠️ CRITICAL REQUIREMENT: Each UI user story MUST be verified using the Playwright skill.**
> 
> Before marking any UI story as complete, the implementing agent must:
> 1. Use the Playwright skill to start the dev server
> 2. Navigate to the feature and interact with it
> 3. Capture screenshots (desktop + mobile viewports)
> 4. Record videos for E2E flows
> 5. Attach evidence to the story completion

## Goals

- Enable non-technical users to create a VM bot in under 60 seconds
- Maintain visual consistency with the existing character selector aesthetic
- Support both desktop and mobile experiences seamlessly
- Provide clear feedback on credit costs before launching
- **CRITICAL: Each UI step MUST be verified using the Playwright skill with screenshot/video evidence**

## User Stories

### US-001: Create VM Creation Modal Shell Component
**Description:** As a developer, I need a reusable modal component that can host the multi-step flow so the UI remains maintainable.

**Acceptance Criteria:**
- [ ] Create `VMCreationModal.svelte` component in `src/lib/components/`
- [ ] Modal overlays full screen with backdrop blur
- [ ] Click outside or X button closes modal (with confirmation if form dirty)
- [ ] Escape key closes modal
- [ ] Animate in/out with scale + fade transitions
- [ ] Typecheck passes
- [ ] **Playwright Skill Verification (REQUIRED):**
  - [ ] Run dev server and use Playwright skill to verify modal opens with correct backdrop blur
  - [ ] Screenshot test: Desktop (1280x720) - modal centered with proper styling
  - [ ] Screenshot test: Mobile (375x812) - modal full-screen with proper layout
  - [ ] Test: Click outside closes modal, Escape key closes modal
  - [ ] Test: Animation in/out is smooth (record video if possible)

### US-002: Build Step 1 - Name Your Bot
**Description:** As a user, I want to give my bot a memorable name so I can identify it later.

**Acceptance Criteria:**
- [ ] Display selected Minion avatar and name at top
- [ ] Single text input for bot name (3-30 chars, alphanumeric + hyphen)
- [ ] Real-time validation: show error if name exists or invalid format
- [ ] "Next" button disabled until valid name entered
- [ ] Show step indicator: "Step 1 of 4"
- [ ] Responsive: full width on mobile, max-width 400px on desktop
- [ ] Typecheck passes
- [ ] **Playwright Skill Verification (REQUIRED):**
  - [ ] Screenshot: Step 1 initial state (empty input, disabled Next button)
  - [ ] Screenshot: Step 1 with invalid name (shows error message)
  - [ ] Screenshot: Step 1 with valid name (Next button enabled)
  - [ ] Test: Input validation - too short (< 3 chars), invalid chars, too long (> 30)
  - [ ] Verify responsive layout on both desktop and mobile viewports

### US-003: Build Step 2 - Telegram Configuration
**Description:** As a user, I want to connect my Telegram bot so it can receive messages.

**Acceptance Criteria:**
- [ ] Password-masked input for bot token (show/hide toggle)
- [ ] Help text with link to @BotFather instructions
- [ ] Validate token format (should match `\d+:[A-Za-z0-9_-]+`)
- [ ] "Back" and "Next" buttons
- [ ] Optional: "Test Connection" button to validate token (stretch goal)
- [ ] Responsive layout
- [ ] Typecheck passes
- [ ] **Playwright Skill Verification (REQUIRED):**
  - [ ] Screenshot: Step 2 with masked token input
  - [ ] Screenshot: Step 2 with revealed token (click show/hide toggle)
  - [ ] Screenshot: Step 2 with invalid token format (error state)
  - [ ] Test: Show/hide toggle functionality
  - [ ] Test: Invalid token formats are rejected with error message
  - [ ] Test: Valid token format enables Next button
  - [ ] Verify responsive layout on both desktop and mobile viewports

### US-004: Build Step 3 - Security Passcode
**Description:** As a user, I want to set a passcode so only authorized people can use my bot.

**Acceptance Criteria:**
- [ ] Input for passcode (4-20 characters)
- [ ] Show/hide toggle for passcode
- [ ] Generate random passcode button (dice icon) for convenience
- [ ] Explanation: "Users must message this passcode to the bot before accessing it"
- [ ] "Back" and "Next" buttons
- [ ] Typecheck passes
- [ ] **Playwright Skill Verification (REQUIRED):**
  - [ ] Screenshot: Step 3 initial state (empty passcode input)
  - [ ] Screenshot: Step 3 after clicking generate button (passcode filled)
  - [ ] Screenshot: Step 3 with revealed passcode (click show/hide toggle)
  - [ ] Test: Generate random passcode button fills input with valid code
  - [ ] Test: Show/hide toggle works correctly
  - [ ] Test: Invalid passcode lengths show error (< 4 or > 20 chars)
  - [ ] Verify responsive layout on both desktop and mobile viewports

### US-005: Build Step 4 - Review & Launch
**Description:** As a user, I want to review my configuration and see credit costs before launching.

**Acceptance Criteria:**
- [ ] Display summary card with:
  - Selected Minion avatar + name
  - Bot name
  - Telegram status (connected)
  - Passcode (masked, reveal toggle)
- [ ] Credit cost breakdown:
  - Hourly rate (auto-calculated: 95 credits/hour)
  - Current balance (from API)
  - Estimated runtime with current balance
- [ ] Warning banner if balance < 2 hours of runtime
- [ ] "Back" and "Launch Bot" primary button
- [ ] Loading state on launch button during API call
- [ ] Typecheck passes
- [ ] **Playwright Skill Verification (REQUIRED):**
  - [ ] Screenshot: Step 4 review page with all data displayed correctly
  - [ ] Screenshot: Step 4 with revealed passcode (click toggle)
  - [ ] Screenshot: Step 4 with sufficient credits (no warning)
  - [ ] Screenshot: Step 4 with low balance (< 2 hours, warning banner visible)
  - [ ] Screenshot: Step 4 during API call (loading state on Launch button)
  - [ ] Test: All summary data is correctly displayed
  - [ ] Test: Credit calculations display correctly
  - [ ] Test: Warning banner appears when balance is low
  - [ ] Verify responsive layout on both desktop and mobile viewports

### US-006: Integrate Modal with CharacterSelector
**Description:** As a user, when I click "HIRE" on a Minion, the creation modal should open.

**Acceptance Criteria:**
- [ ] Replace current `hireMinion` event dispatch with modal opening
- [ ] Pass selected Minion data to modal
- [ ] Modal pre-fills profile based on Minion type (accountant, realtor, etc.)
- [ ] On successful launch: close modal and show success toast
- [ ] On error: show error message in modal, stay on review step
- [ ] Typecheck passes
- [ ] **Playwright Skill Verification (REQUIRED):**
  - [ ] Screenshot: CharacterSelector with "HIRE" button highlighted
  - [ ] Screenshot: Modal opens after clicking HIRE, showing Step 1 with correct Minion
  - [ ] Record E2E video: Full flow from HIRE click → Step 1 → Step 2 → Step 3 → Step 4 → Launch
  - [ ] Test: Different Minions show correct colors and profiles in modal
  - [ ] Test: Success toast appears after successful launch
  - [ ] Test: Error state displays correctly on API failure
  - [ ] Verify full flow works on both desktop and mobile viewports

### US-007: Create API Endpoint for VM Creation
**Description:** As a developer, I need a backend endpoint to handle VM creation requests.

**Acceptance Criteria:**
- [ ] Create `POST /api/vms` endpoint
- [ ] Request body validation with Zod
- [ ] Auto-fill technical fields:
  - `model`: "moonshot/kimi-k2.5"
  - `ram`: 4
  - `cpus`: 2
  - `disk`: 20
  - `profiles`: [selectedMinion.id]
  - `channels.telegram.dmPolicy`: "passcode"
  - `env.BOT_PASSCODE`: user-provided passcode
- [ ] Publish message to Redis `clawd:commands` channel
- [ ] Return VM creation response or error
- [ ] Typecheck passes
- [ ] Unit tests for endpoint validation

### US-008: Responsive Mobile Experience
**Description:** As a mobile user, I want the modal to work seamlessly on my phone.

**Acceptance Criteria:**
- [ ] Modal is full-screen on mobile (< 768px)
- [ ] Touch-friendly inputs (min 44px tap targets)
- [ ] Bottom-fixed action buttons on mobile
- [ ] Swipe gesture to go back (optional)
- [ ] Test on iOS Safari and Android Chrome
- [ ] Typecheck passes
- [ ] **Playwright Skill Verification (REQUIRED):**
  - [ ] Screenshot all 4 steps at mobile viewport (375x812 iPhone X)
  - [ ] Screenshot all 4 steps at tablet viewport (768x1024 iPad)
  - [ ] Test: Tap targets are at least 44x44px (inspect element sizes)
  - [ ] Test: Bottom-fixed buttons are visible and tappable
  - [ ] Test: Modal content is scrollable when content exceeds viewport
  - [ ] Record video: Mobile interaction flow (tap, swipe, keyboard)

### US-009: Playwright Test Suite (Using Playwright Skill)
**Description:** As a developer, I need comprehensive Playwright tests using the Playwright skill to verify the modal works correctly across all scenarios.

**Acceptance Criteria:**
- [ ] Test file: `tests/vm-creation-modal.spec.ts`
- [ ] **MANDATORY: Use Playwright skill for each verification**
- [ ] Tests cover:
  - Opening modal from character selector
  - Step navigation (next/back)
  - Form validation on each step
  - Full happy path submission
  - Mobile viewport rendering
- [ ] **Playwright Skill Verification (REQUIRED for every test):**
  - [ ] Run `npx playwright test` via Playwright skill after each UI story completion
  - [ ] Generate screenshots for visual regression baseline
  - [ ] Record videos for complex interactions (E2E flows)
  - [ ] Test against actual running dev server (port 5173 or detected)
  - [ ] Verify both viewports: Desktop (1280x720) and Mobile (375x812)
- [ ] Tests run in CI
- [ ] Screenshots captured for visual regression

## Functional Requirements

- FR-1: Modal opens when user clicks "HIRE" button on any Minion
- FR-2: Modal displays 4 sequential steps with progress indicator
- FR-3: Step 1 (Name): Validate unique bot name (3-30 chars, alphanumeric + hyphen)
- FR-4: Step 2 (Telegram): Validate bot token format, provide @BotFather help link
- FR-5: Step 3 (Passcode): Allow 4-20 char passcode, provide random generator
- FR-6: Step 4 (Review): Display credit cost breakdown and current balance
- FR-7: Auto-calculate credit cost: 95 credits/hour (fixed defaults: 4GB RAM, 2 CPU, 20GB disk)
- FR-8: Auto-fill VM config: model="moonshot/kimi-k2.5", profiles=[minionId], dmPolicy="passcode"
- FR-9: Show low balance warning if available credits < 2 hours of runtime
- FR-10: Submit to `POST /api/vms` which publishes to Redis `clawd:commands`
- FR-11: Modal is full-screen on mobile, centered card on desktop
- FR-12: **Each step MUST be verified using the Playwright skill** - screenshots required for desktop and mobile, video recording for full E2E flow

## Non-Goals

- No support for custom RAM/CPU/disk (fixed defaults only)
- No support for multiple channels (Telegram only for MVP)
- No support for environment variables beyond passcode
- No real-time credit balance updates during modal flow
- No VM editing after creation (delete and recreate instead)
- No support for other AI models (kimi-k2.5 only)

## Design Considerations

### Visual Style
- Match existing CharacterSelector aesthetic (dark theme, glassmorphism)
- Minion color as accent throughout modal
- Smooth transitions between steps (slide + fade)
- Consistent spacing and typography

### Step Indicator
```
●───○───○───○
1   2   3   4
```
- Completed steps: filled with Minion color
- Current step: filled with glow effect
- Future steps: outlined

### Mobile Layout
- Full-screen modal (no rounded corners)
- Sticky header with back/close
- Sticky footer with primary action
- Scrollable content area

### Desktop Layout
- Centered card (max-width: 480px)
- Backdrop blur on page behind
- Floating action buttons at bottom of card

## Technical Considerations

### State Management
- Use Svelte writable store for modal state
- Track: `currentStep`, `formData`, `isSubmitting`, `errors`
- Persist form data when navigating between steps

### API Integration
```typescript
// POST /api/vms request body
{
  "name": "my-bot",
  "model": "moonshot/kimi-k2.5",
  "ram": 4,
  "cpus": 2,
  "disk": 20,
  "profiles": ["accountant"],
  "channels": {
    "telegram": {
      "token": "123456:ABC-DEF...",
      "dmPolicy": "passcode"
    }
  },
  "env": {
    "BOT_PASSCODE": "secret123"
  }
}
```

### Redis Message Format
Follows `clawd:commands` channel spec from `tasks/vm-creation.md`:
```json
{
  "id": "cmd-uuid",
  "timestamp": "2026-02-06T10:30:00Z",
  "type": "CREATE",
  "clientId": "client-uuid",
  "payload": { /* VM config */ }
}
```

### Playwright Testing Strategy (Using Playwright Skill)

**CRITICAL: Each user story MUST use the Playwright skill for verification.**

The Playwright skill is available at `/root/.config/agents/skills/playwright-skill/SKILL.md`.

#### Testing Workflow for Each Story:
1. **Start dev server**: `npm run dev` (Playwright skill auto-detects)
2. **Navigate to page**: Use skill to open `http://localhost:5173`
3. **Interact**: Click, type, navigate as specified
4. **Capture screenshots**: Use skill's screenshot capability
5. **Record videos**: For E2E flows and complex interactions
6. **Validate**: Compare against expected behavior

#### Required Viewports:
- **Desktop**: 1280x720 (standard laptop)
- **Mobile**: 375x812 (iPhone X)

#### Test Data:
- Mock API responses for credit balance
- Test bot names: valid/invalid scenarios
- Test tokens: valid format vs invalid format
- Test passcodes: various lengths

#### Screenshot Checklist (to be captured via Playwright skill):
- [ ] Step 1: Empty, invalid input, valid input
- [ ] Step 2: Masked token, revealed token, error state
- [ ] Step 3: Empty, generated passcode, revealed
- [ ] Step 4: Review page (sufficient credits, low credits, loading)
- [ ] Full flow: Video recording from HIRE to success
- [ ] Mobile: All 4 steps at 375x812
- [ ] Tablet: All 4 steps at 768x1024

## Success Metrics

- Users can create a bot in under 60 seconds
- Zero support tickets about "how to create a bot"
- Mobile completion rate > 90%
- All Playwright tests pass in CI
- No visual regressions between deployments

## Open Questions

1. Should we auto-generate a suggested bot name based on Minion type (e.g., "benny-accountant")?
2. Do we need to validate Telegram token by making an actual API call, or just format validation?
3. Should passcode be shown in review step, or always masked?
4. Do we need a "success" animation after launch, or just close + toast?
