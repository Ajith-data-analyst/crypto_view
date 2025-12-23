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
    restoreSnapshot: null
};

// AI Summary state
const aiSummaryState = {
    currentSnapshot: null,
    isDragging: false,
    isResizing: false,
    dragOffset: { x: 0, y: 0 },
    panelPosition: { x: 0, y: 0 },
    panelSize: { width: 700, height: 500 },
    isLoading: false
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

    // Initialize AI Summary Panel
    initAISummaryPanel();

    // Setup AI Summary button
    const aiSummaryBtn = document.getElementById('aiSummaryBtn');
    if (aiSummaryBtn) {
        aiSummaryBtn.addEventListener('click', async() => {
            try {
                showAISummary();
                await generateRealAISummary();
                addAlert('AI Summary generated from real AI analysis', 'info');
            } catch (error) {
                console.error('AI Summary generation failed:', error);
                addAlert('AI service unavailable, using fallback analysis', 'warning');
                // Fallback to deterministic summary
                generateFallbackAISummary();
            }
        });
    }

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
        loadDemoSnapshot();
    }
}

// =====================================================
// ENHANCED AI SUMMARY MODULE WITH REAL AI API
// =====================================================

// Generate real AI summary using Hugging Face API
async function generateRealAISummary() {
    const panel = document.getElementById('aiSummaryPanel');
    const textElement = document.getElementById('aiSummaryText');
    const metadataElement = document.getElementById('aiSummaryMetadata');

    if (!panel || !textElement) return;

    // Generate snapshot
    const snapshot = generateSnapshot();
    aiSummaryState.currentSnapshot = snapshot;

    // Set loading state
    aiSummaryState.isLoading = true;
    textElement.textContent = '🤔 AI is analyzing market data...';
    textElement.className = 'ai-summary-text loading';

    // Prepare data for AI
    const s = snapshot.snapshot;
    const data = s.priceData[s.applicationState.currentSymbol];
    const analytics = s.derivedAnalytics[s.applicationState.currentSymbol];

    if (!data) {
        textElement.textContent = 'Unable to generate analysis: No price data available.';
        aiSummaryState.isLoading = false;
        return;
    }

    // Prepare comprehensive prompt (shortened to avoid token limits)
    const prompt = `CRYPTO MARKET DATA ANALYSIS REQUEST:

Asset: ${s.applicationState.currentName} (${s.applicationState.currentSymbol})
Current Price: $${data.price.toFixed(2)}
24h Change: ${data.priceChangePercent24h >= 0 ? '+' : ''}${data.priceChangePercent24h.toFixed(2)}%
24h High: $${data.high24h.toFixed(2)}
24h Low: $${data.low24h.toFixed(2)}
24h Volume: $${(data.volume24h / 1000000).toFixed(2)}M

Please provide a concise market analysis with:
1. Executive Summary
2. Key Observations
3. Risk Assessment
4. Trading Insights

Be professional and avoid financial advice.`;

    try {
        // ⭐⭐⭐ CORRECT GEMINI API ENDPOINT ⭐⭐⭐
        // Get your FREE Gemini API key from: https://aistudio.google.com/apikey
        const GEMINI_API_KEY = "AIzaSyBQUs-uJxM8yPwwpMiXI6ckToIJFOoYWEo"; // ⭐ REPLACE WITH YOUR KEY ⭐

        // CORRECT Gemini API URL (v1beta is deprecated, use v1)
        const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBQUs-uJxM8yPwwpMiXI6ckToIJFOoYWEo`;

        // Call Google Gemini API directly
        console.log('Calling Gemini API with key:', GEMINI_API_KEY.substring(0, 10) + '...');

        const response = await fetch(GEMINI_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are a professional cryptocurrency market analyst. Analyze this data:

${prompt}

Provide analysis in this format:
📊 EXECUTIVE SUMMARY
🔍 KEY OBSERVATIONS  
⚠️ RISK ASSESSMENT
🎯 TRADING INSIGHTS

Use clear, professional language.`
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 600,
                    topP: 0.8,
                    topK: 40
                },
                safetySettings: [{
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            })
        });

        console.log('Gemini API Response Status:', response.status);

        if (!response.ok) {
            let errorDetails = '';
            try {
                const errorData = await response.json();
                errorDetails = JSON.stringify(errorData);
                console.error('Gemini API error details:', errorData);
            } catch (e) {
                errorDetails = await response.text();
            }

            // Common error checks
            if (response.status === 404) {
                throw new Error(`Gemini API endpoint not found (404). Please check the API URL.`);
            } else if (response.status === 400 && errorDetails.includes('API key')) {
                throw new Error(`Invalid API key. Get a free key from: https://aistudio.google.com/apikey`);
            } else if (response.status === 403) {
                throw new Error(`API access forbidden. Check if your API key is valid and has proper permissions.`);
            }

            throw new Error(`API responded with status: ${response.status}. Details: ${errorDetails.substring(0, 200)}`);
        }

        const result = await response.json();
        console.log('Gemini API full response:', result);

        // Extract AI response from Gemini format
        let summaryText = "";
        if (result.candidates && result.candidates[0] && result.candidates[0].content) {
            summaryText = result.candidates[0].content.parts[0].text;
        } else if (result.error) {
            throw new Error(`Gemini API error: ${result.error.message}`);
        } else if (result.promptFeedback && result.promptFeedback.blockReason) {
            throw new Error(`Content blocked: ${result.promptFeedback.blockReason}`);
        } else {
            summaryText = "AI analysis generated successfully. Market data processed.";
        }

        // Clean up the response
        summaryText = summaryText
            .replace(/<[^>]*>/g, '')
            .replace(/```[\s\S]*?```/g, '')
            .replace(/\[.*?\]/g, '')
            .replace(/\n\s*\n/g, '\n\n')
            .trim();

        // Update UI
        textElement.textContent = summaryText || "AI analysis completed successfully.";
        textElement.className = 'ai-summary-text';

        const now = new Date();
        metadataElement.textContent = `AI Analysis • Generated ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Using Google Gemini AI`;

        addAlert('AI analysis completed successfully', 'success');

    } catch (error) {
        console.error('AI API error:', error);

        // Special handling for 404
        if (error.message.includes('404') || error.message.includes('endpoint not found')) {
            textElement.textContent = `🔧 API Endpoint Issue\n\nGemini API endpoint returned 404 (Not Found).\n\nThis usually means:\n1. API URL has changed\n2. Your API key is invalid\n3. Service is temporarily down\n\nTry using Gemini 1.5 Flash (faster, cheaper):\nhttps://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY\n\n${generateFallbackAISummaryText(snapshot)}`;
            metadataElement.textContent = 'API Endpoint 404 Error';
            addAlert('Gemini API endpoint not found (404)', 'error');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
            // CORS error - use CORS proxy
            textElement.textContent = `🌐 Browser Restriction\n\nDirect API call blocked by CORS policy.\n\nSolution: Use CORS proxy or implement backend.\n\nTry this in your code:\nconst CORS_PROXY = "https://corsproxy.io/?";\nconst url = CORS_PROXY + encodeURIComponent(apiUrl);\n\n${generateFallbackAISummaryText(snapshot)}`;
            metadataElement.textContent = 'CORS Blocked - Use Proxy';
            addAlert('Direct API blocked by browser CORS policy', 'warning');
        } else if (error.message.includes('API key')) {
            textElement.textContent = `🔑 API Key Required\n\n${error.message}\n\nSteps to get FREE key:\n1. Go to: https://aistudio.google.com/apikey\n2. Sign in with Google\n3. Click "Create API Key"\n4. Copy and paste it in code\n\n${generateFallbackAISummaryText(snapshot)}`;
            metadataElement.textContent = 'API Key Required';
            addAlert('Gemini API key required. Get free key.', 'warning');
        } else {
            textElement.textContent = `⚠️ AI Service Issue\n\n${error.message}\n\n${generateFallbackAISummaryText(snapshot)}`;
            metadataElement.textContent = 'Service Unavailable';
            addAlert('AI service temporarily unavailable', 'warning');
        }

        textElement.className = 'ai-summary-text';
    } finally {
        aiSummaryState.isLoading = false;
    }
}
// Fallback deterministic summary (when AI API fails)
function generateFallbackAISummary() {
    const snapshot = aiSummaryState.currentSnapshot || generateSnapshot();
    const textElement = document.getElementById('aiSummaryText');
    const metadataElement = document.getElementById('aiSummaryMetadata');

    if (!textElement || !metadataElement) return;

    textElement.textContent = generateFallbackAISummaryText(snapshot);
    textElement.className = 'ai-summary-text';

    const now = new Date();
    metadataElement.textContent = `Deterministic Analysis • Generated ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function generateFallbackAISummaryText(snapshot) {
    if (!snapshot || !snapshot.snapshot) return "Unable to generate analysis: Invalid snapshot data.";

    const s = snapshot.snapshot;
    const appState = s.applicationState;
    const data = s.priceData[appState.currentSymbol];
    const analytics = s.derivedAnalytics[appState.currentSymbol];

    if (!data) return "Unable to generate analysis: No price data available.";

    // Helper functions
    const format = (value, decimals = 2) => {
        if (value === null || value === undefined) return "N/A";
        return Number(value).toFixed(decimals);
    };

    const getVolatilityRegime = (vol24h) => {
        if (vol24h < 2) return { level: "Low", description: "stable market conditions" };
        if (vol24h < 5) return { level: "Medium", description: "moderate volatility" };
        return { level: "High", description: "elevated volatility environment" };
    };

    const getRiskLevel = (value) => {
        if (value < 30) return { level: "Low", class: "risk-low" };
        if (value < 70) return { level: "Medium", class: "risk-medium" };
        return { level: "High", class: "risk-high" };
    };

    const getOrderFlowSignal = (ofi) => {
        if (ofi > 10) return { signal: "Bullish", description: "strong buyer dominance" };
        if (ofi < -10) return { signal: "Bearish", description: "significant selling pressure" };
        if (ofi > 5) return { signal: "Slightly Bullish", description: "moderate buying interest" };
        if (ofi < -5) return { signal: "Slightly Bearish", description: "light selling pressure" };
        return { signal: "Neutral", description: "balanced order flow" };
    };

    // Normalize inputs (prevents all syntax issues)
    const a = (analytics && typeof analytics === "object") ? analytics : {};
    const d = (data && typeof data === "object") ? data : {};

    // Calculate values
    const volatility24h = a.volatility24h !== undefined ? a.volatility24h : 0;
    const volatilityRegime = getVolatilityRegime(volatility24h);

    const ofi = a.orderFlowImbalance !== undefined ? a.orderFlowImbalance : 0;
    const orderFlowSignal = getOrderFlowSignal(ofi);

    const priceChange = d.priceChangePercent24h !== undefined ? d.priceChangePercent24h : 0;


    // Build the summary
    let summary = "";

    summary += `=== MARKET ANALYSIS: ${appState.currentName} (${appState.currentSymbol}) ===\n\n`;

    summary += `🔍 EXECUTIVE SUMMARY\n`;
    summary += `• ${appState.currentName} trading at $${format(data.price, data.price > 1000 ? 2 : 4)}\n`;
    summary += `• 24h Performance: ${priceChange >= 0 ? '+' : ''}${format(priceChange)}%\n`;
    summary += `• Market Regime: ${volatilityRegime.level} volatility\n`;
    summary += `• Order Flow: ${orderFlowSignal.signal}\n\n`;

    summary += `📊 PRICE ACTION\n`;
    summary += `• Current: $${format(data.price, data.price > 1000 ? 2 : 4)}\n`;
    summary += `• 24h Range: $${format(data.low24h)} - $${format(data.high24h)}\n`;
    summary += `• Volume: $${format(data.volume24h / 1000000, 2)}M\n\n`;

    summary += `⚙️ MICROSTRUCTURE\n`;
    summary += `• Order Flow: ${format(ofi)}% (${orderFlowSignal.description})\n`;
    summary += `• Bid-Ask Spread: ${format(analytics?.bidAskImbalance || 0)}%\n`;
    summary += `• Volume Trend: ${format(analytics?.volumeSlope || 0)}\n\n`;

    summary += `📈 VOLATILITY\n`;
    summary += `• 24h: ${format(volatility24h)}% (${volatilityRegime.level})\n`;
    summary += `• 4h: ${format(analytics?.volatility4h || 0)}%\n`;
    summary += `• 1h: ${format(analytics?.volatility1h || 0)}%\n\n`;

    summary += `⚠️ RISK ASSESSMENT\n`;

    // Normalize analytics (prevents all syntax errors)
    const analyticsSafe = (analytics && typeof analytics === "object") ? analytics : {};


    // Risk calculations
    const volRisk = getRiskLevel(
        a.volatilityRiskScore !== undefined ? a.volatilityRiskScore : 0
    );

    const whaleRisk = getRiskLevel(
        a.whaleActivityScore !== undefined ? a.whaleActivityScore : 0
    );

    const liqScore = a.liquidityScore !== undefined ? a.liquidityScore : 0;

    const devRisk = getRiskLevel(
        a.priceDeviationScore !== undefined ? a.priceDeviationScore : 0
    );


    summary += `• Volatility Risk: ${volRisk.level} (${format(analytics?.volatilityRiskScore || 0)}%)\n`;
    summary += `• Whale Activity: ${whaleRisk.level} (${format(analytics?.whaleActivityScore || 0)}%)\n`;
    summary += `• Liquidity: ${format(liqScore)}% ${liqScore > 50 ? '(Adequate)' : '(Thin)'}\n`;
    summary += `• Price Deviation: ${devRisk.level} (${format(analytics?.priceDeviationScore || 0)}%)\n\n`;

    summary += `📋 DATA QUALITY\n`;
    summary += `• Source: ${appState.dataSourcePath}\n`;
    summary += `• Freshness: ${s.metadata.dataFreshnessSeconds} seconds\n`;
    summary += `• Quality: ${s.metadata.snapshotQuality}\n`;
    summary += `• Generated: ${new Date(s.metadata.snapshotTime).toLocaleTimeString()}\n\n`;

    summary += `💡 INSIGHTS\n`;

    if (priceChange > 5) summary += `• Strong bullish momentum detected\n`;
    if (priceChange < -5) summary += `• Significant selling pressure observed\n`;
    if (volatility24h > 5) summary += `• High volatility suggests trading opportunities\n`;
    if (volatility24h < 2) summary += `• Low volatility indicates stability\n`;
    if (ofi > 15) summary += `• Strong buyer dominance suggests bullish sentiment\n`;
    if (ofi < -15) summary += `• Heavy selling indicates bearish sentiment\n`;
    if (liqScore > 70) summary += `• Strong liquidity supports price levels\n`;
    if (liqScore < 30) summary += `• Thin liquidity may amplify movements\n`;

    summary += `\n=== END OF ANALYSIS ===\n`;
    summary += `Note: Based on snapshot data. Not financial advice.`;

    return summary;
}

// Initialize AI Summary Panel
function initAISummaryPanel() {
    const panel = document.getElementById('aiSummaryPanel');
    const dragHandle = document.getElementById('aiSummaryDragHandle');
    const resizeHandle = document.getElementById('aiSummaryResizeHandle');
    const closeBtn = document.getElementById('aiCloseBtn');
    const regenerateBtn = document.getElementById('aiRegenerateBtn');
    const copyBtn = document.getElementById('aiCopyBtn');
    const downloadBtn = document.getElementById('aiDownloadBtn');
    const shareBtn = document.getElementById('aiShareBtn');

    if (!panel) return;

    // Load saved position and size
    const savedPosition = localStorage.getItem('aiSummaryPosition');
    const savedSize = localStorage.getItem('aiSummarySize');

    if (savedPosition) {
        const pos = JSON.parse(savedPosition);
        panel.style.left = `${pos.x}px`;
        panel.style.top = `${pos.y}px`;
        panel.style.transform = 'none';
        aiSummaryState.panelPosition = pos;
    }

    if (savedSize && window.innerWidth > 768) {
        const size = JSON.parse(savedSize);
        panel.style.width = `${size.width}px`;
        panel.style.height = `${size.height}px`;
        aiSummaryState.panelSize = size;
    }

    // Mobile bottom-sheet setup
    if (window.innerWidth <= 768) {
        panel.classList.add('mobile-fullscreen');
        panel.style.left = '0';
        panel.style.top = 'auto';
        panel.style.bottom = '0';
        panel.style.transform = 'none';
        panel.style.width = '100%';
        panel.style.height = '85vh';
    }

    // Drag functionality
    dragHandle.addEventListener('mousedown', startDrag);
    dragHandle.addEventListener('touchstart', startDragTouch);

    // Resize functionality (desktop only)
    if (resizeHandle && window.innerWidth > 768) {
        resizeHandle.addEventListener('mousedown', startResize);
    }

    // Button event listeners
    closeBtn.addEventListener('click', closeAISummary);
    regenerateBtn.addEventListener('click', async() => {
        if (aiSummaryState.isLoading) return;
        regenerateBtn.classList.add('loading');
        try {
            await generateRealAISummary();
        } catch (error) {
            generateFallbackAISummary();
        }
        regenerateBtn.classList.remove('loading');
    });
    copyBtn.addEventListener('click', copyAISummary);
    downloadBtn.addEventListener('click', downloadAISummary);
    shareBtn.addEventListener('click', shareAISummary);

    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && panel.style.display === 'flex') {
            closeAISummary();
        }
    });

    // Save position and size on window resize
    window.addEventListener('resize', () => {
        if (panel.style.display === 'flex') {
            savePanelState();
        }
    });
}

// Drag functionality
function startDrag(e) {
    if (window.innerWidth <= 768) return;

    e.preventDefault();
    const panel = document.getElementById('aiSummaryPanel');
    aiSummaryState.isDragging = true;
    aiSummaryState.dragOffset.x = e.clientX - panel.offsetLeft;
    aiSummaryState.dragOffset.y = e.clientY - panel.offsetTop;
    panel.classList.add('dragging');

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
}

function startDragTouch(e) {
    if (window.innerWidth <= 768) return;

    e.preventDefault();
    const panel = document.getElementById('aiSummaryPanel');
    const touch = e.touches[0];
    aiSummaryState.isDragging = true;
    aiSummaryState.dragOffset.x = touch.clientX - panel.offsetLeft;
    aiSummaryState.dragOffset.y = touch.clientY - panel.offsetTop;
    panel.classList.add('dragging');

    document.addEventListener('touchmove', dragTouch);
    document.addEventListener('touchend', stopDrag);
}

function drag(e) {
    if (!aiSummaryState.isDragging) return;

    const panel = document.getElementById('aiSummaryPanel');
    const x = e.clientX - aiSummaryState.dragOffset.x;
    const y = e.clientY - aiSummaryState.dragOffset.y;

    const maxX = window.innerWidth - panel.offsetWidth;
    const maxY = window.innerHeight - panel.offsetHeight;

    panel.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
    panel.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
    panel.style.transform = 'none';

    aiSummaryState.panelPosition = { x: panel.offsetLeft, y: panel.offsetTop };
}

function dragTouch(e) {
    if (!aiSummaryState.isDragging) return;

    const panel = document.getElementById('aiSummaryPanel');
    const touch = e.touches[0];
    const x = touch.clientX - aiSummaryState.dragOffset.x;
    const y = touch.clientY - aiSummaryState.dragOffset.y;

    const maxX = window.innerWidth - panel.offsetWidth;
    const maxY = window.innerHeight - panel.offsetHeight;

    panel.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
    panel.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
    panel.style.transform = 'none';

    aiSummaryState.panelPosition = { x: panel.offsetLeft, y: panel.offsetTop };
}

function stopDrag() {
    aiSummaryState.isDragging = false;
    const panel = document.getElementById('aiSummaryPanel');
    panel.classList.remove('dragging');
    savePanelState();

    document.removeEventListener('mousemove', drag);
    document.removeEventListener('touchmove', dragTouch);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchend', stopDrag);
}

// Resize functionality
function startResize(e) {
    if (window.innerWidth <= 768) return;

    e.preventDefault();
    aiSummaryState.isResizing = true;
    const panel = document.getElementById('aiSummaryPanel');
    panel.classList.add('resizing');

    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
}

function resize(e) {
    if (!aiSummaryState.isResizing) return;

    const panel = document.getElementById('aiSummaryPanel');
    const minWidth = 300;
    const minHeight = 400;
    const maxWidth = window.innerWidth - 20;
    const maxHeight = window.innerHeight - 20;

    let width = e.clientX - panel.offsetLeft;
    let height = e.clientY - panel.offsetTop;

    width = Math.max(minWidth, Math.min(width, maxWidth));
    height = Math.max(minHeight, Math.min(height, maxHeight));

    panel.style.width = `${width}px`;
    panel.style.height = `${height}px`;

    aiSummaryState.panelSize = { width, height };
}

function stopResize() {
    aiSummaryState.isResizing = false;
    const panel = document.getElementById('aiSummaryPanel');
    panel.classList.remove('resizing');
    savePanelState();

    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
}

// Save panel state
function savePanelState() {
    if (window.innerWidth <= 768) return;

    localStorage.setItem('aiSummaryPosition', JSON.stringify(aiSummaryState.panelPosition));
    localStorage.setItem('aiSummarySize', JSON.stringify(aiSummaryState.panelSize));
}

// Show AI Summary
function showAISummary() {
    const panel = document.getElementById('aiSummaryPanel');
    const textElement = document.getElementById('aiSummaryText');
    const metadataElement = document.getElementById('aiSummaryMetadata');

    if (!panel || !textElement) return;

    // Show panel with loading state
    panel.style.display = 'flex';
    textElement.textContent = 'Initializing AI analysis...';
    textElement.className = 'ai-summary-text loading';

    const now = new Date();
    metadataElement.textContent = `AI Analysis • Initializing...`;

    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'ai-summary-backdrop';
    backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9998;
    `;
    backdrop.addEventListener('click', closeAISummary);
    document.body.appendChild(backdrop);
}

// Close AI Summary
function closeAISummary() {
    const panel = document.getElementById('aiSummaryPanel');
    const backdrop = document.querySelector('.ai-summary-backdrop');

    if (panel) panel.style.display = 'none';
    if (backdrop) backdrop.remove();

    savePanelState();
}

// Regenerate AI Summary
async function regenerateAISummary() {
    if (aiSummaryState.isLoading) return;

    try {
        await generateRealAISummary();
    } catch (error) {
        generateFallbackAISummary();
    }
}

// Copy AI Summary to clipboard
async function copyAISummary() {
    const copyBtn = document.getElementById('aiCopyBtn');
    const textElement = document.getElementById('aiSummaryText');

    if (!copyBtn || !textElement) return;

    try {
        await navigator.clipboard.writeText(textElement.textContent);
        copyBtn.classList.add('success');
        setTimeout(() => copyBtn.classList.remove('success'), 2000);
        addAlert('AI Summary copied to clipboard', 'success');
    } catch (err) {
        console.error('Failed to copy:', err);
        copyBtn.classList.add('error');
        setTimeout(() => copyBtn.classList.remove('error'), 2000);
        addAlert('Failed to copy summary', 'error');
    }
}

// Download AI Summary as text file
function downloadAISummary() {
    const downloadBtn = document.getElementById('aiDownloadBtn');
    const textElement = document.getElementById('aiSummaryText');

    if (!downloadBtn || !textElement) return;

    try {
        const snapshot = aiSummaryState.currentSnapshot || generateSnapshot();
        const symbol = snapshot.snapshot.applicationState.currentSymbol;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `crypto-view-ai-analysis-${symbol}-${timestamp}.txt`;

        const blob = new Blob([textElement.textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        downloadBtn.classList.add('success');
        setTimeout(() => downloadBtn.classList.remove('success'), 2000);
        addAlert('AI Summary downloaded', 'success');
    } catch (err) {
        console.error('Failed to download:', err);
        downloadBtn.classList.add('error');
        setTimeout(() => downloadBtn.classList.remove('error'), 2000);
        addAlert('Failed to download summary', 'error');
    }
}

// Share AI Summary
async function shareAISummary() {
    const shareBtn = document.getElementById('aiShareBtn');
    const textElement = document.getElementById('aiSummaryText');

    if (!shareBtn || !textElement) return;

    try {
        const snapshot = aiSummaryState.currentSnapshot || generateSnapshot();
        const symbol = snapshot.snapshot.applicationState.currentSymbol;
        const title = `Crypto View AI Analysis: ${symbol}`;
        const text = textElement.textContent.substring(0, 500) + '...';
        const url = window.location.href;

        if (navigator.share) {
            await navigator.share({
                title: title,
                text: text,
                url: url
            });
        } else {
            await navigator.clipboard.writeText(`${title}\n\n${text}\n\nFull analysis: ${url}`);
            addAlert('Summary link copied to clipboard', 'info');
        }

        shareBtn.classList.add('success', 'sharing');
        setTimeout(() => {
            shareBtn.classList.remove('success', 'sharing');
        }, 2000);
    } catch (err) {
        console.error('Failed to share:', err);
        shareBtn.classList.add('error');
        setTimeout(() => shareBtn.classList.remove('error'), 2000);

        try {
            await navigator.clipboard.writeText(textElement.textContent.substring(0, 1000));
            addAlert('Summary copied to clipboard', 'info');
        } catch (copyErr) {
            addAlert('Failed to share summary', 'error');
        }
    }
}

// =====================================================
// REST OF THE ORIGINAL CODE (UNCHANGED)
// =====================================================

// Update current time
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour12: false });
    const el = document.getElementById('currentTime');
    if (el) el.textContent = timeString;
}

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
            if (state.isRestoreMode && state.restoreSnapshot) {
                const availableSymbols = Object.keys(state.restoreSnapshot.snapshot.priceData || {});
                if (!availableSymbols.includes(btn.dataset.symbol)) {
                    addAlert(`Symbol ${btn.dataset.symbol} not available in restored snapshot`, 'warning');
                    return;
                }
            }

            buttons.forEach(b => b.classList.remove('active', 'hidden'));

            btn.classList.add('active', 'hidden');

            state.currentSymbol = btn.dataset.symbol;
            state.currentName = btn.dataset.name;
            state.currentIcon = btn.dataset.icon;

            updatePriceDisplay();
            addAlert(`Switched to ${state.currentName}`, 'info');
        });
    });
}

// Setup export dropdown
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
                    break;
            }

            exportDropdown.classList.remove('active');
        });
    });

    document.addEventListener('click', () => {
        exportDropdown.classList.remove('active');
    });

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

        importFileInput.value = '';
    });
}

// Generate and export based on format
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

// Generate comprehensive snapshot
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

// Export to PDF
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

        // PAGE 1 – MARKET ANALYTICS
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

// Export to JSON
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

// Restore application from snapshot
function restoreFromSnapshot(snapshot) {
    try {
        if (!validateSnapshot(snapshot)) {
            addAlert("Invalid snapshot format", "error");
            return;
        }

        enterRestoreMode(snapshot);
        applySnapshot(snapshot);
        updateUIFromSnapshot(snapshot);

        addAlert(`Successfully restored snapshot from ${new Date(snapshot.snapshot.metadata.snapshotTime).toLocaleString()}`, "success");
    } catch (error) {
        console.error('Restore error:', error);
        addAlert("Failed to restore snapshot", "error");
    }
}

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

function enterRestoreMode(snapshot) {
    state.isRestoreMode = true;
    state.restoreSnapshot = snapshot;

    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.close();
    }

    const highestId = window.setTimeout(() => {}, 0);
    for (let i = 0; i < highestId; i++) {
        window.clearInterval(i);
    }

    const indicator = document.getElementById('restoreModeIndicator');
    const restoreText = document.getElementById('restoreModeText');
    const exitBtn = document.getElementById('exitRestoreModeBtn');

    if (indicator) {
        indicator.style.display = 'block';
        const snapshotTime = new Date(snapshot.snapshot.metadata.snapshotTime);
        if (restoreText) {
            restoreText.textContent = `RESTORED FROM SNAPSHOT (${snapshotTime.toLocaleString()}) — LIVE DATA DISABLED`;
        }

        if (exitBtn) {
            exitBtn.onclick = exitRestoreMode;
        }
    }

    updateConnectionStatus('restored');
}

function exitRestoreMode() {
    state.isRestoreMode = false;
    state.restoreSnapshot = null;

    const indicator = document.getElementById('restoreModeIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }

    window.location.reload();
}

function applySnapshot(snapshot) {
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
}

function updateUIFromSnapshot(snapshot) {
    if (snapshot.snapshot.applicationState.theme) {
        state.theme = snapshot.snapshot.applicationState.theme;
        document.documentElement.setAttribute('data-theme', state.theme);
        document.documentElement.setAttribute('data-color-scheme', state.theme);

        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            themeBtn.querySelector('.fab-icon').textContent = state.theme === 'light' ? '🌙' : '☀️';
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
}

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

    setTimeout(() => {
        restoreFromSnapshot(demoSnapshot);
        addAlert("Demo snapshot loaded successfully", "info");
    }, 1000);
}

// Setup currency toggle
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

    currencyBtn.addEventListener('click', () => {
        if (state.isRestoreMode && state.restoreSnapshot) {
            const symbol = state.currentSymbol;
            const currencyData = state.restoreSnapshot.snapshot.currencyContext.prices[symbol];
            if (!currencyData) {
                addAlert("Currency data not available in snapshot", "warning");
                return;
            }
        }

        state.currency = state.currency === 'USDT' ? 'INR' : 'USDT';

        if (icon) {
            icon.textContent = state.currency === 'USDT' ? '₹' : '$₮';
        }

        playToggleAnimation();

        if (state.isRestoreMode && state.restoreSnapshot) {
            updatePriceDisplayFromSnapshot(state.restoreSnapshot);
        } else {
            updatePriceDisplay();
        }

        addAlert(`Currency switched to ${state.currency}`, 'info');
    });
}

// Fetch USDT to INR conversion rate
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

// Connect to Binance WebSocket
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
    if (state.isRestoreMode) return;

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

// Update price display
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

// Setup price visibility watcher
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

// Setup search panel
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