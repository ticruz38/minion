<script lang="ts">
    import { goto } from "$app/navigation";
    import { fade, fly, scale } from "svelte/transition";
    import { cubicOut } from "svelte/easing";
    import Minion3DScene from "$lib/components/Minion3DScene.svelte";
    import MinionAvatar3D from "$lib/components/MinionAvatar3D.svelte";
    import {
        minions,
        allTags,
        searchMinions,
        type Minion,
    } from "$lib/minions-data";

    // Search and filter state
    let searchQuery = "";
    let selectedTag: string | null = null;
    let selectedMinionId: string | null = null;
    let showSkillModal = false;
    let showAutocomplete = false;
    let autocompleteIndex = -1;

    // Hiring flow state
    let isHiring = false;
    let hireStep: "name" | "channel" | "config" | "review" | "progress" =
        "name";
    let botName = "";
    let selectedChannel: "whatsapp" | "telegram" | "discord" | "slack" | null = null;
    let phoneNumber = "";
    let botToken = ""; // For Telegram/Discord/Slack
    let apiKey = "";   // For WhatsApp API
    let signingSecret = ""; // For Slack signing secret
    let isLaunching = false;
    let createdBotId = "";
    let launchError = "";

    // Filter logic
    $: filteredIndices = searchQuery
        ? searchMinions(searchQuery).map((m) =>
              minions.findIndex((x) => x.id === m.id),
          )
        : selectedTag
          ? minions
                .map((m, i) => (m.tags.includes(selectedTag!) ? i : -1))
                .filter((i) => i !== -1)
          : minions.map((_, i) => i);

    $: visibleMinions = filteredIndices.map((i) => minions[i]).filter(Boolean);
    
    // Derive selected minion and its index from selectedMinionId
    $: selectedMinion = selectedMinionId 
        ? visibleMinions.find(m => m.id === selectedMinionId) 
        : null;
    $: selectedMinionIndex = selectedMinion 
        ? visibleMinions.findIndex(m => m.id === selectedMinionId)
        : -1;

    // Autocomplete suggestions
    $: autocompleteSuggestions =
        searchQuery.length >= 1
            ? [
                  ...minions
                      .filter((m) =>
                          m.name
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()),
                      )
                      .map((m) => ({
                          type: "minion" as const,
                          text: m.name,
                          item: m,
                      })),
                  ...minions
                      .flatMap((m) =>
                          m.skills.map((s) => ({ ...s, minion: m })),
                      )
                      .filter((s) =>
                          s.name
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()),
                      )
                      .slice(0, 5)
                      .map((s) => ({
                          type: "skill" as const,
                          text: s.name,
                          item: s.minion,
                      })),
              ].slice(0, 8)
            : [];

    // Stats
    $: totalMinions = minions.length;
    $: totalSkills = minions.reduce((acc, m) => acc + m.skills.length, 0);

    function handleSelectMinion(index: number) {
        const minion = visibleMinions[index];
        if (minion) {
            selectedMinionId = minion.id;
        }
    }

    function selectMinionById(id: string) {
        // Clear search/filter first
        searchQuery = "";
        selectedTag = null;
        showAutocomplete = false;
        
        // Set the selected ID - the reactive statements will find it
        selectedMinionId = id;
    }

    // Keyboard navigation
    function handleKeydown(event: KeyboardEvent) {
        if (isHiring) {
            if (event.key === "Escape") {
                event.preventDefault();
                cancelHiring();
            }
            return;
        }

        if (showAutocomplete && autocompleteSuggestions.length > 0) {
            switch (event.key) {
                case "ArrowDown":
                    event.preventDefault();
                    autocompleteIndex =
                        (autocompleteIndex + 1) %
                        autocompleteSuggestions.length;
                    return;
                case "ArrowUp":
                    event.preventDefault();
                    autocompleteIndex =
                        autocompleteIndex <= 0
                            ? autocompleteSuggestions.length - 1
                            : autocompleteIndex - 1;
                    return;
                case "Enter":
                    event.preventDefault();
                    if (autocompleteIndex >= 0) {
                        selectMinionById(
                            autocompleteSuggestions[autocompleteIndex].item.id,
                        );
                    }
                    return;
                case "Escape":
                    event.preventDefault();
                    showAutocomplete = false;
                    autocompleteIndex = -1;
                    return;
            }
        }

        if (event.target instanceof HTMLInputElement) {
            if (event.key === "Escape") {
                showAutocomplete = false;
                (event.target as HTMLInputElement).blur();
            }
            return;
        }

        const count = visibleMinions.length;
        if (count === 0) return;
        
        // Get current index from the ID
        let currentIdx = selectedMinionId 
            ? visibleMinions.findIndex(m => m.id === selectedMinionId)
            : -1;

        switch (event.key) {
            case "ArrowRight":
                event.preventDefault();
                currentIdx = currentIdx < count - 1 ? currentIdx + 1 : 0;
                selectedMinionId = visibleMinions[currentIdx]?.id || null;
                break;
            case "ArrowLeft":
                event.preventDefault();
                currentIdx = currentIdx > 0 ? currentIdx - 1 : count - 1;
                selectedMinionId = visibleMinions[currentIdx]?.id || null;
                break;
            case "ArrowDown":
                event.preventDefault();
                currentIdx = Math.min(currentIdx + 4, count - 1);
                selectedMinionId = visibleMinions[currentIdx]?.id || null;
                break;
            case "ArrowUp":
                event.preventDefault();
                currentIdx = Math.max(currentIdx - 4, 0);
                selectedMinionId = visibleMinions[currentIdx]?.id || null;
                break;
            case "Enter":
                event.preventDefault();
                if (selectedMinionId) startHiring();
                break;
            case "Escape":
                event.preventDefault();
                selectedMinionId = null;
                break;
            case "/":
                event.preventDefault();
                document
                    .querySelector<HTMLInputElement>(".floating-search input")
                    ?.focus();
                break;
        }
    }

    function startHiring() {
        if (!selectedMinion) return;
        isHiring = true;
        hireStep = "name";
        botName = "";
        selectedChannel = null;
        phoneNumber = "";
        botToken = "";
        apiKey = "";
        signingSecret = "";
        isLaunching = false;
        createdBotId = "";
        launchError = "";
    }

    function cancelHiring() {
        isHiring = false;
    }

    function selectChannel(channel: string) {
        selectedChannel = channel as "whatsapp" | "telegram" | "discord" | "slack";
        hireStep = "config";
    }

    function getChannelName(channel: string) {
        switch (channel) {
            case "whatsapp":
                return "WhatsApp";
            case "telegram":
                return "Telegram";
            case "discord":
                return "Discord";
            case "slack":
                return "Slack";
            default:
                return channel;
        }
    }

    async function handleLaunch() {
        if (!selectedMinion || !selectedChannel) return;
        isLaunching = true;
        hireStep = "progress";

        // Build channel config based on selected channel
        let channelConfig: any = {
            enabled: true,
            dmPolicy: "open",
            allowedUsers: [],
        };
        
        if (selectedChannel === "whatsapp") {
            channelConfig.phoneNumber = phoneNumber;
            channelConfig.apiKey = apiKey;
        } else if (selectedChannel === "telegram" || selectedChannel === "discord") {
            channelConfig.token = botToken;
        }
        
        const requestBody = {
            name: botName || selectedMinion.name,
            team_id: "default",
            minionId: selectedMinion.id,
            channels: {
                [selectedChannel]: channelConfig,
            },
        };

        try {
            const response = await fetch("/api/bots", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });
            const result = await response.json();
            if (response.ok && result.success) {
                createdBotId = result.bot_id;
            } else {
                launchError = result.message || "Failed to launch";
            }
        } catch (error) {
            launchError = "Network error";
        }
    }

    $: isNameValid =
        (botName.length >= 3 &&
            botName.length <= 30 &&
            /^[a-zA-Z0-9-]+$/.test(botName)) ||
        botName === "";
    $: canLaunch = selectedChannel && (
        (selectedChannel === "whatsapp" && phoneNumber.length >= 8 && apiKey.length >= 3) ||
        ((selectedChannel === "telegram" || selectedChannel === "discord" || selectedChannel === "slack") && botToken.length >= 10)
    );

    function getPriorityColor(priority: string): string {
        switch (priority) {
            case "P0":
                return "#7BA38F";
            case "P1":
                return "#D4A853";
            case "P2":
                return "#9AA5B1";
            default:
                return "#9AA5B1";
        }
    }

    function clearFilters() {
        searchQuery = "";
        selectedTag = null;
        selectedMinionId = null;
        showAutocomplete = false;
    }

    function handleClickOutside(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest(".floating-search")) {
            showAutocomplete = false;
        }
    }
</script>

<svelte:window on:click={handleClickOutside} on:keydown={handleKeydown} />

<svelte:head>
    <title>Minions | Browse Your AI Workforce</title>
    <meta
        name="description"
        content="Browse and hire from 15 specialized AI assistants with 60+ skills."
    />
</svelte:head>

<div class="page">
    <!-- 3D Scene -->
    <div class="scene-wrapper">
        <Minion3DScene
            {selectedMinionIndex}
            onSelectMinion={handleSelectMinion}
            filterIndices={filteredIndices.length > 0 ? filteredIndices : null}
            layout={filteredIndices.length < 5 ? "carousel" : "grid"}
        />
        <div class="scene-overlay"></div>
    </div>

    <!-- Nav -->
    <nav class="nav">
        <a href="/" class="logo">
            <span class="logo-icon">🤖</span>
            <span class="logo-text">Minion</span>
        </a>
        <div class="nav-links">
            <a href="/" class="nav-link">Home</a>
            <a href="/team/default" class="nav-link">My Team</a>
            {#if selectedMinion}
                <button class="btn btn-primary" on:click={startHiring}>
                    Hire {selectedMinion.name}
                </button>
            {/if}
        </div>
    </nav>

    <!-- Floating Search -->
    <div class="floating-search">
        <div class="search-container">
            <svg
                class="search-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
            >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
                type="text"
                placeholder="Search minions or skills... (Press /)"
                bind:value={searchQuery}
                on:focus={() => {
                    showAutocomplete = true;
                    autocompleteIndex = -1;
                }}
                on:input={() => {
                    showAutocomplete = true;
                    autocompleteIndex = -1;
                }}
            />
            {#if searchQuery}
                <button
                    class="clear-btn"
                    on:click={() => {
                        searchQuery = "";
                        showAutocomplete = false;
                    }}>×</button
                >
            {/if}
        </div>

        {#if showAutocomplete && autocompleteSuggestions.length > 0}
            <div
                class="autocomplete-dropdown"
                transition:fade={{ duration: 150 }}
            >
                {#each autocompleteSuggestions as suggestion, i}
                    <button
                        class="autocomplete-item"
                        class:active={i === autocompleteIndex}
                        on:click={() => selectMinionById(suggestion.item.id)}
                        on:mouseenter={() => (autocompleteIndex = i)}
                    >
                        {#if suggestion.type === "minion"}
                            <span class="suggestion-emoji"
                                >{suggestion.item.emoji}</span
                            >
                            <span class="suggestion-text">
                                <strong>{suggestion.item.name}</strong>
                                <span class="suggestion-meta"
                                    >{suggestion.item.role}</span
                                >
                            </span>
                        {:else}
                            <span class="suggestion-icon">⚡</span>
                            <span class="suggestion-text">
                                <strong>{suggestion.text}</strong>
                                <span class="suggestion-meta"
                                    >Skill • {suggestion.item.name}</span
                                >
                            </span>
                        {/if}
                    </button>
                {/each}
            </div>
        {/if}
    </div>

    <!-- Tag Pills -->
    {#if !searchQuery}
        <div class="tag-pills">
            <button
                class="tag-pill"
                class:active={!selectedTag}
                on:click={() => {
                    selectedTag = null;
                    selectedMinionIndex = -1;
                }}
            >
                All
            </button>
            {#each allTags.slice(0, 6) as tag}
                <button
                    class="tag-pill"
                    class:active={selectedTag === tag}
                    on:click={() => {
                        selectedTag = tag;
                        selectedMinionIndex = -1;
                    }}
                >
                    {tag}
                </button>
            {/each}
        </div>
    {/if}

    <!-- Results Counter -->
    <div class="results-counter">
        <span>{visibleMinions.length} minions</span>
        {#if selectedTag}<span class="filter-badge">{selectedTag}</span>{/if}
    </div>

    <!-- Keyboard Hint -->
    <div class="keyboard-hint-floating">
        <span>← → Navigate</span>
        <span>•</span>
        <span>Enter Hire</span>
        <span>•</span>
        <span>Esc Clear</span>
    </div>

    <!-- Detail Panel -->
    {#if selectedMinion}
        <aside
            class="detail-panel"
            class:hiring={isHiring}
            transition:fly={{ x: 100, duration: 300 }}
        >
            <div class="detail-card" class:hiring={isHiring}>
                {#if !isHiring}
                    <button
                        class="close-btn"
                        on:click={() => (selectedMinionIndex = -1)}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>

                    <div class="detail-header">
                        <div
                            class="detail-avatar"
                            style="background: {selectedMinion.color}20; border-color: {selectedMinion.color}40"
                        >
                            <span style="color: {selectedMinion.color}"
                                >{selectedMinion.emoji}</span
                            >
                        </div>
                        <div class="detail-titles">
                            <h1>{selectedMinion.name}</h1>
                            <p>{selectedMinion.role}</p>
                        </div>
                    </div>

                    <p class="detail-description">
                        {selectedMinion.description}
                    </p>

                    <div class="detail-tags">
                        {#each selectedMinion.tags as tag}
                            <span class="detail-tag">{tag}</span>
                        {/each}
                    </div>

                    <div class="detail-skills">
                        <h3>Skills ({selectedMinion.skills.length})</h3>
                        <div class="skills-list">
                            {#each selectedMinion.skills as skill}
                                <div
                                    class="skill-item"
                                    style="--priority-color: {getPriorityColor(
                                        skill.priority,
                                    )}"
                                >
                                    <div class="skill-header">
                                        <span class="skill-name"
                                            >{skill.name}</span
                                        >
                                        <span
                                            class="priority-badge"
                                            style="background: {getPriorityColor(
                                                skill.priority,
                                            )}20; color: {getPriorityColor(
                                                skill.priority,
                                            )}"
                                        >
                                            {skill.priority}
                                        </span>
                                    </div>
                                    <p class="skill-desc">
                                        {skill.description}
                                    </p>
                                </div>
                            {/each}
                        </div>
                    </div>

                    <button
                        class="btn btn-primary btn-large hire-btn"
                        on:click={startHiring}
                    >
                        Hire {selectedMinion.name}
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </button>
                {:else}
                    <!-- Hiring Form -->
                    <div class="hire-form-content">
                        <div class="hire-progress">
                            <button class="back-btn" on:click={cancelHiring}>
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <line x1="19" y1="12" x2="5" y2="12"></line>
                                    <polyline points="12 19 5 12 12 5"
                                    ></polyline>
                                </svg>
                                Back
                            </button>
                            <div class="step-dots">
                                <div
                                    class="step-dot"
                                    class:active={hireStep === "name"}
                                ></div>
                                <div
                                    class="step-line"
                                    class:active={hireStep !== "name"}
                                ></div>
                                <div
                                    class="step-dot"
                                    class:active={hireStep === "channel" ||
                                        hireStep === "config"}
                                ></div>
                                <div
                                    class="step-line"
                                    class:active={hireStep === "review" ||
                                        hireStep === "progress"}
                                ></div>
                                <div
                                    class="step-dot"
                                    class:active={hireStep === "review" ||
                                        hireStep === "progress"}
                                ></div>
                            </div>
                        </div>

                        <div class="hire-header">
                            <div class="hire-avatar">
                                <MinionAvatar3D
                                    minionId={selectedMinion.id}
                                    color={selectedMinion.color}
                                    isHovered={false}
                                    isSelected={true}
                                />
                            </div>
                            <div class="hire-titles">
                                <span class="hire-label">Hiring</span>
                                <h2>{selectedMinion.name}</h2>
                            </div>
                        </div>

                        {#if hireStep === "name"}
                            <div
                                class="form-step"
                                in:fly={{ x: 20, duration: 200 }}
                            >
                                <h3>Name your minion</h3>
                                <div class="input-wrap">
                                    <input
                                        type="text"
                                        class="form-input"
                                        placeholder="e.g., {selectedMinion.name}Bot"
                                        bind:value={botName}
                                        maxlength="30"
                                    />
                                    <span class="char-count"
                                        >{botName.length}/30</span
                                    >
                                </div>
                                {#if botName && !isNameValid}
                                    <span class="error-hint"
                                        >3-30 letters, numbers, or hyphens</span
                                    >
                                {/if}
                                <button
                                    class="btn btn-primary btn-large"
                                    disabled={!isNameValid && botName !== ""}
                                    on:click={() => (hireStep = "channel")}
                                >
                                    Continue
                                </button>
                            </div>
                        {:else if hireStep === "channel"}
                            <div
                                class="form-step"
                                in:fly={{ x: 20, duration: 200 }}
                            >
                                <h3>Choose your app</h3>
                                <div class="channel-options">
                                    {#each ["whatsapp", "telegram", "discord", "slack"] as channel}
                                        <button
                                            class="channel-btn"
                                            on:click={() => selectChannel(channel)}
                                        >
                                            <span class="channel-name"
                                                >{getChannelName(channel)}</span
                                            >
                                        </button>
                                    {/each}
                                </div>
                            </div>
                        {:else if hireStep === "config"}
                            <div
                                class="form-step"
                                in:fly={{ x: 20, duration: 200 }}
                            >
                                <h3>
                                    Connect {getChannelName(
                                        selectedChannel || "",
                                    )}
                                </h3>
                                {#if selectedChannel === "whatsapp"}
                                    <p class="form-help">
                                        Enter your WhatsApp Business API credentials
                                    </p>
                                    <div class="input-wrap">
                                        <input
                                            type="tel"
                                            class="form-input"
                                            placeholder="Phone number (+1234567890)"
                                            bind:value={phoneNumber}
                                        />
                                    </div>
                                    <div class="input-wrap" style="margin-top: 0.75rem;">
                                        <input
                                            type="text"
                                            class="form-input"
                                            placeholder="API Key"
                                            bind:value={apiKey}
                                        />
                                    </div>
                                {:else if selectedChannel === "telegram"}
                                    <p class="form-help">
                                        Enter your Telegram Bot Token from @BotFather
                                    </p>
                                    <div class="input-wrap">
                                        <input
                                            type="text"
                                            class="form-input"
                                            placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                                            bind:value={botToken}
                                        />
                                    </div>
                                    <div class="instructions">
                                        <p><strong>How to get your Telegram token:</strong></p>
                                        <ol>
                                            <li>Open Telegram and search for <strong>@BotFather</strong></li>
                                            <li>Start a chat and send <code>/newbot</code></li>
                                            <li>Choose a name for your bot</li>
                                            <li>Choose a username (must end in "bot", e.g., MyMinionBot)</li>
                                            <li>Copy the token BotFather gives you</li>
                                        </ol>
                                    </div>
                                {:else if selectedChannel === "discord"}
                                    <p class="form-help">
                                        Enter your Discord Bot Token
                                    </p>
                                    <div class="input-wrap">
                                        <input
                                            type="text"
                                            class="form-input"
                                            placeholder="Discord bot token"
                                            bind:value={botToken}
                                        />
                                    </div>
                                    <div class="instructions">
                                        <p><strong>How to get your Discord token:</strong></p>
                                        <ol>
                                            <li>Go to <a href="https://discord.com/developers/applications" target="_blank" rel="noopener">discord.com/developers/applications</a></li>
                                            <li>Click "New Application" and give it a name</li>
                                            <li>Go to "Bot" section and click "Add Bot"</li>
                                            <li>Click "Reset Token" and copy the token</li>
                                            <li>Enable "MESSAGE CONTENT INTENT" under Privileged Gateway Intents</li>
                                        </ol>
                                    </div>
                                {:else if selectedChannel === "slack"}
                                    <p class="form-help">
                                        Enter your Slack Bot Token
                                    </p>
                                    <div class="input-wrap">
                                        <input
                                            type="text"
                                            class="form-input"
                                            placeholder="xoxb-1234567890-1234567890-XXXXXXXXXXXXXXXXXXXXXXXX"
                                            bind:value={botToken}
                                        />
                                    </div>
                                    <div class="instructions">
                                        <p><strong>How to get your Slack token:</strong></p>
                                        <ol>
                                            <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener">api.slack.com/apps</a></li>
                                            <li>Click "Create New App" → "From scratch"</li>
                                            <li>Name your app and select your workspace</li>
                                            <li>Go to "OAuth & Permissions" in the sidebar</li>
                                            <li>Scroll to "Scopes" and add Bot Token Scopes: <code>chat:write</code>, <code>im:history</code>, <code>im:read</code>, <code>im:write</code></li>
                                            <li>Scroll up and click "Install to Workspace"</li>
                                            <li>Copy the "Bot User OAuth Token" (starts with <code>xoxb-</code>)</li>
                                        </ol>
                                    </div>
                                    <div class="input-wrap" style="margin-top: 1rem;">
                                        <label style="display: block; font-size: 0.75rem; color: rgba(247,245,240,0.5); margin-bottom: 0.25rem;">Signing Secret (optional but recommended)</label>
                                        <input
                                            type="text"
                                            class="form-input"
                                            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                            bind:value={signingSecret}
                                        />
                                    </div>
                                    <p class="token-hint">
                                        Find Signing Secret in "Basic Information" → "App Credentials"
                                    </p>
                                {/if}
                                <div class="btn-row">
                                    <button
                                        class="btn btn-ghost"
                                        on:click={() => (hireStep = "channel")}
                                        >Back</button
                                    >
                                    <button
                                        class="btn btn-primary"
                                        disabled={
                                            (selectedChannel === "whatsapp" && (phoneNumber.length < 8 || apiKey.length < 3)) ||
                                            ((selectedChannel === "telegram" || selectedChannel === "discord" || selectedChannel === "slack") && botToken.length < 10)
                                        }
                                        on:click={() => (hireStep = "review")}
                                    >
                                        Continue
                                    </button>
                                </div>
                            </div>
                        {:else if hireStep === "review"}
                            <div
                                class="form-step"
                                in:fly={{ x: 20, duration: 200 }}
                            >
                                <h3>Ready to hire?</h3>
                                <div class="review-box">
                                    <div class="review-item">
                                        <span>Name</span><strong
                                            >{botName ||
                                                selectedMinion.name}</strong
                                        >
                                    </div>
                                    <div class="review-item">
                                        <span>Type</span><strong
                                            >{selectedMinion.name}</strong
                                        >
                                    </div>
                                    <div class="review-item">
                                        <span>App</span><strong
                                            >{getChannelName(
                                                selectedChannel || "",
                                            )}</strong
                                        >
                                    </div>
                                </div>
                                <div class="btn-row">
                                    <button
                                        class="btn btn-ghost"
                                        on:click={() => (hireStep = "config")}
                                        >Back</button
                                    >
                                    <button
                                        class="btn btn-primary btn-large"
                                        disabled={!canLaunch || isLaunching}
                                        on:click={handleLaunch}
                                    >
                                        {#if isLaunching}<span class="spinner"
                                            ></span>Hiring...{:else}Hire {botName ||
                                                selectedMinion.name}{/if}
                                    </button>
                                </div>
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        </aside>
    {/if}
</div>

<style>
    :global(body) {
        background: #0f0c0a;
        color: #f7f5f0;
    }

    .page {
        min-height: 100vh;
        position: relative;
    }

    .scene-wrapper {
        position: fixed;
        inset: 0;
        z-index: 0;
    }
    .scene-overlay {
        position: absolute;
        inset: 0;
        background:
            radial-gradient(
                ellipse at 0% 0%,
                rgba(212, 168, 83, 0.08) 0%,
                transparent 50%
            ),
            radial-gradient(
                ellipse at 100% 100%,
                rgba(193, 122, 92, 0.05) 0%,
                transparent 50%
            );
        pointer-events: none;
    }

    /* Nav */
    .nav {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 200;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.5rem 2rem;
        background: linear-gradient(
            to bottom,
            rgba(15, 12, 10, 0.8),
            transparent
        );
        backdrop-filter: blur(10px);
    }
    .logo {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        text-decoration: none;
    }
    .logo-icon {
        font-size: 1.75rem;
    }
    .logo-text {
        font-size: 1.5rem;
        font-weight: 700;
        color: #f7f5f0;
        font-family: "Space Grotesk", sans-serif;
    }
    .nav-links {
        display: flex;
        align-items: center;
        gap: 1.5rem;
    }
    .nav-link {
        color: rgba(247, 245, 240, 0.7);
        font-size: 0.9375rem;
        font-weight: 500;
        transition: color 0.2s;
    }
    .nav-link:hover {
        color: #f7f5f0;
    }

    /* Buttons */
    .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.625rem 1.25rem;
        border-radius: 10px;
        font-weight: 600;
        font-size: 0.875rem;
        transition: all 0.2s;
        cursor: pointer;
        border: none;
    }
    .btn-primary {
        background: linear-gradient(135deg, #d4a853 0%, #c9963c 100%);
        color: #0f0c0a;
        box-shadow: 0 4px 20px rgba(212, 168, 83, 0.3);
    }
    .btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 25px rgba(212, 168, 83, 0.4);
    }
    .btn-ghost {
        background: transparent;
        color: rgba(247, 245, 240, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .btn-large {
        padding: 0.875rem 1.5rem;
        font-size: 0.9375rem;
    }

    /* Floating Search - below navbar, above minions */
    .floating-search {
        position: fixed;
        top: 6rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 250;
        width: 100%;
        max-width: 520px;
        padding: 0 1.5rem;
    }
    .search-container {
        position: relative;
        display: flex;
        align-items: center;
        background: rgba(40, 35, 30, 0.9);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(212, 168, 83, 0.3);
        border-radius: 14px;
        padding: 0.875rem 1.25rem;
        gap: 0.875rem;
        box-shadow: 
            0 4px 20px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(212, 168, 83, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        transition: all 0.2s ease;
    }
    .search-container:hover {
        border-color: rgba(212, 168, 83, 0.5);
        box-shadow: 
            0 6px 24px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(212, 168, 83, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }
    .search-container:focus-within {
        border-color: #d4a853;
        box-shadow: 
            0 8px 30px rgba(0, 0, 0, 0.5),
            0 0 0 2px rgba(212, 168, 83, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
    .search-icon {
        color: rgba(212, 168, 83, 0.6);
        flex-shrink: 0;
        transition: color 0.2s;
    }
    .search-container:focus-within .search-icon {
        color: #d4a853;
    }
    .search-container input {
        flex: 1;
        background: transparent;
        border: none;
        color: #f7f5f0;
        font-size: 0.9375rem;
        outline: none;
    }
    .search-container input::placeholder {
        color: rgba(247, 245, 240, 0.35);
    }
    .clear-btn {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 50%;
        color: rgba(247, 245, 240, 0.6);
        cursor: pointer;
        font-size: 1rem;
        line-height: 1;
    }

    /* Autocomplete */
    .autocomplete-dropdown {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        right: 0;
        background: rgba(25, 22, 18, 0.98);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        max-height: 320px;
        overflow-y: auto;
    }
    .autocomplete-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0.875rem 1rem;
        background: transparent;
        border: none;
        color: #f7f5f0;
        text-align: left;
        cursor: pointer;
        transition: background 0.15s;
    }
    .autocomplete-item:hover,
    .autocomplete-item.active {
        background: rgba(212, 168, 83, 0.15);
    }
    .suggestion-emoji {
        font-size: 1.25rem;
        width: 32px;
        text-align: center;
    }
    .suggestion-icon {
        font-size: 1rem;
        width: 32px;
        text-align: center;
    }
    .suggestion-text {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
    }
    .suggestion-text strong {
        font-weight: 600;
        font-size: 0.9375rem;
    }
    .suggestion-meta {
        font-size: 0.75rem;
        color: rgba(247, 245, 240, 0.5);
    }

    /* Tag Pills - Positioned below search, single row with scroll */
    .tag-pills {
        position: fixed;
        top: 9.5rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 140;
        display: flex;
        gap: 0.5rem;
        flex-wrap: nowrap;
        justify-content: center;
        padding: 0.5rem 1rem;
        max-width: 90vw;
        overflow-x: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
        mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
        -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
    }
    .tag-pills::-webkit-scrollbar {
        display: none;
    }
    .tag-pill {
        padding: 0.5rem 1rem;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 100px;
        color: rgba(247, 245, 240, 0.75);
        font-size: 0.8125rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        backdrop-filter: blur(10px);
    }
    .tag-pill:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.2);
        color: rgba(247, 245, 240, 0.95);
        transform: translateY(-1px);
    }
    .tag-pill:hover,
    .tag-pill.active {
        background: rgba(212, 168, 83, 0.2);
        border-color: #d4a853;
        color: #d4a853;
    }

    /* Results Counter - top right, out of the way */
    .results-counter {
        position: fixed;
        top: 5.5rem;
        right: 2rem;
        left: auto;
        transform: none;
        z-index: 160;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8125rem;
        color: rgba(247, 245, 240, 0.6);
        background: rgba(15, 12, 10, 0.7);
        padding: 0.375rem 1rem;
        border-radius: 100px;
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .filter-badge {
        padding: 0.125rem 0.5rem;
        background: rgba(212, 168, 83, 0.15);
        border-radius: 100px;
        color: #d4a853;
        font-size: 0.6875rem;
        text-transform: capitalize;
    }

    /* Keyboard Hint */
    .keyboard-hint-floating {
        position: fixed;
        bottom: 1.5rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 40;
        display: flex;
        gap: 0.75rem;
        padding: 0.5rem 1rem;
        background: rgba(15, 12, 10, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 100px;
        font-size: 0.75rem;
        color: rgba(247, 245, 240, 0.4);
        backdrop-filter: blur(10px);
    }

    /* Detail Panel */
    .detail-panel {
        position: fixed;
        top: 80px;
        right: 0;
        bottom: 0;
        width: 420px;
        z-index: 30;
        padding: 1.5rem;
        overflow-y: auto;
        pointer-events: none;
    }
    .detail-panel > * {
        pointer-events: auto;
    }
    .detail-panel.hiring {
        display: flex;
        align-items: center;
    }

    .detail-card {
        background: rgba(15, 12, 10, 0.85);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 1.5rem;
        position: relative;
    }
    .detail-card.hiring {
        width: 100%;
    }

    .close-btn {
        position: absolute;
        top: 1rem;
        right: 1rem;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: rgba(247, 245, 240, 0.6);
        cursor: pointer;
        transition: all 0.2s;
    }
    .close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #f7f5f0;
    }

    .detail-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.25rem;
        padding-right: 2.5rem;
    }
    .detail-avatar {
        width: 56px;
        height: 56px;
        border-radius: 14px;
        border: 2px solid;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.75rem;
    }
    .detail-titles h1 {
        font-size: 1.5rem;
        font-weight: 700;
        color: #f7f5f0;
        margin: 0;
        font-family: "Space Grotesk", sans-serif;
    }
    .detail-titles p {
        font-size: 0.9375rem;
        color: #d4a853;
        margin: 0;
    }

    .detail-description {
        font-size: 0.9375rem;
        color: rgba(247, 245, 240, 0.7);
        line-height: 1.6;
        margin: 0 0 1rem;
    }

    .detail-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.375rem;
        margin-bottom: 1.25rem;
    }
    .detail-tag {
        padding: 0.25rem 0.625rem;
        background: rgba(212, 168, 83, 0.1);
        border: 1px solid rgba(212, 168, 83, 0.2);
        border-radius: 100px;
        font-size: 0.6875rem;
        color: #d4a853;
        text-transform: capitalize;
    }

    .detail-skills h3 {
        font-size: 0.8125rem;
        font-weight: 600;
        color: rgba(247, 245, 240, 0.5);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0 0 0.75rem;
    }
    .skills-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1.25rem;
    }
    .skill-item {
        padding: 0.75rem;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        border-left: 3px solid var(--priority-color);
    }
    .skill-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.25rem;
    }
    .skill-name {
        font-weight: 600;
        color: #f7f5f0;
        font-size: 0.875rem;
    }
    .priority-badge {
        padding: 0.125rem 0.375rem;
        border-radius: 4px;
        font-size: 0.625rem;
        font-weight: 600;
        text-transform: uppercase;
    }
    .skill-desc {
        font-size: 0.75rem;
        color: rgba(247, 245, 240, 0.5);
        margin: 0;
    }

    .hire-btn {
        width: 100%;
        margin-top: 0.5rem;
    }

    /* Hiring Form */
    .hire-form-content {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }
    .hire-progress {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .back-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: none;
        border: none;
        color: rgba(247, 245, 240, 0.6);
        font-size: 0.875rem;
        cursor: pointer;
    }
    .back-btn:hover {
        color: #f7f5f0;
    }
    .step-dots {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }
    .step-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        transition: all 0.3s;
    }
    .step-dot.active {
        background: #d4a853;
        box-shadow: 0 0 10px rgba(212, 168, 83, 0.5);
    }
    .step-line {
        width: 24px;
        height: 2px;
        background: rgba(255, 255, 255, 0.2);
        transition: all 0.3s;
    }
    .step-line.active {
        background: #d4a853;
    }

    .hire-header {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .hire-avatar {
        width: 64px;
        height: 64px;
        border-radius: 12px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.05);
    }
    .hire-titles .hire-label {
        font-size: 0.6875rem;
        color: #d4a853;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }
    .hire-titles h2 {
        font-size: 1.5rem;
        font-weight: 700;
        color: #f7f5f0;
        margin: 0;
        font-family: "Space Grotesk", sans-serif;
    }

    .form-step {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .form-step h3 {
        font-size: 1.125rem;
        font-weight: 600;
        color: #f7f5f0;
        margin: 0;
    }
    .form-help {
        font-size: 0.875rem;
        color: rgba(247, 245, 240, 0.6);
        margin: 0;
    }
    .token-hint {
        font-size: 0.75rem;
        color: rgba(247, 245, 240, 0.4);
        margin: 0.5rem 0 0;
    }
    .instructions {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 0.875rem;
        margin-top: 0.75rem;
        font-size: 0.8125rem;
        color: rgba(247, 245, 240, 0.7);
    }
    .instructions p {
        margin: 0 0 0.5rem;
    }
    .instructions ol {
        margin: 0;
        padding-left: 1.25rem;
    }
    .instructions li {
        margin-bottom: 0.375rem;
        line-height: 1.5;
    }
    .instructions li:last-child {
        margin-bottom: 0;
    }
    .instructions a {
        color: #D4A853;
        text-decoration: none;
    }
    .instructions a:hover {
        text-decoration: underline;
    }
    .instructions code {
        background: rgba(255, 255, 255, 0.1);
        padding: 0.125rem 0.375rem;
        border-radius: 4px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.75rem;
        color: #D4A853;
    }
    .input-wrap {
        position: relative;
    }
    .form-input {
        width: 100%;
        padding: 0.875rem 1rem;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        color: #f7f5f0;
        font-size: 1rem;
        outline: none;
    }
    .form-input:focus {
        border-color: #d4a853;
        background: rgba(255, 255, 255, 0.08);
    }
    .char-count {
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 0.75rem;
        color: rgba(247, 245, 240, 0.4);
    }
    .error-hint {
        font-size: 0.8125rem;
        color: #ff6b6b;
    }

    .channel-options {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .channel-btn {
        padding: 1rem;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        color: #f7f5f0;
        text-align: left;
        cursor: pointer;
        transition: all 0.2s;
    }
    .channel-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(212, 168, 83, 0.3);
    }

    .btn-row {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
    }
    .review-box {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 1rem;
    }
    .review-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .review-item:last-child {
        border-bottom: none;
    }
    .review-item span {
        font-size: 0.875rem;
        color: rgba(247, 245, 240, 0.6);
    }
    .review-item strong {
        font-size: 0.875rem;
        color: #f7f5f0;
        font-weight: 600;
    }

    .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(15, 12, 10, 0.3);
        border-top-color: #0f0c0a;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    /* Mobile */
    @media (max-width: 768px) {
        .floating-search {
            max-width: 100%;
            top: 5rem;
        }
        .tag-pills {
            top: 9.5rem;
        }
        .results-counter {
            top: 12rem;
        }
        .detail-panel {
            width: 100%;
            top: auto;
            bottom: 0;
            left: 0;
            right: 0;
            max-height: 70vh;
            padding: 1rem;
        }
        .keyboard-hint-floating {
            display: none;
        }
    }
</style>
