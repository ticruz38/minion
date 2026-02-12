# Minion Brand Design System

## Brand Essence

**"The Professional Automaton"** - A workforce of vintage-inspired AI assistants that feel tangible, trustworthy, and artisanal.

---

## Color Palette

### Primary Colors (Backgrounds)
| Name | Hex | Usage |
|------|-----|-------|
| Cream | `#F7F5F0` | Primary background |
| Warm White | `#FAF9F6` | Card backgrounds |
| Dusty Blue | `#6B7B8C` | Secondary background, headers |
| Slate | `#3D4A5C` | Dark sections, footer |

### Accent Colors (Brand Identity)
| Name | Hex | Usage |
|------|-----|-------|
| Mustard | `#D4A853` | Primary CTA, highlights, badges |
| Ochre | `#C9963C` | Hover states, gradients |
| Copper | `#B87333` | Secondary accents, links |
| Terracotta | `#C17A5C` | Alerts, warnings |

### Neutral Colors (Text & UI)
| Name | Hex | Usage |
|------|-----|-------|
| Charcoal | `#2C3E50` | Primary text |
| Graphite | `#5A6B7C` | Secondary text, captions |
| Mist | `#9AA5B1` | Placeholders, disabled |
| Stone | `#E5E1D8` | Borders, dividers |
| Cloud | `#F0EDE6` | Subtle backgrounds |

### Robot Personality Colors (Minion Accents)
| Minion | Primary | Secondary |
|--------|---------|-----------|
| Accountant (Benny) | `#7BA38F` (Sage) | `#5C8A73` |
| Secretary (Terry) | `#7A9EB8` (Dusty Blue) | `#5A7E98` |
| Trader (Troy) | `#A69060` (Bronze) | `#8A7448` |
| Realtor (Owen) | `#C9A227` (Golden) | `#A88220` |
| Analyst (Barry) | `#8B7BA3` (Dusty Purple) | `#6B5B83` |
| Restaurant (Sergio) | `#C17A5C` (Terracotta) | `#A66042` |
| Support (Tim) | `#B87A9E` (Dusty Rose) | `#985A7E` |
| Content Creator (Casey) | `#C97A7A` (Muted Coral) | `#A95A5A` |
| Invoice Chaser (Chase) | `#A69060` (Bronze) | `#8A7448` |
| Receipt Tracker (Rex) | `#6BA090` (Seafoam) | `#4B8070` |
| Researcher (Russ) | `#6B8BA3` (Steel Blue) | `#4B6B83` |
| Email Handler (Ian) | `#7AA3B8` (Sky Dust) | `#5A8398` |
| Gift Guru (Gigi) | `#9E7AB8` (Lavender) | `#7E5A98` |
| Meal Planner (Chip) | `#8BA36B` (Sage Green) | `#6B834B` |
| Handyman (Hank) | `#B8A67A` (Sand) | `#98865A` |
| Trip Planner (Tina) | `#B87A9E` (Dusty Pink) | `#985A7E` |

---

## Typography

### Font Family
```css
--font-heading: 'Space Grotesk', system-ui, sans-serif;
--font-body: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### Type Scale
| Style | Size | Weight | Line Height | Letter Spacing |
|-------|------|--------|-------------|----------------|
| H1 | 48px / 3rem | 700 | 1.1 | -0.02em |
| H2 | 36px / 2.25rem | 600 | 1.2 | -0.01em |
| H3 | 24px / 1.5rem | 600 | 1.3 | 0 |
| H4 | 18px / 1.125rem | 600 | 1.4 | 0 |
| Body Large | 18px / 1.125rem | 400 | 1.6 | 0 |
| Body | 16px / 1rem | 400 | 1.6 | 0 |
| Small | 14px / 0.875rem | 400 | 1.5 | 0 |
| Caption | 12px / 0.75rem | 500 | 1.4 | 0.02em |
| Label | 11px / 0.6875rem | 600 | 1.2 | 0.05em |

### Typography Rules
- **Headings**: Space Grotesk, tight letter-spacing for modern feel
- **Body**: Inter, comfortable line-height for readability
- **Labels/Tags**: Uppercase, wide letter-spacing (0.05em)
- **Numbers**: Tabular figures for alignment

---

## Spacing System

### Base Unit: 4px
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--space-12: 48px;
--space-16: 64px;
--space-24: 96px;
--space-32: 128px;
```

### Section Spacing
- **Small sections**: 64px (space-16)
- **Medium sections**: 96px (space-24)
- **Large sections**: 128px (space-32)

---

## Border Radius

```css
--radius-sm: 6px;      /* Small elements: tags, badges */
--radius-md: 10px;     /* Buttons, inputs */
--radius-lg: 16px;     /* Cards, containers */
--radius-xl: 24px;     /* Large cards, modals */
--radius-full: 9999px; /* Pills, avatars */
```

---

## Shadows

```css
/* Subtle elevation */
--shadow-sm: 0 1px 2px rgba(44, 62, 80, 0.05);

/* Cards at rest */
--shadow-md: 0 4px 6px -1px rgba(44, 62, 80, 0.05), 
             0 2px 4px -1px rgba(44, 62, 80, 0.03);

/* Cards hover / Dropdowns */
--shadow-lg: 0 10px 15px -3px rgba(44, 62, 80, 0.08), 
             0 4px 6px -2px rgba(44, 62, 80, 0.04);

/* Modals / Popovers */
--shadow-xl: 0 20px 25px -5px rgba(44, 62, 80, 0.1), 
             0 10px 10px -5px rgba(44, 62, 80, 0.04);

/* Special: Warm glow for CTAs */
--shadow-warm: 0 4px 14px rgba(212, 168, 83, 0.3);
```

---

## UI Components

### Buttons

**Primary Button**
```css
background: linear-gradient(135deg, #D4A853 0%, #C9963C 100%);
color: #2C3E50;
border-radius: 10px;
padding: 12px 24px;
font-weight: 600;
box-shadow: 0 4px 14px rgba(212, 168, 83, 0.3);
```

**Secondary Button**
```css
background: transparent;
border: 1.5px solid #E5E1D8;
color: #5A6B7C;
border-radius: 10px;
padding: 12px 24px;
```

**Ghost Button**
```css
background: rgba(107, 123, 140, 0.08);
color: #6B7B8C;
border-radius: 10px;
```

### Cards

**Standard Card**
```css
background: #FAF9F6;
border: 1px solid #E5E1D8;
border-radius: 16px;
padding: 24px;
box-shadow: 0 4px 6px -1px rgba(44, 62, 80, 0.05);
```

**Card Hover**
```css
transform: translateY(-2px);
box-shadow: 0 10px 15px -3px rgba(44, 62, 80, 0.08);
border-color: #D4C4A8;
```

### Tags/Badges

**Skill Tag**
```css
background: rgba(107, 123, 140, 0.08);
color: #5A6B7C;
padding: 4px 10px;
border-radius: 6px;
font-size: 12px;
font-weight: 500;
letter-spacing: 0.02em;
```

**Priority Badge P0**
```css
background: rgba(123, 163, 143, 0.15);
color: #5C8A73;
```

**Priority Badge P1**
```css
background: rgba(212, 168, 83, 0.15);
color: #A88220;
```

**Priority Badge P2**
```css
background: rgba(154, 165, 177, 0.15);
color: #7A8A9A;
```

---

## Visual Effects

### Texture (Subtle)
```css
/* Optional grain overlay for vintage feel */
.texture-overlay {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
}
```

### Gradients
```css
/* Hero gradient - subtle warmth */
--gradient-hero: linear-gradient(180deg, #F7F5F0 0%, #EDE9E0 100%);

/* Card gradient - slight depth */
--gradient-card: linear-gradient(180deg, #FAF9F6 0%, #F5F3EE 100%);

/* Accent gradient - CTA buttons */
--gradient-accent: linear-gradient(135deg, #D4A853 0%, #C9963C 100%);

/* Dark section gradient */
--gradient-dark: linear-gradient(180deg, #3D4A5C 0%, #2E3A4C 100%);
```

---

## Layout Principles

### Container
```css
max-width: 1280px;
margin: 0 auto;
padding: 0 24px;
```

### Grid
- **Cards grid**: `repeat(auto-fill, minmax(300px, 1fr))`
- **Gap**: 24px
- **Skills grid**: 2-3 columns depending on viewport

### Responsive Breakpoints
| Breakpoint | Width | Adjustments |
|------------|-------|-------------|
| Mobile | < 640px | Single column, reduced spacing |
| Tablet | 640-1024px | 2 columns |
| Desktop | > 1024px | Full layout |

---

## Robot Avatar Styling

### 3D Avatar Container
```css
.avatar-container {
  background: linear-gradient(135deg, #F0EDE6 0%, #E5E1D8 100%);
  border: 2px solid #D4C4A8;
  border-radius: 20px;
  padding: 8px;
  box-shadow: 
    inset 0 2px 4px rgba(44, 62, 80, 0.05),
    0 4px 6px rgba(44, 62, 80, 0.05);
}
```

### Avatar Glow (Active State)
```css
.avatar-active {
  box-shadow: 
    0 0 0 3px rgba(212, 168, 83, 0.3),
    0 8px 20px rgba(212, 168, 83, 0.2);
}
```

---

## Animation

### Transitions
```css
--transition-fast: 150ms ease;
--transition-base: 200ms ease;
--transition-slow: 300ms ease;
```

### Hover Effects
- Cards: `transform: translateY(-2px)` + shadow increase
- Buttons: Slight brightness increase + shadow
- Links: Color shift to Copper (#B87333)

### Page Load
- Stagger children with 50ms delay
- Fade in + slight upward movement (8px)
- Duration: 400ms, easing: cubic-bezier(0.4, 0, 0.2, 1)

---

## Iconography

### Style
- **Line icons**: 1.5px stroke
- **Rounded caps**: Round line joins
- **Size**: 20px default, 16px small, 24px large
- **Color**: Inherit from text

### Icon Colors
- Default: `#5A6B7C`
- Active: `#D4A853`
- Muted: `#9AA5B1`

---

## Voice & Tone

### Brand Voice
- **Professional but approachable**: Like a trusted colleague
- **Clear and concise**: No fluff, direct communication
- **Slightly whimsical**: Acknowledge the "robot army" concept with subtle humor
- **Competent**: Exudes capability and reliability

### Copy Guidelines
- Use sentence case for headings
- Use active voice
- Avoid technical jargon unless necessary
- "Hire" not "Deploy", "Minions" not "Bots" (brand terminology)

---

## Implementation

### CSS Variables (app.css)
```css
:root {
  /* Colors */
  --color-cream: #F7F5F0;
  --color-warm-white: #FAF9F6;
  --color-dusty-blue: #6B7B8C;
  --color-slate: #3D4A5C;
  --color-mustard: #D4A853;
  --color-ochre: #C9963C;
  --color-copper: #B87333;
  --color-terracotta: #C17A5C;
  --color-charcoal: #2C3E50;
  --color-graphite: #5A6B7C;
  --color-mist: #9AA5B1;
  --color-stone: #E5E1D8;
  --color-cloud: #F0EDE6;
  
  /* Typography */
  --font-heading: 'Space Grotesk', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(44, 62, 80, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(44, 62, 80, 0.05), 0 2px 4px -1px rgba(44, 62, 80, 0.03);
  --shadow-lg: 0 10px 15px -3px rgba(44, 62, 80, 0.08), 0 4px 6px -2px rgba(44, 62, 80, 0.04);
  --shadow-warm: 0 4px 14px rgba(212, 168, 83, 0.3);
  
  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
}
```

### Font Loading (app.html)
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
```
