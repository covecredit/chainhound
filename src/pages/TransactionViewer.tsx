import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Camera, Info, AlertTriangle, Loader, Clock, X, Settings, ChevronDown, ChevronUp, Trash2, Infinity } from 'lucide-react';
import * as d3 from 'd3';
import { toPng } from 'html-to-image';
import TransactionGraph from '../components/TransactionGraph';
import TransactionLegend from '../components/TransactionLegend';
import { useWeb3Context } from '../contexts/Web3Context';
import { formatWeiToEth, safelyConvertBigIntToString } from '../utils/bigIntUtils';
import { blockCache } from '../services/BlockCache';

interface RecentSearch {
  query: string;
  timestamp: number;
  type: 'address' | 'transaction' | 'block' | 'unknown';
}

interface SearchOptions {
  maxBlocks: number;
  maxTransactions: number;
  includeInternalTxs: boolean;
}

const TransactionViewer = () => {
  const { web3, isConnected, debugMode } = useWeb3Context();
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactionData, setTransactionData] = useState<any>(null);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    maxBlocks: 1000,
    maxTransactions: 50,
    includeInternalTxs: true
  });
  const graphRef = useRef<HTMLDivElement>(null);
  const searchHistoryRef = useRef<HTMLDivElement>(null);
  const advancedOptionsRef = useRef<HTMLDivElement>(null);
  
  // Constants for unlimited search
  const UNLIMITED_BLOCKS = 10000;
  const UNLIMITED_TRANSACTIONS = 200;
  
  // Load recent searches and search options from localStorage on component mount
  useEffect(() => {
    const savedSearches = localStorage.getItem('chainhound_recent_searches');
    if (savedSearches) {
      try {
        setRecentSearches(JSON.parse(savedSearches));
      } catch (err) {
        console.error('Failed to parse recent searches:', err);
      }
    }
    
    const savedOptions = localStorage.getItem('chainhound_search_options');
    if (savedOptions) {
      try {
        setSearchOptions(JSON.parse(savedOptions));
      } catch (err) {
        console.error('Failed to parse search options:', err);
      }
    }
  }, []);
  
  // Handle clicks outside of dropdown menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchHistoryRef.current && !searchHistoryRef.current.contains(event.target as Node)) {
        setShowSearchHistory(false);
      }
      
      if (advancedOptionsRef.current && !advancedOptionsRef.current.contains(event.target as Node)) {
        setShowAdvancedOptions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Check for search query in session storage on component mount
  useEffect(() => {
    const savedSearch = sessionStorage.getItem('chainhound_search');
    if (savedSearch) {
      setSearchInput(savedSearch);
      sessionStorage.removeItem('chainhound_search');
      // Auto-search if we have a query and are connected
      if (isConnected && web3) {
        handleSearch(savedSearch);
      }
    }
  }, [isConnected, web3]);
  
  const handleSearch = async (query?: string) => {
    const searchQuery = query || searchInput;
    if (!searchQuery) return;
    
    if (!isConnected || !web3) {
      setError('Not connected to Ethereum network. Please check your connection in Settings.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setTransactionData(null);
    
    try {
      // Add to recent searches
      addToRecentSearches(searchQuery);
      
      if (debugMode) {
        console.log(`[ChainHound Debug] Searching for: ${searchQuery}`);
        console.log(`[ChainHound Debug] Search options:`, searchOptions);
      }
      
      // Determine what type of input we're dealing with
      let data;
      
      if (web3.utils.isAddress(searchQuery)) {
        // It's an address
        if (debugMode) {
          console.log(`[ChainHound Debug] Input is an Ethereum address`);
        }
        
        try {
          const balance = await web3.eth.getBalance(searchQuery);
          const txCount = await web3.eth.getTransactionCount(searchQuery);
          const code = await web3.eth.getCode(searchQuery);
          const isContract = code !== '0x';
          
          if (debugMode) {
            console.log(`[ChainHound Debug] Address balance: ${web3.utils.fromWei(balance.toString(), 'ether')} ETH`);
            console.log(`[ChainHound Debug] Transaction count: ${txCount}`);
            console.log(`[ChainHound Debug] Is contract: ${isContract}`);
          }
          
          // Get recent transactions
          const blockNumber = await web3.eth.getBlockNumber();
          
          if (debugMode) {
            console.log(`[ChainHound Debug] Current block number: ${blockNumber}`);
            console.log(`[ChainHound Debug] Fetching recent blocks for transactions...`);
            console.log(`[ChainHound Debug] Max blocks to scan: ${searchOptions.maxBlocks}`);
          }
          
          // Determine if we're doing an unlimited search
          const isUnlimitedBlocks = searchOptions.maxBlocks >= UNLIMITED_BLOCKS;
          const isUnlimitedTransactions = searchOptions.maxTransactions >= UNLIMITED_TRANSACTIONS;
          
          // Get blocks to scan
          const blocksToScan = isUnlimitedBlocks ? 5000 : Math.min(searchOptions.maxBlocks, 5000);
          const startBlock = Math.max(1, blockNumber - blocksToScan);
          
          if (debugMode) {
            console.log(`[ChainHound Debug] Scanning from block ${startBlock} to ${blockNumber}`);
            if (isUnlimitedBlocks) console.log(`[ChainHound Debug] Unlimited block scanning enabled`);
            if (isUnlimitedTransactions) console.log(`[ChainHound Debug] Unlimited transaction collection enabled`);
          }
          
          // Get blocks in batches to avoid timeout
          const batchSize = 10;
          const transactions = [];
          let transactionsFound = 0;
          let searchLimitReached = false;
          
          for (let i = blockNumber; i >= startBlock; i -= batchSize) {
            // Check if we've reached the transaction limit (unless unlimited)
            if (!isUnlimitedTransactions && transactionsFound >= searchOptions.maxTransactions) {
              searchLimitReached = true;
              break;
            }
            
            const endBlock = i;
            const startBatchBlock = Math.max(startBlock, i - batchSize + 1);
            
            if (debugMode) {
              console.log(`[ChainHound Debug] Fetching batch from block ${startBatchBlock} to ${endBlock}`);
            }
            
            try {
              // Check if blocks are in cache first
              const cachedBlockNumbers = await blockCache.getCachedBlockNumbers(startBatchBlock, endBlock);
              const blocksToFetch = [];
              
              for (let j = endBlock; j >= startBatchBlock; j--) {
                if (!cachedBlockNumbers.includes(j)) {
                  blocksToFetch.push(j);
                }
              }
              
              // Get blocks from cache
              const cachedBlocks = await blockCache.getBlocksInRange(startBatchBlock, endBlock);
              
              // Get blocks from network in parallel
              const blockPromises = blocksToFetch.map(blockNum => 
                web3.eth.getBlock(blockNum, true)
                  .then(block => {
                    if (block) {
                      // Cache the block for future use
                      blockCache.cacheBlock(block);
                    }
                    return block;
                  })
                  .catch(err => {
                    if (debugMode) {
                      console.log(`[ChainHound Debug] Error fetching block ${blockNum}:`, err);
                    }
                    return null;
                  })
              );
              
              const fetchedBlocks = await Promise.all(blockPromises);
              
              // Combine cached and fetched blocks
              const blocks = [...cachedBlocks, ...fetchedBlocks.filter(Boolean)];
              
              // Process blocks
              for (const block of blocks) {
                if (!block || !block.transactions) continue;
                
                // Filter transactions related to the searched address
                const relatedTxs = block.transactions.filter((tx: any) => 
                  (tx.from && tx.from.toLowerCase() === searchQuery.toLowerCase()) || 
                  (tx.to && tx.to.toLowerCase() === searchQuery.toLowerCase())
                );
                
                if (relatedTxs.length > 0) {
                  // Add timestamp to transactions
                  const txsWithTimestamp = relatedTxs.map(tx => ({
                    ...tx,
                    timestamp: block.timestamp
                  }));
                  
                  transactions.push(...txsWithTimestamp);
                  transactionsFound += relatedTxs.length;
                  
                  // Check if we've reached the transaction limit (unless unlimited)
                  if (!isUnlimitedTransactions && transactionsFound >= searchOptions.maxTransactions) {
                    searchLimitReached = true;
                    if (debugMode) {
                      console.log(`[ChainHound Debug] Reached max transactions limit (${searchOptions.maxTransactions})`);
                    }
                    break;
                  }
                }
              }
            } catch (error) {
              console.error('Error processing block batch:', error);
              if (debugMode) {
                console.log(`[ChainHound Debug] Error processing block batch:`, error);
              }
            }
            
            if (searchLimitReached) break;
          }
          
          if (debugMode) {
            console.log(`[ChainHound Debug] Found ${transactions.length} related transactions`);
          }
          
          // Determine how many transactions to display
          const displayTransactions = isUnlimitedTransactions 
            ? transactions 
            : transactions.slice(0, searchOptions.maxTransactions);
          
          data = {
            type: 'address',
            address: searchQuery,
            balance: web3.utils.fromWei(balance.toString(), 'ether'),
            transactionCount: txCount,
            isContract,
            transactions: displayTransactions,
            searchLimitReached
          };
          
          if (debugMode) {
            console.log(`[ChainHound Debug] Address data prepared:`, data);
          }
        } catch (error) {
          console.error('Error fetching address data:', error);
          throw new Error(`Failed to fetch address data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else if (searchQuery.startsWith('0x') && searchQuery.length === 66) {
        // It's a transaction hash
        if (debugMode) {
          console.log(`[ChainHound Debug] Input is a transaction hash`);
        }
        
        try {
          const tx = await web3.eth.getTransaction(searchQuery);
          
          if (!tx) {
            throw new Error('Transaction not found');
          }
          
          if (debugMode) {
            console.log(`[ChainHound Debug] Transaction found:`, tx);
          }
          
          const receipt = await web3.eth.getTransactionReceipt(searchQuery);
          const block = await web3.eth.getBlock(tx.blockNumber);
          
          if (debugMode) {
            console.log(`[ChainHound Debug] Transaction receipt:`, receipt);
            console.log(`[ChainHound Debug] Block info:`, block);
          }
          
          data = {
            type: 'transaction',
            transaction: {
              ...tx,
              timestamp: block ? block.timestamp : null
            },
            receipt: receipt,
          };
          
          if (debugMode) {
            console.log(`[ChainHound Debug] Transaction data prepared:`, data);
          }
        } catch (error) {
          console.error('Error fetching transaction data:', error);
          throw new Error(`Failed to fetch transaction data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else if (!isNaN(Number(searchQuery))) {
        // It's a block number
        if (debugMode) {
          console.log(`[ChainHound Debug] Input is a block number`);
        }
        
        try {
          // Check if block is in cache first
          let block = await blockCache.getBlock(Number(searchQuery));
          
          if (!block) {
            block = await web3.eth.getBlock(Number(searchQuery), true);
            
            if (block) {
              // Cache the block for future use
              blockCache.cacheBlock(block);
            }
          }
          
          if (!block) {
            throw new Error('Block not found');
          }
          
          if (debugMode) {
            console.log(`[ChainHound Debug] Block found:`, block);
          }
          
          data = {
            type: 'block',
            block: block,
          };
          
          if (debugMode) {
            console.log(`[ChainHound Debug] Block data prepared:`, data);
          }
        } catch (error) {
          console.error('Error fetching block data:', error);
          throw new Error(`Failed to fetch block data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        throw new Error('Invalid input. Please enter a valid Ethereum address, transaction hash, or block number.');
      }
      
      // Convert any BigInt values to strings to avoid serialization issues
      const safeData = safelyConvertBigIntToString(data);
      setTransactionData(safeData);
    } catch (err: any) {
      console.error('Error fetching blockchain data:', err);
      setError(err.message || 'Failed to fetch blockchain data');
      setTransactionData(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  const addToRecentSearches = (query: string) => {
    // Get existing searches
    const savedSearches = localStorage.getItem('chainhound_recent_searches');
    let recentSearches = [];
    
    if (savedSearches) {
      try {
        recentSearches = JSON.parse(savedSearches);
      } catch (err) {
        console.error('Failed to parse recent searches:', err);
      }
    }
    
    // Determine search type
    let type: 'address' | 'transaction' | 'block' | 'unknown' = 'unknown';
    if (web3?.utils.isAddress(query)) {
      type = 'address';
    } else if (query.startsWith('0x') && query.length === 66) {
      type = 'transaction';
    } else if (!isNaN(Number(query))) {
      type = 'block';
    }
    
    // Add new search to beginning of array
    const newSearch = {
      query,
      timestamp: Date.now(),
      type
    };
    
    // Add to beginning of array and limit to 10 items
    const updatedSearches = [newSearch, ...recentSearches.filter((s: any) => s.query !== query)].slice(0, 10);
    
    // Save to localStorage
    localStorage.setItem('chainhound_recent_searches', JSON.stringify(updatedSearches));
    setRecentSearches(updatedSearches);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  const handleSearchHistoryClick = (query: string) => {
    setSearchInput(query);
    setShowSearchHistory(false);
    handleSearch(query);
  };
  
  const clearSearchHistory = () => {
    localStorage.removeItem('chainhound_recent_searches');
    setRecentSearches([]);
  };
  
  const updateSearchOptions = (options: Partial<SearchOptions>) => {
    const newOptions = { ...searchOptions, ...options };
    setSearchOptions(newOptions);
    localStorage.setItem('chainhound_search_options', JSON.stringify(newOptions));
  };
  
  const captureScreenshot = async (fullGraph = false) => {
    if (!graphRef.current) return;
    
    try {
      const dataUrl = await toPng(graphRef.current, {
        quality: 0.95,
        backgroundColor: 'white',
        style: {
          margin: '20px'
        }
      });
      
      // Create a watermark
      const canvas = document.createElement('canvas');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Draw the original image
        ctx.drawImage(img, 0, 0);
        
        // Add watermark
        ctx.font = '20px Arial';
        ctx.fillStyle = 'rgba(150, 150, 150, 0.5)';
        ctx.textAlign = 'center';
        ctx.fillText('ChainHound', canvas.width / 2, canvas.height - 20);
        
        // Create download link
        const link = document.createElement('a');
        link.download = `chainhound-${fullGraph ? 'full-graph' : 'visible-area'}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      
      img.src = dataUrl;
    } catch (error) {
      console.error('Error capturing screenshot:', error);
    }
  };
  
  const exportData = (format: 'json') => {
    if (!transactionData) return;
    
    let content;
    let mimeType;
    let filename;
    
    if (format === 'json') {
      content = JSON.stringify(transactionData, null, 2);
      mimeType = 'application/json';
      filename = `chainhound-data-${Date.now()}.json`;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };
  
  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  const getSearchTypeIcon = (type: string) => {
    switch (type) {
      case 'address':
        return <div className="w-2 h-2 rounded-full bg-indigo-600 mr-2"></div>;
      case 'transaction':
        return <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>;
      case 'block':
        return <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>;
      default:
        return <div className="w-2 h-2 rounded-full bg-gray-500 mr-2"></div>;
    }
  };
  
  // Helper to display max blocks/transactions value
  const displayMaxValue = (value: number, maxValue: number) => {
    return value >= maxValue ? "Unlimited" : value.toString();
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md dark:bg-gray-800 dark:text-white">
        <h1 className="text-2xl font-bold mb-4">Transaction Viewer</h1>
        <p className="text-gray-600 mb-6 dark:text-gray-300">
          Search for an Ethereum address, transaction hash, or block number to visualize transaction flows.
        </p>
        
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="flex-1 relative">
              <div className="relative flex items-center">
                <input 
                  type="text" 
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter address, transaction hash, or block number..." 
                  className="w-full p-2 pl-3 pr-10 border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                {searchInput && (
                  <button 
                    onClick={() => setSearchInput('')}
                    className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <div className="flex items-center mt-1 space-x-2">
                <button 
                  onClick={() => setShowSearchHistory(!showSearchHistory)}
                  className="text-xs flex items-center text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  <span>Recent searches</span>
                  {showSearchHistory ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                </button>
                
                <button 
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="text-xs flex items-center text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  <span>Advanced options</span>
                  {showAdvancedOptions ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                </button>
              </div>
              
              {/* Search history dropdown */}
              {showSearchHistory && (
                <div 
                  ref={searchHistoryRef}
                  className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg dark:bg-gray-700 border dark:border-gray-600"
                >
                  <div className="p-2 flex justify-between items-center border-b dark:border-gray-600">
                    <h3 className="text-sm font-medium">Recent Searches</h3>
                    {recentSearches.length > 0 && (
                      <button 
                        onClick={clearSearchHistory}
                        className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto p-2">
                    {recentSearches.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 p-2">No recent searches</p>
                    ) : (
                      <div className="space-y-1">
                        {recentSearches.map((search, index) => (
                          <div 
                            key={index} 
                            className="p-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md flex items-center justify-between"
                            onClick={() => handleSearchHistoryClick(search.query)}
                          >
                            <div className="flex items-center overflow-hidden">
                              {getSearchTypeIcon(search.type)}
                              <span className="truncate">{search.query}</span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">
                              {formatTimestamp(search.timestamp)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Advanced options dropdown */}
              {showAdvancedOptions && (
                <div 
                  ref={advancedOptionsRef}
                  className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg dark:bg-gray-700 border dark:border-gray-600"
                >
                  <div className="p-2 border-b dark:border-gray-600">
                    <h3 className="text-sm font-medium">Advanced Search Options</h3>
                  </div>
                  <div className="p-3 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                        <span>Max blocks to scan: </span>
                        <span className="ml-1 flex items-center">
                          {displayMaxValue(searchOptions.maxBlocks, UNLIMITED_BLOCKS)}
                          {searchOptions.maxBlocks >= UNLIMITED_BLOCKS && (
                            <Infinity className="h-4 w-4 ml-1 text-indigo-600 dark:text-indigo-400" />
                          )}
                        </span>
                      </label>
                      <input 
                        type="range" 
                        min="100" 
                        max="5000"
                        step="100"
                        value={Math.min(searchOptions.maxBlocks, 5000)}
                        onChange={(e) => updateSearchOptions({ maxBlocks: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>100</span>
                        <span>2500</span>
                        <span>5000</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                        <span>Max transactions: </span>
                        <span className="ml-1 flex items-center">
                          {displayMaxValue(searchOptions.maxTransactions, UNLIMITED_TRANSACTIONS)}
                          {searchOptions.maxTransactions >= UNLIMITED_TRANSACTIONS && (
                            <Infinity className="h-4 w-4 ml-1 text-indigo-600 dark:text-indigo-400" />
                          )}
                        </span>
                      </label>
                      <input 
                        type="range" 
                        min="10" 
                        max={UNLIMITED_TRANSACTIONS}
                        step="10"
                        value={searchOptions.maxTransactions}
                        onChange={(e) => updateSearchOptions({ maxTransactions: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>10</span>
                        <span>100</span>
                        <span>200</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <input 
                        type="checkbox"
                        id="includeInternalTxs"
                        checked={searchOptions.includeInternalTxs}
                        onChange={(e) => updateSearchOptions({ includeInternalTxs: e.target.checked })}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                      <label htmlFor="includeInternalTxs" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Include internal transactions
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => handleSearch()}
              disabled={isLoading || !isConnected}
              className={`text-white py-2 px-4 rounded transition flex items-center justify-center ${isConnected ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <Loader className="h-5 w-5 mr-2 animate-spin" />
                  <span>Searching...</span>
                </div>
              ) : (
                <>
                  <Search className="h-5 w-5 mr-1" />
                  <span>Search</span>
                </>
              )}
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded flex items-start dark:bg-red-900 dark:text-red-200">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          
          {!isConnected && (
            <div className="mt-4 p-3 bg-yellow-100 text-yellow-700 rounded flex items-start dark:bg-yellow-900 dark:text-yellow-200">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <p>Not connected to Ethereum network. Please check your connection in Settings.</p>
            </div>
          )}
        </div>
      </div>
      
      {transactionData && (
        <>
          <div className="bg-white p-6 rounded-lg shadow-md dark:bg-gray-800 dark:text-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
              <h2 className="text-xl font-semibold">Transaction Graph</h2>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => captureScreenshot(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-3 rounded flex items-center text-sm dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  <Camera className="h-4 w-4 mr-1" />
                  <span>Capture</span>
                </button>
                <button 
                  onClick={() => exportData('json')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-3 rounded flex items-center text-sm dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  <Download className="h-4 w-4 mr-1" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>
            
            {transactionData.searchLimitReached && (
              <div className="mb-4 p-2 bg-yellow-50 text-yellow-700 rounded-md text-sm flex items-center dark:bg-yellow-900/30 dark:text-yellow-200">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span>
                  Showing {transactionData.transactions?.length || 0} transactions (limit reached). 
                  Use advanced options to increase the limit for a more complete search.
                </span>
              </div>
            )}
            
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="lg:w-3/4">
                <div ref={graphRef} className="border rounded-lg p-4 bg-gray-50 h-[500px] dark:bg-gray-900 dark:border-gray-700">
                  <TransactionGraph data={transactionData} />
                </div>
              </div>
              <div className="lg:w-1/4">
                <div className="border rounded-lg p-4 bg-gray-50 h-[500px] overflow-y-auto dark:bg-gray-900 dark:border-gray-700">
                  <h3 className="font-semibold mb-2 flex items-center">
                    <Info className="h-4 w-4 mr-1" />
                    Legend
                  </h3>
                  <TransactionLegend />
                  
                  <h3 className="font-semibold mt-4 mb-2">Details</h3>
                  {transactionData.type === 'address' && (
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Address:</span> {transactionData.address}</p>
                      <p><span className="font-medium">Balance:</span> {transactionData.balance} ETH</p>
                      <p><span className="font-medium">Transaction Count:</span> {transactionData.transactionCount}</p>
                      <p><span className="font-medium">Type:</span> {transactionData.isContract ? 'Contract' : 'EOA'}</p>
                      <p><span className="font-medium">Transactions Shown:</span> {transactionData.transactions?.length || 0}</p>
                    </div>
                  )}
                  
                  {transactionData.type === 'transaction' && (
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Hash:</span> {transactionData.transaction.hash}</p>
                      <p><span className="font-medium">From:</span> {transactionData.transaction.from}</p>
                      <p><span className="font-medium">To:</span> {transactionData.transaction.to || 'Contract Creation'}</p>
                      <p><span className="font-medium">Value:</span> {formatWeiToEth(transactionData.transaction.value)} ETH</p>
                      <p><span className="font-medium">Block:</span> {transactionData.transaction.blockNumber}</p>
                      <p><span className="font-medium">Status:</span> {transactionData.receipt?.status ? 'Success' : 'Failed'}</p>
                    </div>
                  )}
                  
                  {transactionData.type === 'block' && (
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Block Number:</span> {transactionData.block.number}</p>
                      <p><span className="font-medium">Hash:</span> {transactionData.block.hash}</p>
                      <p><span className="font-medium">Timestamp:</span> {formatTimestamp(transactionData.block.timestamp * 1000)}</p>
                      <p><span className="font-medium">Transactions:</span> {transactionData.block.transactions?.length || 0}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TransactionViewer;