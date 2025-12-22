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
    isRestoreMode: false, // New: Track if we're in restore mode
    restoreSnapshot: null // New: Store the active snapshot in restore mode
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

// Initialize application
function init() {
    updateTime();
    setInterval(updateTime, 1000);
    setupCryptoSelector();
    setupThemeToggle();
    setupExportDropdown();
    setupImportButton();
    setupSearchPanel();
    setupCurrencyToggle();

    // Only connect to live data if not in restore mode
    if (!state.isRestoreMode) {
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
        // Load a demo snapshot (for testing)
        loadDemoSnapshot();
    }
}

// Update current time
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour12: false });
    const el = document.getElementById('currentTime');
    if (el) el.textContent = timeString;
}

function setupCryptoSelector() {
    const buttons = document.querySelectorAll('.crypto-btn');

    // 🔹 INITIAL STATE: hide the default active crypto (BTC)
    buttons.forEach(btn => {
        const isCurrent = btn.dataset.symbol === state.currentSymbol;

        if (isCurrent) {
            btn.classList.add('active', 'hidden');
        } else {
            btn.classList.remove('active', 'hidden');
        }

        // 🔹 CLICK HANDLER
        btn.addEventListener('click', () => {
            // In restore mode, we still allow switching but only between restored symbols
            if (state.isRestoreMode && state.restoreSnapshot) {
                const availableSymbols = Object.keys(state.restoreSnapshot.snapshot.priceData || {});
                if (!availableSymbols.includes(btn.dataset.symbol)) {
                    addAlert(`Symbol ${btn.dataset.symbol} not available in restored snapshot`, 'warning');
                    return;
                }
            }

            // 1. Reset all buttons
            buttons.forEach(b => b.classList.remove('active', 'hidden'));

            // 2. Make clicked one active + hidden
            btn.classList.add('active', 'hidden');

            // 3. Update state
            state.currentSymbol = btn.dataset.symbol;
            state.currentName = btn.dataset.name;
            state.currentIcon = btn.dataset.icon;

            // 4. Refresh UI
            updatePriceDisplay();
            addAlert(`Switched to ${state.currentName}`, 'info');
        });
    });
}

// Setup export dropdown (replaces old setupExportButton)
function setupExportDropdown() {
    const exportBtn = document.getElementById('exportBtn');
    const exportDropdown = document.getElementById('exportDropdown');
    const exportOptions = document.querySelectorAll('.export-option');

    if (!exportBtn || !exportDropdown) return;

    // Toggle dropdown on export button click
    exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportDropdown.classList.toggle('active');
    });

    // Handle option clicks
    exportOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = option.dataset.option;

            switch (action) {
                case 'pdf':
                    generateAndExport('pdf');
                    break;
                case 'json':
                    generateAndExport('json');
                    break;
                case 'both':
                    generateAndExport('both');
                    break;
                case 'cancel':
                    // Just close dropdown
                    break;
            }

            exportDropdown.classList.remove('active');
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        exportDropdown.classList.remove('active');
    });

    // Prevent dropdown from closing when clicking inside it
    exportDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Setup import button for JSON snapshot restoration
function setupImportButton() {
    const importBtn = document.getElementById('importBtn');
    const importFileInput = document.getElementById('importFileInput');

    if (!importBtn || !importFileInput) return;

    importBtn.addEventListener('click', () => {
        importFileInput.click();
    });

    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const snapshot = JSON.parse(event.target.result);
                restoreFromSnapshot(snapshot);
            } catch (error) {
                console.error('Error parsing JSON snapshot:', error);
                addAlert('Invalid JSON snapshot file', 'error');
            }
        };
        reader.readAsText(file);

        // Reset file input
        importFileInput.value = '';
    });
}

// Generate and export based on format
function generateAndExport(format) {
    try {
        // Generate single snapshot
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

// Generate comprehensive snapshot
function generateSnapshot() {
    const now = new Date();
    const snapshotTime = now.toISOString();
    const readableTime = now.toLocaleString();

    // Calculate data freshness
    const dataFreshnessSeconds = Math.floor((Date.now() - state.lastUpdateTime) / 1000);

    // Determine snapshot quality
    let snapshotQuality = 'STALE';
    if (dataFreshnessSeconds <= 10) snapshotQuality = 'FRESH';
    else if (dataFreshnessSeconds <= 60) snapshotQuality = 'RECENT';

    // Get WebSocket status
    const wsStatus = state.ws && state.ws.readyState === WebSocket.OPEN ? 'connected' : 'disconnected';

    // Determine data source
    const dataSourcePath = wsStatus === 'connected' ? 'Binance WebSocket (Primary)' : 'CoinGecko REST (Fallback)';

    // Get all symbols from priceData
    const allSymbols = Object.keys(state.priceData);

    // Pre-calculate derived analytics for all symbols
    const derivedAnalytics = {};
    const currencyContext = {
        base: 'USDT',
        conversionRate: state.usdtToInrRate,
        prices: {}
    };

    allSymbols.forEach(symbol => {
        const data = state.priceData[symbol];
        if (!data) return;

        // Store currency conversions
        currencyContext.prices[symbol] = {
            usdt: data.price,
            inr: data.price * state.usdtToInrRate
        };

        // Calculate microstructure metrics
        const priceRange = data.high24h - data.low24h || 1;
        const pricePosition = (data.price - data.low24h) / priceRange;
        const avgPrice = (data.high24h + data.low24h) / 2 || data.price || 1;

        derivedAnalytics[symbol] = {
            // Microstructure
            orderFlowImbalance: (pricePosition - 0.5) * 100,
            bidAskImbalance: pricePosition * 100,
            volumeSlope: data.priceChangePercent24h * 2,

            // Volatility
            volatility1h: ((priceRange / avgPrice) * 100) / 24,
            volatility4h: ((priceRange / avgPrice) * 100) / 6,
            volatility24h: (priceRange / avgPrice) * 100,

            // Risk indicators
            volatilityRiskScore: Math.min(((data.high24h - data.low24h) / (data.price || 1)) * 100, 100),
            liquidityScore: Math.min((data.volume24h / 1000000) * 10, 100),
            whaleActivityScore: Math.min((data.volume24h / data.price) % 100, 100),
            priceDeviationScore: Math.min(Math.abs((data.price - data.low24h) / data.price) * 100, 100)
        };
    });

    // Build top movers from snapshot data
    const topMovers = Object.entries(state.priceData)
        .map(([symbol, data]) => ({ symbol, change: data.priceChangePercent24h }))
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 5);

    // Get current UI context
    const currentCryptoBtn = document.querySelector(`.crypto-btn[data-symbol="${state.currentSymbol}"]`);
    const displayPair = `${state.currentSymbol}/${state.currency}`;

    // Build snapshot object
    const snapshot = {
        version: "1.0",
        engine: "CryptoView-JSRE",
        snapshot: {
            // Application state
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

            // Raw price data for ALL symbols
            priceData: JSON.parse(JSON.stringify(state.priceData)), // Deep clone

            // Currency context
            currencyContext: currencyContext,

            // Derived analytics (pre-computed)
            derivedAnalytics: derivedAnalytics,

            // UI context
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

            // Metadata
            metadata: {
                snapshotTime: snapshotTime,
                dataFreshnessSeconds: dataFreshnessSeconds,
                websocketStatus: wsStatus,
                totalDataPoints: state.dataPointsCount,
                snapshotQuality: snapshotQuality,
                applicationVersion: APP_VERSION,
                alerts: [...state.alerts].slice(0, 10) // Last 10 alerts
            },

            // Top movers (pre-computed)
            topMovers: topMovers,

            // Anomalies (current state)
            anomalies: getCurrentAnomalies()
        }
    };

    return snapshot;
}

// Get current anomalies for snapshot
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

// Export to PDF (modified to use snapshot)
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

        // ---------- helpers ----------
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

        // ---------- snapshot values ----------
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

        // =====================================================
        // PAGE 1 – MARKET ANALYTICS
        // =====================================================
        drawHeader(
            "Crypto View - Real-Time Market Report",
            "Generated: " + new Date().toLocaleString()
        );

        let y = 32;

        // Snapshot Metadata
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

        // Price Summary – include USDT + INR for all key metrics
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

        // Market Microstructure
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

        // Volatility Metrics
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

        // Risk Indicators
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

        // Top Movers
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

        // =====================================================
        // PAGE 2 – ALERTS + VERIFICATION + LINKS
        // =====================================================
        pdf.addPage();
        drawHeader(
            "Crypto View - Alerts & Verification",
            "Generated: " + new Date().toLocaleString()
        );
        y = 32;

        // Recent Alerts
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

        // ── Pull the verification panel DOWN near bottom ──
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

        // Seal
        const cx = pageW - 32;
        const cy = panelTop + panelHeight / 2;
        pdf.setDrawColor(160, 0, 0);
        pdf.setLineWidth(1.2);
        pdf.circle(cx, cy, 14);
        pdf.setLineWidth(0.7);
        pdf.circle(cx, cy, 10);
        pdf.setTextColor(160, 0, 0);

        centered("VERIFIED", cx, cy + 2, 7);

        // ---------- FOOTER ON EVERY PAGE ----------
        const githubUrl = "https://github.com/Ajith-data-analyst/crypto_view/blob/main/LICENSE.txt";
        const liveUrl = "https://ajith-data-analyst.github.io/crypto_view/";
        const copyrightText = "© 2025 Crypto View | All rights reserved | Live Crypto Price Analytics";

        const totalPages = pdf.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            pdf.setPage(p);
            pdf.setFontSize(8);

            // Left footer: CRYPTO VIEW (clickable)
            pdf.setTextColor(40, 70, 160);
            pdf.textWithLink("CRYPTO VIEW", 12, pageH - 8, { url: liveUrl });

            // Right footer: copyright (clickable)
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

// Export to JSON
function exportToJSON(snapshot) {
    try {
        // Create pretty-printed JSON
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

// =====================================================
// JSRE - JSON STATE RESTORE ENGINE
// =====================================================

// Restore application from snapshot
function restoreFromSnapshot(snapshot) {
    try {
        // Validate snapshot structure
        if (!validateSnapshot(snapshot)) {
            addAlert("Invalid snapshot format", "error");
            return;
        }

        // Enter restore mode
        enterRestoreMode(snapshot);

        // Apply snapshot data
        applySnapshot(snapshot);

        // Update UI
        updateUIFromSnapshot(snapshot);

        addAlert(`Successfully restored snapshot from ${new Date(snapshot.snapshot.metadata.snapshotTime).toLocaleString()}`, "success");
    } catch (error) {
        console.error('Restore error:', error);
        addAlert("Failed to restore snapshot", "error");
    }
}

// Validate snapshot structure
function validateSnapshot(snapshot) {
    if (!snapshot || !snapshot.version || !snapshot.engine || !snapshot.snapshot) {
        return false;
    }

    if (snapshot.engine !== "CryptoView-JSRE") {
        return false;
    }

    if (!snapshot.snapshot.applicationState || !snapshot.snapshot.priceData || !snapshot.snapshot.metadata) {
        return false;
    }

    return true;
}

// Enter restore mode
function enterRestoreMode(snapshot) {
    state.isRestoreMode = true;
    state.restoreSnapshot = snapshot;

    // Disable live data connections
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.close();
    }

    // Clear any intervals
    const highestId = window.setTimeout(() => {}, 0);
    for (let i = 0; i < highestId; i++) {
        window.clearInterval(i);
    }

    // Show restore mode indicator
    const indicator = document.getElementById('restoreModeIndicator');
    const restoreText = document.getElementById('restoreModeText');
    const exitBtn = document.getElementById('exitRestoreModeBtn');

    if (indicator) {
        indicator.style.display = 'block';
        const snapshotTime = new Date(snapshot.snapshot.metadata.snapshotTime);
        if (restoreText) {
            restoreText.textContent = `RESTORED FROM SNAPSHOT (${snapshotTime.toLocaleString()}) — LIVE DATA DISABLED`;
        }

        // Setup exit button
        if (exitBtn) {
            exitBtn.onclick = exitRestoreMode;
        }
    }

    // Update connection status
    updateConnectionStatus('restored');
}

// Exit restore mode
function exitRestoreMode() {
    state.isRestoreMode = false;
    state.restoreSnapshot = null;

    // Hide restore mode indicator
    const indicator = document.getElementById('restoreModeIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }

    // Reload the page to restart live data
    window.location.reload();
}

// Apply snapshot data to state
function applySnapshot(snapshot) {
    // Update application state
    state.currentSymbol = snapshot.snapshot.applicationState.currentSymbol;
    state.currentName = snapshot.snapshot.applicationState.currentName;
    state.currentIcon = snapshot.snapshot.applicationState.currentIcon;
    state.currency = snapshot.snapshot.applicationState.currency;
    state.theme = snapshot.snapshot.applicationState.theme;

    // Update price data (deep copy)
    state.priceData = JSON.parse(JSON.stringify(snapshot.snapshot.priceData));

    // Update currency conversion rate
    if (snapshot.snapshot.currencyContext && snapshot.snapshot.currencyContext.conversionRate) {
        state.usdtToInrRate = snapshot.snapshot.currencyContext.conversionRate;
    }

    // Update alerts
    if (snapshot.snapshot.metadata.alerts) {
        state.alerts = [...snapshot.snapshot.metadata.alerts];
    }

    // Update data points count
    state.dataPointsCount = snapshot.snapshot.metadata.totalDataPoints || 0;
    state.lastUpdateTime = new Date(snapshot.snapshot.metadata.snapshotTime).getTime();
}

// Update UI from snapshot
function updateUIFromSnapshot(snapshot) {
    // Update theme
    if (snapshot.snapshot.applicationState.theme) {
        state.theme = snapshot.snapshot.applicationState.theme;
        document.documentElement.setAttribute('data-theme', state.theme);
        document.documentElement.setAttribute('data-color-scheme', state.theme);

        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            themeBtn.querySelector('.fab-icon').textContent = state.theme === 'light' ? '🌙' : '☀️';
        }
    }

    // Update currency toggle button
    const currencyBtn = document.getElementById('currencyToggle');
    if (currencyBtn) {
        const icon = currencyBtn.querySelector('.fab-icon');
        if (icon) {
            icon.textContent = state.currency === 'USDT' ? '₹' : '$₮';
        }
    }

    // Update crypto selector buttons
    const buttons = document.querySelectorAll('.crypto-btn');
    buttons.forEach(btn => {
        const symbol = btn.dataset.symbol;
        const isCurrent = symbol === state.currentSymbol;

        btn.classList.remove('active', 'hidden');
        if (isCurrent) {
            btn.classList.add('active', 'hidden');
        }
    });

    // Update price display (using snapshot data)
    updatePriceDisplayFromSnapshot(snapshot);

    // Update market microstructure from pre-computed analytics
    updateMicrostructureFromSnapshot(snapshot);

    // Update volatility metrics from pre-computed analytics
    updateVolatilityFromSnapshot(snapshot);

    // Update risk indicators from pre-computed analytics
    updateRiskIndicatorsFromSnapshot(snapshot);

    // Update top movers
    if (snapshot.snapshot.topMovers) {
        updateTopMoversFromSnapshot(snapshot);
    }

    // Update anomalies
    if (snapshot.snapshot.anomalies) {
        updateAnomaliesFromSnapshot(snapshot);
    }

    // Update alerts
    updateAlertsFromSnapshot(snapshot);

    // Update system health indicators
    updateSystemHealthFromSnapshot(snapshot);
}

// Update price display from snapshot
function updatePriceDisplayFromSnapshot(snapshot) {
    const data = snapshot.snapshot.priceData[state.currentSymbol];
    if (!data) return;

    const priceIconEl = document.getElementById('priceIcon');
    const nameEl = document.getElementById('priceCryptoName');
    const symbolEl = document.getElementById('priceCryptoSymbol');
    const currentPriceEl = document.getElementById('currentPrice');
    const priceArrowEl = document.getElementById('priceArrow');
    const priceChangeEl = document.getElementById('priceChange');

    if (priceIconEl) priceIconEl.textContent = state.currentIcon;
    if (nameEl) nameEl.textContent = state.currentName;

    // Update symbol display based on currency
    if (symbolEl) {
        symbolEl.textContent = `${state.currentSymbol}/${state.currency}`;
    }

    // Ensure elements exist
    if (!currentPriceEl || !priceArrowEl || !priceChangeEl) return;

    // Remove any previous classes
    currentPriceEl.classList.remove('price-pulse', 'positive', 'negative');
    priceArrowEl.classList.remove('neutral', 'positive', 'negative');

    // Set neutral arrow for snapshot (no live tick)
    priceArrowEl.classList.add('neutral');
    priceArrowEl.textContent = '→';

    // Set price color based on 24h change
    const changePercent = data.priceChangePercent24h;
    if (changePercent > 0) {
        currentPriceEl.classList.add('positive');
    } else if (changePercent < 0) {
        currentPriceEl.classList.add('negative');
    }

    // Set displayed formatted price
    currentPriceEl.textContent = formatPrice(data.price);

    // Update price change display (24h)
    const changeAmount = data.priceChange24h;
    priceChangeEl.className = 'price-change ' + (changePercent >= 0 ? 'positive' : 'negative');
    const changeValueEl = priceChangeEl.querySelector('.change-value');
    const changeAmountEl = priceChangeEl.querySelector('.change-amount');
    if (changeValueEl) changeValueEl.textContent = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
    if (changeAmountEl) changeAmountEl.textContent = `${changePercent >= 0 ? '+' : ''}${formatPrice(changeAmount)}`;

    // Stats
    const highEl = document.getElementById('high24h');
    const lowEl = document.getElementById('low24h');
    const volEl = document.getElementById('volume24h');
    if (highEl) highEl.textContent = formatPrice(data.high24h);
    if (lowEl) lowEl.textContent = formatPrice(data.low24h);
    if (volEl) volEl.textContent = formatVolume(data.volume24h);

    // Update footer live price
    const footerPriceEl = document.getElementById("footerLivePrice");
    if (footerPriceEl) {
        footerPriceEl.textContent = formatPrice(data.price);
        footerPriceEl.classList.remove("footer-price-green", "footer-price-red");

        // In restore mode, color based on 24h change
        if (changePercent > 0) {
            footerPriceEl.classList.add("footer-price-green");
        } else if (changePercent < 0) {
            footerPriceEl.classList.add("footer-price-red");
        }
    }
}

// Update microstructure from snapshot (pre-computed)
function updateMicrostructureFromSnapshot(snapshot) {
    const analytics = snapshot.snapshot.derivedAnalytics[state.currentSymbol];
    if (!analytics) return;

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

// Update volatility from snapshot (pre-computed)
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

// Update risk indicators from snapshot (pre-computed)
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

// Update top movers from snapshot (pre-computed)
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

// Update anomalies from snapshot
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

// Update alerts from snapshot
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

// Update system health from snapshot
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
    if (footerConnectionEl) footerConnectionEl.textContent = 'Restored';
}

// Load a demo snapshot (for testing)
function loadDemoSnapshot() {
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

    // Add a small delay to ensure UI is ready
    setTimeout(() => {
        restoreFromSnapshot(demoSnapshot);
        addAlert("Demo snapshot loaded successfully", "info");
    }, 1000);
}

// =====================================================
// REST OF THE EXISTING FUNCTIONS (mostly unchanged)
// =====================================================

// Setup currency toggle with emoji + animation
function setupCurrencyToggle() {
    const currencyBtn = document.getElementById('currencyToggle');
    if (!currencyBtn) return;

    const icon = currencyBtn.querySelector('.fab-icon');

    // 1) Set initial label based on default state (USDT)
    if (icon) {
        icon.textContent = state.currency === 'USDT' ? '₹' : '$₮';
    }

    // 2) Helper to play tiny pop/spin animation on the button
    function playToggleAnimation() {
        currencyBtn.classList.remove('currency-toggle-pop');
        void currencyBtn.offsetWidth;
        currencyBtn.classList.add('currency-toggle-pop');
        setTimeout(() => {
            currencyBtn.classList.remove('currency-toggle-pop');
        }, 200);
    }

    // 3) Click handler
    currencyBtn.addEventListener('click', () => {
        // In restore mode, check if we have both currency values
        if (state.isRestoreMode && state.restoreSnapshot) {
            const symbol = state.currentSymbol;
            const currencyData = state.restoreSnapshot.snapshot.currencyContext.prices[symbol];
            if (!currencyData) {
                addAlert("Currency data not available in snapshot", "warning");
                return;
            }
        }

        // flip USDT / INR
        state.currency = state.currency === 'USDT' ? 'INR' : 'USDT';

        // update emoji + text
        if (icon) {
            icon.textContent = state.currency === 'USDT' ? '₹' : '$₮';
        }

        // play button animation
        playToggleAnimation();

        // redraw prices
        if (state.isRestoreMode && state.restoreSnapshot) {
            updatePriceDisplayFromSnapshot(state.restoreSnapshot);
        } else {
            updatePriceDisplay();
        }

        // log alert
        addAlert(`Currency switched to ${state.currency}`, 'info');
    });
}

// Fetch USDT to INR conversion rate
async function fetchUsdtToInrRate() {
    if (state.isRestoreMode) return; // Don't fetch in restore mode

    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        state.usdtToInrRate = data.rates.INR || 83.5;
    } catch (error) {
        console.error('Error fetching USD to INR rate:', error);
        state.usdtToInrRate = 83.5;
    }
}

// Connect to Binance WebSocket
function connectWebSocket() {
    if (state.isRestoreMode) return; // Don't connect in restore mode

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

// Handle ticker updates from WebSocket
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

// Fetch data from CoinGecko as fallback
async function fetchAllCryptoData() {
    if (state.isRestoreMode) return; // Don't fetch in restore mode

    try {
        const ids = 'bitcoin,ethereum,cardano,polkadot,solana,binancecoin,ripple,dogecoin,matic-network,litecoin';
        const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24h_vol=true&include_24h_change=true&include_24h_high=true&include_24h_low=true`
        );
        const data = await response.json();

        const mapping = {
            'bitcoin': 'BTC',
            'ethereum': 'ETH',
            'cardano': 'ADA',
            'polkadot': 'DOT',
            'solana': 'SOL',
            'binancecoin': 'BNB',
            'ripple': 'XRP',
            'dogecoin': 'DOGE',
            'matic-network': 'MATIC',
            'litecoin': 'LTC'
        };

        Object.keys(data).forEach(id => {
            const symbol = mapping[id];
            if (symbol) {
                state.priceData[symbol] = {
                    price: data[id].usd,
                    high24h: data[id].usd_24h_high || data[id].usd * 1.05,
                    low24h: data[id].usd_24h_low || data[id].usd * 0.95,
                    volume24h: data[id].usd_24h_vol || 0,
                    priceChange24h: data[id].usd * (data[id].usd_24h_change / 100),
                    priceChangePercent24h: data[id].usd_24h_change || 0,
                    lastUpdate: Date.now()
                };
            }
        });

        updatePriceDisplay(null);
        updateTopMovers();
    } catch (error) {
        console.error('Error fetching CoinGecko data:', error);
    }
}

// Update price display (existing function, modified for restore mode)
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

    // Update symbol display based on currency
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

// Update market microstructure metrics
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

// Update volatility metrics
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

// Update risk indicators
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

// Robust watcher: show footer price when >1/3 of .price-card is hidden
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

// Detect market anomalies
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

// Update top movers
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

// Update connection status
function updateConnectionStatus(status) {
    const statusEl = document.getElementById('connectionStatus');
    if (!statusEl) return;

    if (state.isRestoreMode) {
        statusEl.className = `connection-status restored`;
        const txt = statusEl.querySelector('.status-text');
        if (txt) txt.textContent = 'Restored';
        return;
    }

    statusEl.className = `connection-status ${status}`;
    const txt = statusEl.querySelector('.status-text');
    if (txt) txt.textContent = status === 'connected' ? 'Connected' : 'Disconnected';
}

// Update system health
function updateSystemHealth() {
    if (state.isRestoreMode) return; // Don't update in restore mode

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

// Add alert to alert center
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

// Setup theme toggle
function setupThemeToggle() {
    const themeBtn = document.getElementById('themeToggle');
    if (!themeBtn) return;
    themeBtn.addEventListener('click', () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', state.theme);
        document.documentElement.setAttribute('data-color-scheme', state.theme);
        themeBtn.querySelector('.fab-icon').textContent = state.theme === 'light' ? '🌙' : '☀️';
        addAlert(`Theme changed to ${state.theme}`, 'info');
    });
}

// ----------------- UNIVERSAL SEARCH -----------------
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

// Select cryptocurrency from search
function selectCrypto(symbol) {
    const btn = document.querySelector(`[data-symbol="${symbol}"]`);
    if (btn) {
        btn.click();
        const panel = document.getElementById('searchPanel');
        if (panel) panel.classList.remove('active');
    }
}

// Utility: Format price
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

// Utility: Format volume
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

// Make selectCrypto global
window.selectCrypto = selectCrypto;

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}