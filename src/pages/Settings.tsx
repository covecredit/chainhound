import React, { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, Server, Plus, Trash2, Bug, Shield, AlertTriangle, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import { useWeb3Context } from '../contexts/Web3Context';

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
    reconnectProvider,
    isReconnecting,
    resetSettings
  } = useWeb3Context();
  
  const [web3Provider, setWeb3Provider] = useState(provider);
  const [customProviders, setCustomProviders] = useState<string[]>([]);
  const [newCustomProvider, setNewCustomProvider] = useState('');
  const [etherscanApiKey, setEtherscanApiKey] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  const [localDebugMode, setLocalDebugMode] = useState(debugMode);
  const [localAutoReconnect, setLocalAutoReconnect] = useState(autoReconnect);
  const [secureConnectionsOnly, setSecureConnectionsOnly] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
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
    
    // Load auto-reconnect setting
    setLocalAutoReconnect(autoReconnect);
  }, [autoReconnect, debugMode]);
  
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
      
      // Apply dark mode
      applyDarkMode(darkMode);
      
      // Apply debug mode
      setDebugMode(localDebugMode);
      
      // Apply auto-reconnect setting
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
  
  const handleResetSettings = async () => {
    setIsResetting(true);
    setSaveMessage({ type: '', text: '' });
    
    try {
      await resetSettings();
      
      // Update local state to match reset values
      setWeb3Provider(localStorage.getItem('chainhound_provider') || '');
      setLocalAutoReconnect(localStorage.getItem('chainhound_auto_reconnect') !== 'false');
      setLocalDebugMode(localStorage.getItem('chainhound_debug_mode') === 'true');
      setSecureConnectionsOnly(localStorage.getItem('chainhound_secure_connections_only') !== 'false');
      setRefreshInterval(parseInt(localStorage.getItem('chainhound_refresh_interval') || '30', 10));
      setAutoRefresh(localStorage.getItem('chainhound_auto_refresh') !== 'false');
      
      // Update dark mode based on system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
      
      setSaveMessage({ type: 'success', text: 'Settings reset to defaults successfully!' });
      setShowResetConfirm(false);
    } catch (error: any) {
      console.error('Error resetting settings:', error);
      setSaveMessage({ type: 'error', text: error.message || 'Failed to reset settings.' });
    } finally {
      setIsResetting(false);
      
      // Clear success message after 3 seconds
      if (saveMessage.type === 'success') {
        setTimeout(() => {
          setSaveMessage({ type: '', text: '' });
        }, 3000);
      }
    }
  };
  
  const handleManualReconnect = async () => {
    setSaveMessage({ type: '', text: '' });
    
    try {
      await reconnectProvider();
      setSaveMessage({ type: 'success', text: 'Successfully reconnected to provider!' });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveMessage({ type: '', text: '' });
      }, 3000);
    } catch (error: any) {
      console.error('Error reconnecting:', error);
      setSaveMessage({ type: 'error', text: error.message || 'Failed to reconnect to provider.' });
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
              
              <div className="flex items-center mb-2">
                <input 
                  type="checkbox"
                  id="autoReconnect"
                  checked={localAutoReconnect}
                  onChange={(e) => setLocalAutoReconnect(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="autoReconnect" className="ml-2 flex items-center text-sm text-gray-700 dark:text-gray-300">
                  <Wifi className="h-4 w-4 mr-1 text-green-600" />
                  Auto-reconnect when connection is lost
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
                      .filter(p => !secureConnectionsOnly || isSecureProvider(p.url))
                      .map((p, index) => (
                        <option key={`default-${index}`} value={p.url}>
                          {p.name}
                        </option>
                      ))}
                  </optgroup>
                  
                  {customProviders.length > 0 && (
                    <optgroup label="Custom Providers">
                      {customProviders
                        .filter(p => !secureConnectionsOnly || isSecureProvider(p))
                        .map((p, index) => (
                          <option key={`custom-${index}`} value={p}>{p}</option>
                        ))}
                    </optgroup>
                  )}
                </select>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Select an Ethereum node provider or add a custom one below
                </p>
                
                <div className="mt-3 flex items-center">
                  <div className={`h-2 w-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">
                    {isConnected ? 'Connected to provider' : 'Not connected to provider'}
                  </span>
                  <button
                    onClick={handleManualReconnect}
                    disabled={isReconnecting}
                    className="ml-3 text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isReconnecting ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Reconnecting...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Reconnect Now
                      </>
                    )}
                  </button>
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
                {secureConnectionsOnly && (
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
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded dark:bg-gray-700">
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
                <label htmlFor="autoRefresh" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
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
                  id="darkMode"
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="darkMode" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
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
                <label htmlFor="debugMode" className="ml-2 flex items-center text-sm text-gray-700 dark:text-gray-300">
                  <Bug className="h-4 w-4 mr-1" />
                  Enable debug mode
                  <span className="ml-2 text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded dark:bg-indigo-900 dark:text-indigo-200">
                    Logs detailed information to console
                  </span>
                </label>
              </div>
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold mb-4">Service Worker</h2>
            <div className="p-4 bg-gray-50 rounded-lg border dark:bg-gray-700 dark:border-gray-600">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <RefreshCw className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Background Updates</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Service worker is active and will update blockchain data in the background.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between">
            <div>
              {showResetConfirm ? (
                <div className="bg-red-50 p-3 rounded-lg dark:bg-red-900/30 flex flex-col">
                  <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                    Are you sure you want to reset all settings to defaults?
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleResetSettings}
                      disabled={isResetting}
                      className="bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700 transition text-sm flex items-center"
                    >
                      {isResetting ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Yes, Reset All
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
                </div>
              ) : (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 transition flex items-center dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset to Defaults
                </button>
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