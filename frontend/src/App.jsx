import React from 'react';
import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:4000';

function App() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [filter, setFilter] = useState('all'); // 'all', 'green', 'red', 'buy', 'sell'
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshAnimating, setIsRefreshAnimating] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const isInitialMount = useRef(true);
  const fetchInProgress = useRef(false);

  const fetchTokens = useCallback(async () => {
    if (fetchInProgress.current) return;
    
    fetchInProgress.current = true;
    setLoading(true);
    setIsRefreshAnimating(true);
    
    try {
      const res = await axios.get(`${API_URL}/api/tokens`);
      setTokens(res.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Error fetching data:', e);
      setError('Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
      // Keep animation for 1 second after loading completes
      setTimeout(() => setIsRefreshAnimating(false), 1000);
    }
  }, []); // Empty dependency array since we're using refs

  // Initial fetch only
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchTokens();
    }
  }, []); // Empty dependency array for single execution

  const handleManualRefresh = useCallback(() => {
    if (!loading) {
      fetchTokens();
    }
  }, [loading, fetchTokens]);

  const checkVolumePattern = (token, rowClass) => {
    if (!token.m15_last3_candles) return null;

    const { colors, volumes } = token.m15_last3_candles;
    
    // Check buy pattern for green tokens
    if (rowClass === 'bg-green-900' && 
        colors[0] === 'red' && colors[1] === 'green' && colors[2] === 'green' &&
        volumes[1] > volumes[0] && volumes[2] > volumes[1]) {
      return 'Should Buy';
    }
    
    // Check sell pattern for red tokens
    if (rowClass === 'bg-red-900' && 
        colors[0] === 'green' && colors[1] === 'red' && colors[2] === 'red' &&
        volumes[1] > volumes[0] && volumes[2] > volumes[1]) {
      return 'Should Sell';
    }

    return null;
  };

  const getFilteredTokens = () => {
    // Create a Map to store unique tokens by symbol
    const uniqueTokens = new Map();
    
    tokens.forEach(t => {
      const cp = t.currentPrice;
      const bull = ['15m','1h','4h'].every(tf =>
        cp > t[`ema34_${tf}`] && cp > t[`ema89_${tf}`]
      );
      const bear = ['15m','1h','4h'].every(tf =>
        cp < t[`ema34_${tf}`] && cp < t[`ema89_${tf}`]
      );
      const rowClass = bull ? 'bg-green-900' : bear ? 'bg-red-900' : '';
      const signal = checkVolumePattern(t, rowClass);

      // Only keep the first occurrence of each symbol
      if (!uniqueTokens.has(t.symbol)) {
        const shouldInclude = (() => {
          switch (filter) {
            case 'green':
              return bull;
            case 'red':
              return bear;
            case 'buy':
              return signal === 'Should Buy';
            case 'sell':
              return signal === 'Should Sell';
            default:
              return true;
          }
        })();

        if (shouldInclude) {
          uniqueTokens.set(t.symbol, { ...t, rowClass, signal });
        }
      }
    });

    return Array.from(uniqueTokens.values());
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  const toggleExpand = (symbol) => {
    setExpanded(prev => ({ ...prev, [symbol]: !prev[symbol] }));
  };

  const formatNumber = (num) => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(2) + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  };

  const formatTimeSinceCHoCH = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const formatExactTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour12: false
    });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getSortedTokens = () => {
    const filtered = getFilteredTokens();
    if (!sortConfig.key) return filtered;

    return [...filtered].sort((a, b) => {
      if (sortConfig.key === 'choch') {
        if (!a.lastCHoCH && !b.lastCHoCH) return 0;
        if (!a.lastCHoCH) return 1;
        if (!b.lastCHoCH) return -1;
        return sortConfig.direction === 'asc' 
          ? a.lastCHoCH.timestamp - b.lastCHoCH.timestamp
          : b.lastCHoCH.timestamp - a.lastCHoCH.timestamp;
      }
      if (sortConfig.key === 'chochH1') {
        if (!a.lastCHoCHH1 && !b.lastCHoCHH1) return 0;
        if (!a.lastCHoCHH1) return 1;
        if (!b.lastCHoCHH1) return -1;
        return sortConfig.direction === 'asc' 
          ? a.lastCHoCHH1.timestamp - b.lastCHoCHH1.timestamp
          : b.lastCHoCHH1.timestamp - a.lastCHoCHH1.timestamp;
      }
      if (sortConfig.key === 'bosM15') {
        if (!a.lastBOSM15 && !b.lastBOSM15) return 0;
        if (!a.lastBOSM15) return 1;
        if (!b.lastBOSM15) return -1;
        return sortConfig.direction === 'asc' 
          ? a.lastBOSM15.timestamp - b.lastBOSM15.timestamp
          : b.lastBOSM15.timestamp - a.lastBOSM15.timestamp;
      }
      if (sortConfig.key === 'bosH1') {
        if (!a.lastBOSH1 && !b.lastBOSH1) return 0;
        if (!a.lastBOSH1) return 1;
        if (!b.lastBOSH1) return -1;
        return sortConfig.direction === 'asc' 
          ? a.lastBOSH1.timestamp - b.lastBOSH1.timestamp
          : b.lastBOSH1.timestamp - a.lastBOSH1.timestamp;
      }
      if (sortConfig.key === 'volume') {
        return sortConfig.direction === 'asc'
          ? a.volume - b.volume
          : b.volume - a.volume;
      }
      return 0;
    });
  };

  const filteredTokens = getSortedTokens();

  return (
    <div className="min-h-screen bg-gray-800 text-white">
      {/* Header Section */}
      <div className="sticky top-0 z-50 bg-gray-900 shadow-lg p-4">
        <div className="container mx-auto">
          {/* Title and Status */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Binance Futures Top Tokens</h1>
              <div className="text-sm text-gray-400 mt-1">
                {filteredTokens.length} tokens found
                {lastUpdated && (
                  <span className="ml-2">
                    • Last updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
              {error && (
                <div className="text-red-400 text-sm mt-1">
                  {error}
                </div>
              )}
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className={`px-4 py-2 rounded flex items-center gap-2 ${
                loading 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } transition-colors duration-200`}
            >
              <svg
                className={`w-4 h-4 ${isRefreshAnimating ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-4 py-2 rounded ${
                filter === 'all' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange('green')}
              className={`px-4 py-2 rounded ${
                filter === 'green' ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Bullish
            </button>
            <button
              onClick={() => handleFilterChange('red')}
              className={`px-4 py-2 rounded ${
                filter === 'red' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Bearish
            </button>
            <button
              onClick={() => handleFilterChange('buy')}
              className={`px-4 py-2 rounded ${
                filter === 'buy' ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Should Buy
            </button>
            <button
              onClick={() => handleFilterChange('sell')}
              className={`px-4 py-2 rounded ${
                filter === 'sell' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Should Sell
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="container mx-auto p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-900 rounded-lg overflow-hidden">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left">Symbol</th>
                <th className="px-4 py-2 text-right">Price</th>
                <th 
                  className="px-4 py-2 text-right cursor-pointer hover:bg-gray-700"
                  onClick={() => handleSort('volume')}
                >
                  Volume {sortConfig.key === 'volume' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-2 text-center">Signal</th>
                <th 
                  className="px-4 py-2 text-center cursor-pointer hover:bg-gray-700"
                  onClick={() => handleSort('choch')}
                >
                  CHoCH (M15) {sortConfig.key === 'choch' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-2 text-center cursor-pointer hover:bg-gray-700"
                  onClick={() => handleSort('chochH1')}
                >
                  CHoCH (H1) {sortConfig.key === 'chochH1' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-2 text-center cursor-pointer hover:bg-gray-700"
                  onClick={() => handleSort('bosM15')}
                >
                  BOS (M15) {sortConfig.key === 'bosM15' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-2 text-center cursor-pointer hover:bg-gray-700"
                  onClick={() => handleSort('bosH1')}
                >
                  BOS (H1) {sortConfig.key === 'bosH1' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-2 text-center">Details</th>
              </tr>
            </thead>
            <tbody>
              {getSortedTokens().map(token => (
                <React.Fragment key={token.symbol}>
                  <tr className={`border-t border-gray-800 ${token.rowClass}`}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://www.binance.com/en/futures/${token.symbol}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          {token.symbol}
                        </a>
                        <button
                          onClick={() => copyToClipboard(token.symbol)}
                          className="p-1 text-gray-400 hover:text-white"
                          title="Copy symbol"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {token.currentPrice.toFixed(4)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {formatNumber(token.volume)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={
                        token.signal === 'Should Buy' 
                          ? 'text-green-400' 
                          : token.signal === 'Should Sell' 
                            ? 'text-red-400' 
                            : ''
                      }>
                        {token.signal || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {token.lastCHoCH ? (
                        <span 
                          className={
                            token.lastCHoCH.type === 'bullish'
                              ? 'text-green-400 cursor-help'
                              : 'text-red-400 cursor-help'
                          }
                          title={formatExactTime(token.lastCHoCH.timestamp)}
                        >
                          {formatTimeSinceCHoCH(token.lastCHoCH.timestamp)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {token.lastCHoCHH1 ? (
                        <span 
                          className={
                            token.lastCHoCHH1.type === 'bullish'
                              ? 'text-green-400 cursor-help'
                              : 'text-red-400 cursor-help'
                          }
                          title={formatExactTime(token.lastCHoCHH1.timestamp)}
                        >
                          {formatTimeSinceCHoCH(token.lastCHoCHH1.timestamp)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {token.lastBOSM15 ? (
                        <span 
                          className={
                            token.lastBOSM15.type === 'bullish'
                              ? 'text-green-400 cursor-help'
                              : 'text-red-400 cursor-help'
                          }
                          title={formatExactTime(token.lastBOSM15.timestamp)}
                        >
                          {formatTimeSinceCHoCH(token.lastBOSM15.timestamp)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {token.lastBOSH1 ? (
                        <span 
                          className={
                            token.lastBOSH1.type === 'bullish'
                              ? 'text-green-400 cursor-help'
                              : 'text-red-400 cursor-help'
                          }
                          title={formatExactTime(token.lastBOSH1.timestamp)}
                        >
                          {formatTimeSinceCHoCH(token.lastBOSH1.timestamp)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => toggleExpand(token.symbol)}
                        className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600"
                      >
                        {expanded[token.symbol] ? 'Hide' : 'Show'}
                      </button>
                    </td>
                  </tr>
                  {expanded[token.symbol] && (
                    <tr className="bg-gray-800">
                      <td colSpan="7" className="px-4 py-2">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {['5m', '15m', '1h', '4h', '1d'].map(timeframe => (
                            <div key={timeframe} className="bg-gray-900 p-4 rounded">
                              <h3 className="font-bold mb-2">{timeframe}</h3>
                              <div className="space-y-1">
                                <p>EMA34: {token[`ema34_${timeframe}`].toFixed(4)}</p>
                                <p>EMA89: {token[`ema89_${timeframe}`].toFixed(4)}</p>
                                <p className="text-gray-400">
                                  Price vs EMA34: {((token.currentPrice / token[`ema34_${timeframe}`] - 1) * 100).toFixed(2)}%
                                </p>
                                <p className="text-gray-400">
                                  Price vs EMA89: {((token.currentPrice / token[`ema89_${timeframe}`] - 1) * 100).toFixed(2)}%
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
