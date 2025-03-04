import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  AlertTriangle,
  Download,
  Camera,
  CheckCircle,
  StopCircle,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  RefreshCw,
} from "lucide-react";
import { useWeb3Context } from "../contexts/Web3Context";
import BlockGraph from "../components/BlockGraph";
import { blockCache } from "../services/BlockCache";
import { toPng } from "html-to-image";
import { saveAs } from "file-saver";
import { formatTimestamp } from "../utils/dateUtils";
import { safelyConvertBigIntToString } from "../utils/bigIntUtils";

interface SearchProgress {
  status: "idle" | "searching" | "completed" | "cancelled" | "error";
  blocksProcessed: number;
  blocksTotal: number;
  transactionsFound: number;
  message?: string;
}

interface RecentSearch {
  query: string;
  timestamp: number;
  type: "address" | "transaction" | "block" | "unknown";
}

interface Transaction {
  hash: string;
  blockNumber: string | number;
  from: string;
  to?: string;
  value: string;
  gas?: string | number;
  gasPrice?: string | number;
  gasUsed?: string | number;
  timestamp?: number;
  _isContractCall?: boolean;
}

interface Block {
  number: number;
  hash: string;
  transactions: Transaction[];
  timestamp: number;
  difficulty?: string | number;
  totalDifficulty?: string | number;
  size?: string | number;
  gasUsed?: string | number;
  gasLimit?: string | number;
  nonce?: string;
  miner?: string;
  parentHash?: string;
}

interface BlockData {
  type: "block" | "transaction" | "address";
  block?: Block;
  transaction?: Transaction;
  address?: string;
  isContract?: boolean;
  transactions?: Transaction[];
  receipt?: unknown;
}

interface NodeDetails {
  type: "address" | "contract" | "transaction" | "block";
  id?: string;
  hash?: string;
  blockNumber?: number;
  value?: string;
  timestamp?: number;
  role?: string;
}

const BlockExplorer = () => {
  const { web3, isConnected, reconnectProvider } = useWeb3Context();
  const [searchInput, setSearchInput] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [blockData, setBlockData] = useState<BlockData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchRange, setSearchRange] = useState({
    startBlock: "",
    endBlock: "",
    maxBlocks: "1000",
  });
  const [searchProgress, setSearchProgress] = useState<SearchProgress>({
    status: "idle",
    blocksProcessed: 0,
    blocksTotal: 0,
    transactionsFound: 0,
  });
  const [selectedNodeDetails, setSelectedNodeDetails] =
    useState<NodeDetails | null>(null);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const searchHistoryRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const searchCancelRef = useRef<boolean>(false);
  const [providerSwitchAttempted, setProviderSwitchAttempted] = useState(false);

  // Load recent searches from localStorage on component mount
  useEffect(() => {
    const savedSearches = localStorage.getItem("chainhound_recent_searches");
    if (savedSearches) {
      try {
        setRecentSearches(JSON.parse(savedSearches));
      } catch (err) {
        console.error("Failed to parse recent searches:", err);
      }
    }

    // Check if there's a search query in session storage (from Dashboard)
    const savedSearch = sessionStorage.getItem("chainhound_search");
    if (savedSearch) {
      setSearchInput(savedSearch);
      handleSearch(savedSearch);
      // Clear it after use
      sessionStorage.removeItem("chainhound_search");
    }
  }, []);

  // Close search history dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchHistoryRef.current &&
        !searchHistoryRef.current.contains(event.target as Node)
      ) {
        setShowSearchHistory(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F or Cmd+F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        const searchInput = document.getElementById("search-input");
        if (searchInput) {
          searchInput.focus();
        }
      }

      // Up arrow for previous search
      if (e.key === "ArrowUp" && e.altKey) {
        e.preventDefault();
        navigateSearchHistory("prev");
      }

      // Down arrow for next search
      if (e.key === "ArrowDown" && e.altKey) {
        e.preventDefault();
        navigateSearchHistory("next");
      }

      // Escape to cancel search
      if (e.key === "Escape" && searchProgress.status === "searching") {
        e.preventDefault();
        cancelSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchHistory, currentSearchIndex, searchProgress.status]);

  const determineSearchType = (
    query: string
  ): "address" | "transaction" | "block" | "unknown" => {
    if (web3?.utils.isAddress(query)) {
      return "address";
    } else if (query.startsWith("0x") && query.length === 66) {
      return "transaction";
    } else if (!isNaN(Number(query))) {
      return "block";
    }
    return "unknown";
  };

  const addToRecentSearches = (query: string) => {
    const type = determineSearchType(query);
    const newSearch: RecentSearch = {
      query,
      timestamp: Date.now(),
      type,
    };

    // Add to beginning of array and limit to 10 items
    const updatedSearches = [
      newSearch,
      ...recentSearches.filter((s) => s.query !== query),
    ].slice(0, 10);
    setRecentSearches(updatedSearches);

    // Save to localStorage
    localStorage.setItem(
      "chainhound_recent_searches",
      JSON.stringify(updatedSearches)
    );
  };

  const navigateSearchHistory = (direction: "prev" | "next") => {
    if (searchHistory.length === 0) return;

    let newIndex;
    if (direction === "prev") {
      newIndex =
        currentSearchIndex >= searchHistory.length - 1
          ? 0
          : currentSearchIndex + 1;
    } else {
      newIndex =
        currentSearchIndex <= 0
          ? searchHistory.length - 1
          : currentSearchIndex - 1;
    }

    setCurrentSearchIndex(newIndex);
    const previousSearch = searchHistory[newIndex];
    setSearchInput(previousSearch);
    handleSearch(previousSearch);
  };

  const handleSearch = async (query?: string) => {
    const searchQuery = query || searchInput;
    if (!searchQuery.trim()) return;

    if (!isConnected || !web3) {
      setError(
        "Not connected to Ethereum network. Please check your connection in Settings."
      );
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      setBlockData(null);
      setSelectedNodeDetails(null);
      searchCancelRef.current = false;
      setProviderSwitchAttempted(false);
      
      // Reset search progress
      setSearchProgress({
        status: "idle",
        blocksProcessed: 0,
        blocksTotal: 0,
        transactionsFound: 0,
      });

      // Add to search history if it's a new search
      if (!searchHistory.includes(searchQuery)) {
        setSearchHistory([searchQuery, ...searchHistory].slice(0, 20));
        setCurrentSearchIndex(0);
      }

      // Add to recent searches
      addToRecentSearches(searchQuery);

      // Determine search type
      const searchType = determineSearchType(searchQuery);

      if (searchType === "block") {
        // Search for a specific block
        await searchBlock(searchQuery);
      } else if (searchType === "transaction") {
        // Search for a transaction
        await searchTransaction(searchQuery);
      } else if (searchType === "address") {
        // Search for an address
        await searchAddress(searchQuery);
      } else {
        setError("Invalid search query. Please enter a valid block number, transaction hash, or address.");
      }
    } catch (error: any) {
      console.error("Search error:", error);
      setError(error.message || "An error occurred during search");
      
      // If we haven't tried switching providers yet and it's a connection issue
      if (!providerSwitchAttempted && 
          (error.message.includes("connection") || 
           error.message.includes("network") || 
           error.message.includes("timeout"))) {
        setError("Connection issue detected. Attempting to reconnect...");
        setProviderSwitchAttempted(true);
        
        try {
          await reconnectProvider();
          // Try the search again after reconnecting
          handleSearch(searchQuery);
        } catch (reconnectError) {
          setError("Failed to reconnect. Please try again or check your connection in Settings.");
        }
      }
    } finally {
      setIsLoading(false);
      setSearchProgress((prev) => ({
        ...prev,
        status: "completed",
      }));
    }
  };

  const searchBlock = async (blockId: string) => {
    try {
      setSearchProgress({
        status: "searching",
        blocksProcessed: 0,
        blocksTotal: 1,
        transactionsFound: 0,
      });
      
      // Convert block ID to number
      const blockNumber = Number(blockId);
      
      // Check if block is in cache first
      const cachedBlock = await blockCache.getBlock(blockNumber);
      
      if (cachedBlock) {
        console.log("Block found in cache:", cachedBlock);
        setBlockData({
          type: "block",
          block: cachedBlock,
        });
        
        // Set initial node details for the block
        setSelectedNodeDetails({
          type: "block",
          blockNumber: cachedBlock.number,
          hash: cachedBlock.hash,
          timestamp: cachedBlock.timestamp
        });
        
        setSearchProgress({
          status: "completed",
          blocksProcessed: 1,
          blocksTotal: 1,
          transactionsFound: cachedBlock.transactions?.length || 0,
        });
        return;
      }
      
      // Fetch block from blockchain
      const block = await web3!.eth.getBlock(blockNumber, true);
      
      if (!block) {
        throw new Error(`Block ${blockId} not found`);
      }
      
      // Convert any BigInt values to strings before caching
      const safeBlock = safelyConvertBigIntToString(block);
      
      // Cache the block for future use
      await blockCache.cacheBlock(safeBlock);
      
      setBlockData({
        type: "block",
        block: safeBlock as unknown as Block,
      });
      
      // Set initial node details for the block
      setSelectedNodeDetails({
        type: "block",
        blockNumber: safeBlock.number,
        hash: safeBlock.hash,
        timestamp: safeBlock.timestamp
      });
      
      setSearchProgress({
        status: "completed",
        blocksProcessed: 1,
        blocksTotal: 1,
        transactionsFound: safeBlock.transactions?.length || 0,
      });
    } catch (error: any) {
      console.error("Error searching for block:", error);
      throw new Error(`Failed to fetch block ${blockId}: ${error.message}`);
    }
  };

  const searchTransaction = async (txHash: string) => {
    try {
      setSearchProgress({
        status: "searching",
        blocksProcessed: 0,
        blocksTotal: 1,
        transactionsFound: 0,
      });
      
      // Fetch transaction
      const tx = await web3!.eth.getTransaction(txHash);
      
      if (!tx) {
        throw new Error(`Transaction ${txHash} not found`);
      }
      
      // Convert any BigInt values to strings
      const safeTx = safelyConvertBigIntToString(tx);
      
      // Fetch transaction receipt for additional info
      const receipt = await web3!.eth.getTransactionReceipt(txHash);
      const safeReceipt = safelyConvertBigIntToString(receipt);
      
      // Fetch block to get timestamp
      let block;
      if (safeTx.blockNumber) {
        // Check cache first
        block = await blockCache.getBlock(Number(safeTx.blockNumber));
        
        if (!block) {
          // Fetch from blockchain if not in cache
          const fetchedBlock = await web3!.eth.getBlock(safeTx.blockNumber);
          
          // Convert any BigInt values to strings
          block = safelyConvertBigIntToString(fetchedBlock);
          
          // Cache the block
          if (block) {
            await blockCache.cacheBlock(block);
          }
        }
      }
      
      // Add timestamp to transaction if block is available
      const txWithTimestamp = {
        ...safeTx,
        timestamp: block?.timestamp,
      };
      
      setBlockData({
        type: "transaction",
        transaction: txWithTimestamp as unknown as Transaction,
        receipt: safeReceipt,
      });
      
      // Set initial node details for the transaction
      setSelectedNodeDetails({
        type: "transaction",
        hash: txWithTimestamp.hash,
        blockNumber: Number(txWithTimestamp.blockNumber),
        value: txWithTimestamp.value,
        timestamp: txWithTimestamp.timestamp
      });
      
      setSearchProgress({
        status: "completed",
        blocksProcessed: block ? 1 : 0,
        blocksTotal: 1,
        transactionsFound: 1,
      });
    } catch (error: any) {
      console.error("Error searching for transaction:", error);
      throw new Error(`Failed to fetch transaction ${txHash}: ${error.message}`);
    }
  };

  const searchAddress = async (address: string) => {
    try {
      // Check if it's a contract
      const code = await web3!.eth.getCode(address);
      const isContract = code !== '0x';
      
      setSearchProgress({
        status: "searching",
        blocksProcessed: 0,
        blocksTotal: 0,
        transactionsFound: 0,
        message: "Searching for transactions...",
      });
      
      // If advanced search is enabled, use the specified range
      let startBlock = 0;
      let endBlock = Number(await web3!.eth.getBlockNumber());
      let maxBlocks = parseInt(searchRange.maxBlocks) || 1000;
      
      if (showAdvancedSearch && searchRange.startBlock && searchRange.endBlock) {
        startBlock = Number(searchRange.startBlock);
        endBlock = Number(searchRange.endBlock);
        
        // Validate range
        if (startBlock > endBlock) {
          throw new Error("Start block must be less than or equal to end block");
        }
        
        if (endBlock - startBlock >= maxBlocks) {
          endBlock = startBlock + maxBlocks - 1;
        }
      } else {
        // Default: search last 1000 blocks
        startBlock = Math.max(0, endBlock - maxBlocks + 1);
      }
      
      setSearchProgress({
        status: "searching",
        blocksProcessed: 0,
        blocksTotal: endBlock - startBlock + 1,
        transactionsFound: 0,
        message: `Searching blocks ${startBlock} to ${endBlock}...`,
      });
      
      // Get list of blocks already in cache
      const cachedBlockNumbers = await blockCache.getCachedBlockNumbers(startBlock, endBlock);
      console.log(`Found ${cachedBlockNumbers.length} cached blocks in range`);
      
      // Get list of blocks that previously had errors
      const errorBlocks = await blockCache.getErrorBlocksInRange(startBlock, endBlock);
      const errorBlockNumbers = new Set(errorBlocks.map(b => b.blockNumber));
      console.log(`Found ${errorBlocks.length} error blocks in range`);
      
      // Create a list of block numbers to fetch
      const blocksToFetch = [];
      for (let i = startBlock; i <= endBlock; i++) {
        // Skip blocks that are already cached
        if (!cachedBlockNumbers.includes(i) && !errorBlockNumbers.has(i)) {
          blocksToFetch.push(i);
        }
      }
      
      console.log(`Need to fetch ${blocksToFetch.length} new blocks`);
      
      // Process cached blocks first
      const transactions: Transaction[] = [];
      let processedBlocks = 0;
      
      // Process cached blocks
      for (const blockNumber of cachedBlockNumbers) {
        if (searchCancelRef.current) break;
        
        const block = await blockCache.getBlock(blockNumber);
        if (block && block.transactions) {
          // Find transactions involving this address
          const relevantTxs = block.transactions.filter(tx => 
            tx.from?.toLowerCase() === address.toLowerCase() || 
            tx.to?.toLowerCase() === address.toLowerCase()
          );
          
          // Add timestamp to transactions
          const txsWithTimestamp = relevantTxs.map(tx => ({
            ...tx,
            timestamp: block.timestamp,
            blockNumber: block.number,
          }));
          
          transactions.push(...txsWithTimestamp);
        }
        
        processedBlocks++;
        
        // Update progress every 10 blocks
        if (processedBlocks % 10 === 0) {
          setSearchProgress(prev => ({
            ...prev,
            blocksProcessed: processedBlocks,
            transactionsFound: transactions.length,
            message: `Processed ${processedBlocks} of ${cachedBlockNumbers.length + blocksToFetch.length} blocks...`,
          }));
        }
      }
      
      // Fetch and process new blocks
      const batchSize = 10; // Process 10 blocks at a time
      
      for (let i = 0; i < blocksToFetch.length; i += batchSize) {
        if (searchCancelRef.current) break;
        
        const batch = blocksToFetch.slice(i, i + batchSize);
        
        // Fetch blocks in parallel
        const blockPromises = batch.map(async (blockNumber) => {
          try {
            const fetchedBlock = await web3!.eth.getBlock(blockNumber, true);
            
            // Convert any BigInt values to strings
            const safeBlock = safelyConvertBigIntToString(fetchedBlock);
            
            // Cache the block
            if (safeBlock) {
              await blockCache.cacheBlock(safeBlock);
              return safeBlock;
            }
            return null;
          } catch (error) {
            console.error(`Error fetching block ${blockNumber}:`, error);
            // Record the error block
            await blockCache.recordErrorBlock(
              blockNumber, 
              'fetch_error', 
              error instanceof Error ? error.message : 'Unknown error'
            );
            return null;
          }
        });
        
        const blocks = await Promise.all(blockPromises);
        
        // Process the fetched blocks
        for (const block of blocks) {
          if (block && block.transactions) {
            // Find transactions involving this address
            const relevantTxs = block.transactions.filter((tx: any) => 
              tx.from?.toLowerCase() === address.toLowerCase() || 
              tx.to?.toLowerCase() === address.toLowerCase()
            );
            
            // Add timestamp to transactions
            const txsWithTimestamp = relevantTxs.map((tx: any) => ({
              ...tx,
              timestamp: block.timestamp,
              blockNumber: block.number,
            }));
            
            transactions.push(...txsWithTimestamp);
          }
        }
        
        processedBlocks += batch.length;
        
        // Update progress
        setSearchProgress(prev => ({
          ...prev,
          blocksProcessed: processedBlocks,
          transactionsFound: transactions.length,
          message: `Processed ${processedBlocks} of ${cachedBlockNumbers.length + blocksToFetch.length} blocks...`,
        }));
      }
      
      // Mark transactions as contract calls if the counterparty is a contract
      for (const tx of transactions) {
        if (tx.from?.toLowerCase() === address.toLowerCase()) {
          // This address is sending to another address
          if (tx.to) {
            try {
              const code = await web3!.eth.getCode(tx.to);
              tx._isContractCall = code !== '0x';
            } catch (error) {
              console.error(`Error checking if ${tx.to} is a contract:`, error);
            }
          }
        }
      }
      
      // Sort transactions by block number (descending)
      transactions.sort((a, b) => {
        const blockA = Number(a.blockNumber);
        const blockB = Number(b.blockNumber);
        return blockB - blockA;
      });
      
      // Make sure all transactions have string values for any potential BigInt fields
      const safeTransactions = safelyConvertBigIntToString(transactions);
      
      setBlockData({
        type: "address",
        address,
        isContract,
        transactions: safeTransactions,
      });
      
      // Set initial node details for the address
      setSelectedNodeDetails({
        type: isContract ? "contract" : "address",
        id: address
      });
      
      setSearchProgress({
        status: "completed",
        blocksProcessed: processedBlocks,
        blocksTotal: cachedBlockNumbers.length + blocksToFetch.length,
        transactionsFound: safeTransactions.length,
      });
      
      if (safeTransactions.length === 0) {
        setError(`No transactions found for address ${address} in the specified block range.`);
      }
    } catch (error: any) {
      console.error("Error searching for address:", error);
      throw new Error(`Failed to search address ${address}: ${error.message}`);
    }
  };

  const cancelSearch = () => {
    searchCancelRef.current = true;
    setSearchProgress(prev => ({
      ...prev,
      status: "cancelled",
      message: "Search cancelled by user",
    }));
  };

  const handleNodeClick = (node: NodeDetails) => {
    setSelectedNodeDetails(node);
  };

  const handleNodeDoubleClick = (node: NodeDetails) => {
    // Navigate to the clicked node
    if (node.type === 'address' || node.type === 'contract') {
      setSearchInput(node.id || '');
      handleSearch(node.id);
    } else if (node.type === 'transaction' && node.hash) {
      setSearchInput(node.hash);
      handleSearch(node.hash);
    } else if (node.type === 'block' && node.blockNumber !== undefined) {
      setSearchInput(node.blockNumber.toString());
      handleSearch(node.blockNumber.toString());
    }
  };

  const captureGraph = async () => {
    if (!graphRef.current) return;
    
    try {
      const dataUrl = await toPng(graphRef.current, { quality: 0.95 });
      
      // Create a link and trigger download
      const link = document.createElement('a');
      link.download = `chainhound-graph-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error capturing graph:', error);
      setError('Failed to capture graph as image');
    }
  };

  const toggleAdvancedSearch = () => {
    setShowAdvancedSearch(!showAdvancedSearch);
  };

  const handleSearchRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchRange(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="space-y-6 w-full">
      <div className="bg-white p-6 rounded-lg shadow-md dark:bg-gray-800 dark:text-white">
        <h1 className="text-2xl font-bold mb-4">Block Explorer</h1>
        
        <div className="relative">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <div className="flex">
                <input
                  id="search-input"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter block number, transaction hash, or address..."
                  className="w-full p-2 pr-10 border rounded-l focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <button
                  onClick={() => handleSearch()}
                  disabled={isLoading}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-r hover:bg-indigo-700 transition flex items-center"
                >
                  {isLoading ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </button>
              </div>
              
              {showSearchHistory && (
                <div 
                  ref={searchHistoryRef}
                  className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto dark:bg-gray-700 dark:border-gray-600"
                >
                  {searchHistory.length === 0 ? (
                    <div className="p-2 text-gray-500 dark:text-gray-400">No search history</div>
                  ) : (
                    <ul>
                      {searchHistory.map((query, index) => (
                        <li 
                          key={index}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer dark:hover:bg-gray-600"
                          onClick={() => {
                            setSearchInput(query);
                            handleSearch(query);
                            setShowSearchHistory(false);
                          }}
                        >
                          {query}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={toggleAdvancedSearch}
                className="bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 transition flex items-center dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <Filter className="h-4 w-4 mr-1" />
                {showAdvancedSearch ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              
              {blockData && (
                <button
                  onClick={captureGraph}
                  className="bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700 transition flex items-center"
                >
                  <Camera className="h-4 w-4 mr-1" />
                  Capture
                </button>
              )}
            </div>
          </div>
          
          {showAdvancedSearch && (
            <div className="mt-2 p-3 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
              <h3 className="text-sm font-medium mb-2">Advanced Search Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs mb-1">Start Block</label>
                  <input
                    type="number"
                    name="startBlock"
                    value={searchRange.startBlock}
                    onChange={handleSearchRangeChange}
                    placeholder="e.g., 15000000"
                    className="w-full p-1.5 text-sm border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">End Block</label>
                  <input
                    type="number"
                    name="endBlock"
                    value={searchRange.endBlock}
                    onChange={handleSearchRangeChange}
                    placeholder="e.g., 15001000"
                    className="w-full p-1.5 text-sm border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Max Blocks</label>
                  <input
                    type="number"
                    name="maxBlocks"
                    value={searchRange.maxBlocks}
                    onChange={handleSearchRangeChange}
                    placeholder="Default: 1000"
                    className="w-full p-1.5 text-sm border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 dark:text-gray-400">
                Specify a block range to search. For address searches, this limits the blocks scanned for transactions.
              </p>
            </div>
          )}
        </div>
        
        {searchProgress.status !== 'idle' && (
          <div className="mt-2 p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                {searchProgress.status === 'searching' && (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-medium">Searching...</span>
                  </>
                )}
                {searchProgress.status === 'completed' && (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium">Search completed</span>
                  </>
                )}
                {searchProgress.status === 'cancelled' && (
                  <>
                    <StopCircle className="h-4 w-4 mr-1 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium">Search cancelled</span>
                  </>
                )}
                {searchProgress.status === 'error' && (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-1 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium">Search error</span>
                  </>
                )}
              </div>
              
              {searchProgress.status === 'searching' && (
                <button
                  onClick={cancelSearch}
                  className="text-red-600 hover:text-red-800 text-sm flex items-center dark:text-red-400 dark:hover:text-red-300"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </button>
              )}
            </div>
            
            {searchProgress.status === 'searching' && (
              <>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1 dark:bg-gray-600">
                  <div 
                    className="bg-indigo-600 h-2.5 rounded-full dark:bg-indigo-500" 
                    style={{ 
                      width: `${searchProgress.blocksTotal > 0 
                        ? Math.min(100, (searchProgress.blocksProcessed / searchProgress.blocksTotal) * 100) 
                        : 0}%` 
                    }}
                  ></div>
                </div>
                
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {searchProgress.blocksProcessed} / {searchProgress.blocksTotal} blocks
                  </span>
                  <span>
                    {searchProgress.transactionsFound} transactions found
                  </span>
                </div>
                
                {searchProgress.message && (
                  <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                    {searchProgress.message}
                  </p>
                )}
              </>
            )}
            
            {searchProgress.status === 'completed' && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Processed {searchProgress.blocksProcessed} blocks, found {searchProgress.transactionsFound} transactions
              </div>
            )}
          </div>
        )}
        
        {error && (
          <div className="mt-2 p-3 bg-red-100 text-red-700 rounded-md flex items-start dark:bg-red-900/50 dark:text-red-300">
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {blockData && (
          <div className="mt-6">
            <div className="border rounded-lg overflow-hidden dark:border-gray-600">
              <div className="h-[500px]" ref={graphRef}>
                <BlockGraph 
                  data={blockData} 
                  onNodeClick={handleNodeClick}
                  onNodeDoubleClick={handleNodeDoubleClick}
                />
              </div>
            </div>
            
            {selectedNodeDetails && (
              <div className="mt-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                <h3 className="text-lg font-medium mb-2">
                  {selectedNodeDetails.type.charAt(0).toUpperCase() + selectedNodeDetails.type.slice(1)} Details
                </h3>
                
                <div className="space-y-2">
                  {selectedNodeDetails.type === 'address' || selectedNodeDetails.type === 'contract' ? (
                    <>
                      <div>
                        <span className="font-medium">Address:</span> {selectedNodeDetails.id}
                      </div>
                      {selectedNodeDetails.role && (
                        <div>
                          <span className="font-medium">Role:</span> {selectedNodeDetails.role}
                        </div>
                      )}
                    </>
                  ) : selectedNodeDetails.type === 'transaction' ? (
                    <>
                      <div>
                        <span className="font-medium">Hash:</span> {selectedNodeDetails.hash}
                      </div>
                      {selectedNodeDetails.blockNumber !== undefined && (
                        <div>
                          <span className="font-medium">Block:</span> {selectedNodeDetails.blockNumber}
                        </div>
                      )}
                      {selectedNodeDetails.value && (
                        <div>
                          <span className="font-medium">Value:</span> {selectedNodeDetails.value} ETH
                        </div>
                      )}
                      {selectedNodeDetails.timestamp && (
                        <div>
                          <span className="font-medium">Time:</span> {formatTimestamp(selectedNodeDetails.timestamp)}
                        </div>
                      )}
                    </>
                  ) : selectedNodeDetails.type === 'block' ? (
                    <>
                      <div>
                        <span className="font-medium">Block Number:</span> {selectedNodeDetails.blockNumber}
                      </div>
                      {selectedNodeDetails.hash && (
                        <div>
                          <span className="font-medium">Hash:</span> {selectedNodeDetails.hash}
                        </div>
                      )}
                      {selectedNodeDetails.timestamp && (
                        <div>
                          <span className="font-medium">Time:</span> {formatTimestamp(selectedNodeDetails.timestamp)}
                        </div>
                      )}
                    </>
                  ) : null}
                  
                  <div className="pt-2">
                    <button
                      onClick={() => handleNodeDoubleClick(selectedNodeDetails)}
                      className="bg-indigo-600 text-white px-3 py-1 text-sm rounded hover:bg-indigo-700 transition"
                    >
                      Explore
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockExplorer;

