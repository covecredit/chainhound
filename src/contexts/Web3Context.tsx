import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import Web3 from 'web3';
import ethereumProviders from '../data/ethereumProviders.json';
import { blockCache } from '../services/BlockCache';

// Import Ethereum providers from JSON file
export const ETHEREUM_PROVIDERS = ethereumProviders;

// Default settings
export const DEFAULT_SETTINGS = {
  provider: 'https://eth.llamarpc.com',
  autoReconnect: true,
  debugMode: false,
  secureConnectionsOnly: true,
  refreshInterval: 30,
  autoRefresh: true
};

interface NetworkInfo {
  name: string;
  blockHeight: number;
  version?: string;
  chainId?: number;
  lastUpdated: Date;
  gasPrice?: string;
  syncStatus?: any;
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
  // First try to get a secure WebSocket provider
  const secureWsProvider = ETHEREUM_PROVIDERS.find(p => 
    p.url.startsWith('wss://') && !p.url.includes('localhost')
  );
  
  // Then try to get a secure HTTP provider
  const secureHttpProvider = ETHEREUM_PROVIDERS.find(p => 
    p.url.startsWith('https://') && !p.url.includes('localhost')
  );
  
  // Fall back to any provider if no secure ones are available
  return secureWsProvider?.url || secureHttpProvider?.url || DEFAULT_SETTINGS.provider;
};

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [provider, setProviderUrl] = useState<string>(
    localStorage.getItem('chainhound_provider') || getDefaultProvider()
  );
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [debugMode, setDebugMode] = useState<boolean>(
    localStorage.getItem('chainhound_debug_mode') === 'true'
  );
  const [autoReconnect, setAutoReconnectState] = useState<boolean>(
    localStorage.getItem('chainhound_auto_reconnect') !== 'false'
  );
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const requestTimeoutRef = useRef<Map<string, number>>(new Map());
  const retryRequestsRef = useRef<Map<string, { retries: number, maxRetries: number }>>(new Map());
  const currentProviderRef = useRef<string>(provider);
  const web3InstanceRef = useRef<Web3 | null>(null);

  const logDebug = (message: string, ...args: any[]) => {
    if (debugMode) {
      console.log(`[ChainHound Debug] ${message}`, ...args);
    }
  };

  // Helper function to safely convert BigInt values to strings
  const safelyConvertBigIntToString = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'bigint') {
      return obj.toString();
    }
    
    if (typeof obj === 'object') {
      if (Array.isArray(obj)) {
        return obj.map(item => safelyConvertBigIntToString(item));
      }
      
      const result: Record<string, any> = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          result[key] = safelyConvertBigIntToString(obj[key]);
        }
      }
      return result;
    }
    
    return obj;
  };

  const updateNetworkInfo = async (web3Instance: Web3) => {
    try {
      logDebug('Updating network info...');
      const startTime = performance.now();
      
      const blockNumber = await web3Instance.eth.getBlockNumber();
      logDebug(`Current block number: ${blockNumber}`);
      
      const chainId = await web3Instance.eth.getChainId();
      logDebug(`Chain ID: ${chainId}`);
      
      // Get gas price
      const gasPrice = await web3Instance.eth.getGasPrice();
      const gasPriceGwei = web3Instance.utils.fromWei(gasPrice.toString(), 'gwei');
      logDebug(`Current gas price: ${gasPriceGwei} Gwei`);
      
      // Try to get sync status
      let syncStatus;
      try {
        syncStatus = await web3Instance.eth.isSyncing();
        logDebug('Sync status:', syncStatus);
      } catch (error) {
        logDebug('Error getting sync status:', error);
      }
      
      // Get network name based on chain ID
      let networkName = 'Unknown Network';
      switch (chainId) {
        case 1:
          networkName = 'Ethereum Mainnet';
          break;
        case 5:
          networkName = 'Goerli Testnet';
          break;
        case 11155111:
          networkName = 'Sepolia Testnet';
          break;
        default:
          networkName = `Chain ID: ${chainId}`;
      }
      
      // Try to get node info (may not be supported by all providers)
      let version;
      try {
        const clientVersion = await (web3Instance as any).eth.getNodeInfo();
        version = clientVersion.split('/')[1];
        logDebug(`Node version: ${version}`);
      } catch (error) {
        logDebug('Node info not available:', error);
      }
      
      const endTime = performance.now();
      logDebug(`Network info update completed in ${(endTime - startTime).toFixed(2)}ms`);
      
      // Convert any BigInt values to strings
      const safeNetworkInfo = {
        name: networkName,
        blockHeight: blockNumber,
        version,
        chainId,
        lastUpdated: new Date(),
        gasPrice: gasPriceGwei,
        syncStatus: safelyConvertBigIntToString(syncStatus)
      };
      
      setNetworkInfo(safeNetworkInfo);
      setIsConnected(true);
      
      // Reset reconnect attempts on successful connection
      setReconnectAttempts(0);
    } catch (error) {
      console.error('Error fetching network info:', error);
      setNetworkInfo(prev => prev ? {
        ...prev,
        lastUpdated: new Date()
      } : null);
      setIsConnected(false);
      
      // Attempt to reconnect if auto-reconnect is enabled
      if (autoReconnect && reconnectAttempts < maxReconnectAttempts) {
        handleReconnect();
      }
    }
  };

  const handleReconnect = () => {
    if (isReconnecting) return;
    
    setIsReconnecting(true);
    setReconnectAttempts(prev => prev + 1);
    
    // Clear any existing reconnect timer
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    // Exponential backoff for reconnect attempts
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    logDebug(`Scheduling reconnect attempt ${reconnectAttempts + 1} in ${delay}ms`);
    
    reconnectTimerRef.current = setTimeout(() => {
      logDebug(`Attempting to reconnect (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})...`);
      reconnectProvider().finally(() => {
        setIsReconnecting(false);
      });
    }, delay);
  };

  // Custom provider with retry logic for timeouts
  const createCustomProvider = (url: string, options: any = {}) => {
    const originalSend = Web3.providers.HttpProvider.prototype.send;
    
    // Create a subclass of HttpProvider with retry logic
    class RetryingHttpProvider extends Web3.providers.HttpProvider {
      send(payload: any, callback: any) {
        const requestId = typeof payload.id === 'number' ? payload.id.toString() : JSON.stringify(payload);
        
        // Check if we're already tracking this request
        if (!retryRequestsRef.current.has(requestId)) {
          retryRequestsRef.current.set(requestId, { retries: 0, maxRetries: 3 });
        }
        
        const requestInfo = retryRequestsRef.current.get(requestId)!;
        
        // Set a timeout for this request
        const timeoutId = window.setTimeout(() => {
          // Request timed out
          if (requestInfo.retries < requestInfo.maxRetries) {
            // Retry the request
            requestInfo.retries++;
            retryRequestsRef.current.set(requestId, requestInfo);
            logDebug(`Request ${requestId} timed out. Retrying (${requestInfo.retries}/${requestInfo.maxRetries})...`);
            
            // Clear the timeout
            requestTimeoutRef.current.delete(requestId);
            
            // Retry the request
            this.send(payload, callback);
          } else {
            // Max retries reached, call the callback with an error
            logDebug(`Request ${requestId} failed after ${requestInfo.maxRetries} retries.`);
            callback(new Error(`Request timed out after ${requestInfo.maxRetries} retries`), null);
            
            // Clean up
            requestTimeoutRef.current.delete(requestId);
            retryRequestsRef.current.delete(requestId);
          }
        }, 15000); // 15 second timeout
        
        // Store the timeout ID
        requestTimeoutRef.current.set(requestId, timeoutId);
        
        // Call the original send method
        originalSend.call(this, payload, (error: any, result: any) => {
          // Clear the timeout
          if (requestTimeoutRef.current.has(requestId)) {
            clearTimeout(requestTimeoutRef.current.get(requestId));
            requestTimeoutRef.current.delete(requestId);
          }
          
          // Clean up retry tracking
          retryRequestsRef.current.delete(requestId);
          
          // Call the original callback
          callback(error, result);
        });
      }
    }
    
    return new RetryingHttpProvider(url, options);
  };

  // Clean up all active connections and timeouts
  const cleanupConnections = () => {
    logDebug('Cleaning up connections and timeouts');
    
    // Clear all request timeouts
    requestTimeoutRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    requestTimeoutRef.current.clear();
    
    // Clear reconnect timer
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    // Clear retry tracking
    retryRequestsRef.current.clear();
    
    // Close WebSocket connection if applicable
    if (web3InstanceRef.current && 
        web3InstanceRef.current.currentProvider && 
        typeof (web3InstanceRef.current.currentProvider as any).disconnect === 'function') {
      try {
        (web3InstanceRef.current.currentProvider as any).disconnect();
        logDebug('WebSocket connection closed');
      } catch (error) {
        logDebug('Error closing WebSocket connection:', error);
      }
    }
  };

  const setProvider = async (url: string) => {
    try {
      // Skip if the provider URL hasn't changed
      if (url === currentProviderRef.current && web3InstanceRef.current) {
        logDebug('Provider URL unchanged, skipping reconnection');
        return;
      }
      
      logDebug(`Setting provider to: ${url}`);
      const startTime = performance.now();
      
      // Clean up existing connections
      cleanupConnections();
      
      // Ensure we're using secure connections when possible
      let secureUrl = url;
      if (url.startsWith('http://')) {
        const secureVersion = url.replace('http://', 'https://');
        logDebug(`Converting insecure URL to secure: ${secureVersion}`);
        secureUrl = secureVersion;
      } else if (url.startsWith('ws://')) {
        const secureVersion = url.replace('ws://', 'wss://');
        logDebug(`Converting insecure WebSocket to secure: ${secureVersion}`);
        secureUrl = secureVersion;
      }
      
      let newWeb3;
      
      // Check if it's a WebSocket provider
      if (secureUrl.startsWith('ws://') || secureUrl.startsWith('wss://')) {
        logDebug('Creating WebSocket provider...');
        newWeb3 = new Web3(new Web3.providers.WebsocketProvider(secureUrl, {
          timeout: 30000,
          reconnect: {
            auto: true,
            delay: 5000,
            maxAttempts: 5,
            onTimeout: true
          }
        }));
      } else {
        // Create a custom provider that works around CORS issues
        logDebug('Creating HTTP provider with CORS handling...');
        
        // Create custom HTTP provider with retry logic
        const httpProvider = createCustomProvider(secureUrl, {
          timeout: 30000,
          withCredentials: false,
          headers: [
            {
              name: 'Accept',
              value: 'application/json'
            }
          ]
        });
        
        newWeb3 = new Web3(httpProvider);
      }
      
      // Test connection
      logDebug('Testing connection...');
      const blockNumber = await newWeb3.eth.getBlockNumber();
      logDebug(`Connection successful. Current block: ${blockNumber}`);
      
      // Update refs and state
      web3InstanceRef.current = newWeb3;
      currentProviderRef.current = secureUrl;
      
      setWeb3(newWeb3);
      setProviderUrl(secureUrl);
      localStorage.setItem('chainhound_provider', secureUrl);
      
      await updateNetworkInfo(newWeb3);
      
      const endTime = performance.now();
      logDebug(`Provider setup completed in ${(endTime - startTime).toFixed(2)}ms`);
    } catch (error) {
      console.error('Failed to connect to provider:', error);
      logDebug('Connection failed:', error);
      setIsConnected(false);
      setNetworkInfo(null);
      throw error; // Re-throw to handle in the UI
    }
  };

  // Update auto-reconnect setting
  const setAutoReconnect = (enabled: boolean) => {
    setAutoReconnectState(enabled);
    localStorage.setItem('chainhound_auto_reconnect', String(enabled));
    logDebug(`Auto-reconnect ${enabled ? 'enabled' : 'disabled'}`);
  };

  // Reconnect to the current provider
  const reconnectProvider = async () => {
    setIsReconnecting(true);
    try {
      logDebug('Manually reconnecting to provider...');
      await setProvider(currentProviderRef.current);
      logDebug('Reconnection successful');
    } catch (error) {
      logDebug('Manual reconnection failed:', error);
      console.error('Failed to reconnect:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  // Reset all settings to defaults
  const resetSettings = async () => {
    logDebug('Resetting all settings to defaults...');
    
    // Reset local storage values
    localStorage.setItem('chainhound_provider', DEFAULT_SETTINGS.provider);
    localStorage.setItem('chainhound_auto_reconnect', String(DEFAULT_SETTINGS.autoReconnect));
    localStorage.setItem('chainhound_debug_mode', String(DEFAULT_SETTINGS.debugMode));
    localStorage.setItem('chainhound_secure_connections_only', String(DEFAULT_SETTINGS.secureConnectionsOnly));
    localStorage.setItem('chainhound_refresh_interval', String(DEFAULT_SETTINGS.refreshInterval));
    localStorage.setItem('chainhound_auto_refresh', String(DEFAULT_SETTINGS.autoRefresh));
    
    // Reset state values
    setProviderUrl(DEFAULT_SETTINGS.provider);
    setAutoReconnectState(DEFAULT_SETTINGS.autoReconnect);
    setDebugMode(DEFAULT_SETTINGS.debugMode);
    
    // Apply dark mode based on system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', prefersDark);
    localStorage.setItem('chainhound_dark_mode', String(prefersDark));
    
    // Reconnect with default provider
    try {
      await setProvider(DEFAULT_SETTINGS.provider);
      logDebug('Successfully reset settings and reconnected to default provider');
    } catch (error) {
      logDebug('Failed to connect to default provider after reset:', error);
      console.error('Failed to connect to default provider after reset:', error);
    }
  };

  // Export cache to a file
  const exportCache = async () => {
    try {
      logDebug('Exporting block cache...');
      const stats = await blockCache.getCacheStats();
      
      if (stats.totalBlocks === 0) {
        throw new Error('No blocks in cache to export');
      }
      
      // Get all blocks from the cache
      const blocks = await blockCache.getAllBlocks();
      
      // Create a JSON file
      const blob = new Blob([JSON.stringify(blocks)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `chainhound-block-cache-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      logDebug(`Successfully exported ${blocks.length} blocks`);
    } catch (error) {
      logDebug('Failed to export cache:', error);
      console.error('Failed to export cache:', error);
      throw error;
    }
  };

  // Import cache from a file
  const importCache = async (file: File) => {
    try {
      logDebug('Importing block cache...');
      
      // Read the file
      const text = await file.text();
      const blocks = JSON.parse(text);
      
      if (!Array.isArray(blocks)) {
        throw new Error('Invalid cache file format');
      }
      
      // Validate blocks
      const validBlocks = blocks.filter(block => 
        block && 
        typeof block === 'object' && 
        typeof block.number === 'number' && 
        typeof block.hash === 'string'
      );
      
      if (validBlocks.length === 0) {
        throw new Error('No valid blocks found in the cache file');
      }
      
      // Import blocks to the cache
      await blockCache.cacheBlocks(validBlocks);
      
      logDebug(`Successfully imported ${validBlocks.length} blocks`);
    } catch (error) {
      logDebug('Failed to import cache:', error);
      console.error('Failed to import cache:', error);
      throw error;
    }
  };

  // Update debug mode setting
  const toggleDebugMode = (enabled: boolean) => {
    setDebugMode(enabled);
    localStorage.setItem('chainhound_debug_mode', String(enabled));
    console.log(`[ChainHound] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  };

  // Set up connection status monitoring
  useEffect(() => {
    const checkConnection = async () => {
      if (!web3InstanceRef.current) return;
      
      try {
        await web3InstanceRef.current.eth.getBlockNumber();
        if (!isConnected) {
          logDebug('Connection restored');
          setIsConnected(true);
          updateNetworkInfo(web3InstanceRef.current);
        }
      } catch (error) {
        if (isConnected) {
          logDebug('Connection lost:', error);
          setIsConnected(false);
          
          // Attempt to reconnect if auto-reconnect is enabled
          if (autoReconnect && reconnectAttempts < maxReconnectAttempts) {
            handleReconnect();
          }
        }
      }
    };
    
    // Check connection status periodically
    const intervalId = setInterval(checkConnection, 10000); // Check every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [isConnected, autoReconnect, reconnectAttempts]);

  // Initialize Web3 with the saved provider
  useEffect(() => {
    const initWeb3 = async () => {
      try {
        logDebug('Initializing Web3...');
        await setProvider(provider);
      } catch (error) {
        console.error("Failed to initialize with saved provider, trying fallback", error);
        logDebug('Failed to initialize with saved provider, trying fallback:', error);
        // Try with a fallback provider
        try {
          await setProvider(getDefaultProvider());
        } catch (fallbackError) {
          console.error("Failed to initialize with fallback provider", fallbackError);
          logDebug('Failed to initialize with fallback provider:', fallbackError);
        }
      }
    };
    
    initWeb3();
    
    // Set up periodic network info updates
    const intervalId = setInterval(() => {
      if (web3InstanceRef.current && isConnected) {
        logDebug('Running periodic network info update');
        updateNetworkInfo(web3InstanceRef.current);
      }
    }, 30000); // Update every 30 seconds
    
    // Clean up on unmount
    return () => {
      clearInterval(intervalId);
      cleanupConnections();
    };
  }, []);

  return (
    <Web3Context.Provider value={{ 
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
      importCache
    }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3Context = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3Context must be used within a Web3Provider');
  }
  return context;
};