# CRYPTO VIEW - REAL TIME INR CRYPTO ANALYTICS PLATFORM


[![GitHub Repository](https://img.shields.io/badge/📂_GITHUB_REPOSITORY-Crypto_View-black?style=for-the-badge&logo=github)](https://github.com/Ajith-data-analyst/crypto_view)
[![MIT License](https://img.shields.io/badge/📜_License-MIT-green?style=for-the-badge)](https://github.com/Ajith-data-analyst/crypto_view/blob/main/LICENSE.txt)
[![Built with Web Technologies](https://img.shields.io/badge/🔧_Built_with-HTML/CSS/JS-orange?style=for-the-badge)](https://developer.mozilla.org)

## 🎯 Executive Summary

**Crypto View** is a production-grade cryptocurrency analytics dashboard that delivers institutional-level market intelligence through an intuitive, real-time interface. Built entirely with vanilla web technologies, it combines live market data, advanced microstructure analysis, AI-powered insights, and state restoration capabilities into a single cohesive platform.

<p align="center">
  <a href="https://ajith-data-analyst.github.io/crypto_view/">
    <img src="https://img.shields.io/badge/VIEW_LIVE_PROJECT-Crypto_View-blue?style=for-the-badge&logo=github"/>
  </a>
</p>

### CRYPTO VIEW - ARCHITECTURE MAP

```mermaid
graph TB
    %% ========== DATA LAYER ==========
    subgraph "DATA SOURCES"
        WS[Binance WebSocket<br/>stream.binance.com]
        API[CoinGecko REST API<br/>api.coingecko.com]
        XR[Exchange Rate API<br/>USD→INR]
        HF[Hugging Face AI<br/>Cloudflare Proxy]
    end
    
    %% ========== CORE ENGINE ==========
    subgraph "CORE ENGINE"
        STATE["Global State Object<br/>• currentSymbol<br/>• priceData<br/>• isRestoreMode<br/>• restoreSnapshot"]
        JSRE[JSON State Restore Engine]
        AI["AI Summary System<br/>• Session Management<br/>• Drag & Drop"]
        WSM[WebSocket Manager]
        TIMER[Timer Manager]
    end
    
    %% ========== PROCESSING LAYER ==========
    subgraph "PROCESSING PIPELINES"
        UPDATE["Real-time Processor<br/>handleTickerUpdate()"]
        ANALYTICS["Analytics Engine<br/>• Microstructure<br/>• Volatility<br/>• Risk Indicators"]
        SNAPSHOT["Snapshot Generator<br/>generateSnapshot()"]
        VALIDATE["Snapshot Validator<br/>validateSnapshot()"]
    end
    
    %% ========== UI COMPONENTS ==========
    subgraph "UI LAYER"
        HEADER["Header & Time Display"]
        SELECTOR["Crypto Selector<br/>9 Cryptocurrencies"]
        PRICE["Price Card<br/>• Current Price<br/>• 24h Stats"]
        MICRO["Market Microstructure<br/>• Order Flow Imbalance<br/>• Volume Slope"]
        VOLATILITY["Volatility Metrics<br/>• 1h/4h/24h"]
        ANOMALY["Anomaly Detection"]
        TOPMOVERS["Top Movers"]
        RISK["Risk Indicators"]
        ALERTS["Alert Center"]
        FAB["Floating Action Stack<br/>7 Functions"]
        SEARCH["Universal Search<br/>Coins/Metrics/Alerts"]
        FOOTER["Footer<br/>Connection Status"]
        AI_PANEL["AI Summary Panel<br/>Draggable Window"]
        JSRE_UI[JSRE Overlay & Modal]
    end
    
    %% ========== USER ACTIONS ==========
    subgraph "USER INTERACTIONS"
        CLICK["Click/Tap Events"]
        IMPORT["File Import<br/>JSON Snapshot"]
        EXPORT["Export<br/>PDF/JSON/Both"]
        SEARCH_IN["Search Input"]
        DRAG["Drag AI Panel"]
        TOGGLE["Toggle<br/>• Theme<br/>• Currency"]
    end
    
    %% ========== DATA FLOWS ==========
    %% Data Sources → Processing
    WS -->|Real-time Stream| UPDATE
    API -->|Fallback Data| UPDATE
    XR -->|Currency Conversion| STATE
    
    %% Processing → State/UI
    UPDATE --> STATE
    UPDATE --> ANALYTICS
    ANALYTICS --> MICRO
    ANALYTICS --> VOLATILITY
    ANALYTICS --> RISK
    ANALYTICS --> ANOMALY
    
    %% State → UI Updates
    STATE --> PRICE
    STATE --> HEADER
    STATE --> TOPMOVERS
    STATE --> ALERTS
    
    %% Timer System
    TIMER -->|Every Second| HEADER
    TIMER -->|Every 30s| API
    TIMER -->|Every 5s| XR
    TIMER -->|Every 1s| FOOTER
    
    %% JSRE Workflow
    IMPORT --> JSRE_UI
    JSRE_UI -->|Validate| VALIDATE
    VALIDATE -->|Success| JSRE
    JSRE -->|Apply Snapshot| STATE
    JSRE -->|Enter Restore Mode| TIMER[Stop Timers]
    JSRE -->|Update UI| HEADER
    
    %% Snapshot Generation
    CLICK -->|Export Button| SNAPSHOT
    SNAPSHOT -->|Generate| EXPORT
    
    %% AI System
    CLICK -->|AI Summary| AI
    AI -->|Generate Summary| HF
    HF -->|AI Response| AI_PANEL
    AI -->|Drag Events| DRAG
    
    %% Search System
    SEARCH_IN --> SEARCH
    SEARCH -->|Coin Select| SELECTOR
    SEARCH -->|Metric Focus| MICRO/VOLATILITY/RISK
    
    %% Theme/Currency
    TOGGLE --> STATE
    STATE -->|Theme Update| ALL_UI[All UI Components]
    
    %% ========== MODE SWITCHING ==========
    subgraph "OPERATIONAL MODES"
        LIVE["LIVE MODE<br/>• WebSocket Active<br/>• Real-time Updates<br/>• Live Data Processing"]
        RESTORE["RESTORE MODE<br/>• WebSocket Disabled<br/>• Snapshot Data Only<br/>• Static Timestamp"]
    end
    
    STATE -->|isRestoreMode: false| LIVE
    STATE -->|isRestoreMode: true| RESTORE
    
    %% ========== KEY WORKFLOWS ==========
    subgraph "MAIN WORKFLOWS"
        WF1["1. INITIALIZATION<br/>• Setup Event Listeners<br/>• Connect WebSocket<br/>• Start Timers<br/>• Fetch Initial Data"]
        WF2["2. REAL-TIME UPDATE<br/>WebSocket → State → UI"]
        WF3["3. CRYPTO SWITCH<br/>Button Click → State Update → UI Refresh"]
        WF4["4. SNAPSHOT EXPORT<br/>Click Export → Generate → Download"]
        WF5["5. SNAPSHOT RESTORE<br/>File Import → Validate → Apply → Restore Mode"]
        WF6["6. AI SUMMARY<br/>Click AI → Snapshot → API → Display"]
        WF7["7. SEARCH<br/>Type → Filter → Select → Navigate"]
    end
    
    %% Workflow Triggers
    init[DOMContentLoaded] --> WF1
    WS -->|onmessage| WF2
    SELECTOR -->|onclick| WF3
    FAB -->|exportBtn| WF4
    FAB -->|importBtn| WF5
    FAB -->|aiSummaryBtn| WF6
    FAB -->|searchBtn| WF7
    
    %% ========== ERROR HANDLING ==========
    subgraph "ERROR RECOVERY"
        ERR_WS["WebSocket Error → Fallback to REST API"]
        ERR_API["API Error → Use Cached Data"]
        ERR_JSRE["Invalid Snapshot → Show Error Modal"]
        ERR_AI["AI Service Error → Show Fallback Data"]
    end
    
    WS -.->|onerror| ERR_WS
    API -.->|catch| ERR_API
    VALIDATE -.->|fail| ERR_JSRE
    HF -.->|error| ERR_AI
```


---

## Table of Contents

1. [Abstract / Overview](#abstract--overview)
2. [Problem Statement](#problem-statement)
3. [Solution Overview](#solution-overview)
4. [Features](#features)
5. [System Architecture](#system-architecture)
6. [Technologies Used](#technologies-used)
7. [APIs & Data Sources](#apis--data-sources)
8. [Project Modules](#project-modules)
9. [Installation & Setup](#installation--setup)
10. [Usage Instructions](#usage-instructions)
11. [Security Considerations](#security-considerations)
12. [Limitations](#limitations)
13. [Future Enhancements](#future-enhancements)
14. [License](#license)
15. [Acknowledgements & References](#acknowledgements--references)
16. [Contributing](#contributing)

---

## Abstract / Overview

RT-CPIP is a real-time cryptocurrency analytics platform designed for traders, analysts, and institutional users who require professional-grade market insights. The application streams live cryptocurrency prices from Binance, calculates sophisticated market microstructure metrics, and allows users to capture, share, and restore market snapshots. The platform integrates AI-powered summarization via Hugging Face to generate contextual market analysis narratives. It operates through a tri-modal architecture supporting live streaming, historical snapshot restoration, and shareable market environments via compressed URL encoding.

The project demonstrates full-stack development expertise spanning:
- **Frontend:** Vanilla JavaScript state management, responsive CSS grid design, modular UI components
- **Backend:** Cloudflare Workers for API proxying, caching, and rate-limit shielding
- **Data Pipeline:** Real-time WebSocket streaming, snapshot serialization, LZ-String compression
- **Analytics Engine:** Market microstructure calculations, volatility metrics, anomaly detection

---

## Problem Statement

### Market Analysis Fragmentation

Professional cryptocurrency traders face several critical challenges when analyzing live market data:

1. **Fragmented Data Sources:** Price data, technical indicators, and market sentiment exist across multiple disconnected platforms, requiring constant context-switching and manual aggregation.

2. **Rate Limiting & API Costs:** Direct API access to comprehensive market data incurs high costs or encounters rate limiting, disrupting real-time analysis workflows.

3. **Snapshot Sharing Limitations:** Traders cannot easily capture and share specific market moments with colleagues or for documentation. Traditional screenshots lack structured data, while raw JSON exports are not user-friendly.

4. **Lack of Context in Charts:** Most dashboards display numeric values without contextual AI narratives. A 2.5% price increase requires manual interpretation—was it bullish momentum or noise?

5. **Inaccessible Microstructure Analysis:** Order flow imbalance, bid-ask spread dynamics, and volume slope trends are expensive market data unavailable in retail platforms.

6. **No Historical State Recreation:** Once a live session ends, recreating exact market conditions from the past is impossible without manual logging.

---

## Solution Overview

RT-CPIP addresses each challenge through a cohesive, multi-layered architecture:

### Challenge-Solution Mapping

| Problem | RT-CPIP Solution |
|---------|------------------|
| Fragmented sources | Unified dashboard: Live prices + derived analytics + alerts in one interface |
| Rate limiting | Cloudflare Worker proxy with intelligent caching (60s TTL) + 429 rate-limit shielding |
| Snapshot sharing | LZ-compressed URL encoding enables sharing via link + QR code without file download |
| Context narratives | Hugging Face BART AI summarization generates natural-language market interpretations |
| Microstructure data | Real-time bid-ask parsing calculates order flow imbalance, volume slope, liquidity metrics |
| Historical recreation | Snapshot import + restoration freezes application to past state, enabling analysis review |

### Tri-Modal Architecture

The application operates in three distinct modes, each serving different analytical needs:

1. **Live Mode** (Default)
   - WebSocket streams prices from Binance at ~100ms intervals
   - Derived analytics update in real-time (volatility, imbalance, anomalies)
   - Users can export current snapshot at any moment
   - Connection status monitored with visual indicators

2. **Restore Mode** (Post-Import)
   - User imports previously exported JSON snapshot
   - Application "freezes" to that historical moment
   - All metrics display snapshot values (immutable)
   - Crypto selector locked to available symbols in snapshot
   - Enables review of past market conditions without speculation

3. **Share Mode** (Link-Based)
   - Users generate shareable links containing compressed snapshots
   - Recipients open link, view snapshot in browser
   - Auto-decoding and validation ensure data integrity
   - Shared snapshots restore into Restore Mode automatically

---

## Features

### Core Data Streaming

- **Real-Time Price Updates:** Binance WebSocket integration provides tick-level price data at <100ms latency for 9 major cryptocurrencies (BTC, ETH, ADA, DOT, SOL, BNB, XRP, DOGE, LTC).
- **Comprehensive Price Metrics:** Each symbol tracks current price, 24h percentage change, 24h high/low, trading volume, bid price, ask price, and bid/ask volumes.
- **Connection Status Monitoring:** Visual indicator shows WebSocket connection state (connected = green pulsing dot, disconnected = red dot) in sticky header.

### Market Microstructure Analysis

- **Order Flow Imbalance:** Calculates (Bid Volume - Ask Volume) / Total Volume percentage, indicating bullish (positive) or bearish (negative) pressure.
- **Bid-Ask Spread:** Measures (Ask Price - Bid Price) / Mid Price in percentage terms, tracking liquidity tightness.
- **Volume Slope:** Detects volume change rate comparing consecutive time periods, signaling momentum or exhaustion.
- **Real-Time Anomaly Detection:** Flags unusual patterns—whale trades, volume spikes, price deviations—with severity levels.

### Volatility & Risk Metrics

- **Multi-Timeframe Volatility:** Calculates rolling standard deviation of log returns across three timeframes:
  - 1h volatility (intraday trading focus)
  - 4h volatility (swing trading focus)
  - 24h volatility (risk management focus)
- **Risk Indicator Heatmap:** Color-coded grid displays volatility, whale activity intensity, unusual volume flags, and price deviation status.
- **Top Movers:** Ranks cryptocurrencies by 24h percentage change, highlighting gainers and losers.

### Snapshot Management (Export / Import)

- **JSON Export:** Download complete application state as structured JSON file including prices, analytics, metadata, and alert history.
- **PDF Export:** Generate stylized PDF report with formatted tables, charts, and timestamp for documentation.
- **Dual Export:** Export both PDF and JSON simultaneously for comprehensive archiving.
- **Snapshot Import:** Upload previously exported JSON to restore exact application state, recreating past market conditions.
- **Validation & Error Handling:** Imported snapshots undergo structure validation before restoration, with user-friendly error messages on failure.

### Share Environment System

- **URL-Based Sharing:** Generate shareable links containing LZ-compressed snapshot data embedded in URL hash.
- **Automatic Shortening:** URLs shortened via TinyURL API for easier sharing and QR code generation.
- **QR Code Generation:** Dynamically generate QR codes encoding shortened shareable URL, enabling camera-based distribution.
- **Clipboard Operations:** One-click copy of share link to clipboard with visual feedback confirmation.
- **Native Share API:** Leverage browser's native share functionality for iOS/Android app distribution.
- **Interactive QR Actions:** Recipients can copy, share, or download QR code image independently.

### AI Summarization Engine

- **Context-Aware Summaries:** Hugging Face BART model generates natural-language market interpretations based on snapshot data.
- **Prompt Engineering:** Application constructs detailed market context prompt including price, volatility, order flow, whale activity, and anomalies.
- **Draggable AI Panel:** Summary displays in movable sidebar, allowing users to position it anywhere on screen without disrupting dashboard.
- **Session Persistence:** AI summary tied to current snapshot, regenerable on demand.

### User Interface & Experience

- **Responsive Design:** Mobile-first CSS grid ensures optimal layout on phones (4-button crypto selector per row), tablets, and desktops.
- **Dark Mode Support:** Automatic detection of system dark mode preference; manual toggle via settings.
- **Design Token System:** Consistent typography scale, spacing grid (4px base), color palette, border radius, and animation timing.
- **Alert Center:** Chronological event log showing all user actions and system notifications with severity indicators (info, success, warning, error).
- **Real-Time Clock:** Sticky header displays current time (or snapshot timestamp in Restore Mode), updating every second.

### Crypto Selector

- **Symbol Switching:** 9 interactive buttons (BTC, ETH, ADA, DOT, SOL, BNB, XRP, DOGE, LTC) enable instant switching between cryptocurrencies.
- **Smart Availability:** In Restore Mode, selector locks to symbols present in imported snapshot, preventing missing data errors.
- **Visual State:** Active symbol highlighted in teal with white text; inactive symbols grayed.

---

## System Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     USER BROWSER (Frontend)                         │
├─────────────────────────────────────────────────────────────────────┤
│  index.html (UI Structure)                                          │
│  ├─ Header (title, time, connection status)                         │
│  ├─ Crypto selector (9 buttons)                                     │
│  ├─ Price card (current price + 24h stats)                          │
│  ├─ Market microstructure panel                                     │
│  ├─ Volatility metrics                                              │
│  ├─ Anomaly detection                                               │
│  ├─ Alert center                                                    │
│  └─ Modals (export, share, import)                                  │
│                                                                      │
│  style.css (Design System)                                          │
│  ├─ Color tokens (light/dark mode)                                  │
│  ├─ Typography scale                                                │
│  ├─ Spacing grid (4px base)                                         │
│  ├─ Responsive breakpoints                                          │
│  └─ Animation definitions                                           │
│                                                                      │
│  app.js (Business Logic - 142KB)                                    │
│  ├─ State management (tri-modal)                                    │
│  ├─ WebSocket handlers                                              │
│  ├─ Snapshot generation/restoration                                 │
│  ├─ Derived analytics calculation                                   │
│  ├─ Share environment encoding/decoding                             │
│  ├─ AI summary integration                                          │
│  └─ UI rendering functions                                          │
└──────────────────────────────────────────────────────────────────────┘
                             ↑ ↓ (HTTP/WebSocket)
┌──────────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE WORKERS (Backend)                      │
├──────────────────────────────────────────────────────────────────────┤
│  coingecko-proxy.js                                                  │
│  ├─ Validates incoming request parameters                           │
│  ├─ Checks Cloudflare cache (60s TTL)                               │
│  ├─ Handles 429 rate-limit responses gracefully                     │
│  └─ Forwards CoinGecko price data to client                         │
│                                                                      │
│  crypto-ai-proxy.js                                                 │
│  ├─ Accepts market context prompt from frontend                     │
│  ├─ Appends Hugging Face API token (stored in secrets)              │
│  └─ Proxies to Hugging Face BART model                              │
└──────────────────────────────────────────────────────────────────────┘
                             ↑ ↓ (REST/CORS)
┌──────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL APIs                                   │
├──────────────────────────────────────────────────────────────────────┤
│  1. Binance WebSocket (wss://stream.binance.com:9443)               │
│     └─ Direct (non-proxied): Real-time price streams                │
│                                                                      │
│  2. CoinGecko REST API (https://api.coingecko.com)                  │
│     └─ Proxied via coingecko-proxy.js: Price history, metadata     │
│                                                                      │
│  3. Hugging Face Inference API (https://router.huggingface.co)      │
│     └─ Proxied via crypto-ai-proxy.js: BART summarization          │
│                                                                      │
│  4. TinyURL API (https://tinyurl.com/api-create.php)                │
│     └─ Direct: URL shortening for share links                       │
│                                                                      │
│  5. QR Server API (https://api.qrserver.com)                        │
│     └─ Direct: QR code image generation                             │
└──────────────────────────────────────────────────────────────────────┘
```

### State Management Architecture

The application maintains a single `state` object as the source of truth:

```javascript
const state = {
  // Display context
  currentSymbol: 'BTC',
  currentName: 'Bitcoin',
  currentIcon: '₿',
  
  // Network
  ws: null,  // WebSocket connection
  
  // Market data (real-time or snapshot)
  priceData: {
    BTC: { price, change24h, volume, high24h, low24h, bidPrice, askPrice, ... },
    ETH: { ... },
    // ... 9 symbols total
  },
  
  // Derived analytics
  derivedAnalytics: {
    BTC: { volatility1h, volatility4h, volatility24h, orderFlowImbalance, ... },
    // ... per symbol
  },
  
  // Session tracking
  startTime: 1674820200000,
  dataPointsCount: 2847,
  lastUpdateTime: 1674825000000,
  
  // User alerts
  alerts: [ { id, message, severity, timestamp, read } ],
  
  // UI preferences
  theme: 'light',
  currency: 'USDT',
  usdtToInrRate: 83.5,
  
  // Mode flags
  isRestoreMode: false,
  restoreSnapshot: null,
  restoredFromLink: false
};
```

**Data Flow for Price Updates:**

```
Binance WebSocket emits: { price: 45100, bidPrice: 45099, askPrice: 45101 }
    ↓
connectBinanceWebSocket() handler executes:
    ├─ Parse incoming price data
    ├─ Update state.priceData[currentSymbol]
    ├─ Recalculate derived analytics
    ├─ Update state.lastUpdateTime
    └─ Trigger UI render functions
    ↓
updatePriceDisplay() renders:
    ├─ Format price: $45,100
    ├─ Format change: +2.5% (green)
    └─ Update card in DOM
    ↓
updateMarketMicrostructure() renders:
    ├─ Calculate order flow imbalance: +3.2%
    ├─ Calculate bid-ask spread: 0.05%
    └─ Update metrics in DOM
    ↓
updateVolatilityMetrics() renders:
    ├─ 1h volatility: 0.45%
    ├─ 4h volatility: 0.62%
    └─ 24h volatility: 1.23%
    ↓
User observes real-time updated dashboard
```

### Snapshot Export & Share Lifecycle

```
User clicks "Share" button
    ↓
generateSnapshot() executes:
    ├─ Serialize entire state object
    ├─ Capture priceData[all symbols]
    ├─ Capture derivedAnalytics[all symbols]
    ├─ Add metadata: timestamp, quality, session duration
    └─ Return snapshot object (50-80KB)
    ↓
shareStripSensitive() removes:
    ├─ Full alert history (keep last 3 only)
    └─ Add share metadata: sharedBy, shareCreatedAt
    ↓
shareEncodeSnapshot() compresses:
    ├─ JSON.stringify(snapshot)
    ├─ LZString.compressToEncodedURIComponent()
    └─ Return URL-safe string (~67% compression, 20-25KB)
    ↓
generateShareableLink() shortens:
    ├─ Build full URL: domain.com/?env=COMPRESSED_DATA
    ├─ POST to TinyURL API
    └─ Receive shortened URL (40 chars)
    ↓
createQrImageUrl() generates:
    └─ URL: https://api.qrserver.com/?data=SHORTENED_URL
    ↓
openShareModal() displays:
    ├─ Share link input field
    ├─ QR code image
    ├─ Snapshot stats (price, volatility, timestamp)
    └─ Copy/Share/Download buttons
    ↓
User can:
    ├─ Copy link → Send via chat/email
    ├─ Click Share → Native iOS/Android share sheet
    └─ Download QR → Share as image
```

### Snapshot Restoration Lifecycle

```
Recipient opens shared link: domain.com/?env=COMPRESSED_DATA
    ↓
URL hash parsed: window.location.hash = "#env=COMPRESSED_DATA"
    ↓
shareDecodeSnapshot(COMPRESSED_DATA) executes:
    ├─ LZString.decompressFromEncodedURIComponent()
    ├─ JSON.parse() decompressed string
    ├─ Validate structure (required fields exist)
    └─ Return snapshot object
    ↓
showJsonModal() asks user:
    "Restore this snapshot?
     Price: $45,000
     Volatility: 1.8%
     Timestamp: Jan 27, 4:30 PM
     [Proceed] [Cancel]
     Auto-proceeds in 10 seconds"
    ↓
If user clicks Proceed OR timer expires:
    ↓
restoreFromSnapshot(snapshot) executes:
    ├─ Set state.isRestoreMode = true
    ├─ Set state.restoredFromLink = true
    ├─ Copy snapshot data to state
    ├─ Close WebSocket connection
    ├─ Lock crypto selector to available symbols
    └─ Update entire UI with frozen data
    ↓
UI freezes to snapshot moment:
    ├─ Time shows snapshot timestamp (immutable)
    ├─ Prices show snapshot prices (immutable)
    ├─ Metrics show snapshot analytics (immutable)
    ├─ "Exit Restore Mode" button visible
    └─ Can re-export or share snapshot
```

### AI Summarization Request-Response

```
User views snapshot and clicks "Summarize with AI"
    ↓
generateSnapshot() creates snapshot object
    ↓
buildMarketContextPrompt(snapshot) constructs:
    "Current price: $45,000 (BTC)
     24h change: +2.5%
     Volatility: 1.8%
     Order flow imbalance: +3.2%
     Bid-ask spread: 0.05%
     Volume spike detected: 2.3x average
     Whale activity: 5 large trades in last 1h
     ... [full data context]"
    ↓
Frontend POST request to /crypto-ai-proxy.js:
    {
      "prompt": "Current price: $45,000 ..."
    }
    ↓
crypto-ai-proxy.js (Cloudflare Worker) executes:
    ├─ Receive prompt
    ├─ Validate POST method and prompt field
    ├─ Fetch Hugging Face API token from secrets
    ├─ POST to https://router.huggingface.co/hf-inference/models/facebook/bart-large-cnn
    ├─ Payload: { "inputs": prompt }
    └─ Return response to frontend
    ↓
Hugging Face BART model processes:
    └─ Generate summary: "Bitcoin shows strong bullish momentum with elevated whale 
                         activity. Positive order flow imbalance (+3.2%) and tight 
                         spreads indicate healthy liquidity. Volatility remains stable, 
                         suggesting consolidation before potential breakout."
    ↓
Frontend receives summary
    ↓
displayAiSummary(summaryText) renders:
    ├─ Show summary in draggable AI panel
    ├─ Position allows user to move anywhere on screen
    └─ Timestamp shows when summary was generated
    ↓
User reads AI-generated market narrative
```

---

## Technologies Used

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **HTML5** | Latest | Semantic markup, modal dialogs, form inputs |
| **CSS3** | Latest | Grid layout, flexbox, CSS variables (tokens), responsive design, dark mode |
| **JavaScript (ES6+)** | Latest | State management, event handling, data processing, API integration |
| **Vanilla JavaScript** | N/A | No frameworks; library-free state management for maximum control |

### Backend Technologies

| Technology | Service | Purpose |
|------------|---------|---------|
| **Cloudflare Workers** | Serverless | API proxying, caching, rate-limit shielding, secret management |
| **Node.js Runtime** | Workers runtime | JavaScript execution environment in Cloudflare global network |

### External Libraries

| Library | Purpose | Install |
|---------|---------|---------|
| **LZString** | String compression/decompression | `<script src="https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js"></script>` |
| **QRCode.js** | QR code generation | `<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>` |
| **html2pdf.js** | PDF export (optional) | `<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>` |

### APIs & Services

| API | Type | Purpose | Authentication |
|-----|------|---------|-----------------|
| **Binance WebSocket** | WebSocket | Real-time price streams | Public (no auth required) |
| **CoinGecko REST API** | REST | Supplementary price data, history | Public (free tier) |
| **Hugging Face Inference** | REST | AI text summarization (BART model) | Bearer token (environment variable) |
| **TinyURL API** | REST | URL shortening | Public (no auth required) |
| **QR Server API** | REST | QR code image generation | Public (no auth required) |

---

## APIs & Data Sources

### 1. Binance WebSocket (Direct Access)

**Purpose:** Real-time cryptocurrency price streaming at tick-level granularity

**Access Method:** WebSocket (non-proxied)

**URL:** `wss://stream.binance.com:9443/ws/btcusdt@aggTrade`

**Data Received:**
```json
{
  "e": "aggTrade",          // Event type
  "s": "BTCUSDT",           // Symbol
  "p": "45100.50",          // Price
  "q": "2.5",               // Quantity
  "b": 123456789,           // Buyer order ID
  "a": 987654321,           // Seller order ID
  "T": 1674825000000,       // Timestamp
  "m": false,               // Is buyer market maker
  "M": true                 // Ignore
}
```

**Supported Symbols:** btcusdt, ethusdt, adausdt, dotusdt, solusdt, bnbusdt, xrpusdt, dogeusdt, ltcusdt

**Update Frequency:** ~100ms (real-time)

**Why Binance?** Highest liquidity, fast streams, public WebSocket requiring no authentication

---

### 2. CoinGecko REST API (Proxied via Cloudflare)

**Purpose:** Supplementary price data, historical rates, 24h volume, high/low prices

**Access Method:** REST HTTP (proxied through coingecko-proxy.js)

**Endpoint:** `https://api.coingecko.com/api/v3/simple/price`

**Request Parameters:**
```
ids=bitcoin,ethereum,cardano,polkadot,solana,binancecoin,ripple,dogecoin,litecoin
vs_currencies=usd,inr
include_24h_change=true
include_24h_high=true
include_24h_low=true
include_24h_vol=true
```

**Response Example:**
```json
{
  "bitcoin": {
    "usd": 45000,
    "inr": 3750000,
    "usd_24h_change": 2.5,
    "usd_24h_high": 46000,
    "usd_24h_low": 44000,
    "usd_24h_vol": 1000000000
  },
  "ethereum": { ... }
}
```

**Why Proxied?** CoinGecko rate-limits at 30 calls/min (free tier). Cloudflare Worker:
- Caches responses for 60 seconds
- Returns cached data if rate-limited (HTTP 200 instead of 429)
- Shields frontend from rate-limit errors

**Rate Limit Handling:** If CoinGecko returns 429, worker serves cached data with HTTP 200, making rate-limits invisible to users

---

### 3. Hugging Face Inference API (Proxied via Cloudflare)

**Purpose:** AI-powered text summarization using BART model

**Access Method:** REST HTTP (proxied through crypto-ai-proxy.js)

**Endpoint:** `https://router.huggingface.co/hf-inference/models/facebook/bart-large-cnn`

**Request:**
```json
POST /hf-inference/models/facebook/bart-large-cnn
Headers: Authorization: Bearer hf_YOUR_SECRET_TOKEN
Body: {
  "inputs": "Current price: $45,000 (BTC)... [market context]"
}
```

**Response:**
```json
[
  {
    "summary_text": "Bitcoin shows strong bullish momentum with elevated whale activity..."
  }
]
```

**Why Proxied?** API token must never be exposed in frontend code. Cloudflare Worker:
- Retrieves token from environment secrets
- Appends token to request header server-side
- Forwards response to frontend without exposing credentials

**BART Model Details:**
- Architecture: Bidirectional Auto-Regressive Transformers
- Task: Abstractive text summarization
- Input: Market context (100-500 words)
- Output: Summary (20-50 words)

---

### 4. TinyURL API (Direct Access)

**Purpose:** URL shortening for shareable snapshot links

**Access Method:** REST HTTP (direct)

**Endpoint:** `https://tinyurl.com/api-create.php?url=LONG_URL`

**Request Example:**
```
GET https://tinyurl.com/api-create.php?url=https%3A%2F%2Fdomain.com%2F%3Fenv%3Dy%252BlPGdI8V9n...
```

**Response:** Plain text shortened URL
```
https://tinyurl.com/abcd1234
```

**Why Used?** 
- QR codes smaller for short URLs
- Easier manual sharing if needed
- No authentication required

---

### 5. QR Server API (Direct Access)

**Purpose:** Dynamic QR code image generation

**Access Method:** REST HTTP (direct image fetch)

**Endpoint:** `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=URL`

**Request Example:**
```
GET https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://tinyurl.com/abcd1234
```

**Response:** PNG image (binary)

**Image Specification:**
- Format: PNG
- Size: 180×180 pixels
- Encoding: URL-safe data
- QR version: Auto-detected

**Why Used?** 
- No backend required
- Fast, stateless generation
- High error correction

---

## Project Modules

### Frontend Module Breakdown

#### `/frontend/index.html` (58KB)

**Purpose:** Semantic HTML structure defining all UI components

**Key Sections:**

```html
<!-- Header Section -->
<header class="header">
  <h1>RT-CPIP</h1>
  <span id="currentTime">Jan 27, 2026 | 10:44 PM</span>
  <div class="connection-status">
    <span class="status-dot"></span>
    <span>Connected</span>
  </div>
</header>

<!-- Crypto Selector -->
<div class="crypto-selector">
  <button class="crypto-btn" data-symbol="BTC" data-name="Bitcoin" data-icon="₿">
    ₿ BTC
  </button>
  <!-- ... 8 more buttons -->
</div>

<!-- Price Card -->
<div class="price-card">
  <div class="current-price" id="priceDisplay">--</div>
  <div class="price-change" id="priceChange">--</div>
  <div class="price-stats">
    <div class="stat-item">
      <span class="stat-label">24h High</span>
      <span class="stat-value" id="high24h">--</span>
    </div>
    <!-- ... more stats -->
  </div>
</div>

<!-- Market Microstructure -->
<div class="panel">
  <h2 class="panel-title">Market Microstructure</h2>
  <div class="microstructure-grid">
    <div class="metric-card">
      <h3>Order Flow Imbalance</h3>
      <span id="orderFlowImbalance">--</span>
    </div>
    <!-- ... more metrics -->
  </div>
</div>

<!-- Modals -->
<div id="shareEnvModal" class="modal hidden">
  <!-- Share modal content -->
</div>

<div id="exportModal" class="modal hidden">
  <!-- Export modal content -->
</div>

<div id="jsonDecisionModal" class="modal hidden">
  <!-- JSON import confirmation modal -->
</div>
```

**DOM Selectors Used in app.js:**
```javascript
document.getElementById('priceDisplay')
document.querySelector('.crypto-btn')
document.getElementById('shareEnvModal')
// ... and many more
```

---

#### `/frontend/style.css` (54KB)

**Purpose:** Design system and responsive layout

**Key Subsystems:**

1. **CSS Custom Properties (Variables)**
   - Color palette (light/dark modes)
   - Typography scale
   - Spacing grid
   - Border radius
   - Animation timing

2. **Layout Components**
   - `.header` - Sticky navigation
   - `.crypto-selector` - 4-button mobile grid
   - `.price-card` - Main price display
   - `.panel` - Card container
   - `.modal` - Dialog boxes

3. **Responsive Breakpoints**
   ```css
   /* Default: Desktop */
   @media (max-width: 1024px) { /* Tablet */ }
   @media (max-width: 768px) { /* Mobile */ }
   ```

4. **Dark Mode Support**
   ```css
   @media (prefers-color-scheme: dark) { :root { ... } }
   [data-theme="dark"] { ... }
   ```

5. **Animation Definitions**
   ```css
   @keyframes pulse { ... }
   @keyframes fadeIn { ... }
   transition: all var(--duration-normal) var(--ease-standard);
   ```

---

#### `/frontend/app.js` (142KB)

**Purpose:** State management, WebSocket handling, UI rendering, API integration

**Major Function Groups:**

```javascript
// ========================================
// 1. STATE & INITIALIZATION
// ========================================
const state = { ... };                    // Single source of truth
const shareState = { ... };               // Share environment state
const exportState = { ... };              // Export modal state
const JSRE = { ... };                     // JSON State Restoration Engine

// ========================================
// 2. WEBSOCKET & LIVE DATA
// ========================================
function connectBinanceWebSocket() { ... }
function handleBinanceMessage(data) { ... }
function updatePriceDisplay() { ... }
function updateMarketMicrostructure(data) { ... }

// ========================================
// 3. SNAPSHOT MANAGEMENT
// ========================================
function generateSnapshot() { ... }
function validateSnapshot(snapshot) { ... }
function restoreFromSnapshot(snapshot) { ... }

// ========================================
// 4. SHARE ENVIRONMENT
// ========================================
function shareStripSensitive(snapshot) { ... }
function shareEncodeSnapshot(snapshot) { ... }
function shareDecodeSnapshot(encoded) { ... }
function generateShareableEnvironmentLink() { ... }
function openShareModal(link, snapshot) { ... }

// ========================================
// 5. EXPORT / IMPORT
// ========================================
function exportToJSON(snapshot) { ... }
function exportToPDF(snapshot) { ... }
function setupImportButton() { ... }
function showStagedLoader(options) { ... }

// ========================================
// 6. DERIVED ANALYTICS
// ========================================
function calculateVolatility(prices, period) { ... }
function calculateOrderFlowImbalance(bidVol, askVol) { ... }
function calculateBidAskSpread(bid, ask) { ... }
function detectAnomalies(symbol) { ... }

// ========================================
// 7. UI RENDERING
// ========================================
function renderAlertCenter() { ... }
function updateTimeDisplay() { ... }
function setupCryptoSelector() { ... }

// ========================================
// 8. UTILITY FUNCTIONS
// ========================================
function formatPrice(price) { ... }
function formatVolume(volume) { ... }
function addAlert(message, severity) { ... }
```

**Lines of Code Distribution:**
- State initialization: ~200 lines
- WebSocket + live data: ~800 lines
- Snapshot management: ~1200 lines
- Share environment: ~2000 lines
- Export/import: ~1500 lines
- Analytics: ~1000 lines
- UI rendering: ~1500 lines
- Utilities: ~500 lines

---

### Backend Module Breakdown

#### `/workers/coingecko-proxy.js` (2.7KB)

**Purpose:** Intelligent caching proxy for CoinGecko API

**Request Flow:**

```javascript
export default {
  async fetch(request) {
    // 1. Validate HTTP method (only GET allowed)
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    
    // 2. Parse request URL and validate parameters
    const url = new URL(request.url);
    const allowedParams = [
      'ids', 'vs_currencies', 'include_24h_change',
      'include_24h_high', 'include_24h_low', 'include_24h_vol'
    ];
    // Only allowed parameters forwarded to CoinGecko
    
    // 3. Check Cloudflare cache
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return cached;  // Serve from cache (50% of requests)
    
    // 4. Fetch from CoinGecko upstream
    let upstream = await fetch(coingeckoUrl.toString(), {
      headers: { 'User-Agent': 'CryptoView-Proxy/1.0' }
    });
    
    // 5. Handle rate-limit (429 response)
    if (upstream.status === 429) {
      const cached = await cache.match(oldCache);
      return new Response(cached, {
        status: 200,  // Hide 429 from frontend
        headers: { 'Cache-Control': 'public, max-age=30' }
      });
    }
    
    // 6. Cache successful response (60s TTL)
    if (upstream.ok) {
      await cache.put(cacheKey, upstream.clone());
    }
    
    return upstream;
  }
};
```

**Key Behaviors:**

| Scenario | Response | TTL |
|----------|----------|-----|
| Cache hit | Cached data | N/A (instant) |
| CoinGecko rate-limit | Cached data + HTTP 200 | 30s |
| CoinGecko success | Fresh data | 60s |
| CoinGecko error | Error response | N/A |

---

#### `/workers/crypto-ai-proxy.js` (1.7KB)

**Purpose:** Secure AI request relay with authentication

**Request Flow:**

```javascript
export default {
  async fetch(request) {
    // 1. Handle CORS preflight (OPTIONS)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    
    // 2. Validate HTTP method (only POST allowed)
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "POST required" }),
        { status: 405, headers: corsHeaders }
      );
    }
    
    // 3. Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    // 4. Validate prompt field exists
    const { prompt } = body;
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Missing prompt" }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    // 5. Append API token from environment secrets
    const hfResponse = await fetch(
      "https://router.huggingface.co/hf-inference/models/facebook/bart-large-cnn",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.HF_API_TOKEN}`,  // From secrets
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: prompt })
      }
    );
    
    // 6. Return response with CORS headers
    const text = await hfResponse.text();
    return new Response(text, {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
};
```

**Security Properties:**
- API token stored in Cloudflare secrets (not in code)
- Frontend never sees token
- Token appended server-side only
- CORS headers allow cross-origin requests

---

## Installation & Setup

### Prerequisites

Before installing RT-CPIP, ensure your environment meets these requirements:

1. **Modern Web Browser**
   - Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+
   - WebSocket support required
   - Clipboard API support (for copy functionality)

2. **Internet Connection**
   - Stable connection for WebSocket streaming
   - Minimum 1 Mbps recommended
   - HTTPS required (HTTP works locally only)

3. **Cloudflare Account** (for deploying workers)
   - Free tier sufficient for development
   - Paid tier recommended for production

4. **Node.js** (for worker deployment only)
   - v16+ recommended
   - npm or yarn package manager

5. **Git** (optional, for cloning repository)
   - For version control and updates

### Local Development Setup (No Workers)

For quick testing without Cloudflare Workers deployment:

**Step 1: Clone or Download Repository**
```bash
git clone https://github.com/yourusername/rt-cpip.git
cd rt-cpip
```

**Step 2: Start Local Web Server**

Using Python 3:
```bash
python3 -m http.server 8000
```

Using Node.js:
```bash
npx http-server
```

Using PHP:
```bash
php -S localhost:8000
```

**Step 3: Access Application**

Open browser and navigate to:
```
http://localhost:8000/frontend/
```

**Note:** Without Cloudflare Workers deployed:
- CoinGecko API calls will fail (due to CORS and rate-limiting)
- AI summarization will fail (missing proxy)
- Binance WebSocket will work (public API)
- Share/snapshot features will work locally

---

### Full Production Setup (With Cloudflare Workers)

For complete functionality with rate-limit shielding and AI integration:

**Step 1: Create Cloudflare Account**

1. Sign up at https://dash.cloudflare.com
2. Add your domain to Cloudflare (or use free subdomain)
3. Note your Account ID and Zone ID

**Step 2: Install Wrangler CLI**

```bash
npm install -g @cloudflare/wrangler
```

Verify installation:
```bash
wrangler --version
```

**Step 3: Authenticate Wrangler**

```bash
wrangler login
```

This opens browser to Cloudflare login. Authorize and return to terminal.

**Step 4: Create wrangler.toml Configuration**

Create `/workers/wrangler.toml`:

```toml
name = "rt-cpip-workers"
type = "javascript"
account_id = "YOUR_ACCOUNT_ID"
workers_dev = true
route = "yourdomain.com/api/*"
zone_id = "YOUR_ZONE_ID"

[env.production]
name = "rt-cpip-production"
route = "yourdomain.com/api/*"

[[env.production.routes]]
pattern = "yourdomain.com/api/*"
zone_name = "yourdomain.com"

[build]
command = "npm install"
watch_paths = ["src/**/*.js"]

[build.upload]
format = "modules"
```

Replace:
- `YOUR_ACCOUNT_ID` - From Cloudflare dashboard
- `YOUR_ZONE_ID` - From domain settings
- `yourdomain.com` - Your actual domain

**Step 5: Deploy CoinGecko Proxy**

```bash
cd workers/
wrangler publish coingecko-proxy.js --name rt-cpip-coingecko
```

Verify deployment:
```
Published ✓ rt-cpip-coingecko at:
https://rt-cpip-coingecko.your-account.workers.dev
```

**Step 6: Create Hugging Face API Secret**

1. Sign up at https://huggingface.co
2. Create API token: https://huggingface.co/settings/tokens
3. Copy token (keep secret)

**Step 7: Deploy AI Proxy with Secret**

```bash
wrangler secret put HF_API_TOKEN --name rt-cpip-ai
```

Terminal prompts:
```
Enter the secret value (it won't be echoed):
[Paste your HF token here]
```

Deploy worker:
```bash
wrangler publish crypto-ai-proxy.js --name rt-cpip-ai
```

Verify:
```
Published ✓ rt-cpip-ai at:
https://rt-cpip-ai.your-account.workers.dev
```

**Step 8: Update Frontend Configuration**

Edit `/frontend/app.js` and update API endpoints:

```javascript
// Around line 50, update proxies:

const PROXY_ENDPOINTS = {
  COINGECKO: 'https://rt-cpip-coingecko.your-account.workers.dev',
  AI: 'https://rt-cpip-ai.your-account.workers.dev'
};

// Update fetch calls:
// OLD: fetch('https://api.coingecko.com/api/v3/simple/price?...')
// NEW: fetch(PROXY_ENDPOINTS.COINGECKO + '?...')
```

**Step 9: Deploy Frontend to Hosting**

Option A: GitHub Pages
```bash
# Push /frontend folder to gh-pages branch
git subtree push --prefix frontend origin gh-pages
```

Option B: Netlify
```bash
npm install -g netlify-cli
netlify deploy --dir frontend --prod
```

Option C: Cloudflare Pages
```bash
wrangler pages publish frontend
```

**Step 10: Verify All Systems**

Open deployed frontend URL in browser:
1. Check WebSocket connection (green dot in header)
2. Prices should update in real-time
3. Click "Share" and verify QR code generates
4. Test "Summarize with AI" button
5. Export as JSON and re-import to test restoration

---

### Environment Variables

Create `.env` file (never commit to git):

```bash
# Cloudflare Credentials
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_API_TOKEN=your_api_token

# Hugging Face
HF_API_TOKEN=hf_YOUR_SECRET_TOKEN

# Application
APP_ENV=production
APP_DOMAIN=yourdomain.com
```

Add to `.gitignore`:
```
.env
.env.local
.env.production
```

**Never commit environment files.**

---

## Usage Instructions

### Starting the Application

**For Local Development:**
```bash
python3 -m http.server 8000
# Then open: http://localhost:8000/frontend/
```

**For Deployed Version:**
```
Open: https://yourdomain.com
```

Wait for initial connection. Header should show:
```
RT-CPIP | Jan 27, 2026 | 10:44 PM | ● Connected
```

Green dot indicates WebSocket connection active.

---

### Viewing Live Prices

**Step 1: Observe Initial State**

Page loads showing Bitcoin (BTC) by default:
- Large price display: `$45,000.00`
- 24h change: `+2.50%` (green if positive)
- 24h high/low, volume, and market data

Real-time updates arrive every 100-500ms from Binance WebSocket.

**Step 2: Switch Cryptocurrencies**

Click any button in the crypto selector row:
```
[₿ BTC] [Ξ ETH] [₳ ADA] [● DOT] [◆ SOL] [Ⓑ BNB] [✕ XRP] [Ð DOGE] [Ł LTC]
```

Active button highlights in teal. Dashboard instantly updates:
- Price display for selected symbol
- 24h metrics for selected symbol
- Market microstructure (order flow, volatility)
- Alerts indicating switch

---

### Analyzing Market Microstructure

**Order Flow Imbalance** (top-left metric)

Interpretation:
- `+5.2%` = Bullish (more buying pressure than selling)
- `-3.1%` = Bearish (more selling pressure than buying)
- `±10%+` = Extreme imbalance (potential reversal)

**Bid-Ask Spread** (middle metric)

Interpretation:
- `0.01%` = Tight (high liquidity, easy trading)
- `0.05%` = Normal (good liquidity)
- `0.15%+` = Wide (low liquidity, caution)

**Volume Slope** (right metric)

Interpretation:
- `+40%` = Volume surge (breakout confirmation)
- `-60%` = Volume decline (trend exhaustion)
- Small changes = Consolidation phase

---

### Viewing Volatility Metrics

Below microstructure panel, see three timeframes:

```
1h Volatility: 0.45%    (intraday trading focus)
4h Volatility: 0.62%    (swing trading focus)
24h Volatility: 1.23%   (risk management focus)
```

**Color-Coded Backgrounds:**
- Green: Low volatility (< 1%) = Calm market
- Yellow: Medium volatility (1-2%) = Normal
- Red: High volatility (> 2%) = Volatile

---

### Monitoring Alerts

Scroll down to "Alert Center" section showing chronological event log:

```
4:30 PM | ✓ Switched to Bitcoin
4:29 PM | ⚠ Volume spike detected: 2.3x average
4:28 PM | ℹ Connected to WebSocket
```

Alert colors:
- Blue = Information
- Green = Success
- Orange = Warning
- Red = Error

Alerts auto-dismiss after 8 seconds (customizable).

---

### Exporting Market Snapshots

**Step 1: Click "Export" Button**

Located in top-right corner next to settings.

Modal appears:
```
┌─────────────────────────┐
│ Export Type             │
│ ○ PDF                   │
│ ○ JSON                  │
│ ○ BOTH                  │
│ [Cancel] [Export]       │
└─────────────────────────┘
```

**Step 2: Select Export Format**

- **JSON:** Raw structured data (smallest file, 50-80KB)
- **PDF:** Styled report with charts (best for sharing)
- **BOTH:** Download JSON + PDF simultaneously

**Step 3: Click "Export"**

Files download automatically:
```
crypto-snapshot-1674825000000.json
crypto-snapshot-1674825000000.pdf
```

Popup confirms:
```
✓ Export Ready
[Download] buttons visible
Auto-closes in 8 seconds
```

---

### Sharing via Link & QR Code

**Step 1: Click "Share" Button**

Located in top-right corner.

Modal appears showing:
```
Shareable Link:
[tinyurl.com/abcd1234] [Copy] [Share]

[QR Code Image]
[Copy] [Share] [Download]

Stats:
Asset: BTC/USDT
Price: $45,000
Volatility: 1.8%
Snapshot: Jan 27, 4:30 PM
```

**Step 2: Copy Link**

Option A: Click [Copy] button
- Link copied to clipboard
- Confirmation toast: "✓ Link copied!"
- Paste in email/chat/document

Option B: Click [Share] button (iOS/Android)
- Native share sheet opens
- Share to Messages, Email, etc.

**Step 3: Share QR Code**

Option A: Click [Copy] on QR code
- QR image copied to clipboard
- Paste in documents

Option B: Click [Download] on QR code
- Downloads as PNG: `crypto-view-qr.png`
- Share as image file

**Step 4: Recipient Opens Link**

Friend clicks shared link:
```
https://tinyurl.com/abcd1234
```

Browser auto-detects snapshot in URL and shows:
```
JSON State Restore Engine
The application will display data from the snapshot

Price: $45,000
Timestamp: Jan 27, 4:30 PM

[Proceed]  [Cancel]

restore in 10 seconds...
```

- Click [Proceed] to restore immediately
- Auto-restores if no action taken (10s countdown)
- Click [Cancel] to dismiss

Application enters Restore Mode showing frozen snapshot data.

---

### Importing Historical Snapshots

**Step 1: Click "Import" Button**

Located in top-right corner.

File picker dialog opens.

**Step 2: Select Snapshot File**

Choose previously exported JSON file:
```
crypto-snapshot-1674825000000.json
```

Loading animation appears:
```
Redirecting to restore environment
Uploading snapshot file
Validating snapshot structure
Preparing secure restore session

[Circular progress bar advancing]
```

Duration: 7 seconds (for UX feedback)

**Step 3: Confirmation Dialog**

After validation succeeds:
```
JSON State Restore Engine
The application will display the data from the snapshot

Price: $45,000
Volatility: 1.8%
Imbalance: +3.2%
Timestamp: Jan 27, 4:30 PM

[Proceed]  [Cancel]

restore in 10 seconds...
```

**Step 4: Confirm Restore**

Click [Proceed] to enter Restore Mode.

Application:
- Freezes to snapshot moment
- Disables WebSocket (no live updates)
- Shows "EXIT RESTORE MODE" button (top-right)
- Locks crypto selector to available symbols
- Allows re-export and re-sharing

**Step 5: Return to Live Mode**

Click "EXIT RESTORE MODE" button:
- Re-enables WebSocket
- Returns to live price streaming
- Hides "EXIT RESTORE MODE" button
- Unlocks all crypto symbols

---

### AI-Powered Market Summarization

**Step 1: Click "Summarize with AI" Button**

Located near Alert Center (bottom section).

Processing begins silently.

**Step 2: AI Panel Appears**

Draggable sidebar slides in from right side:
```
╔════════════════════════╗
║ 🤖 AI Summary          ║
├────────────────────────┤
║ Bitcoin shows strong   ║
║ bullish momentum with  ║
║ elevated whale         ║
║ activity. Positive     ║
║ order flow imbalance   ║
║ (+3.2%) and tight      ║
║ spreads indicate       ║
║ healthy liquidity.     ║
║                        ║
║ Generated: 4:30 PM     ║
╚════════════════════════╝
```

**Step 3: Interact with Summary**

- **Drag Panel:** Click-and-drag title bar to reposition
- **Regenerate:** Click "🔄 Refresh" to generate new summary
- **Close:** Click "✕" to close panel
- **Persist:** Position saved across sessions

---

### Understanding Snapshot Quality

Snapshots display quality indicator in Share modal:

| Quality | Meaning | Age |
|---------|---------|-----|
| 🟢 FRESH | Data < 10 seconds old | Just created |
| 🟡 RECENT | Data 10-60 seconds old | From live session |
| 🔴 STALE | Data > 60 seconds old | Very old snapshot |

Quality affects confidence when sharing or analyzing historical data.

---

## Security Considerations

### Frontend Security

**No Sensitive Credentials in Frontend Code**

The frontend code (`app.js`, `index.html`, `style.css`) contains:
- ✗ No API keys
- ✗ No authentication tokens
- ✗ No secret URLs

All API calls use public endpoints or proxied endpoints.

**Data Privacy**

- **WebSocket data:** Real-time prices are public market data
- **Snapshots:** Contain only price data, no personal information
- **Share links:** Compressed snapshots embedded in URL (publicly visible if URL shared)
- **Alert history:** Only last 3 alerts stored in snapshots (sensitive data stripped)

**Local Storage Usage**

Current implementation:
- ✗ No localStorage usage (no data persisted to device)
- ✗ No IndexedDB usage (no offline database)
- ✗ No cookies (no tracking)

All data exists in memory only. Refreshing page clears all state.

---

### Backend Security (Cloudflare Workers)

**API Token Protection**

Hugging Face API token stored in Cloudflare Secrets:

```bash
wrangler secret put HF_API_TOKEN --name rt-cpip-ai
```

Token never appears in:
- Source code
- Configuration files
- Git history
- Frontend requests

Token appended server-side only:

```javascript
headers: {
  "Authorization": `Bearer ${env.HF_API_TOKEN}`
}
```

**CORS Security**

Both workers implement CORS headers:

```javascript
headers: {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
}
```

This allows requests from any origin (necessary for cross-domain frontend).

**Rate-Limit Shielding**

CoinGecko proxy detects rate-limit responses (HTTP 429) and:
1. Returns cached data (not error)
2. Sets HTTP 200 (hides rate-limit from frontend)
3. Caches response for 30 seconds

This prevents frontend from crashing when CoinGecko is overwhelmed.

---

### Deployment Security

**Environment Variable Handling**

Never commit `.env` file:

```gitignore
# .gitignore
.env
.env.local
.env.production
secrets.json
```

Cloudflare Secrets stored separately:
```bash
wrangler secret put HF_API_TOKEN
# Secrets NOT stored in code or config files
```

**HTTPS Enforcement**

All deployments must use HTTPS:
- ✓ Cloudflare Pages: Auto HTTPS
- ✓ GitHub Pages: Auto HTTPS (*.github.io)
- ✓ Netlify: Auto HTTPS
- ✗ Plain HTTP: Only for localhost development

WebSocket requires secure context (wss://, not ws://).

---

### Third-Party API Security

**Binance WebSocket**

- Public API (no authentication)
- Accepts any origin
- No personal data exposed

**CoinGecko API**

- Public API (free tier)
- Rate-limited (30 calls/min)
- No authentication required

**Hugging Face API**

- Private inference endpoint
- Requires authentication token
- Proxied via Cloudflare Workers
- Never exposed to frontend

**TinyURL / QR Server**

- Public APIs (no authentication)
- URL shortening/QR generation
- No sensitive data sent

---

### User Recommendations

**When Using RT-CPIP:**

1. **Don't Share API Tokens**
   - If deploying yourself, never share Hugging Face token
   - Keep wrangler.toml secrets private

2. **Share URLs Carefully**
   - Shared URLs contain snapshot data
   - Data is compressed but human-readable with tools
   - Avoid sharing snapshots containing sensitive analysis

3. **Use HTTPS Always**
   - Never use HTTP (except localhost)
   - Ensures data encryption in transit

4. **Monitor Cloudflare Costs**
   - Workers free tier: 100,000 requests/day
   - Hugging Face API: Check quota limits
   - Monitor usage to avoid unexpected bills

5. **Keep Dependencies Updated**
   - Regularly update npm packages
   - Monitor Cloudflare security advisories

---

## Limitations

### Current Implementation Constraints

**1. Internet Dependency**

RT-CPIP requires continuous internet connection:
- WebSocket disconnection = no live data
- Cloudflare workers unavailable = API calls fail
- No offline mode or caching mechanism

**Impact:** Users cannot use app during internet outages. Workaround: Import snapshot from last connected state.

---

**2. Third-Party API Rate Limits**

External APIs enforce rate limits:
- **CoinGecko:** 30 calls/min (free tier)
- **Hugging Face:** Quota varies by plan
- **TinyURL:** Thousands/day (effectively unlimited)
- **Binance:** No official limit but fair-use expected

**Impact:** Under heavy usage or unexpected spikes, API calls may fail. Workaround: Cloudflare caching mitigates CoinGecko limits (60s cache).

---

**3. Snapshot Size Constraints**

Snapshots limited to ~50-80KB JSON size before compression:
- Compression ratio: ~67% (50KB → 15KB)
- URL length limits: ~8000 characters (browser dependent)
- Very large snapshots (~200KB+) cannot share via URL

**Impact:** Users cannot share extremely large alert histories. Workaround: JSON export/import for large snapshots.

---

**4. Limited Cryptocurrency Coverage**

Only 9 cryptocurrencies supported:
- BTC, ETH, ADA, DOT, SOL, BNB, XRP, DOGE, LTC

**Impact:** Users cannot track other coins. Workaround: Modify `cryptoMapping` object in app.js to add more Binance streams.

---

**5. No Persistent Storage**

Application state stored in memory only:
- Page refresh = all data lost
- No localStorage persistence
- No database backend

**Impact:** Users must re-import snapshots after page refresh. Workaround: Use "Export" feature to save snapshots before closing.

---

**6. No User Accounts**

No authentication or user system:
- No login/password
- No cloud sync across devices
- All data local to browser

**Impact:** Snapshots not synced to other devices. Workaround: Manually share snapshots via JSON files.

---

**7. AI Summarization Limitations**

Hugging Face BART model produces abstractive summaries:
- May hallucinate facts not in prompt
- Quality depends on prompt engineering
- Rate-limited by Hugging Face quota
- Generated summaries are suggestions only (not financial advice)

**Impact:** Summaries may be inaccurate for extreme market conditions. Workaround: Always verify summaries against raw metrics.

---

**8. Mobile UX Limitations**

While responsive, some features suboptimal on mobile:
- Small touch targets on crypto selector
- Modals may cover content on small screens
- Draggable AI panel difficult on touch
- Typing URLs from QR links manual

**Impact:** Desktop usage recommended for complex workflows. Workaround: Use shared QR codes instead of typing links.

---

**9. Browser Compatibility**

Requires modern browser features:
- WebSocket support
- Fetch API
- CSS Grid
- ES6 JavaScript

**Impact:** Older browsers (IE11) not supported. Workaround: Use Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+.

---

**10. No Real-Time Alerts**

Dashboard does not send notifications:
- No push notifications
- No sound alerts
- No email alerts

**Impact:** Users must actively watch dashboard for important price movements. Workaround: Enable browser notifications (future feature).

---

## Future Enhancements

### High-Priority Features

**1. Persistent Storage & Sync**

Implement browser storage with cloud sync:
- Use IndexedDB for local snapshots (unlimited storage)
- Sync via Firebase or custom backend
- Enable cross-device access
- **Why:** Users lose work on page refresh; persistent storage solves this

---

**2. Additional Cryptocurrency Support**

Expand beyond current 9 coins:
- Add user-selectable coin list (100+ coins)
- Dynamic Binance stream subscription
- Store preferences in localStorage
- **Why:** Many traders need coins outside top 9; limits platform utility

---

**3. Real-Time Alerts & Notifications**

Implement triggered alerts on price movements:
- User sets price thresholds (e.g., "Alert if BTC > $50k")
- Browser push notifications when triggered
- Sound alerts with custom audio
- Email alerts to user address
- **Why:** Users cannot monitor dashboard 24/7; alerts enable passive monitoring

---

**4. Advanced Technical Indicators**

Calculate additional metrics:
- Moving averages (SMA, EMA)
- Relative Strength Index (RSI)
- MACD, Bollinger Bands
- Support/resistance levels
- **Why:** Traders use these indicators for decision-making; current metrics limited

---

**5. Multi-User Collaboration**

Enable team features:
- User accounts with authentication
- Share snapshots with specific users
- Comments and annotations on snapshots
- Shared workspace with chat
- **Why:** Institutional traders work in teams; solo tool limits adoption

---

**6. Advanced AI Features**

Expand AI capabilities:
- Custom summarization prompts (user templates)
- Multi-language summaries
- Sentiment analysis (bullish/bearish/neutral)
- Predictive analytics (model suggests next move)
- **Why:** Different users need different AI contexts; flexibility needed

---

**7. Data Export Formats**

Support additional export formats:
- CSV (for Excel analysis)
- XLSX (formatted spreadsheet)
- GraphQL data export
- API access for programmatic retrieval
- **Why:** Analysts integrate data into other tools; multiple formats needed

---

**8. Historical Backtesting**

Replay past market data:
- Import multiple snapshots
- Timeline scrubber to navigate history
- Compare indicators across time periods
- Test trading strategies on historical data
- **Why:** Traders optimize strategies; backtesting essential for decision confidence

---

**9. Mobile Native App**

Develop iOS/Android applications:
- React Native or Flutter implementation
- Push notifications
- Offline mode with local data
- App store distribution
- **Why:** Most users access on mobile; native app better UX than web

---

**10. Webhook Integrations**

Connect to external systems:
- Slack notifications (price alerts to team channels)
- Discord bots (alerts to trading communities)
- Zapier integration (connect to hundreds of apps)
- Custom webhook handlers
- **Why:** Integrations enable workflow automation; expands platform reach

---

## License

This project is licensed under the **MIT License**.

**MIT License Summary:**

You are free to:
- ✓ Use commercially
- ✓ Modify source code
- ✓ Distribute modified versions
- ✓ Sublicense

Conditions:
- Include license and copyright notice
- State significant changes made
- Provide license copy with distributions

Limitations:
- ✗ Not liable for damages
- ✗ No warranty provided
- ✗ No trademark use

**Full License Text:**

See `LICENSE` file in repository root.

---

## Acknowledgements & References

### Referenced Technologies

- **Binance API Documentation:** https://binance-docs.github.io/apidocs/
- **Cloudflare Workers:** https://developers.cloudflare.com/workers/
- **Hugging Face:** https://huggingface.co/
- **CoinGecko API:** https://www.coingecko.com/api/documentations/v3
- **LZString Compression:** https://github.com/pieroxy/lz-string
- **QRCode.js:** https://davidsharp.github.io/QRCode.js/

### Technical Inspiration

- Financial market microstructure analysis patterns
- Redux-style single state management
- Snapshot serialization patterns (Redux persist)
- Cloudflare Workers rate-limit shielding patterns

### Educational Resources

- **Market Microstructure:** "Microstructure of Financial Markets" - Madhavan
- **WebSocket Real-Time Data:** MDN Web Docs WebSocket API
- **CSS Design Systems:** "System Design" - Atomic Design by Brad Frost
- **State Management:** Redux documentation and patterns

---

## Contributing

### Code of Conduct

Contributors are expected to:
- Be respectful and inclusive
- Provide constructive feedback
- Follow commit message conventions
- Test code before submitting

### Contribution Process

**Step 1: Fork Repository**
```bash
git clone https://github.com/yourusername/rt-cpip.git
cd rt-cpip
```

**Step 2: Create Feature Branch**
```bash
git checkout -b feature/add-moving-averages
```

Branch naming convention:
- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Code improvements

**Step 3: Make Changes**

Coding standards:
- Use meaningful variable names
- Add comments for complex logic
- Follow existing indentation style (2 spaces)
- Test thoroughly before commit

**Step 4: Commit Changes**
```bash
git commit -m "feat: add moving average indicator

- Implement SMA calculation for 20/50/200 periods
- Display on price chart with color differentiation
- Add settings panel for period customization"
```

Commit message format:
```
type(scope): description

body (optional)
- Detailed explanation
- Multiple points as needed

footer (optional)
Closes #123
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Step 5: Push to Fork**
```bash
git push origin feature/add-moving-averages
```

**Step 6: Submit Pull Request**

1. Open GitHub pull request
2. Title: "Add moving average indicators"
3. Description:
   ```
   ## Description
   Implement technical indicators for trend analysis.
   
   ## Related Issue
   Closes #42
   
   ## Changes
   - Adds SMA (20, 50, 200 periods)
   - Displays on price chart
   - Settings panel for customization
   
   ## Testing
   - Tested on BTC, ETH data
   - Verified calculations match TA-Lib
   - No performance regression
   ```

4. Request reviews
5. Address review comments

---

### Testing Checklist

Before submitting PR:

- [ ] Code runs without errors
- [ ] No console warnings or errors
- [ ] Works on Chrome, Firefox, Safari
- [ ] Mobile responsive tested
- [ ] No API secrets in code
- [ ] Comments added for complex logic
- [ ] Commit messages follow conventions
- [ ] No unrelated changes included

---

### Areas Needing Help

High-value contributions:

1. **Mobile Optimization** - Improve touch UX on small screens
2. **Additional Indicators** - Implement RSI, MACD, Bollinger Bands
3. **Tests** - Add unit tests for calculation functions
4. **Documentation** - Improve README, add tutorials
5. **Accessibility** - Improve ARIA labels, keyboard navigation
6. **Performance** - Optimize large data rendering
7. **Localization** - Add multi-language support
8. **Browser Compatibility** - Test and fix older browser issues

---

**Thank you for contributing to RT-CPIP!**

---

**Last Updated:** January 27, 2026  
**Repository:** https://github.com/yourusername/rt-cpip  
**Issues:** https://github.com/yourusername/rt-cpip/issues  
**Discussions:** https://github.com/yourusername/rt-cpip/discussions

---

<p align="center">
 <!-- Contact & Immediate Reach -->
<a href="mailto:ajithramesh2020@gmail.com">
  <img src="https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white"/>
</a>

<a href="tel:+919345264522">
  <img src="https://img.shields.io/badge/Call%20Me-0A66C2?style=for-the-badge&logo=phone&logoColor=white"/>
</a>

<a href="https://wa.me/9345264522">
  <img src="https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white"/>
</a>

<!-- Professional Identity -->
<a href="https://www.linkedin.com/in/ajith-ramesh-data-analyst/">
  <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white"/>
</a>

<a href="https://ajith-data-analyst.github.io/Portfolio/Ajith_R_Resume.pdf">
  <img src="https://img.shields.io/badge/Resume-4CAF50?style=for-the-badge&logo=googledrive&logoColor=white"/>
</a>

<!-- Work Proof -->
<a href="https://ajith-data-analyst.github.io/Portfolio/home.html">
  <img src="https://img.shields.io/badge/Portfolio-FF6B6B?style=for-the-badge&logo=web&logoColor=white"/>
</a>

<a href="https://github.com/Ajith-data-analyst">
  <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white"/>
</a>
</p>
<div align="center">

  
*Built with precision, powered by data, designed for clarity.*  
<a href="https://github.com/Ajith-data-analyst/crypto_view/blob/main/LICENSE.txt">
  *© 2025 Crypto View Project. All rights reserved under MIT License.*
</a>

</div>



<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=100&section=footer"/>
</p>


