const axios = require('axios');

// Cache for storing token data
const tokenCache = {
    data: null,
    timestamp: null,
    ttl: 60000 // Cache for 1 minute
};

// Klines cache to reduce API calls
const klinesCache = new Map();
const KLINES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const TOP_TOKENS_LIMIT = 1000; // Change this value to update the number of top tokens fetched

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getKlinesWithRetry(symbol, interval, retryCount = 0) {
    const maxRetries = 5;
    const baseDelay = 1000;

    try {
        // Check cache first
        const cacheKey = `${symbol}-${interval}`;
        const cachedData = klinesCache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < KLINES_CACHE_TTL) {
            return cachedData.data;
        }

        const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=100`;
        const response = await axios.get(url, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });

        // Cache the successful response
        klinesCache.set(cacheKey, {
            data: response.data,
            timestamp: Date.now()
        });

        return response.data;
    } catch (error) {
        if ((error.response ?.status === 418 || error.response ?.status === 429) && retryCount < maxRetries) {
            const delay = baseDelay * Math.pow(2, retryCount);
            console.log(`Rate limited for ${symbol}. Retrying in ${delay}ms...`);
            await sleep(delay);
            return getKlinesWithRetry(symbol, interval, retryCount + 1);
        }
        throw error;
    }
}

function calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, p) => sum + p, 0) / period;

    for (let i = period; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
    }
    return parseFloat(ema.toFixed(4));
}

function detectBOS(klines) {
    if (klines.length < 10) return null;

    const highs = klines.map(k => parseFloat(k[2]));
    const lows = klines.map(k => parseFloat(k[3]));
    const closes = klines.map(k => parseFloat(k[4]));
    const opens = klines.map(k => parseFloat(k[1]));
    const timestamps = klines.map(k => k[0]);

    // Look for the last 3-4 candles for BOS
    for (let i = klines.length - 1; i >= 3; i--) {
        // Bearish BOS: price breaks below previous structure low
        const prevLows = lows.slice(i - 3, i);
        const prevStructureLow = Math.min(...prevLows);
        const currentCandle = {
            open: opens[i],
            close: closes[i],
            high: highs[i],
            low: lows[i]
        };

        if (currentCandle.close < prevStructureLow &&
            (currentCandle.open > prevStructureLow || currentCandle.high > prevStructureLow)) {
            return {
                type: 'bearish',
                timestamp: timestamps[i],
                price: currentCandle.close,
                structureLevel: prevStructureLow
            };
        }

        // Bullish BOS: price breaks above previous structure high
        const prevHighs = highs.slice(i - 3, i);
        const prevStructureHigh = Math.max(...prevHighs);
        if (currentCandle.close > prevStructureHigh &&
            (currentCandle.open < prevStructureHigh || currentCandle.low < prevStructureHigh)) {
            return {
                type: 'bullish',
                timestamp: timestamps[i],
                price: currentCandle.close,
                structureLevel: prevStructureHigh
            };
        }
    }
    return null;
}

function detectCHoCH(klines) {
    if (klines.length < 10) return null;

    const highs = klines.map(k => parseFloat(k[2]));
    const lows = klines.map(k => parseFloat(k[3]));
    const closes = klines.map(k => parseFloat(k[4]));
    const opens = klines.map(k => parseFloat(k[1]));
    const timestamps = klines.map(k => k[0]);

    // Scan from the end for the most recent CHoCH
    for (let i = klines.length - 1; i >= 3; i--) {
        const currentCandle = {
            open: opens[i],
            close: closes[i],
            high: highs[i],
            low: lows[i]
        };

        // Look for bullish CHoCH
        const prevHighs = highs.slice(Math.max(0, i - 3), i);
        const prevHigh = Math.max(...prevHighs);
        const beforeHighs = highs.slice(Math.max(0, i - 6), i - 2);

        if (currentCandle.close > prevHigh &&
            (currentCandle.open < prevHigh || currentCandle.low < prevHigh) &&
            Math.max(...beforeHighs) > prevHigh) {
            return {
                type: 'bullish',
                timestamp: timestamps[i],
                price: currentCandle.close,
                structureLevel: prevHigh
            };
        }

        // Look for bearish CHoCH
        const prevLows = lows.slice(Math.max(0, i - 3), i);
        const prevLow = Math.min(...prevLows);
        const beforeLows = lows.slice(Math.max(0, i - 6), i - 2);

        if (currentCandle.close < prevLow &&
            (currentCandle.open > prevLow || currentCandle.high > prevLow) &&
            Math.min(...beforeLows) < prevLow) {
            return {
                type: 'bearish',
                timestamp: timestamps[i],
                price: currentCandle.close,
                structureLevel: prevLow
            };
        }
    }
    return null;
}

async function processTokenBatch(tokens, timeframes) {
    return Promise.all(tokens.map(async(token) => {
        try {
            const emaValues = {};
            let lastCHoCH = null;
            let lastCHoCHH1 = null;
            let lastBOSM15 = null;
            let lastBOSH1 = null;

            // Get klines data for each timeframe in parallel
            await Promise.all(timeframes.map(async(tf) => {
                try {
                    const klines = await getKlinesWithRetry(token.symbol, tf);
                    const closes = klines.map(k => parseFloat(k[4]));

                    if (tf === '15m') {
                        const last3Candles = klines.slice(-3).map(k => ({
                            close: parseFloat(k[4]),
                            open: parseFloat(k[1]),
                            volume: parseFloat(k[5])
                        }));

                        const candleColors = last3Candles.map(c => c.close > c.open ? 'green' : 'red');
                        const volumes = last3Candles.map(c => c.volume);

                        emaValues.m15_last3_candles = {
                            colors: candleColors,
                            volumes: volumes
                        };

                        // Detect CHoCH and BOS on 15m timeframe
                        const choc = detectCHoCH(klines);
                        if (choc) {
                            lastCHoCH = {
                                ...choc,
                                timeframe: '15m'
                            };
                        }

                        const bos = detectBOS(klines);
                        if (bos) {
                            lastBOSM15 = {
                                ...bos,
                                timeframe: '15m'
                            };
                        }
                    }

                    if (tf === '1h') {
                        // Detect CHoCH and BOS on 1h timeframe
                        const choc = detectCHoCH(klines);
                        if (choc) {
                            lastCHoCHH1 = {
                                ...choc,
                                timeframe: '1h'
                            };
                        }

                        const bos = detectBOS(klines);
                        if (bos) {
                            lastBOSH1 = {
                                ...bos,
                                timeframe: '1h'
                            };
                        }
                    }

                    emaValues[`ema34_${tf}`] = calculateEMA(closes, 34);
                    emaValues[`ema89_${tf}`] = calculateEMA(closes, 89);
                } catch (error) {
                    console.error(`Error processing timeframe ${tf} for ${token.symbol}:`, error.message);
                }
            }));

            return {
                symbol: token.symbol,
                currentPrice: parseFloat(token.lastPrice),
                volume: parseFloat(token.quoteVolume),
                priceChangePercent: parseFloat(token.priceChangePercent),
                lastCHoCH,
                lastCHoCHH1,
                lastBOSM15,
                lastBOSH1,
                ...emaValues
            };
        } catch (error) {
            console.error(`Error processing token ${token.symbol}:`, error.message);
            return null;
        }
    }));
}

async function getTopTokensData() {
    try {
        // Check cache first
        if (tokenCache.data && Date.now() - tokenCache.timestamp < tokenCache.ttl) {
            return tokenCache.data;
        }

        // Get top tokens by volume
        const response = await axios.get('https://fapi.binance.com/fapi/v1/ticker/24hr', {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });

        const tokens = response.data
            .filter(token => token.symbol.endsWith('USDT'))
            .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
            .slice(0, TOP_TOKENS_LIMIT); // Get top N by volume

        const timeframes = ['5m', '15m', '1h', '4h', '1d'];
        const batchSize = 10; // Process 10 tokens at a time
        const results = [];

        // Process tokens in parallel batches
        for (let i = 0; i < tokens.length; i += batchSize) {
            const batch = tokens.slice(i, i + batchSize);
            const batchResults = await processTokenBatch(batch, timeframes);
            results.push(...batchResults.filter(Boolean));

            if (i + batchSize < tokens.length) {
                await sleep(500); // Small delay between batches to avoid rate limits
            }
        }

        // Update cache
        tokenCache.data = results;
        tokenCache.timestamp = Date.now();

        return results;
    } catch (error) {
        console.error('Error fetching token data:', error.message);
        if (tokenCache.data) {
            console.log('Returning cached data due to error');
            return tokenCache.data;
        }
        throw error;
    }
}

module.exports = { getTopTokensData };