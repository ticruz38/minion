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
│   └── server/
│       └── auth.ts          # Server-side auth session management
├── routes/
│   ├── +page.svelte         # Homepage with hero + character selector
│   ├── auth/callback/       # OAuth callback page
│   ├── api/auth/            # Auth endpoints (init, callback, notify)
│   └── api/vms/             # VM creation endpoint
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

**Note:** OAuth callback URL must be registered in Google Cloud Console:
- `https://minion.nuts.cash/auth/callback`

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
3. User configures bot through 4 steps (name, Telegram token, passcode, review)
4. On successful launch: modal closes and shows success toast notification with minion name
5. API POST `/api/vms` publishes to Redis `clawd:commands` channel

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

**Maintainers:** Update this date when modifying this file.
