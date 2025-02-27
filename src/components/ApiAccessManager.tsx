import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, Check, Code, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ApiKey } from '../types/transaction';
import { useStorage } from '../hooks/useStorage';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

const ApiAccessManager: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showCreateKey, setShowCreateKey] = useState<boolean>(false);
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<{read: boolean, write: boolean}>({read: true, write: false});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showApiDocs, setShowApiDocs] = useState<boolean>(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  
  const { getFromStorage, setInStorage } = useStorage();
  const STORAGE_KEY = 'chainhound-api-keys';
  
  useEffect(() => {
    loadApiKeys();
  }, []);
  
  const loadApiKeys = () => {
    const storedKeys = getFromStorage<Record<string, ApiKey>>(STORAGE_KEY, {});
    setApiKeys(Object.values(storedKeys));
    
    // Initialize visibility state for all keys
    const initialVisibility: Record<string, boolean> = {};
    Object.values(storedKeys).forEach(key => {
      initialVisibility[key.id] = false;
    });
    setShowKeys(initialVisibility);
  };
  
  const saveApiKeys = (updatedKeys: ApiKey[]) => {
    const keysMap = updatedKeys.reduce((acc, key) => {
      acc[key.id] = key;
      return acc;
    }, {} as Record<string, ApiKey>);
    
    setInStorage(STORAGE_KEY, keysMap);
    setApiKeys(updatedKeys);
  };
  
  const createApiKey = () => {
    if (!newKeyName.trim()) return;
    
    const newKey: ApiKey = {
      id: uuidv4(),
      key: generateApiKey(),
      name: newKeyName.trim(),
      createdAt: Date.now(),
      permissions: newKeyPermissions
    };
    
    const updatedKeys = [...apiKeys, newKey];
    saveApiKeys(updatedKeys);
    
    // Reset form
    setNewKeyName('');
    setNewKeyPermissions({read: true, write: false});
    setShowCreateKey(false);
    
    // Set this key as visible initially
    setShowKeys({...showKeys, [newKey.id]: true});
    
    // Set as copied to show the key to the user
    setCopiedKey(newKey.key);
    setTimeout(() => setCopiedKey(null), 60000); // Clear after 1 minute
  };
  
  const deleteApiKey = (keyId: string) => {
    const updatedKeys = apiKeys.filter(key => key.id !== keyId);
    saveApiKeys(updatedKeys);
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 3000);
  };
  
  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys({
      ...showKeys,
      [keyId]: !showKeys[keyId]
    });
  };
  
  const generateApiKey = () => {
    // Generate a random API key
    const keyParts = [
      'ch',
      Math.random().toString(36).substring(2, 10),
      Math.random().toString(36).substring(2, 10),
      Math.random().toString(36).substring(2, 10)
    ];
    return keyParts.join('_');
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  // Sample API documentation
  const apiExampleCode = `
// Example: Fetch transactions for an address
const fetchTransactions = async (address) => {
  const response = await fetch(
    'https://api.chainhound.com/v1/transactions?address=' + address,
    {
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY'
      }
    }
  );
  
  const data = await response.json();
  return data;
};

// Example: Get cross-chain analysis
const getCrossChainAnalysis = async (address) => {
  const response = await fetch(
    'https://api.chainhound.com/v1/cross-chain/analysis?address=' + address,
    {
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY'
      }
    }
  );
  
  const data = await response.json();
  return data;
};
  `;
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Key className="h-5 w-5 text-red-500" />
            API Access Management
          </h2>
          <button 
            className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            onClick={() => setShowCreateKey(true)}
          >
            <Plus className="h-4 w-4" />
            <span>New API Key</span>
          </button>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Manage API keys for external forensic tools integration
        </p>
      </div>
      
      <div className="p-4 border-b border-gray-700 bg-gray-900">
        <button
          onClick={() => setShowApiDocs(!showApiDocs)}
          className="flex items-center gap-2 w-full px-4 py-2 bg-gray-800 rounded-md hover:bg-gray-700 transition-colors"
        >
          <Code className="h-5 w-5 text-red-500" />
          <span className="text-gray-300 font-medium">API Documentation</span>
          {showApiDocs ? (
            <ChevronUp className="h-4 w-4 text-gray-400 ml-auto" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400 ml-auto" />
          )}
        </button>
        
        {showApiDocs && (
          <div className="mt-4 bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-md font-medium text-white mb-2">API Endpoints</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-300">GET /v1/transactions</h4>
                <p className="text-xs text-gray-400 mt-1">
                  Fetch transactions for a specific address across multiple blockchains.
                </p>
                <div className="mt-2 bg-gray-900 rounded p-2">
                  <p className="text-xs text-gray-400">Parameters:</p>
                  <ul className="text-xs text-gray-300 ml-4 mt-1 list-disc">
                    <li>address (required): Ethereum address</li>
                    <li>chain (optional): Blockchain name (ethereum, bsc, polygon)</li>
                    <li>limit (optional): Number of transactions to return (default: 20)</li>
                  </ul>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-300">GET /v1/cross-chain/analysis</h4>
                <p className="text-xs text-gray-400 mt-1">
                  Get cross-chain analysis for a specific address.
                </p>
                <div className="mt-2 bg-gray-900 rounded p-2">
                  <p className="text-xs text-gray-400">Parameters:</p>
                  <ul className="text-xs text-gray-300 ml-4 mt-1 list-disc">
                    <li>address (required): Ethereum address</li>
                  </ul>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-300">GET /v1/alerts</h4>
                <p className="text-xs text-gray-400 mt-1">
                  Retrieve alerts for monitored addresses and conditions.
                </p>
                <div className="mt-2 bg-gray-900 rounded p-2">
                  <p className="text-xs text-gray-400">Parameters:</p>
                  <ul className="text-xs text-gray-300 ml-4 mt-1 list-disc">
                    <li>status (optional): Filter by alert status (triggered, pending)</li>
                    <li>limit (optional): Number of alerts to return (default: 20)</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <h3 className="text-md font-medium text-white mt-4 mb-2">Example Usage</h3>
            <SyntaxHighlighter language="javascript" style={atomOneDark} customStyle={{borderRadius: '0.375rem'}}>
              {apiExampleCode}
            </SyntaxHighlighter>
            
            <div className="mt-4 bg-yellow-900/30 border-l-4 border-yellow-600 p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-400">
                    API keys provide access to sensitive blockchain data. Keep your keys secure and never share them publicly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {apiKeys.length === 0 ? (
        <div className="p-8 text-center">
          <Key className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">You don't have any API keys yet</p>
          <button
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            onClick={() => setShowCreateKey(true)}
          >
            Create Your First API Key
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  API Key
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Permissions
                </th> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{key.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-300 font-mono">
                        {showKeys[key.id] ? key.key : '••••••••••••••••••••••'}
                      </div>
                      <button
                        onClick={() => toggleKeyVisibility(key.id)}
                        className="text-gray-400 hover:text-gray-300"
                        title={showKeys[key.id] ? "Hide key" : "Show key"}
                      >
                        {showKeys[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(key.key)}
                        className="text-gray-400 hover:text-gray-300"
                        title="Copy to clipboard"
                      >
                        {copiedKey === key.key ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${key.permissions.read ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                        Read
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${key.permissions.write ? 'bg-blue-900 text-blue-300' : 'bg-gray-700 text-gray-400'}`}>
                        Write
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {formatDate(key.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => deleteApiKey(key.id)}
                      className="text-red-400 hover:text-red-300"
                      title="Delete API key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {showCreateKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4">Create New API Key</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Key Name
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Forensic Tool Integration"
                  className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Permissions
                </label>
                <div className="space-y-2">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox text-red-600"
                      checked={newKeyPermissions.read}
                      onChange={(e) => setNewKeyPermissions({...newKeyPermissions, read: e.target.checked})}
                    />
                    <span className="ml-2 text-gray-300">Read (access data)</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox text-red-600"
                      checked={newKeyPermissions.write}
                      onChange={(e) => setNewKeyPermissions({...newKeyPermissions, write: e.target.checked})}
                    />
                    <span className="ml-2 text-gray-300">Write (create alerts, labels)</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateKey(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={createApiKey}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                disabled={!newKeyName.trim()}
              >
                Create API Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper components
const ChevronDown = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const ChevronUp = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m18 15-6-6-6 6"/>
  </svg>
);

export default ApiAccessManager;