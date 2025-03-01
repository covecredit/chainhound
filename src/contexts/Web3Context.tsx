import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import Web3 from 'web3';
import ethereumProviders from '../data/ethereumProviders.json';
import { blockCache } from '../services/BlockCache';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { safelyConvertBigIntToString } from '../utils/bigIntUtils';

// Import Ethereum providers from JSON file
export const ETHEREUM_PROVIDERS = ethereumProviders;

// Default settings
export const DEFAULT_SETTINGS = {
  provider: 'https://rpc.ankr.com/eth',
  autoReconnect: true,
  debugMode: true, // Set debug mode to true by default
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
  // First try to get Ankr provider
  const ankrProvider = ETHEREUM_PROVIDERS.find(p => 
    p.url.includes('ankr.com')
  );
  
  // Then try to get a secure HTTP provider
  const secureHttpProvider = ETHEREUM_PROVIDERS.find(p => 
    p.url.startsWith('https://') && !p.url.includes('localhost')
  );
  
  // Fall back to any provider if no secure ones are available
  return ankrProvider?.url || secureHttpProvider?.url || DEFAULT_SETTINGS.provider;
};

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [provider, setProviderUrl] = useState<string>(
    localStorage.getItem('chainhound_provider') || getDefaultProvider()
  );
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [debugMode, setDebugMode] = useState<boolean>(
    localStorage.getItem('chainhound_debug_mode') === 'true' || DEFAULT_SETTINGS.debugMode
  );
  const [autoReconnect, setAutoReconnectState] = useState<boolean>(
    localStorage.getItem('chainhound_auto_reconnect') !== 'false'
  );
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const currentProviderRef = useRef<string>(provider);
  const web3InstanceRef = useRef<Web3 | null>(null);
  const providerFailuresRef = useRef<Map<string, number>>(new Map());

  const logDebug = (message: string, ...args: any[]) => {
    if (debugMode) {
      console.log(`[ChainHound Debug] ${message}`, ...args);
    }
  };

  const updateNetworkInfo = async (web3Instance: Web3) => {
    try {
      logDebug('Updating network info...');
      const startTime = performance.now();
      
      // Use getBlockNumber as a test for connection
      const blockNumber = await web3Instance.eth.getBlockNumber();
      logDebug(`Current block number: ${blockNumber}`);
      
      // Get chain ID
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
      
      // Convert any BigInt values to strings to avoid serialization issues
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
      
      // Reset failure count for this provider
      providerFailuresRef.current.delete(currentProviderRef.current);
    } catch (error) {
      console.error('Error fetching network info:', error);
      setNetworkInfo(prev => prev ? {
        ...prev,
        lastUpdated: new Date()
      } : null);
      setIsConnected(false);
      
      // Increment failure count for this provider
      const currentFailures = providerFailuresRef.current.get(currentProviderRef.current) || 0;
      providerFailuresRef.current.set(currentProviderRef.current, currentFailures + 1);
      
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
      
      // If we've had multiple failures with the current provider, try a fallback
      const currentFailures = providerFailuresRef.current.get(currentProviderRef.current) || 0;
      if (currentFailures >= 2) {
        logDebug(`Provider ${currentProviderRef.current} has failed ${currentFailures} times, trying fallback...`);
        tryFallbackProvider().finally(() => {
          setIsReconnecting(false);
        });
      } else {
        reconnectProvider().finally(() => {
          setIsReconnecting(false);
        });
      }
    }, delay);
  };

  // Try a series of fallback providers
  const tryFallbackProvider = async (): Promise<boolean> => {
    const fallbacks = getFallbackProviders();
    
    for (const fallbackUrl of fallbacks) {
      // Skip if we've already tried this provider and it failed
      if (providerFailuresRef.current.get(fallbackUrl) && providerFailuresRef.current.get(fallbackUrl)! > 0) {
        logDebug(`Skipping fallback provider ${fallbackUrl} as it has failed before`);
        continue;
      }
      
      logDebug(`Trying fallback provider: ${fallbackUrl}`);
      try {
        await setProvider(fallbackUrl);
        return true;
      } catch (error) {
        logDebug(`Fallback provider ${fallbackUrl} failed:`, error);
        // Mark this provider as failed
        providerFailuresRef.current.set(fallbackUrl, 1);
      }
    }
    
    logDebug('All fallback providers failed');
    return false;
  };

  // Get a list of fallback providers
  const getFallbackProviders = (): string[] => {
    return [
      'https://rpc.ankr.com/eth',
      'https://cloudflare-eth.com',
      'https://eth.llamarpc.com',
      'https://ethereum.publicnode.com',
      'https://1rpc.io/eth'
    ];
  };

  // Clean up all active connections and timeouts
  const cleanupConnections = () => {
    logDebug('Cleaning up connections and timeouts');
    
    // Clear reconnect timer
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
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
        
        // Create a WebSocket provider with custom options
        const wsProvider = new Web3.providers.WebsocketProvider(secureUrl, {
          timeout: 30000,
          reconnect: {
            auto: true,
            delay: 5000,
            maxAttempts: 5,
            onTimeout: true
          }
        });
        
        // Add event listeners for WebSocket provider
        wsProvider.on('connect', () => {
          logDebug('WebSocket connected');
        });
        
        wsProvider.on('error', (err: any) => {
          logDebug('WebSocket error:', err);
        });
        
        wsProvider.on('end', () => {
          logDebug('WebSocket connection ended');
        });
        
        newWeb3 = new Web3(wsProvider);
      } else {
        // HTTP provider
        logDebug('Creating HTTP provider...');
        
        // Create HTTP provider with custom options
        const httpProvider = new Web3.providers.HttpProvider(secureUrl, {
          timeout: 30000,
          keepAlive: true,
          withCredentials: false, // Important for CORS
          headers: [
            {
              name: 'Access-Control-Allow-Origin',
              value: '*'
            }
          ]
        });
        
        newWeb3 = new Web3(httpProvider);
      }
      
      // Configure Web3 instance
      newWeb3.eth.handleRevert = true;
      
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

  // Reconnect to the current provider
  const reconnectProvider = async () => {
    try {
      logDebug('Reconnecting to provider...');
      await setProvider(currentProviderRef.current);
      return true;
    } catch (error) {
      logDebug('Reconnection failed:', error);
      return false;
    }
  };

  // Set auto-reconnect setting
  const setAutoReconnect = (enabled: boolean) => {
    setAutoReconnectState(enabled);
    localStorage.setItem('chainhound_auto_reconnect', String(enabled));
  };

  // Update debug mode setting
  const toggleDebugMode = (enabled: boolean) => {
    setDebugMode(enabled);
    localStorage.setItem('chainhound_debug_mode', String(enabled));
    console.log(`[ChainHound] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  };

  // Reset all settings to defaults
  const resetSettings = async () => {
    logDebug('Resetting all settings to defaults');
    
    // Clean up existing connections
    cleanupConnections();
    
    // Reset localStorage settings
    localStorage.removeItem('chainhound_provider');
    localStorage.removeItem('chainhound_debug_mode');
    localStorage.removeItem('chainhound_auto_reconnect');
    localStorage.removeItem('chainhound_dark_mode');
    localStorage.removeItem('chainhound_custom_providers');
    localStorage.removeItem('chainhound_etherscan_api_key');
    localStorage.removeItem('chainhound_auto_refresh');
    localStorage.removeItem('chainhound_refresh_interval');
    localStorage.removeItem('chainhound_secure_connections_only');
    
    // Reset state
    setDebugMode(DEFAULT_SETTINGS.debugMode);
    setAutoReconnectState(DEFAULT_SETTINGS.autoReconnect);
    
    // Apply dark mode
    if (DEFAULT_SETTINGS.debugMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Reset provider failures tracking
    providerFailuresRef.current.clear();
    
    // Reconnect with default provider
    await setProvider(getDefaultProvider());
  };

  // Export cache to a file
  const exportCache = async () => {
    try {
      logDebug('Exporting block cache...');
      const blocks = await blockCache.getAllBlocks();
      
      if (blocks.length === 0) {
        throw new Error('No blocks in cache to export');
      }
      
      const cacheData = {
        version: 1,
        timestamp: new Date().toISOString(),
        blocks
      };
      
      const json = JSON.stringify(cacheData);
      const blob = new Blob([json], { type: 'application/json' });
      
      // Create a zip file to reduce size
      const zip = new JSZip();
      zip.file('chainhound-cache.json', blob);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      saveAs(zipBlob, `chainhound-cache-${Date.now()}.zip`);
      logDebug(`Exported ${blocks.length} blocks from cache`);
    } catch (error) {
      console.error('Failed to export cache:', error);
      logDebug('Export cache failed:', error);
      throw error;
    }
  };

  // Import cache from a file
  const importCache = async (file: File) => {
    try {
      logDebug('Importing block cache...');
      
      if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
        // Handle zip file
        const zip = new JSZip();
        const zipContents = await zip.loadAsync(file);
        
        // Find the JSON file in the zip
        const jsonFile = Object.values(zipContents.files).find(f => 
          !f.dir && f.name.endsWith('.json')
        );
        
        if (!jsonFile) {
          throw new Error('No JSON file found in the zip archive');
        }
        
        const jsonContent = await jsonFile.async('string');
        const cacheData = JSON.parse(jsonContent);
        
        if (!cacheData.blocks || !Array.isArray(cacheData.blocks)) {
          throw new Error('Invalid cache file format');
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
          throw new Error('Invalid cache file format');
        }
        
        // Import blocks to cache
        await blockCache.cacheBlocks(cacheData.blocks);
        logDebug(`Imported ${cacheData.blocks.length} blocks to cache`);
      }
    } catch (error) {
      console.error('Failed to import cache:', error);
      logDebug('Import cache failed:', error);
      throw error;
    }
  };

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
          await tryFallbackProvider();
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