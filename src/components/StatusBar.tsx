import React, { useState, useEffect } from "react";
import {
  Server,
  Clock,
  Database,
  Wifi,
  WifiOff,
  Zap,
  RefreshCw,
  AlertTriangle,
  HardDrive,
  Trash2,
  Download,
  Upload,
  Wrench,
} from "lucide-react";
import { useWeb3Context } from "../contexts/Web3Context";
import { format } from "date-fns";
import { blockCache } from "../services/BlockCache";

interface RecentSearch {
  query: string;
  timestamp: number;
  type: "address" | "transaction" | "block" | "unknown";
}

const StatusBar = () => {
  const {
    web3,
    provider,
    isConnected,
    networkInfo,
    debugMode,
    isReconnecting,
    reconnectProvider,
    autoReconnect,
  } = useWeb3Context();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cacheStats, setCacheStats] = useState({
    totalBlocks: 0,
    oldestBlock: undefined as number | undefined,
    newestBlock: undefined as number | undefined,
    sizeEstimate: "0 B",
    oldestTimestamp: undefined as Date | undefined,
    newestTimestamp: undefined as Date | undefined,
    errorBlocks: 0,
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isFixingErrors, setIsFixingErrors] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadCacheStats();
  }, []);

  const loadCacheStats = async () => {
    try {
      const stats = await blockCache.getCacheStats();
      setCacheStats(stats);

      // Update stats every 30 seconds
      setTimeout(loadCacheStats, 30000);
    } catch (error) {
      console.error("Failed to load cache stats:", error);
    }
  };

  // Extract domain from provider URL for display
  const getProviderDisplayName = () => {
    if (!provider) return "Not connected";
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
    return provider.startsWith("ws://") || provider.startsWith("wss://");
  };

  // Format time since last update
  const getTimeSinceUpdate = () => {
    if (!networkInfo?.lastUpdated) return "Never";

    const now = new Date();
    const diff = now.getTime() - networkInfo.lastUpdated.getTime();

    if (diff < 1000) return "Just now";
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;

    return format(networkInfo.lastUpdated, "HH:mm:ss");
  };

  const handleManualReconnect = async () => {
    try {
      await reconnectProvider();
    } catch (error) {
      console.error("Failed to reconnect:", error);
    }
  };

  const handleClearCache = async () => {
    if (
      confirm(
        "Are you sure you want to clear the block cache? This cannot be undone."
      )
    ) {
      try {
        await blockCache.clearCache();
        await loadCacheStats();
      } catch (error) {
        console.error("Failed to clear cache:", error);
      }
    }
  };

  // Export cache handler
  const handleExportCache = async () => {
    setIsExporting(true);
    try {
      const blocks = await blockCache.getAllBlocks();
      const data = JSON.stringify(blocks, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chainhound-block-cache-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  // Import cache handler
  const handleImportCache = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const blocks = JSON.parse(text);
      if (Array.isArray(blocks)) {
        await blockCache.cacheBlocks(blocks);
        await loadCacheStats();
      }
    } catch (err) {
      alert(
        "Failed to import cache: " + (err instanceof Error ? err.message : err)
      );
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Fix error blocks handler (uses block explorer logic)
  const handleFixErrorBlocks = async () => {
    if (!window.web3) {
      alert("Web3 provider not available.");
      return;
    }
    setIsFixingErrors(true);
    try {
      const errorBlocks = await blockCache.getErrorBlocksInRange(
        0,
        Number.MAX_SAFE_INTEGER
      );
      let fixed = 0;
      for (const err of errorBlocks) {
        try {
          const block = await window.web3.eth.getBlock(err.blockNumber, true);
          if (block) {
            await blockCache.cacheBlock(block);
            await blockCache.removeErrorBlock(err.blockNumber);
            fixed++;
          }
        } catch (e) {
          // Ignore, will remain in error list
        }
      }
      await loadCacheStats();
      alert(`Fixed ${fixed} error blocks!`);
    } catch (err) {
      alert(
        "Failed to fix error blocks: " +
          (err instanceof Error ? err.message : err)
      );
    } finally {
      setIsFixingErrors(false);
    }
  };

  return (
    <div className="bg-gray-100 border-t border-gray-200 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 w-full">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-between items-center">
          {/* First row - Provider information */}
          <div className="flex flex-wrap items-center space-x-2 gap-y-1 overflow-x-auto pb-1 scrollbar-hide w-full">
            <div className="flex items-center whitespace-nowrap status-bar-item">
              <Server className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate max-w-[200px]">
                Provider: {getProviderDisplayName()}
              </span>
            </div>

            <div className="flex items-center whitespace-nowrap status-bar-item">
              {isWebSocket() ? (
                <Wifi className="h-3 w-3 mr-1 flex-shrink-0" />
              ) : (
                <Server className="h-3 w-3 mr-1 flex-shrink-0" />
              )}
              <span>Type: {isWebSocket() ? "WebSocket" : "HTTP"}</span>
            </div>

            <div className="flex items-center whitespace-nowrap status-bar-item">
              <div
                className={`h-2 w-2 rounded-full mr-1 flex-shrink-0 ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <span className="flex items-center">
                Status: {isConnected ? "Connected" : "Disconnected"}
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

            {networkInfo && (
              <>
                <div className="flex items-center whitespace-nowrap status-bar-item">
                  <Zap className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span>
                    Block: {networkInfo.blockHeight?.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center whitespace-nowrap status-bar-item">
                  <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span>Updated: {getTimeSinceUpdate()}</span>
                </div>

                {networkInfo.chainId !== undefined && (
                  <div className="flex items-center whitespace-nowrap status-bar-item">
                    <span>Chain ID: {networkInfo.chainId.toString()}</span>
                  </div>
                )}

                {networkInfo.gasPrice && (
                  <div className="flex items-center whitespace-nowrap status-bar-item">
                    <span>Gas: {networkInfo.gasPrice} Gwei</span>
                  </div>
                )}
              </>
            )}

            {!isConnected && autoReconnect && (
              <div className="flex items-center whitespace-nowrap status-bar-item">
                <AlertTriangle className="h-3 w-3 mr-1 flex-shrink-0 text-yellow-500" />
                <span>Auto-reconnecting...</span>
              </div>
            )}
          </div>

          {/* Second row - Cache information */}
          <div className="flex flex-wrap items-center space-x-2 gap-y-1 overflow-x-auto pb-1 scrollbar-hide w-full mt-1 border-t border-gray-200 pt-1 dark:border-gray-700">
            {/* Cache stats */}
            <div className="flex items-center whitespace-nowrap status-bar-item">
              <Database className="h-3 w-3 mr-1 flex-shrink-0" />
              <span>Blocks: {cacheStats.totalBlocks.toLocaleString()}</span>
            </div>
            {cacheStats.oldestBlock !== undefined &&
              cacheStats.newestBlock !== undefined && (
                <div className="flex items-center whitespace-nowrap status-bar-item">
                  <span>
                    Range: {cacheStats.oldestBlock.toLocaleString()} -{" "}
                    {cacheStats.newestBlock.toLocaleString()}
                  </span>
                </div>
              )}
            <div className="flex items-center whitespace-nowrap status-bar-item">
              <HardDrive className="h-3 w-3 mr-1 flex-shrink-0" />
              <span>Size: {cacheStats.sizeEstimate}</span>
            </div>
            {cacheStats.errorBlocks > 0 && (
              <div className="flex items-center whitespace-nowrap status-bar-item">
                <AlertTriangle className="h-3 w-3 mr-1 flex-shrink-0 text-yellow-500" />
                <span>Errors: {cacheStats.errorBlocks}</span>
              </div>
            )}
            {/* Inline cache controls */}
            <button
              onClick={handleExportCache}
              disabled={isExporting || cacheStats.totalBlocks === 0}
              className="flex items-center whitespace-nowrap status-bar-item text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 px-1 py-0.5"
              title="Export block cache"
            >
              <Download className="h-3 w-3 mr-1" />
              <span className="sr-only">Export</span>
            </button>
            <label className="flex items-center whitespace-nowrap status-bar-item text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 px-1 py-0.5 cursor-pointer">
              <Upload className="h-3 w-3 mr-1" />
              <span className="sr-only">Import</span>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportCache}
                accept=".json,.zip"
                className="hidden"
                disabled={isImporting}
              />
            </label>
            <button
              onClick={handleFixErrorBlocks}
              disabled={isFixingErrors || cacheStats.errorBlocks === 0}
              className="flex items-center whitespace-nowrap status-bar-item text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 px-1 py-0.5"
              title="Fix error blocks"
            >
              <Wrench className="h-3 w-3 mr-1" />
              <span className="sr-only">Fix Errors</span>
            </button>
            <button
              onClick={handleClearCache}
              className="flex items-center whitespace-nowrap status-bar-item text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 px-1 py-0.5"
              title="Delete block cache"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
