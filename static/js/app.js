// State Management
let state = {
    updates: [],          // Raw list of updates from backend
    filteredUpdates: [],  // Filtered and searched updates
    selectedIds: [],      // Array of selected update IDs
    activeCategory: 'all',
    searchQuery: '',
    sortBy: 'newest',
    theme: 'dark'
};

// SVG Icons for Badges
const CATEGORY_ICONS = {
    'Feature': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.886H3.858l5.043 3.664L6.99 18.436 12 14.772l5.01 3.664-1.91-5.886 5.04-3.664h-6.23L12 3Z"/></svg>`,
    'Announcement': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    'Issue': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    'Deprecated': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
    'Change': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>`
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    fetchReleaseNotes();
});

// Theme Setup
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    state.theme = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeUI();
}

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('theme', state.theme);
    updateThemeUI();
}

function updateThemeUI() {
    const sunIcon = document.querySelector('.icon-sun');
    const moonIcon = document.querySelector('.icon-moon');
    if (state.theme === 'dark') {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    } else {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Refresh Button
    document.getElementById('btn-refresh').addEventListener('click', () => {
        fetchReleaseNotes(true);
    });

    // Retry Button
    document.getElementById('btn-retry').addEventListener('click', () => {
        fetchReleaseNotes(true);
    });

    // Theme Toggle Button
    document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);

    // Search Input with clear button and enter/escape actions
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        searchClear.style.display = state.searchQuery ? 'block' : 'none';
        applyFiltersAndRender();
    });

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        searchClear.style.display = 'none';
        applyFiltersAndRender();
    });

    // Clear filters empty state helper
    document.getElementById('btn-clear-filters').addEventListener('click', clearAllFilters);

    // Sort order select
    document.getElementById('sort-order').addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        applyFiltersAndRender();
    });

    // Category Pill Filters
    const pills = document.querySelectorAll('#category-pills .pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.activeCategory = pill.dataset.category;
            applyFiltersAndRender();
        });
    });

    // Multi-select sticky banner controls
    document.getElementById('btn-clear-selection').addEventListener('click', clearSelection);
    document.getElementById('btn-compose-selected').addEventListener('click', () => {
        openComposerModal(state.selectedIds);
    });

    // Composer Modal controls
    document.getElementById('btn-close-composer').addEventListener('click', closeComposerModal);
    
    // Clicking outside modal closes it
    document.getElementById('composer-modal').addEventListener('click', (e) => {
        if (e.target.id === 'composer-modal') {
            closeComposerModal();
        }
    });

    // Style template option clicks
    const templateBtns = document.querySelectorAll('.template-btn');
    templateBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            templateBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateComposerPreview();
        });
    });

    // Live typing character updates
    const tweetTextArea = document.getElementById('tweet-text');
    tweetTextArea.addEventListener('input', () => {
        updateCharProgress(tweetTextArea.value.length);
    });

    // Clipboard Copy Action
    document.getElementById('btn-copy-tweet').addEventListener('click', () => {
        const text = document.getElementById('tweet-text').value;
        navigator.clipboard.writeText(text)
            .then(() => showToast('Copied to clipboard!', 'success'))
            .catch(() => showToast('Failed to copy text.', 'error'));
    });

    // X / Twitter Share Redirection
    document.getElementById('btn-post-tweet').addEventListener('click', () => {
        const text = document.getElementById('tweet-text').value;
        if (text.length > 280) {
            showToast('Tweet exceeds X character limit!', 'error');
            return;
        }
        const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(intentUrl, '_blank', 'noopener,noreferrer');
    });
}

// Fetch Release Notes from API
function fetchReleaseNotes(forceRefresh = false) {
    toggleLoading(true);
    hideError();

    const url = `/api/releases?refresh=${forceRefresh ? 'true' : 'false'}`;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                state.updates = data.updates;
                updateStats(data);
                applyFiltersAndRender();
                
                // Show notification to user
                const msg = forceRefresh 
                    ? `Refreshed successfully! Found ${data.updates.length} updates.` 
                    : `Loaded ${data.updates.length} release updates.`;
                showToast(msg, 'success');
                
                // Update time indicator
                updateTimeIndicator(data.last_updated);
            } else {
                throw new Error(data.error || 'Unknown parsing error');
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
            showError(error.message);
            showToast('Failed to sync release notes.', 'error');
        })
        .finally(() => {
            toggleLoading(false);
        });
}

// Loading Spinner Switcher
function toggleLoading(isLoading) {
    const refreshBtn = document.getElementById('btn-refresh');
    const refreshIcon = refreshBtn.querySelector('.icon-refresh');
    const skeleton = document.getElementById('loading-skeleton');
    const container = document.getElementById('notes-container');
    const statusText = document.querySelector('#update-status .status-text');
    const statusDot = document.querySelector('#update-status .status-dot');

    if (isLoading) {
        refreshIcon.classList.add('spinning');
        refreshBtn.disabled = true;
        skeleton.style.display = 'block';
        container.style.display = 'none';
        statusText.textContent = "Syncing feed...";
        statusDot.parentElement.classList.add('loading');
    } else {
        refreshIcon.classList.remove('spinning');
        refreshBtn.disabled = false;
        skeleton.style.display = 'none';
        container.style.display = 'flex';
        statusDot.parentElement.classList.remove('loading');
    }
}

// Time parsing helper
function updateTimeIndicator(isoString) {
    const statusText = document.querySelector('#update-status .status-text');
    if (!isoString) {
        statusText.textContent = "Unknown sync";
        return;
    }
    const d = new Date(isoString);
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    statusText.textContent = `Synced at ${d.toLocaleTimeString(undefined, options)}`;
}

// Error handlers
function showError(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-alert').style.display = 'flex';
    document.getElementById('notes-container').style.display = 'none';
}

function hideError() {
    document.getElementById('error-alert').style.display = 'none';
}

// Update counters in sidebar
function updateStats(data) {
    const all = data.updates.length;
    const features = data.updates.filter(u => u.category === 'Feature').length;
    const announcements = data.updates.filter(u => u.category === 'Announcement').length;
    const issues = data.updates.filter(u => u.category === 'Issue').length;
    const deprecated = data.updates.filter(u => u.category === 'Deprecated').length;
    const changes = data.updates.filter(u => u.category === 'Change').length;

    document.getElementById('stat-total').textContent = all;
    document.getElementById('count-all').textContent = all;
    document.getElementById('count-feature').textContent = features;
    document.getElementById('count-announcement').textContent = announcements;
    document.getElementById('count-issue').textContent = issues;
    document.getElementById('count-deprecated').textContent = deprecated;
    document.getElementById('count-change').textContent = changes;
}

// Clear Search Query and Pills Filters
function clearAllFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('search-clear').style.display = 'none';
    state.searchQuery = '';
    
    const pills = document.querySelectorAll('#category-pills .pill');
    pills.forEach(p => p.classList.remove('active'));
    document.querySelector('#category-pills .pill[data-category="all"]').classList.add('active');
    state.activeCategory = 'all';

    applyFiltersAndRender();
}

// Filters logic
function applyFiltersAndRender() {
    // 1. Filter by category
    let list = state.updates;
    if (state.activeCategory !== 'all') {
        list = list.filter(u => u.category === state.activeCategory);
    }

    // 2. Filter by search query (case-insensitive keyword matching)
    if (state.searchQuery.trim()) {
        const query = state.searchQuery.toLowerCase().trim();
        list = list.filter(u => 
            u.date.toLowerCase().includes(query) || 
            u.category.toLowerCase().includes(query) || 
            u.content_text.toLowerCase().includes(query)
        );
    }

    // 3. Sort Order
    if (state.sortBy === 'newest') {
        list.sort((a, b) => b.iso_date.localeCompare(a.iso_date));
    } else {
        list.sort((a, b) => a.iso_date.localeCompare(b.iso_date));
    }

    state.filteredUpdates = list;
    
    // Update Matching count
    document.getElementById('stat-showing').textContent = list.length;

    renderUpdatesList();
}

// Render the updates list inside content feed
function renderUpdatesList() {
    const container = document.getElementById('notes-container');
    const emptyState = document.getElementById('empty-state');
    
    container.innerHTML = '';
    
    if (state.filteredUpdates.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';

    state.filteredUpdates.forEach(update => {
        const card = document.createElement('article');
        card.className = `note-card cat-${update.category}`;
        card.id = `card-${update.id}`;
        
        // Highlight keyword logic
        let displayHtml = update.content_html;
        if (state.searchQuery.trim()) {
            displayHtml = highlightKeyword(displayHtml, state.searchQuery.trim());
        }

        const isChecked = state.selectedIds.includes(update.id);
        const iconSVG = CATEGORY_ICONS[update.category] || CATEGORY_ICONS['Announcement'];
        const badgeClass = `badge badge-${update.category.toLowerCase()}`;

        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta-left">
                    <span class="${badgeClass}">
                        ${iconSVG}
                        <span>${update.category}</span>
                    </span>
                    <time class="card-date" datetime="${update.iso_date}">${update.date}</time>
                </div>
                <div class="card-actions-right">
                    <!-- Direct single Tweet button -->
                    <button class="btn-card-tweet" data-id="${update.id}" title="Tweet about this update">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                    </button>
                    <!-- Checkbox for multi-select -->
                    <label class="select-checkbox-container" title="Select to Tweet multiple updates">
                        <input type="checkbox" class="note-checkbox" data-id="${update.id}" ${isChecked ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                </div>
            </div>
            <div class="card-body">
                ${displayHtml}
            </div>
        `;

        // Register action listeners on the newly created elements
        card.querySelector('.btn-card-tweet').addEventListener('click', (e) => {
            e.stopPropagation();
            openComposerModal([update.id]);
        });

        card.querySelector('.note-checkbox').addEventListener('change', (e) => {
            handleCheckboxChange(update.id, e.target.checked);
        });

        // Clicking card checks the checkbox (making it touch-friendly and intuitive)
        card.addEventListener('click', (e) => {
            // Avoid triggering checkbox toggle if user clicks links or buttons directly
            if (e.target.tagName === 'A' || e.target.closest('button') || e.target.closest('label')) {
                return;
            }
            const cb = card.querySelector('.note-checkbox');
            cb.checked = !cb.checked;
            handleCheckboxChange(update.id, cb.checked);
        });

        container.appendChild(card);
    });
}

// Simple regex keyword highlighter (only highlights text node contents, avoids breaking html tags)
function highlightKeyword(htmlStr, keyword) {
    try {
        const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
        // A temporary element to parse nodes
        const temp = document.createElement('div');
        temp.innerHTML = htmlStr;

        const walk = document.createTreeWalker(temp, NodeFilter.SHOW_TEXT, null, false);
        let n;
        const textNodes = [];
        while (n = walk.nextNode()) {
            textNodes.push(n);
        }

        textNodes.forEach(node => {
            if (node.nodeValue.trim()) {
                const span = document.createElement('span');
                span.innerHTML = node.nodeValue.replace(regex, '<mark style="background-color: rgba(253, 224, 71, 0.4); color: inherit; padding: 2px 0px; border-radius: 2px;">$1</mark>');
                node.parentNode.replaceChild(span, node);
            }
        });
        return temp.innerHTML;
    } catch (e) {
        return htmlStr; // Return raw if anything fails
    }
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Checkbox selection state handling
function handleCheckboxChange(updateId, isChecked) {
    if (isChecked) {
        if (!state.selectedIds.includes(updateId)) {
            state.selectedIds.push(updateId);
        }
    } else {
        state.selectedIds = state.selectedIds.filter(id => id !== updateId);
    }
    updateSelectionBanner();
}

// Update the bottom selection banner visibility and numbers
function updateSelectionBanner() {
    const banner = document.getElementById('selection-banner');
    const countBadge = document.getElementById('selection-count');
    const count = state.selectedIds.length;

    countBadge.textContent = count;

    if (count > 0) {
        banner.classList.add('active');
    } else {
        banner.classList.remove('active');
    }
}

// Clear all selections
function clearSelection() {
    state.selectedIds = [];
    updateSelectionBanner();
    // Update all visual checkboxes
    document.querySelectorAll('.note-checkbox').forEach(cb => {
        cb.checked = false;
    });
}

// COMPOSER MODAL & TWEET WRITER LOGIC

let activeComposerIds = [];

function openComposerModal(updateIds) {
    activeComposerIds = updateIds;
    const modal = document.getElementById('composer-modal');
    
    // Set templates options active states
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('.template-btn[data-style="announcement"]').classList.add('active');
    
    // Injected updates lists
    const sourceList = document.getElementById('composer-source-list');
    sourceList.innerHTML = '';
    
    updateIds.forEach(id => {
        const item = state.updates.find(u => u.id === id);
        if (item) {
            const row = document.createElement('div');
            row.className = 'source-note-item';
            row.innerHTML = `
                <div class="source-note-item-text">
                    <strong>[${item.category}]</strong> ${item.content_text}
                </div>
                <div class="source-note-item-meta">
                    <span class="badge badge-default" style="font-size: 9px; padding: 2px 6px;">${item.date}</span>
                </div>
            `;
            sourceList.appendChild(row);
        }
    });

    updateComposerPreview();
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Lock background scrolling
}

function closeComposerModal() {
    const modal = document.getElementById('composer-modal');
    modal.classList.remove('active');
    document.body.style.overflow = ''; // Unlock scrolling
}

// Formulates the Tweet content intelligently ensuring 280 characters limit is respected
function updateComposerPreview() {
    const activeStyle = document.querySelector('.template-btn.active').dataset.style;
    const tweetTextArea = document.getElementById('tweet-text');

    const selectedNotes = activeComposerIds.map(id => state.updates.find(u => u.id === id)).filter(Boolean);
    if (selectedNotes.length === 0) return;

    let finalTweet = "";
    const xLimit = 280;

    // We use a shared release notes link in the tweet
    const baseLink = selectedNotes[0].link; // e.g., BigQuery feed item link
    const linkLength = 23; // Twitter counts any link as exactly 23 characters

    if (selectedNotes.length === 1) {
        // SINGLE ITEM TWEET COMPILATION
        const note = selectedNotes[0];
        const dateStr = note.date;
        const category = note.category;
        const bodyText = note.content_text;

        let emoji = "📢";
        if (category === "Feature") emoji = "🚀";
        if (category === "Issue") emoji = "⚠️";
        if (category === "Deprecated") emoji = "🚫";
        if (category === "Change") emoji = "🔄";

        if (activeStyle === 'announcement') {
            const prefix = `${emoji} BigQuery Release - ${dateStr}\n\n`;
            const suffix = `\n\nRead more: ${baseLink}`;
            
            const staticChars = prefix.length + suffix.length - baseLink.length + linkLength;
            const allowedBodyChars = xLimit - staticChars;

            let body = bodyText;
            if (body.length > allowedBodyChars) {
                body = body.substring(0, allowedBodyChars - 3) + "...";
            }
            finalTweet = `${prefix}${body}${suffix}`;

        } else if (activeStyle === 'tech-detail') {
            const prefix = `💡 BigQuery Update (${dateStr}) | ${category.toUpperCase()}\n\n`;
            const suffix = `\n\nFull release note: ${baseLink}`;

            const staticChars = prefix.length + suffix.length - baseLink.length + linkLength;
            const allowedBodyChars = xLimit - staticChars;

            let body = bodyText;
            if (body.length > allowedBodyChars) {
                body = body.substring(0, allowedBodyChars - 3) + "...";
            }
            finalTweet = `${prefix}${body}${suffix}`;

        } else { // short-summary
            const prefix = `⚡ ${category} (${dateStr}): `;
            const suffix = `\n\n${baseLink}`;

            const staticChars = prefix.length + suffix.length - baseLink.length + linkLength;
            const allowedBodyChars = xLimit - staticChars;

            let body = bodyText;
            if (body.length > allowedBodyChars) {
                body = body.substring(0, allowedBodyChars - 3) + "...";
            }
            finalTweet = `${prefix}${body}${suffix}`;
        }
    } else {
        // MULTIPLE ITEMS COMPILATION (THREAD OR MERGED SUMMARY)
        if (activeStyle === 'announcement') {
            const titleLine = `📢 Latest BigQuery Updates!\n\n`;
            const suffix = `\n\nRelease notes: ${baseLink}`;
            
            // Generate list items
            const staticLength = titleLine.length + suffix.length - baseLink.length + linkLength;
            const allowedListChars = xLimit - staticLength;

            // Divide character limits among items
            const perItemLimit = Math.floor(allowedListChars / selectedNotes.length) - 5; // offset for bulleting
            
            let listContent = "";
            selectedNotes.forEach((note, index) => {
                let emoji = "•";
                if (note.category === "Feature") emoji = "🚀";
                if (note.category === "Issue") emoji = "⚠️";
                
                let text = note.content_text;
                if (text.length > perItemLimit) {
                    text = text.substring(0, perItemLimit - 3) + "...";
                }
                listContent += `${emoji} ${text}\n`;
            });

            finalTweet = `${titleLine}${listContent.trim()}${suffix}`;

        } else if (activeStyle === 'tech-detail') {
            const titleLine = `💡 Tech Summary - BigQuery updates\n\n`;
            const suffix = `\n\nSee all details: ${baseLink}`;
            
            const staticLength = titleLine.length + suffix.length - baseLink.length + linkLength;
            const allowedListChars = xLimit - staticLength;
            const perItemLimit = Math.floor(allowedListChars / selectedNotes.length) - 8;

            let listContent = "";
            selectedNotes.forEach((note) => {
                let text = note.content_text;
                if (text.length > perItemLimit) {
                    text = text.substring(0, perItemLimit - 3) + "...";
                }
                listContent += `- [${note.category}] ${text}\n`;
            });

            finalTweet = `${titleLine}${listContent.trim()}${suffix}`;

        } else { // short-summary
            const titleLine = `⚡ BigQuery updates:\n`;
            const suffix = `\n\nMore: ${baseLink}`;
            
            const staticLength = titleLine.length + suffix.length - baseLink.length + linkLength;
            const allowedListChars = xLimit - staticLength;
            const perItemLimit = Math.floor(allowedListChars / selectedNotes.length) - 4;

            let listContent = "";
            selectedNotes.forEach((note) => {
                let text = note.content_text;
                if (text.length > perItemLimit) {
                    text = text.substring(0, perItemLimit - 3) + "...";
                }
                listContent += `• ${text}\n`;
            });

            finalTweet = `${titleLine}${listContent.trim()}${suffix}`;
        }
    }

    tweetTextArea.value = finalTweet;
    updateCharProgress(finalTweet.length);
}

// Live Twitter-style progress circle update
function updateCharProgress(currentLength) {
    const limit = 280;
    const charCounter = document.getElementById('char-count');
    const warning = document.getElementById('composer-warning');
    const circle = document.getElementById('char-progress-circle');
    
    // Circle circumference logic
    const radius = circle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    
    circle.style.strokeDasharray = `${circumference} ${circumference}`;

    charCounter.textContent = `${currentLength} / ${limit}`;

    if (currentLength > limit) {
        charCounter.classList.add('over-limit');
        warning.textContent = `Exceeds limit by ${currentLength - limit} characters`;
        circle.style.stroke = '#ef4444'; // Red
        circle.style.strokeDashoffset = '0'; // Completely filled
    } else {
        charCounter.classList.remove('over-limit');
        warning.textContent = '';
        
        // Color transition based on character usage
        if (currentLength >= 260) {
            circle.style.stroke = '#f59e0b'; // Amber warning color
        } else {
            circle.style.stroke = 'var(--color-primary)';
        }

        const percentage = currentLength / limit;
        const offset = circumference - (percentage * circumference);
        circle.style.strokeDashoffset = offset;
    }
}

// Toast notification trigger
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    if (type === 'success') {
        icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    } else if (type === 'error') {
        icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    }

    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);

    // Remove toast after animation finishes
    setTimeout(() => {
        toast.style.animation = 'toast-in 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) reverse forwards';
        setTimeout(() => {
            toast.remove();
        }, 350);
    }, 4000);
}
