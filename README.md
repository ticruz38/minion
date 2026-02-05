# Minion

A platform for hiring pre-configured AI agents ("Minions") that handle specialized tasks.

## What is Minion?

Minion makes AI accessible to everyone by offering ready-to-use AI agents that:
- Run in isolated cloud environments (VMs on demand)
- Connect to your Google/Microsoft accounts, calendars, and tools
- Chat with you via WhatsApp or Telegram
- Store data in YOUR cloud, not ours
- Are proactive - they ask questions when needed

## Available Minions

- **The Accountant** - Bookkeeping, invoicing, tax prep
- **The Real Estate Scout** - Listing alerts, market analysis
- **The Financial Analyst** - Portfolio tracking, market alerts
- **The Restaurant Secretary** - Bookings, orders, customer chat
- **The Schedule Master** - Calendar optimization, smart scheduling
- **The Support Agent** - 24/7 customer support

## Tech Stack

- **Frontend**: Svelte 4 + SvelteKit + Vite
- **Backend**: (Coming soon) VM orchestration, WhatsApp/Telegram bots

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Docker

The project is containerized and available on Docker Hub:

```bash
# Pull and run from Docker Hub
docker pull ticruz38/minion:latest
docker run -p 3000:3000 -e GOOGLE_CLIENT_ID=xxx -e GOOGLE_CLIENT_SECRET=xxx ticruz38/minion:latest

# Or build locally
docker build -t minion .
docker run -p 3000:3000 minion
```

**Environment Variables:**
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `PUBLIC_BASE_URL` - Your public URL (e.g., https://minion-platform.com)

**Docker Hub:** https://hub.docker.com/r/ticruz38/minion

## Roadmap

- [ ] Backend API for VM provisioning
- [ ] WhatsApp/Telegram bot integration
- [ ] Google/Microsoft OAuth
- [ ] Payment integration
- [ ] Admin dashboard

## License

Private
