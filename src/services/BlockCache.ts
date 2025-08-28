import { openDB, IDBPDatabase } from "idb";
import { safelyConvertBigIntToString } from "../utils/bigIntUtils";

interface Block {
  number: number;
  hash: string;
  transactions: any[];
  timestamp: number;
  [key: string]: any;
}

interface FetchResult {
  block: Block | null;
  blockNumber: number;
  error?: string;
}

class BlockCache {
  private dbPromise: Promise<IDBPDatabase>;
  private readonly DB_NAME = "chainhound-block-cache";
  private readonly STORE_NAME = "blocks";
  private readonly ERROR_STORE_NAME = "error-blocks";
  private readonly VERSION = 15; // Updated to match existing database version
  private isInitialized = false;
  private lastProcessedBlock: number | null = null;

  // Performance optimization settings
  private readonly DEFAULT_CONCURRENCY = 4; // Reduced from 8 to prevent overwhelming
  private readonly DEFAULT_BATCH_SIZE = 20; // Reduced from 50 to smaller batches
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor() {
    this.dbPromise = this.initDB();
  }

  private async initDB(): Promise<IDBPDatabase> {
    try {
      const db = await openDB(this.DB_NAME, this.VERSION, {
        upgrade(db, oldVersion, newVersion) {
          // Delete old stores to ensure clean upgrade
          if (db.objectStoreNames.contains("blocks")) {
            db.deleteObjectStore("blocks");
          }
          if (db.objectStoreNames.contains("error-blocks")) {
            db.deleteObjectStore("error-blocks");
          }

          // Create blocks store with proper indices
          const blockStore = db.createObjectStore("blocks", {
            keyPath: "number",
          });
          blockStore.createIndex("number", "number", { unique: true });
          blockStore.createIndex("timestamp", "timestamp");
          blockStore.createIndex("hash", "hash"); // Removed unique constraint to prevent hash conflicts

          // Create error-blocks store
          const errorStore = db.createObjectStore("error-blocks", {
            keyPath: "blockNumber",
          });
          errorStore.createIndex("blockNumber", "blockNumber", {
            unique: true,
          });
          errorStore.createIndex("timestamp", "timestamp");
          errorStore.createIndex("errorType", "errorType");
        },
      });
      this.isInitialized = true;
      return db;
    } catch (error) {
      console.error("Failed to initialize IndexedDB:", error);
      throw error;
    }
  }

  /**
   * Store a block in the cache
   */
  async cacheBlock(block: Block): Promise<void> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }

    try {
      if (!block || block.number === undefined || block.number === null) {
        console.warn("Attempted to cache invalid block:", block);
        return;
      }

      // Ensure block number is a number
      const blockNumber = Number(block.number);
      if (isNaN(blockNumber)) {
        console.warn("Invalid block number:", block.number);
        return;
      }

      const safeBlock = safelyConvertBigIntToString(block);
      // Ensure the safeBlock has the correct numeric block number
      safeBlock.number = blockNumber;

      const db = await this.dbPromise;
      const tx = db.transaction(this.STORE_NAME, "readwrite");

      // Check if block already exists and is newer
      const existingBlock = await tx.store.get(blockNumber);
      if (existingBlock) {
        // Only update if the new block has more data
        if (
          JSON.stringify(existingBlock).length >=
          JSON.stringify(safeBlock).length
        ) {
          console.log(
            `Block ${blockNumber} already cached with equal or more data, skipping...`
          );

          // Update last processed block even if we're skipping this block
          if (
            this.lastProcessedBlock === null ||
            blockNumber > this.lastProcessedBlock
          ) {
            this.lastProcessedBlock = blockNumber;
          }

          return;
        }
        console.log(`Updating cached block ${blockNumber} with new data...`);
      }

      try {
        await tx.store.put(safeBlock);
        await tx.done;

        // Update last processed block if this is the highest we've seen
        if (
          this.lastProcessedBlock === null ||
          blockNumber > this.lastProcessedBlock
        ) {
          this.lastProcessedBlock = blockNumber;
        }

        // Remove from error store if it exists
        await this.removeErrorBlock(blockNumber);

        console.log(`Cached block ${blockNumber}`);
      } catch (txError) {
        // Handle constraint violations gracefully
        if (txError instanceof Error && txError.name === 'ConstraintError') {
          console.warn(`Constraint violation when caching block ${blockNumber}, skipping...`);
          return;
        }
        throw txError;
      }
    } catch (error) {
      console.error("Failed to cache block:", error);
      // Don't throw the error, just log it to prevent search failures
      // throw error;
    }
  }

  /**
   * Store multiple blocks in the cache
   */
  async cacheBlocks(blocks: Block[]): Promise<void> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }

    try {
      const validBlocks = blocks.filter(
        (block) => block && block.number !== undefined && block.number !== null
      );

      if (validBlocks.length === 0) {
        console.warn("No valid blocks to cache");
        return;
      }

      const db = await this.dbPromise;
      const tx = db.transaction(this.STORE_NAME, "readwrite");

      // Process blocks in batches to avoid memory issues
      const batchSize = 100;
      for (let i = 0; i < validBlocks.length; i += batchSize) {
        const batch = validBlocks.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(async (block) => {
            try {
              const safeBlock = safelyConvertBigIntToString(block);
              // Ensure block number is numeric
              safeBlock.number = Number(block.number);
              return await tx.store.put(safeBlock);
            } catch (error) {
              console.warn(`Failed to cache block ${block.number}:`, error);
              return null;
            }
          })
        );
        
        // Log any failures
        const failures = results.filter(result => result.status === 'rejected');
        if (failures.length > 0) {
          console.warn(`Failed to cache ${failures.length} blocks in batch`);
        }
      }

      await tx.done;

      // Remove from error store
      await Promise.all(
        validBlocks.map((block) => this.removeErrorBlock(block.number))
      );

      console.log(`Cached ${validBlocks.length} blocks`);
    } catch (error) {
      console.error("Failed to cache blocks:", error);
      throw error;
    }
  }

  /**
   * Get cached block numbers in a range
   */
  async getCachedBlockNumbers(
    startBlock: number,
    endBlock: number
  ): Promise<number[]> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }

    try {
      if (
        startBlock === undefined ||
        endBlock === undefined ||
        startBlock === null ||
        endBlock === null ||
        isNaN(startBlock) ||
        isNaN(endBlock)
      ) {
        console.warn("Invalid block range:", startBlock, endBlock);
        return [];
      }

      const db = await this.dbPromise;
      const tx = db.transaction(this.STORE_NAME, "readonly");
      const index = tx.store.index("number");

      // Use numeric key range for proper comparison
      const range = IDBKeyRange.bound(startBlock, endBlock, false, false);

      // Get all block numbers in range using the index
      const blockNumbers: number[] = [];
      let cursor = await index.openCursor(range);
      while (cursor) {
        // Ensure we get the numeric block number
        const blockNumber = Number(cursor.value.number);
        if (!isNaN(blockNumber)) {
          blockNumbers.push(blockNumber);
        }
        cursor = await cursor.continue();
      }

      // Sort block numbers
      blockNumbers.sort((a, b) => a - b);

      console.log(
        `[BlockCache] Found ${blockNumbers.length} cached blocks in range ${startBlock}-${endBlock}`
      );

      return blockNumbers;
    } catch (error) {
      console.error("Failed to get cached block numbers:", error);
      return [];
    }
  }

  /**
   * Get a block from the cache
   */
  async getBlock(blockNumber: number): Promise<Block | undefined> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }

    try {
      if (
        blockNumber === undefined ||
        blockNumber === null ||
        isNaN(blockNumber)
      ) {
        console.warn("Invalid block number:", blockNumber);
        return undefined;
      }

      const db = await this.dbPromise;
      const tx = db.transaction(this.STORE_NAME, "readonly");
      const block = await tx.store.get(blockNumber);

      if (block) {
        console.log(`[BlockCache] Retrieved block ${blockNumber} from cache`);
      }

      return block;
    } catch (error) {
      console.error("Failed to get block from cache:", error);
      return undefined;
    }
  }

  /**
   * Get blocks in a range
   */
  async getBlocksInRange(
    startBlock: number,
    endBlock: number
  ): Promise<Block[]> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }

    try {
      if (
        startBlock === undefined ||
        endBlock === undefined ||
        startBlock === null ||
        endBlock === null ||
        isNaN(startBlock) ||
        isNaN(endBlock)
      ) {
        console.warn("Invalid block range:", startBlock, endBlock);
        return [];
      }

      const db = await this.dbPromise;
      const tx = db.transaction(this.STORE_NAME, "readonly");
      const index = tx.store.index("number");
      const range = IDBKeyRange.bound(startBlock, endBlock, false, false);

      const blocks = await index.getAll(range);

      // Sort blocks by number
      blocks.sort((a, b) => a.number - b.number);

      console.log(
        `[BlockCache] Retrieved ${blocks.length} blocks from cache in range ${startBlock}-${endBlock}`
      );

      return blocks;
    } catch (error) {
      console.error("Failed to get blocks from cache:", error);
      return [];
    }
  }

  /**
   * Search for blocks containing transactions with specific address
   */
  async searchBlocksForAddress(
    address: string,
    startBlock: number,
    endBlock: number
  ): Promise<{ blocks: Block[]; transactions: any[] }> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }

    try {
      const blocks = await this.getBlocksInRange(startBlock, endBlock);
      const relevantBlocks: Block[] = [];
      const allTransactions: any[] = [];

      for (const block of blocks) {
        if (block.transactions && Array.isArray(block.transactions)) {
          const relevantTxs = block.transactions.filter((tx: any) => {
            const from = tx.from?.toLowerCase();
            const to = tx.to?.toLowerCase();
            const searchAddress = address.toLowerCase();
            return from === searchAddress || to === searchAddress;
          });

          if (relevantTxs.length > 0) {
            relevantBlocks.push(block);
            const txsWithTimestamp = relevantTxs.map((tx: any) => ({
              ...tx,
              timestamp: block.timestamp,
              blockNumber: block.number,
            }));
            allTransactions.push(...txsWithTimestamp);
          }
        }
      }

      console.log(
        `[BlockCache] Found ${relevantBlocks.length} blocks with ${allTransactions.length} transactions for address ${address} in range ${startBlock}-${endBlock}`
      );

      return { blocks: relevantBlocks, transactions: allTransactions };
    } catch (error) {
      console.error("Failed to search blocks for address:", error);
      return { blocks: [], transactions: [] };
    }
  }

  /**
   * Get the next block range to fetch
   * Returns [startBlock, endBlock] tuple
   */
  async getNextBlockRange(
    currentBlock: number,
    maxBlocks: number
  ): Promise<[number, number]> {
    // If we have a last processed block, start from there
    const startBlock = this.lastProcessedBlock
      ? this.lastProcessedBlock + 1
      : currentBlock - maxBlocks;
    const endBlock = startBlock + maxBlocks - 1;

    return [startBlock, endBlock];
  }

  /**
   * Record a block that failed to fetch
   */
  async recordErrorBlock(
    blockNumber: number,
    errorType: string,
    errorMessage: string
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }

    try {
      if (
        blockNumber === undefined ||
        blockNumber === null ||
        isNaN(blockNumber)
      ) {
        console.warn("Invalid block number for error record:", blockNumber);
        return;
      }

      const db = await this.dbPromise;
      const tx = db.transaction(this.ERROR_STORE_NAME, "readwrite");
      await tx.store.put({
        blockNumber,
        errorType,
        errorMessage,
        timestamp: Date.now(),
        retryCount: 0,
      });
      await tx.done;

      console.log(`Recorded error for block ${blockNumber}: ${errorType}`);
    } catch (error) {
      console.error("Failed to record error block:", error);
    }
  }

  /**
   * Get error blocks in a range
   */
  async getErrorBlocksInRange(
    startBlock: number,
    endBlock: number
  ): Promise<any[]> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }

    try {
      if (
        startBlock === undefined ||
        endBlock === undefined ||
        startBlock === null ||
        endBlock === null ||
        isNaN(startBlock) ||
        isNaN(endBlock)
      ) {
        console.warn(
          "Invalid block range for error blocks:",
          startBlock,
          endBlock
        );
        return [];
      }

      const db = await this.dbPromise;
      const range = IDBKeyRange.bound(startBlock, endBlock);
      const errorBlocks = await db.getAll(this.ERROR_STORE_NAME, range);

      console.log(
        `Found ${errorBlocks.length} error blocks in range ${startBlock}-${endBlock}`
      );
      return errorBlocks;
    } catch (error) {
      console.error("Failed to get error blocks:", error);
      return [];
    }
  }

  /**
   * Remove a block from the error store
   */
  async removeErrorBlock(blockNumber: number): Promise<void> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }

    try {
      if (
        blockNumber === undefined ||
        blockNumber === null ||
        isNaN(blockNumber)
      ) {
        return;
      }

      const db = await this.dbPromise;
      const tx = db.transaction(this.ERROR_STORE_NAME, "readwrite");
      await tx.store.delete(blockNumber);
      await tx.done;
    } catch (error) {
      // Silently handle errors for this non-critical operation
    }
  }

  /**
   * Clear all error blocks
   */
  async clearErrorBlocks(): Promise<void> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }

    try {
      const db = await this.dbPromise;
      const tx = db.transaction(this.ERROR_STORE_NAME, "readwrite");
      await tx.store.clear();
      await tx.done;
      console.log("Cleared all error blocks");
    } catch (error) {
      console.error("Failed to clear error blocks:", error);
      throw error;
    }
  }

  /**
   * Clear all cached blocks (nuclear option for corrupted cache)
   */
  async clearAllBlocks(): Promise<void> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }

    try {
      const db = await this.dbPromise;
      const tx = db.transaction(this.STORE_NAME, "readwrite");
      await tx.store.clear();
      await tx.done;
      console.log("Cleared all cached blocks");
    } catch (error) {
      console.error("Failed to clear cached blocks:", error);
    }
  }

  /**
   * Reset the entire cache (blocks + errors)
   */
  async resetCache(): Promise<void> {
    await this.clearAllBlocks();
    await this.clearErrorBlocks();
    this.lastProcessedBlock = null;
    console.log("Cache reset complete");
  }

  /**
   * Clear the entire cache
   */
  async clearCache(): Promise<void> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }

    try {
      const db = await this.dbPromise;
      const tx1 = db.transaction(this.STORE_NAME, "readwrite");
      const tx2 = db.transaction(this.ERROR_STORE_NAME, "readwrite");

      await Promise.all([
        tx1.store.clear(),
        tx2.store.clear(),
        tx1.done,
        tx2.done,
      ]);

      console.log("Cleared entire cache");
    } catch (error) {
      console.error("Failed to clear cache:", error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalBlocks: number;
    oldestBlock?: number;
    newestBlock?: number;
    sizeEstimate: string;
    oldestTimestamp?: Date;
    newestTimestamp?: Date;
    errorBlocks: number;
  }> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }

    try {
      const db = await this.dbPromise;
      const tx = db.transaction(
        [this.STORE_NAME, this.ERROR_STORE_NAME],
        "readonly"
      );

      const [blockCount, errorCount] = await Promise.all([
        tx.objectStore(this.STORE_NAME).count(),
        tx.objectStore(this.ERROR_STORE_NAME).count(),
      ]);

      // Get block range
      const blockStore = tx.objectStore(this.STORE_NAME);
      const [firstCursor, lastCursor] = await Promise.all([
        blockStore.openCursor(),
        blockStore.openCursor(null, "prev"),
      ]);

      const oldestBlock = firstCursor?.value;
      const newestBlock = lastCursor?.value;

      // Estimate size (rough approximation)
      const sizeInBytes = blockCount * 50 * 1024; // Assume 50KB per block
      const sizeEstimate = this.formatBytes(sizeInBytes);

      await tx.done;

      return {
        totalBlocks: blockCount,
        oldestBlock: oldestBlock?.number,
        newestBlock: newestBlock?.number,
        sizeEstimate,
        oldestTimestamp: oldestBlock?.timestamp
          ? new Date(oldestBlock.timestamp * 1000)
          : undefined,
        newestTimestamp: newestBlock?.timestamp
          ? new Date(newestBlock.timestamp * 1000)
          : undefined,
        errorBlocks: errorCount,
      };
    } catch (error) {
      console.error("Failed to get cache stats:", error);
      return {
        totalBlocks: 0,
        sizeEstimate: "0 B",
        errorBlocks: 0,
      };
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // Returns all cached blocks as an array
  async getAllBlocks() {
    const allBlocks = [];
    const keys = await this.db.keys();
    for (const key of keys) {
      if (key.startsWith("block:")) {
        const block = await this.db.get(key);
        if (block) allBlocks.push(block);
      }
    }
    return allBlocks;
  }

  /**
   * Fetch multiple blocks in parallel with configurable concurrency
   */
  async fetchBlocksParallel(
    blockNumbers: number[],
    web3: any,
    concurrency: number = this.DEFAULT_CONCURRENCY,
    onProgress?: (processed: number, total: number) => void
  ): Promise<Block[]> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }

    const results: Block[] = [];
    let processed = 0;
    const total = blockNumbers.length;

    // Process blocks in chunks based on concurrency
    for (let i = 0; i < blockNumbers.length; i += concurrency) {
      const chunk = blockNumbers.slice(i, i + concurrency);

      // Fetch blocks in parallel within this chunk
      const chunkPromises = chunk.map(async (blockNumber) => {
        return this.fetchBlockWithRetry(blockNumber, web3);
      });

      const chunkResults = await Promise.all(chunkPromises);

      // Process successful results
      for (const result of chunkResults) {
        if (result.block) {
          results.push(result.block);
          try {
            await this.cacheBlock(result.block);
          } catch (cacheError) {
            console.warn(`Failed to cache block ${result.blockNumber}:`, cacheError);
            // Continue processing other blocks even if caching fails
          }
        } else if (result.error) {
          await this.recordErrorBlock(
            result.blockNumber,
            "fetch_error",
            result.error
          );
        }
      }

      processed += chunk.length;
      if (onProgress) {
        onProgress(processed, total);
      }
    }

    console.log(
      `[BlockCache] Fetched ${results.length} blocks out of ${total} requested`
    );
    return results;
  }

  /**
   * Fetch a single block with retry logic
   */
  private async fetchBlockWithRetry(
    blockNumber: number,
    web3: any,
    retries: number = this.MAX_RETRIES
  ): Promise<FetchResult> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Check cache first
        const cachedBlock = await this.getBlock(blockNumber);
        if (cachedBlock) {
          return { block: cachedBlock, blockNumber };
        }

        // Fetch from network
        const block = await web3.eth.getBlock(blockNumber, true);
        if (block) {
          const safeBlock = safelyConvertBigIntToString(block) as Block;
          return { block: safeBlock, blockNumber };
        } else {
          return { block: null, blockNumber, error: "Block not found" };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.warn(
          `[BlockCache] Attempt ${attempt} failed for block ${blockNumber}: ${errorMessage}`
        );

        if (attempt === retries) {
          return { block: null, blockNumber, error: errorMessage };
        }

        // Wait before retry with exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, this.RETRY_DELAY * attempt)
        );
      }
    }

    return { block: null, blockNumber, error: "Max retries exceeded" };
  }

  /**
   * Fetch blocks in optimized batches with smart caching
   */
  async fetchBlocksOptimized(
    blockNumbers: number[],
    web3: any,
    options: {
      concurrency?: number;
      batchSize?: number;
      timeout?: number;
      onProgress?: (
        processed: number,
        total: number,
        cached: number,
        fetched: number
      ) => void;
    } = {}
  ): Promise<{
    blocks: Block[];
    cached: number;
    fetched: number;
    errors: number;
  }> {
    const concurrency = options.concurrency || this.DEFAULT_CONCURRENCY;
    const batchSize = options.batchSize || this.DEFAULT_BATCH_SIZE;
    const timeout = options.timeout || 30000; // 30 second timeout

    let cached = 0;
    let fetched = 0;
    let errors = 0;
    const blocks: Block[] = [];

    // Add timeout protection
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Block fetching timeout')), timeout);
    });

    // First, check cache for all blocks
    const cachePromises = blockNumbers.map(async (blockNumber) => {
      const cachedBlock = await this.getBlock(blockNumber);
      return { blockNumber, cachedBlock };
    });

    const cacheResults = await Promise.all(cachePromises);
    const uncachedBlocks: number[] = [];

    for (const result of cacheResults) {
      if (result.cachedBlock) {
        blocks.push(result.cachedBlock);
        cached++;
      } else {
        uncachedBlocks.push(result.blockNumber);
      }
    }

    // Fetch uncached blocks in parallel batches
    if (uncachedBlocks.length > 0) {
      try {
        for (let i = 0; i < uncachedBlocks.length; i += batchSize) {
          const batch = uncachedBlocks.slice(i, i + batchSize);
          
          // Race between timeout and batch fetch
          const batchPromise = this.fetchBlocksParallel(
            batch,
            web3,
            concurrency
          );
          
          const batchResults = await Promise.race([batchPromise, timeoutPromise]);

          blocks.push(...batchResults);
          fetched += batchResults.length;
          errors += batch.length - batchResults.length;

          if (options.onProgress) {
            options.onProgress(
              i + batch.length,
              blockNumbers.length,
              cached,
              fetched
            );
          }
        }
      } catch (error) {
        console.error('[BlockCache] Timeout or error during batch fetching:', error);
        // Continue with what we have so far
      }
    }

    // Sort blocks by block number
    blocks.sort((a, b) => a.number - b.number);

    console.log(
      `[BlockCache] Optimized fetch complete: ${cached} cached, ${fetched} fetched, ${errors} errors`
    );
    return { blocks, cached, fetched, errors };
  }
}

// Export singleton instance
export const blockCache = new BlockCache();
