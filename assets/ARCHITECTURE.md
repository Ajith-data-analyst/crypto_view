# RT-CPIP System Architecture

Detailed architectural documentation for RT-CPIP (Real-Time Cryptocurrency Insights Platform).

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Flow Diagrams](#data-flow-diagrams)
3. [Component Interaction](#component-interaction)
4. [State Management](#state-management)
5. [API Integration Pattern](#api-integration-pattern)
6. [Snapshot Serialization](#snapshot-serialization)
7. [Share Environment System](#share-environment-system)
8. [Deployment Architecture](#deployment-architecture)

---

## Architecture Overview

RT-CPIP follows a **tri-layer serverless architecture**:

```
┌─────────────────────────────────────────────────────┐
│ LAYER 1: FRONTEND (Browser)                         │
│ ├─ index.html (Semantic structure)                  │
│ ├─ style.css (Design system + responsive layout)    │
│ └─ app.js (State mgmt + business logic)             │
└─────────────────────────────────────────────────────┘
                        ↑ ↓ (HTTP/WebSocket)
┌─────────────────────────────────────────────────────┐
│ LAYER 2: BACKEND (Cloudflare Workers)               │
│ ├─ coingecko-proxy.js (Caching + rate-limit shield) │
│ └─ crypto-ai-proxy.js (Secure token relay)          │
└─────────────────────────────────────────────────────┘
                        ↑ ↓ (REST/WebSocket)
┌─────────────────────────────────────────────────────┐
│ LAYER 3: EXTERNAL SERVICES                          │
│ ├─ Binance WebSocket (Price streams)                │
│ ├─ CoinGecko API (Supplementary data)               │
│ ├─ Hugging Face (AI summarization)                  │
│ ├─ TinyURL (URL shortening)                         │
│ └─ QR Server (QR code generation)                   │
└─────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Real-Time Price Update Flow

```
Binance WebSocket Stream
┌─────────────────────────────────────┐
│ { price: 45100, bid: 45099, ... }   │
└──────────────┬──────────────────────┘
               │ (incoming message)
               ↓
connectBinanceWebSocket() Handler
┌──────────────────────────────────────────────────────┐
│ 1. Parse WebSocket data                              │
│ 2. Extract: price, bid, ask, volume                  │
│ 3. Update: state.priceData[currentSymbol]            │
│ 4. Recalculate derived analytics:                    │
│    ├─ Volatility (1h, 4h, 24h)                       │
│    ├─ Order flow imbalance                           │
│    ├─ Bid-ask spread                                 │
│    ├─ Volume slope                                   │
│    └─ Anomaly detection                              │
│ 5. Update: state.lastUpdateTime = Date.now()         │
│ 6. Increment: state.dataPointsCount++                │
└─────────────┬────────────────────────────────────────┘
              │
              ↓
    UI Rendering Functions
┌──────────────────────────────────────────────────────┐
│ updatePriceDisplay()                                 │
│ ├─ Format: $45,100.00                                │
│ ├─ Color: Green if positive change                   │
│ └─ Update: DOM #priceDisplay                         │
│                                                      │
│ updateMarketMicrostructure()                         │
│ ├─ Order flow imbalance: +3.2%                       │
│ ├─ Bid-ask spread: 0.05%                             │
│ └─ Volume slope: +12%                                │
│                                                      │
│ updateVolatilityMetrics()                            │
│ ├─ 1h: 0.45% (green background)                      │
│ ├─ 4h: 0.62% (yellow background)                     │
│ └─ 24h: 1.23% (red background)                       │
│                                                      │
│ renderAlertCenter()                                  │
│ └─ Add: "Price updated to $45,100"                   │
└─────────────┬────────────────────────────────────────┘
              │
              ↓
    Browser DOM Updated
┌──────────────────────────────────────────────────────┐
│ User sees real-time dashboard                        │
│ All metrics live-updating every 100-500ms            │
└──────────────────────────────────────────────────────┘
```

### Snapshot Export & Share Flow

```
User clicks "Share" Button
        ↓
generateSnapshot()
┌──────────────────────────────────────────┐
│ Serialize entire state object:           │
│ ├─ applicationState (all state vars)     │
│ ├─ priceData[all 9 symbols]              │
│ ├─ derivedAnalytics[all 9 symbols]       │
│ ├─ metadata:                             │
│ │  ├─ snapshotTime: ISO timestamp        │
│ │  ├─ snapshotQuality: FRESH|RECENT      │
│ │  ├─ sessionDuration: milliseconds      │
│ │  ├─ dataPointsCollected: number        │
│ │  └─ alerts: last 3 items               │
│ └─ Result: 50-80KB JSON object           │
└──────────────┬───────────────────────────┘
               ↓
shareStripSensitive()
┌──────────────────────────────────────────┐
│ Remove sensitive information:            │
│ ├─ Discard full alert history            │
│ ├─ Keep only last 3 alerts               │
│ ├─ Add share metadata:                   │
│ │  ├─ sharedBy: "client"                 │
│ │  ├─ shareCreatedAt: ISO timestamp      │
│ │  └─ shareVersion: "1.0"                │
│ └─ Result: ~65KB cleaned snapshot        │
└──────────────┬───────────────────────────┘
               ↓
shareEncodeSnapshot()
┌──────────────────────────────────────────┐
│ Compress using LZString:                 │
│ 1. JSON.stringify(snapshot)              │
│    → 65KB text string                    │
│ 2. LZString.compressToEncodedURIComponent()
│    → Replace repeated patterns           │
│    → Result: URL-safe string             │
│ 3. Compression: 65KB → 20-25KB (67%)     │
│    (JSON is highly compressible)         │
└──────────────┬───────────────────────────┘
               ↓
generateShareableLink()
┌──────────────────────────────────────────┐
│ 1. Build full URL:                       │
│    domain.com/?env=y%2BlPGdI8V9n...      │
│    (20-25KB embedded in hash)            │
│ 2. POST to TinyURL API:                  │
│    https://tinyurl.com/api-create.php   │
│ 3. Receive shortened URL:                │
│    https://tinyurl.com/abcd1234          │
│ 4. Generate QR code image URL:           │
│    api.qrserver.com/...&data=tinyurl...  │
└──────────────┬───────────────────────────┘
               ↓
openShareModal()
┌──────────────────────────────────────────┐
│ Display in modal:                        │
│                                          │
│ Share Link:                              │
│ [tinyurl.com/abcd1234] [Copy] [Share]   │
│                                          │
│ [QR Code Image]                          │
│ [Copy] [Share] [Download]                │
│                                          │
│ Stats:                                   │
│ BTC/USDT | $45,000                       │
│ Volatility: 1.8%                         │
│ Timestamp: Jan 27, 4:30 PM               │
│                                          │
│ [Exit Restore Mode] (if applicable)      │
└──────────────┬───────────────────────────┘
               ↓
User Actions Available
┌──────────────────────────────────────────┐
│ ✓ Copy link → Clipboard                  │
│ ✓ Share via native (iOS/Android)         │
│ ✓ Copy QR → Clipboard                    │
│ ✓ Download QR → PNG file                 │
│ ✓ Share QR via native                    │
└──────────────────────────────────────────┘
```

### Snapshot Restoration Flow

```
Recipient opens shared link
https://tinyurl.com/abcd1234
        ↓
Browser redirects to full URL
domain.com/?env=y%2BlPGdI8V9n...
        ↓
URL hash parsed
window.location.hash = "#env=COMPRESSED_DATA"
        ↓
shareDecodeSnapshot()
┌──────────────────────────────────────────┐
│ 1. Extract hash parameter: COMPRESSED_DATA
│ 2. LZString.decompressFromEncodedURIComponent()
│    → Expand compressed string             │
│    → Result: 65KB JSON text               │
│ 3. JSON.parse()                           │
│    → Convert to JavaScript object         │
│ 4. validateSnapshot()                     │
│    ├─ Check: version exists               │
│    ├─ Check: snapshot.snapshot exists     │
│    ├─ Check: required fields present      │
│    ├─ Check: priceData structure valid    │
│    └─ Check: derivedAnalytics structure   │
│ 5. Return: snapshot object or null        │
└──────────────┬───────────────────────────┘
               ↓
showJsonModal()
┌──────────────────────────────────────────┐
│ Display confirmation dialog:             │
│                                          │
│ JSON State Restore Engine                │
│ Restore this snapshot?                   │
│                                          │
│ Price: $45,000 (BTC/USDT)               │
│ Volatility: 1.8%                         │
│ Timestamp: Jan 27, 4:30 PM               │
│                                          │
│ [Proceed]  [Cancel]                      │
│                                          │
│ restore in 10 seconds...                 │
│ (auto-proceeds if no action)             │
└──────────────┬───────────────────────────┘
               ↓
User decides (Proceed or Cancel or timer)
        ↓
restoreFromSnapshot()
┌──────────────────────────────────────────┐
│ 1. Set flags:                            │
│    ├─ state.isRestoreMode = true         │
│    ├─ state.restoreSnapshot = snapshot   │
│    └─ state.restoredFromLink = true      │
│                                          │
│ 2. Copy snapshot data to state:          │
│    ├─ state.currentSymbol                │
│    ├─ state.currentName                  │
│    ├─ state.priceData (from snapshot)    │
│    ├─ state.derivedAnalytics (snapshot)  │
│    └─ state.alerts (last 3)              │
│                                          │
│ 3. Disable live updates:                 │
│    ├─ if (state.ws) state.ws.close()     │
│    ├─ state.ws = null                    │
│    └─ No more incoming price data        │
│                                          │
│ 4. Lock crypto selector:                 │
│    └─ Only allow symbols in snapshot     │
│                                          │
│ 5. Update UI:                            │
│    ├─ updatePriceDisplay()               │
│    ├─ updateMicrostructureFromSnapshot() │
│    ├─ updateVolatilityFromSnapshot()     │
│    ├─ updateRiskIndicatorsFromSnapshot() │
│    ├─ showExitRestoreModeButton()        │
│    └─ updateTimeToSnapshotTime()         │
│                                          │
│ 6. Add alert:                            │
│    "Restored from snapshot (Jan 27, 4:30 PM)" │
└──────────────┬───────────────────────────┘
               ↓
Application in Restore Mode
┌──────────────────────────────────────────┐
│ ✓ UI frozen to snapshot moment           │
│ ✓ Time shows snapshot timestamp          │
│ ✓ Prices show snapshot prices (immutable)│
│ ✓ Metrics show snapshot analytics        │
│ ✓ "Exit Restore Mode" button visible     │
│ ✓ Crypto selector locked to snapshot     │
│ ✓ Can export/reshare snapshot            │
└──────────────────────────────────────────┘
```

---

## Component Interaction

### State Management Architecture

The application uses a **single source of truth** pattern:

```javascript
const state = {
  // === Display Context ===
  currentSymbol: 'BTC',              // Currently displayed symbol
  currentName: 'Bitcoin',
  currentIcon: '₿',
  
  // === Network ===
  ws: null,                          // WebSocket connection ref
  
  // === Market Data (Real-time or Snapshot) ===
  priceData: {
    BTC: {
      price: 45000,
      change24h: 2.5,
      volume: 1000000,
      high24h: 46000,
      low24h: 44000,
      bidPrice: 44999.50,
      askPrice: 45000.50,
      bidVolume: 5.2,
      askVolume: 4.8
    },
    // ... 8 more symbols
  },
  
  // === Derived Analytics ===
  derivedAnalytics: {
    BTC: {
      volatility1h: 0.45,
      volatility4h: 0.62,
      volatility24h: 1.23,
      orderFlowImbalance: 3.2,
      bidAskImbalance: 0.05,
      volumeSlope: 12.5,
      anomalies: []
    },
    // ... 8 more symbols
  },
  
  // === Session Tracking ===
  startTime: 1674820200000,
  dataPointsCount: 2847,
  lastUpdateTime: 1674825000000,
  
  // === User Alerts ===
  alerts: [
    { id, message, severity, timestamp, read }
  ],
  
  // === UI Preferences ===
  theme: 'light',
  currency: 'USDT',
  usdtToInrRate: 83.5,
  lastLivePrice: 45000,
  
  // === Mode Flags ===
  isRestoreMode: false,
  restoreSnapshot: null,
  restoredFromLink: false
};
```

### Component Dependency Graph

```
state (Single Source of Truth)
├── updatePriceDisplay()
│   ├─ Formats: formatPrice()
│   ├─ Colors: formatChange()
│   └─ Updates: DOM #priceDisplay
│
├── updateMarketMicrostructure()
│   ├─ calculateOrderFlowImbalance()
│   ├─ calculateBidAskSpread()
│   ├─ calculateVolumeSlope()
│   └─ updateMicrostructureFromSnapshot()
│
├── updateVolatilityMetrics()
│   ├─ calculateVolatility()
│   └─ updateVolatilityFromSnapshot()
│
├── renderAlertCenter()
│   ├─ formatAlert()
│   ├─ addAlert()
│   └─ Updates: DOM .alert-center
│
├── setupCryptoSelector()
│   ├─ updatePriceDisplay() (on switch)
│   ├─ updateMarketMicrostructure() (on switch)
│   └─ detectAnomalies() (on switch)
│
└── generateSnapshot()
    ├─ Captures entire state
    ├─ shareStripSensitive()
    ├─ shareEncodeSnapshot()
    └─ generateShareableLink()
```

---

## State Management

### Tri-Modal State Machine

```
┌─────────────────────┐
│   LIVE MODE         │
├─────────────────────┤
│ isRestoreMode: false│
│ ws: [connected]     │
│ Updates: real-time  │
│ Price: live streams │
│ Metrics: recalc'd   │
│                     │
│ Actions:            │
│ ├─ Export snapshot  │
│ ├─ Share link       │
│ └─ Summarize AI     │
└────────┬────────────┘
         │
    [Import]
         ↓
┌─────────────────────┐
│  RESTORE MODE       │
├─────────────────────┤
│ isRestoreMode: true │
│ ws: null [closed]   │
│ Updates: none       │
│ Price: snapshot     │
│ Metrics: snapshot   │
│                     │
│ Actions:            │
│ ├─ Exit restore     │
│ ├─ Re-export        │
│ └─ Re-share         │
└────────┬────────────┘
         │
    [Exit]
         ↓
┌─────────────────────┐
│   LIVE MODE         │
│ (resumed)           │
└─────────────────────┘

┌─────────────────────────────────────┐
│  SHARE MODE (subset of Restore)     │
├─────────────────────────────────────┤
│ restoredFromLink: true              │
│ Same as RESTORE MODE but:           │
│ └─ Modal title: "Engine β (Restored)"
└─────────────────────────────────────┘
```

---

## API Integration Pattern

### Request-Response Cycle

```
Frontend Request
├─ Direct APIs (Public, no auth):
│  ├─ Binance WebSocket (wss://stream.binance.com)
│  ├─ TinyURL API (https://tinyurl.com)
│  └─ QR Server API (https://api.qrserver.com)
│
└─ Proxied APIs (via Cloudflare Workers):
   ├─ CoinGecko (via coingecko-proxy.js)
   │  ├─ Check Cloudflare cache (60s TTL)
   │  ├─ If miss: fetch from CoinGecko
   │  ├─ If 429: return cached + HTTP 200
   │  └─ If success: cache + return data
   │
   └─ Hugging Face (via crypto-ai-proxy.js)
      ├─ Receive market context prompt
      ├─ Append API token from secrets
      ├─ Forward to Hugging Face
      └─ Return summary text
```

### Error Handling Pattern

```
API Call Attempt
        ↓
┌─────────────────┐
│ Success (200)   │ → Return data, update state
└─────────────────┘
        
        OR
        
┌─────────────────┐
│ Rate-Limit (429)│ → (Coingecko only)
├─────────────────┤    Return cached data
│ Special Handler │ → HTTP 200 (hide error)
│ (Coingecko)     │ → Cache for 30s
└─────────────────┘

        OR

┌─────────────────┐
│ Failure (4xx/5xx)
├─────────────────┤
│ Add alert:      │
│ "API Error"     │
├─────────────────┤
│ Continue with   │
│ existing data   │
└─────────────────┘
```

---

## Snapshot Serialization

### Snapshot Object Structure

```json
{
  "version": "1.0",
  "snapshot": {
    "applicationState": {
      "currentSymbol": "BTC",
      "currentName": "Bitcoin",
      "currentIcon": "₿",
      "theme": "light",
      "currency": "USDT",
      "usdtToInrRate": 83.5,
      "startTime": 1674820200000,
      "dataPointsCount": 2847,
      "lastUpdateTime": 1674825000000
    },
    
    "priceData": {
      "BTC": {
        "price": 45000,
        "change24h": 2.5,
        "volume": 1000000,
        "high24h": 46000,
        "low24h": 44000,
        "bidPrice": 44999.50,
        "askPrice": 45000.50,
        "bidVolume": 5.2,
        "askVolume": 4.8
      },
      "ETH": { ... },
      // ... 7 more symbols
    },
    
    "derivedAnalytics": {
      "BTC": {
        "volatility1h": 0.45,
        "volatility4h": 0.62,
        "volatility24h": 1.23,
        "orderFlowImbalance": 3.2,
        "bidAskImbalance": 0.05,
        "volumeSlope": 12.5,
        "anomalies": [
          {
            "type": "WHALE_ACTIVITY",
            "severity": "INFO",
            "timestamp": 1674825000000
          }
        ]
      },
      "ETH": { ... },
      // ... 7 more symbols
    },
    
    "metadata": {
      "snapshotTime": "2026-01-27T16:30:00.000Z",
      "snapshotQuality": "FRESH",
      "sessionDuration": 3600000,
      "dataPointsCollected": 2847,
      "alerts": [
        {
          "id": "a1",
          "message": "Switched to Bitcoin",
          "severity": "info",
          "timestamp": 1674825000000,
          "read": false
        }
        // ... last 2 alerts (max 3)
      ],
      "sharedBy": "client",
      "shareCreatedAt": "2026-01-27T16:35:00.000Z",
      "shareVersion": "1.0"
    }
  }
}
```

### Compression Efficiency

```
Uncompressed JSON: 65-80 KB

Why so compressible?
├─ Repeated keys ("BTC", "price", "volatility1h", ...)
├─ Repeated numeric values (multiple 0.45, 2.5 values)
├─ Repeated structure (9 symbols × same fields)
└─ ISO timestamp patterns (many timestamps)

LZString compression:
├─ Finds repeated patterns
├─ Replaces with 2-3 char codes
├─ Encodes to URI-safe characters
└─ Result: 20-25 KB (67% compression ratio)

URL encoding:
├─ domain.com/?env=y%2BlPGdI8V9n...
├─ Total URL length: 25-30 KB
└─ Fits within browser URL limits (8000+ chars)

Comparison:
├─ Raw JSON: 65-80 KB (won't fit in URL)
├─ Compressed: 20-25 KB (fits in URL easily)
├─ TinyURL: 40 chars (ultra-shareable)
└─ QR Code: Encodes TinyURL (small QR)
```

---

## Share Environment System

### Sharing Workflow Diagram

```
          SENDER
┌──────────────────────────────┐
│ Viewing live market data     │
└────────────┬─────────────────┘
             │
        [Share Button]
             │
             ↓
┌──────────────────────────────┐
│ generateSnapshot()           │
│ Serialize entire state       │
│ Result: 65-80 KB snapshot    │
└────────────┬─────────────────┘
             │
             ↓
┌──────────────────────────────┐
│ shareStripSensitive()        │
│ Remove full alert history    │
│ Keep last 3 alerts only      │
│ Result: ~65 KB cleaned       │
└────────────┬─────────────────┘
             │
             ↓
┌──────────────────────────────┐
│ shareEncodeSnapshot()        │
│ Compress + encode            │
│ Result: 20-25 KB URL-safe    │
└────────────┬─────────────────┘
             │
             ↓
┌──────────────────────────────┐
│ generateShareableLink()      │
│ Build URL, shorten, QR       │
│ Result: tinyurl.com/abcd1234 │
└────────────┬─────────────────┘
             │
             ↓
┌──────────────────────────────┐
│ openShareModal()             │
│ Display link + QR + stats    │
│ User can copy/share/download │
└────────────┬─────────────────┘
             │
        [Send Link]
             │
             ↓

          RECIPIENT
┌──────────────────────────────┐
│ Receives link (chat/email)   │
│ Clicks link or scans QR      │
└────────────┬─────────────────┘
             │
             ↓
┌──────────────────────────────┐
│ Browser opens URL            │
│ Hash contains compressed data│
└────────────┬─────────────────┘
             │
             ↓
┌──────────────────────────────┐
│ shareDecodeSnapshot()        │
│ Decompress from URL hash     │
│ Parse JSON                   │
│ Result: snapshot object      │
└────────────┬─────────────────┘
             │
             ↓
┌──────────────────────────────┐
│ showJsonModal()              │
│ Ask: "Restore this snapshot?"│
│ Show stats + countdown       │
│ Auto-restore after 10s       │
└────────────┬─────────────────┘
             │
      [Proceed or timeout]
             │
             ↓
┌──────────────────────────────┐
│ restoreFromSnapshot()        │
│ Enter Restore Mode           │
│ UI frozen to sender's moment │
└──────────────────────────────┘
```

---

## Deployment Architecture

### Production Deployment Stack

```
┌─────────────────────────────────────────────────────┐
│ DOMAIN: yourdomain.com                              │
│ (Managed by Cloudflare or your registrar)           │
└──────────────┬──────────────────────────────────────┘
               │
         ┌─────┴──────┬──────────────┐
         │            │              │
         ↓            ↓              ↓
    ┌─────────┐ ┌──────────┐  ┌──────────────┐
    │ Frontend │ │ Workers  │  │ Worker Env   │
    │ Assets   │ │ Routes   │  │ Secrets      │
    └─────────┘ └──────────┘  └──────────────┘
         │            │              │
         ├───────────┐├──────────────┤
         │           ││              │
         ↓           ↓↓              ↓
    ┌──────────────────────────────────────────────┐
    │ Cloudflare Global Network                    │
    │ ├─ Edge locations (200+)                     │
    │ ├─ Cache (Cloudflare Cache API)              │
    │ └─ Workers (Serverless execution)            │
    └────────────┬─────────────────────────────────┘
                 │
         ┌───────┼────────┬────────────┐
         │       │        │            │
         ↓       ↓        ↓            ↓
    ┌────────┐ ┌──────┐ ┌──────┐ ┌──────────┐
    │Binance │ │Coin  │ │HF    │ │TinyURL / │
    │WS      │ │Gecko │ │API   │ │QR Server │
    └────────┘ └──────┘ └──────┘ └──────────┘
```

### Deployment Steps

```
1. FRONTEND DEPLOYMENT
   ├─ Build: frontend/ directory ready
   ├─ Deploy: To hosting (Netlify / Cloudflare Pages)
   └─ URL: https://yourdomain.com

2. WORKER DEPLOYMENT
   ├─ coingecko-proxy.js
   │  ├─ wrangler publish
   │  └─ URL: https://rt-cpip-coingecko.workers.dev
   │
   └─ crypto-ai-proxy.js
      ├─ wrangler secret put HF_API_TOKEN
      ├─ wrangler publish
      └─ URL: https://rt-cpip-ai.workers.dev

3. CONFIGURATION
   ├─ Update frontend app.js with worker URLs
   ├─ Configure CORS in workers
   └─ Test all endpoints

4. VERIFICATION
   ├─ ✓ Frontend loads
   ├─ ✓ WebSocket connects (green dot)
   ├─ ✓ Prices stream live
   ├─ ✓ Share link generates
   ├─ ✓ AI summarization works
   └─ ✓ Snapshot import/export works
```

---

**Last Updated:** January 27, 2026
