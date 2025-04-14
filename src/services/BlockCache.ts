import { openDB, IDBPDatabase } from "idb";
import { safelyConvertBigIntToString } from "../utils/bigIntUtils";

interface Block {
  number: number;
  hash: string;
  transactions: any[];
  timestamp: number;
  [key: string]: any;
}

class BlockCache {
  private dbPromise: Promise<IDBPDatabase>;
  private readonly DB_NAME = "chainhound-block-cache";
  private readonly STORE_NAME = "blocks";
  private readonly ERROR_STORE_NAME = "error-blocks";
  private readonly VERSION = 15; // Updated to match existing database version
  private isInitialized = false;
  private lastProcessedBlock: number | null = null;

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
          blockStore.createIndex("hash", "hash", { unique: true });

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

      const safeBlock = safelyConvertBigIntToString(block);

      const db = await this.dbPromise;
      const tx = db.transaction(this.STORE_NAME, "readwrite");

      // Check if block already exists and is newer
      const existingBlock = await tx.store.get(block.number);
      if (existingBlock) {
        // Only update if the new block has more data
        if (
          JSON.stringify(existingBlock).length >=
          JSON.stringify(safeBlock).length
        ) {
          console.log(
            `Block ${block.number} already cached with equal or more data, skipping...`
          );

          // Update last processed block even if we're skipping this block
          if (
            this.lastProcessedBlock === null ||
            block.number > this.lastProcessedBlock
          ) {
            this.lastProcessedBlock = block.number;
          }

          return;
        }
        console.log(`Updating cached block ${block.number} with new data...`);
      }

      await tx.store.put(safeBlock);
      await tx.done;

      // Update last processed block if this is the highest we've seen
      if (
        this.lastProcessedBlock === null ||
        block.number > this.lastProcessedBlock
      ) {
        this.lastProcessedBlock = block.number;
      }

      // Remove from error store if it exists
      await this.removeErrorBlock(block.number);

      console.log(`Cached block ${block.number}`);
    } catch (error) {
      console.error("Failed to cache block:", error);
      throw error;
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
        await Promise.all(
          batch.map((block) => {
            const safeBlock = safelyConvertBigIntToString(block);
            return tx.store.put(safeBlock);
          })
        );
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
      // Convert to string for key range if keys are stored as strings
      const startKey = String(startBlock);
      const endKey = String(endBlock);
      const range = IDBKeyRange.bound(startKey, endKey);

      // Try to get all block numbers in range using the index
      const blockNumbers: number[] = [];
      let cursor = await index.openCursor(range);
      while (cursor) {
        // Convert to number for return value
        blockNumbers.push(Number(cursor.value.number));
        cursor = await cursor.continue();
      }

      // Debug: print all keys in the store
      const allKeys = await tx.store.getAllKeys();
      console.log(`[BlockCache Debug] All block keys in store:`, allKeys);
      if (blockNumbers.length === 0 && allKeys.length > 0) {
        // Fallback: iterate all blocks and filter by number (string compare)
        const allBlocks = await tx.store.getAll();
        const filtered = allBlocks
          .filter(
            (b) =>
              typeof b.number !== "undefined" &&
              String(b.number) >= startKey &&
              String(b.number) <= endKey
          )
          .map((b) => Number(b.number));
        console.log(
          `[BlockCache Debug] Fallback found ${filtered.length} blocks in range ${startBlock}-${endBlock}`
        );
        filtered.sort((a, b) => a - b);
        return filtered;
      }

      // Sort block numbers
      blockNumbers.sort((a, b) => a - b);

      console.log(
        `Found ${blockNumbers.length} cached blocks in range ${startBlock}-${endBlock}`
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
        console.log(`Retrieved block ${blockNumber} from cache`);
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
      const range = IDBKeyRange.bound(startBlock, endBlock);

      const blocks = await index.getAll(range);

      // Sort blocks by number
      blocks.sort((a, b) => a.number - b.number);

      console.log(
        `Retrieved ${blocks.length} blocks from cache in range ${startBlock}-${endBlock}`
      );

      return blocks;
    } catch (error) {
      console.error("Failed to get blocks from cache:", error);
      return [];
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
}

// Export singleton instance
export const blockCache = new BlockCache();
