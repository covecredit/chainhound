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
  const { web3, isConnected } = useWeb3Context();
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
    maxBlocks: "5000",
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
        setError(
          "Invalid search query. Please enter a valid block number, transaction hash, or address."
        );
      }
    } catch (err: Error | unknown) {
      if (err instanceof Error) {
        console.error("Search error:", err);
        setError(err.message || "An error occurred during search.");
        setSearchProgress({
          ...searchProgress,
          status: "error",
          message: err.message || "An error occurred during search.",
        });
      } else {
        console.error("Unknown error:", err);
        setError("An unknown error occurred during search.");
        setSearchProgress({
          ...searchProgress,
          status: "error",
          message: "An unknown error occurred during search.",
        });
      }
    } finally {
      setIsLoading(false);
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

      // Try to get from cache first
      const blockNumber = parseInt(blockId);
      let block = await blockCache.getBlock(blockNumber);
      let fromCache = true;

      if (!block) {
        fromCache = false;
        try {
          // Not in cache, fetch from blockchain with retries
          const maxRetries = 3;
          let retryCount = 0;
          let lastError;

          while (retryCount < maxRetries) {
            try {
              block = (await web3!.eth.getBlock(
                blockNumber,
                true
              )) as unknown as Block;
              break;
            } catch (error) {
              lastError = error;
              retryCount++;
              if (retryCount < maxRetries) {
                // Exponential backoff
                await new Promise((resolve) =>
                  setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1))
                );
              }
            }
          }

          if (!block && lastError) {
            throw lastError;
          }

          // Cache the block if successfully fetched
          if (block) {
            await blockCache.cacheBlock(block as unknown as Block);
          }
        } catch (error) {
          // Record the error in cache
          await blockCache.recordErrorBlock(
            blockNumber,
            error instanceof Error ? error.name : "UnknownError",
            error instanceof Error ? error.message : "Failed to fetch block"
          );
          throw error;
        }
      }

      if (!block) {
        throw new Error(`Block ${blockId} not found.`);
      }

      // Update block type casting
      const typedBlock: Block = {
        ...block,
        number: Number(block.number),
        timestamp: Number(block.timestamp),
        transactions: block.transactions as Transaction[],
      };

      // Format the data for the graph
      const formattedData = {
        type: "block" as const,
        block: typedBlock,
        fromCache,
      };

      setBlockData(formattedData);
      setSearchProgress({
        status: "completed",
        blocksProcessed: 1,
        blocksTotal: 1,
        transactionsFound: block.transactions ? block.transactions.length : 0,
      });
    } catch (err: Error | unknown) {
      if (err instanceof Error) {
        console.error("Error searching for block:", err);
        throw new Error(`Failed to fetch block ${blockId}: ${err.message}`);
      } else {
        console.error("Unknown error:", err);
        throw new Error("An unknown error occurred during block search.");
      }
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
        throw new Error(`Transaction ${txHash} not found.`);
      }

      // Fetch transaction receipt
      const receipt = await web3!.eth.getTransactionReceipt(txHash);

      // Fetch the block to get timestamp
      const block = await web3!.eth.getBlock(tx.blockNumber!);

      // Add timestamp to transaction
      const txWithTimestamp = {
        ...tx,
        blockNumber: tx.blockNumber?.toString() || "",
        timestamp: Number(block.timestamp),
      } as unknown as Transaction;

      // Format the data for the graph
      setBlockData({
        type: "transaction" as const,
        transaction: txWithTimestamp,
        receipt: receipt,
      });
      setSearchProgress({
        status: "completed",
        blocksProcessed: 1,
        blocksTotal: 1,
        transactionsFound: 1,
      });
    } catch (err: Error | unknown) {
      if (err instanceof Error) {
        console.error("Error searching for transaction:", err);
        throw new Error(
          `Failed to fetch transaction ${txHash}: ${err.message}`
        );
      } else {
        console.error("Unknown error:", err);
        throw new Error("An unknown error occurred during transaction search.");
      }
    }
  };

  const searchAddress = async (address: string) => {
    try {
      // Validate the range
      let startBlock = searchRange.startBlock
        ? parseInt(searchRange.startBlock)
        : undefined;
      let endBlock = searchRange.endBlock
        ? parseInt(searchRange.endBlock)
        : undefined;
      const maxBlocks = parseInt(searchRange.maxBlocks) || 5000;

      // Get current block if end block not specified
      if (endBlock === undefined) {
        const currentBlock = Number(await web3!.eth.getBlockNumber());
        endBlock = currentBlock;
      }

      // Calculate start block if not specified
      if (startBlock === undefined && endBlock !== undefined) {
        startBlock = Math.max(0, endBlock - maxBlocks + 1);
      }

      if (startBlock === undefined || endBlock === undefined) {
        throw new Error("Invalid block range.");
      }

      // Ensure we don't search too many blocks
      if (endBlock - startBlock + 1 > maxBlocks) {
        startBlock = endBlock - maxBlocks + 1;
      }

      // Check if the address is a contract
      const code = await web3!.eth.getCode(address);
      const isContract = code !== "0x";

      // Initialize search progress
      const totalBlocks = endBlock - startBlock + 1;
      setSearchProgress({
        status: "searching",
        blocksProcessed: 0,
        blocksTotal: totalBlocks,
        transactionsFound: 0,
      });

      // Get list of blocks already in cache
      const cachedBlockNumbers = await blockCache.getCachedBlockNumbers(
        startBlock,
        endBlock
      );

      // Get list of error blocks in the range
      const errorBlocks = await blockCache.getErrorBlocksInRange(
        startBlock,
        endBlock
      );
      const errorBlockNumbers = new Set(errorBlocks.map((b) => b.blockNumber));

      // Create a list of blocks to fetch (not in cache or are error blocks that should be retried)
      const blocksToFetch: number[] = [];
      for (let i = startBlock; i <= endBlock; i++) {
        const shouldRetryErrorBlock =
          errorBlockNumbers.has(i) &&
          localStorage.getItem("chainhound_retry_error_blocks") !== "false";
        if (!cachedBlockNumbers.includes(i) || shouldRetryErrorBlock) {
          blocksToFetch.push(i);
        }
      }

      // Collect transactions for the address
      const transactions: Transaction[] = [];
      let blocksProcessed = 0;

      // Process cached blocks first
      for (let i = startBlock; i <= endBlock; i++) {
        if (searchCancelRef.current) {
          setSearchProgress({
            ...searchProgress,
            status: "cancelled",
          });
          break;
        }

        // Skip blocks that need to be fetched
        if (blocksToFetch.includes(i)) continue;

        try {
          const block = await blockCache.getBlock(i);
          if (block?.transactions && Array.isArray(block.transactions)) {
            // Filter transactions for the address
            const addressTxs = block.transactions.filter(
              (tx): tx is Transaction => {
                if (typeof tx !== "object" || tx === null) return false;
                const txObj = tx as { from?: string; to?: string };
                return !!(
                  txObj.from &&
                  txObj.to &&
                  (txObj.from.toLowerCase() === address.toLowerCase() ||
                    txObj.to.toLowerCase() === address.toLowerCase())
                );
              }
            );

            if (addressTxs.length > 0) {
              // Add block timestamp to transactions and safely convert BigInt values
              const txsWithTimestamp = addressTxs.map((tx: Transaction) => ({
                ...tx,
                timestamp: Number(block.timestamp),
                _isContractCall:
                  isContract && tx.to?.toLowerCase() === address.toLowerCase(),
              }));

              transactions.push(...txsWithTimestamp);
            }
          }

          blocksProcessed++;

          // Update progress every 100 blocks or when processing cached blocks is complete
          if (
            blocksProcessed % 100 === 0 ||
            blocksProcessed === totalBlocks - blocksToFetch.length
          ) {
            setSearchProgress({
              ...searchProgress,
              blocksProcessed,
              transactionsFound: transactions.length,
            });
          }
        } catch (err) {
          console.error(`Error processing cached block ${i}:`, err);
        }
      }

      // Fetch and process blocks in batches with retries
      const batchSize = 5;
      const maxRetries = 3;

      for (let i = 0; i < blocksToFetch.length; i += batchSize) {
        if (searchCancelRef.current) {
          setSearchProgress({
            ...searchProgress,
            status: "cancelled",
          });
          break;
        }

        const batch = blocksToFetch.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (blockNumber) => {
            let retryCount = 0;
            let lastError;

            while (retryCount < maxRetries) {
              try {
                const block = (await web3!.eth.getBlock(
                  blockNumber,
                  true
                )) as unknown as Block;

                if (block) {
                  // Cache the block
                  await blockCache.cacheBlock(block as unknown as Block);
                  await blockCache.removeErrorBlock(blockNumber);

                  if (block.transactions && Array.isArray(block.transactions)) {
                    const addressTxs = block.transactions.filter(
                      (tx): tx is Transaction => {
                        if (typeof tx !== "object" || tx === null) return false;
                        const txObj = tx as { from?: string; to?: string };
                        return !!(
                          txObj.from &&
                          txObj.to &&
                          (txObj.from.toLowerCase() === address.toLowerCase() ||
                            txObj.to.toLowerCase() === address.toLowerCase())
                        );
                      }
                    );

                    if (addressTxs.length > 0) {
                      const txsWithTimestamp = addressTxs.map(
                        (tx: Transaction) => ({
                          ...tx,
                          timestamp: Number(block.timestamp),
                          _isContractCall:
                            isContract &&
                            tx.to?.toLowerCase() === address.toLowerCase(),
                        })
                      );

                      transactions.push(...txsWithTimestamp);
                    }
                  }
                }
                break;
              } catch (error) {
                lastError = error;
                retryCount++;
                if (retryCount < maxRetries) {
                  // Exponential backoff
                  await new Promise((resolve) =>
                    setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1))
                  );
                }
              }
            }

            if (lastError) {
              console.error(`Error fetching block ${blockNumber}:`, lastError);
              await blockCache.recordErrorBlock(
                blockNumber,
                lastError instanceof Error ? lastError.name : "UnknownError",
                lastError instanceof Error
                  ? lastError.message
                  : "Failed to fetch block"
              );
            }
          })
        );

        blocksProcessed += batch.length;

        // Update progress
        setSearchProgress({
          ...searchProgress,
          blocksProcessed,
          transactionsFound: transactions.length,
        });
      }

      // Sort transactions by block number (descending)
      const sortedTransactions = [...transactions].sort(
        (a: Transaction, b: Transaction) =>
          Number(b.blockNumber) - Number(a.blockNumber)
      );

      // Format the data for the graph
      const formattedData = {
        type: "address" as const,
        address,
        isContract,
        transactions: sortedTransactions,
      };

      setBlockData(formattedData);
      setSearchProgress({
        status: "completed",
        blocksProcessed,
        blocksTotal: totalBlocks,
        transactionsFound: transactions.length,
      });
    } catch (err: Error | unknown) {
      if (err instanceof Error) {
        console.error("Error searching for address:", err);
        throw new Error(
          `Failed to search for address ${address}: ${err.message}`
        );
      } else {
        console.error("Unknown error:", err);
        throw new Error("An unknown error occurred during address search.");
      }
    }
  };

  const cancelSearch = () => {
    searchCancelRef.current = true;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSearchHistoryClick = (query: string) => {
    setSearchInput(query);
    setShowSearchHistory(false);
    handleSearch(query);
  };

  const handleNodeClick = (node: NodeDetails) => {
    setSelectedNodeDetails(node);
    if (typeof node.blockNumber === "number") {
      searchBlock(node.blockNumber.toString());
    }
  };

  const renderNodeDetails = () => {
    if (!selectedNodeDetails) return null;

    switch (selectedNodeDetails.type) {
      case "address":
      case "contract":
        return (
          <div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium">
                  {selectedNodeDetails.type === "contract"
                    ? "Contract"
                    : "Address"}
                  {selectedNodeDetails.role && ` (${selectedNodeDetails.role})`}
                </p>
                <p className="text-xs font-mono mt-1 break-all">
                  {selectedNodeDetails.id}
                </p>
              </div>
              {selectedNodeDetails.id && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setSearchInput(selectedNodeDetails.id!);
                    handleSearch(selectedNodeDetails.id);
                  }}
                  className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  <Search className="h-3 w-3 mr-1" />
                  Search
                </button>
              )}
            </div>
          </div>
        );

      case "transaction":
        return (
          <div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium">Transaction</p>
                <p className="text-xs font-mono mt-1 break-all">
                  {selectedNodeDetails.hash}
                </p>
              </div>
              {selectedNodeDetails.hash && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setSearchInput(selectedNodeDetails.hash!);
                    handleSearch(selectedNodeDetails.hash);
                  }}
                  className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  <Search className="h-3 w-3 mr-1" />
                  Search
                </button>
              )}
            </div>
            {selectedNodeDetails.value && (
              <p className="text-xs mt-2">
                <span className="font-medium">Value:</span>{" "}
                {web3?.utils.fromWei(selectedNodeDetails.value, "ether")} ETH
              </p>
            )}
            {selectedNodeDetails.blockNumber && (
              <p className="text-xs mt-1">
                <span className="font-medium">Block:</span>{" "}
                {selectedNodeDetails.blockNumber}
              </p>
            )}
            {selectedNodeDetails.timestamp && (
              <p className="text-xs mt-1">
                <span className="font-medium">Time:</span>{" "}
                {new Date(
                  selectedNodeDetails.timestamp * 1000
                ).toLocaleString()}
              </p>
            )}
          </div>
        );

      case "block":
        return (
          <div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium">
                  Block #{selectedNodeDetails.blockNumber}
                </p>
                {selectedNodeDetails.hash && (
                  <p className="text-xs font-mono mt-1 break-all">
                    {selectedNodeDetails.hash}
                  </p>
                )}
              </div>
              {selectedNodeDetails.blockNumber && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    const blockNumber =
                      selectedNodeDetails.blockNumber!.toString();
                    setSearchInput(blockNumber);
                    handleSearch(blockNumber);
                  }}
                  className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  <Search className="h-3 w-3 mr-1" />
                  Search
                </button>
              )}
            </div>
            {selectedNodeDetails.timestamp && (
              <p className="text-xs mt-2">
                <span className="font-medium">Time:</span>{" "}
                {new Date(
                  selectedNodeDetails.timestamp * 1000
                ).toLocaleString()}
              </p>
            )}
          </div>
        );

      default:
        return <p>Unknown node type</p>;
    }
  };

  const captureScreenshot = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!graphRef.current) return;

    try {
      const dataUrl = await toPng(graphRef.current);
      const blob = await (await fetch(dataUrl)).blob();
      saveAs(blob, `block-graph-${Date.now()}.png`);
    } catch (error) {
      console.error("Error capturing screenshot:", error);
    }
  };

  const exportData = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!blockData) return;

    const blob = new Blob([JSON.stringify(blockData, null, 2)], {
      type: "application/json",
    });
    saveAs(blob, `block-data-${Date.now()}.json`);
  };

  const getSearchTypeIcon = (type: string) => {
    switch (type) {
      case "address":
        return <div className="w-2 h-2 rounded-full bg-indigo-600 mr-2"></div>;
      case "transaction":
        return <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>;
      case "block":
        return <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>;
      default:
        return <div className="w-2 h-2 rounded-full bg-gray-500 mr-2"></div>;
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex flex-col flex-grow min-h-0">
        {/* Search and Controls */}
        <div className="flex items-center justify-between p-4 space-x-4 bg-white dark:bg-gray-800">
          <div className="relative">
            <div className="flex">
              <div className="relative flex-grow">
                <input
                  id="search-input"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setShowSearchHistory(true)}
                  placeholder="Enter address, transaction hash, or block number..."
                  className="w-full p-2 pl-10 border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <div className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500">
                  <Search className="h-5 w-5" />
                </div>
                {searchInput && (
                  <button
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    onClick={(e) => {
                      e.preventDefault();
                      setSearchInput("");
                    }}
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => handleSearch()}
                disabled={isLoading || !searchInput.trim()}
                className={`ml-2 px-4 py-2 rounded ${
                  isLoading || !searchInput.trim()
                    ? "bg-gray-300 cursor-not-allowed dark:bg-gray-600"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {isLoading ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  "Search"
                )}
              </button>
              <button
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className="ml-2 bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200 flex items-center dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <Filter className="h-4 w-4 mr-1" />
                {showAdvancedSearch ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Search history dropdown */}
            {showSearchHistory && recentSearches.length > 0 && (
              <div
                ref={searchHistoryRef}
                className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto dark:bg-gray-700 dark:border-gray-600"
              >
                {recentSearches.map((search, index) => (
                  <div
                    key={index}
                    className="p-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md flex items-center justify-between"
                    onClick={(e) => {
                      e.preventDefault();
                      handleSearchHistoryClick(search.query);
                    }}
                  >
                    <div className="flex items-center overflow-hidden">
                      {getSearchTypeIcon(search.type)}
                      <span className="truncate">{search.query}</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">
                      {formatTimestamp(search.timestamp / 1000)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Advanced search options */}
          {showAdvancedSearch && (
            <div className="mt-3 p-3 border rounded-md dark:border-gray-600">
              <h3 className="text-sm font-medium mb-2">
                Advanced Search Options
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Start Block (optional)
                  </label>
                  <input
                    type="number"
                    value={searchRange.startBlock}
                    onChange={(e) =>
                      setSearchRange({
                        ...searchRange,
                        startBlock: e.target.value,
                      })
                    }
                    placeholder="e.g., 15000000"
                    className="w-full p-1.5 text-sm border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    End Block (optional)
                  </label>
                  <input
                    type="number"
                    value={searchRange.endBlock}
                    onChange={(e) =>
                      setSearchRange({
                        ...searchRange,
                        endBlock: e.target.value,
                      })
                    }
                    placeholder="e.g., 15100000"
                    className="w-full p-1.5 text-sm border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Max Blocks to Search
                  </label>
                  <input
                    type="number"
                    value={searchRange.maxBlocks}
                    onChange={(e) =>
                      setSearchRange({
                        ...searchRange,
                        maxBlocks: e.target.value,
                      })
                    }
                    placeholder="Default: 5000"
                    className="w-full p-1.5 text-sm border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Note: For address searches, these options limit the block range
                to search for transactions. If no range is specified, the most
                recent {searchRange.maxBlocks} blocks will be searched.
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded flex items-start dark:bg-red-900 dark:text-red-200">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Connection warning */}
          {!isConnected && (
            <div className="mt-4 p-3 bg-yellow-100 text-yellow-700 rounded flex items-start dark:bg-yellow-900 dark:text-yellow-200">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <p>
                Not connected to Ethereum network. Please check your connection
                in Settings.
              </p>
            </div>
          )}

          {/* Search status message */}
          {searchProgress.status === "completed" && (
            <div className="mt-2 p-3 bg-green-50 rounded-md dark:bg-green-900/30">
              <div className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Search completed: Found {searchProgress.transactionsFound}{" "}
                transactions in {searchProgress.blocksProcessed} blocks
              </div>
            </div>
          )}

          {searchProgress.status === "cancelled" && (
            <div className="mt-2 p-3 bg-amber-50 rounded-md dark:bg-amber-900/30">
              <div className="text-sm font-medium text-amber-700 dark:text-amber-300 flex items-center">
                <StopCircle className="h-4 w-4 mr-2" />
                Search cancelled: Found {searchProgress.transactionsFound}{" "}
                transactions in {searchProgress.blocksProcessed} blocks
              </div>
            </div>
          )}

          {searchProgress.status === "error" && searchProgress.message && (
            <div className="mt-2 p-3 bg-red-50 rounded-md dark:bg-red-900/30">
              <div className="text-sm font-medium text-red-700 dark:text-red-300 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Search error: {searchProgress.message}
              </div>
            </div>
          )}

          {searchProgress.status === "searching" && (
            <div className="mt-2">
              <div className="flex justify-between items-center mb-1">
                <div className="text-sm font-medium flex items-center">
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Searching blocks {searchProgress.blocksProcessed} /{" "}
                  {searchProgress.blocksTotal}
                </div>
                <button
                  onClick={cancelSearch}
                  className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70"
                >
                  Cancel
                </button>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full dark:bg-indigo-500"
                  style={{
                    width: `${
                      (searchProgress.blocksProcessed /
                        searchProgress.blocksTotal) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Found {searchProgress.transactionsFound} transactions so far
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-grow min-h-0 p-4 flex flex-col space-y-4 overflow-auto">
          {/* Graph Section */}
          {blockData && (
            <div className="flex flex-col space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">Block Graph</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={captureScreenshot}
                    className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    <Camera className="h-4 w-4 mr-1" />
                    Capture
                  </button>
                  <button
                    onClick={exportData}
                    className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export JSON
                  </button>
                </div>
              </div>

              <div className="relative" ref={graphRef}>
                <div className="h-[500px] border rounded-lg overflow-hidden dark:border-gray-600">
                  <BlockGraph
                    data={blockData}
                    onNodeClick={handleNodeClick}
                    onNodeDoubleClick={(node) => {
                      if (node.type === "address" || node.type === "contract") {
                        setSearchInput(node.id);
                        handleSearch(node.id);
                      } else if (node.type === "transaction" && node.hash) {
                        setSearchInput(node.hash);
                        handleSearch(node.hash);
                      } else if (node.type === "block" && node.blockNumber) {
                        setSearchInput(node.blockNumber.toString());
                        handleSearch(node.blockNumber.toString());
                      }
                    }}
                  />
                </div>
              </div>

              {/* Details Panel - Now below the graph */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                {/* Node Details Panel */}
                {selectedNodeDetails && (
                  <div className="mb-4 p-4 border rounded-lg dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
                    <h3 className="text-lg font-medium mb-2">Node Details</h3>
                    <div className="space-y-2">{renderNodeDetails()}</div>
                  </div>
                )}
                {/* ... existing block details content ... */}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockExplorer;
