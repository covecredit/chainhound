import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import Web3 from "web3";
import ethereumProviders from "../data/ethereumProviders.json";
import { blockCache } from "../services/BlockCache";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { safelyConvertBigIntToString } from "../utils/bigIntUtils";

// Import Ethereum providers from JSON file
export const ETHEREUM_PROVIDERS = ethereumProviders;

// Default settings
export const DEFAULT_SETTINGS = {
  provider: "https://cloudflare-eth.com", // Changed to Cloudflare's reliable endpoint
  autoReconnect: true,
  debugMode: true,
  secureConnectionsOnly: true,
  refreshInterval: 30,
  autoRefresh: true,
  maxRetries: 5,
  retryDelay: 2000,
  batchSize: 3, // Reduced batch size for better reliability
  maxConcurrentRequests: 2, // Limit concurrent requests
};

interface NetworkInfo {
  name: string;
  blockHeight: number;
  version?: string;
  chainId?: number;
  lastUpdated: Date;
  gasPrice?: string;
  syncStatus?: unknown;
}

interface WebSocketError {
  message: string;
  code?: number;
  reason?: string;
}

interface ProviderError {
  message: string;
  code?: number;
  data?: unknown;
}

interface Web3ContextType {
  web3: Web3 | null;
  provider: string;
  isConnected: boolean;
  networkInfo: NetworkInfo | null;
  setProvider: (url: string) => Promise<void>;
  availableProviders: typeof ETHEREUM_PROVIDERS;
  debugMode: boolean;
  setDebugMode: (enabled: boolean) => void;
  autoReconnect: boolean;
  setAutoReconnect: (enabled: boolean) => void;
  reconnectProvider: () => Promise<void>;
  isReconnecting: boolean;
  resetSettings: () => Promise<void>;
  exportCache: () => Promise<void>;
  importCache: (file: File) => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

// Filter providers to prefer secure connections
const getDefaultProvider = (): string => {
  // First try to get an HTTPS provider
  const httpsProvider = ETHEREUM_PROVIDERS.find(
    (p) => p.url.startsWith("https://") && !p.url.includes("localhost")
  );

  // Then try to get a WSS provider
  const wssProvider = ETHEREUM_PROVIDERS.find((p) =>
    p.url.startsWith("wss://")
  );

  // Fall back to any provider if no secure ones are available
  return httpsProvider?.url || wssProvider?.url || DEFAULT_SETTINGS.provider;
};

export const Web3Provider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [provider, setProviderUrl] = useState<string>(
    localStorage.getItem("chainhound_provider") || getDefaultProvider()
  );
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [debugMode, setDebugMode] = useState<boolean>(
    localStorage.getItem("chainhound_debug_mode") === "true" ||
      DEFAULT_SETTINGS.debugMode
  );
  const [autoReconnect, setAutoReconnectState] = useState<boolean>(
    localStorage.getItem("chainhound_auto_reconnect") !== "false"
  );
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const currentProviderRef = useRef<string>(provider);
  const web3InstanceRef = useRef<Web3 | null>(null);
  const providerFailuresRef = useRef<Map<string, number>>(new Map());
  const wsFailedRef = useRef<boolean>(false);

  const logDebug = (message: string, ...args: unknown[]) => {
    if (debugMode) {
      console.log(`[ChainHound Debug] ${message}`, ...args);
    }
  };

  const updateNetworkInfo = async (web3Instance: Web3) => {
    try {
      logDebug("Updating network info...");
      const startTime = performance.now();

      // Use getBlockNumber as a test for connection
      const blockNumber = await web3Instance.eth.getBlockNumber();
      const blockNumberAsNumber = Number(blockNumber);
      logDebug(`Current block number: ${blockNumberAsNumber}`);

      // Get chain ID
      const chainId = await web3Instance.eth.getChainId();
      const chainIdAsNumber = Number(chainId);
      logDebug(`Chain ID: ${chainIdAsNumber}`);

      // Get gas price
      const gasPrice = await web3Instance.eth.getGasPrice();
      const gasPriceGwei = web3Instance.utils.fromWei(
        gasPrice.toString(),
        "gwei"
      );
      logDebug(`Current gas price: ${gasPriceGwei} Gwei`);

      // Try to get sync status
      let syncStatus: unknown;
      try {
        syncStatus = await web3Instance.eth.isSyncing();
        logDebug("Sync status:", syncStatus);
      } catch (error) {
        logDebug("Error getting sync status:", error);
      }

      // Get network name based on chain ID
      let networkName = "Unknown Network";
      switch (chainIdAsNumber) {
        case 1:
          networkName = "Ethereum Mainnet";
          break;
        case 5:
          networkName = "Goerli Testnet";
          break;
        case 11155111:
          networkName = "Sepolia Testnet";
          break;
        default:
          networkName = `Chain ID: ${chainIdAsNumber}`;
      }

      // Try to get node info (may not be supported by all providers)
      let version: string | undefined;
      try {
        const clientVersion = await web3Instance.eth.getNodeInfo();
        version = clientVersion.split("/")[1];
        logDebug(`Node version: ${version}`);
      } catch (error) {
        logDebug("Node info not available:", error);
      }

      const endTime = performance.now();
      logDebug(
        `Network info update completed in ${(endTime - startTime).toFixed(2)}ms`
      );

      // Convert any BigInt values to strings to avoid serialization issues
      const safeNetworkInfo: NetworkInfo = {
        name: networkName,
        blockHeight: blockNumberAsNumber,
        version,
        chainId: chainIdAsNumber,
        lastUpdated: new Date(),
        gasPrice: gasPriceGwei,
        syncStatus,
      };

      setNetworkInfo(safeNetworkInfo);
      setIsConnected(true);

      // Reset reconnect attempts on successful connection
      setReconnectAttempts(0);

      // Reset failure count for this provider
      providerFailuresRef.current.delete(currentProviderRef.current);
    } catch (error) {
      console.error("Error fetching network info:", error);
      setNetworkInfo((prev) =>
        prev
          ? {
              ...prev,
              lastUpdated: new Date(),
            }
          : null
      );
      setIsConnected(false);

      // Increment failure count for this provider
      const currentFailures =
        providerFailuresRef.current.get(currentProviderRef.current) || 0;
      providerFailuresRef.current.set(
        currentProviderRef.current,
        currentFailures + 1
      );

      // Attempt to reconnect if auto-reconnect is enabled
      if (autoReconnect && reconnectAttempts < maxReconnectAttempts) {
        handleReconnect();
      }
    }
  };

  const handleReconnect = () => {
    if (isReconnecting) return;

    setIsReconnecting(true);
    setReconnectAttempts((prev) => prev + 1);

    // Clear any existing reconnect timer
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    // Exponential backoff for reconnect attempts
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000);
    logDebug(
      `Scheduling reconnect attempt ${
        reconnectAttempts + 1
      }/${maxReconnectAttempts} in ${delay}ms`
    );

    reconnectTimerRef.current = setTimeout(() => {
      logDebug(
        `Attempting to reconnect (attempt ${
          reconnectAttempts + 1
        }/${maxReconnectAttempts})...`
      );

      // If we've had multiple failures with the current provider, try a different one
      const currentFailures =
        providerFailuresRef.current.get(currentProviderRef.current) || 0;
      if (currentFailures >= 2 || wsFailedRef.current) {
        logDebug(
          `Provider ${currentProviderRef.current} has failed ${currentFailures} times, trying another provider...`
        );
        tryAlternativeProvider().finally(() => {
          setIsReconnecting(false);
        });
      } else {
        reconnectProvider().finally(() => {
          setIsReconnecting(false);
        });
      }
    }, delay);
  };

  // Try a different provider from the list
  const tryAlternativeProvider = async (): Promise<boolean> => {
    // Get all providers from the list
    const availableProviders = ETHEREUM_PROVIDERS.map((p) => p.url);

    // Filter out the current provider and any that have failed
    const filteredProviders = availableProviders.filter((url) => {
      if (url === currentProviderRef.current) return false;
      const failures = providerFailuresRef.current.get(url) || 0;
      return failures < 2; // Only try providers that have failed less than twice
    });
    // If WebSockets have failed, prioritize HTTPS providers
    let orderedProviders: string[];
    if (wsFailedRef.current) {
      // Only use HTTPS providers if WebSockets have failed
      const httpsProviders = filteredProviders.filter((url) =>
        url.startsWith("https://")
      );
      orderedProviders = httpsProviders;
      logDebug("WebSockets failed, using only HTTPS providers");
    } else {
      // Prioritize HTTPS providers, then try WSS
      const httpsProviders = filteredProviders.filter((url) =>
        url.startsWith("https://")
      );
      const wssProviders = filteredProviders.filter((url) =>
        url.startsWith("wss://")
      );
      orderedProviders = [...httpsProviders, ...wssProviders];
    }

    if (orderedProviders.length === 0) {
      logDebug("No alternative providers available");
      return false;
    }

    // Try each provider in order
    for (const providerUrl of orderedProviders) {
      logDebug(`Trying alternative provider: ${providerUrl}`);
      try {
        await setProvider(providerUrl);
        return true;
      } catch (error) {
        logDebug(`Alternative provider ${providerUrl} failed:`, error);
        // Mark this provider as failed
        providerFailuresRef.current.set(
          providerUrl,
          (providerFailuresRef.current.get(providerUrl) || 0) + 1
        );

        // If it's a WebSocket provider that failed, mark WebSockets as failed
        if (providerUrl.startsWith("wss://")) {
          wsFailedRef.current = true;
          logDebug("Marking WebSockets as failed");
        }
      }
    }

    logDebug("All alternative providers failed");
    return false;
  };

  // Clean up all active connections and timeouts
  const cleanupConnections = () => {
    logDebug("Cleaning up connections and timeouts");

    // Clear reconnect timer
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    // Close WebSocket connection if applicable
    if (web3InstanceRef.current?.currentProvider) {
      const provider = web3InstanceRef.current.currentProvider;

      // Check if it's a WebSocket provider
      if (
        provider instanceof Web3.providers.WebsocketProvider &&
        typeof provider.disconnect === "function"
      ) {
        try {
          provider.disconnect();
          logDebug("WebSocket connection closed");
        } catch (error) {
          logDebug("Error closing WebSocket connection:", error);
        }
      }
    }
  };

  const setProvider = async (url: string) => {
    let retries = 0;
    const maxRetries = DEFAULT_SETTINGS.maxRetries;

    const tryConnect = async (): Promise<Web3> => {
      try {
        logDebug(
          `Attempting to connect to provider (attempt ${retries + 1}/${
            maxRetries + 1
          })`
        );

        // Clean up existing connections
        cleanupConnections();

        // Ensure we're using secure connections when possible
        let secureUrl = url;
        if (url.startsWith("http://")) {
          const secureVersion = url.replace("http://", "https://");
          logDebug(`Converting insecure URL to secure: ${secureVersion}`);
          secureUrl = secureVersion;
        } else if (url.startsWith("ws://")) {
          const secureVersion = url.replace("ws://", "wss://");
          logDebug(`Converting insecure WebSocket to secure: ${secureVersion}`);
          secureUrl = secureVersion;
        }

        let newWeb3;

        // Check if it's a WebSocket provider
        if (secureUrl.startsWith("ws://") || secureUrl.startsWith("wss://")) {
          if (wsFailedRef.current) {
            throw new Error(
              "WebSocket connections have failed, using HTTPS instead"
            );
          }

          logDebug("Creating WebSocket provider...");

          const wsProvider = new Web3.providers.WebsocketProvider(secureUrl, {
            timeout: 30000,
          });

          wsProvider.on("connect", () => logDebug("WebSocket connected"));
          wsProvider.on("error", (err: unknown) => {
            logDebug("WebSocket error:", err);
            wsFailedRef.current = true;
          });
          wsProvider.on("end", () => logDebug("WebSocket connection ended"));

          newWeb3 = new Web3(wsProvider);
        } else {
          logDebug("Creating HTTP provider...");

          const httpProvider = new Web3.providers.HttpProvider(secureUrl, {
            timeout: 30000,
            withCredentials: false,
            headers: [
              {
                name: "Content-Type",
                value: "application/json",
              },
            ],
          } as any);

          // Override the send method to use XMLHttpRequest
          const originalSend = httpProvider.send.bind(httpProvider);
          httpProvider.send = function (
            payload: any,
            callback: (error: Error | null, result?: any) => void
          ) {
            const request = new XMLHttpRequest();
            request.open("POST", secureUrl, true);
            request.setRequestHeader("Content-Type", "application/json");

            request.onreadystatechange = function () {
              if (request.readyState === 4) {
                try {
                  if (request.status >= 200 && request.status < 300) {
                    const response = JSON.parse(request.responseText);
                    callback(null, response);
                  } else {
                    // Handle rate limiting
                    if (request.status === 429) {
                      setTimeout(() => {
                        originalSend(payload, callback);
                      }, 1000);
                      return;
                    }

                    const error = new Error(
                      `HTTP ${request.status}: ${request.statusText}`
                    );
                    callback(error);
                  }
                } catch (error) {
                  callback(
                    error instanceof Error ? error : new Error(String(error))
                  );
                }
              }
            };

            try {
              request.send(JSON.stringify(payload));
            } catch (error) {
              callback(
                error instanceof Error ? error : new Error(String(error))
              );
            }
          };

          newWeb3 = new Web3(httpProvider);
        }

        // Test connection
        await newWeb3.eth.getBlockNumber();

        return newWeb3;
      } catch (error) {
        if (retries < maxRetries) {
          retries++;
          const delay = DEFAULT_SETTINGS.retryDelay * Math.pow(2, retries - 1);
          logDebug(`Connection failed, retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return tryConnect();
        }
        throw error;
      }
    };

    try {
      const newWeb3 = await tryConnect();

      // Configure Web3 instance
      newWeb3.eth.handleRevert = true;

      // Update refs and state
      web3InstanceRef.current = newWeb3;
      currentProviderRef.current = url;

      setWeb3(newWeb3);
      setProviderUrl(url);
      localStorage.setItem("chainhound_provider", url);

      await updateNetworkInfo(newWeb3);

      // Reset failure count for this provider
      providerFailuresRef.current.delete(url);
    } catch (error) {
      console.error("Failed to connect to provider:", error);
      logDebug("Connection failed:", error);

      if (url.startsWith("wss://")) {
        wsFailedRef.current = true;
        logDebug("Marking WebSockets as failed");
      }

      // Increment failure count for this provider
      const failures = (providerFailuresRef.current.get(url) || 0) + 1;
      providerFailuresRef.current.set(url, failures);

      setIsConnected(false);
      setNetworkInfo(null);

      // If this provider has failed multiple times, try an alternative
      if (failures >= 2) {
        logDebug(
          `Provider ${url} has failed ${failures} times, trying alternative...`
        );
        await tryAlternativeProvider();
      } else {
        throw error;
      }
    }
  };

  // Reconnect to the current provider
  const reconnectProvider = async (): Promise<void> => {
    try {
      logDebug("Reconnecting to provider...");
      await setProvider(currentProviderRef.current);
    } catch (error) {
      logDebug("Reconnection failed:", error);
    }
  };

  // Set auto-reconnect setting
  const setAutoReconnect = (enabled: boolean) => {
    setAutoReconnectState(enabled);
    localStorage.setItem("chainhound_auto_reconnect", String(enabled));
  };

  // Update debug mode setting
  const toggleDebugMode = (enabled: boolean) => {
    setDebugMode(enabled);
    localStorage.setItem("chainhound_debug_mode", String(enabled));
    console.log(`[ChainHound] Debug mode ${enabled ? "enabled" : "disabled"}`);
  };

  // Reset all settings to defaults
  const resetSettings = async () => {
    logDebug("Resetting all settings to defaults");

    // Clean up existing connections
    cleanupConnections();

    // Reset localStorage settings
    localStorage.removeItem("chainhound_provider");
    localStorage.removeItem("chainhound_debug_mode");
    localStorage.removeItem("chainhound_auto_reconnect");
    localStorage.removeItem("chainhound_dark_mode");
    localStorage.removeItem("chainhound_custom_providers");
    localStorage.removeItem("chainhound_etherscan_api_key");
    localStorage.removeItem("chainhound_auto_refresh");
    localStorage.removeItem("chainhound_refresh_interval");
    localStorage.removeItem("chainhound_secure_connections_only");

    // Reset state
    setDebugMode(DEFAULT_SETTINGS.debugMode);
    setAutoReconnectState(DEFAULT_SETTINGS.autoReconnect);

    // Apply dark mode
    if (DEFAULT_SETTINGS.debugMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Reset provider failures tracking
    providerFailuresRef.current.clear();
    wsFailedRef.current = false;

    // Reconnect with default provider
    await setProvider(getDefaultProvider());
  };

  // Export cache to a file
  const exportCache = async () => {
    try {
      logDebug("Exporting block cache...");
      const blocks = await blockCache.getAllBlocks();

      if (blocks.length === 0) {
        throw new Error("No blocks in cache to export");
      }

      const cacheData = {
        version: 1,
        timestamp: new Date().toISOString(),
        blocks,
      };

      const json = JSON.stringify(cacheData);
      const blob = new Blob([json], { type: "application/json" });

      // Create a zip file to reduce size
      const zip = new JSZip();
      zip.file("chainhound-cache.json", blob);
      const zipBlob = await zip.generateAsync({ type: "blob" });

      saveAs(zipBlob, `chainhound-cache-${Date.now()}.zip`);
      logDebug(`Exported ${blocks.length} blocks from cache`);
    } catch (error) {
      console.error("Failed to export cache:", error);
      logDebug("Export cache failed:", error);
      throw error;
    }
  };

  // Import cache from a file
  const importCache = async (file: File) => {
    try {
      logDebug("Importing block cache...");

      if (file.type === "application/zip" || file.name.endsWith(".zip")) {
        // Handle zip file
        const zip = new JSZip();
        const zipContents = await zip.loadAsync(file);

        // Find the JSON file in the zip
        const jsonFile = Object.values(zipContents.files).find(
          (f) => !f.dir && f.name.endsWith(".json")
        );

        if (!jsonFile) {
          throw new Error("No JSON file found in the zip archive");
        }

        const jsonContent = await jsonFile.async("string");
        const cacheData = JSON.parse(jsonContent);

        if (!cacheData.blocks || !Array.isArray(cacheData.blocks)) {
          throw new Error("Invalid cache file format");
        }

        // Import blocks to cache
        await blockCache.cacheBlocks(cacheData.blocks);
        logDebug(`Imported ${cacheData.blocks.length} blocks to cache`);
      } else {
        // Handle JSON file directly
        const reader = new FileReader();

        const jsonContent = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });

        const cacheData = JSON.parse(jsonContent);

        if (!cacheData.blocks || !Array.isArray(cacheData.blocks)) {
          throw new Error("Invalid cache file format");
        }

        // Import blocks to cache
        await blockCache.cacheBlocks(cacheData.blocks);
        logDebug(`Imported ${cacheData.blocks.length} blocks to cache`);
      }
    } catch (error) {
      console.error("Failed to import cache:", error);
      logDebug("Import cache failed:", error);
      throw error;
    }
  };

  // Initialize Web3 with the saved provider
  useEffect(() => {
    const initWeb3 = async () => {
      try {
        logDebug("Initializing Web3...");
        await setProvider(provider);
      } catch (error) {
        console.error(
          "Failed to initialize with saved provider, trying alternative",
          error
        );
        logDebug(
          "Failed to initialize with saved provider, trying alternative:",
          error
        );
        // Try with an alternative provider
        try {
          await tryAlternativeProvider();
        } catch (fallbackError) {
          console.error(
            "Failed to initialize with alternative provider",
            fallbackError
          );
          logDebug(
            "Failed to initialize with alternative provider:",
            fallbackError
          );
        }
      }
    };

    initWeb3();

    // Set up periodic network info updates
    const intervalId = setInterval(() => {
      if (web3InstanceRef.current && isConnected) {
        logDebug("Running periodic network info update");
        updateNetworkInfo(web3InstanceRef.current);
      }
    }, 30000); // Update every 30 seconds

    return () => {
      clearInterval(intervalId);
      cleanupConnections();
    };
  }, []);

  return (
    <Web3Context.Provider
      value={{
        web3,
        provider,
        isConnected,
        networkInfo,
        setProvider,
        availableProviders: ETHEREUM_PROVIDERS,
        debugMode,
        setDebugMode: toggleDebugMode,
        autoReconnect,
        setAutoReconnect,
        reconnectProvider,
        isReconnecting,
        resetSettings,
        exportCache,
        importCache,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3Context = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error("useWeb3Context must be used within a Web3Provider");
  }
  return context;
};