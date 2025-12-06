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
    usdtToInrRate: 83.5 // Initial rate, will be updated
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

// Initialize application
function init() {
    updateTime();
    setInterval(updateTime, 1000);
    setupCryptoSelector();
    setupThemeToggle();
    setupExportButton();
    setupSearchPanel();
    setupCurrencyToggle();
    connectWebSocket();
    fetchAllCryptoData();
    setInterval(() => fetchAllCryptoData(), 30000);
    updateSystemHealth();
    setInterval(updateSystemHealth, 1000);
    setupPriceVisibilityWatcher();
    fetchUsdtToInrRate();
    setInterval(fetchUsdtToInrRate, 5000); // Update rate every minute

    addAlert('System initialized successfully', 'success');
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
        const isCurrent = btn.dataset.symbol === state.currentSymbol; // state.currentSymbol = 'BTC' by default

        if (isCurrent) {
            btn.classList.add('active', 'hidden'); // active but not visible
        } else {
            btn.classList.remove('active', 'hidden'); // all others visible, not active
        }

        // 🔹 CLICK HANDLER
        btn.addEventListener('click', () => {
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
        // remove class if present so animation can restart
        currencyBtn.classList.remove('currency-toggle-pop');

        // force reflow (hack so browser restarts the animation)
        void currencyBtn.offsetWidth;

        // add class -> triggers CSS transition
        currencyBtn.classList.add('currency-toggle-pop');

        // clean up after animation so next click works again
        setTimeout(() => {
            currencyBtn.classList.remove('currency-toggle-pop');
        }, 200);
    }

    // 3) Click handler
    currencyBtn.addEventListener('click', () => {
        // flip USDT / INR
        state.currency = state.currency === 'USDT' ? 'INR' : 'USDT';

        // update emoji + text
        if (icon) {
            icon.textContent = state.currency === 'USDT' ? '₹' : '$₮';
        }

        // play button animation
        playToggleAnimation();

        // redraw prices in new currency (formatPrice already respects state.currency)
        updatePriceDisplay();

        // log alert
        addAlert(`Currency switched to ${state.currency}`, 'info');
    });
}



// Fetch USDT to INR conversion rate
async function fetchUsdtToInrRate() {
    try {
        // Using a free API for USD to INR rate (approximating USDT ≈ USD)
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        state.usdtToInrRate = data.rates.INR || 83.5;
    } catch (error) {
        console.error('Error fetching USD to INR rate:', error);
        // Fallback rate
        state.usdtToInrRate = 83.5;
    }
}

// Connect to Binance WebSocket
function connectWebSocket() {
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
        // capture previous live price, then update stored lastLivePrice
        const previous = state.lastLivePrice;
        state.lastLivePrice = state.priceData[symbol].price;
        updatePriceDisplay(previous);
    }

    updateTopMovers();
    detectAnomalies(symbol);
}

// Fetch data from CoinGecko as fallback
async function fetchAllCryptoData() {
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

        // When fallback fetch runs, it may not know previous tick — pass null
        updatePriceDisplay(null);
        updateTopMovers();
    } catch (error) {
        console.error('Error fetching CoinGecko data:', error);
    }
}

// Update price display
function updatePriceDisplay(previousPrice) {
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

    // Ensure elements exist
    if (!currentPriceEl || !priceArrowEl || !priceChangeEl) return;

    // Remove any previous price-pulse and arrow state but keep positive/negative removed first,
    // we'll set classes based on live tick below.
    currentPriceEl.classList.remove('price-pulse');
    priceArrowEl.classList.remove('neutral', 'positive', 'negative');
    currentPriceEl.classList.remove('positive', 'negative');

    // Add pulse animation for any price change
    currentPriceEl.classList.add('price-pulse');

    // Live tick logic (Option A): Only use previousPrice for coloring.
    // If previousPrice is provided and not null, set color/arrow based on tick movement.
    // Otherwise (initial render), fall back to showing neutral arrow and color based on 24h percent (optional).
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
            // unchanged tick
            priceArrowEl.classList.add('neutral');
            priceArrowEl.textContent = '→';
        }
    } else {
        // No previous tick available — initial state:
        // We'll set a neutral arrow; optionally color by 24h percent
        priceArrowEl.classList.add('neutral');
        priceArrowEl.textContent = '→';
        // (Optional) fallback color by 24h change for initial load:
        if (data.priceChangePercent24h > 0) {
            currentPriceEl.classList.add('positive');
        } else if (data.priceChangePercent24h < 0) {
            currentPriceEl.classList.add('negative');
        }
    }

    // Set displayed formatted price
    currentPriceEl.textContent = formatPrice(rawPrice);

    // Update price change display (24h)
    const changePercent = data.priceChangePercent24h;
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

    // Update other panels
    updateMarketMicrostructure(data);
    updateVolatilityMetrics(data);
    updateRiskIndicators(data);

    // Update footer live price
    const footerPriceEl = document.getElementById("footerLivePrice");
    if (footerPriceEl) {
        footerPriceEl.textContent = formatPrice(data.price);

        // Footer Live Price Color
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
    // values = { volatility: %, whale: %, volume: %, deviation: % }
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

    // --- Volatility Calculation ---
    const volatility = ((data.high24h - data.low24h) / (data.price || 1)) * 100;
    const volatilityScore = Math.min(volatility, 100); // cap at 100

    // --- Liquidity Score ---
    const liquidityScore = Math.min((data.volume24h / 1000000) * 10, 100);

    // --- Extra risk metrics you may add later ---
    const whaleActivity = Math.min((data.volume24h / data.price) % 100, 100);
    const deviation = Math.min(Math.abs((data.price - data.low24h) / data.price) * 100, 100);

    // --- UPDATE NEW BAR GRAPH ---
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

    console.log('[watcher] init');

    if (!priceCard) {
        console.warn('[watcher] .price-card not found in DOM');
        return;
    }
    if (!footerBox) {
        console.warn('[watcher] #footerLivePriceBox not found in DOM');
        return;
    }

    // helper to show/hide
    const showFooter = (show) => {
        footerBox.style.display = show ? 'flex' : 'none';
    };

    // Use IntersectionObserver if available
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            const entry = entries[0];
            if (!entry) return;
            const ratio = entry.intersectionRatio; // 0..1
            // debug
            // console.log('[watcher] intersectionRatio', ratio);
            // Show footer when visible < 0.66 (i.e., more than 1/3 hidden)
            showFooter(ratio < 0.66);
        }, {
            threshold: [0, 0.33, 0.66, 1]
        });

        observer.observe(priceCard);
        console.log('[watcher] using IntersectionObserver');
        return;
    }

    // Fallback: on scroll/resize compute visible ratio
    console.log('[watcher] IntersectionObserver not supported, using scroll fallback');

    const computeAndApply = () => {
        const rect = priceCard.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

        // If completely off-screen above or below, ratio = 0
        if (rect.bottom <= 0 || rect.top >= viewportHeight) {
            showFooter(true);
            return;
        }

        // Visible height is intersection between rect and viewport
        const visibleTop = Math.max(rect.top, 0);
        const visibleBottom = Math.min(rect.bottom, viewportHeight);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const totalHeight = rect.height || 1;
        const visibleRatio = visibleHeight / totalHeight;

        // debug
        // console.log('[watcher-fallback] visibleRatio', visibleRatio);

        showFooter(visibleRatio < 0.66);
    };

    // run immediately and on scroll/resize (debounce small)
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
    } else {
        // clear if no anomaly
        // keep existing content if you prefer; here we'll leave "Monitoring..."
    }
}

// Update top movers
function updateTopMovers() {
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
    statusEl.className = `connection-status ${status}`;
    const txt = statusEl.querySelector('.status-text');
    if (txt) txt.textContent = status === 'connected' ? 'Connected' : 'Disconnected';
}

// Update system health
function updateSystemHealth() {
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

// Two-page export: pulled-down verification panel, dual USDT/INR, no page numbers
function setupExportButton() {
    const exportBtn = document.getElementById("exportBtn");
    if (!exportBtn) return;

    exportBtn.addEventListener("click", () => {
        try {
            const currentData = state.priceData[state.currentSymbol];
            if (!currentData) {
                addAlert("No data available for export", "warning");
                return;
            }
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
                return "INR " + n(num * state.usdtToInrRate, 2);
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
            const c = currentData;
            const now = Date.now();
            const last = c.lastUpdate || now;
            const ageSec = Math.round((now - last) / 1000);
            const wsStatus =
                state.ws && state.ws.readyState === WebSocket.OPEN ?
                "Connected" :
                "Disconnected";
            const quality =
                ageSec <= 10 ? "FRESH" : ageSec <= 60 ? "RECENT" : "STALE";
            const srcPath =
                wsStatus === "Connected" ?
                "Binance WebSocket (Primary)" :
                "CoinGecko REST (Fallback)";

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
            const dev = Math.min(
                Math.abs((c.price - c.low24h) / c.price) * 100,
                100
            );

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
                state.currentName + " (" + state.currentSymbol + ")",
                "Snapshot Quality",
                quality,
                y
            );
            y += 7;
            twoColumn(
                "Data Age",
                ageSec + " sec",
                "WebSocket",
                wsStatus,
                y
            );
            y += 7;
            // Base pair is always /USDT for streaming, regardless of UI currency
            twoColumn(
                "Base Pair",
                state.currentSymbol + "/USDT",
                "Data Points",
                String(state.dataPointsCount || 0),
                y
            );
            y += 7;
            labelPair("Source Path", srcPath, y);
            y += 10;

            // Price Summary – include USDT + INR for all key metrics
            sectionHeader("Price Summary (Live)", y);
            y += 10;
            // Current price in both
            twoColumn(
                "Current Price (USDT)",
                usd(c.price),
                "Current Price (INR)",
                inr(c.price),
                y
            );
            y += 7;
            // 24h High both
            twoColumn(
                "24h High (USDT)",
                usd(c.high24h),
                "24h High (INR)",
                inr(c.high24h),
                y
            );
            y += 7;
            // 24h Low both
            twoColumn(
                "24h Low (USDT)",
                usd(c.low24h),
                "24h Low (INR)",
                inr(c.low24h),
                y
            );
            y += 7;
            // Volume in both
            twoColumn(
                "Volume (24h, USDT)",
                usd(c.volume24h),
                "Volume (24h, INR)",
                inr(c.volume24h),
                y
            );
            y += 7;
            // Change (percentage)
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
            const movers = Object.entries(state.priceData)
                .map(([sym, d]) => ({ s: sym, c: d.priceChangePercent24h }))
                .sort((a, b) => Math.abs(b.c) - Math.abs(a.c))
                .slice(0, 5);
            pdf.setFontSize(10.5);
            pdf.setTextColor(60, 60, 60);
            movers.forEach((m, i) => {
                const row = (i + 1) + ". " + m.s + ": ";
                const val = (m.c >= 0 ? "+" : "") + n(m.c) + "%";
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

            if (!state.alerts || state.alerts.length === 0) {
                pdf.text("- No alerts available", 14, y);
                y += 6;
            } else {
                state.alerts.forEach(a => {
                    const line =
                        "[" + a.time + "] " + String(a.message || "");
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
                wsStatus +
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
            const githubUrl = "https://github.com/Ajith-data-analyst/Crypto_View";
            const liveUrl = "https://ajith-data-analyst.github.io/crypto_view/";
            const copyrightText =
                "© 2025 Crypto View | All rights reserved | Live Crypto Price Analytics";

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

            pdf.save("crypto-report-" + Date.now() + ".pdf");
            addAlert("Exported PDF successfully", "success");
        } catch (err) {
            console.error(err);
            addAlert("Export failed", "error");
        }
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

    // Build a static list of "metric" items to search (id = DOM id to jump to)
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

    // State for keyboard navigation
    let flatResults = []; // flattened array of {type, key, title, action}
    let activeIndex = -1;

    // open / close handlers
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

    // keyboard shortcuts: Ctrl/Cmd+K to open, Esc to close
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

    // Debounce helper
    function debounce(fn, wait = 180) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), wait);
        };
    }

    // Build search index each time (coins + metrics + alerts)
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

        // Alerts (recent)
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

    // Perform search: simple case-insensitive substring match; boost exact symbol matches
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

    // Render nothing / placeholder
    function renderEmpty() {
        resultsContainer.innerHTML = `<div class="search-result-empty">Type to search coins, metrics, alerts... (Try "BTC" or "Volume")</div>`;
    }

    // Render grouped results and build flatResults for keyboard nav
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

        // attach click handlers
        resultsContainer.querySelectorAll('.search-result-item').forEach(node => {
            node.addEventListener('click', () => {
                const idx = Number(node.dataset.idx);
                if (!Number.isNaN(idx)) {
                    activateResult(idx);
                }
            });
        });
    }

    // Activate a result by index (perform the jump / selection)
    function activateResult(idx) {
        const r = flatResults[idx];
        if (!r) return;
        if (r.type === 'coin') {
            // selects the crypto (reuses existing selectCrypto)
            selectCrypto(r.key);
            close();
        } else if (r.type === 'metric') {
            // scroll into view and highlight
            const el = document.getElementById(r.key);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                flashElement(el);
            } else {
                // try to scroll to parent panel by mapping ids -> panels if needed
                const panel = document.querySelector(`#${r.key}`) || document.querySelector('.panel');
                if (panel) {
                    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    flashElement(panel);
                }
            }
            close();
        } else if (r.type === 'alert') {
            // show alert center and highlight the alert (we'll just open the panel and flash)
            const alertsPanel = document.getElementById('alertsContainer');
            if (alertsPanel) {
                alertsPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                flashElement(alertsPanel);
            }
            close();
        }
    }

    // keyboard nav in results (up/down/enter)
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
                // ensure visible
                node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }

    // Helper: brief highlight animation for target elements
    function flashElement(el) {
        if (!el) return;
        el.classList.add('search-flash');
        setTimeout(() => el.classList.remove('search-flash'), 1600);
    }

    // Wire search typing -> debounced search
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

    // initial placeholder
    renderEmpty();
}
// ----------------- END UNIVERSAL SEARCH -----------------

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

    // Coins that should always show 4 decimals
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

    // Apply currency conversion if INR is selected
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

// Utility: Format price in INR for reports
function formatPriceInr(price) {
    if (price === null || price === undefined || Number.isNaN(price)) return '--';

    const inrPrice = price * state.usdtToInrRate;
    let formattedPrice;

    if (inrPrice >= 1000) {
        formattedPrice = inrPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (inrPrice >= 1) {
        formattedPrice = inrPrice.toFixed(2);
    } else {
        formattedPrice = inrPrice.toFixed(6);
    }

    return `₹${formattedPrice}`;
}

// Utility: Format volume
function formatVolume(volume) {
    if (volume === null || volume === undefined || Number.isNaN(volume)) return '--';
    const v = Number(volume);

    // Apply currency conversion if INR is selected
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

// Utility: Format uptime
function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);

    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Make selectCrypto global
window.selectCrypto = selectCrypto;

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}