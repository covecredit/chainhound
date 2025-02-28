import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Camera, Info, AlertTriangle, Loader, Clock, X, Settings, ChevronDown, ChevronUp, Trash2, Infinity, StopCircle } from 'lucide-react';
import * as d3 from 'd3';
import { toPng } from 'html-to-image';
import TransactionGraph from '../components/TransactionGraph';
import TransactionTimeline from '../components/TransactionTimeline';
import TransactionLegend from '../components/TransactionLegend';
import { useWeb3Context } from '../contexts/Web3Context';
import { blockCache } from '../services/BlockCache';
import { safelyConvertBigIntToString } from '../utils/bigIntUtils';

interface RecentSearch {
  query: string;
  timestamp: number;
  type: 'address' | 'transaction' | 'block' | 'unknown';
}

interface SearchOptions {
  maxBlocks: number;
  maxTransactions: number;
  includeInternalTxs: boolean;
  startBlockHeight: number | null;
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
    includeInternalTxs: true,
    startBlockHeight: null
  });
  const [isCancelling, setIsCancelling] = useState(false);
  const [searchCancelled, setSearchCancelled] = useState(false);
  const graphRef = useRef<HTMLDivElement>(null);
  const searchHistoryRef = useRef<HTMLDivElement>(null);
  const advancedOptionsRef = useRef<HTMLDivElement>(null);
  const cancelSearchRef = useRef<boolean>(false);
  
  // Constants for search limits
  const MAX_BLOCKS = 10000;
  const MAX_TRANSACTIONS = 200;
  
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
  
  // Helper function to fetch a block with retry logic
  const fetchBlockWithRetry = async (blockNumber: number, maxRetries: number): Promise<any> => {
    if (!web3) throw new Error('Web3 not initialized');
    
    let retries = 0;
    while (retries <= maxRetries) {
      try {
        // Check if search was cancelled
        if (cancelSearchRef.current) {
          throw new Error('Search cancelled');
        }
        
        // Try to get the block from cache first
        const cachedBlock = await blockCache.getBlock(blockNumber);
        if (cachedBlock) {
          if (debugMode) {
            console.log(`[ChainHound Debug] Block ${blockNumber} retrieved from cache`);
          }
          return cachedBlock;
        }
        
        // If not in cache, fetch from the network
        if (debugMode) {
          console.log(`[ChainHound Debug] Fetching block ${blockNumber} from network`);
        }
        
        const block = await web3.eth.getBlock(blockNumber, true);
        
        // Cache the block if it's valid
        if (block) {
          // Convert BigInt values to strings before caching
          const safeBlock = safelyConvertBigIntToString(block);
          await blockCache.cacheBlock(safeBlock);
        }
        
        return block;
      } catch (error: any) {
        if (cancelSearchRef.current) {
          throw new Error('Search cancelled');
        }
        
        retries++;
        if (debugMode) {
          console.log(`[ChainHound Debug] Error fetching block ${blockNumber}: ${error.message}. Retry ${retries}/${maxRetries}`);
        }
        
        if (retries > maxRetries) {
          if (debugMode) {
            console.log(`[ChainHound Debug] Max retries reached for block ${blockNumber}`);
          }
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
      }
    }
    
    throw new Error(`Failed to fetch block ${blockNumber} after ${maxRetries} retries`);
  };
  
  const cancelSearch = () => {
    if (debugMode) {
      console.log('[ChainHound Debug] Search cancelled by user');
    }
    
    cancelSearchRef.current = true;
    setIsCancelling(true);
  };
  
  const handleSearch = async (query?: string) => {
    const searchQuery = query || searchInput;
    if (!searchQuery) return;
    
    if (!isConnected || !web3) {
      setError('Not connected to Ethereum network. Please check your connection in Settings.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSearchCancelled(false);
    cancelSearchRef.current = false;
    
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
        const currentBlockNumber = await web3.eth.getBlockNumber();
        
        if (debugMode) {
          console.log(`[ChainHound Debug] Current block number: ${currentBlockNumber}`);
          console.log(`[ChainHound Debug] Fetching recent blocks for transactions...`);
          console.log(`[ChainHound Debug] Max blocks to scan: ${searchOptions.maxBlocks}`);
        }
        
        // Determine block range to scan
        const maxBlocksToScan = Math.min(searchOptions.maxBlocks, MAX_BLOCKS);
        
        // Determine start block based on user input or default to current block - maxBlocksToScan
        let startBlock: number;
        if (searchOptions.startBlockHeight !== null && searchOptions.startBlockHeight > 0) {
          startBlock = searchOptions.startBlockHeight;
        } else {
          startBlock = Math.max(1, currentBlockNumber - maxBlocksToScan);
        }
        
        const endBlock = Math.min(currentBlockNumber, startBlock + maxBlocksToScan - 1);
        
        if (debugMode) {
          console.log(`[ChainHound Debug] Scanning from block ${startBlock} to ${endBlock}`);
          console.log(`[ChainHound Debug] Total blocks to scan: ${endBlock - startBlock + 1}`);
        }
        
        // Check which blocks are already in the cache
        const cachedBlockNumbers = await blockCache.getCachedBlockNumbers(startBlock, endBlock);
        
        if (debugMode) {
          console.log(`[ChainHound Debug] Found ${cachedBlockNumbers.length} blocks in cache`);
        }
        
        // Get blocks in batches to avoid timeout
        const batchSize = 10;
        const transactions = [];
        let transactionsFound = 0;
        let searchLimitReached = false;
        let blocksScanned = 0;
        let cachedBlocksUsed = 0;
        let timeoutBlocks = 0;
        
        // Process blocks from newest to oldest
        for (let i = endBlock; i >= startBlock; i -= batchSize) {
          // Check if search was cancelled
          if (cancelSearchRef.current) {
            if (debugMode) {
              console.log('[ChainHound Debug] Search cancelled during processing');
            }
            setSearchCancelled(true);
            break;
          }
          
          // Check if we've reached the transaction limit
          if (transactionsFound >= searchOptions.maxTransactions) {
            searchLimitReached = true;
            if (debugMode) {
              console.log(`[ChainHound Debug] Reached max transactions limit (${searchOptions.maxTransactions})`);
            }
            break;
          }
          
          const batchEndBlock = i;
          const batchStartBlock = Math.max(startBlock, i - batchSize + 1);
          
          if (debugMode) {
            console.log(`[ChainHound Debug] Processing batch from block ${batchStartBlock} to ${batchEndBlock}`);
          }
          
          // Create array of block numbers in this batch
          const batchBlockNumbers = Array.from(
            { length: batchEndBlock - batchStartBlock + 1 },
            (_, index) => batchEndBlock - index
          );
          
          // Separate cached and uncached blocks
          const cachedBlocks = [];
          const uncachedBlockNumbers = [];
          
          for (const blockNum of batchBlockNumbers) {
            if (cachedBlockNumbers.includes(blockNum)) {
              const cachedBlock = await blockCache.getBlock(blockNum);
              if (cachedBlock) {
                cachedBlocks.push(cachedBlock);
                cachedBlocksUsed++;
              } else {
                uncachedBlockNumbers.push(blockNum);
              }
            } else {
              uncachedBlockNumbers.push(blockNum);
            }
          }
          
          // Fetch uncached blocks from the network
          const uncachedBlocks = [];
          if (uncachedBlockNumbers.length > 0) {
            if (debugMode) {
              console.log(`[ChainHound Debug] Fetching ${uncachedBlockNumbers.length} uncached blocks from network`);
            }
            
            // Get blocks in parallel with retry logic for timeouts
            const blockPromises = uncachedBlockNumbers.map(blockNum => 
              fetchBlockWithRetry(blockNum, 3)
            );
            
            try {
              const fetchedBlocks = await Promise.allSettled(blockPromises);
              
              fetchedBlocks.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                  uncachedBlocks.push(result.value);
                } else if (result.status === 'rejected') {
                  if (debugMode) {
                    console.log(`[ChainHound Debug] Failed to fetch block ${uncachedBlockNumbers[index]}: ${result.reason}`);
                  }
                  timeoutBlocks++;
                }
              });
            } catch (error) {
              if (cancelSearchRef.current) {
                if (debugMode) {
                  console.log('[ChainHound Debug] Search cancelled during block fetching');
                }
                setSearchCancelled(true);
                break;
              }
              
              console.error('Error fetching blocks:', error);
            }
          }
          
          // Combine cached and uncached blocks
          const blocks = [...cachedBlocks, ...uncachedBlocks];
          blocksScanned += blocks.length;
          
          if (debugMode) {
            console.log(`[ChainHound Debug] Processing ${blocks.length} blocks (${cachedBlocks.length} from cache, ${uncachedBlocks.length} from network)`);
          }
          
          // Process blocks
          for (const block of blocks) {
            if (!block || !block.transactions) continue;
            
            // Filter transactions related to the searched address
            const relatedTxs = block.transactions.filter((tx: any) => 
              (tx.from && tx.from.toLowerCase() === searchQuery.toLowerCase()) || 
              (tx.to && tx.to.toLowerCase() === searchQuery.toLowerCase())
            );
            
            if (relatedTxs.length > 0) {
              // Add timestamp and block number to transactions
              const txsWithMetadata = relatedTxs.map(tx => ({
                ...tx,
                timestamp: block.timestamp,
                blockNumber: block.number
              }));
              
              transactions.push(...txsWithMetadata);
              transactionsFound += relatedTxs.length;
              
              // Check if we've reached the transaction limit
              if (transactionsFound >= searchOptions.maxTransactions) {
                searchLimitReached = true;
                if (debugMode) {
                  console.log(`[ChainHound Debug] Reached max transactions limit (${searchOptions.maxTransactions})`);
                }
                break;
              }
            }
          }
          
          if (searchLimitReached) break;
        }
        
        if (debugMode) {
          console.log(`[ChainHound Debug] Found ${transactions.length} related transactions`);
          console.log(`[ChainHound Debug] Scanned ${blocksScanned} blocks`);
          console.log(`[ChainHound Debug] Used ${cachedBlocksUsed} blocks from cache`);
          console.log(`[ChainHound Debug] ${timeoutBlocks} blocks timed out or failed`);
        }
        
        // Convert BigInt values to strings to avoid serialization issues
        const safeTransactions = safelyConvertBigIntToString(transactions);
        
        data = {
          type: 'address',
          address: searchQuery,
          balance: web3.utils.fromWei(balance.toString(), 'ether'),
          transactionCount: txCount,
          isContract,
          transactions: safeTransactions,
          searchLimitReached,
          searchCancelled: cancelSearchRef.current,
          blocksScanned,
          startBlock,
          endBlock,
          cachedBlocksUsed,
          timeoutBlocks
        };
        
        if (debugMode) {
          console.log(`[ChainHound Debug] Address data prepared:`, data);
        }
      } else if (searchQuery.startsWith('0x') && searchQuery.length === 66) {
        // It's a transaction hash
        if (debugMode) {
          console.log(`[ChainHound Debug] Input is a transaction hash`);
        }
        
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
        
        // Convert BigInt values to strings
        const safeTx = safelyConvertBigIntToString(tx);
        const safeReceipt = safelyConvertBigIntToString(receipt);
        const safeBlock = safelyConvertBigIntToString(block);
        
        data = {
          type: 'transaction',
          transaction: {
            ...safeTx,
            timestamp: safeBlock.timestamp
          },
          receipt: safeReceipt,
        };
        
        if (debugMode) {
          console.log(`[ChainHound Debug] Transaction data prepared:`, data);
        }
      } else if (!isNaN(Number(searchQuery))) {
        // It's a block number
        if (debugMode) {
          console.log(`[ChainHound Debug] Input is a block number`);
        }
        
        const block = await web3.eth.getBlock(Number(searchQuery), true);
        
        if (!block) {
          throw new Error('Block not found');
        }
        
        if (debugMode) {
          console.log(`[ChainHound Debug] Block found:`, block);
        }
        
        // Convert BigInt values to strings
        const safeBlock = safelyConvertBigIntToString(block);
        
        data = {
          type: 'block',
          block: safeBlock,
        };
        
        if (debugMode) {
          console.log(`[ChainHound Debug] Block data prepared:`, data);
        }
      } else {
        throw new Error('Invalid input. Please enter a valid Ethereum address, transaction hash, or block number.');
      }
      
      setTransactionData(data);
    } catch (err: any) {
      console.error('Error fetching blockchain data:', err);
      
      if (cancelSearchRef.current) {
        setSearchCancelled(true);
        setError('Search was cancelled');
      } else {
        setError(err.message || 'Failed to fetch blockchain data');
      }
      
      setTransactionData(null);
    } finally {
      setIsLoading(false);
      setIsCancelling(false);
      cancelSearchRef.current = false;
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
  
  const captureScreenshot = async () => {
    if (!graphRef.current) return;
    
    try {
      const dataUrl = await toPng(graphRef.current, {
        quality: 0.95,
        backgroundColor: 'white',
        style: {
          margin: '20px'
        }
      });
      
      // Create a download link
      const link = document.createElement('a');
      link.download = `chainhound-graph-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error capturing screenshot:', error);
    }
  };
  
  const exportData = (format: 'json') => {
    if (!transactionData) return;
    
    let content;
    let mimeType;
    let filename;
    
    content = JSON.stringify(transactionData, null, 2);
    mimeType = 'application/json';
    filename = `chainhound-data-${Date.now()}.json`;
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };
  
  const formatTimestamp = (timestamp: number) => {
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
                          {displayMaxValue(searchOptions.maxBlocks, MAX_BLOCKS)}
                          {searchOptions.maxBlocks >= MAX_BLOCKS && (
                            <Infinity className="h-4 w-4 ml-1 text-indigo-600 dark:text-indigo-400" />
                          )}
                        </span>
                      </label>
                      <input 
                        type="range" 
                        min="100" 
                        max={MAX_BLOCKS}
                        step="100"
                        value={searchOptions.maxBlocks}
                        onChange={(e) => updateSearchOptions({ maxBlocks: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>100</span>
                        <span>5000</span>
                        <span>Unlimited</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                        <span>Max transactions: </span>
                        <span className="ml-1 flex items-center">
                          {displayMaxValue(searchOptions.maxTransactions, MAX_TRANSACTIONS)}
                          {searchOptions.maxTransactions >= MAX_TRANSACTIONS && (
                            <Infinity className="h-4 w-4 ml-1 text-indigo-600 dark:text-indigo-400" />
                          )}
                        </span>
                      </label>
                      <input 
                        type="range" 
                        min="10" 
                        max={MAX_TRANSACTIONS}
                        step="10"
                        value={searchOptions.maxTransactions}
                        onChange={(e) => updateSearchOptions({ maxTransactions: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>10</span>
                        <span>100</span>
                        <span>Unlimited</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Start block height (optional)
                      </label>
                      <input 
                        type="number"
                        value={searchOptions.startBlockHeight || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? null : parseInt(e.target.value);
                          updateSearchOptions({ startBlockHeight: value });
                        }}
                        placeholder="Leave empty to use current block - max blocks"
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
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
            
            {isLoading ? (
              <div className="flex space-x-2">
                <button 
                  onClick={cancelSearch}
                  disabled={isCancelling}
                  className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition flex items-center justify-center"
                >
                  {isCancelling ? (
                    <>
                      <Loader className="h-5 w-5 mr-2 animate-spin" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <>
                      <StopCircle className="h-5 w-5 mr-1" />
                      <span>Cancel</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button 
                onClick={() => handleSearch()}
                disabled={!isConnected}
                className={`text-white py-2 px-4 rounded transition flex items-center justify-center ${isConnected ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}`}
              >
                <Search className="h-5 w-5 mr-1" />
                <span>Search</span>
              </button>
            )}
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
          
          {searchCancelled && (
            <div className="mt-4 p-3 bg-amber-100 text-amber-700 rounded flex items-start dark:bg-amber-900 dark:text-amber-200">
              <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <p>Search was cancelled. Partial results may be displayed.</p>
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
                  onClick={captureScreenshot}
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
                  Use advanced options to increase the limit or set to unlimited for a complete search.
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
                      {transactionData.blocksScanned && (
                        <p><span className="font-medium">Blocks Scanned:</span> {transactionData.blocksScanned}</p>
                      )}
                      {transactionData.startBlock && transactionData.endBlock && (
                        <p><span className="font-medium">Block Range:</span> {transactionData.startBlock} - {transactionData.endBlock}</p>
                      )}
                      {transactionData.cachedBlocksUsed !== undefined && (
                        <p><span className="font-medium">Cached Blocks Used:</span> {transactionData.cachedBlocksUsed}</p>
                      )}
                    </div>
                  )}
                  
                  {transactionData.type === 'transaction' && (
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Hash:</span> {transactionData.transaction.hash}</p>
                      <p><span className="font-medium">From:</span> {transactionData.transaction.from}</p>
                      <p><span className="font-medium">To:</span> {transactionData.transaction.to || 'Contract Creation'}</p>
                      <p><span className="font-medium">Value:</span> {web3?.utils.fromWei(transactionData.transaction.value, 'ether')} ETH</p>
                      <p><span className="font-medium">Block:</span> {transactionData.transaction.blockNumber}</p>
                      <p><span className="font-medium">Status:</span> {transactionData.receipt?.status ? 'Success' : 'Failed'}</p>
                    </div>
                  )}
                  
                  {transactionData.type === 'block' && (
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Block Number:</span> {transactionData.block.number}</p>
                      <p><span className="font-medium">Hash:</span> {transactionData.block.hash}</p>
                      <p><span className="font-medium">Timestamp:</span> {new Date(Number(transactionData.block.timestamp) * 1000).toLocaleString()}</p>
                      <p><span className="font-medium">Transactions:</span> {transactionData.block.transactions.length}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md dark:bg-gray-800 dark:text-white">
            <h2 className="text-xl font-semibold mb-4">Activity Timeline</h2>
            <div className="h-[200px] border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
              <TransactionTimeline data={transactionData} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TransactionViewer;