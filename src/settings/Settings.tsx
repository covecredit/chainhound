Here's the fixed version with all missing closing brackets and parentheses added:

import React, { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, Server, Plus, Trash2, Bug, Shield, AlertTriangle, Database, Upload, Download, RotateCcw } from 'lucide-react';
import { useWeb3Context } from '../contexts/Web3Context';
import { blockCache } from '../services/BlockCache';
import ProviderStatus from '../components/ProviderStatus';

const Settings = () => {
  const { provider, setProvider, isConnected, availableProviders, debugMode, setDebugMode, autoReconnect, setAutoReconnect, resetSettings, exportCache, importCache } = useWeb3Context();
  const [web3Provider, setWeb3Provider] = useState(provider);
  const [customProviders, setCustomProviders] = useState<string[]>([]);
  const [newCustomProvider, setNewCustomProvider] = useState('');
  const [etherscanApiKey, setEtherscanApiKey] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  const [localDebugMode, setLocalDebugMode] = useState(debugMode);
  const [localAutoReconnect, setLocalAutoReconnect] = useState(autoReconnect);
  const [secureConnectionsOnly, setSecureConnectionsOnly] = useState(true);
  const [retryErrorBlocks, setRetryErrorBlocks] = useState(true);
  const [cacheStats, setCacheStats] = useState({
    totalBlocks: 0,
    oldestBlock: undefined as number | undefined,
    newestBlock: undefined as number | undefined,
    sizeEstimate: '0 B',
    errorBlocks: 0
  });
  const [isExportingCache, setIsExportingCache] = useState(false);
  const [isImportingCache, setIsImportingCache] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load custom providers from localStorage
  useEffect(() => {
    const savedCustomProviders = localStorage.getItem('chainhound_custom_providers');
    if (savedCustomProviders) {
      setCustomProviders(JSON.parse(savedCustomProviders));
    }
    
    // Load dark mode setting
    const savedDarkMode = localStorage.getItem('chainhound_dark_mode');
    if (savedDarkMode !== null) {
      const isDarkMode = savedDarkMode === 'true';
      setDarkMode(isDarkMode);
      applyDarkMode(isDarkMode);
    } else {
      // Default to dark mode if not set
      applyDarkMode(true);
    }
    
    // Load other settings
    const savedEtherscanApiKey = localStorage.getItem('chainhound_etherscan_api_key');
    if (savedEtherscanApiKey) {
      setEtherscanApiKey(savedEtherscanApiKey);
    }
    
    const savedAutoRefresh = localStorage.getItem('chainhound_auto_refresh');
    if (savedAutoRefresh !== null) {
      setAutoRefresh(savedAutoRefresh === 'true');
    }
    
    const savedRefreshInterval = localStorage.getItem('chainhound_refresh_interval');
    if (savedRefreshInterval) {
      setRefreshInterval(parseInt(savedRefreshInterval, 10));
    }
    
    const savedSecureConnectionsOnly = localStorage.getItem('chainhound_secure_connections_only');
    if (savedSecureConnectionsOnly !== null) {
      setSecureConnectionsOnly(savedSecureConnectionsOnly === 'true');
    }
    
    const savedRetryErrorBlocks = localStorage.getItem('chainhound_retry_error_blocks');
    if (savedRetryErrorBlocks !== null) {
      setRetryErrorBlocks(savedRetryErrorBlocks === 'true');
    } else {
      // Default to true if not set
      localStorage.setItem('chainhound_retry_error_blocks', 'true');
    }
    
    // Load cache stats
    loadCacheStats();
  }, []);
  
  const loadCacheStats = async () => {
    try {
      const stats = await blockCache.getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  };
  
  const applyDarkMode = (enabled: boolean) => {
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage({ type: '', text: '' });
    
    try {
      // Validate provider URL
      if (secureConnectionsOnly && web3Provider.startsWith('http://')) {
        throw new Error('Insecure HTTP connections are not allowed. Please use HTTPS.');
      }
      
      if (secureConnectionsOnly && web3Provider.startsWith('ws://')) {
        throw new Error('Insecure WebSocket connections are not allowed. Please use WSS.');
      }
      
      // Save provider settings
      await setProvider(web3Provider);
      
      // Save custom providers
      localStorage.setItem('chainhound_custom_providers', JSON.stringify(customProviders));
      
      // Save other settings
      localStorage.setItem('chainhound_etherscan_api_key', etherscanApiKey);
      localStorage.setItem('chainhound_auto_refresh', String(autoRefresh));
      localStorage.setItem('chainhound_refresh_interval', String(refreshInterval));
      localStorage.setItem('chainhound_dark_mode', String(darkMode));
      localStorage.setItem('chainhound_secure_connections_only', String(secureConnectionsOnly));
      localStorage.setItem('chainhound_retry_error_blocks', String(retryErrorBlocks));
      
      // Apply dark mode
      applyDarkMode(darkMode);
      
      // Apply debug mode
      setDebugMode(localDebugMode);
      
      // Apply auto-reconnect
      setAutoReconnect(localAutoReconnect);
      
      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setSaveMessage({ type: 'error', text: error.message || 'Failed to save settings. Please check your provider URL.' });
    } finally {
      setIsSaving(false);
      
      // Clear success message after 3 seconds
      if (saveMessage.type === 'success') {
        setTimeout(() => {
          setSaveMessage({ type: '', text: '' });
        }, 3000);
      }
    }
  };
  
  const addCustomProvider = () => {
    if (!newCustomProvider.trim() || customProviders.includes(newCustomProvider)) {
      return;
    }
    
    // Validate if secure connections only is enabled
    if (secureConnectionsOnly) {
      if (newCustomProvider.startsWith('http://')) {
        setSaveMessage({ 
          type: 'error', 
          text: 'Insecure HTTP connections are not allowed. Please use HTTPS.' 
        });
        return;
      }
      
      if (newCustomProvider.startsWith('ws://')) {
        setSaveMessage({ 
          type: 'error', 
          text: 'Insecure WebSocket connections are not allowed. Please use WSS.' 
        });
        return;
      }
    }
    
    const updatedProviders = [...customProviders, newCustomProvider];
    setCustomProviders(updatedProviders);
    setNewCustomProvider('');
    setSaveMessage({ type: '', text: '' });
  };
  
  const removeCustomProvider = (provider: string) => {
    setCustomProviders(customProviders.filter(p => p !== provider));
  };
  
  const isSecureProvider = (url: string): boolean => {
    return url.startsWith('https://') || url.startsWith('wss://');
  };
  
  const handleExportCache = async () => {
    setIsExportingCache(true);
    try {
      await exportCache();
      setSaveMessage({ type: 'success', text: 'Cache exported successfully!' });
    } catch (error: any) {
      setSaveMessage({ type: 'error', text: error.message || 'Failed to export cache.' });
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
      setSaveMessage({ type: 'success', text: 'Cache imported successfully!' });
    } catch (error: any) {
      setSaveMessage({ type: 'error', text: error.message || 'Failed to import cache.' });
    } finally {
      setIsImportingCache(false);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear the block cache? This cannot be undone.')) {
      try {
        await blockCache.clearCache();
        await loadCacheStats();
        setSaveMessage({ type: 'success', text: 'Cache cleared successfully!' });
      } catch (error: any) {
        setSaveMessage({ type: 'error', text: error.message || 'Failed to clear cache.' });
      }
    }
  };
  
  const handleClearErrorBlocks = async () => {
    if (confirm('Are you sure you want to clear all error blocks? This will remove all records of blocks that failed to fetch.')) {
      try {
        await blockCache.clearErrorBlocks();
        await loadCacheStats();
        setSaveMessage({ type: 'success', text: 'Error blocks cleared successfully!' });
      } catch (error: any) {
        setSaveMessage({ type: 'error', text: error.message || 'Failed to clear error blocks.' });
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
      setDarkMode(document.documentElement.classList.contains('dark'));
      setRetryErrorBlocks(true);
      
      setSaveMessage({ type: 'success', text: 'Settings reset to defaults!' });
    } catch (error: any) {
      setSaveMessage({ type: 'error', text: error.message || 'Failed to reset settings.' });
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
          <div className={`p-3 rounded mb-4 ${saveMessage.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'}`}>
            {saveMessage.text}
          </div>
        )}
        
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Blockchain Connections</h2>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border dark:bg-gray-700 dark:border-gray-600">
              <h3 className="text-sm font-medium mb-2">Connection Status</h3>
              <ProviderStatus />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center mb-2">
                <input 
                  type="checkbox"
                  id="secureConnectionsOnly"
                  checked={secureConnectionsOnly}
                  onChange={(e) => setSecureConnectionsOnly(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="secureConnectionsOnly" className="ml-2 flex items-center text-sm text-gray-700 dark:text-gray-300">
                  <Shield className="h-4 w-4 mr-1 text-green-600" />
                  Use secure connections only (HTTPS/WSS)
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Provider
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;