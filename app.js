// app.js
// Changes Made:
// 1. Fixed Exit Restore Mode button in FAB section (Crypto Statistic Environment)
// 2. Updated crypto selector to update derived metrics when switching coins in both live and restore modes
// 3. Fixed derived metrics sourcing from stored JSON data in JSRE mode

// Debug flag for share feature
const SHARE_DEBUG = true;

// Share Environment State
const shareState = {
    modal: null,
    qrCode: null,
    autoCloseTimer: null,
    restoredFromLink: false
};

// Export State
const exportState = {
    currentExportType: null,
    currentExportSnapshot: null,
    readyPopupTimer: null,
    readyPopupCountdown: null
};

// Shared Link State
const sharedLinkState = {
    popup: null,
    popupTimer: null,
    popupCountdown: null
};

// Global State
const state = {
    currentSymbol: 'BTC',
    currentName: 'Bitcoin',
    currentIcon: '₿',
    ws: null,
    priceData: {},
    historicalData: {},
    startTime: Date.now(),
    dataPointsCount: 0,
    lastUpdateTime: Date.now(),
    alerts: [],
    theme: 'light',
    lastLivePrice: null,
    currency: 'USDT',
    usdtToInrRate: 83.5,
    isRestoreMode: false,
    restoreSnapshot: null,
    restoredFromLink: false
};

const JSRE = {
    overlay: null,
    progress: null,
    title: null,
    subtitle: null,
    circumference: 439.8,
    phase: 0
};

// AI Summary Session Management
let aiSummarySession = {
    snapshot: null,
    summaryText: "",
    generatedAt: null,
    originalSnapshot: null,
    isJSREMode: false
};

// Drag State for AI Panel
let aiPanelDragState = {
    isDragging: false,
    offsetX: 0,
    offsetY: 0,
    currentX: 0,
    currentY: 0
};

// Cryptocurrency mapping for Binance
const cryptoMapping = {
    'BTC': 'btcusdt',
    'ETH': 'ethusdt',
    'ADA': 'adausdt',
    'DOT': 'dotusdt',
    'SOL': 'solusdt',
    'BNB': 'bnbusdt',
    'XRP': 'xrpusdt',
    'DOGE': 'dogeusdt',
    'LTC': 'ltcusdt'
};

// Application version
const APP_VERSION = '1.0';

// ========================================
// STAGED LOADER HELPER
// ========================================

/**
 * Staged loader helper function
 * @param {Object} options - {stages: string[], totalMs: number, title: string, tagline: string}
 * @returns {Promise} resolves when loader completes
 */
function showStagedLoader(options) {
    const { stages, totalMs, title } = options;
    const stageCount = stages.length;
    const stageDuration = totalMs / stageCount;

    // Use existing JSRE overlay
    if (JSRE.overlay && JSRE.title && JSRE.subtitle && JSRE.progress) {
        JSRE.overlay.classList.remove('hidden');

        // INITIAL STATE
        JSRE.title.textContent = stages[0]; // STAGE replaces title
        JSRE.subtitle.textContent = title; // TITLE replaces stages
        JSRE.progress.style.strokeDashoffset = JSRE.circumference;
        JSRE.progress.style.stroke = "var(--color-primary)";

        let currentStage = 0;

        return new Promise((resolve) => {
            const advanceStage = () => {
                currentStage++;

                if (currentStage < stageCount) {
                    const progressOffset =
                        JSRE.circumference -
                        (JSRE.circumference / stageCount) * currentStage;

                    JSRE.progress.style.strokeDashoffset = progressOffset;

                    // UPDATE STAGE TEXT
                    JSRE.title.textContent = stages[currentStage];
                    JSRE.subtitle.textContent = title;

                    setTimeout(advanceStage, stageDuration);
                } else {
                    // COMPLETE
                    JSRE.progress.style.strokeDashoffset = 0;
                    setTimeout(() => {
                        JSRE.overlay.classList.add('hidden');
                        resolve();
                    }, stageDuration);
                }
            };

            setTimeout(advanceStage, stageDuration);
        });
    } else {
        // Fallback
        console.log(`[STAGED LOADER] ${title}: ${stages.join(' → ')}`);
        return new Promise(resolve => setTimeout(resolve, totalMs));
    }
}

// STEP 2.1 — Create TinyURL
async function createTinyUrl(longUrl) {
    const response = await fetch(
        `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`
    );
    return response.text();
}

// STEP 2.2 — Create QR image URL
function createQrImageUrl(shortUrl) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shortUrl)}`;
}

// ========================================
// SHARE ENVIRONMENT FUNCTIONS - FIXED & WORKING
// ========================================

/**
 * Initialize the share environment modal
 */
function initShareModal() {
    console.log('[SHARE] Initializing share modal...');

    shareState.modal = document.getElementById('shareEnvModal');

    if (!shareState.modal) {
        console.error('[SHARE] Share modal not found in DOM');
        return;
    }

    console.log('[SHARE] Modal found');

    // Setup close buttons
    const closeBtns = shareState.modal.querySelectorAll('.share-modal-close');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeShareModal();
        });
    });

    // Setup copy button
    const copyBtn = shareState.modal.querySelector('.share-copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            copyShareLink();
        });
    }

    // Setup share button
    const shareBtn = shareState.modal.querySelector('.share-share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            shareViaNative();
        });
    }

    // Setup hover actions
    const copyHoverAction = shareState.modal.querySelector('.share-link-hover-action[data-action="copy"]');
    if (copyHoverAction) {
        copyHoverAction.addEventListener('click', copyShareLink);
    }

    const shareHoverAction = shareState.modal.querySelector('.share-link-hover-action[data-action="share"]');
    if (shareHoverAction) {
        shareHoverAction.addEventListener('click', shareViaNative);
    }

    // Setup QR hover actions
    const qrCopyAction = shareState.modal.querySelector('.qr-hover-action[data-action="copy"]');
    if (qrCopyAction) {
        qrCopyAction.addEventListener('click', async() => {
            const qrImage = shareState.modal.querySelector('#shareQrImage');
            if (qrImage) {
                try {
                    const blob = await fetch(qrImage.src).then(r => r.blob());
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    addAlert('QR code copied to clipboard', 'success');
                } catch (error) {
                    console.error('Failed to copy QR:', error);
                    addAlert('Failed to copy QR code', 'error');
                }
            }
        });
    }

    const qrShareAction = shareState.modal.querySelector('.qr-hover-action[data-action="share"]');
    if (qrShareAction) {
        qrShareAction.addEventListener('click', async() => {
            const qrImage = shareState.modal.querySelector('#shareQrImage');
            if (qrImage && navigator.share) {
                try {
                    const blob = await fetch(qrImage.src).then(r => r.blob());
                    const file = new File([blob], 'qr-code.png', { type: 'image/png' });
                    await navigator.share({
                        title: 'Crypto View QR Code',
                        text: 'Scan this QR code to view the crypto environment',
                        files: [file]
                    });
                } catch (error) {
                    console.error('Failed to share QR:', error);
                }
            }
        });
    }

    const qrDownloadAction = shareState.modal.querySelector('.qr-hover-action[data-action="download"]');
    if (qrDownloadAction) {
        qrDownloadAction.addEventListener('click', () => {
            const qrImage = shareState.modal.querySelector('#shareQrImage');
            if (qrImage) {
                const a = document.createElement('a');
                a.href = qrImage.src;
                a.download = 'crypto-view-qr.png';
                a.click();
                addAlert('QR code downloaded', 'success');
            }
        });
    }

    // Close modal when clicking on backdrop
    const backdrop = shareState.modal.querySelector('.share-modal-backdrop');
    if (backdrop) {
        backdrop.addEventListener('click', closeShareModal);
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !shareState.modal.classList.contains('hidden')) {
            closeShareModal();
        }
    });

    // Select link text on click
    const linkInput = shareState.modal.querySelector('.share-link-input');
    if (linkInput) {
        linkInput.addEventListener('click', function() {
            this.select();
        });
    }

    // Setup exit restore mode button in share modal
    const exitRestoreBtn = shareState.modal.querySelector('#shareExitRestoreBtn');
    if (exitRestoreBtn) {
        exitRestoreBtn.addEventListener('click', exitRestoreMode);
    }

    console.log('[SHARE] Modal initialized successfully');
}

/**
 * Strip sensitive fields from snapshot before sharing
 */
function shareStripSensitive(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return snapshot;

    // Create a deep copy to avoid mutating original
    const cleaned = JSON.parse(JSON.stringify(snapshot));

    // Remove sensitive fields
    if (cleaned.snapshot && cleaned.snapshot.metadata) {
        // Keep only last 3 alerts for context
        if (cleaned.snapshot.metadata.alerts && Array.isArray(cleaned.snapshot.metadata.alerts)) {
            cleaned.snapshot.metadata.alerts = cleaned.snapshot.metadata.alerts.slice(0, 3);
        }

        // Add share metadata
        cleaned.snapshot.metadata.sharedBy = 'client';
        cleaned.snapshot.metadata.shareCreatedAt = new Date().toISOString();
        cleaned.snapshot.metadata.shareVersion = '1.0';
    }

    return cleaned;
}

/**
 * Encode snapshot to URL-safe compressed string
 */
function shareEncodeSnapshot(snapshot) {
    try {
        const jsonString = JSON.stringify(snapshot);
        if (SHARE_DEBUG) console.log('[SHARE] Original JSON size:', jsonString.length);

        const encoded = LZString.compressToEncodedURIComponent(jsonString);
        if (SHARE_DEBUG) console.log('[SHARE] Encoded size:', encoded.length);

        return encoded;
    } catch (error) {
        console.error('[SHARE] Encoding failed:', error);
        return null;
    }
}

/**
 * Decode snapshot from compressed string
 */
function shareDecodeSnapshot(encoded) {
    try {
        const jsonString = LZString.decompressFromEncodedURIComponent(encoded);
        if (!jsonString) {
            throw new Error('Decompression returned null');
        }

        const snapshot = JSON.parse(jsonString);

        // Basic validation
        if (!snapshot.version || !snapshot.snapshot) {
            throw new Error('Invalid snapshot structure');
        }

        return snapshot;
    } catch (error) {
        console.error('[SHARE] Decoding failed:', error);
        return null;
    }
}

/**
 * Generate shareable environment link
 */
async function generateShareableEnvironmentLink() {
    try {
        console.log('[SHARE] Generating shareable link...');

        // Generate current snapshot
        const snapshot = generateSnapshot();

        // Strip sensitive data
        const cleanedSnapshot = shareStripSensitive(snapshot);

        // Encode to URL-safe string
        const encoded = shareEncodeSnapshot(cleanedSnapshot);

        if (!encoded) {
            throw new Error('Failed to encode snapshot');
        }

        // Check URL length limit
        if (encoded.length > 15000) {
            addAlert('Snapshot too large for URL sharing. Please use JSON export instead.', 'warning');
            return;
        }

        // Build shareable URL
        const shareUrl = `${window.location.origin}${window.location.pathname}#env=${encoded}`;
        const tinyUrl = await createTinyUrl(shareUrl);
        const qrImageUrl = createQrImageUrl(tinyUrl);

        openShareModal({
            fullUrl: shareUrl,
            tinyUrl: tinyUrl,
            qrImageUrl: qrImageUrl
        });

        console.log('[SHARE] Share URL generated');

        // Open share modal
        openShareModal(shareUrl, cleanedSnapshot);

    } catch (error) {
        console.error('[SHARE] Failed to generate share link:', error);
        addAlert('Failed to generate share link. Please try again.', 'error');
    }
}
async function shortenUrl(longUrl) {
    const response = await fetch(
        "https://crypto-shortener.ajithramesh2020.workers.dev/shorten", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: longUrl })
        }
    );

    const data = await response.json();
    if (!data.short) throw new Error("Shorten failed");

    return data.short;
}


/**
 * Open share modal with link and snapshot data
 */
function openShareModal(link, snapshot, options = {}) {
    const { autoCloseMs = null } = options;

    if (!shareState.modal) {
        console.error('[SHARE] Modal not initialized');
        initShareModal();
        if (!shareState.modal) return;
    }

    // Clear any existing auto-close timer
    if (shareState.autoCloseTimer) {
        clearTimeout(shareState.autoCloseTimer);
        shareState.autoCloseTimer = null;
    }

    // Set link in input
    const linkInput = shareState.modal.querySelector('.share-link-input');
    if (linkInput) {
        linkInput.value = link;
    }

    // Generate QR code
    const qrContainer = shareState.modal.querySelector('#share-qr');
    if (qrContainer) {
        qrContainer.innerHTML = '<small>Generating QR…</small>';

        // Create QR code
        qrContainer.innerHTML = '';
        // Clear old QR
        qrContainer.innerHTML = '';

        // Wait until modal is fully rendered
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                new QRCode(qrContainer, {
                    text: link,
                    width: 180,
                    height: 180,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.H
                });
            });
        });


        // Add image for easier download/copy
        setTimeout(() => {
            const qrImg = qrContainer.querySelector('img');
            if (qrImg) {
                qrImg.id = 'shareQrImage';
                qrImg.alt = 'QR Code';
            }
        }, 100);
    }

    // Update stats from snapshot
    updateShareModalStats(snapshot);

    // Show/hide exit restore button
    const exitRestoreContainer = shareState.modal.querySelector('#share-exit-restore-container');
    if (exitRestoreContainer) {
        exitRestoreContainer.style.display = state.restoredFromLink ? 'block' : 'none';
    }

    // Show modal
    shareState.modal.classList.remove('hidden');

    // Set auto-close timer if specified
    if (autoCloseMs && autoCloseMs > 0) {
        shareState.autoCloseTimer = setTimeout(() => {
            closeShareModal();
            addAlert('Share environment modal closed automatically', 'info');
        }, autoCloseMs);
    }

    // Update modal title based on context
    const modalTitle = shareState.modal.querySelector('.share-modal-title');
    if (modalTitle) {
        if (state.restoredFromLink) {
            modalTitle.textContent = 'Crypto Session Rendering Engine β (Restored)';
        } else {
            modalTitle.textContent = 'Crypto Session Rendering Engine β';
        }
    }



    console.log('[SHARE] Modal opened successfully');
}

/**
 * Update modal stats from snapshot data
 */
function updateShareModalStats(snapshot) {
    if (!snapshot || !snapshot.snapshot) return;

    const applicationState = snapshot.snapshot.applicationState || {};
    const metadata = snapshot.snapshot.metadata || {};
    const priceDataMap = snapshot.snapshot.priceData || {};
    const analyticsMap = snapshot.snapshot.derivedAnalytics || {};

    const currentSymbol = applicationState.currentSymbol || 'BTC';
    const priceData = priceDataMap[currentSymbol];
    const analytics = analyticsMap[currentSymbol];

    // Format price
    let formattedPrice = '--';
    if (priceData && priceData.price) {
        formattedPrice = formatPrice(priceData.price);
    }

    // Update stats elements
    const stats = {
        'share-stat-asset': (currentSymbol + '/' + (applicationState.currency || 'USDT')),
        'share-stat-price': formattedPrice,
        'share-stat-volatility': analytics ?
            ((analytics.volatility24h != null ?
                analytics.volatility24h.toFixed(2) :
                '--') + '%') : '--%',
        'share-stat-imbalance': analytics ?
            ((analytics.bidAskImbalance != null ?
                analytics.bidAskImbalance.toFixed(1) :
                '--') + '%') : '--%',
        'share-stat-timestamp': metadata.snapshotTime ?
            new Date(metadata.snapshotTime).toLocaleString() : '--',
        'share-stat-quality': metadata.snapshotQuality || '--'
    };

    // Update each stat element
    Object.entries(stats).forEach(function([id, value]) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;

            // Add quality class if quality element
            if (id === 'share-stat-quality') {
                element.className = 'share-stat-value';
                const quality = metadata.snapshotQuality;
                if (quality === 'FRESH') element.classList.add('share-stat-fresh');
                else if (quality === 'RECENT') element.classList.add('share-stat-recent');
                else if (quality === 'STALE') element.classList.add('share-stat-stale');
            }
        }
    });
}

/**
 * Close the share modal
 */
function closeShareModal() {
    if (!shareState.modal) return;

    shareState.modal.classList.add('hidden');

    // Clear auto-close timer
    if (shareState.autoCloseTimer) {
        clearTimeout(shareState.autoCloseTimer);
        shareState.autoCloseTimer = null;
    }

    // Reset restored flag
    state.restoredFromLink = false;
}

/**
 * Copy share link to clipboard
 */
function copyShareLink() {
    const linkInput = shareState.modal.querySelector('.share-link-input');
    if (!linkInput) return;

    const link = linkInput.value;

    if (!link || link.trim() === '') {
        addAlert('No link to copy', 'warning');
        return;
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(link)
            .then(() => {
                addAlert('Share link copied to clipboard!', 'success');

                // Show feedback on button
                const copyBtn = shareState.modal.querySelector('.share-copy-btn');
                if (copyBtn) {
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = '✓ Copied!';
                    copyBtn.style.background = 'var(--color-success)';
                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                        copyBtn.style.background = '';
                    }, 1500);
                }
            })
            .catch(err => {
                console.error('[SHARE] Clipboard write failed:', err);
                fallbackCopyText(link);
            });
    } else {
        fallbackCopyText(link);
    }
}

/**
 * Fallback copy method for older browsers
 */
function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            addAlert('Share link copied to clipboard!', 'success');
        } else {
            addAlert('Failed to copy link. Please copy manually.', 'error');
        }
    } catch (err) {
        console.error('[SHARE] Fallback copy failed:', err);
        addAlert('Failed to copy link. Please copy manually.', 'error');
    }

    document.body.removeChild(textArea);
}

/**
 * Share via native share API if available
 */
function shareViaNative() {
    const linkInput = shareState.modal.querySelector('.share-link-input');
    if (!linkInput) return;

    const link = linkInput.value;
    const snapshot = generateSnapshot();
    let assetName = 'Crypto';

    if (
        snapshot &&
        snapshot.snapshot &&
        snapshot.snapshot.applicationState &&
        snapshot.snapshot.applicationState.currentName
    ) {
        assetName = snapshot.snapshot.applicationState.currentName;
    }

    if (navigator.share) {
        navigator.share({
                title: `Crypto View - ${assetName} Environment`,
                text: `Check out this ${assetName} market environment snapshot`,
                url: link
            })
            .then(() => {
                addAlert('Shared successfully!', 'success');
            })
            .catch(err => {
                if (err.name !== 'AbortError') {
                    console.error('[SHARE] Native share failed:', err);
                    copyShareLink();
                }
            });
    } else {
        copyShareLink();
    }
}

// ========================================
// SHARE ENVIRONMENT FAB
// ========================================

/**
 * Setup Share Environment FAB
 */
function setupShareEnvFab() {
    const shareEnvFab = document.getElementById('shareEnvFab');
    if (!shareEnvFab) return;

    shareEnvFab.addEventListener('click', async() => {
        // 1. IMMEDIATELY generate data
        const snapshot = generateSnapshot();
        const cleanedSnapshot = shareStripSensitive(snapshot);
        const encoded = shareEncodeSnapshot(cleanedSnapshot);
        const shareUrl = `${window.location.origin}${window.location.pathname}#env=${encoded}`;

        // 2. Start loader animation
        await showStagedLoader({
            stages: [
                'CAPTURING FULL APPLICATION SNAPSHOT',
                'EXECUTING DATA SANITIZATION LAYER',
                'COMPRESSING SNAPSHOT PAYLOAD',
                'ENCODING TRANSFERABLE STATE',
                'MATERIALIZING SHAREABLE URL',
                'COMMITTING SHARE ENVIRONMENT UI'
            ],
            totalMs: 15000,
            title: 'Preparing share environment',
            tagline: 'Generating shareable link'
        });

        // 3. After loader, try to shorten URL and show modal
        try {
            const tinyUrl = await createTinyUrl(shareUrl);
            const qrImageUrl = createQrImageUrl(tinyUrl);
            openShareModal(tinyUrl, cleanedSnapshot);
        } catch (error) {
            console.error('[SHARE] TinyURL failed:', error);
            openShareModal(shareUrl, cleanedSnapshot);
        }
    });
}

// ========================================
// CURRENCY TOGGLE WITH LOADER
// ========================================

/**
 * Setup currency toggle with staged loader
 */
function setupCurrencyToggle() {
    const currencyBtn = document.getElementById('currencyToggle');
    if (!currencyBtn) return;

    const icon = currencyBtn.querySelector('.fab-icon');

    if (icon) {
        icon.textContent = state.currency === 'USDT' ? '₹' : '$₮';
    }

    function playToggleAnimation() {
        currencyBtn.classList.remove('currency-toggle-pop');
        void currencyBtn.offsetWidth;
        currencyBtn.classList.add('currency-toggle-pop');
        setTimeout(() => {
            currencyBtn.classList.remove('currency-toggle-pop');
        }, 200);
    }

    currencyBtn.addEventListener('click', async() => {
        if (state.isRestoreMode && state.restoreSnapshot) {
            const symbol = state.currentSymbol;
            const currencyData = state.restoreSnapshot.snapshot.currencyContext.prices[symbol];
            if (!currencyData) {
                addAlert("Currency data not available in snapshot", "warning");
                return;
            }
            // Fast toggle for restore mode
            state.currency = state.currency === 'USDT' ? 'INR' : 'USDT';
            icon.textContent = state.currency === 'USDT' ? '₹' : '$₮';
            playToggleAnimation();
            updatePriceDisplayFromSnapshot(state.restoreSnapshot);
            addAlert(`Currency switched to ${state.currency}`, 'info');
            return;
        }

        // Determine which currency we're switching to
        const targetCurrency = state.currency === 'USDT' ? 'INR' : 'USDT';
        const isToINR = targetCurrency === 'INR';

        // Show staged loader
        const stages = isToINR ? // 4. CURRENCY CONVERSION — USDT TO INR (5 STEPS)
            // 4. CURRENCY CONVERSION — USDT TO INR (5)
            [
                'RESOLVING USDT PRICE FEED',
                'VALIDATING CONVERSION PARAMETERS',
                'EXECUTING RATE TRANSFORMATION',
                'APPLYING PRECISION NORMALIZATION',
                'UPDATING UI '
            ] :

            [
                'RESOLVING INR PRICE FEED',
                'VALIDATING INPUT AMOUNT',
                'EXECUTING INVERSE RATE COMPUTATION',
                'NORMALIZING DECIMAL PRECISION',
                'UPDATING UI'
            ];

        const tagline = isToINR ?
            'Switching display to INR — live conversion in progress' :
            'Switching display to USDT — syncing with exchange';

        await showStagedLoader({
            stages: stages,
            totalMs: 6000,
            title: 'Switching currency',
            tagline: tagline
        });

        // Apply currency switch
        state.currency = targetCurrency;

        if (icon) {
            icon.textContent = state.currency === 'USDT' ? '₹' : '$₮';
        }

        playToggleAnimation();
        updatePriceDisplay();
        addAlert(`Currency switched to ${state.currency}`, 'info');
    });
}

// ========================================
// AI SUMMARY SHARE FUNCTION
// ========================================

/**
 * Share AI summary text
 */
function shareAISummary() {
    const textElement = document.getElementById('aiSummaryText');
    if (!textElement) {
        console.error('AI summary text element not found');
        return;
    }

    const textToShare = textElement.innerText || textElement.textContent;
    if (!textToShare || textToShare.trim() === '') {
        console.warn('No text to share');
        return;
    }

    const shareData = {
        title: 'Crypto View AI Summary',
        text: textToShare,
        url: window.location.href
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        navigator.share(shareData)
            .then(() => {
                addAlert('AI summary shared successfully!', 'success');
            })
            .catch(err => {
                if (err.name !== 'AbortError') {
                    console.error('Native share failed:', err);
                    // Fallback to clipboard
                    copyAISummary();
                }
            });
    } else {
        // Fallback to clipboard
        copyAISummary();
    }
}

// ========================================
// EXPORT LOADERS AND READY POPUP (NO AUTO-CLOSE)
// ========================================

/**
 * Show export ready popup
 */
function showReadyExportPopup(type, snapshot) {
    const popup = document.getElementById('exportReadyPopup');
    if (!popup) return;

    // Clear any existing timers (defensive cleanup)
    if (exportState.readyPopupTimer) {
        clearTimeout(exportState.readyPopupTimer);
        exportState.readyPopupTimer = null;
    }
    if (exportState.readyPopupCountdown) {
        clearInterval(exportState.readyPopupCountdown);
        exportState.readyPopupCountdown = null;
    }

    // Set export state
    exportState.currentExportType = type;
    exportState.currentExportSnapshot = snapshot;

    // Update title
    const title = popup.querySelector('#exportReadyTitle');
    if (title) {
        title.textContent = `Ready to Export ${type.toUpperCase()}`;
    }

    // OPTIONAL: reset timer UI to a static state
    const timerBar = popup.querySelector('.export-ready-progress');
    const countdown = popup.querySelector('.export-ready-countdown');
    if (timerBar) timerBar.style.width = '100%';
    if (countdown) countdown.textContent = '';

    // Setup action buttons
    const actions = popup.querySelectorAll('.export-ready-action');
    actions.forEach(btn => {
        btn.onclick = function() {
            const action = this.dataset.action;
            handleExportReadyAction(action);
        };
    });

    // Setup close button
    const closeBtn = popup.querySelector('.export-ready-close');
    if (closeBtn) {
        closeBtn.onclick = closeExportReadyPopup;
    }

    // Show popup
    popup.classList.remove('hidden');
}


/**
 * Handle export ready action
 */
function handleExportReadyAction(action) {
    const { currentExportType, currentExportSnapshot } = exportState;

    switch (action) {
        case 'copy':
            if (currentExportType === 'pdf') {
                navigator.clipboard.writeText('PDF export is ready. Download to view.');
                addAlert('PDF download instructions copied', 'info');
            } else {
                const jsonString = JSON.stringify(currentExportSnapshot, null, 2);
                navigator.clipboard.writeText(jsonString);
                addAlert('JSON copied to clipboard', 'success');
            }
            break;

        case 'share':
            if (currentExportType === 'pdf') {
                if (navigator.share) {
                    navigator.share({
                        title: 'Crypto View PDF Export',
                        text: 'Check out this PDF export from Crypto View',
                        url: window.location.href
                    });
                } else {
                    addAlert('Sharing not supported on this device', 'warning');
                }
            } else {
                const jsonString = JSON.stringify(currentExportSnapshot, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const file = new File([blob], 'crypto-view-snapshot.json', { type: 'application/json' });

                if (navigator.share && navigator.canShare({ files: [file] })) {
                    navigator.share({
                        title: 'Crypto View JSON Export',
                        files: [file]
                    });
                } else {
                    navigator.clipboard.writeText(jsonString);
                    addAlert('JSON copied to clipboard (share not available)', 'success');
                }
            }
            break;

        case 'download':
            // ACTUALLY PERFORM THE DOWNLOAD
            if (currentExportType === 'pdf') {
                exportToPDF(currentExportSnapshot);
            } else if (currentExportType === 'json') {
                exportToJSON(currentExportSnapshot);
            } else if (currentExportType === 'both') {
                exportToPDF(currentExportSnapshot);
                setTimeout(() => exportToJSON(currentExportSnapshot), 500);
            }
            closeExportReadyPopup();
            break;
    }
}

/**
 * Close export ready popup
 */
function closeExportReadyPopup() {
    const popup = document.getElementById('exportReadyPopup');
    if (popup) {
        popup.classList.add('hidden');
    }

    if (exportState.readyPopupTimer) {
        clearTimeout(exportState.readyPopupTimer);
        exportState.readyPopupTimer = null;
    }

    if (exportState.readyPopupCountdown) {
        clearInterval(exportState.readyPopupCountdown);
        exportState.readyPopupCountdown = null;
    }

    exportState.currentExportType = null;
    exportState.currentExportSnapshot = null;
}

// ========================================
// UPDATED EXPORT DROPDOWN HANDLER
// ========================================

/**
 * Setup export dropdown with loaders
 */
function setupExportDropdown() {
    const exportBtn = document.getElementById('exportBtn');
    const exportDropdown = document.getElementById('exportDropdown');
    const exportOptions = document.querySelectorAll('.export-option');

    if (!exportBtn || !exportDropdown) return;

    exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportDropdown.classList.toggle('active');
    });

    exportOptions.forEach(option => {
        option.addEventListener('click', async(e) => {
            e.stopPropagation();
            const action = option.dataset.option;

            // Hide dropdown immediately
            exportDropdown.classList.remove('active');

            // 1. IMMEDIATELY generate snapshot data
            const snapshot = generateSnapshot();

            switch (action) {
                case 'pdf':
                    // 2. Show loader animation
                    await showStagedLoader({
                        stages: [
                            'INITIALIZING PDF RENDER',
                            'BUILDING DOCUMENT LAYOUT',
                            'RENDERING VISUAL NODES',
                            'OPTIMIZING EMBEDDED ASSETS',
                            'COMPUTING PDF BINARY OUTPUT'
                        ],
                        totalMs: 10000,
                        title: 'Preparing PDF export',
                        tagline: ''
                    });

                    // 3. After loader, show ready popup
                    showReadyExportPopup('pdf', snapshot);
                    break;

                case 'json':
                    // 2. Show loader animation
                    await showStagedLoader({
                        stages: [
                            'SNAPSHOTTING APP',
                            'CONSTRUCTING JSON DATA GRAPH',
                            'EXECUTING SANITIZATION PASS',
                            'ENCODING AND COMPRESSING PAYLOAD',
                            'COMMITTING JSON EXPORT ARTIFACT'
                        ],
                        totalMs: 8000,
                        title: 'Preparing JSON export',
                        tagline: 'Generating JSON snapshot'
                    });

                    // 3. After loader, show ready popup
                    showReadyExportPopup('json', snapshot);
                    break;

                case 'both':
                    // 2. Show loader animation
                    await showStagedLoader({
                        stages: [
                            'INITIALIZING UNIFIED RENDER',
                            'EXECUTING PDF RENDER PIPELINE',
                            'EXECUTING JSON SERIALIZATION PIPELINE',
                            'PACKAGING EXPORT ARTIFACTS',
                            'FINALIZING EXPORT BUNDLE'
                        ],
                        totalMs: 12000,
                        title: 'Preparing export bundle',
                        tagline: 'Generating PDF and JSON'
                    });

                    // 3. After loader, show ready popup
                    showReadyExportPopup('both', snapshot);
                    break;

                case 'cancel':
                    // Just close dropdown, no action
                    break;
            }
        });
    });

    document.addEventListener('click', () => {
        exportDropdown.classList.remove('active');
    });

    exportDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// ========================================
// SHARED LINK OPENING BEHAVIOR
// ========================================

/**
 * Show shared link popup
 */
function showSharedLinkPopup(link) {
    const popup = document.getElementById('sharedLinkPopup');
    if (!popup) return;

    // Clear existing timers
    if (sharedLinkState.popupTimer) {
        clearTimeout(sharedLinkState.popupTimer);
    }
    if (sharedLinkState.popupCountdown) {
        clearInterval(sharedLinkState.popupCountdown);
    }

    // Update link
    const linkElement = popup.querySelector('#sharedLinkUrl');
    if (linkElement) {
        linkElement.textContent = link;
    }

    // Setup timer
    const timerBar = popup.querySelector('.shared-link-progress');
    const countdown = popup.querySelector('.shared-link-countdown');
    let timeLeft = 10;

    function updateCountdown() {
        timeLeft--;
        if (timerBar) timerBar.style.width = `${timeLeft * 10}%`;
        if (countdown) countdown.textContent = `${timeLeft}s`;
        if (timeLeft <= 0) {
            closeSharedLinkPopup();
        }
    }

    // Start countdown
    updateCountdown();
    sharedLinkState.popupCountdown = setInterval(updateCountdown, 1000);

    // Auto-close after 10 seconds
    sharedLinkState.popupTimer = setTimeout(closeSharedLinkPopup, 10000);

    // Setup action buttons
    const copyBtn = popup.querySelector('.shared-link-action[data-action="copy"]');
    if (copyBtn) {
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(link);
            addAlert('Link copied to clipboard', 'success');
        };
    }

    const shareBtn = popup.querySelector('.shared-link-action[data-action="share"]');
    if (shareBtn) {
        shareBtn.onclick = () => {
            if (navigator.share) {
                navigator.share({
                    title: 'Crypto Session Rendering Engine β',
                    text: 'Check out this crypto market environment',
                    url: link
                });
            } else {
                navigator.clipboard.writeText(link);
                addAlert('Link copied to clipboard (share not available)', 'success');
            }
        };
    }

    const closeBtn = popup.querySelector('.shared-link-action[data-action="close"]');
    if (closeBtn) {
        closeBtn.onclick = closeSharedLinkPopup;
    }

    const headerCloseBtn = popup.querySelector('.shared-link-close');
    if (headerCloseBtn) {
        headerCloseBtn.onclick = closeSharedLinkPopup;
    }

    // Show popup
    popup.classList.remove('hidden');
}

/**
 * Close shared link popup
 */
function closeSharedLinkPopup() {
    const popup = document.getElementById('sharedLinkPopup');
    if (popup) {
        popup.classList.add('hidden');
    }

    if (sharedLinkState.popupTimer) {
        clearTimeout(sharedLinkState.popupTimer);
        sharedLinkState.popupTimer = null;
    }

    if (sharedLinkState.popupCountdown) {
        clearInterval(sharedLinkState.popupCountdown);
        sharedLinkState.popupCountdown = null;
    }
}

// ========================================
// SHARED ENVIRONMENT RESTORATION
// ========================================

/**
 * Check and apply shared environment from URL hash
 */
function checkAndApplySharedEnvironmentFromHash() {
    console.log('[SHARE] Checking URL hash for environment...');
    const hash = window.location.hash;
    if (!hash || !hash.includes('env=')) return;

    try {
        // Extract encoded snapshot from hash
        const encoded = hash.split('env=')[1];
        if (!encoded) return;

        if (SHARE_DEBUG) console.log('[SHARE] Found environment in URL hash');

        // Decode snapshot
        const snapshot = shareDecodeSnapshot(encoded);
        if (!snapshot) {
            throw new Error('Failed to decode snapshot from URL');
        }

        // Validate snapshot
        if (!validateSnapshot(snapshot)) {
            throw new Error('Invalid snapshot format from URL');
        }

        // Set restored flag
        state.restoredFromLink = true;

        // Update header time to snapshot time
        updateDateTimeFromSnapshot(snapshot);

        // Apply snapshot using existing JSRE functions
        enterRestoreMode(snapshot);
        applySnapshot(snapshot);
        updateUIFromSnapshot(snapshot);

        addAlert(`Environment restored from shared link`, 'success');

        // Show shared link popup
        setTimeout(() => {
            const shareUrl = window.location.href;
            showSharedLinkPopup(shareUrl);
        }, 500);

    } catch (error) {
        console.error('[SHARE] Failed to restore from URL:', error);
        addAlert('Failed to restore environment from link', 'error');
        // Clear invalid hash
        window.location.hash = '';
    }
}

// ========================================
// APPLICATION INITIALIZATION
// ========================================

/**
 * Initialize application
 */
function init() {
    console.log("[APP] Initializing...");

    // Check for shared environment in URL hash BEFORE initializing live data
    checkAndApplySharedEnvironmentFromHash();

    updateTime();
    setInterval(updateTime, 1000);
    setupCryptoSelector();
    setupThemeToggle();
    setupExportDropdown();
    setupImportButton();
    setupSearchPanel();
    setupCurrencyToggle();
    setupShareEnvFab();
    initJSREOverlay();
    setupAIPanelDrag();
    initShareModal();

    // Setup shared link popup
    const sharedLinkPopup = document.getElementById('sharedLinkPopup');
    if (sharedLinkPopup) {
        sharedLinkPopup.classList.add('hidden');
    }

    // Setup export ready popup
    const exportReadyPopup = document.getElementById('exportReadyPopup');
    if (exportReadyPopup) {
        exportReadyPopup.classList.add('hidden');
    }

    // Only connect to live data if not in restore mode
    if (!state.isRestoreMode && !state.restoredFromLink) {
        connectWebSocket();
        fetchAllCryptoData();
        setInterval(() => fetchAllCryptoData(), 30000);
        updateSystemHealth();
        setInterval(updateSystemHealth, 1000);
        setupPriceVisibilityWatcher();
        fetchUsdtToInrRate();
        setInterval(fetchUsdtToInrRate, 5000);
    }

    addAlert('System initialized successfully', 'success');

    // Check URL for restore parameter
    const urlParams = new URLSearchParams(window.location.search);
    const restoreParam = urlParams.get('restore');
    if (restoreParam === 'demo') {
        loadDemoSnapshot();
    }
}

/**
 * Update current time
 */
/**
 * Update current time - with restore mode support
 */
function updateTime() {
    const el = document.getElementById('currentTime');
    if (!el) return;

    if (state.isRestoreMode && state.restoreSnapshot) {
        // In restore mode, show snapshot time (not live updates)
        // This gets called once during initialization but not updated thereafter
        const snapshotTime = new Date(state.restoreSnapshot.snapshot.metadata.snapshotTime);
        const datePart = snapshotTime.toLocaleDateString('en-CA');
        const timePart = snapshotTime.toLocaleTimeString('en-US', {
            hour12: false
        });
        el.textContent = `${datePart}  | ${timePart}`;
    } else {
        // Normal live mode - update time every second
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour12: false });
        el.textContent = timeString;
    }
}
/**
 * Setup time updates based on current mode
 */
function setupTimeUpdates() {
    // Clear any existing interval
    if (window.timeUpdateInterval) {
        clearInterval(window.timeUpdateInterval);
        window.timeUpdateInterval = null;
    }

    if (!state.isRestoreMode && !state.restoredFromLink) {
        // Live mode - update time every second
        updateTime(); // Initial update
        window.timeUpdateInterval = setInterval(updateTime, 1000);
    } else {
        // Restore mode - set time once from snapshot
        updateTime(); // This will show snapshot time
    }
}
/**
 * Setup crypto selector buttons
 */
function setupCryptoSelector() {
    const buttons = document.querySelectorAll('.crypto-btn');

    buttons.forEach(btn => {
        const isCurrent = btn.dataset.symbol === state.currentSymbol;

        if (isCurrent) {
            btn.classList.add('active', 'hidden');
        } else {
            btn.classList.remove('active', 'hidden');
        }

        btn.addEventListener('click', () => {
            // JSRE / CSRE: block symbols not present in snapshot
            if (state.isRestoreMode && state.restoreSnapshot) {
                const availableSymbols = Object.keys(
                    state.restoreSnapshot.snapshot.priceData || {}
                );

                if (!availableSymbols.includes(btn.dataset.symbol)) {
                    addAlert(
                        `Symbol ${btn.dataset.symbol} not available in restored snapshot`,
                        'warning'
                    );
                    return;
                }
            }

            // UI state
            buttons.forEach(b => b.classList.remove('active', 'hidden'));
            btn.classList.add('active', 'hidden');

            // Update runtime selection
            state.currentSymbol = btn.dataset.symbol;
            state.currentName = btn.dataset.name;
            state.currentIcon = btn.dataset.icon;

            // 🔑 CRITICAL ADDITION:
            // Keep restore snapshot applicationState aligned with user selection
            if (
                state.isRestoreMode &&
                state.restoreSnapshot &&
                state.restoreSnapshot.snapshot &&
                state.restoreSnapshot.snapshot.applicationState
            ) {
                state.restoreSnapshot.snapshot.applicationState.currentSymbol = state.currentSymbol;
                state.restoreSnapshot.snapshot.applicationState.currentName = state.currentName;
                state.restoreSnapshot.snapshot.applicationState.currentIcon = state.currentIcon;
            }

            updatePriceDisplay();

            // Update derived metrics based on mode
            if (state.isRestoreMode && state.restoreSnapshot) {
                // Use stored derived metrics from JSON snapshot
                updateMicrostructureFromSnapshot(state.restoreSnapshot);
                updateVolatilityFromSnapshot(state.restoreSnapshot);
                updateRiskIndicatorsFromSnapshot(state.restoreSnapshot);
                updateAnomaliesFromSnapshot(state.restoreSnapshot);
            } else {
                // Live mode: recalculate derived metrics
                const data = state.priceData[state.currentSymbol];
                if (data) {
                    updateMarketMicrostructure(data);
                    updateVolatilityMetrics(data);
                    updateRiskIndicators(data);
                    detectAnomalies(state.currentSymbol);
                }
            }

            addAlert(`Switched to ${state.currentName}`, 'info');
        });
    });
}


let jsonModalTimerId = null;
let jsonModalCountdownId = null;

/**
 * Show JSON decision modal
 */
function showJsonModal({ title, desc, primaryText, secondaryText, onPrimary, onSecondary, autoAction, timerFormat }) {
    console.log("[JSRE] Showing decision modal");
    const modal = document.getElementById("jsonDecisionModal");
    const titleEl = document.getElementById("jsonModalTitle");
    const descEl = document.getElementById("jsonModalDesc");
    const timerEl = document.getElementById("jsonModalTimer");
    const primaryBtn = document.getElementById("jsonPrimaryBtn");
    const secondaryBtn = document.getElementById("jsonSecondaryBtn");

    let timeLeft = 10;
    timerEl.textContent = timerFormat === "restore" ?
        `restore in ${timeLeft} seconds` :
        `closes in ${timeLeft} seconds`;

    titleEl.textContent = title;
    descEl.textContent = desc;

    primaryBtn.textContent = primaryText;
    secondaryBtn.textContent = secondaryText;

    primaryBtn.onclick = () => {
        console.log("[JSRE] User clicked proceed");
        closeJsonModal();
        onPrimary && onPrimary();
    };

    secondaryBtn.onclick = () => {
        console.log("[JSRE] User clicked cancel");
        closeJsonModal();
        onSecondary && onSecondary();
    };

    modal.style.display = "block";

    jsonModalCountdownId = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timerFormat === "restore" ?
            `restore in ${timeLeft} seconds` :
            `closes in ${timeLeft} seconds`;
        if (timeLeft <= 0) {
            console.log("[JSRE] Auto-action triggered");
            closeJsonModal();
            autoAction && autoAction();
        }
    }, 1000);
}

/**
 * Close JSON modal
 */
function closeJsonModal() {
    clearInterval(jsonModalCountdownId);
    document.getElementById("jsonDecisionModal").style.display = "none";
}

/**
 * Setup import button for JSON snapshot restoration
 */
function setupImportButton() {
    console.log("[JSRE] Setting up import button");
    const importBtn = document.getElementById('importBtn');
    const importFileInput = document.getElementById('importFileInput');

    if (!importBtn) {
        console.error("[JSRE] Import button not found");
        return;
    }
    if (!importFileInput) {
        console.error("[JSRE] Import file input not found");
        return;
    }

    importBtn.addEventListener('click', () => {
        console.log("[JSRE] Import button clicked");
        importFileInput.click();
    });

    importFileInput.addEventListener('change', (e) => {
        console.log("[JSRE] File selected");
        const file = e.target.files[0];
        if (!file) {
            console.log("[JSRE] No file selected");
            return;
        }

        console.log(`[JSRE] Reading file: ${file.name} (${file.size} bytes)`);
        const reader = new FileReader();
        reader.onload = (event) => {
            console.log("[JSRE] File read complete");
            showJSRE();

            const timeoutIds = [];

            timeoutIds.push(setTimeout(() => {
                advanceJSRE("Redirecting to restore environment");
            }, 2000));

            timeoutIds.push(setTimeout(() => {
                advanceJSRE("Uploading snapshot file");
            }, 4500));

            timeoutIds.push(setTimeout(() => {
                advanceJSRE("Validating snapshot structure");

                let snapshot;
                try {
                    console.log("[JSRE] Parsing JSON...");
                    snapshot = JSON.parse(event.target.result);
                    console.log("[JSRE] JSON parsed successfully");
                } catch (err) {
                    console.error("[JSRE] JSON parse error:", err.message);
                    timeoutIds.forEach(id => clearTimeout(id));
                    jsreError();
                    return;
                }

                console.log("[JSRE] Validating snapshot structure...");
                if (!validateSnapshot(snapshot)) {
                    console.error("[JSRE] Snapshot validation failed");
                    timeoutIds.forEach(id => clearTimeout(id));
                    jsreError();
                    return;
                }

                console.log("[JSRE] Snapshot validation passed");
                timeoutIds.push(setTimeout(() => {
                    advanceJSRE("Preparing secure restore session");

                    timeoutIds.push(setTimeout(() => {
                        console.log("[JSRE] Showing restore confirmation modal");
                        JSRE.overlay.classList.add("hidden");
                        showJsonModal({
                            title: "JSON State Restore Engine",
                            desc: "The application will display the data from the snapshot",
                            primaryText: "Proceed",
                            secondaryText: "Cancel",
                            onPrimary: () => {
                                console.log("[JSRE] Proceeding with restore");
                                restoreFromSnapshot(snapshot);
                            },
                            onSecondary: () => {
                                console.log("[JSRE] Restore cancelled by user");
                            },
                            timerFormat: "restore",
                            autoAction: () => {
                                console.log("[JSRE] Auto-proceeding with restore");
                                restoreFromSnapshot(snapshot);
                            }
                        });
                    }, 500));

                }, 2500));

            }, 7000));
        };

        reader.onerror = () => {
            console.error("[JSRE] FileReader error");
            addAlert("Failed to read file", "error");
        };

        reader.readAsText(file);
        importFileInput.value = '';
    });
}

/**
 * Update date time from snapshot
 */
function updateDateTimeFromSnapshot(snapshot) {
    const el = document.getElementById('currentTime');
    if (!el) return;

    const snapshotDate = new Date(snapshot.snapshot.metadata.snapshotTime);
    const datePart = snapshotDate.toLocaleDateString('en-CA');
    const timePart = snapshotDate.toLocaleTimeString('en-US', {
        hour12: false
    });

    el.textContent = `${datePart}  | ${timePart}`;
}

/**
 * Generate and export based on format
 */
function generateAndExport(format) {
    try {
        const snapshot = generateSnapshot();

        switch (format) {
            case 'pdf':
                exportToPDF(snapshot);
                break;
            case 'json':
                exportToJSON(snapshot);
                break;
            case 'both':
                exportToPDF(snapshot);
                exportToJSON(snapshot);
                break;
        }
    } catch (error) {
        console.error('Export error:', error);
        addAlert(`Export failed: ${error.message}`, 'error');
    }
}

/**
 * Generate comprehensive snapshot
 */
function generateSnapshot() {
    const now = new Date();
    const snapshotTime = now.toISOString();
    const readableTime = now.toLocaleString();

    const dataFreshnessSeconds = Math.floor((Date.now() - state.lastUpdateTime) / 1000);

    let snapshotQuality = 'STALE';
    if (dataFreshnessSeconds <= 10) snapshotQuality = 'FRESH';
    else if (dataFreshnessSeconds <= 60) snapshotQuality = 'RECENT';

    const wsStatus = state.ws && state.ws.readyState === WebSocket.OPEN ? 'connected' : 'disconnected';
    const dataSourcePath = wsStatus === 'connected' ? 'Binance WebSocket (Primary)' : 'CoinGecko REST (Fallback)';

    const allSymbols = Object.keys(state.priceData);

    const derivedAnalytics = {};
    const currencyContext = {
        base: 'USDT',
        conversionRate: state.usdtToInrRate,
        prices: {}
    };

    allSymbols.forEach(symbol => {
        const data = state.priceData[symbol];
        if (!data) return;

        currencyContext.prices[symbol] = {
            usdt: data.price,
            inr: data.price * state.usdtToInrRate
        };

        const priceRange = data.high24h - data.low24h || 1;
        const pricePosition = (data.price - data.low24h) / priceRange;
        const avgPrice = (data.high24h + data.low24h) / 2 || data.price || 1;

        derivedAnalytics[symbol] = {
            orderFlowImbalance: (pricePosition - 0.5) * 100,
            bidAskImbalance: pricePosition * 100,
            volumeSlope: data.priceChangePercent24h * 2,
            volatility1h: ((priceRange / avgPrice) * 100) / 24,
            volatility4h: ((priceRange / avgPrice) * 100) / 6,
            volatility24h: (priceRange / avgPrice) * 100,
            volatilityRiskScore: Math.min(((data.high24h - data.low24h) / (data.price || 1)) * 100, 100),
            liquidityScore: Math.min((data.volume24h / 1000000) * 10, 100),
            whaleActivityScore: Math.min((data.volume24h / data.price) % 100, 100),
            priceDeviationScore: Math.min(Math.abs((data.price - data.low24h) / data.price) * 100, 100)
        };
    });

    const topMovers = Object.entries(state.priceData)
        .map(([symbol, data]) => ({ symbol, change: data.priceChangePercent24h }))
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 5);

    const displayPair = `${state.currentSymbol}/${state.currency}`;

    const snapshot = {
        version: "1.0",
        engine: "CryptoView-JSRE",
        snapshot: {
            applicationState: {
                currentSymbol: state.currentSymbol,
                currentName: state.currentName,
                currentIcon: state.currentIcon,
                currency: state.currency,
                theme: state.theme,
                displayPair: displayPair,
                dataSourcePath: dataSourcePath,
                themeMode: state.theme
            },
            priceData: JSON.parse(JSON.stringify(state.priceData)),
            currencyContext: currencyContext,
            derivedAnalytics: derivedAnalytics,
            uiContext: {
                selectedAsset: {
                    name: state.currentName,
                    symbol: state.currentSymbol,
                    icon: state.currentIcon,
                    displayPair: displayPair
                },
                timestamp: {
                    iso: snapshotTime,
                    readable: readableTime
                },
                theme: state.theme
            },
            metadata: {
                snapshotTime: snapshotTime,
                dataFreshnessSeconds: dataFreshnessSeconds,
                websocketStatus: wsStatus,
                totalDataPoints: state.dataPointsCount,
                snapshotQuality: snapshotQuality,
                applicationVersion: APP_VERSION,
                alerts: [...state.alerts].slice(0, 10)
            },
            topMovers: topMovers,
            anomalies: getCurrentAnomalies()
        }
    };

    return snapshot;
}

/**
 * Get current anomalies for snapshot
 */
function getCurrentAnomalies() {
    const anomalies = [];
    Object.entries(state.priceData).forEach(([symbol, data]) => {
        if (Math.abs(data.priceChangePercent24h) > 10) {
            anomalies.push({
                symbol: symbol,
                type: 'warning',
                message: `High volatility detected (${data.priceChangePercent24h.toFixed(2)}%)`,
                severity: 'high'
            });
        } else if (Math.abs(data.priceChangePercent24h) > 5) {
            anomalies.push({
                symbol: symbol,
                type: 'info',
                message: `Moderate price movement (${data.priceChangePercent24h.toFixed(2)}%)`,
                severity: 'medium'
            });
        }
    });
    return anomalies;
}

/**
 * Export to PDF
 */
function exportToPDF(snapshot) {
    try {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            addAlert("Export library not loaded.", "error");
            return;
        }

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("p", "mm", "a4");
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();

        function n(v, d = 2) {
            const num = Number(v);
            if (!isFinite(num)) return "N/A";
            return num.toFixed(d);
        }

        function usd(v) {
            const num = Number(v);
            if (!isFinite(num)) return "N/A";
            return "$" + n(num, 2);
        }

        function inr(v) {
            const num = Number(v);
            if (!isFinite(num)) return "N/A";
            return "INR " + n(num * snapshot.snapshot.currencyContext.conversionRate, 2);
        }

        function centered(text, x, y, size) {
            if (size) pdf.setFontSize(size);
            const w = pdf.getTextWidth(text);
            pdf.text(text, x - w / 2, y);
        }

        function drawHeader(pageTitle, generatedText) {
            pdf.setFillColor(245, 247, 255);
            pdf.setDrawColor(200, 200, 200);
            pdf.rect(10, 10, pageW - 20, 16, "F");
            pdf.setFontSize(16);
            pdf.setTextColor(20, 20, 20);
            pdf.text(pageTitle, 14, 20);
            pdf.setFontSize(9);
            pdf.setTextColor(60, 60, 60);
            pdf.text(generatedText, pageW - 65, 20);
        }

        function sectionHeader(title, y) {
            pdf.setFontSize(13);
            pdf.setTextColor(40, 40, 40);
            pdf.text(title, 12, y);
            pdf.setDrawColor(20, 120, 180);
            pdf.setLineWidth(1);
            pdf.line(12, y + 2, pageW - 12, y + 2);
        }

        function labelPair(label, value, y) {
            pdf.setFontSize(10.5);
            pdf.setTextColor(60, 60, 60);
            pdf.text(label + ":", 14, y);
            pdf.setTextColor(15, 15, 15);
            pdf.text(value, 70, y);
        }

        function twoColumn(label1, value1, label2, value2, y) {
            pdf.setFontSize(10.5);
            pdf.setTextColor(60, 60, 60);
            pdf.text(label1 + ":", 14, y);
            pdf.setTextColor(15, 15, 15);
            pdf.text(value1, 60, y);

            pdf.setTextColor(60, 60, 60);
            pdf.text(label2 + ":", pageW / 2 + 10, y);
            pdf.setTextColor(15, 15, 15);
            pdf.text(value2, pageW / 2 + 55, y);
        }

        const c = snapshot.snapshot.priceData[snapshot.snapshot.applicationState.currentSymbol];
        const now = new Date();
        const last = c.lastUpdate || now.getTime();
        const ageSec = Math.round((now.getTime() - last) / 1000);
        const wsStatus = snapshot.snapshot.metadata.websocketStatus;
        const quality = snapshot.snapshot.metadata.snapshotQuality;
        const srcPath = snapshot.snapshot.applicationState.dataSourcePath;

        const range = c.high24h - c.low24h || 1;
        const pos = (c.price - c.low24h) / range;
        const ofi = (pos - 0.5) * 100;
        const vSlope = c.priceChangePercent24h * 2;
        const ba = pos * 100;

        const avg = (c.high24h + c.low24h) / 2 || c.price || 1;
        const vol24 = (range / avg) * 100;
        const vol4 = vol24 / 6;
        const vol1 = vol24 / 24;

        const volScore = Math.min(vol24, 100);
        const liq = Math.min((c.volume24h / 1e6) * 10, 100);
        const whale = Math.min((c.volume24h / c.price) % 100, 100);
        const dev = Math.min(Math.abs((c.price - c.low24h) / c.price) * 100, 100);

        // PAGE 1
        drawHeader(
            "Crypto View - Real-Time Market Report",
            "Generated: " + new Date().toLocaleString()
        );

        let y = 32;

        sectionHeader("Snapshot Metadata", y);
        y += 10;
        twoColumn(
            "Asset",
            snapshot.snapshot.applicationState.currentName + " (" + snapshot.snapshot.applicationState.currentSymbol + ")",
            "Snapshot Quality",
            quality,
            y
        );
        y += 7;
        twoColumn(
            "Data Age",
            ageSec + " sec",
            "WebSocket",
            wsStatus === 'connected' ? 'Connected' : 'Disconnected',
            y
        );
        y += 7;
        twoColumn(
            "Base Pair",
            snapshot.snapshot.applicationState.currentSymbol + "/USDT",
            "Data Points",
            String(snapshot.snapshot.metadata.totalDataPoints || 0),
            y
        );
        y += 7;
        labelPair("Source Path", srcPath, y);
        y += 10;

        sectionHeader("Price Summary (Live)", y);
        y += 10;
        twoColumn(
            "Current Price (USDT)",
            usd(c.price),
            "Current Price (INR)",
            inr(c.price),
            y
        );
        y += 7;
        twoColumn(
            "24h High (USDT)",
            usd(c.high24h),
            "24h High (INR)",
            inr(c.high24h),
            y
        );
        y += 7;
        twoColumn(
            "24h Low (USDT)",
            usd(c.low24h),
            "24h Low (INR)",
            inr(c.low24h),
            y
        );
        y += 7;
        twoColumn(
            "Volume (24h, USDT)",
            usd(c.volume24h),
            "Volume (24h, INR)",
            inr(c.volume24h),
            y
        );
        y += 7;
        labelPair("Change (24h)", n(c.priceChangePercent24h) + "%", y);
        y += 12;

        sectionHeader("Market Microstructure", y);
        y += 10;
        twoColumn(
            "Order Flow Imbalance",
            n(ofi),
            "Bid/Ask Imbalance",
            n(ba),
            y
        );
        y += 7;
        labelPair("Volume Slope", n(vSlope), y);
        y += 12;

        sectionHeader("Volatility Metrics", y);
        y += 10;
        twoColumn(
            "24h Volatility",
            n(vol24) + "%",
            "4h Volatility",
            n(vol4) + "%",
            y
        );
        y += 7;
        labelPair("1h Volatility", n(vol1) + "%", y);
        y += 12;

        sectionHeader("Risk Indicators", y);
        y += 10;
        twoColumn(
            "Volatility Risk",
            n(volScore) + "%",
            "Whale Activity",
            n(whale) + "%",
            y
        );
        y += 7;
        twoColumn(
            "Volume Risk",
            n(liq) + "%",
            "Price Deviation",
            n(dev) + "%",
            y
        );
        y += 12;

        sectionHeader("Top Market Movers", y);
        y += 10;
        const movers = snapshot.snapshot.topMovers;
        pdf.setFontSize(10.5);
        pdf.setTextColor(60, 60, 60);
        movers.forEach((m, i) => {
            const row = (i + 1) + ". " + m.symbol + ": ";
            const val = (m.change >= 0 ? "+" : "") + n(m.change) + "%";
            pdf.text(row, 14, y);
            pdf.setTextColor(15, 15, 15);
            pdf.text(val, 70, y);
            pdf.setTextColor(60, 60, 60);
            y += 6;
        });

        // PAGE 2
        pdf.addPage();
        drawHeader(
            "Crypto View - Alerts & Verification",
            "Generated: " + new Date().toLocaleString()
        );
        y = 32;

        sectionHeader("Recent Alerts", y);
        y += 10;
        pdf.setFontSize(10.5);
        pdf.setTextColor(60, 60, 60);

        if (!snapshot.snapshot.metadata.alerts || snapshot.snapshot.metadata.alerts.length === 0) {
            pdf.text("- No alerts available", 14, y);
            y += 6;
        } else {
            snapshot.snapshot.metadata.alerts.forEach(a => {
                const line = "[" + a.time + "] " + String(a.message || "");
                pdf.text(line, 14, y);
                y += 6;
                if (y > pageH - 80) {
                    pdf.addPage();
                    drawHeader(
                        "Crypto View - Alerts & Verification (cont.)",
                        "Generated: " + new Date().toLocaleString()
                    );
                    y = 32;
                    sectionHeader("Recent Alerts (cont.)", y);
                    y += 10;
                }
            });
        }

        const panelHeight = 38;
        const bottomMargin = 22;
        const desiredTop = pageH - bottomMargin - panelHeight;
        const panelTop = Math.max(y + 4, desiredTop);

        pdf.setDrawColor(120, 120, 120);
        pdf.setFillColor(250, 250, 250);
        pdf.rect(10, panelTop, pageW - 20, panelHeight, "FD");

        pdf.setFontSize(11);
        pdf.setTextColor(20, 20, 20);
        pdf.text("DATA VERIFICATION PANEL", 14, panelTop + 7);

        pdf.setFontSize(9);
        pdf.setTextColor(40, 40, 40);
        pdf.text(
            "Snapshot generated from live in-memory data at export moment.",
            14,
            panelTop + 13
        );
        pdf.text(
            "Quality: " +
            quality +
            "    WebSocket: " +
            (wsStatus === 'connected' ? 'Connected' : 'Disconnected') +
            "    Age: " +
            ageSec +
            " sec",
            14,
            panelTop + 19
        );
        pdf.text(
            "Source Path: " + srcPath,
            14,
            panelTop + 25
        );
        pdf.text(
            "For analytics only. Not financial advice.",
            14,
            panelTop + 31
        );

        const cx = pageW - 32;
        const cy = panelTop + panelHeight / 2;
        pdf.setDrawColor(160, 0, 0);
        pdf.setLineWidth(1.2);
        pdf.circle(cx, cy, 14);
        pdf.setLineWidth(0.7);
        pdf.circle(cx, cy, 10);
        pdf.setTextColor(160, 0, 0);

        centered("VERIFIED", cx, cy + 2, 7);

        const githubUrl = "https://github.com/Ajith-data-analyst/crypto_view/blob/main/LICENSE.txt";
        const liveUrl = "https://ajith-data-analyst.github.io/crypto_view/";
        const copyrightText = "© 2025 Crypto View | All rights reserved | Live Crypto Price Analytics";

        const totalPages = pdf.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            pdf.setPage(p);
            pdf.setFontSize(8);

            pdf.setTextColor(40, 70, 160);
            pdf.textWithLink("CRYPTO VIEW", 12, pageH - 8, { url: liveUrl });

            pdf.setTextColor(40, 40, 40);
            const cw = pdf.getTextWidth(copyrightText);
            const cxRight = pageW - 12 - cw;
            pdf.textWithLink(copyrightText, cxRight, pageH - 8, {
                url: githubUrl
            });
        }

        pdf.save(`crypto-view-${snapshot.snapshot.applicationState.currentSymbol}-${Date.now()}.pdf`);
        addAlert("Exported PDF successfully", "success");
    } catch (err) {
        console.error(err);
        addAlert("PDF export failed", "error");
    }
}

/**
 * Export to JSON
 */
function exportToJSON(snapshot) {
    try {
        const jsonString = JSON.stringify(snapshot, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `crypto-view-snapshot-${snapshot.snapshot.applicationState.currentSymbol}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        addAlert("Exported JSON snapshot successfully", "success");
    } catch (error) {
        console.error('JSON export error:', error);
        addAlert("JSON export failed", "error");
    }
}

// ========================================
// JSRE - JSON STATE RESTORE ENGINE
// ========================================

/**
 * Restore application from snapshot
 */
function restoreFromSnapshot(snapshot) {
    try {
        console.log("[JSRE] Starting restore process...");
        if (!validateSnapshot(snapshot)) {
            addAlert("Invalid snapshot format", "error");
            return;
        }

        console.log("[JSRE] Snapshot validated, entering restore mode");
        enterRestoreMode(snapshot);
        applySnapshot(snapshot);
        updateUIFromSnapshot(snapshot);

        console.log("[JSRE] Restore completed successfully");
        addAlert(`Successfully restored snapshot from ${new Date(snapshot.snapshot.metadata.snapshotTime).toLocaleString()}`, "success");
    } catch (error) {
        console.error('[JSRE] Restore error:', error);
        addAlert("Failed to restore snapshot", "error");
    }
}

/**
 * Validate snapshot structure
 */
function validateSnapshot(snapshot) {
    console.log("[JSRE] Validating snapshot structure...");

    if (!snapshot) {
        console.error("[JSRE] Snapshot is null or undefined");
        return false;
    }

    if (!snapshot.version) {
        console.error("[JSRE] Missing version field");
        return false;
    }

    if (!snapshot.engine) {
        console.error("[JSRE] Missing engine field");
        return false;
    }

    if (snapshot.engine !== "CryptoView-JSRE") {
        console.error(`[JSRE] Invalid engine: ${snapshot.engine}, expected CryptoView-JSRE`);
        return false;
    }

    if (!snapshot.snapshot) {
        console.error("[JSRE] Missing snapshot field");
        return false;
    }

    if (!snapshot.snapshot.applicationState) {
        console.error("[JSRE] Missing applicationState");
        return false;
    }

    if (!snapshot.snapshot.priceData) {
        console.error("[JSRE] Missing priceData");
        return false;
    }

    if (!snapshot.snapshot.metadata) {
        console.error("[JSRE] Missing metadata");
        return false;
    }

    console.log("[JSRE] Snapshot validation passed");
    return true;
}

/**
 * Enter restore mode
 */
/**
 * Enter restore mode
 */
function enterRestoreMode(snapshot) {
    console.log("[JSRE] Entering restore mode");
    state.isRestoreMode = true;
    state.restoreSnapshot = snapshot;

    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        console.log("[JSRE] Closing WebSocket connection");
        state.ws.close();
    }

    console.log("[JSRE] Clearing existing timers");
    // Clear time update interval
    if (window.timeUpdateInterval) {
        clearInterval(window.timeUpdateInterval);
        window.timeUpdateInterval = null;
    }

    // Update time display from snapshot (ONCE)
    updateDateTimeFromSnapshot(snapshot);

    // Show restore mode UI elements
    const restoreFab = document.getElementById('restoreFabBtn');
    if (restoreFab) {
        restoreFab.style.display = 'flex';
        restoreFab.onclick = exitRestoreMode;
    }

    updateConnectionStatus('restored');
    console.log("[JSRE] Restore mode activated");
}

/**
 * Exit restore mode
 */
/**
 * Exit restore mode
 */
function exitRestoreMode() {
    console.log("[JSRE] Exiting restore mode");
    state.isRestoreMode = false;
    state.restoreSnapshot = null;
    state.restoredFromLink = false;

    // Clear the URL hash
    window.location.hash = '';

    const restoreFab = document.getElementById('restoreFabBtn');
    if (restoreFab) {
        restoreFab.style.display = 'none';
    }

    // Hide exit restore button in share modal
    const exitRestoreContainer = shareState.modal.querySelector('#share-exit-restore-container');
    if (exitRestoreContainer) {
        exitRestoreContainer.style.display = 'none';
    }

    // Reset time updates to live mode
    setupTimeUpdates();

    console.log("[JSRE] Restarting live data...");
    // Reconnect to live data
    updateConnectionStatus('connecting');
    connectWebSocket();
    fetchAllCryptoData();
    addAlert("Switched back to live mode", "success");
}
/**
 * Apply snapshot data to state
 */
function applySnapshot(snapshot) {
    console.log("[JSRE] Applying snapshot data to state");
    state.currentSymbol = snapshot.snapshot.applicationState.currentSymbol;
    state.currentName = snapshot.snapshot.applicationState.currentName;
    state.currentIcon = snapshot.snapshot.applicationState.currentIcon;
    state.currency = snapshot.snapshot.applicationState.currency;
    state.theme = snapshot.snapshot.applicationState.theme;

    state.priceData = JSON.parse(JSON.stringify(snapshot.snapshot.priceData));

    if (snapshot.snapshot.currencyContext && snapshot.snapshot.currencyContext.conversionRate) {
        state.usdtToInrRate = snapshot.snapshot.currencyContext.conversionRate;
    }

    if (snapshot.snapshot.metadata.alerts) {
        state.alerts = [...snapshot.snapshot.metadata.alerts];
    }

    state.dataPointsCount = snapshot.snapshot.metadata.totalDataPoints || 0;
    state.lastUpdateTime = new Date(snapshot.snapshot.metadata.snapshotTime).getTime();

    console.log(`[JSRE] Applied snapshot for ${state.currentSymbol}`);
}

/**
 * Update UI from snapshot
 */
function updateUIFromSnapshot(snapshot) {
    console.log("[JSRE] Updating UI from snapshot");
    if (snapshot.snapshot.applicationState.theme) {
        state.theme = snapshot.snapshot.applicationState.theme;
        document.documentElement.setAttribute('data-theme', state.theme);
        document.documentElement.setAttribute('data-color-scheme', state.theme);

        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            themeBtn.querySelector('.fab-icon').textContent = state.theme === 'light' ? '◐' : '◐';
        }
    }

    const currencyBtn = document.getElementById('currencyToggle');
    if (currencyBtn) {
        const icon = currencyBtn.querySelector('.fab-icon');
        if (icon) {
            icon.textContent = state.currency === 'USDT' ? '₹' : '$₮';
        }
    }

    const buttons = document.querySelectorAll('.crypto-btn');
    buttons.forEach(btn => {
        const symbol = btn.dataset.symbol;
        const isCurrent = symbol === state.currentSymbol;

        btn.classList.remove('active', 'hidden');
        if (isCurrent) {
            btn.classList.add('active', 'hidden');
        }
    });

    updatePriceDisplayFromSnapshot(snapshot);
    updateMicrostructureFromSnapshot(snapshot);
    updateVolatilityFromSnapshot(snapshot);
    updateRiskIndicatorsFromSnapshot(snapshot);

    if (snapshot.snapshot.topMovers) {
        updateTopMoversFromSnapshot(snapshot);
    }

    if (snapshot.snapshot.anomalies) {
        updateAnomaliesFromSnapshot(snapshot);
    }

    updateAlertsFromSnapshot(snapshot);
    updateSystemHealthFromSnapshot(snapshot);

    console.log("[JSRE] UI update complete");
}

/**
 * Update price display from snapshot
 */
function updatePriceDisplayFromSnapshot(snapshot) {
    const data = snapshot.snapshot.priceData[state.currentSymbol];
    if (!data) {
        console.warn(`[JSRE] No price data for ${state.currentSymbol} in snapshot`);
        return;
    }

    const priceIconEl = document.getElementById('priceIcon');
    const nameEl = document.getElementById('priceCryptoName');
    const symbolEl = document.getElementById('priceCryptoSymbol');
    const currentPriceEl = document.getElementById('currentPrice');
    const priceArrowEl = document.getElementById('priceArrow');
    const priceChangeEl = document.getElementById('priceChange');

    if (priceIconEl) priceIconEl.textContent = state.currentIcon;
    if (nameEl) nameEl.textContent = state.currentName;

    if (symbolEl) {
        symbolEl.textContent = `${state.currentSymbol}/${state.currency}`;
    }

    if (!currentPriceEl || !priceArrowEl || !priceChangeEl) return;

    currentPriceEl.classList.remove('price-pulse', 'positive', 'negative');
    priceArrowEl.classList.remove('neutral', 'positive', 'negative');

    priceArrowEl.classList.add('neutral');
    priceArrowEl.textContent = '→';

    const changePercent = data.priceChangePercent24h;
    if (changePercent > 0) {
        currentPriceEl.classList.add('positive');
    } else if (changePercent < 0) {
        currentPriceEl.classList.add('negative');
    }

    currentPriceEl.textContent = formatPrice(data.price);

    const changeAmount = data.priceChange24h;
    priceChangeEl.className = 'price-change ' + (changePercent >= 0 ? 'positive' : 'negative');
    const changeValueEl = priceChangeEl.querySelector('.change-value');
    const changeAmountEl = priceChangeEl.querySelector('.change-amount');
    if (changeValueEl) changeValueEl.textContent = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
    if (changeAmountEl) changeAmountEl.textContent = `${changePercent >= 0 ? '+' : ''}${formatPrice(changeAmount)}`;

    const highEl = document.getElementById('high24h');
    const lowEl = document.getElementById('low24h');
    const volEl = document.getElementById('volume24h');
    if (highEl) highEl.textContent = formatPrice(data.high24h);
    if (lowEl) lowEl.textContent = formatPrice(data.low24h);
    if (volEl) volEl.textContent = formatVolume(data.volume24h);

    const footerPriceEl = document.getElementById("footerLivePrice");
    if (footerPriceEl) {
        footerPriceEl.textContent = formatPrice(data.price);
        footerPriceEl.classList.remove("footer-price-green", "footer-price-red");

        if (changePercent > 0) {
            footerPriceEl.classList.add("footer-price-green");
        } else if (changePercent < 0) {
            footerPriceEl.classList.add("footer-price-red");
        }
    }
}

/**
 * Update microstructure from snapshot
 */
function updateMicrostructureFromSnapshot(snapshot) {
    const analytics = snapshot.snapshot.derivedAnalytics[state.currentSymbol];
    if (!analytics) {
        console.warn(`[JSRE] No derived analytics for ${state.currentSymbol}`);
        return;
    }

    const ofiValueEl = document.getElementById('ofiValue');
    const ofiBarEl = document.getElementById('ofiBar');
    const volumeSlopeEl = document.getElementById('volumeSlope');
    const volumeSlopeBarEl = document.getElementById('volumeSlopeBar');
    const bidAskEl = document.getElementById('bidAskImbalance');
    const bidAskBarEl = document.getElementById('bidAskBar');

    if (ofiValueEl) ofiValueEl.textContent = analytics.orderFlowImbalance.toFixed(2);
    if (ofiBarEl) {
        ofiBarEl.style.width = `${Math.min(Math.abs(analytics.orderFlowImbalance), 100)}%`;
        ofiBarEl.style.background = analytics.orderFlowImbalance >= 0 ? 'var(--color-success)' : 'var(--color-error)';
    }

    if (volumeSlopeEl) volumeSlopeEl.textContent = analytics.volumeSlope.toFixed(2);
    if (volumeSlopeBarEl) {
        volumeSlopeBarEl.style.width = `${Math.min(Math.abs(analytics.volumeSlope), 100)}%`;
        volumeSlopeBarEl.style.background = analytics.volumeSlope >= 0 ? 'var(--color-success)' : 'var(--color-error)';
    }

    if (bidAskEl) bidAskEl.textContent = analytics.bidAskImbalance.toFixed(2);
    if (bidAskBarEl) {
        bidAskBarEl.style.width = `${Math.max(0, Math.min(analytics.bidAskImbalance, 100))}%`;
    }
}

/**
 * Update volatility from snapshot
 */
function updateVolatilityFromSnapshot(snapshot) {
    const analytics = snapshot.snapshot.derivedAnalytics[state.currentSymbol];
    if (!analytics) return;

    const vol1hEl = document.getElementById('vol1h');
    const vol1hGaugeEl = document.getElementById('vol1hGauge');
    const vol4hEl = document.getElementById('vol4h');
    const vol4hGaugeEl = document.getElementById('vol4hGauge');
    const vol24hEl = document.getElementById('vol24h');
    const vol24hGaugeEl = document.getElementById('vol24hGauge');

    if (vol1hEl) vol1hEl.textContent = `${analytics.volatility1h.toFixed(2)}%`;
    if (vol1hGaugeEl) vol1hGaugeEl.style.width = `${Math.min(analytics.volatility1h * 10, 100)}%`;

    if (vol4hEl) vol4hEl.textContent = `${analytics.volatility4h.toFixed(2)}%`;
    if (vol4hGaugeEl) vol4hGaugeEl.style.width = `${Math.min(analytics.volatility4h * 10, 100)}%`;

    if (vol24hEl) vol24hEl.textContent = `${analytics.volatility24h.toFixed(2)}%`;
    if (vol24hGaugeEl) vol24hGaugeEl.style.width = `${Math.min(analytics.volatility24h * 10, 100)}%`;
}

/**
 * Update risk indicators from snapshot
 */
function updateRiskIndicatorsFromSnapshot(snapshot) {
    const analytics = snapshot.snapshot.derivedAnalytics[state.currentSymbol];
    if (!analytics) return;

    updateRiskBars({
        volatility: analytics.volatilityRiskScore,
        whale: analytics.whaleActivityScore,
        volume: analytics.liquidityScore,
        deviation: analytics.priceDeviationScore
    });
}

/**
 * Update top movers from snapshot
 */
function updateTopMoversFromSnapshot(snapshot) {
    const container = document.getElementById('top-movers');
    if (!container || !snapshot.snapshot.topMovers) return;

    container.innerHTML = snapshot.snapshot.topMovers.map(mover => `
        <div class="mover-item">
            <span class="mover-symbol">${mover.symbol}</span>
            <span class="mover-change ${mover.change >= 0 ? 'positive' : 'negative'}">
                ${mover.change >= 0 ? '+' : ''}${mover.change.toFixed(2)}%
            </span>
        </div>
    `).join('');
}

/**
 * Update anomalies from snapshot
 */
function updateAnomaliesFromSnapshot(snapshot) {
    const container = document.getElementById('anomalyContainer');
    if (!container) return;

    const currentAnomalies = snapshot.snapshot.anomalies.filter(a => a.symbol === state.currentSymbol);

    if (currentAnomalies.length > 0) {
        const anomaly = currentAnomalies[0];
        container.innerHTML = `
            <div class="anomaly-item status--${anomaly.type}">
                <span class="anomaly-icon">${anomaly.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                <span class="anomaly-text">${anomaly.message}</span>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="anomaly-item status--info">
                <span class="anomaly-icon">ℹ️</span>
                <span class="anomaly-text">No anomalies detected in snapshot</span>
            </div>
        `;
    }
}

/**
 * Update alerts from snapshot
 */
function updateAlertsFromSnapshot(snapshot) {
    const container = document.getElementById('alertsContainer');
    if (!container || !snapshot.snapshot.metadata.alerts) return;

    container.innerHTML = snapshot.snapshot.metadata.alerts.map(alert => `
        <div class="alert-item status--${alert.type}">
            <span class="alert-time">${alert.time}</span>
            <span class="alert-message">${alert.message}</span>
        </div>
    `).join('');
}

/**
 * Update system health from snapshot
 */
function updateSystemHealthFromSnapshot(snapshot) {
    const now = new Date();
    const snapshotTime = new Date(snapshot.snapshot.metadata.snapshotTime);
    const freshness = Math.floor((now - snapshotTime) / 1000);

    const freshnessEl = document.getElementById('dataFreshness');
    if (freshnessEl) freshnessEl.textContent = `${freshness}s (snapshot)`;

    const latencyEl = document.getElementById('latency');
    if (latencyEl) latencyEl.textContent = '0ms';

    const dataPointsEl = document.getElementById('dataPoints');
    if (dataPointsEl) dataPointsEl.textContent = snapshot.snapshot.metadata.totalDataPoints;

    const footerConnectionEl = document.getElementById('footerConnection');
    if (footerConnectionEl) footerConnectionEl.textContent = 'JSRE';
}

/**
 * Load a demo snapshot (for testing)
 */
function loadDemoSnapshot() {
    console.log("[JSRE] Loading demo snapshot");
    const demoSnapshot = {
        version: "1.0",
        engine: "CryptoView-JSRE",
        snapshot: {
            applicationState: {
                currentSymbol: "BTC",
                currentName: "Bitcoin",
                currentIcon: "₿",
                currency: "USDT",
                theme: "light",
                displayPair: "BTC/USDT",
                dataSourcePath: "Binance WebSocket (Primary)",
                themeMode: "light"
            },
            priceData: {
                BTC: {
                    price: 45000.50,
                    high24h: 45500.75,
                    low24h: 44500.25,
                    volume24h: 2500000000,
                    priceChange24h: 500.50,
                    priceChangePercent24h: 1.12,
                    lastUpdate: Date.now()
                },
                ETH: {
                    price: 3000.25,
                    high24h: 3050.50,
                    low24h: 2950.75,
                    volume24h: 1500000000,
                    priceChange24h: 25.50,
                    priceChangePercent24h: 0.85,
                    lastUpdate: Date.now()
                }
            },
            currencyContext: {
                base: "USDT",
                conversionRate: 83.5,
                prices: {
                    BTC: { usdt: 45000.50, inr: 3757541.75 },
                    ETH: { usdt: 3000.25, inr: 250520.88 }
                }
            },
            derivedAnalytics: {
                BTC: {
                    orderFlowImbalance: 15.5,
                    bidAskImbalance: 65.2,
                    volumeSlope: 2.24,
                    volatility1h: 0.45,
                    volatility4h: 1.35,
                    volatility24h: 2.22,
                    volatilityRiskScore: 22.2,
                    liquidityScore: 85.5,
                    whaleActivityScore: 45.3,
                    priceDeviationScore: 12.5
                }
            },
            uiContext: {
                selectedAsset: {
                    name: "Bitcoin",
                    symbol: "BTC",
                    icon: "₿",
                    displayPair: "BTC/USDT"
                },
                timestamp: {
                    iso: new Date().toISOString(),
                    readable: new Date().toLocaleString()
                },
                theme: "light"
            },
            metadata: {
                snapshotTime: new Date().toISOString(),
                dataFreshnessSeconds: 5,
                websocketStatus: "connected",
                totalDataPoints: 150,
                snapshotQuality: "FRESH",
                applicationVersion: "1.0",
                alerts: [
                    { message: "Demo snapshot loaded", type: "info", time: "14:30" },
                    { message: "System initialized successfully", type: "success", time: "14:25" }
                ]
            },
            topMovers: [
                { symbol: "BTC", change: 1.12 },
                { symbol: "ETH", change: 0.85 }
            ],
            anomalies: [
                { symbol: "BTC", type: "info", message: "Normal market conditions", severity: "low" }
            ]
        }
    };

    setTimeout(() => {
        restoreFromSnapshot(demoSnapshot);
        addAlert("Demo snapshot loaded successfully", "info");
    }, 1000);
}

/**
 * Fetch USDT to INR conversion rate
 */
async function fetchUsdtToInrRate() {
    if (state.isRestoreMode) return;

    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        state.usdtToInrRate = data.rates.INR || 83.5;
    } catch (error) {
        console.error('Error fetching USD to INR rate:', error);
        state.usdtToInrRate = 83.5;
    }
}

// ========================================
// WEBSOCKET & DATA FUNCTIONS
// ========================================

/**
 * Connect to Binance WebSocket
 */
function connectWebSocket() {
    if (state.isRestoreMode) return;

    try {
        const streams = Object.values(cryptoMapping).map(s => `${s}@ticker`).join('/');
        const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;

        state.ws = new WebSocket(wsUrl);

        state.ws.onopen = () => {
            updateConnectionStatus('connected');
            addAlert('WebSocket connected', 'success');
        };

        state.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.data) {
                    handleTickerUpdate(data.data);
                }
            } catch (e) {
                console.error('Invalid WS message', e);
            }
        };

        state.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            updateConnectionStatus('disconnected');
            addAlert('WebSocket error - using fallback data', 'warning');
        };

        state.ws.onclose = () => {
            updateConnectionStatus('disconnected');
            addAlert('WebSocket disconnected - reconnecting...', 'warning');
            setTimeout(connectWebSocket, 5000);
        };
    } catch (err) {
        console.error('connectWebSocket error', err);
    }
}

/**
 * Handle ticker updates from WebSocket
 */
function handleTickerUpdate(data) {
    const symbol = data.s.replace('USDT', '');

    state.priceData[symbol] = {
        price: parseFloat(data.c),
        high24h: parseFloat(data.h),
        low24h: parseFloat(data.l),
        volume24h: parseFloat(data.v),
        priceChange24h: parseFloat(data.p),
        priceChangePercent24h: parseFloat(data.P),
        lastUpdate: Date.now()
    };

    state.dataPointsCount++;
    state.lastUpdateTime = Date.now();

    if (symbol === state.currentSymbol) {
        const previous = state.lastLivePrice;
        state.lastLivePrice = state.priceData[symbol].price;
        updatePriceDisplay(previous);
    }

    updateTopMovers();
    detectAnomalies(symbol);
}

/**
 * Fetch data from CoinGecko as fallback
 */
async function fetchAllCryptoData() {
    // Do not fetch during restore
    if (state.isRestoreMode) return;

    // Do not fetch if WebSocket is active
    if (state.ws && state.ws.readyState === WebSocket.OPEN) return;

    try {
        const PROXY_URL =
            'https://coingecko-proxy.ajithramesh2020.workers.dev';

        const ids =
            'bitcoin,ethereum,cardano,polkadot,solana,binancecoin,ripple,dogecoin,matic-network,litecoin';

        const params = new URLSearchParams({
            ids,
            vs_currencies: 'usd',
            include_24h_vol: 'true',
            include_24h_change: 'true',
            include_24h_high: 'true',
            include_24h_low: 'true'
        });

        const response = await fetch(`${PROXY_URL}?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`Proxy error ${response.status}`);
        }

        const data = await response.json();

        const mapping = {
            bitcoin: 'BTC',
            ethereum: 'ETH',
            cardano: 'ADA',
            polkadot: 'DOT',
            solana: 'SOL',
            binancecoin: 'BNB',
            ripple: 'XRP',
            dogecoin: 'DOGE',
            'matic-network': 'MATIC',
            litecoin: 'LTC'
        };

        Object.keys(data).forEach(id => {
            const symbol = mapping[id];
            const raw = data[id];

            if (!symbol || !raw || raw.usd === undefined) return;

            const price = raw.usd;

            const high24h =
                raw.usd_24h_high !== undefined && raw.usd_24h_high !== null ?
                raw.usd_24h_high :
                price * 1.05;

            const low24h =
                raw.usd_24h_low !== undefined && raw.usd_24h_low !== null ?
                raw.usd_24h_low :
                price * 0.95;

            const volume24h =
                raw.usd_24h_vol !== undefined && raw.usd_24h_vol !== null ?
                raw.usd_24h_vol :
                0;

            const changePercent =
                raw.usd_24h_change !== undefined && raw.usd_24h_change !== null ?
                raw.usd_24h_change :
                0;

            state.priceData[symbol] = {
                price,
                high24h,
                low24h,
                volume24h,
                priceChange24h: price * (changePercent / 100),
                priceChangePercent24h: changePercent,
                lastUpdate: Date.now(),
                source: 'coingecko-proxy'
            };
        });

        updatePriceDisplay(null);
        updateTopMovers();

    } catch (error) {
        console.error('[REST FALLBACK] CoinGecko proxy failed:', error);
    }
}


/**
 * Update price display
 */
function updatePriceDisplay(previousPrice) {
    if (state.isRestoreMode && state.restoreSnapshot) {
        updatePriceDisplayFromSnapshot(state.restoreSnapshot);
        return;
    }

    const data = state.priceData[state.currentSymbol];
    if (!data) return;

    const priceIconEl = document.getElementById('priceIcon');
    const nameEl = document.getElementById('priceCryptoName');
    const symbolEl = document.getElementById('priceCryptoSymbol');
    const currentPriceEl = document.getElementById('currentPrice');
    const priceArrowEl = document.getElementById('priceArrow');
    const priceChangeEl = document.getElementById('priceChange');

    if (priceIconEl) priceIconEl.textContent = state.currentIcon;
    if (nameEl) nameEl.textContent = state.currentName;

    if (symbolEl) {
        symbolEl.textContent = `${state.currentSymbol}/${state.currency}`;
    }

    if (!currentPriceEl || !priceArrowEl || !priceChangeEl) return;

    currentPriceEl.classList.remove('price-pulse');
    priceArrowEl.classList.remove('neutral', 'positive', 'negative');
    currentPriceEl.classList.remove('positive', 'negative');

    currentPriceEl.classList.add('price-pulse');

    const rawPrice = data.price;
    if (previousPrice !== undefined && previousPrice !== null) {
        if (rawPrice > previousPrice) {
            currentPriceEl.classList.add('positive');
            priceArrowEl.classList.add('positive');
            priceArrowEl.textContent = '↗';
        } else if (rawPrice < previousPrice) {
            currentPriceEl.classList.add('negative');
            priceArrowEl.classList.add('negative');
            priceArrowEl.textContent = '↘';
        } else {
            priceArrowEl.classList.add('neutral');
            priceArrowEl.textContent = '→';
        }
    } else {
        priceArrowEl.classList.add('neutral');
        priceArrowEl.textContent = '→';
        if (data.priceChangePercent24h > 0) {
            currentPriceEl.classList.add('positive');
        } else if (data.priceChangePercent24h < 0) {
            currentPriceEl.classList.add('negative');
        }
    }

    currentPriceEl.textContent = formatPrice(rawPrice);

    const changePercent = data.priceChangePercent24h;
    const changeAmount = data.priceChange24h;
    priceChangeEl.className = 'price-change ' + (changePercent >= 0 ? 'positive' : 'negative');
    const changeValueEl = priceChangeEl.querySelector('.change-value');
    const changeAmountEl = priceChangeEl.querySelector('.change-amount');
    if (changeValueEl) changeValueEl.textContent = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
    if (changeAmountEl) changeAmountEl.textContent = `${changePercent >= 0 ? '+' : ''}${formatPrice(changeAmount)}`;

    const highEl = document.getElementById('high24h');
    const lowEl = document.getElementById('low24h');
    const volEl = document.getElementById('volume24h');
    if (highEl) highEl.textContent = formatPrice(data.high24h);
    if (lowEl) lowEl.textContent = formatPrice(data.low24h);
    if (volEl) volEl.textContent = formatVolume(data.volume24h);

    updateMarketMicrostructure(data);
    updateVolatilityMetrics(data);
    updateRiskIndicators(data);

    const footerPriceEl = document.getElementById("footerLivePrice");
    if (footerPriceEl) {
        footerPriceEl.textContent = formatPrice(data.price);

        footerPriceEl.classList.remove("footer-price-green", "footer-price-red");
        if (previousPrice !== null && previousPrice !== undefined) {
            if (data.price > previousPrice) {
                footerPriceEl.classList.add("footer-price-green");
            } else if (data.price < previousPrice) {
                footerPriceEl.classList.add("footer-price-red");
            }
        }
    }
}

/**
 * Update market microstructure metrics
 */
function updateMarketMicrostructure(data) {
    if (!data) return;

    const priceRange = data.high24h - data.low24h || 1;
    const pricePosition = (data.price - data.low24h) / priceRange;

    const ofi = (pricePosition - 0.5) * 100;
    const ofiValueEl = document.getElementById('ofiValue');
    const ofiBarEl = document.getElementById('ofiBar');
    if (ofiValueEl) ofiValueEl.textContent = ofi.toFixed(2);
    if (ofiBarEl) {
        ofiBarEl.style.width = `${Math.abs(ofi)}%`;
        ofiBarEl.style.background = ofi >= 0 ? 'var(--color-success)' : 'var(--color-error)';
    }

    const volumeSlope = data.priceChangePercent24h * 2;
    const volumeSlopeEl = document.getElementById('volumeSlope');
    const volumeSlopeBarEl = document.getElementById('volumeSlopeBar');
    if (volumeSlopeEl) volumeSlopeEl.textContent = volumeSlope.toFixed(2);
    if (volumeSlopeBarEl) {
        volumeSlopeBarEl.style.width = `${Math.min(Math.abs(volumeSlope), 100)}%`;
        volumeSlopeBarEl.style.background = volumeSlope >= 0 ? 'var(--color-success)' : 'var(--color-error)';
    }

    const bidAsk = pricePosition * 100;
    const bidAskEl = document.getElementById('bidAskImbalance');
    const bidAskBarEl = document.getElementById('bidAskBar');
    if (bidAskEl) bidAskEl.textContent = bidAsk.toFixed(2);
    if (bidAskBarEl) bidAskBarEl.style.width = `${Math.max(0, Math.min(bidAsk, 100))}%`;
}

/**
 * Update volatility metrics
 */
function updateVolatilityMetrics(data) {
    if (!data) return;

    const priceRange = data.high24h - data.low24h || 1;
    const avgPrice = (data.high24h + data.low24h) / 2 || data.price || 1;
    const volatility24h = (priceRange / avgPrice) * 100;

    const vol1h = volatility24h / 24;
    const vol4h = volatility24h / 6;

    const vol1hEl = document.getElementById('vol1h');
    const vol1hGaugeEl = document.getElementById('vol1hGauge');
    const vol4hEl = document.getElementById('vol4h');
    const vol4hGaugeEl = document.getElementById('vol4hGauge');
    const vol24hEl = document.getElementById('vol24h');
    const vol24hGaugeEl = document.getElementById('vol24hGauge');

    if (vol1hEl) vol1hEl.textContent = `${vol1h.toFixed(2)}%`;
    if (vol1hGaugeEl) vol1hGaugeEl.style.width = `${Math.min(vol1h * 10, 100)}%`;

    if (vol4hEl) vol4hEl.textContent = `${vol4h.toFixed(2)}%`;
    if (vol4hGaugeEl) vol4hGaugeEl.style.width = `${Math.min(vol4h * 10, 100)}%`;

    if (vol24hEl) vol24hEl.textContent = `${volatility24h.toFixed(2)}%`;
    if (vol24hGaugeEl) vol24hGaugeEl.style.width = `${Math.min(volatility24h * 10, 100)}%`;
}

/**
 * Update risk bars
 */
function updateRiskBars(values) {
    const barVolatility = document.getElementById("bar-volatility");
    const barWhale = document.getElementById("bar-whale");
    const barVolume = document.getElementById("bar-volume");
    const barDeviation = document.getElementById("bar-deviation");

    if (barVolatility) barVolatility.style.width = values.volatility + "%";
    if (barWhale) barWhale.style.width = values.whale + "%";
    if (barVolume) barVolume.style.width = values.volume + "%";
    if (barDeviation) barDeviation.style.width = values.deviation + "%";
}

/**
 * Update risk indicators
 */
function updateRiskIndicators(data) {
    if (!data) return;

    const volatility = ((data.high24h - data.low24h) / (data.price || 1)) * 100;
    const volatilityScore = Math.min(volatility, 100);

    const liquidityScore = Math.min((data.volume24h / 1000000) * 10, 100);

    const whaleActivity = Math.min((data.volume24h / data.price) % 100, 100);
    const deviation = Math.min(Math.abs((data.price - data.low24h) / data.price) * 100, 100);

    updateRiskBars({
        volatility: volatilityScore,
        whale: whaleActivity,
        volume: liquidityScore,
        deviation: deviation
    });
}

/**
 * Setup price visibility watcher
 */
function setupPriceVisibilityWatcher() {
    const priceCard = document.querySelector('.price-card');
    const footerBox = document.getElementById('footerLivePriceBox');

    if (!priceCard || !footerBox) return;

    const showFooter = (show) => {
        footerBox.style.display = show ? 'flex' : 'none';
    };

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            const entry = entries[0];
            if (!entry) return;
            const ratio = entry.intersectionRatio;
            showFooter(ratio < 0.66);
        }, {
            threshold: [0, 0.33, 0.66, 1]
        });

        observer.observe(priceCard);
        return;
    }

    const computeAndApply = () => {
        const rect = priceCard.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

        if (rect.bottom <= 0 || rect.top >= viewportHeight) {
            showFooter(true);
            return;
        }

        const visibleTop = Math.max(rect.top, 0);
        const visibleBottom = Math.min(rect.bottom, viewportHeight);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const totalHeight = rect.height || 1;
        const visibleRatio = visibleHeight / totalHeight;

        showFooter(visibleRatio < 0.66);
    };

    computeAndApply();
    let t = null;
    window.addEventListener('scroll', () => {
        if (t) clearTimeout(t);
        t = setTimeout(computeAndApply, 60);
    }, { passive: true });
    window.addEventListener('resize', () => {
        if (t) clearTimeout(t);
        t = setTimeout(computeAndApply, 60);
    });
}

/**
 * Detect market anomalies
 */
function detectAnomalies(symbol) {
    const data = state.priceData[symbol];
    if (!data) return;

    const container = document.getElementById('anomalyContainer');
    if (!container) return;

    if (Math.abs(data.priceChangePercent24h) > 10) {
        const anomaly = document.createElement('div');
        anomaly.className = 'anomaly-item status--warning';
        anomaly.innerHTML = `
            <span class="anomaly-icon">⚠️</span>
            <span class="anomaly-text">${symbol}: High volatility detected (${data.priceChangePercent24h.toFixed(2)}%)</span>
        `;
        container.innerHTML = '';
        container.appendChild(anomaly);

        if (symbol === state.currentSymbol) {
            addAlert(`High volatility detected for ${symbol}`, 'warning');
        }
    } else if (Math.abs(data.priceChangePercent24h) > 5) {
        const anomaly = document.createElement('div');
        anomaly.className = 'anomaly-item status--info';
        anomaly.innerHTML = `
            <span class="anomaly-icon">ℹ️</span>
            <span class="anomaly-text">${symbol}: Moderate price movement (${data.priceChangePercent24h.toFixed(2)}%)</span>
        `;
        container.innerHTML = '';
        container.appendChild(anomaly);
    }
}

/**
 * Update top movers
 */
function updateTopMovers() {
    if (state.isRestoreMode && state.restoreSnapshot) {
        updateTopMoversFromSnapshot(state.restoreSnapshot);
        return;
    }

    const movers = Object.entries(state.priceData)
        .map(([symbol, data]) => ({ symbol, change: data.priceChangePercent24h }))
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 5);

    const container = document.getElementById('top-movers');
    if (!container) return;

    container.innerHTML = movers.map(mover => `
        <div class="mover-item">
            <span class="mover-symbol">${mover.symbol}</span>
            <span class="mover-change ${mover.change >= 0 ? 'positive' : 'negative'}">
                ${mover.change >= 0 ? '+' : ''}${mover.change.toFixed(2)}%
            </span>
        </div>
    `).join('');
}

/**
 * Update connection status
 */
function updateConnectionStatus(status) {
    const statusEl = document.getElementById('connectionStatus');
    if (!statusEl) return;

    if (state.isRestoreMode) {
        statusEl.className = `connection-status restored`;
        const txt = statusEl.querySelector('.status-text');
        if (txt) {
            txt.textContent = state.restoredFromLink ?
                'CRYPTO SESSION RENDERING ENGINE β' :
                'JSON STATE RESTORE ENGINE';

        }
        return;
    }

    let className = status;
    if (status === 'connecting') {
        className = 'disconnected';
    }

    statusEl.className = `connection-status ${className}`;
    const txt = statusEl.querySelector('.status-text');
    if (txt) {
        if (status === 'connecting') {
            txt.textContent = 'Connecting...';
        } else {
            txt.textContent = status === 'connected' ?
                'Connected' :
                'Disconnected';
        }
    }
}


/**
 * Update system health
 */
function updateSystemHealth() {
    if (state.isRestoreMode) return;

    const now = Date.now();

    const freshness = Math.floor((now - state.lastUpdateTime) / 1000);
    const freshnessEl = document.getElementById('dataFreshness');
    if (freshnessEl) freshnessEl.textContent = `${freshness}s`;

    const latency = state.ws && state.ws.readyState === WebSocket.OPEN ?
        Math.floor(Math.random() * 50 + 20) : 0;
    const latencyEl = document.getElementById('latency');
    if (latencyEl) latencyEl.textContent = `${latency}ms`;

    const dataPointsEl = document.getElementById('dataPoints');
    if (dataPointsEl) dataPointsEl.textContent = state.dataPointsCount;

    const connectionStatus = state.ws && state.ws.readyState === WebSocket.OPEN ? 'Active' : 'Inactive';
    const footerConnectionEl = document.getElementById('footerConnection');
    if (footerConnectionEl) footerConnectionEl.textContent = connectionStatus;
}

/**
 * Add alert to alert center
 */
function addAlert(message, type = 'info') {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    state.alerts.unshift({ message, type, time: timeStr });
    if (state.alerts.length > 10) state.alerts.pop();

    const container = document.getElementById('alertsContainer');
    if (!container) return;

    container.innerHTML = state.alerts.map(alert => `
        <div class="alert-item status--${alert.type}">
            <span class="alert-time">${alert.time}</span>
            <span class="alert-message">${alert.message}</span>
        </div>
    `).join('');
}

/**
 * Setup theme toggle
 */
function setupThemeToggle() {
    const themeBtn = document.getElementById('themeToggle');
    if (!themeBtn) return;
    themeBtn.addEventListener('click', () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', state.theme);
        document.documentElement.setAttribute('data-color-scheme', state.theme);
        themeBtn.querySelector('.fab-icon').textContent = state.theme === 'light' ? '◐' : '◐';
        addAlert(`Theme changed to ${state.theme}`, 'info');
    });
}

// ========================================
// SEARCH FUNCTIONALITY
// ========================================

/**
 * Setup search panel
 */
function setupSearchPanel() {
    const searchBtn = document.getElementById('searchBtn');
    const searchPanel = document.getElementById('searchPanel');
    const closeBtn = document.getElementById('closeSearch');
    const searchInput = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('searchResults');

    if (!searchBtn || !searchPanel || !closeBtn || !searchInput || !resultsContainer) return;

    const metricsIndex = [
        { id: 'ofiValue', title: 'Order Flow Imbalance', type: 'metric' },
        { id: 'volumeSlope', title: 'Volume Slope', type: 'metric' },
        { id: 'bidAskImbalance', title: 'Bid-Ask Imbalance', type: 'metric' },
        { id: 'vol1h', title: '1h Volatility', type: 'metric' },
        { id: 'vol4h', title: '4h Volatility', type: 'metric' },
        { id: 'vol24h', title: '24h Volatility', type: 'metric' },
        { id: 'top-movers', title: 'Top Movers', type: 'metric' },
        { id: 'anomalyContainer', title: 'Anomaly Detection', type: 'metric' },
        { id: 'alertsContainer', title: 'Alert Center', type: 'metric' }
    ];

    let flatResults = [];
    let activeIndex = -1;

    const open = () => {
        searchPanel.classList.add('active');
        searchInput.value = '';
        renderEmpty();
        searchInput.focus();
        flatResults = [];
        activeIndex = -1;
    };
    const close = () => {
        searchPanel.classList.remove('active');
        searchInput.blur();
        flatResults = [];
        activeIndex = -1;
    };

    searchBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (searchPanel.classList.contains('active')) {
                close();
            } else {
                open();
            }
        }
        if (e.key === 'Escape' && searchPanel.classList.contains('active')) {
            close();
        }
    });

    function debounce(fn, wait = 180) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), wait);
        };
    }

    function buildIndex() {
        const coins = Object.keys(state.priceData || {}).map(symbol => {
            const d = state.priceData[symbol] || {};
            const name = (d.name || symbol);
            const subtitle = d.price ? formatPrice(d.price) : '--';
            return {
                type: 'coin',
                key: symbol,
                title: `${symbol}`,
                subtitle,
                score: 0
            };
        });

        const alerts = (state.alerts || []).slice(0, 20).map((a, idx) => ({
            type: 'alert',
            key: `alert-${idx}`,
            title: a.message,
            subtitle: a.time
        }));

        const metrics = metricsIndex.map(m => ({
            type: m.type,
            key: m.id,
            title: m.title,
            subtitle: 'Metric panel'
        }));

        return { coins, alerts, metrics };
    }

    function performSearch(query) {
        if (!query || !query.trim()) {
            renderEmpty();
            flatResults = [];
            return;
        }
        const q = query.trim().toLowerCase();
        const { coins, alerts, metrics } = buildIndex();

        const coinMatches = coins
            .map(c => {
                const score = c.title.toLowerCase() === q ? 100 : (c.title.toLowerCase().includes(q) ? 60 : (c.subtitle && c.subtitle.toLowerCase().includes(q) ? 40 : 0));
                return {...c, score };
            })
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 20);

        const metricMatches = metrics
            .map(m => ({...m, score: m.title.toLowerCase().includes(q) ? 50 : 0 }))
            .filter(r => r.score > 0)
            .slice(0, 10);

        const alertMatches = alerts
            .map(a => ({...a, score: a.title.toLowerCase().includes(q) ? 30 : 0 }))
            .filter(r => r.score > 0)
            .slice(0, 10);

        renderGroupedResults(coinMatches, metricMatches, alertMatches);
    }

    function renderEmpty() {
        resultsContainer.innerHTML = `<div class="search-result-empty">Type to search coins, metrics, alerts... (Try "BTC" or "Volume")</div>`;
    }

    function renderGroupedResults(coins, metrics, alerts) {
        flatResults = [];
        activeIndex = -1;
        let html = '';

        if (coins.length) {
            html += `<div class="search-group"><div class="search-group-title">Coins</div>`;
            coins.forEach(c => {
                const idx = flatResults.length;
                flatResults.push({ type: 'coin', key: c.key, title: c.title });
                html += `<div class="search-result-item" data-idx="${idx}" data-type="coin" data-key="${c.key}">
                            <div class="sr-left"><strong>${c.title}</strong></div>
                            <div class="sr-right">${c.subtitle || ''}</div>
                         </div>`;
            });
            html += `</div>`;
        }

        if (metrics.length) {
            html += `<div class="search-group"><div class="search-group-title">Metrics & Panels</div>`;
            metrics.forEach(m => {
                const idx = flatResults.length;
                flatResults.push({ type: 'metric', key: m.key, title: m.title });
                html += `<div class="search-result-item" data-idx="${idx}" data-type="metric" data-key="${m.key}">
                            <div class="sr-left">${m.title}</div>
                            <div class="sr-right">Panel</div>
                         </div>`;
            });
            html += `</div>`;
        }

        if (alerts.length) {
            html += `<div class="search-group"><div class="search-group-title">Alerts</div>`;
            alerts.forEach(a => {
                const idx = flatResults.length;
                flatResults.push({ type: 'alert', key: a.key, title: a.title });
                html += `<div class="search-result-item" data-idx="${idx}" data-type="alert" data-key="${a.key}">
                            <div class="sr-left">${a.title}</div>
                            <div class="sr-right">${a.subtitle || ''}</div>
                         </div>`;
            });
            html += `</div>`;
        }

        if (!html) html = `<div class="search-result-empty">No results</div>`;
        resultsContainer.innerHTML = html;

        resultsContainer.querySelectorAll('.search-result-item').forEach(node => {
            node.addEventListener('click', () => {
                const idx = Number(node.dataset.idx);
                if (!Number.isNaN(idx)) {
                    activateResult(idx);
                }
            });
        });
    }

    function activateResult(idx) {
        const r = flatResults[idx];
        if (!r) return;
        if (r.type === 'coin') {
            selectCrypto(r.key);
            close();
        } else if (r.type === 'metric') {
            const el = document.getElementById(r.key);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                flashElement(el);
            } else {
                const panel = document.querySelector(`#${r.key}`) || document.querySelector('.panel');
                if (panel) {
                    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    flashElement(panel);
                }
            }
            close();
        } else if (r.type === 'alert') {
            const alertsPanel = document.getElementById('alertsContainer');
            if (alertsPanel) {
                alertsPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                flashElement(alertsPanel);
            }
            close();
        }
    }

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (flatResults.length === 0) return;
            activeIndex = Math.min(activeIndex + 1, flatResults.length - 1);
            updateActive();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (flatResults.length === 0) return;
            activeIndex = Math.max(activeIndex - 1, 0);
            updateActive();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0) activateResult(activeIndex);
        }
    });

    function updateActive() {
        resultsContainer.querySelectorAll('.search-result-item').forEach(n => n.classList.remove('active'));
        if (activeIndex >= 0) {
            const node = resultsContainer.querySelector(`.search-result-item[data-idx="${activeIndex}"]`);
            if (node) {
                node.classList.add('active');
                node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }

    function flashElement(el) {
        if (!el) return;
        el.classList.add('search-flash');
        setTimeout(() => el.classList.remove('search-flash'), 1600);
    }

    const debouncedSearch = debounce((q) => {
        performSearch(q);
    }, 140);

    searchInput.addEventListener('input', (e) => {
        const q = e.target.value;
        if (!q) {
            renderEmpty();
            flatResults = [];
            return;
        }
        debouncedSearch(q);
    });

    renderEmpty();
}

/**
 * Select cryptocurrency from search
 */
function selectCrypto(symbol) {
    const btn = document.querySelector(`[data-symbol="${symbol}"]`);
    if (btn) {
        btn.click();
        const panel = document.getElementById('searchPanel');
        if (panel) panel.classList.remove('active');
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Format price
 */
function formatPrice(price) {
    if (price === null || price === undefined || Number.isNaN(price)) return '--';

    const symbol = state.currentSymbol;
    let formattedPrice;

    const fourDecimalCoins = ["DOT", "SOL", "BNB", "XRP", "LTC"];

    if (fourDecimalCoins.includes(symbol)) {
        formattedPrice = Number(price).toFixed(4);
    } else if (price >= 1000) {
        formattedPrice = price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (price >= 1) {
        formattedPrice = price.toFixed(2);
    } else {
        formattedPrice = price.toFixed(6);
    }

    if (state.currency === 'INR') {
        const inrPrice = price * state.usdtToInrRate;
        if (price >= 1000) {
            formattedPrice = inrPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else if (price >= 1) {
            formattedPrice = inrPrice.toFixed(2);
        } else {
            formattedPrice = inrPrice.toFixed(6);
        }
        return `₹${formattedPrice}`;
    }

    return `$${formattedPrice}`;
}

/**
 * Format volume
 */
function formatVolume(volume) {
    if (volume === null || volume === undefined || Number.isNaN(volume)) return '--';
    const v = Number(volume);

    if (state.currency === 'INR') {
        const inrVolume = v * state.usdtToInrRate;
        if (inrVolume >= 1e9) {
            return `₹${(inrVolume / 1e9).toFixed(2)}B`;
        } else if (inrVolume >= 1e6) {
            return `₹${(inrVolume / 1e6).toFixed(2)}M`;
        } else if (inrVolume >= 1e3) {
            return `₹${(inrVolume / 1e3).toFixed(2)}K`;
        }
        return `₹${inrVolume.toFixed(2)}`;
    }

    if (v >= 1e9) {
        return `$${(v / 1e9).toFixed(2)}B`;
    } else if (v >= 1e6) {
        return `$${(v / 1e6).toFixed(2)}M`;
    } else if (v >= 1e3) {
        return `$${(v / 1e3).toFixed(2)}K`;
    }
    return `$${v.toFixed(2)}`;
}

// ========================================
// AI SUMMARY FUNCTIONS
// ========================================

/**
 * Generate real AI summary (Hugging Face)
 */
/**
 * Generate real AI summary (Hugging Face)
 * - Accepts `snapshot` AND optional `symbol`. If symbol is provided, summary is generated for that symbol.
 */
async function generateRealAISummary(snapshot, symbol = null) {
    const s = snapshot.snapshot || {};
    // prefer explicit symbol param, else snapshot applicationState symbol, else global state
    const sym = symbol || (s.applicationState && s.applicationState.currentSymbol) || state.currentSymbol;
    const assetName = (s.applicationState && s.applicationState.currentName) || state.currentName || sym;
    const d = (s.priceData && s.priceData[sym]) || (state.priceData && state.priceData[sym]) || {};

    // gather fields safely with fallbacks
    const price =
        d.price !== undefined && d.price !== null ? d.price : '--';

    const change24 =
        d.priceChangePercent24h !== undefined && d.priceChangePercent24h !== null ?
        d.priceChangePercent24h :
        (d.change24h !== undefined && d.change24h !== null ? d.change24h : '--');

    const vol24 =
        d.volume24h !== undefined && d.volume24h !== null ?
        d.volume24h :
        (d.volume !== undefined && d.volume !== null ? d.volume : '--');


    // optional: include a few derived metrics if present in snapshot.metadata
    const sma7 = (s.metadata && s.metadata.derived && s.metadata.derived[sym] && s.metadata.derived[sym].sma7) || null;
    const sma30 = (s.metadata && s.metadata.derived && s.metadata.derived[sym] && s.metadata.derived[sym].sma30) || null;

    const prompt = `
Summarize the current state of this crypto asset briefly and actionable:
Asset: ${assetName} (${sym})
Price: ${price}
24h Change: ${change24}%
24h Volume: ${vol24}
${sma7 ? `7-day SMA: ${sma7}\n` : ''}
${sma30 ? `30-day SMA: ${sma30}\n` : ''}
Please include short market-observation, short risk note, and a one-sentence trade idea (if applicable).
Limit to ~80-140 words.
`;

    try {
        const response = await fetch("https://crypto-ai-proxy.ajithramesh2020.workers.dev", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt })
        });

        if (!response.ok) {
            throw new Error(`API responded with ${response.status}`);
        }

        const result = await response.json();

        if (Array.isArray(result) && result[0] && (result[0].summary_text || result[0].generated_text)) {
            // support different hf formats
            return result[0].summary_text || result[0].generated_text;
        } else if (result.summary_text) {
            return result.summary_text;
        } else {
            throw new Error("Invalid response format from AI proxy");
        }

    } catch (error) {
        console.error("AI generation error:", error);
        throw error;
    }
}

/**
 * Close AI summary modal
 */
function closeAISummary() {
    const panel = document.getElementById("aiSummaryPanel");
    if (panel) {
        panel.style.display = "none";
        aiPanelDragState.isDragging = false;
        document.body.classList.remove('dragging');
    }
}

/**
 * Update AI badges from snapshot
 */
/**
 * Update AI badges from snapshot for given symbol
 * If symbol omitted, uses snapshot.applicationState.currentSymbol or state.currentSymbol
 */
function updateAIBadges(snapshot, symbol = null) {
    const s = snapshot.snapshot || {};
    const sym = symbol || (s.applicationState && s.applicationState.currentSymbol) || state.currentSymbol;
    const d = (s.priceData && s.priceData[sym]) || (state.priceData && state.priceData[sym]) || {};

    const timestamp = new Date((s.metadata && s.metadata.snapshotTime) || Date.now());
    const timeEl = document.getElementById('aiSummaryTimestamp');
    if (timeEl) {
        timeEl.textContent = timestamp.toLocaleString();
    }

    const assetBadge = document.getElementById('aiBadgeAsset');
    if (assetBadge) {
        const name = (s.applicationState && s.applicationState.currentName) || state.currentName || sym;
        assetBadge.innerHTML = `
            <span style="font-weight:bold;color:var(--color-primary);">${sym}</span>
            <span>${name}</span>
        `;
    }

    const changeBadge = document.getElementById('aiBadgeChange');
    if (changeBadge) {
        const change = d.priceChangePercent24h ?? (d.change24h ?? 0);
        const color = Number(change) >= 0 ? 'var(--color-success)' : 'var(--color-error)';
        const changeFormatted = Number.isFinite(Number(change)) ? `${Number(change).toFixed(2)}%` : '--';
        changeBadge.innerHTML = `
            <span style="color:${color};font-weight:bold;">
                ${Number(change) >= 0 ? '↗' : '↘'} ${changeFormatted}
            </span>
        `;
    }

    const qualityBadge = document.getElementById('aiBadgeQuality');
    if (qualityBadge) {
        const quality = (s.metadata && s.metadata.snapshotQuality) || 'RECENT';
        const qualityColors = {
            'FRESH': 'var(--color-success)',
            'RECENT': 'var(--color-warning)',
            'STALE': 'var(--color-error)'
        };
        qualityBadge.innerHTML = `
            <span style="color:${qualityColors[quality] || 'var(--color-text)'};font-weight:bold;">
                ${quality}
            </span>
        `;
    }

    const sourceBadge = document.getElementById('aiBadgeSource');
    if (sourceBadge) {
        const wsStatus = (s.metadata && s.metadata.websocketStatus) || (state.ws && state.ws.readyState === WebSocket.OPEN ? 'connected' : 'rest');
        const source = wsStatus === 'connected' ? 'WebSocket' : 'REST';
        sourceBadge.innerHTML = `<span>${source}</span>`;
    }
}

/**
 * Copy AI summary
 */
function copyAISummary() {
    const textElement = document.getElementById("aiSummaryText");
    if (!textElement) {
        console.error("AI summary text element not found");
        return;
    }

    const textToCopy = textElement.innerText || textElement.textContent;
    if (!textToCopy || textToCopy.trim() === "") {
        console.warn("No text to copy");
        return;
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                const originalText = textElement.textContent;
                textElement.textContent = "✓ Copied to clipboard!";
                setTimeout(() => {
                    textElement.textContent = originalText;
                }, 1500);
            })
            .catch(err => {
                console.error("Clipboard API failed:", err);
                fallbackCopy(textToCopy);
            });
    } else {
        fallbackCopy(textToCopy);
    }
}

/**
 * Fallback copy
 */
function fallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            const textElement = document.getElementById("aiSummaryText");
            const originalText = textElement.textContent;
            textElement.textContent = "✓ Copied to clipboard!";
            setTimeout(() => {
                textElement.textContent = originalText;
            }, 1500);
        }
    } catch (err) {
        console.error("Fallback copy failed:", err);
    }

    document.body.removeChild(textArea);
}

/**
 * Download AI summary
 */
function downloadAISummary() {
    const textElement = document.getElementById("aiSummaryText");
    if (!textElement) {
        console.error("AI summary text element not found");
        return;
    }

    const textToDownload = textElement.innerText || textElement.textContent;
    if (!textToDownload || textToDownload.trim() === "") {
        console.warn("No text to download");
        return;
    }

    try {
        const blob = new Blob([textToDownload], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
        const filename = `crypto-view-ai-summary-${timestamp}.txt`;

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        const originalText = textElement.textContent;
        textElement.textContent = "✓ Downloaded!";
        setTimeout(() => {
            textElement.textContent = originalText;
        }, 1500);

    } catch (error) {
        console.error("Download failed:", error);
    }
}

/**
 * Setup AI panel drag
 */
function setupAIPanelDrag() {
    const panel = document.getElementById("aiSummaryWindow");
    const header = document.getElementById("aiSummaryHeader");

    if (!panel || !header) {
        console.warn("AI summary panel elements not found for drag setup");
        return;
    }

    const panelRect = panel.getBoundingClientRect();
    aiPanelDragState.currentX = panelRect.left;
    aiPanelDragState.currentY = panelRect.top;

    header.addEventListener("mousedown", startDrag);

    header.addEventListener("touchstart", (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            startDrag({
                clientX: touch.clientX,
                clientY: touch.clientY,
                preventDefault: () => e.preventDefault()
            });
        }
    }, { passive: false });

    function startDrag(e) {
        e.preventDefault();
        aiPanelDragState.isDragging = true;

        const panelRect = panel.getBoundingClientRect();
        aiPanelDragState.offsetX = e.clientX - panelRect.left;
        aiPanelDragState.offsetY = e.clientY - panelRect.top;

        document.body.classList.add('dragging');

        document.addEventListener("mousemove", handleDragMove);
        document.addEventListener("touchmove", handleTouchMove, { passive: false });
        document.addEventListener("mouseup", stopDrag);
        document.addEventListener("touchend", stopDrag);
    }

    function handleDragMove(e) {
        if (!aiPanelDragState.isDragging) return;
        e.preventDefault();
        updatePanelPosition(e.clientX, e.clientY);
    }

    function handleTouchMove(e) {
        if (!aiPanelDragState.isDragging || e.touches.length !== 1) return;
        e.preventDefault();
        const touch = e.touches[0];
        updatePanelPosition(touch.clientX, touch.clientY);
    }

    function updatePanelPosition(clientX, clientY) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const panelWidth = panel.offsetWidth;
        const panelHeight = panel.offsetHeight;

        let newX = clientX - aiPanelDragState.offsetX;
        let newY = clientY - aiPanelDragState.offsetY;

        newX = Math.max(0, Math.min(newX, viewportWidth - panelWidth));
        newY = Math.max(0, Math.min(newY, viewportHeight - panelHeight));

        panel.style.left = `${newX}px`;
        panel.style.top = `${newY}px`;
        panel.style.transform = "none";

        aiPanelDragState.currentX = newX;
        aiPanelDragState.currentY = newY;
    }

    function stopDrag() {
        aiPanelDragState.isDragging = false;
        document.body.classList.remove('dragging');

        document.removeEventListener("mousemove", handleDragMove);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("mouseup", stopDrag);
        document.removeEventListener("touchend", stopDrag);
    }
}

/**
 * AI summary button handler
 */
/**
 * AI summary button handler — updated to honor selected coin during JSRE / CSRE
 */
document.getElementById("aiSummaryBtn").addEventListener("click", async () => {
    const panel = document.getElementById("aiSummaryPanel");
    const textBox = document.getElementById("aiSummaryText");
    const timestampEl = document.getElementById("aiSummaryTimestamp");

    if (!panel || !textBox) {
        console.error("AI summary panel elements not found");
        return;
    }

    panel.style.display = "block";
    textBox.textContent = "Analyzing market data and generating insights...";
    if (timestampEl) timestampEl.textContent = "Generating...";

    try {
        let snapshot;
        if (state.isRestoreMode && state.restoreSnapshot) {
            // use the restore snapshot but generate for the currently selected symbol
            snapshot = state.restoreSnapshot;
            aiSummarySession.isJSREMode = true;
            console.log("[AI] Using restored snapshot (JSRE/CSRE)");
        } else {
            snapshot = generateSnapshot();
            aiSummarySession.isJSREMode = false;
            console.log("[AI] Using live snapshot");
        }

        // determine symbol to summarize: prefer the actual runtime selection
        const symbolToSummarize = state.currentSymbol || (snapshot.snapshot && snapshot.snapshot.applicationState && snapshot.snapshot.applicationState.currentSymbol);

        aiSummarySession.originalSnapshot = JSON.parse(JSON.stringify(snapshot));
        aiSummarySession.generatedAt = new Date();

        // Update badges for the selected coin
        updateAIBadges(snapshot, symbolToSummarize);

        // Pass symbol into generator so AI summary is for selected coin
        const summary = await generateRealAISummary(snapshot, symbolToSummarize);

        const formattedSummary = summary
            .replace(/\n\s*\n/g, '\n\n')
            .trim();

        setTimeout(() => {
            showTextWordByWord(textBox, formattedSummary);
        }, 0);

        if (timestampEl) {
            const timestamp = aiSummarySession.generatedAt;
            timestampEl.textContent = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        console.log("[AI] Summary generated successfully for", symbolToSummarize);

    } catch (err) {
        console.error("AI summary error:", err);
        textBox.textContent = "⚠️ AI service is currently unavailable. Please try again later.\n\nYou can still view the snapshot data in the badges above.";
        try {
            const snapshot = state.isRestoreMode && state.restoreSnapshot ? state.restoreSnapshot : generateSnapshot();
            const symbolToSummarize = state.currentSymbol || (snapshot.snapshot && snapshot.snapshot.applicationState && snapshot.snapshot.applicationState.currentSymbol);
            updateAIBadges(snapshot, symbolToSummarize);
            aiSummarySession.originalSnapshot = snapshot;
        } catch (e) {
            console.error("Fallback data failed:", e);
        }
    }
});

/**
 * Setup FAB auto discovery
 */
(function setupFabAutoDiscovery() {
    const fabStack = document.querySelector('.fab-stack');
    const mainFab = document.querySelector('.fab.main');

    if (!fabStack || !mainFab) return;

    let autoLoopActive = true;
    let timers = [];

    function rotateMainFab(rotate = true) {
        if (rotate) {
            mainFab.style.transform = 'rotate(90deg)';
        } else {
            mainFab.style.transform = 'rotate(0deg)';
        }
    }

    function openFab() {
        fabStack.classList.add('auto-open');
        rotateMainFab(true);
    }

    function closeFab() {
        fabStack.classList.remove('auto-open');
        if (!fabStack.matches(':hover')) {
            rotateMainFab(false);
        }
    }

    function clearAllTimers() {
        timers.forEach(t => clearTimeout(t));
        timers = [];
    }

    function stopAutoLoop() {
        if (!autoLoopActive) return;

        autoLoopActive = false;
        clearAllTimers();
        closeFab();
    }

    function schedule(delay, fn) {
        const t = setTimeout(() => {
            if (autoLoopActive) fn();
        }, delay);
        timers.push(t);
    }

    fabStack.addEventListener('mouseenter', () => {
        rotateMainFab(true);
    });

    fabStack.addEventListener('mouseleave', () => {
        if (!fabStack.classList.contains('auto-open')) {
            rotateMainFab(false);
        }
    });

    openFab();
    schedule(10000, closeFab);

    for (let t = 10000; t <= 20000; t += 5000) {
        schedule(t, () => {
            openFab();
            schedule(2000, closeFab);
        });
    }

    for (let t = 20000; t <= 65000; t += 15000) {
        schedule(t, () => {
            openFab();
            schedule(2500, closeFab);
        });
    }

    schedule(56000, stopAutoLoop);

    mainFab.addEventListener('click', () => {
        stopAutoLoop();
        if (!autoLoopActive) {
            if (fabStack.classList.contains('auto-open')) {
                closeFab();
            } else {
                openFab();
            }
        }
    });
})();

// ========================================
// JSRE OVERLAY FUNCTIONS
// ========================================

/**
 * Initialize JSRE overlay
 */
function initJSREOverlay() {
    JSRE.overlay = document.getElementById("jsreOverlay");
    JSRE.progress = document.getElementById("jsreProgress");
    JSRE.title = document.getElementById("jsreTitle");
    JSRE.subtitle = document.getElementById("jsreSubtitle");

    if (!JSRE.overlay || !JSRE.progress || !JSRE.title || !JSRE.subtitle) {
        console.error("[JSRE] Failed to initialize overlay elements");
    }
}

/**
 * Show JSRE overlay
 */
function showJSRE() {
    console.log("[JSRE] Showing overlay");

    if (!JSRE.overlay || !JSRE.progress || !JSRE.title || !JSRE.subtitle) {
        console.error("[JSRE] Overlay not properly initialized");
        return;
    }

    JSRE.phase = 0;
    JSRE.progress.style.strokeDashoffset = JSRE.circumference;
    JSRE.progress.style.stroke = "var(--color-primary)";

    JSRE.title.textContent = "JSON State Restore Engine";
    JSRE.subtitle.textContent = "Initializing…";

    const card = JSRE.overlay.querySelector(".jsre-card");
    if (card) {
        card.classList.remove("jsre-error");
    }

    JSRE.overlay.classList.remove("hidden");
}

/**
 * Advance JSRE progress
 */
function advanceJSRE(subtitle) {
    console.log(`[JSRE] Phase ${JSRE.phase + 1}: ${subtitle}`);
    JSRE.phase++;
    if (JSRE.subtitle) {
        JSRE.subtitle.textContent = subtitle;
    }

    const offset = JSRE.circumference - (JSRE.circumference / 4) * JSRE.phase;
    if (JSRE.progress) {
        JSRE.progress.style.strokeDashoffset = offset;
    }
}

/**
 * Show JSRE error
 */
function jsreError() {
    console.error("[JSRE] Validation failed - wrong file detected");

    if (!JSRE.progress || !JSRE.title || !JSRE.subtitle) {
        console.error("[JSRE] JSRE elements not available for error display");
        return;
    }

    JSRE.progress.style.stroke = "var(--color-error)";
    JSRE.progress.style.strokeDashoffset = 0;

    JSRE.title.textContent = "Wrong File Detected";
    JSRE.subtitle.textContent = "Please upload a valid Crypto View snapshot";

    const card = JSRE.overlay.querySelector(".jsre-card");
    if (card) {
        card.classList.add("jsre-error");
    }

    setTimeout(() => {
        if (JSRE.overlay) {
            JSRE.overlay.classList.add("hidden");
        }

        if (card) {
            card.classList.remove("jsre-error");
        }

        if (JSRE.title) {
            JSRE.title.textContent = "JSON State Restore Engine";
        }
        if (JSRE.subtitle) {
            JSRE.subtitle.textContent = "Initializing…";
        }

        showJsonModal({
            title: "Uploaded Wrong File",
            desc: "The selected file does not match the Crypto View JSON format.",
            primaryText: "Reupload",
            secondaryText: "Go Back",
            onPrimary: () => {
                console.log("[JSRE] Reupload triggered");
                document.getElementById("importFileInput").click();
            },
            onSecondary: () => {
                console.log("[JSRE] User chose to go back");
            },
            autoAction: () => {},
            timerFormat: "close"
        });
    }, 1200);
}

/**
 * Show text word by word
 */
function showTextWordByWord(element, text) {
    element.textContent = "";

    const words = text.split(" ");
    let i = 0;

    const interval = setInterval(() => {
        if (i < words.length) {
            element.textContent += (i === 0 ? "" : " ") + words[i];
            i++;
        } else {
            clearInterval(interval);
        }
    }, 40);
}

// Make selectCrypto global
window.selectCrypto = selectCrypto;

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}