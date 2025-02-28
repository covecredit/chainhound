import React, { useState, useEffect } from 'react';
import { Server, Clock, Database, Wifi, WifiOff, Zap, RefreshCw, AlertTriangle, HardDrive } from 'lucide-react';
import { useWeb3Context } from '../contexts/Web3Context';
import { format } from 'date-fns';
import { blockCache } from '../services/BlockCache';

const StatusBar = () => {
  const { web3, provider, isConnected, networkInfo, debugMode, isReconnecting, reconnectProvider, autoReconnect } = useWeb3Context();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cacheStats, setCacheStats] = useState({
    totalBlocks: 0,
    oldestBlock: undefined as number | undefined,
    newestBlock: undefined as number | undefined,
    sizeEstimate: '0 B'
  });
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
    // Load cache stats on initial load and every 30 seconds
    loadCacheStats();
    const statsTimer = setInterval(loadCacheStats, 30000);
    
    return () => clearInterval(statsTimer);
  }, []);
  
  const loadCacheStats = async () => {
    try {
      const stats = await blockCache.getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  };
  
  // Extract domain from provider URL for display
  const getProviderDisplayName = () => {
    if (!provider) return 'Not connected';
    try {
      const url = new URL(provider);
      return url.hostname;
    } catch (e) {
      return provider;
    }
  };
  
  // Determine if using WebSocket or HTTP
  const isWebSocket = () => {
    if (!provider) return false;
    return provider.startsWith('ws://') || provider.startsWith('wss://');
  };

  // Format time since last update
  const getTimeSinceUpdate = () => {
    if (!networkInfo?.lastUpdated) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - networkInfo.lastUpdated.getTime();
    
    if (diff < 1000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    
    return format(networkInfo.lastUpdated, 'HH:mm:ss');
  };
  
  const handleManualReconnect = async () => {
    try {
      await reconnectProvider();
    } catch (error) {
      console.error('Failed to reconnect:', error);
    }
  };
  
  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear the block cache? This cannot be undone.')) {
      try {
        await blockCache.clearCache();
        await loadCacheStats();
      } catch (error) {
        console.error('Failed to clear cache:', error);
      }
    }
  };
  
  return (
    <div className="bg-gray-100 border-t border-gray-200 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-between items-center">
          <div className="flex flex-wrap items-center space-x-2 gap-y-1 overflow-x-auto pb-1 scrollbar-hide w-full sm:w-auto">
            <div className="flex items-center whitespace-nowrap status-bar-item">
              <Server className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">Provider: {getProviderDisplayName()}</span>
            </div>
            
            <div className="flex items-center whitespace-nowrap status-bar-item">
              {isWebSocket() ? 
                <Wifi className="h-3 w-3 mr-1 flex-shrink-0" /> : 
                <Server className="h-3 w-3 mr-1 flex-shrink-0" />
              }
              <span>Type: {isWebSocket() ? 'WebSocket' : 'HTTP'}</span>
            </div>
            
            <div className="flex items-center whitespace-nowrap status-bar-item">
              <div className={`h-2 w-2 rounded-full mr-1 flex-shrink-0 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="flex items-center">
                Status: {isConnected ? 'Connected' : 'Disconnected'}
                {!isConnected && !isReconnecting && (
                  <button 
                    onClick={handleManualReconnect}
                    className="ml-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                    title="Reconnect"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                  </button>
                )}
                {isReconnecting && (
                  <RefreshCw className="h-2.5 w-2.5 ml-1 animate-spin text-indigo-600 dark:text-indigo-400" />
                )}
              </span>
            </div>
            
            {!isConnected && autoReconnect && (
              <div className="flex items-center whitespace-nowrap status-bar-item text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>Auto-reconnecting...</span>
              </div>
            )}
            
            {networkInfo && (
              <>
                <div className="flex items-center whitespace-nowrap status-bar-item">
                  <Database className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span>Block: {networkInfo.blockHeight?.toLocaleString() || 'Unknown'}</span>
                </div>
                
                <div className="flex items-center whitespace-nowrap status-bar-item">
                  <RefreshCw className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span>Updated: {getTimeSinceUpdate()}</span>
                </div>
                
                {networkInfo.gasPrice && (
                  <div className="flex items-center whitespace-nowrap status-bar-item">
                    <Zap className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span>Gas: {parseFloat(networkInfo.gasPrice).toFixed(1)} Gwei</span>
                  </div>
                )}
                
                <div className="flex items-center whitespace-nowrap status-bar-item">
                  <span>Network: {networkInfo.name || `Chain ID: ${networkInfo.chainId || 'Unknown'}`}</span>
                </div>
                
                {networkInfo.version && (
                  <div className="flex items-center whitespace-nowrap status-bar-item">
                    <span>Version: {networkInfo.version}</span>
                  </div>
                )}
                
                {debugMode && networkInfo.syncStatus && typeof networkInfo.syncStatus === 'object' && (
                  <div className="flex items-center whitespace-nowrap status-bar-item">
                    <span>Sync: {networkInfo.syncStatus.currentBlock}/{networkInfo.syncStatus.highestBlock}</span>
                  </div>
                )}
              </>
            )}
            
            {/* Block Cache Stats */}
            <div className="flex items-center whitespace-nowrap status-bar-item border-l border-gray-300 dark:border-gray-600 pl-2 ml-1">
              <HardDrive className="h-3 w-3 mr-1 flex-shrink-0" />
              <span>Cache: {cacheStats.totalBlocks} blocks</span>
              {cacheStats.totalBlocks > 0 && (
                <>
                  <span className="mx-1">|</span>
                  <span>{cacheStats.sizeEstimate}</span>
                  {cacheStats.oldestBlock && cacheStats.newestBlock && (
                    <>
                      <span className="mx-1">|</span>
                      <span>{cacheStats.oldestBlock}-{cacheStats.newestBlock}</span>
                    </>
                  )}
                  <button 
                    onClick={handleClearCache}
                    className="ml-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    title="Clear cache"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center whitespace-nowrap mt-1 sm:mt-0">
            <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
            <span>{currentTime.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;