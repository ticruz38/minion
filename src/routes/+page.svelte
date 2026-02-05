<script lang="ts">
  interface Minion {
    id: string;
    name: string;
    tagline: string;
    description: string;
    icon: string;
    features: string[];
    color: string;
  }

  const minions: Minion[] = [
    {
      id: 'accountant',
      name: 'The Accountant',
      tagline: 'Your books, perfectly balanced',
      description: 'Handles invoicing, expense tracking, tax prep, and financial reports. Integrates with your accounting software.',
      icon: '📊',
      features: ['Invoicing', 'Expense Tracking', 'Tax Reports', 'Bank Reconciliation'],
      color: '#10b981'
    },
    {
      id: 'realtor',
      name: 'The Real Estate Scout',
      tagline: 'Never miss a good deal',
      description: 'Scans listings 24/7, alerts you to opportunities, tracks market trends, and manages your property database.',
      icon: '🏠',
      features: ['Listing Alerts', 'Market Analysis', 'Property Database', 'Lead Tracking'],
      color: '#f59e0b'
    },
    {
      id: 'analyst',
      name: 'The Financial Analyst',
      tagline: 'Data-driven decisions',
      description: 'Monitors markets, analyzes portfolios, generates reports, and spots investment opportunities.',
      icon: '📈',
      features: ['Portfolio Tracking', 'Market Alerts', 'Risk Analysis', 'Report Generation'],
      color: '#8b5cf6'
    },
    {
      id: 'restaurant',
      name: 'The Restaurant Secretary',
      tagline: 'Your virtual maître d\'',
      description: 'Takes reservations, manages orders, coordinates with kitchen, and keeps customers informed.',
      icon: '🍽️',
      features: ['Table Booking', 'Order Taking', 'Customer Chat', 'Staff Coordination'],
      color: '#ef4444'
    },
    {
      id: 'scheduler',
      name: 'The Schedule Master',
      tagline: 'Your calendar, optimized',
      description: 'Manages appointments, finds optimal meeting times, sends reminders, and resolves conflicts.',
      icon: '📅',
      features: ['Smart Scheduling', 'Conflict Resolution', 'Auto Reminders', 'Time Blocking'],
      color: '#06b6d4'
    },
    {
      id: 'support',
      name: 'The Support Agent',
      tagline: 'Always on, always helpful',
      description: 'Answers customer queries, routes complex issues, maintains FAQs, and escalates when needed.',
      icon: '💬',
      features: ['24/7 Response', 'Ticket Routing', 'FAQ Management', 'Escalation'],
      color: '#ec4899'
    }
  ];

  let selectedMinion: Minion | null = null;

  function selectMinion(minion: Minion) {
    selectedMinion = minion;
  }

  function closeModal() {
    selectedMinion = null;
  }

  function hireMinion(minion: Minion) {
    alert(`Hiring ${minion.name}... (Backend integration coming soon)`);
    closeModal();
  }
</script>

<div class="page">
  <!-- Hero -->
  <section class="hero">
    <div class="hero-glow"></div>
    <div class="hero-content">
      <div class="badge">⚡ AI-Powered Assistants</div>
      <h1 class="hero-title">
        Hire a <span class="gradient-text">Minion</span><br />
        Get More Done
      </h1>
      <p class="hero-subtitle">
        Pre-configured AI agents that work in your cloud, connect to your tools,<br />
        and chat with you on WhatsApp or Telegram.
      </p>
      <div class="hero-cta">
        <a href="#minions" class="btn btn-primary">Browse Minions</a>
        <button class="btn btn-secondary" on:click={() => alert('Demo coming soon!')}>
          See How It Works
        </button>
      </div>
      <div class="hero-trust">
        <span class="trust-item">🔒 Your data stays in your cloud</span>
        <span class="trust-item">⚡ 5-minute setup</span>
        <span class="trust-item">💬 WhatsApp & Telegram</span>
      </div>
    </div>
  </section>

  <!-- Minions Grid -->
  <section id="minions" class="minions-section">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">Meet Your <span class="gradient-text">Minions</span></h2>
        <p class="section-subtitle">Specialized AI agents ready to work for you</p>
      </div>

      <div class="minions-grid">
        {#each minions as minion}
          <div 
            class="minion-card"
            style="--minion-color: {minion.color}"
            on:click={() => selectMinion(minion)}
            on:keypress={(e) => e.key === 'Enter' && selectMinion(minion)}
            tabindex="0"
            role="button"
          >
            <div class="minion-icon">{minion.icon}</div>
            <div class="minion-content">
              <h3 class="minion-name">{minion.name}</h3>
              <p class="minion-tagline">{minion.tagline}</p>
              <p class="minion-desc">{minion.description}</p>
              <div class="minion-features">
                {#each minion.features.slice(0, 2) as feature}
                  <span class="feature-tag">{feature}</span>
                {/each}
                {#if minion.features.length > 2}
                  <span class="feature-tag">+{minion.features.length - 2}</span>
                {/if}
              </div>
            </div>
            <div class="minion-action">
              <span class="hire-text">Hire →</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- How It Works -->
  <section class="how-it-works">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">How It <span class="gradient-text">Works</span></h2>
      </div>
      <div class="steps">
        <div class="step">
          <div class="step-number">1</div>
          <h3>Pick Your Minion</h3>
          <p>Choose from specialized AI agents designed for specific tasks</p>
        </div>
        <div class="step">
          <div class="step-number">2</div>
          <h3>Connect Your Tools</h3>
          <p>Link Google, Microsoft, or any service your Minion needs</p>
        </div>
        <div class="step">
          <div class="step-number">3</div>
          <h3>Chat & Delegate</h3>
          <p>Talk to your Minion via WhatsApp or Telegram</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <div class="container">
      <p>© 2025 Minion. AI agents that work for you.</p>
    </div>
  </footer>
</div>

<!-- Modal -->
{#if selectedMinion}
  <div class="modal-overlay" on:click={closeModal} role="button" tabindex="-1" on:keypress={(e) => e.key === 'Escape' && closeModal()}>
    <div class="modal" on:click|stopPropagation>
      <button class="modal-close" on:click={closeModal}>×</button>
      <div class="modal-header" style="--minion-color: {selectedMinion.color}">
        <div class="modal-icon">{selectedMinion.icon}</div>
        <h2>{selectedMinion.name}</h2>
        <p>{selectedMinion.tagline}</p>
      </div>
      <div class="modal-body">
        <p class="modal-description">{selectedMinion.description}</p>
        <div class="modal-features">
          <h4>Capabilities:</h4>
          <div class="features-list">
            {#each selectedMinion.features as feature}
              <span class="feature-tag large">{feature}</span>
            {/each}
          </div>
        </div>
        <div class="modal-info">
          <div class="info-item">
            <strong>Communication:</strong> WhatsApp, Telegram
          </div>
          <div class="info-item">
            <strong>Data storage:</strong> Your Google Drive / cloud
          </div>
          <div class="info-item">
            <strong>Setup time:</strong> ~5 minutes
          </div>
        </div>
        <button 
          class="btn btn-primary btn-large"
          on:click={() => selectedMinion && hireMinion(selectedMinion)}
          style="width: 100%; margin-top: 1.5rem;"
        >
          Hire {selectedMinion.name}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Hero */
  .hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 2rem;
    text-align: center;
  }

  .hero-glow {
    position: absolute;
    inset: 0;
    background: var(--gradient-glow);
    pointer-events: none;
  }

  .hero-content {
    position: relative;
    z-index: 1;
    max-width: 800px;
  }

  .badge {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 100px;
    font-size: 0.875rem;
    color: var(--color-text-muted);
    margin-bottom: 1.5rem;
  }

  .hero-title {
    font-size: clamp(2.5rem, 6vw, 4rem);
    font-weight: 800;
    margin-bottom: 1.5rem;
    letter-spacing: -0.02em;
  }

  .gradient-text {
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero-subtitle {
    font-size: 1.25rem;
    color: var(--color-text-muted);
    margin-bottom: 2rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }

  .hero-cta {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 3rem;
    flex-wrap: wrap;
  }

  .btn {
    padding: 1rem 2rem;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 1rem;
    transition: all 0.2s ease;
  }

  .btn-primary {
    background: var(--gradient-primary);
    color: white;
    box-shadow: var(--shadow-glow);
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 60px rgba(99, 102, 241, 0.4);
  }

  .btn-secondary {
    background: var(--color-bg-card);
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }

  .btn-secondary:hover {
    background: var(--color-bg-elevated);
    border-color: var(--color-primary);
  }

  .btn-large {
    padding: 1.25rem 2rem;
    font-size: 1.125rem;
  }

  .hero-trust {
    display: flex;
    gap: 2rem;
    justify-content: center;
    flex-wrap: wrap;
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  .trust-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* Sections */
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }

  .section-header {
    text-align: center;
    margin-bottom: 4rem;
  }

  .section-title {
    font-size: clamp(2rem, 4vw, 3rem);
    margin-bottom: 1rem;
  }

  .section-subtitle {
    color: var(--color-text-muted);
    font-size: 1.125rem;
  }

  /* Minions Grid */
  .minions-section {
    padding: 6rem 0;
  }

  .minions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: 1.5rem;
  }

  .minion-card {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .minion-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, var(--minion-color) 0%, transparent 50%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .minion-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    border-color: var(--minion-color);
  }

  .minion-card:hover::before {
    opacity: 0.1;
  }

  .minion-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    position: relative;
  }

  .minion-content {
    position: relative;
  }

  .minion-name {
    font-size: 1.25rem;
    margin-bottom: 0.25rem;
  }

  .minion-tagline {
    color: var(--minion-color);
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  .minion-desc {
    color: var(--color-text-muted);
    font-size: 0.9375rem;
    line-height: 1.6;
    margin-bottom: 1rem;
  }

  .minion-features {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .feature-tag {
    padding: 0.25rem 0.75rem;
    background: var(--color-bg-elevated);
    border-radius: 100px;
    font-size: 0.75rem;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
  }

  .feature-tag.large {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }

  .minion-action {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
    position: relative;
  }

  .hire-text {
    color: var(--minion-color);
    font-weight: 600;
    font-size: 0.9375rem;
  }

  /* How It Works */
  .how-it-works {
    padding: 6rem 0;
    background: var(--color-bg-elevated);
  }

  .steps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 3rem;
    text-align: center;
  }

  .step {
    padding: 2rem;
  }

  .step-number {
    width: 60px;
    height: 60px;
    background: var(--gradient-primary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 800;
    margin: 0 auto 1.5rem;
    box-shadow: var(--shadow-glow);
  }

  .step h3 {
    font-size: 1.25rem;
    margin-bottom: 0.75rem;
  }

  .step p {
    color: var(--color-text-muted);
  }

  /* Footer */
  .footer {
    padding: 3rem 0;
    text-align: center;
    color: var(--color-text-muted);
    border-top: 1px solid var(--color-border);
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 1000;
  }

  .modal {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
  }

  .modal-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 36px;
    height: 36px;
    background: var(--color-bg-elevated);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    color: var(--color-text-muted);
    cursor: pointer;
    z-index: 10;
  }

  .modal-close:hover {
    background: var(--color-border);
    color: var(--color-text);
  }

  .modal-header {
    padding: 2rem;
    text-align: center;
    background: linear-gradient(135deg, rgba(0,0,0,0.3) 0%, transparent 100%);
    border-bottom: 1px solid var(--color-border);
  }

  .modal-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .modal-header h2 {
    font-size: 1.75rem;
    margin-bottom: 0.5rem;
  }

  .modal-header p {
    color: var(--minion-color);
    font-weight: 600;
  }

  .modal-body {
    padding: 1.5rem 2rem 2rem;
  }

  .modal-description {
    color: var(--color-text-muted);
    margin-bottom: 1.5rem;
    line-height: 1.7;
  }

  .modal-features {
    margin-bottom: 1.5rem;
  }

  .modal-features h4 {
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    margin-bottom: 0.75rem;
  }

  .features-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .modal-info {
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    padding: 1rem;
  }

  .info-item {
    padding: 0.5rem 0;
    font-size: 0.9375rem;
  }

  .info-item:not(:last-child) {
    border-bottom: 1px solid var(--color-border);
  }

  .info-item strong {
    color: var(--color-primary-light);
  }
</style>
