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
  contractAddress?: string;
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
  const [startBlockMeta, setStartBlockMeta] = useState<{
    timestamp?: number;
    number?: number;
  } | null>(null);
  const [endBlockMeta, setEndBlockMeta] = useState<{
    timestamp?: number;
    number?: number;
  } | null>(null);
  const [blockRangeError, setBlockRangeError] = useState<string | null>(null);

  useEffect(() => {
    const savedSearches = localStorage.getItem("chainhound_recent_searches");
    if (savedSearches) {
      try {
        setRecentSearches(JSON.parse(savedSearches));
      } catch (err) {
        console.error("Failed to parse recent searches:", err);
      }
    }

    const savedSearch = sessionStorage.getItem("chainhound_search");
    if (savedSearch) {
      setSearchInput(savedSearch);
      handleSearch(savedSearch);
      sessionStorage.removeItem("chainhound_search");
    }
  }, []);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        const searchInput = document.getElementById("search-input");
        if (searchInput) {
          searchInput.focus();
        }
      }

      if (e.key === "ArrowUp" && e.altKey) {
        e.preventDefault();
        navigateSearchHistory("prev");
      }

      if (e.key === "ArrowDown" && e.altKey) {
        e.preventDefault();
        navigateSearchHistory("next");
      }

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

  const sanitizeSearchInput = (input: string) => {
    // Remove leading/trailing whitespace and trailing non-alphanumeric characters (except 0x for hex)
    let trimmed = input.trim();
    // Remove trailing non-alphanumeric (except for valid hex chars)
    trimmed = trimmed.replace(/[^a-zA-Z0-9]+$/, "");
    return trimmed;
  };

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

    const updatedSearches = [
      newSearch,
      ...recentSearches.filter((s) => s.query !== query),
    ].slice(0, 10);
    setRecentSearches(updatedSearches);

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
    // Cancel any previous search before starting a new one
    searchCancelRef.current = true;
    // Give a tick for any previous async loops to check the flag
    await new Promise((resolve) => setTimeout(resolve, 0));
    searchCancelRef.current = false;

    let searchQuery = query || searchInput;
    searchQuery = sanitizeSearchInput(searchQuery);
    if (!searchQuery) return;

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

      setSearchProgress({
        status: "idle",
        blocksProcessed: 0,
        blocksTotal: 0,
        transactionsFound: 0,
      });

      if (!searchHistory.includes(searchQuery)) {
        setSearchHistory([searchQuery, ...searchHistory].slice(0, 20));
        setCurrentSearchIndex(0);
      }

      addToRecentSearches(searchQuery);

      const searchType = determineSearchType(searchQuery);

      if (searchType === "block") {
        await searchBlock(searchQuery);
      } else if (searchType === "transaction") {
        await searchTransaction(searchQuery);
      } else if (searchType === "address") {
        await searchAddress(searchQuery);
      } else {
        setError(
          "Invalid search query. Please enter a valid block number, transaction hash, or address."
        );
      }
    } catch (error: any) {
      if (error instanceof RangeError && error.message.includes("call stack")) {
        setError(
          "Search failed: Too many results or recursion. Please reduce the search range or try a smaller query."
        );
        setSearchProgress((prev) => ({
          ...prev,
          status: "error",
          message: "Search failed due to stack overflow.",
        }));
        return;
      }
      if (
        error.message &&
        error.message.toLowerCase().includes("out of memory")
      ) {
        setError(
          "Search failed: Out of memory. Please reduce the search range or clear some cache."
        );
        setSearchProgress((prev) => ({
          ...prev,
          status: "error",
          message: "Search failed due to out of memory.",
        }));
        return;
      }
      console.error("Search error:", error);
      setError(error.message || "An error occurred during search");

      if (
        !providerSwitchAttempted &&
        (error.message.includes("connection") ||
          error.message.includes("network") ||
          error.message.includes("timeout"))
      ) {
        setError("Connection issue detected. Attempting to reconnect...");
        setProviderSwitchAttempted(true);

        try {
          await reconnectProvider();
          handleSearch(searchQuery);
        } catch (reconnectError) {
          setError(
            "Failed to reconnect. Please try again or check your connection in Settings."
          );
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
    if (searchCancelRef.current) return;

    try {
      setSearchProgress({
        status: "searching",
        blocksProcessed: 0,
        blocksTotal: 1,
        transactionsFound: 0,
      });

      const blockNumber = Number(blockId);

      const cachedBlock = await blockCache.getBlock(blockNumber);

      if (cachedBlock) {
        console.log("Block found in cache:", cachedBlock);
        setBlockData({
          type: "block",
          block: cachedBlock,
        });

        setSelectedNodeDetails({
          type: "block",
          blockNumber: cachedBlock.number,
          hash: cachedBlock.hash,
          timestamp: cachedBlock.timestamp,
        });

        setSearchProgress({
          status: "completed",
          blocksProcessed: 1,
          blocksTotal: 1,
          transactionsFound: cachedBlock.transactions?.length || 0,
        });
        return;
      }

      const block = await web3!.eth.getBlock(blockNumber, true);

      if (!block) {
        throw new Error(`Block ${blockId} not found`);
      }

      const safeBlock = safelyConvertBigIntToString(block);

      await blockCache.cacheBlock(safeBlock);

      setBlockData({
        type: "block",
        block: safeBlock as unknown as Block,
      });

      setSelectedNodeDetails({
        type: "block",
        blockNumber: safeBlock.number,
        hash: safeBlock.hash,
        timestamp: safeBlock.timestamp,
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
    if (searchCancelRef.current) return;

    try {
      setSearchProgress({
        status: "searching",
        blocksProcessed: 0,
        blocksTotal: 1,
        transactionsFound: 0,
      });

      const tx = await web3!.eth.getTransaction(txHash);

      if (!tx) {
        throw new Error(`Transaction ${txHash} not found`);
      }

      const safeTx = safelyConvertBigIntToString(tx);

      const receipt = await web3!.eth.getTransactionReceipt(txHash);
      const safeReceipt = safelyConvertBigIntToString(receipt);

      let block;
      if (safeTx.blockNumber) {
        block = await blockCache.getBlock(Number(safeTx.blockNumber));

        if (!block) {
          const fetchedBlock = await web3!.eth.getBlock(safeTx.blockNumber);

          block = safelyConvertBigIntToString(fetchedBlock);

          if (block) {
            await blockCache.cacheBlock(block);
          }
        }
      }

      const txWithTimestamp = {
        ...safeTx,
        timestamp: block?.timestamp,
      };

      setBlockData({
        type: "transaction",
        transaction: txWithTimestamp as unknown as Transaction,
        receipt: safeReceipt,
      });

      setSelectedNodeDetails({
        type: "transaction",
        hash: txWithTimestamp.hash,
        blockNumber: Number(txWithTimestamp.blockNumber),
        value: txWithTimestamp.value,
        timestamp: txWithTimestamp.timestamp,
      });

      setSearchProgress({
        status: "completed",
        blocksProcessed: block ? 1 : 0,
        blocksTotal: 1,
        transactionsFound: 1,
      });
    } catch (error: any) {
      console.error("Error searching for transaction:", error);
      throw new Error(
        `Failed to fetch transaction ${txHash}: ${error.message}`
      );
    }
  };

  const searchAddress = async (address: string) => {
    if (searchCancelRef.current) return;

    try {
      const retryErrorBlocks = false; // Set to true if you want to retry error blocks
      const code = await web3!.eth.getCode(address);
      const isContract = code !== "0x";

      setSearchProgress((prev) => ({
        ...prev,
        status: "searching",
        message: `Scanning large cache for relevant blocks and transactions. This may take a while if your cache is large...`,
        blocksTotal: 0,
        blocksProcessed: 0,
        transactionsFound: 0,
      }));

      // Get the latest block number
      const latestBlockNumber = Number(await web3!.eth.getBlockNumber());

      // Determine the initial block range to search
      let startBlock = 0;
      let endBlock = latestBlockNumber;
      let maxNewBlocks = parseInt(searchRange.maxBlocks) || 1000;

      if (
        showAdvancedSearch &&
        searchRange.startBlock &&
        searchRange.endBlock
      ) {
        startBlock = Number(searchRange.startBlock);
        endBlock = Number(searchRange.endBlock);
        // Only use the user-specified range, ignore maxBlocks
        maxNewBlocks = endBlock - startBlock + 1;
        if (startBlock > endBlock) {
          throw new Error(
            "Start block must be less than or equal to end block"
          );
        }
      } else {
        // Start from the most recent blocks
        endBlock = latestBlockNumber;
        startBlock = Math.max(0, endBlock - maxNewBlocks + 1);
      }

      console.log(`Initial search range: ${startBlock} to ${endBlock}`);

      // Get all cached blocks to avoid searching them again
      let allCachedBlocks = new Set(
        await blockCache.getCachedBlockNumbers(0, latestBlockNumber)
      );
      const allErrorBlocks = await blockCache.getErrorBlocksInRange(
        0,
        latestBlockNumber
      );
      const errorBlockNumbers = new Set(
        allErrorBlocks.map((b) => b.blockNumber)
      );

      // Add debug: print cached blocks in the current search range
      const cachedInRange = await blockCache.getCachedBlockNumbers(
        startBlock,
        endBlock
      );
      let totalCachedBlocks = cachedInRange.length;
      // Calculate totalBlocksToProcess before using it
      const totalBlocksToProcess = maxNewBlocks;
      setSearchProgress((prev) => ({
        ...prev,
        blocksTotal: totalBlocksToProcess,
        message: `Found ${cachedInRange.length} cached blocks, fetching ${totalBlocksToProcess} new blocks...`,
      }));

      // Retry error blocks if enabled
      if (retryErrorBlocks && allErrorBlocks.length > 0) {
        setSearchProgress((prev) => ({
          ...prev,
          message: `Retrying ${allErrorBlocks.length} error blocks... This may take a while.`,
        }));
        let fixed = 0;
        for (const err of allErrorBlocks) {
          try {
            const block = await web3!.eth.getBlock(err.blockNumber, true);
            if (block) {
              await blockCache.cacheBlocks([block]);
              await blockCache.removeErrorBlock(err.blockNumber);
              fixed++;
              totalCachedBlocks++;
              setSearchProgress((prev) => ({
                ...prev,
                message: `Fixed ${fixed} error blocks, found ${totalCachedBlocks} cached blocks.`,
              }));
            }
          } catch (e) {
            // Ignore, will remain in error list
          }
        }
      }

      console.log(
        `Cached blocks in range ${startBlock}-${endBlock}:`,
        cachedInRange
      );
      console.log(`Total cached blocks: ${allCachedBlocks.size}`);
      console.log(`Total error blocks: ${allErrorBlocks.length}`);

      // Initialize variables for tracking blocks
      const transactions: Transaction[] = [];
      let newBlocksProcessed = 0;
      let blocksFoundInCache = 0;
      let currentStartBlock = startBlock;
      let currentEndBlock = endBlock;
      let searchRangeCount = 0;
      const maxSearchRanges = 100; // Increase the limit to allow for more ranges to be searched

      // Set the total blocks to process - this is the number of new blocks we want to fetch
      setSearchProgress((prev) => ({
        ...prev,
        blocksTotal: totalBlocksToProcess,
        message: `Found ${cachedInRange.length} cached blocks, fetching ${totalBlocksToProcess} new blocks...`,
      }));

      // Helper to find the next uncached block range
      async function findNextUncachedBlocks(
        start: number,
        end: number,
        count: number
      ) {
        // Always refresh the cache set for the current range
        const cachedBlockNums = new Set(
          await blockCache.getCachedBlockNumbers(start, end)
        );
        let uncached: number[] = [];
        for (let i = end; i >= start; i--) {
          if (!cachedBlockNums.has(i) && !errorBlockNumbers.has(i)) {
            uncached.push(i);
            if (uncached.length === count) break;
          }
        }
        return uncached.reverse();
      }

      // Continue searching until we've found enough new blocks or reached the maximum search ranges
      while (
        newBlocksProcessed < totalBlocksToProcess &&
        searchRangeCount < maxSearchRanges
      ) {
        if (searchCancelRef.current) break;

        searchRangeCount++;
        let remainingNewBlocks = totalBlocksToProcess - newBlocksProcessed;
        let blocksToFetch: number[] = [];
        let scanStart = currentStartBlock;
        let scanEnd = currentEndBlock;
        // Keep looking for uncached blocks until we have enough for this batch or run out of range
        while (
          blocksToFetch.length < remainingNewBlocks &&
          scanEnd >= 0 &&
          scanStart <= scanEnd
        ) {
          const needed = remainingNewBlocks - blocksToFetch.length;
          const found = await findNextUncachedBlocks(
            scanStart,
            scanEnd,
            needed
          );
          blocksToFetch.push(...found);
          if (blocksToFetch.length < remainingNewBlocks) {
            // Move window to earlier blocks
            scanEnd = scanStart - 1;
            scanStart = Math.max(0, scanEnd - maxNewBlocks + 1);
          } else {
            break;
          }
        }
        if (blocksToFetch.length === 0) {
          // No more uncached blocks to fetch
          break;
        }
        console.log(
          `Searching blocks ${blocksToFetch[0]} to ${
            blocksToFetch[blocksToFetch.length - 1]
          }, found ${blocksToFetch.length} new blocks to fetch`
        );
        // Process blocks in batches
        const batchSize = 10;
        for (let i = 0; i < blocksToFetch.length; i += batchSize) {
          if (searchCancelRef.current) break;

          const batch = blocksToFetch.slice(i, i + batchSize);
          const batchPromises = batch.map(async (blockNumber) => {
            try {
              let block = await blockCache.getBlock(blockNumber);
              if (block) {
                blocksFoundInCache++;
                return null;
              }
              // Block is not in the cache, fetch it from the network
              console.log(`Fetching block ${blockNumber} from network`);
              const fetchedBlock = await web3!.eth.getBlock(blockNumber, true);
              if (fetchedBlock) {
                const safeBlock = safelyConvertBigIntToString(
                  fetchedBlock
                ) as Block;
                await blockCache.cacheBlock(safeBlock);
                newBlocksProcessed++;
                setSearchProgress((prev) => ({
                  ...prev,
                  blocksProcessed: newBlocksProcessed,
                  transactionsFound: transactions.length,
                  message: `Searching cache (may take a while if cache is large)... Found ${totalCachedBlocks} cached blocks. Added ${newBlocksProcessed} new blocks to cache, ${
                    totalBlocksToProcess - newBlocksProcessed
                  } remaining...`,
                }));
                return safeBlock;
              }
            } catch (error) {
              console.error(`Error fetching block ${blockNumber}:`, error);
              await blockCache.recordErrorBlock(
                blockNumber,
                "fetch_error",
                error instanceof Error ? error.message : "Unknown error"
              );
            }
            return null;
          });
          const batchResults = await Promise.all(batchPromises);
          const validBlocks = batchResults.filter(
            (block): block is Block => block !== null
          );
          for (const block of validBlocks) {
            if (block.transactions) {
              const relevantTxs = block.transactions.filter(
                (tx: Transaction) =>
                  tx.from?.toLowerCase() === address.toLowerCase() ||
                  tx.to?.toLowerCase() === address.toLowerCase()
              );
              const txsWithTimestamp = relevantTxs.map((tx: Transaction) => ({
                ...tx,
                timestamp: block.timestamp,
                blockNumber: block.number,
              }));
              transactions.push(...txsWithTimestamp);
            }
          }
        }
        // Update current window for next outer loop
        currentEndBlock = scanStart - 1;
        currentStartBlock = Math.max(0, currentEndBlock - maxNewBlocks + 1);
      }

      // Check contract interactions
      for (const tx of transactions) {
        if (tx.from?.toLowerCase() === address.toLowerCase()) {
          if (tx.to) {
            try {
              const code = await web3!.eth.getCode(tx.to);
              tx._isContractCall = code !== "0x";
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

      const safeTransactions = safelyConvertBigIntToString(
        transactions
      ) as Transaction[];

      setBlockData({
        type: "address",
        address,
        isContract,
        transactions: safeTransactions,
      });

      setSelectedNodeDetails({
        type: isContract ? "contract" : "address",
        id: address,
      });

      // Update the final search progress with accurate counts
      setSearchProgress({
        status: "completed",
        blocksProcessed: newBlocksProcessed,
        blocksTotal: totalBlocksToProcess,
        transactionsFound: safeTransactions.length,
        message: `Search completed. Added ${newBlocksProcessed} new blocks to cache, found ${cachedInRange.length} blocks in cache, found ${safeTransactions.length} transactions.`,
      });

      if (safeTransactions.length === 0) {
        setError(
          `No transactions found for address ${address} in the specified block range.`
        );
      }
    } catch (error: any) {
      if (error instanceof RangeError && error.message.includes("call stack")) {
        throw new Error(
          "Search failed: Too many results or recursion. Please reduce the search range or try a smaller query."
        );
      }
      if (
        error.message &&
        error.message.toLowerCase().includes("out of memory")
      ) {
        throw new Error(
          "Search failed: Out of memory. Please reduce the search range or clear some cache."
        );
      }
      console.error("Error searching for address:", error);
      throw new Error(`Failed to search address ${address}: ${error.message}`);
    }
  };

  const cancelSearch = () => {
    searchCancelRef.current = true;
    setSearchProgress((prev) => ({
      ...prev,
      status: "cancelled",
      message: "Search cancelled by user",
    }));
    setIsLoading(false);
  };

  const handleNodeClick = (node: NodeDetails) => {
    setSelectedNodeDetails(node);
  };

  const handleNodeDoubleClick = (node: NodeDetails) => {
    if (node.type === "address" || node.type === "contract") {
      const sanitized = sanitizeSearchInput(node.id || "");
      setSearchInput(sanitized);
      handleSearch(sanitized);
    } else if (node.type === "transaction" && node.hash) {
      const sanitized = sanitizeSearchInput(node.hash);
      setSearchInput(sanitized);
      handleSearch(sanitized);
    } else if (node.type === "block" && node.blockNumber !== undefined) {
      const sanitized = sanitizeSearchInput(node.blockNumber.toString());
      setSearchInput(sanitized);
      handleSearch(sanitized);
    }
  };

  const captureGraph = async () => {
    if (!graphRef.current) return;

    try {
      const dataUrl = await toPng(graphRef.current, { quality: 0.95 });

      const link = document.createElement("a");
      link.download = `chainhound-graph-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Error capturing graph:", error);
      setError("Failed to capture graph as image");
    }
  };

  const toggleAdvancedSearch = () => {
    setShowAdvancedSearch(!showAdvancedSearch);
  };

  const fetchBlockMeta = async (
    blockNum: string,
    setMeta: (meta: any) => void
  ) => {
    if (!web3 || !blockNum || isNaN(Number(blockNum))) {
      setMeta(null);
      return;
    }
    try {
      const block = await web3.eth.getBlock(Number(blockNum));
      if (block) setMeta({ timestamp: block.timestamp, number: block.number });
      else setMeta(null);
    } catch {
      setMeta(null);
    }
  };

  const handleSearchRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Input validation
    if (!/^[0-9]*$/.test(value) && value !== "") return;
    let num = value === "" ? "" : Math.max(0, Number(value));
    if (num !== "" && (isNaN(num) || num < 0)) return;
    setSearchRange((prev) => ({ ...prev, [name]: num }));
    setBlockRangeError(null);
    if (name === "startBlock") fetchBlockMeta(num, setStartBlockMeta);
    if (name === "endBlock") fetchBlockMeta(num, setEndBlockMeta);
  };

  useEffect(() => {
    if (searchRange.startBlock)
      fetchBlockMeta(searchRange.startBlock, setStartBlockMeta);
    if (searchRange.endBlock)
      fetchBlockMeta(searchRange.endBlock, setEndBlockMeta);
    // Validate block range
    const s = Number(searchRange.startBlock);
    const e = Number(searchRange.endBlock);
    if (
      searchRange.startBlock !== "" &&
      searchRange.endBlock !== "" &&
      (!isFinite(s) || !isFinite(e) || s < 0 || e < 0 || s >= e)
    ) {
      setBlockRangeError(
        "Start block must be less than end block, and both must be non-negative."
      );
    }
  }, [searchRange.startBlock, searchRange.endBlock, web3]);

  const validateBlockRange = async () => {
    if (!web3) return false;
    const latest = await web3.eth.getBlockNumber();
    const s = Number(searchRange.startBlock);
    const e = Number(searchRange.endBlock);
    if (isNaN(s) || isNaN(e) || s < 0 || e < 0 || s >= e || e > latest) {
      setBlockRangeError(
        `Block range must be between 0 and ${latest}, start < end, and both non-negative.`
      );
      return false;
    }
    setBlockRangeError(null);
    return true;
  };

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white p-6 rounded-lg shadow-md dark:bg-gray-800">
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-full">
            <div className="flex w-full">
              <input
                id="search-input"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={() => setShowSearchHistory(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
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
                  <div className="p-2 text-gray-500 dark:text-gray-400">
                    No search history
                  </div>
                ) : (
                  <ul>
                    {searchHistory.map((query, index) => (
                      <li
                        key={index}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer dark:hover:bg-gray-600"
                        onClick={() => {
                          const sanitized = sanitizeSearchInput(query);
                          setSearchInput(sanitized);
                          handleSearch(sanitized);
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
            <h3 className="text-sm font-medium mb-2">
              Advanced Search Options
            </h3>
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
                  min={0}
                />
                {startBlockMeta && startBlockMeta.timestamp && (
                  <div className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                    Block Timestamp: {formatTimestamp(startBlockMeta.timestamp)}
                  </div>
                )}
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
                  min={0}
                />
                {endBlockMeta && endBlockMeta.timestamp && (
                  <div className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                    Block Timestamp: {formatTimestamp(endBlockMeta.timestamp)}
                  </div>
                )}
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
              Specify a block range to search. For address searches, this limits
              the blocks scanned for transactions.
            </p>
            {blockRangeError && (
              <div className="text-xs text-red-600 mt-1 dark:text-red-400">
                {blockRangeError}
              </div>
            )}
          </div>
        )}
      </div>

      {searchProgress.status !== "idle" && (
        <div className="mt-2 p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center">
              {searchProgress.status === "searching" && (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-medium">Searching...</span>
                </>
              )}
              {searchProgress.status === "completed" && (
                <>
                  <CheckCircle className="h-4 w-4 mr-1 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium">Search completed</span>
                </>
              )}
              {searchProgress.status === "cancelled" && (
                <>
                  <StopCircle className="h-4 w-4 mr-1 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium">Search cancelled</span>
                </>
              )}
              {searchProgress.status === "error" && (
                <>
                  <AlertTriangle className="h-4 w-4 mr-1 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium">Search error</span>
                </>
              )}
            </div>

            {searchProgress.status === "searching" && (
              <button
                onClick={cancelSearch}
                className="text-red-600 hover:text-re d-800 text-sm flex items-center dark:text-red-400 dark:hover:text-red-300"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </button>
            )}
          </div>

          {searchProgress.status === "searching" && (
            <>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1 dark:bg-gray-600">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full dark:bg-indigo-500"
                  style={{
                    width: `${
                      searchProgress.blocksTotal > 0
                        ? Math.min(
                            100,
                            (searchProgress.blocksProcessed /
                              searchProgress.blocksTotal) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span>
                  {searchProgress.blocksProcessed.toLocaleString()} /{" "}
                  {searchProgress.blocksTotal.toLocaleString()} blocks
                </span>
                <span>
                  {searchProgress.transactionsFound.toLocaleString()}{" "}
                  transactions found
                </span>
              </div>
            </>
          )}

          {searchProgress.message && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {searchProgress.message}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded flex items-start dark:bg-red-900 dark:text-red-200">
          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {blockData && (
        <div className="mt-6">
          <div className="bg-gray-50 p-4 rounded-lg border dark:bg-gray-700 dark:border-gray-600">
            <div ref={graphRef} className="w-full h-[600px]">
              <BlockGraph
                data={blockData}
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
              />
            </div>
          </div>

          {selectedNodeDetails && (
            <div className="mt-4 p-4 bg-white rounded-lg border dark:bg-gray-800 dark:border-gray-600">
              <h3 className="text-lg font-medium mb-2">
                Selected Node Details
              </h3>
              <div className="space-y-2">
                <p>
                  <span className="font-medium">Type:</span>{" "}
                  {selectedNodeDetails.type}
                </p>
                {selectedNodeDetails.id && (
                  <p>
                    <span className="font-medium">ID:</span>{" "}
                    {selectedNodeDetails.id}
                  </p>
                )}
                {selectedNodeDetails.hash && (
                  <p>
                    <span className="font-medium">Hash:</span>{" "}
                    {selectedNodeDetails.hash}
                  </p>
                )}
                {selectedNodeDetails.blockNumber !== undefined && (
                  <p>
                    <span className="font-medium">Block Number:</span>{" "}
                    {selectedNodeDetails.blockNumber}
                  </p>
                )}
                {selectedNodeDetails.value && (
                  <p>
                    <span className="font-medium">Value:</span>{" "}
                    {selectedNodeDetails.value}
                  </p>
                )}
                {selectedNodeDetails.timestamp && (
                  <p>
                    <span className="font-medium">Timestamp:</span>{" "}
                    {formatTimestamp(selectedNodeDetails.timestamp)}
                  </p>
                )}
                {selectedNodeDetails.role && (
                  <p>
                    <span className="font-medium">Role:</span>{" "}
                    {selectedNodeDetails.role}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BlockExplorer;
