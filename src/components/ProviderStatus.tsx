import React from 'react';
import { useWeb3Context } from '../contexts/Web3Context';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const ProviderStatus: React.FC = () => {
  const { isConnected, isReconnecting, reconnectProvider, autoReconnect, provider } = useWeb3Context();

  const handleManualReconnect = async () => {
    try {
      await reconnectProvider();
    } catch (error) {
      console.error('Failed to reconnect:', error);
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-2">
        {isConnected ? (
          <div className="flex items-center text-green-500 dark:text-green-400">
            <CheckCircle className="h-4 w-4 mr-1" />
            <span className="text-sm">Connected</span>
          </div>
        ) : (
          <div className="flex items-center text-red-500 dark:text-red-400">
            <XCircle className="h-4 w-4 mr-1" />
            <span className="text-sm">Disconnected</span>
            
            {!isReconnecting && (
              <button 
                onClick={handleManualReconnect}
                className="ml-2 bg-indigo-600 text-white px-2 py-1 rounded text-xs flex items-center hover:bg-indigo-700"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reconnect
              </button>
            )}
          </div>
        )}
        
        {isReconnecting && (
          <div className="flex items-center text-amber-500 dark:text-amber-400">
            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
            <span className="text-sm">Reconnecting...</span>
          </div>
        )}
      </div>
      
      {!isConnected && autoReconnect && !isReconnecting && (
        <div className="flex items-center text-amber-500 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 mr-1" />
          <span className="text-sm">Auto-reconnect enabled</span>
        </div>
      )}
      
      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
        <span className="font-medium">Current provider:</span> {provider}
      </div>
    </div>
  );
};

export default ProviderStatus;