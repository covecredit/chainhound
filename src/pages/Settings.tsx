import React, { useState, useEffect, useRef } from "react";
import {
  Settings as SettingsIcon,
  Save,
  RefreshCw,
  Server,
  Plus,
  Trash2,
  Bug,
  Shield,
  AlertTriangle,
  Database,
  Upload,
  Download,
  RotateCcw,
} from "lucide-react";
import { useWeb3Context } from "../contexts/Web3Context";
import { blockCache } from "../services/BlockCache";
import ProviderStatus from "../components/ProviderStatus";

const Settings = () => {
  const {
    provider,
    setProvider,
    isConnected,
    availableProviders,
    debugMode,
    setDebugMode,
    autoReconnect,
    setAutoReconnect,
    secureConnectionsOnly,
    setSecureConnectionsOnly,
    resetSettings,
    exportCache,
    importCache,
  } = useWeb3Context();
  const [web3Provider, setWeb3Provider] = useState(provider);
  const [customProviders, setCustomProviders] = useState<string[]>([]);
  const [newCustomProvider, setNewCustomProvider] = useState("");
  const [etherscanApiKey, setEtherscanApiKey] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: "", text: "" });
  const [localDebugMode, setLocalDebugMode] = useState(debugMode);
  const [localAutoReconnect, setLocalAutoReconnect] = useState(autoReconnect);
  const [localSecureConnectionsOnly, setLocalSecureConnectionsOnly] = useState(secureConnectionsOnly);
  const [retryErrorBlocks, setRetryErrorBlocks] = useState(true);
  const [cacheStats, setCacheStats] = useState({
    totalBlocks: 0,
    oldestBlock: undefined as number | undefined,
    newestBlock: undefined as number | undefined,
    sizeEstimate: "0 B",
    errorBlocks: 0,
  });
  const [isExportingCache, setIsExportingCache] = useState(false);
  const [isImportingCache, setIsImportingCache] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load custom providers from localStorage
  useEffect(() => {
    const savedCustomProviders = localStorage.getItem(
      "chainhound_custom_providers"
    );
    if (savedCustomProviders) {
      setCustomProviders(JSON.parse(savedCustomProviders));
    }

    // Load dark mode setting
    const savedDarkMode = localStorage.getItem("chainhound_dark_mode");
    if (savedDarkMode !== null) {
      const isDarkMode = savedDarkMode === "true";
      setDarkMode(isDarkMode);
      applyDarkMode(isDarkMode);
    } else {
      // Default to dark mode if not set
      applyDarkMode(true);
    }

    // Load other settings
    const savedEtherscanApiKey = localStorage.getItem(
      "chainhound_etherscan_api_key"
    );
    if (savedEtherscanApiKey) {
      setEtherscanApiKey(savedEtherscanApiKey);
    }

    const savedAutoRefresh = localStorage.getItem("chainhound_auto_refresh");
    if (savedAutoRefresh !== null) {
      setAutoRefresh(savedAutoRefresh === "true");
    }

    const savedRefreshInterval = localStorage.getItem(
      "chainhound_refresh_interval"
    );
    if (savedRefreshInterval) {
      setRefreshInterval(parseInt(savedRefreshInterval, 10));
    }

    const savedSecureConnectionsOnly = localStorage.getItem(
      "chainhound_secure_connections_only"
    );
    if (savedSecureConnectionsOnly !== null) {
      setLocalSecureConnectionsOnly(savedSecureConnectionsOnly === "true");
    }

    const savedRetryErrorBlocks = localStorage.getItem(
      "chainhound_retry_error_blocks"
    );
    if (savedRetryErrorBlocks !== null) {
      setRetryErrorBlocks(savedRetryErrorBlocks === "true");
    } else {
      // Default to true if not set
      localStorage.setItem("chainhound_retry_error_blocks", "true");
    }

    // Load cache stats
    loadCacheStats();
  }, []);

  const loadCacheStats = async () => {
    try {
      const stats = await blockCache.getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error("Failed to load cache stats:", error);
    }
  };

  const applyDarkMode = (enabled: boolean) => {
    if (enabled) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage({ type: "", text: "" });

    try {
      // Validate provider URL
      if (localSecureConnectionsOnly && web3Provider.startsWith("http://")) {
        throw new Error(
          "Insecure HTTP connections are not allowed. Please use HTTPS."
        );
      }

      if (localSecureConnectionsOnly && web3Provider.startsWith("ws://")) {
        throw new Error(
          "Insecure WebSocket connections are not allowed. Please use WSS."
        );
      }

      // Save provider settings
      await setProvider(web3Provider);

      // Save custom providers
      localStorage.setItem(
        "chainhound_custom_providers",
        JSON.stringify(customProviders)
      );

      // Save other settings
      localStorage.setItem("chainhound_etherscan_api_key", etherscanApiKey);
      localStorage.setItem("chainhound_auto_refresh", String(autoRefresh));
      localStorage.setItem(
        "chainhound_refresh_interval",
        String(refreshInterval)
      );
      localStorage.setItem("chainhound_dark_mode", String(darkMode));
      localStorage.setItem(
        "chainhound_secure_connections_only",
        String(localSecureConnectionsOnly)
      );
      localStorage.setItem(
        "chainhound_retry_error_blocks",
        String(retryErrorBlocks)
      );

      // Apply dark mode
      applyDarkMode(darkMode);

      // Apply debug mode
      setDebugMode(localDebugMode);

      // Apply auto-reconnect
      setAutoReconnect(localAutoReconnect);

      // Apply secure connections only
      setSecureConnectionsOnly(localSecureConnectionsOnly);

      setSaveMessage({ type: "success", text: "Settings saved successfully!" });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      setSaveMessage({
        type: "error",
        text:
          error.message ||
          "Failed to save settings. Please check your provider URL.",
      });
    } finally {
      setIsSaving(false);

      // Clear success message after 3 seconds
      if (saveMessage.type === "success") {
        setTimeout(() => {
          setSaveMessage({ type: "", text: "" });
        }, 3000);
      }
    }
  };

  const addCustomProvider = () => {
    if (
      !newCustomProvider.trim() ||
      customProviders.includes(newCustomProvider)
    ) {
      return;
    }

    // Validate if secure connections only is enabled
    if (localSecureConnectionsOnly) {
      if (newCustomProvider.startsWith("http://")) {
        setSaveMessage({
          type: "error",
          text: "Insecure HTTP connections are not allowed. Please use HTTPS.",
        });
        return;
      }

      if (newCustomProvider.startsWith("ws://")) {
        setSaveMessage({
          type: "error",
          text: "Insecure WebSocket connections are not allowed. Please use WSS.",
        });
        return;
      }
    }

    const updatedProviders = [...customProviders, newCustomProvider];
    setCustomProviders(updatedProviders);
    setNewCustomProvider("");
    setSaveMessage({ type: "", text: "" });
  };

  const removeCustomProvider = (provider: string) => {
    setCustomProviders(customProviders.filter((p) => p !== provider));
  };

  const isSecureProvider = (url: string): boolean => {
    return url.startsWith("https://") || url.startsWith("wss://");
  };

  const handleExportCache = async () => {
    setIsExportingCache(true);
    try {
      await exportCache();
      setSaveMessage({ type: "success", text: "Cache exported successfully!" });
    } catch (error: any) {
      setSaveMessage({
        type: "error",
        text: error.message || "Failed to export cache.",
      });
    } finally {
      setIsExportingCache(false);
    }
  };

  const handleFileInputClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImportCache = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingCache(true);
    try {
      await importCache(file);
      await loadCacheStats();
      setSaveMessage({ type: "success", text: "Cache imported successfully!" });
    } catch (error: any) {
      setSaveMessage({
        type: "error",
        text: error.message || "Failed to import cache.",
      });
    } finally {
      setIsImportingCache(false);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
        setSaveMessage({
          type: "success",
          text: "Cache cleared successfully!",
        });
      } catch (error: any) {
        setSaveMessage({
          type: "error",
          text: error.message || "Failed to clear cache.",
        });
      }
    }
  };

  const handleClearErrorBlocks = async () => {
    if (
      confirm(
        "Are you sure you want to clear all error blocks? This will remove all records of blocks that failed to fetch."
      )
    ) {
      try {
        await blockCache.clearErrorBlocks();
        await loadCacheStats();
        setSaveMessage({
          type: "success",
          text: "Error blocks cleared successfully!",
        });
      } catch (error: any) {
        setSaveMessage({
          type: "error",
          text: error.message || "Failed to clear error blocks.",
        });
      }
    }
  };

  const handleFixErrorBlocks = async () => {
    if (
      confirm(
        "Attempt to fix all error blocks? This will retry fetching all blocks that previously failed."
      )
    ) {
      try {
        setSaveMessage({
          type: "info",
          text: "Fixing error blocks, please wait...",
        });
        const errorBlocks = await blockCache.getErrorBlocksInRange(
          0,
          Number.MAX_SAFE_INTEGER
        );
        let fixed = 0;
        for (const err of errorBlocks) {
          try {
            // Use the same fetch and cache logic as BlockExplorer
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
        setSaveMessage({
          type: "success",
          text: `Fixed ${fixed} error blocks!`,
        });
      } catch (error: any) {
        setSaveMessage({
          type: "error",
          text: error.message || "Failed to fix error blocks.",
        });
      }
    }
  };

  const handleResetSettings = async () => {
    setIsResetting(true);
    try {
      await resetSettings();

      // Update local state
      setWeb3Provider(provider);
      setLocalDebugMode(debugMode);
      setLocalAutoReconnect(autoReconnect);
      setLocalSecureConnectionsOnly(secureConnectionsOnly);
      setDarkMode(document.documentElement.classList.contains("dark"));
      setRetryErrorBlocks(true);

      setSaveMessage({ type: "success", text: "Settings reset to defaults!" });
    } catch (error: any) {
      setSaveMessage({
        type: "error",
        text: error.message || "Failed to reset settings.",
      });
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md dark:bg-gray-800 dark:text-white">
        <div className="flex items-center mb-4">
          <SettingsIcon className="h-6 w-6 mr-2 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <p className="text-gray-600 mb-6 dark:text-gray-300">
          Configure your ChainHound application settings.
        </p>

        {saveMessage.text && (
          <div
            className={`p-3 rounded mb-4 ${
              saveMessage.type === "success"
                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
            }`}
          >
            {saveMessage.text}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Blockchain Connections
            </h2>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg border dark:bg-gray-700 dark:border-gray-600">
              <h3 className="text-sm font-medium mb-2">Connection Status</h3>
              <ProviderStatus />
            </div>

            <div className="space-y-4">
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="secureConnectionsOnly"
                  checked={localSecureConnectionsOnly}
                  onChange={(e) => setLocalSecureConnectionsOnly(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                />
                <label
                  htmlFor="secureConnectionsOnly"
                  className="ml-2 flex items-center text-sm text-gray-700 dark:text-gray-300"
                >
                  <Shield className="h-4 w-4 mr-1 text-green-600" />
                  Use secure connections only (HTTPS/WSS)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Web3 Provider URL
                </label>
                <select
                  value={web3Provider}
                  onChange={(e) => setWeb3Provider(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <optgroup label="Default Providers">
                    {availableProviders
                      .filter(
                        (p) => !localSecureConnectionsOnly || isSecureProvider(p.url)
                      )
                      .map((p, index) => (
                        <option key={`default-${index}`} value={p.url}>
                          {p.name}
                        </option>
                      ))}
                  </optgroup>

                  {customProviders.length > 0 && (
                    <optgroup label="Custom Providers">
                      {customProviders
                        .filter(
                          (p) => !localSecureConnectionsOnly || isSecureProvider(p)
                        )
                        .map((p, index) => (
                          <option key={`custom-${index}`} value={p}>
                            {p}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Select an Ethereum node provider or add a custom one below
                </p>

                <div className="mt-3 flex items-center">
                  <div
                    className={`h-2 w-2 rounded-full mr-2 ${
                      isConnected ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></div>
                  <span className="text-sm">
                    {isConnected
                      ? "Connected to provider"
                      : "Not connected to provider"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Add Custom Provider
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={newCustomProvider}
                    onChange={(e) => setNewCustomProvider(e.target.value)}
                    className="flex-1 p-2 border rounded-l focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="e.g., https://eth-mainnet.alchemyapi.io/v2/your-api-key"
                  />
                  <button
                    onClick={addCustomProvider}
                    className="bg-indigo-600 text-white px-3 rounded-r hover:bg-indigo-700 transition"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                {localSecureConnectionsOnly && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Only secure URLs (https:// or wss://) are allowed
                  </p>
                )}
              </div>

              {customProviders.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custom Providers
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {customProviders.map((provider, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded dark:bg-gray-700"
                      >
                        <div className="text-sm truncate flex-1 mr-2 flex items-center">
                          {isSecureProvider(provider) ? (
                            <Shield className="h-3 w-3 mr-1 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 mr-1 text-amber-600" />
                          )}
                          {provider}
                        </div>
                        <button
                          onClick={() => removeCustomProvider(provider)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Etherscan API Key (Optional)
                </label>
                <input
                  type="text"
                  value={etherscanApiKey}
                  onChange={(e) => setEtherscanApiKey(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Your Etherscan API key"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  For enhanced transaction data and history
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Application Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                />
                <label
                  htmlFor="autoRefresh"
                  className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                >
                  Enable auto-refresh for blockchain data
                </label>
              </div>

              {autoRefresh && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Refresh Interval (seconds)
                  </label>
                  <input
                    type="number"
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    min={5}
                    max={300}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="retryErrorBlocks"
                  checked={retryErrorBlocks}
                  onChange={(e) => setRetryErrorBlocks(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                />
                <label
                  htmlFor="retryErrorBlocks"
                  className="ml-2 flex items-center text-sm text-gray-700 dark:text-gray-300"
                >
                  <RefreshCw className="h-4 w-4 mr-1 text-indigo-600" />
                  Automatically retry previously failed blocks during searches
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="darkMode"
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                />
                <label
                  htmlFor="darkMode"
                  className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                >
                  Enable dark mode
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="debugMode"
                  checked={localDebugMode}
                  onChange={(e) => setLocalDebugMode(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                />
                <label
                  htmlFor="debugMode"
                  className="ml-2 flex items-center text-sm text-gray-700 dark:text-gray-300"
                >
                  <Bug className="h-4 w-4 mr-1" />
                  Enable debug mode
                  <span className="ml-2 text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded dark:bg-indigo-900 dark:text-indigo-200">
                    Logs detailed information to console
                  </span>
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoReconnect"
                  checked={localAutoReconnect}
                  onChange={(e) => setLocalAutoReconnect(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                />
                <label
                  htmlFor="autoReconnect"
                  className="ml-2 flex items-center text-sm text-gray-700 dark:text-gray-300"
                >
                  <RefreshCw className="h-4 w-4 mr-1 text-indigo-600" />
                  Automatically reconnect when connection is lost
                </label>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">
              Block Cache Management
            </h2>
            <div className="p-4 bg-gray-50 rounded-lg border dark:bg-gray-700 dark:border-gray-600">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cache Statistics
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <p>
                      Total blocks:{" "}
                      <span className="font-medium">
                        {cacheStats.totalBlocks.toLocaleString()}
                      </span>
                    </p>
                    {cacheStats.oldestBlock && cacheStats.newestBlock && (
                      <p>
                        Block range:{" "}
                        <span className="font-medium">
                          {cacheStats.oldestBlock.toLocaleString()} -{" "}
                          {cacheStats.newestBlock.toLocaleString()}
                        </span>
                      </p>
                    )}
                    <p>
                      Estimated size:{" "}
                      <span className="font-medium">
                        {cacheStats.sizeEstimate}
                      </span>
                    </p>
                    <p>
                      Error blocks:{" "}
                      <span
                        className={`font-medium ${
                          cacheStats.errorBlocks > 0
                            ? "text-red-600 dark:text-red-400"
                            : ""
                        }`}
                      >
                        {cacheStats.errorBlocks.toLocaleString()}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportCache}
                      disabled={
                        isExportingCache || cacheStats.totalBlocks === 0
                      }
                      className={`flex items-center justify-center px-3 py-2 text-sm rounded ${
                        cacheStats.totalBlocks === 0
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      {isExportingCache ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-1" />
                          Export Cache
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleFileInputClick}
                      disabled={isImportingCache}
                      className="bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700 text-sm flex items-center justify-center"
                    >
                      {isImportingCache ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-1" />
                          Import Cache
                        </>
                      )}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImportCache}
                      accept=".json,.zip"
                      className="hidden"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleClearCache}
                      disabled={cacheStats.totalBlocks === 0}
                      className={`flex items-center justify-center px-3 py-2 text-sm rounded ${
                        cacheStats.totalBlocks === 0
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
                          : "bg-red-600 text-white hover:bg-red-700"
                      }`}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear Cache
                    </button>

                    {cacheStats.errorBlocks > 0 && (
                      <button
                        onClick={handleFixErrorBlocks}
                        className="bg-amber-600 text-white px-3 py-2 rounded hover:bg-amber-700 text-sm flex items-center justify-center"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Fix Error Blocks
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 flex items-start">
                <Database className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                <p>
                  Block cache stores blockchain data locally to improve
                  performance and reduce network requests. Exported cache files
                  can be shared between devices or saved as backups.
                </p>
              </div>

              {cacheStats.errorBlocks > 0 && (
                <div className="mt-2 p-2 bg-amber-50 text-amber-700 rounded-md text-xs flex items-start dark:bg-amber-900/30 dark:text-amber-200">
                  <AlertTriangle className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                  <p>
                    There are {cacheStats.errorBlocks} blocks that failed to
                    fetch. These will be retried during searches if
                    "Automatically retry previously failed blocks" is enabled.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between">
            <div>
              {!showResetConfirm ? (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 transition flex items-center dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  <span>Reset to Defaults</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600 dark:text-red-400">
                    Confirm reset?
                  </span>
                  <button
                    onClick={handleResetSettings}
                    disabled={isResetting}
                    className="bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700 transition text-sm flex items-center"
                  >
                    {isResetting ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        <span>Resetting...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-3 w-3 mr-1" />
                        <span>Yes, Reset</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="bg-gray-200 text-gray-700 py-1 px-3 rounded hover:bg-gray-300 transition text-sm dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition flex items-center"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
