/**
 * Minions data - All available AI assistant profiles
 * Based on SKILL.md specification
 */

export interface Skill {
	id: string;
	name: string;
	description: string;
	priority: 'P0' | 'P1' | 'P2';
}

export interface Minion {
	id: string;
	name: string;
	role: string;
	color: string;
	emoji: string;
	description: string;
	tags: string[];
	skills: Skill[];
}

// Brand Color Palette - Muted Pastels inspired by vintage robots
const colors = {
	// Dusty greens
	sage: '#7BA38F',
	seafoam: '#6BA090',
	sageDark: '#5C8A73',
	
	// Dusty blues
	dustyBlue: '#7A9EB8',
	steelBlue: '#6B8BA3',
	skyDust: '#7AA3B8',
	dustyBlueDark: '#5A7E98',
	
	// Warm metallics
	bronze: '#A69060',
	golden: '#C9A227',
	sand: '#B8A67A',
	bronzeDark: '#8A7448',
	goldenDark: '#A88220',
	
	// Dusty purples
	dustyPurple: '#8B7BA3',
	lavender: '#9E7AB8',
	dustyPurpleDark: '#6B5B83',
	lavenderDark: '#7E5A98',
	
	// Earthy reds/oranges
	terracotta: '#C17A5C',
	mutedCoral: '#C97A7A',
	terracottaDark: '#A66042',
	mutedCoralDark: '#A95A5A',
	
	// Dusty pinks
	dustyRose: '#B87A9E',
	dustyPink: '#B87A9E',
	dustyRoseDark: '#985A7E',
	
	// Utility
	slate: '#6B7B8C',
	charcoal: '#2C3E50',
};

export const minions: Minion[] = [
	// Existing Profiles
	{
		id: 'accountant',
		name: 'Benny',
		role: 'Accountant',
		color: colors.sage,
		emoji: '📊',
		description: 'Your bookkeeping expert. Handles invoices, receipts, and financial reports.',
		tags: ['finance', 'accounting', 'taxes', 'bookkeeping'],
		skills: [
			{ id: 'quickbooks', name: 'QuickBooks', description: 'QuickBooks Online integration for sync', priority: 'P0' },
			{ id: 'invoices', name: 'Invoices', description: 'Create, send, and track invoices', priority: 'P0' },
			{ id: 'receipts', name: 'Receipts', description: 'Receipt OCR and data extraction', priority: 'P0' },
			{ id: 'reports', name: 'Reports', description: 'Generate P&L, balance sheet, cash flow', priority: 'P0' },
			{ id: 'tax-prep', name: 'Tax Prep', description: 'Tax document preparation and export', priority: 'P1' },
		],
	},
	{
		id: 'secretary',
		name: 'Terry',
		role: 'Secretary',
		color: colors.dustyBlue,
		emoji: '📅',
		description: 'Your personal assistant. Manages calendar, email, and meetings.',
		tags: ['admin', 'scheduling', 'email', 'calendar'],
		skills: [
			{ id: 'calendar', name: 'Calendar', description: 'Google/Outlook calendar management', priority: 'P0' },
			{ id: 'email', name: 'Email', description: 'Gmail/Outlook email handling', priority: 'P0' },
			{ id: 'slack', name: 'Slack', description: 'Slack integration for notifications', priority: 'P1' },
			{ id: 'meetings', name: 'Meetings', description: 'Meeting scheduling and prep', priority: 'P0' },
			{ id: 'reminders', name: 'Reminders', description: 'Follow-up and task reminders', priority: 'P0' },
		],
	},
	{
		id: 'trader',
		name: 'Troy',
		role: 'Trader',
		color: colors.bronze,
		emoji: '📈',
		description: 'Your crypto trading analyst. Tracks markets, alerts, and portfolio.',
		tags: ['crypto', 'trading', 'finance', 'alerts'],
		skills: [
			{ id: 'binance', name: 'Binance', description: 'Binance API integration (read-only)', priority: 'P0' },
			{ id: 'alerts', name: 'Alerts', description: 'Price alert system', priority: 'P0' },
			{ id: 'charts', name: 'Charts', description: 'Chart generation and technical analysis', priority: 'P0' },
			{ id: 'technical-analysis', name: 'TA', description: 'TA indicators and patterns', priority: 'P1' },
			{ id: 'portfolio', name: 'Portfolio', description: 'Portfolio tracking and P&L', priority: 'P0' },
		],
	},
	{
		id: 'realtor',
		name: 'Owen',
		role: 'Realtor',
		color: colors.golden,
		emoji: '🏠',
		description: 'Your real estate scout. Monitors listings and manages client relationships.',
		tags: ['real estate', 'property', 'listings', 'crm'],
		skills: [
			{ id: 'property-alerts', name: 'Property Alerts', description: 'Monitor listings matching criteria', priority: 'P0' },
			{ id: 'market-reports', name: 'Market Reports', description: 'Local market trend reports', priority: 'P0' },
			{ id: 'client-crm', name: 'Client CRM', description: 'Track client preferences and timeline', priority: 'P0' },
			{ id: 'showing-scheduler', name: 'Showings', description: 'Schedule property showings', priority: 'P0' },
			{ id: 'offer-tracker', name: 'Offers', description: 'Track offers and negotiations', priority: 'P1' },
		],
	},
	{
		id: 'analyst',
		name: 'Barry',
		role: 'Analyst',
		color: colors.dustyPurple,
		emoji: '📉',
		description: 'Your data expert. Creates charts, reports, and identifies trends.',
		tags: ['data', 'analytics', 'reports', 'charts'],
		skills: [
			{ id: 'data-connector', name: 'Data Connector', description: 'Connect to data sources (Sheets, Airtable)', priority: 'P0' },
			{ id: 'chart-generator', name: 'Charts', description: 'Create charts and visualizations', priority: 'P0' },
			{ id: 'report-builder', name: 'Reports', description: 'Build automated reports', priority: 'P0' },
			{ id: 'trend-detector', name: 'Trends', description: 'Identify patterns in data', priority: 'P1' },
			{ id: 'forecasting', name: 'Forecasting', description: 'Simple projections and forecasting', priority: 'P2' },
		],
	},
	{
		id: 'restaurant',
		name: 'Sergio',
		role: 'Restaurant',
		color: colors.terracotta,
		emoji: '🍽️',
		description: 'Your restaurant manager. Handles reservations and waitlists.',
		tags: ['hospitality', 'reservations', 'reviews', 'events'],
		skills: [
			{ id: 'reservation-manager', name: 'Reservations', description: 'Handle booking requests', priority: 'P0' },
			{ id: 'waitlist', name: 'Waitlist', description: 'Manage waitlist and table turns', priority: 'P0' },
			{ id: 'specials-board', name: 'Specials', description: 'Daily menu/specials updates', priority: 'P1' },
			{ id: 'review-monitor', name: 'Reviews', description: 'Monitor and respond to reviews', priority: 'P1' },
			{ id: 'event-booking', name: 'Events', description: 'Private dining and events', priority: 'P2' },
		],
	},
	{
		id: 'support',
		name: 'Tim',
		role: 'Support',
		color: colors.dustyRose,
		emoji: '🎧',
		description: 'Your customer support agent. Triages tickets and drafts responses.',
		tags: ['support', 'helpdesk', 'tickets', 'customer service'],
		skills: [
			{ id: 'ticket-triage', name: 'Ticket Triage', description: 'Categorize and route tickets', priority: 'P0' },
			{ id: 'kb-search', name: 'Knowledge Base', description: 'Search knowledge base for answers', priority: 'P0' },
			{ id: 'response-drafts', name: 'Responses', description: 'Draft support responses', priority: 'P0' },
			{ id: 'escalation-detector', name: 'Escalation', description: 'Detect when to escalate', priority: 'P1' },
			{ id: 'satisfaction-tracker', name: 'CSAT', description: 'Track CSAT and feedback', priority: 'P1' },
		],
	},

	// New Profiles
	{
		id: 'content-creator',
		name: 'Casey',
		role: 'Content Creator',
		color: colors.mutedCoral,
		emoji: '✍️',
		description: 'Your social media strategist. Writes posts and schedules content.',
		tags: ['social media', 'content', 'writing', 'marketing'],
		skills: [
			{ id: 'content-writer', name: 'Content Writer', description: 'Write posts, blogs, captions in user voice', priority: 'P0' },
			{ id: 'social-scheduler', name: 'Scheduler', description: 'Schedule posts to LinkedIn, Twitter, etc.', priority: 'P0' },
			{ id: 'engagement-replies', name: 'Engagement', description: 'Draft replies to comments/DMs', priority: 'P1' },
			{ id: 'image-prompts', name: 'Image Prompts', description: 'Generate prompts for AI image tools', priority: 'P1' },
			{ id: 'hashtag-research', name: 'Hashtags', description: 'Find trending and relevant hashtags', priority: 'P2' },
		],
	},
	{
		id: 'invoice-chaser',
		name: 'Chase',
		role: 'Invoice Chaser',
		color: colors.bronze,
		emoji: '💸',
		description: 'Your collections specialist. Sends reminders and tracks payments.',
		tags: ['invoicing', 'payments', 'collections', 'finance'],
		skills: [
			{ id: 'invoice-generator', name: 'Invoice Gen', description: 'Create professional invoices', priority: 'P0' },
			{ id: 'payment-reminders', name: 'Reminders', description: 'Send polite/firm payment reminders', priority: 'P0' },
			{ id: 'client-tracker', name: 'Client Tracker', description: 'Track client payment history', priority: 'P0' },
			{ id: 'payment-reconciliation', name: 'Reconciliation', description: 'Match payments to invoices', priority: 'P1' },
			{ id: 'late-fee-calculator', name: 'Late Fees', description: 'Calculate and apply late fees', priority: 'P1' },
		],
	},
	{
		id: 'receipt-tracker',
		name: 'Rex',
		role: 'Receipt Tracker',
		color: colors.seafoam,
		emoji: '🧾',
		description: 'Your expense tracker. Scans receipts and categorizes spending.',
		tags: ['expenses', 'receipts', 'taxes', 'ocr'],
		skills: [
			{ id: 'receipt-ocr', name: 'Receipt OCR', description: 'Extract data from receipt photos', priority: 'P0' },
			{ id: 'expense-categorizer', name: 'Categorizer', description: 'Auto-categorize expenses', priority: 'P0' },
			{ id: 'tax-export', name: 'Tax Export', description: 'Export expenses for tax filing', priority: 'P0' },
			{ id: 'monthly-reports', name: 'Reports', description: 'Generate monthly expense summaries', priority: 'P1' },
			{ id: 'mileage-tracker', name: 'Mileage', description: 'Track business mileage', priority: 'P2' },
		],
	},
	{
		id: 'researcher',
		name: 'Russ',
		role: 'Researcher',
		color: colors.steelBlue,
		emoji: '🔍',
		description: 'Your research assistant. Monitors web, news, and competitors.',
		tags: ['research', 'monitoring', 'news', 'competitive intel'],
		skills: [
			{ id: 'web-search', name: 'Web Search', description: 'Search web for information', priority: 'P0' },
			{ id: 'news-aggregator', name: 'News', description: 'Collect news from RSS/feeds', priority: 'P0' },
			{ id: 'competitor-monitor', name: 'Competitors', description: 'Track competitor websites/changes', priority: 'P0' },
			{ id: 'summarizer', name: 'Summarizer', description: 'Summarize articles and reports', priority: 'P0' },
			{ id: 'saved-searches', name: 'Saved Searches', description: 'Run and save recurring searches', priority: 'P1' },
		],
	},
	{
		id: 'email-handler',
		name: 'Ian',
		role: 'Email Handler',
		color: colors.skyDust,
		emoji: '📧',
		description: 'Your inbox manager. Triage, summarize, and draft replies.',
		tags: ['email', 'inbox', 'communication', 'productivity'],
		skills: [
			{ id: 'inbox-triage', name: 'Triage', description: 'Sort and prioritize emails', priority: 'P0' },
			{ id: 'email-summarizer', name: 'Summarizer', description: 'Summarize long threads', priority: 'P0' },
			{ id: 'draft-responses', name: 'Draft Replies', description: 'Draft reply options', priority: 'P0' },
			{ id: 'unsubscribe-helper', name: 'Unsubscribe', description: 'Identify and unsubscribe from lists', priority: 'P1' },
			{ id: 'follow-up-reminders', name: 'Follow-ups', description: 'Remind about emails needing replies', priority: 'P1' },
		],
	},
	{
		id: 'gift-guru',
		name: 'Gigi',
		role: 'Gift Guru',
		color: colors.lavender,
		emoji: '🎁',
		description: 'Your gift concierge. Suggests presents and tracks occasions.',
		tags: ['gifts', 'shopping', 'events', 'personal'],
		skills: [
			{ id: 'gift-suggestions', name: 'Suggestions', description: 'Suggest personalized gifts', priority: 'P0' },
			{ id: 'occasion-reminders', name: 'Occasions', description: 'Birthday/anniversary reminders', priority: 'P0' },
			{ id: 'recipient-profiles', name: 'Profiles', description: 'Store preferences and history per person', priority: 'P0' },
			{ id: 'budget-tracker', name: 'Budget', description: 'Track gift spending', priority: 'P1' },
			{ id: 'gift-wrapping-locator', name: 'Wrapping', description: 'Find local gift services', priority: 'P2' },
		],
	},
	{
		id: 'meal-planner',
		name: 'Chip',
		role: 'Meal Planner',
		color: colors.sage,
		emoji: '🍳',
		description: 'Your nutrition assistant. Plans meals and generates shopping lists.',
		tags: ['food', 'cooking', 'nutrition', 'shopping'],
		skills: [
			{ id: 'recipe-suggester', name: 'Recipes', description: 'Suggest recipes based on preferences', priority: 'P0' },
			{ id: 'shopping-list-generator', name: 'Shopping List', description: 'Generate organized shopping lists', priority: 'P0' },
			{ id: 'nutrition-tracker', name: 'Nutrition', description: 'Track macros and calories', priority: 'P2' },
			{ id: 'leftover-manager', name: 'Leftovers', description: 'Suggest uses for leftovers', priority: 'P1' },
			{ id: 'pantry-tracker', name: 'Pantry', description: 'Track what you have on hand', priority: 'P1' },
		],
	},
	{
		id: 'handyman',
		name: 'Hank',
		role: 'Handyman',
		color: colors.sand,
		emoji: '🔧',
		description: 'Your home maintenance tracker. Schedules repairs and finds contractors.',
		tags: ['home', 'maintenance', 'repairs', 'contractors'],
		skills: [
			{ id: 'maintenance-scheduler', name: 'Maintenance', description: 'Schedule recurring maintenance', priority: 'P0' },
			{ id: 'appliance-tracker', name: 'Appliances', description: 'Track appliances and manuals', priority: 'P0' },
			{ id: 'warranty-manager', name: 'Warranties', description: 'Store and alert on warranties', priority: 'P1' },
			{ id: 'contractor-finder', name: 'Contractors', description: 'Find and vet local contractors', priority: 'P1' },
			{ id: 'diy-guides', name: 'DIY Guides', description: 'Provide step-by-step repair guides', priority: 'P1' },
		],
	},
	{
		id: 'trip-planner',
		name: 'Tina',
		role: 'Trip Planner',
		color: colors.dustyPink,
		emoji: '✈️',
		description: 'Your travel agent. Finds flights, hotels, and builds itineraries.',
		tags: ['travel', 'flights', 'hotels', 'itineraries'],
		skills: [
			{ id: 'flight-search', name: 'Flights', description: 'Search and compare flights', priority: 'P0' },
			{ id: 'hotel-finder', name: 'Hotels', description: 'Find and compare accommodations', priority: 'P0' },
			{ id: 'itinerary-builder', name: 'Itinerary', description: 'Build day-by-day itineraries', priority: 'P0' },
			{ id: 'reservation-tracker', name: 'Reservations', description: 'Track all booking confirmations', priority: 'P0' },
			{ id: 'local-guides', name: 'Local Guides', description: 'Suggest restaurants and activities', priority: 'P1' },
		],
	},
];

// Get unique tags from all minions
export const allTags = Array.from(
	new Set(minions.flatMap(m => m.tags))
).sort();

// Get minions by tag
export function getMinionsByTag(tag: string): Minion[] {
	return minions.filter(m => m.tags.includes(tag));
}

// Search minions by query
export function searchMinions(query: string): Minion[] {
	const lowerQuery = query.toLowerCase();
	return minions.filter(m =>
		m.name.toLowerCase().includes(lowerQuery) ||
		m.role.toLowerCase().includes(lowerQuery) ||
		m.description.toLowerCase().includes(lowerQuery) ||
		m.tags.some(t => t.toLowerCase().includes(lowerQuery)) ||
		m.skills.some(s => 
			s.name.toLowerCase().includes(lowerQuery) ||
			s.description.toLowerCase().includes(lowerQuery)
		)
	);
}

// Get P0 (critical) skills count
export function getCriticalSkillsCount(minion: Minion): number {
	return minion.skills.filter(s => s.priority === 'P0').length;
}

// Get total skills count
export function getTotalSkillsCount(minion: Minion): number {
	return minion.skills.length;
}
