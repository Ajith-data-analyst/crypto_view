# CRYPTO VIEW  - API REFERENCE

Complete API documentation for RT-CPIP (Real-Time Cryptocurrency Insights Platform).

[![GitHub Repository](https://img.shields.io/badge/📂_GITHUB_REPOSITORY-Crypto_View-black?style=for-the-badge&logo=github)](https://github.com/Ajith-data-analyst/crypto_view)
[![MIT License](https://img.shields.io/badge/📜_License-MIT-green?style=for-the-badge)](https://github.com/Ajith-data-analyst/crypto_view/blob/main/LICENSE.txt)
[![Built with Web Technologies](https://img.shields.io/badge/🔧_Built_with-HTML/CSS/JS-orange?style=for-the-badge)](https://developer.mozilla.org)

---

<p align="center">
  <a href="https://ajith-data-analyst.github.io/crypto_view/">
    <img src="https://img.shields.io/badge/VIEW_LIVE_PROJECT-Crypto_View-blue?style=for-the-badge&logo=github"/>
  </a>
</p>

---

## Table of Contents

1. [Overview](#overview)
2. [Direct APIs (Public)](#direct-apis-public)
3. [Proxied APIs (Via Cloudflare Workers)](#proxied-apis-via-cloudflare-workers)
4. [Internal JavaScript API](#internal-javascript-api)
5. [Error Handling](#error-handling)
6. [Rate Limits](#rate-limits)
7. [Authentication](#authentication)

---

## Overview

RT-CPIP integrates with five external APIs across two access patterns:

### Direct APIs (No Proxy)
These are public APIs accessed directly from the browser with no authentication:
- Binance WebSocket
- TinyURL API
- QR Server API

### Proxied APIs (Via Cloudflare Workers)
These APIs are accessed through Cloudflare Workers for authentication, caching, or security:
- CoinGecko REST API (via coingecko-proxy.js)
- Hugging Face Inference API (via crypto-ai-proxy.js)

---

## Direct APIs (Public)

### 1. Binance WebSocket

**Purpose:** Real-time price streaming at tick granularity

**Endpoint:** `wss://stream.binance.com:9443/ws/{stream_name}`

**Authentication:** Not required (public API)

**Supported Symbols:**
```
btcusdt   Bitcoin / USDT
ethusdt   Ethereum / USDT
adausdt   Cardano / USDT
dotusdt   Polkadot / USDT
solusdt   Solana / USDT
bnbusdt   Binance Coin / USDT
xrpusdt   Ripple / USDT
dogeusdt  Dogecoin / USDT
ltcusdt   Litecoin / USDT
```

**Stream Name:** `{symbol}@aggTrade` (aggregated trades)

**Example Connection:**
```javascript
const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@aggTrade');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
  // { e: 'aggTrade', s: 'BTCUSDT', p: '45100.50', ... }
};
```

**Incoming Message Format:**
```json
{
  "e": "aggTrade",        // Event type (always "aggTrade")
  "E": 1674825000000,     // Event time (milliseconds)
  "s": "BTCUSDT",         // Symbol
  "a": 123456789,         // Aggregate tradeID
  "p": "45100.50",        // Price
  "q": "2.5",             // Quantity
  "f": 111111111,         // First tradeID
  "l": 111111120,         // Last tradeID
  "T": 1674825000000,     // Trade time (milliseconds)
  "m": false,             // Is the buyer the market maker?
  "M": true               // Ignore
}
```

**Important Fields:**

| Field | Type | Meaning |
|-------|------|---------|
| `p` | String | Current price (highest precision) |
| `q` | String | Trade quantity |
| `T` | Number | Millisecond timestamp |
| `m` | Boolean | Buyer is maker (false = seller is maker) |

**Update Frequency:** ~100-500ms (real-time)

**Connection Properties:**
- Keep-alive: Server sends ping every 3 minutes
- Auto-reconnect: Implement exponential backoff if dropped
- Single connection per symbol (no multiplexing needed)

**Usage in RT-CPIP:**
```javascript
function connectBinanceWebSocket() {
  const symbol = cryptoMapping[state.currentSymbol]; // e.g., 'btcusdt'
  const url = `wss://stream.binance.com:9443/ws/${symbol}@aggTrade`;
  
  state.ws = new WebSocket(url);
  
  state.ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    state.priceData[state.currentSymbol] = {
      price: parseFloat(data.p),
      quantity: parseFloat(data.q),
      timestamp: data.T
    };
    updatePriceDisplay();
  };
}
```

---

### 2. TinyURL API

**Purpose:** Shorten long URLs for easier sharing

**Endpoint:** `https://tinyurl.com/api-create.php`

**Method:** GET

**Authentication:** Not required (public API)

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | String | Yes | Long URL to shorten (URL-encoded) |

**Query String Example:**
```
GET https://tinyurl.com/api-create.php?url=https%3A%2F%2Fdomain.com%2F%3Fenv%3Dy%252BlPGdI8V9n...
```

**Response Format:** Plain text
```
https://tinyurl.com/abcd1234
```

**HTTP Status Codes:**

| Code | Meaning |
|------|---------|
| 200 | Success - Returns shortened URL |
| 400 | Bad request - URL parameter missing or invalid |
| 429 | Rate limited (very rare) |

**Usage in RT-CPIP:**
```javascript
async function createTinyUrl(longUrl) {
  const response = await fetch(
    `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`
  );
  
  if (!response.ok) {
    throw new Error(`TinyURL failed: ${response.status}`);
  }
  
  const shortUrl = await response.text();
  return shortUrl.trim();
}
```

**Rate Limits:** Not officially documented, but effectively unlimited (~thousands per hour)

**Error Handling:**
```javascript
try {
  const shortUrl = await createTinyUrl(longUrl);
  console.log('Shortened:', shortUrl);
} catch (error) {
  console.error('Failed to shorten URL:', error);
  addAlert('Could not shorten URL. Try JSON export instead.', 'warning');
}
```

---

### 3. QR Server API

**Purpose:** Generate QR code images from URLs

**Endpoint:** `https://api.qrserver.com/v1/create-qr-code/`

**Method:** GET

**Authentication:** Not required (public API)

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `size` | String | No | Image dimensions (WIDTHxHEIGHT), default 200x200 |
| `data` | String | Yes | Data to encode (URL-encoded) |
| `format` | String | No | Output format: png (default), jpg, svg, eps |
| `margin` | Number | No | Border margin in pixels, default 0 |
| `qzone` | Number | No | Quiet zone size, default 1 |
| `color` | String | No | Foreground color (hex), default 000000 |
| `bgcolor` | String | No | Background color (hex), default FFFFFF |

**Query String Example:**
```
GET https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https%3A%2F%2Ftinyurl.com%2Fabcd1234
```

**Response:** PNG image (binary)

**Usage in RT-CPIP:**
```javascript
function createQrImageUrl(shortUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shortUrl)}`;
}

// Usage:
const qrImageUrl = createQrImageUrl('https://tinyurl.com/abcd1234');
const img = document.createElement('img');
img.src = qrImageUrl;
img.alt = 'QR Code';
document.body.appendChild(img);
```

**Image Specification:**
- Format: PNG (lossless)
- Size: 180×180 pixels (as specified)
- Color: Black foreground, white background (default)
- Error correction: High (30% recovery)

**QR Code Encoding Details:**
- Version: Auto-detected (1-40)
- Data capacity: Varies by version (~200-4000 bytes)
- Error correction level: High (30%)

---

## Proxied APIs (Via Cloudflare Workers)

### 1. CoinGecko API (Proxied)

**Purpose:** Supplementary price data, 24h metrics, currency conversion

**Cloudflare Worker:** `coingecko-proxy.js`

**Worker URL:** `https://rt-cpip-coingecko.your-account.workers.dev`

**Underlying Endpoint:** `https://api.coingecko.com/api/v3/simple/price`

**Method:** GET

**Authentication:** Not required (public API, no token)

**Parameters Allowed:**

| Parameter | Type | Allowed Values |
|-----------|------|-----------------|
| `ids` | String | bitcoin, ethereum, cardano, polkadot, solana, binancecoin, ripple, dogecoin, litecoin |
| `vs_currencies` | String | usd, inr, eur, gbp, ... (any fiat) |
| `include_24h_change` | Boolean | true, false |
| `include_24h_high` | Boolean | true, false |
| `include_24h_low` | Boolean | true, false |
| `include_24h_vol` | Boolean | true, false |

**Query String Example:**
```
GET https://rt-cpip-coingecko.workers.dev/?ids=bitcoin,ethereum&vs_currencies=usd,inr&include_24h_change=true&include_24h_high=true&include_24h_low=true&include_24h_vol=true
```

**Response Format:**
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
  "ethereum": {
    "usd": 2500,
    "inr": 207500,
    "usd_24h_change": 1.8,
    "usd_24h_high": 2600,
    "usd_24h_low": 2400,
    "usd_24h_vol": 500000000
  }
}
```

**HTTP Status Codes:**

| Code | Meaning |
|------|---------|
| 200 | Success (from cache or upstream) |
| 429 | Rate-limited (worker returns cached data with 200) |
| 400 | Invalid parameters |
| 502 | Upstream fetch failed |

**Caching Strategy:**

```
Request arrives at worker
    ↓
Check Cloudflare cache (60s TTL)
├─ Cache hit? → Return cached data immediately
└─ Cache miss? → Fetch from CoinGecko
                 ├─ Success? → Cache + return (60s TTL)
                 └─ 429? → Return cached data + HTTP 200
                          (Shields frontend from rate-limit)
```

**Usage in RT-CPIP:**
```javascript
async function fetchCoinGeckoData() {
  const params = new URLSearchParams({
    ids: 'bitcoin,ethereum,cardano,polkadot,solana,binancecoin,ripple,dogecoin,litecoin',
    vs_currencies: 'usd,inr',
    include_24h_change: 'true',
    include_24h_high: 'true',
    include_24h_low: 'true',
    include_24h_vol: 'true'
  });
  
  const response = await fetch(
    `https://rt-cpip-coingecko.workers.dev/?${params}`
  );
  
  if (!response.ok) {
    throw new Error(`CoinGecko proxy error: ${response.status}`);
  }
  
  return response.json();
}
```

**Rate Limit Details:**

| Tier | Calls/Minute | Calls/Day |
|------|--------------|-----------|
| CoinGecko Free | 30 | 500 |
| CoinGecko Pro | 500 | Unlimited |
| RT-CPIP Cache | ~1000 | Unlimited (60s cache) |

**Why Proxied?**
- CoinGecko limits to 30 calls/min free tier
- Cloudflare cache (60s TTL) shields rate-limits
- Workers automatically serve stale data if rate-limited
- CORS-friendly (proxy adds CORS headers)

---

### 2. Hugging Face API (Proxied)

**Purpose:** AI text summarization using BART model

**Cloudflare Worker:** `crypto-ai-proxy.js`

**Worker URL:** `https://rt-cpip-ai.your-account.workers.dev`

**Underlying Endpoint:** `https://router.huggingface.co/hf-inference/models/facebook/bart-large-cnn`

**Method:** POST

**Authentication:** Required (Bearer token in Authorization header)

**Token Storage:** Cloudflare Secrets (not in code)

**Request Format:**
```javascript
const request = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer hf_YOUR_TOKEN'  // Added by worker
  },
  body: JSON.stringify({
    inputs: "Current price: $45,000 (BTC)... [market context]"
  })
};

const response = await fetch(
  'https://rt-cpip-ai.workers.dev',
  request
);
```

**Request Body Structure:**
```json
{
  "inputs": "Market context text (100-500 words) containing price, volatility, order flow, whale activity, anomalies, etc."
}
```

**Response Format:**
```json
[
  {
    "summary_text": "Bitcoin shows strong bullish momentum with elevated whale activity suggesting institutional accumulation. Positive order flow imbalance and tight spreads indicate healthy liquidity. Volatility remains stable, suggesting consolidation before potential breakout."
  }
]
```

**HTTP Status Codes:**

| Code | Meaning |
|------|---------|
| 200 | Success - Summary generated |
| 400 | Invalid request body or missing prompt |
| 401 | Invalid or missing API token |
| 503 | Hugging Face service overloaded |

**Model Details:**

| Property | Value |
|----------|-------|
| Model | facebook/bart-large-cnn |
| Task | Abstractive summarization |
| Input | Formatted text prompt |
| Output | 1-3 sentences |
| Latency | 1-5 seconds |
| Max input tokens | 1024 |
| Max output tokens | 150 |

**BART Model Characteristics:**
- Bidirectional Auto-Regressive Transformers
- Pre-trained on CNN/DailyMail dataset
- Excellent for financial/news text
- May hallucinate facts not in input
- Quality depends on prompt formatting

**Usage in RT-CPIP:**
```javascript
async function generateAiSummary(snapshot) {
  // Build market context prompt
  const prompt = buildMarketContextPrompt(snapshot);
  
  // POST to worker
  const response = await fetch(
    'https://rt-cpip-ai.workers.dev',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    }
  );
  
  if (!response.ok) {
    throw new Error(`AI API failed: ${response.status}`);
  }
  
  const result = await response.json();
  return result[0].summary_text;
}

function buildMarketContextPrompt(snapshot) {
  const priceData = snapshot.snapshot.priceData[snapshot.snapshot.applicationState.currentSymbol];
  const analytics = snapshot.snapshot.derivedAnalytics[snapshot.snapshot.applicationState.currentSymbol];
  
  return `
    Current Market Analysis
    
    Price: $${priceData.price.toLocaleString()}
    24h Change: ${priceData.change24h.toFixed(2)}%
    24h High: $${priceData.high24h.toLocaleString()}
    24h Low: $${priceData.low24h.toLocaleString()}
    Trading Volume: ${(priceData.volume / 1e9).toFixed(2)}B
    
    Technical Metrics:
    - 1h Volatility: ${analytics.volatility1h.toFixed(2)}%
    - 4h Volatility: ${analytics.volatility4h.toFixed(2)}%
    - 24h Volatility: ${analytics.volatility24h.toFixed(2)}%
    
    Market Microstructure:
    - Order Flow Imbalance: ${analytics.orderFlowImbalance.toFixed(2)}%
    - Bid-Ask Spread: ${analytics.bidAskImbalance.toFixed(4)}%
    - Volume Slope: ${analytics.volumeSlope.toFixed(2)}%
    
    Market Conditions:
    - Anomalies: ${analytics.anomalies.map(a => a.type).join(', ') || 'None'}
    
    Please provide a brief market analysis.
  `;
}
```

**Rate Limits:**

| Plan | Calls/Day | Concurrent |
|------|-----------|-----------|
| HF Free | 32,000 | 1 |
| HF Pro | Unlimited | 10+ |

**Error Handling:**
```javascript
try {
  const summary = await generateAiSummary(snapshot);
  displayAiSummary(summary);
} catch (error) {
  if (error.status === 503) {
    addAlert('AI service temporarily overloaded. Try again in a moment.', 'warning');
  } else if (error.status === 401) {
    addAlert('AI service authentication failed. Check configuration.', 'error');
  } else {
    addAlert(`AI summarization failed: ${error.message}`, 'error');
  }
}
```

**Why Proxied?**
- API token must never be exposed in frontend
- Worker authenticates server-side only
- CORS headers added for cross-origin requests
- Possible future: add rate-limiting, caching, fallbacks

---

## Internal JavaScript API

### Core State Management Functions

#### `generateSnapshot()`

**Purpose:** Serialize entire application state into a JSON object

**Returns:** Snapshot object (50-80KB)

```javascript
const snapshot = generateSnapshot();

console.log(snapshot);
// {
//   version: "1.0",
//   snapshot: {
//     applicationState: { ... },
//     priceData: { ... },
//     derivedAnalytics: { ... },
//     metadata: { ... }
//   }
// }
```

---

#### `validateSnapshot(snapshot)`

**Purpose:** Check snapshot structure integrity

**Parameters:**
- `snapshot` (Object) - Snapshot object to validate

**Returns:** Boolean (true if valid, false otherwise)

```javascript
const isValid = validateSnapshot(snapshot);

if (!isValid) {
  addAlert('Invalid snapshot structure', 'error');
  return;
}
```

---

#### `restoreFromSnapshot(snapshot)`

**Purpose:** Load snapshot data into application state and UI

**Parameters:**
- `snapshot` (Object) - Snapshot object to restore

**Side Effects:**
- Sets `state.isRestoreMode = true`
- Closes WebSocket connection
- Updates entire UI
- Locks crypto selector

```javascript
restoreFromSnapshot(snapshot);
// Application now frozen to snapshot moment
```

---

### Share Environment Functions

#### `shareEncodeSnapshot(snapshot)`

**Purpose:** Compress snapshot into URL-safe encoded string

**Parameters:**
- `snapshot` (Object) - Snapshot object

**Returns:** String (20-25KB encoded, URL-safe)

```javascript
const encoded = shareEncodeSnapshot(snapshot);
console.log(encoded);
// "y%2BlPGdI8V9n%2BzL..." (67% compression)
```

---

#### `shareDecodeSnapshot(encoded)`

**Purpose:** Decompress and parse encoded snapshot from URL

**Parameters:**
- `encoded` (String) - Encoded snapshot from URL hash

**Returns:** Snapshot object or null

```javascript
const decoded = shareDecodeSnapshot(urlEncodedData);

if (!decoded) {
  addAlert('Failed to decode snapshot', 'error');
  return;
}

showJsonModal({ /* ... */ });
```

---

### Analytics Calculation Functions

#### `calculateVolatility(prices, period)`

**Purpose:** Calculate rolling standard deviation of log returns

**Parameters:**
- `prices` (Array) - Array of price values
- `period` (Number) - Number of periods for calculation

**Returns:** Number (volatility percentage)

```javascript
const prices = [45000, 45100, 45050, 45200];
const vol = calculateVolatility(prices, 4);
console.log(vol); // 0.45 (0.45%)
```

---

#### `calculateOrderFlowImbalance(bidVolume, askVolume)`

**Purpose:** Calculate bid-ask volume imbalance

**Parameters:**
- `bidVolume` (Number) - Volume at bid price
- `askVolume` (Number) - Volume at ask price

**Returns:** Number (percentage)

```javascript
const imbalance = calculateOrderFlowImbalance(10, 8);
console.log(imbalance); // 11.11 (bullish)
```

---

#### `detectAnomalies(symbol)`

**Purpose:** Detect unusual market patterns

**Parameters:**
- `symbol` (String) - Crypto symbol (e.g., 'BTC')

**Side Effects:**
- Updates `state.derivedAnalytics[symbol].anomalies`
- Adds alert if anomalies detected

```javascript
detectAnomalies('BTC');
// Checks for: whale activity, volume spikes, price deviations
```

---

### UI Rendering Functions

#### `updatePriceDisplay()`

**Purpose:** Render current price and 24h metrics

**Side Effects:**
- Updates DOM elements for price display
- Colors based on positive/negative change

```javascript
updatePriceDisplay();
// DOM updates: #priceDisplay, #priceChange, #high24h, #low24h, #volume
```

---

#### `addAlert(message, severity)`

**Purpose:** Add alert to alert center

**Parameters:**
- `message` (String) - Alert text
- `severity` (String) - 'info' | 'success' | 'warning' | 'error'

**Side Effects:**
- Adds to `state.alerts` array
- Trims to last 50 alerts
- Re-renders alert center

```javascript
addAlert('Price updated to $45,100', 'success');
// Alert appears in alert center with green styling
```

---

## Error Handling

### Error Types & Responses

| Error | HTTP Code | Handling |
|-------|-----------|----------|
| **Invalid Parameters** | 400 | Validate before request, show user message |
| **Authentication Failed** | 401 | Check API tokens, guide user to reconfigure |
| **Rate Limit** | 429 | (CoinGecko only) Serve cached data, hide from user |
| **Service Unavailable** | 503 | Show warning, suggest retry, use cached data |
| **Network Error** | N/A | Show error alert, attempt reconnection |

### Error Recovery Patterns

**WebSocket Disconnection:**
```javascript
state.ws.onerror = (error) => {
  console.error('WebSocket error:', error);
  addAlert('Connection lost. Attempting reconnection...', 'warning');
  
  // Exponential backoff reconnection
  setTimeout(() => connectBinanceWebSocket(), 1000);
};
```

**API Request Failure:**
```javascript
try {
  const data = await fetch(apiUrl);
  if (!data.ok) throw new Error(`HTTP ${data.status}`);
  return await data.json();
} catch (error) {
  addAlert(`API error: ${error.message}`, 'error');
  return null;  // Continue with cached data
}
```

**Snapshot Restoration Failure:**
```javascript
if (!validateSnapshot(snapshot)) {
  addAlert('Snapshot validation failed. File may be corrupted.', 'error');
  jsreError();  // Show error overlay
  return;
}
```

---

## Rate Limits

### API Rate Limits & Thresholds

| API | Limit | Handling |
|-----|-------|----------|
| **Binance WebSocket** | No official limit | Fair-use expected (~100 connections) |
| **CoinGecko** | 30 calls/min (free) | Worker cache (60s) shields this |
| **Hugging Face** | 32,000 calls/day (free) | Track usage, advise upgrade if needed |
| **TinyURL** | ~10,000 calls/day | Effectively unlimited for app |
| **QR Server** | Unlimited | No known limits |

### Rate Limit Behavior

**CoinGecko (429 Response):**
```javascript
// Worker detects 429 from upstream
if (upstream.status === 429) {
  // Returns cached data with HTTP 200
  return new Response(cachedBody, {
    status: 200,              // Hide rate-limit from frontend
    headers: { 'Cache-Control': 'public, max-age=30' }
  });
}

// Frontend receives 200, updates UI normally
// No alert shown (transparent rate-limit handling)
```

**Hugging Face (503 Response):**
```javascript
if (response.status === 503) {
  addAlert('AI service temporarily unavailable. Try again later.', 'warning');
}
```

---

## Authentication

### No Authentication Required

Most RT-CPIP APIs use public endpoints requiring no authentication:
- Binance WebSocket (public price streams)
- CoinGecko API (free tier)
- TinyURL (public service)
- QR Server (public service)

### Secret Token Management (Hugging Face)

Hugging Face requires API token, stored securely:

**Storage Location:** Cloudflare Secrets
```bash
wrangler secret put HF_API_TOKEN --name rt-cpip-ai
```

**Never Exposed:**
- ✗ Not in source code
- ✗ Not in .env files
- ✗ Not in configuration files
- ✗ Not in git history
- ✓ Only in Cloudflare's secure vault

**Accessed Only:**
- Server-side in crypto-ai-proxy.js
- Added to request headers before forwarding

```javascript
// In crypto-ai-proxy.js
headers: {
  "Authorization": `Bearer ${env.HF_API_TOKEN}`  // From secrets
}
```

---

**Last Updated:** January 27, 2026

**Document Version:** 1.0

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
<a href="https://github.com/Ajith-data-analyst/crypto_view/blob/main/LICENSE">
  *© 2025 Crypto View Project. All rights reserved under MIT License.*
</a>

</div>



<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=100&section=footer"/>
</p>


