import React, { useState, useEffect, useRef, useCallback } from "react";
import { useWeb3Context } from "../contexts/Web3Context";
import BlockGraph from "../components/BlockGraph";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { safelyConvertBigIntToString } from "../utils/bigIntUtils";
import { blockCache } from "../services/BlockCache";

interface WatchedBlock {
  number: number;
  hash: string;
  timestamp: number;
  transactions: any[];
  data: any;
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

const BlockWatcher: React.FC = () => {
  const { web3 } = useWeb3Context();
  const [isWatching, setIsWatching] = useState(false);
  const [watchedBlocks, setWatchedBlocks] = useState<WatchedBlock[]>([]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(-1);
  const [latestBlockNumber, setLatestBlockNumber] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<NodeDetails | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentGraphData, setCurrentGraphData] = useState<any>(null);
  const watchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedBlockRef = useRef<number>(0);
  const graphRef = useRef<HTMLDivElement>(null);

  // Start watching for new blocks
  const startWatching = async () => {
    if (!web3) return;

    setIsWatching(true);
    setIsLoading(true);

    try {
      // Get current block number
      const currentBlock = await web3.eth.getBlockNumber();
      const currentBlockNumber = Number(currentBlock);
      setLatestBlockNumber(currentBlockNumber);
      lastProcessedBlockRef.current = currentBlockNumber;

      // Immediately fetch and display the current latest block
      await fetchAndAddBlock(currentBlockNumber);

      // Start watching for new blocks
      watchIntervalRef.current = setInterval(async () => {
        try {
          const newBlockNumber = await web3.eth.getBlockNumber();

          if (Number(newBlockNumber) > lastProcessedBlockRef.current) {
            // New blocks found
            for (
              let i = lastProcessedBlockRef.current + 1;
              i <= Number(newBlockNumber);
              i++
            ) {
              await fetchAndAddBlock(i);
            }
            lastProcessedBlockRef.current = Number(newBlockNumber);
            setLatestBlockNumber(Number(newBlockNumber));
          }
        } catch (error) {
          console.error("Error watching for new blocks:", error);
        }
      }, 1000); // Check every second
    } catch (error) {
      console.error("Error starting block watcher:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Stop watching
  const stopWatching = () => {
    setIsWatching(false);
    if (watchIntervalRef.current) {
      clearInterval(watchIntervalRef.current);
      watchIntervalRef.current = null;
    }
  };

  // Fetch and add a block to the watched list
  const fetchAndAddBlock = async (blockNumber: number) => {
    if (!web3) return;

    try {
      // First check if block is already in cache
      const cachedBlock = await blockCache.getBlock(blockNumber);

      let block;
      if (cachedBlock) {
        block = cachedBlock;
      } else {
        // Fetch from blockchain if not in cache
        const fetchedBlock = await web3.eth.getBlock(blockNumber, true);
        if (fetchedBlock) {
          // Safely convert BigInt values to strings
          const safeBlock = safelyConvertBigIntToString(fetchedBlock);
          // Cache the block
          await blockCache.cacheBlock(safeBlock);
          block = safeBlock;
        }
      }

      if (block && block.transactions && block.transactions.length > 0) {
        const watchedBlock: WatchedBlock = {
          number: Number(block.number),
          hash: block.hash,
          timestamp: Number(block.timestamp),
          transactions: block.transactions,
          data: null, // Not needed anymore, we construct it in getCurrentBlockData
        };

        setWatchedBlocks((prev) => {
          const newBlocks = [...prev, watchedBlock];
          // Keep only last 100 blocks to prevent memory issues
          if (newBlocks.length > 100) {
            return newBlocks.slice(-100);
          }
          return newBlocks;
        });

        // Auto-navigate to the latest block only if not paused
        if (!isPaused) {
          setCurrentBlockIndex((prev) => prev + 1);
        }
      }
    } catch (error) {
      console.error(`Error fetching block ${blockNumber}:`, error);
    }
  };

  // Navigate to previous block
  const goToPreviousBlock = () => {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex(currentBlockIndex - 1);
      setIsPaused(true); // Pause auto-navigation when manually navigating
    }
  };

  // Navigate to next block
  const goToNextBlock = () => {
    if (currentBlockIndex < watchedBlocks.length - 1) {
      setCurrentBlockIndex(currentBlockIndex + 1);
      setIsPaused(true); // Pause auto-navigation when manually navigating
    }
  };

  // Jump to first block
  const goToFirstBlock = () => {
    if (watchedBlocks.length > 0) {
      setCurrentBlockIndex(0);
      setIsPaused(true);
    }
  };

  // Jump to latest block
  const goToLatestBlock = () => {
    if (watchedBlocks.length > 0) {
      setCurrentBlockIndex(watchedBlocks.length - 1);
      setIsPaused(false); // Resume auto-navigation when jumping to latest
    }
  };

  // Resume auto-navigation
  const resumeAutoNavigation = () => {
    setIsPaused(false);
  };

  // Reset watcher
  const resetWatcher = () => {
    stopWatching();
    setWatchedBlocks([]);
    setCurrentBlockIndex(-1);
    lastProcessedBlockRef.current = 0;
  };

  // Node selection handlers
  const handleNodeClick = (node: any) => {
    setSelectedNodeDetails({
      type: node.type,
      id: node.id,
      hash: node.hash,
      blockNumber: node.blockNumber,
      value: node.value,
      timestamp: node.timestamp,
      role: node.role,
    });
  };

  const handleNodeDoubleClick = (node: any) => {
    // Handle double-click if needed (e.g., for tagging)
    console.log("Double-clicked node:", node);
  };



  // Update current graph data and selected node details when current block changes
  useEffect(() => {
    if (currentBlockIndex >= 0 && currentBlockIndex < watchedBlocks.length) {
      const watchedBlock = watchedBlocks[currentBlockIndex];
      
      // Update graph data
      setCurrentGraphData({
        type: "block",
        block: {
          number: watchedBlock.number,
          hash: watchedBlock.hash,
          timestamp: watchedBlock.timestamp,
          transactions: watchedBlock.transactions,
        },
      });
      
      // Update selected node details
      setSelectedNodeDetails({
        type: "block",
        id: watchedBlock.hash,
        hash: watchedBlock.hash,
        blockNumber: watchedBlock.number,
        timestamp: watchedBlock.timestamp,
        role: "current",
      });
    }
  }, [currentBlockIndex, watchedBlocks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
      }
    };
  }, []);

  const currentBlock =
    currentBlockIndex >= 0 ? watchedBlocks[currentBlockIndex] : null;

  return (
    <div className="flex-1 flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Block Watcher</h1>
            <p className="text-gray-400">Real-time blockchain monitoring</p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Status */}
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isWatching ? "bg-green-500" : "bg-gray-500"
                }`}
              ></div>
              <span className="text-sm">
                {isWatching ? "Watching" : "Stopped"}
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-2">
              {!isWatching ? (
                <button
                  onClick={startWatching}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  <span>Start Watching</span>
                </button>
              ) : (
                <button
                  onClick={stopWatching}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
                  <Pause className="h-4 w-4" />
                  <span>Stop Watching</span>
                </button>
              )}

              <button
                onClick={resetWatcher}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={goToFirstBlock}
              disabled={watchedBlocks.length === 0}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
              title="Go to first block"
            >
              <SkipBack className="h-4 w-4" />
              <span>First</span>
            </button>

            <button
              onClick={goToPreviousBlock}
              disabled={currentBlockIndex <= 0}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <button
              onClick={goToNextBlock}
              disabled={currentBlockIndex >= watchedBlocks.length - 1}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              onClick={goToLatestBlock}
              disabled={watchedBlocks.length === 0}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
              title="Go to latest block"
            >
              <span>Latest</span>
              <SkipForward className="h-4 w-4" />
            </button>

            {isPaused && (
              <button
                onClick={resumeAutoNavigation}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                title="Resume auto-navigation"
              >
                <Play className="h-4 w-4" />
                <span>Resume</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
              <span>{isPaused ? 'Paused' : 'Auto'}</span>
            </div>
            <span>Blocks: {watchedBlocks.length}</span>
            <span>Current: {currentBlockIndex + 1}</span>
            <span>Latest: {latestBlockNumber}</span>
          </div>
        </div>
      </div>

      {/* Current Block Info */}
      {currentBlock && (
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Block Number:</span>
              <span className="ml-2 font-mono">{currentBlock.number}</span>
            </div>
            <div>
              <span className="text-gray-400">Hash:</span>
              <span className="ml-2 font-mono text-xs">
                {currentBlock.hash}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Transactions:</span>
              <span className="ml-2">{currentBlock.transactions.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Timestamp:</span>
              <span className="ml-2">
                {new Date(currentBlock.timestamp * 1000).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Age:</span>
              <span className="ml-2">
                {Math.floor((Date.now() / 1000 - currentBlock.timestamp) / 60)}{" "}
                minutes ago
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Graph View */}
      {currentBlock && (
        <div className="flex-1 p-4">
          <div className="bg-gray-50 p-4 rounded-lg border dark:bg-gray-700 dark:border-gray-600">
            <div ref={graphRef} className="w-full h-[600px]">
                           <BlockGraph
               data={currentGraphData}
               onNodeClick={handleNodeClick}
               onNodeDoubleClick={handleNodeDoubleClick}
               showControls={true}
               showTags={true}
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
                    {new Date(selectedNodeDetails.timestamp * 1000).toLocaleString()}
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

export default BlockWatcher;
