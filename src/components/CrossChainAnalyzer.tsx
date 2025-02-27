import React, { useState, useEffect } from 'react';
import { 
  Network, 
  ArrowRightLeft, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink, 
  Clock, 
  Wallet,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import Web3Service from '../services/web3Service';
import { Transaction, CrossChainAddress } from '../types/transaction';
import AddressLabel from './AddressLabel';

interface CrossChainAnalyzerProps {
  address: string;
  providerUrl?: string;
}

const CrossChainAnalyzer: React.FC<CrossChainAnalyzerProps> = ({
  address,
  providerUrl = 'https://eth.llamarpc.com'
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [addressInfo, setAddressInfo] = useState<CrossChainAddress | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  
  const web3Service = new Web3Service(providerUrl);
  
  useEffect(() => {
    fetchData();
  }, [address]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch cross-chain transactions
      const txs = await web3Service.getCrossChainTransactions(address, 20);
      setTransactions(txs);
      
      // Fetch cross-chain address info
      const info = await web3Service.getCrossChainAddressInfo(address);
      setAddressInfo(info);
      
    } catch (err) {
      console.error('Error fetching cross-chain data:', err);
      setError('Failed to fetch cross-chain data. Please check the address and try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const formatTimestamp = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };
  
  const formatValue = (value: string) => {
    const ethValue = parseFloat(value) / 1e18;
    return ethValue.toFixed(6);
  };
  
  const shortenAddress = (addr: string) => {
    return `${addr.substring(0, 8)}...${addr.substring(addr.length - 6)}`;
  };
  
  const shortenHash = (hash: string) => {
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
  };
  
  const getExplorerUrl = (chain: string, hash: string, isAddress: boolean = false) => {
    const baseUrl = {
      ethereum: 'https://etherscan.io',
      bsc: 'https://bscscan.com',
      polygon: 'https://polygonscan.com',
      arbitrum: 'https://arbiscan.io',
      optimism: 'https://optimistic.etherscan.io'
    }[chain] || 'https://etherscan.io';
    
    return `${baseUrl}/${isAddress ? 'address' : 'tx'}/${hash}`;
  };
  
  const getChainColor = (chain: string) => {
    return {
      ethereum: 'text-red-500',
      bsc: 'text-yellow-500',
      polygon: 'text-purple-500',
      arbitrum: 'text-blue-400',
      optimism: 'text-red-400'
    }[chain] || 'text-gray-400';
  };
  
  const getChainBgColor = (chain: string) => {
    return {
      ethereum: 'bg-red-900/20',
      bsc: 'bg-yellow-900/20',
      polygon: 'bg-purple-900/20',
      arbitrum: 'bg-blue-900/20',
      optimism: 'bg-red-900/20'
    }[chain] || 'bg-gray-800';
  };
  
  const getCurrencySymbol = (chain: string) => {
    return {
      ethereum: 'ETH',
      bsc: 'BNB',
      polygon: 'MATIC',
      arbitrum: 'ETH',
      optimism: 'ETH'
    }[chain] || 'ETH';
  };
  
  const filteredTransactions = selectedChain 
    ? transactions.filter(tx => tx.blockchain === selectedChain)
    : transactions;
  
  const toggleExpandTx = (txId: string) => {
    setExpandedTx(expandedTx === txId ? null : txId);
  };
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Network className="h-5 w-5 text-red-500" />
          Cross-Chain Analysis
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Analyzing cross-chain activity for <AddressLabel address={address} showEdit={false} />
        </p>
      </div>
      
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-600 border-t-red-600 mb-2"></div>
          <p className="text-gray-400">Analyzing cross-chain activity...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-400">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      ) : (
        <>
          {/* Address Overview */}
          {addressInfo && (
            <div className="p-4 border-b border-gray-700 bg-gray-900">
              <h3 className="text-md font-medium text-white mb-3">Cross-Chain Presence</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {addressInfo.blockchains.map(chain => (
                  <div 
                    key={chain.name} 
                    className={`p-3 rounded-lg ${getChainBgColor(chain.name)} border border-gray-700`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className={`text-sm font-medium ${getChainColor(chain.name)}`}>
                        {chain.name.toUpperCase()}
                      </h4>
                      <button
                        onClick={() => setSelectedChain(selectedChain === chain.name ? null : chain.name)}
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          selectedChain === chain.name 
                            ? 'bg-gray-700 text-white' 
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {selectedChain === chain.name ? 'Clear Filter' : 'Filter'}
                      </button>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Balance:</span>
                        <span className="text-xs text-white">
                          {chain.balance} {getCurrencySymbol(chain.name)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Transactions:</span>
                        <span className="text-xs text-white">{chain.txCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Last Activity:</span>
                        <span className="text-xs text-white">
                          {chain.lastActivity ? formatTimestamp(chain.lastActivity) : 'None'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Transaction List */}
          <div className="p-4 border-b border-gray-700 bg-gray-900">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-md font-medium text-white">Cross-Chain Transactions</h3>
              <div className="flex items-center gap-2">
                {selectedChain && (
                  <div className={`px-2 py-1 text-xs rounded-full ${getChainColor(selectedChain)} bg-gray-800`}>
                    {selectedChain.toUpperCase()}
                    <button 
                      onClick={() => setSelectedChain(null)}
                      className="ml-1 text-gray-400 hover:text-white"
                    >
                      ×
                    </button>
                  </div>
                )}
                <button
                  onClick={fetchData}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 text-xs"
                >
                  <RefreshCw className="h-3 w-3" />
                  Refresh
                </button>
              </div>
            </div>
            
            {filteredTransactions.length === 0 ? (
              <div className="p-4 text-center text-gray-400 bg-gray-800 rounded-lg">
                <p>No cross-chain transactions found for this address.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map(tx => (
                  <div 
                    key={tx.id} 
                    className={`p-3 rounded-lg ${getChainBgColor(tx.blockchain)} border border-gray-700`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1">
                          <span className={`text-xs font-medium ${getChainColor(tx.blockchain)} px-1.5 py-0.5 rounded bg-gray-800`}>
                            {tx.blockchain.toUpperCase()}
                          </span>
                          <a 
                            href={getExplorerUrl(tx.blockchain, tx.hash)}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-gray-300 hover:underline flex items-center gap-1"
                          >
                            {shortenHash(tx.hash)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">
                            {formatTimestamp(tx.timestamp)}
                          </span>
                          <span className="text-xs text-white">
                            {formatValue(tx.value)} {getCurrencySymbol(tx.blockchain)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleExpandTx(tx.id)}
                        className="p-1 text-gray-400 hover:text-white rounded-full"
                      >
                        {expandedTx === tx.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                    
                    {expandedTx === tx.id && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <p className="text-xs text-gray-400">From:</p>
                            <a 
                              href={getExplorerUrl(tx.blockchain, tx.from, true)}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-gray-300 hover:underline flex items-center gap-1"
                            >
                              <AddressLabel address={tx.from} showEdit={false} />
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">To:</p>
                            <a 
                              href={getExplorerUrl(tx.blockchain, tx.to, true)}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-gray-300 hover:underline flex items-center gap-1"
                            >
                              <AddressLabel address={tx.to} showEdit={false} />
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                        
                        {tx.crossChainRef && tx.crossChainRef.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-700">
                            <p className="text-xs text-gray-400 mb-1">Cross-Chain References:</p>
                            <div className="space-y-1">
                              {tx.crossChainRef.map((ref, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <span className={`text-xs ${getChainColor(ref.blockchain)}`}>
                                    {ref.blockchain.toUpperCase()}
                                  </span>
                                  <a 
                                    href={getExplorerUrl(ref.blockchain, ref.hash)}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-gray-300 hover:underline flex items-center gap-1"
                                  >
                                    {shortenHash(ref.hash)}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Analysis Summary */}
          <div className="p-4">
            <h3 className="text-md font-medium text-white mb-3">Cross-Chain Analysis Summary</h3>
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-300 mb-3">
                This address has been active on {addressInfo?.blockchains.filter(b => b.txCount > 0).length || 0} different blockchains.
                {addressInfo?.blockchains.some(b => b.txCount > 5) && 
                  ' The address shows significant activity across multiple chains, suggesting sophisticated cross-chain operations.'}
              </p>
              
              <div className="space-y-2">
                {transactions.some(tx => tx.crossChainRef && tx.crossChainRef.length > 0) && (
                  <div className="flex items-start gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <p className="text-sm text-gray-300">
                      Cross-chain bridge transactions detected, indicating value transfer between blockchains.
                    </p>
                  </div>
                )}
                
                {addressInfo && addressInfo.blockchains.some(b => parseFloat(b.balance) > 5) && (
                  <div className="flex items-start gap-2">
                    <Wallet className="h-4 w-4 text-green-500 mt-0.5" />
                    <p className="text-sm text-gray-300">
                      Significant balances maintained across multiple chains, suggesting active cross-chain portfolio management.
                    </p>
                  </div>
                )}
                
                {transactions.filter(tx => tx.blockchain === 'bsc').length > 0 && (
                  <div className="flex items-start gap-2">
                    <Network className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <p className="text-sm text-gray-300">
                      Activity on both Ethereum and Binance Smart Chain with matching address patterns, indicating coordinated cross-chain operations.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CrossChainAnalyzer;