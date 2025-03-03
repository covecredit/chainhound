import { openDB, IDBPDatabase } from 'idb';

interface Block {
  number: number;
  hash: string;
  transactions: any[];
  timestamp: number;
  [key: string]: any;
}

class BlockCache {
  private dbPromise: Promise<IDBPDatabase>;
  private readonly DB_NAME = 'chainhound-block-cache';
  private readonly STORE_NAME = 'blocks';
  private readonly ERROR_STORE_NAME = 'error-blocks';
  private readonly VERSION = 2;
  private isInitialized = false;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private async initDB(): Promise<IDBPDatabase> {
    try {
      const db = await openDB(this.DB_NAME, this.VERSION, {
        upgrade(db, oldVersion, newVersion) {
          // Create blocks store if it doesn't exist
          if (!db.objectStoreNames.contains('blocks')) {
            const store = db.createObjectStore('blocks', {
              keyPath: 'number'
            });
            // Create an index on the timestamp
            store.createIndex('timestamp', 'timestamp');
          }
          
          // Create error-blocks store if it doesn't exist (added in version 2)
          if (!db.objectStoreNames.contains('error-blocks') && oldVersion < 2) {
            const errorStore = db.createObjectStore('error-blocks', {
              keyPath: 'blockNumber'
            });
            errorStore.createIndex('timestamp', 'timestamp');
            errorStore.createIndex('errorType', 'errorType');
          }
        }
      });
      this.isInitialized = true;
      return db;
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
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
      // Validate block has a number property
      if (block.number === undefined || block.number === null) {
        console.warn('Attempted to cache block without a valid number property');
        return;
      }
      
      // Convert any BigInt values to strings before storing
      const safeBlock = this.convertBigIntToString(block);
      
      const db = await this.dbPromise;
      await db.put(this.STORE_NAME, safeBlock);
      
      // If this block was previously in the error store, remove it
      try {
        await this.removeErrorBlock(block.number);
      } catch (e) {
        // Silently ignore errors if the block wasn't in the error store
      }
    } catch (error) {
      console.error('Failed to cache block:', error);
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
      const db = await this.dbPromise;
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      
      const validBlocks = blocks.filter(block => 
        block.number !== undefined && block.number !== null
      );
      
      if (validBlocks.length !== blocks.length) {
        console.warn(`Filtered out ${blocks.length - validBlocks.length} blocks with invalid number property`);
      }
      
      await Promise.all([
        ...validBlocks.map(block => {
          // Convert any BigInt values to strings before storing
          const safeBlock = this.convertBigIntToString(block);
          return tx.store.put(safeBlock);
        }),
        tx.done
      ]);
      
      // Remove these blocks from the error store if they exist
      for (const block of validBlocks) {
        try {
          await this.removeErrorBlock(block.number);
        } catch (e) {
          // Silently ignore errors if the block wasn't in the error store
        }
      }
    } catch (error) {
      console.error('Failed to cache blocks:', error);
    }
  }

  /**
   * Record a block that failed to fetch
   */
  async recordErrorBlock(blockNumber: number, errorType: string, errorMessage: string): Promise<void> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }
    
    try {
      // Validate blockNumber
      if (blockNumber === undefined || blockNumber === null || isNaN(blockNumber)) {
        console.warn('Attempted to record error block with invalid blockNumber:', blockNumber);
        return;
      }
      
      const db = await this.dbPromise;
      await db.put(this.ERROR_STORE_NAME, {
        blockNumber,
        errorType,
        errorMessage,
        timestamp: Date.now(),
        retryCount: 0
      });
    } catch (error) {
      console.error('Failed to record error block:', error);
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
      if (blockNumber === undefined || blockNumber === null || isNaN(blockNumber)) {
        // Just return silently instead of warning to avoid console spam
        return;
      }
      
      const db = await this.dbPromise;
      
      // Check if the error block exists before trying to delete it
      try {
        const errorBlock = await db.get(this.ERROR_STORE_NAME, blockNumber);
        if (errorBlock) {
          await db.delete(this.ERROR_STORE_NAME, blockNumber);
        }
      } catch (getError) {
        // If there's an error getting the block, don't try to delete it
        // This prevents the "Failed to remove error block" errors
        return;
      }
    } catch (error) {
      // Silently handle errors to prevent console spam
      // This is a non-critical operation
    }
  }

  /**
   * Get all error blocks
   */
  async getErrorBlocks(): Promise<any[]> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }
    
    try {
      const db = await this.dbPromise;
      return await db.getAll(this.ERROR_STORE_NAME);
    } catch (error) {
      console.error('Failed to get error blocks:', error);
      return [];
    }
  }

  /**
   * Get error blocks in a specific range
   */
  async getErrorBlocksInRange(startBlock: number, endBlock: number): Promise<any[]> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }
    
    try {
      // Validate input
      if (startBlock === undefined || endBlock === undefined || 
          startBlock === null || endBlock === null ||
          isNaN(startBlock) || isNaN(endBlock)) {
        console.warn('Invalid range for getErrorBlocksInRange:', startBlock, endBlock);
        return [];
      }
      
      const db = await this.dbPromise;
      const range = IDBKeyRange.bound(startBlock, endBlock);
      return await db.getAll(this.ERROR_STORE_NAME, range);
    } catch (error) {
      console.error('Failed to get error blocks in range:', error);
      return [];
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
      await db.clear(this.ERROR_STORE_NAME);
    } catch (error) {
      console.error('Failed to clear error blocks:', error);
    }
  }

  /**
   * Get a block from the cache by block number
   */
  async getBlock(blockNumber: number): Promise<Block | undefined> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }
    
    try {
      // Validate blockNumber
      if (blockNumber === undefined || blockNumber === null || isNaN(blockNumber)) {
        console.warn('Attempted to get block with invalid blockNumber:', blockNumber);
        return undefined;
      }
      
      const db = await this.dbPromise;
      return await db.get(this.STORE_NAME, blockNumber);
    } catch (error) {
      console.error('Failed to get block from cache:', error);
      return undefined;
    }
  }

  /**
   * Get multiple blocks from the cache by block number range
   */
  async getBlocksInRange(startBlock: number, endBlock: number): Promise<Block[]> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }
    
    try {
      // Validate input
      if (startBlock === undefined || endBlock === undefined || 
          startBlock === null || endBlock === null ||
          isNaN(startBlock) || isNaN(endBlock)) {
        console.warn('Invalid range for getBlocksInRange:', startBlock, endBlock);
        return [];
      }
      
      const db = await this.dbPromise;
      const range = IDBKeyRange.bound(startBlock, endBlock);
      return await db.getAll(this.STORE_NAME, range);
    } catch (error) {
      console.error('Failed to get blocks from cache:', error);
      return [];
    }
  }

  /**
   * Get all blocks from the cache
   */
  async getAllBlocks(): Promise<Block[]> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }
    
    try {
      const db = await this.dbPromise;
      return await db.getAll(this.STORE_NAME);
    } catch (error) {
      console.error('Failed to get all blocks from cache:', error);
      return [];
    }
  }

  /**
   * Check which blocks in a range are already cached
   * Returns an array of block numbers that are cached
   */
  async getCachedBlockNumbers(startBlock: number, endBlock: number): Promise<number[]> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }
    
    try {
      // Validate input
      if (startBlock === undefined || endBlock === undefined || 
          startBlock === null || endBlock === null ||
          isNaN(startBlock) || isNaN(endBlock)) {
        console.warn('Invalid range for getCachedBlockNumbers:', startBlock, endBlock);
        return [];
      }
      
      const db = await this.dbPromise;
      const range = IDBKeyRange.bound(startBlock, endBlock);
      const keys = await db.getAllKeys(this.STORE_NAME, range);
      return keys as number[];
    } catch (error) {
      console.error('Failed to get cached block numbers:', error);
      return [];
    }
  }

  /**
   * Get the highest block number in the cache
   */
  async getHighestBlockNumber(): Promise<number | undefined> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }
    
    try {
      const db = await this.dbPromise;
      // Open a cursor to the blocks store, sorted in descending order
      const cursor = await db.transaction(this.STORE_NAME)
        .store.openCursor(null, 'prev');
      
      // The first record will be the highest block number
      if (cursor) {
        return cursor.key as number;
      }
      return undefined;
    } catch (error) {
      console.error('Failed to get highest block number:', error);
      return undefined;
    }
  }

  /**
   * Get the lowest block number in the cache
   */
  async getLowestBlockNumber(): Promise<number | undefined> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }
    
    try {
      const db = await this.dbPromise;
      // Open a cursor to the blocks store, sorted in ascending order
      const cursor = await db.transaction(this.STORE_NAME)
        .store.openCursor();
      
      // The first record will be the lowest block number
      if (cursor) {
        return cursor.key as number;
      }
      return undefined;
    } catch (error) {
      console.error('Failed to get lowest block number:', error);
      return undefined;
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
      const count = await db.count(this.STORE_NAME);
      const lowest = await this.getLowestBlockNumber();
      const highest = await this.getHighestBlockNumber();
      const errorCount = await db.count(this.ERROR_STORE_NAME);
      
      // Get timestamps for oldest and newest blocks
      let oldestTimestamp: Date | undefined;
      let newestTimestamp: Date | undefined;
      
      if (lowest !== undefined) {
        const oldestBlock = await this.getBlock(lowest);
        if (oldestBlock && oldestBlock.timestamp) {
          oldestTimestamp = new Date(oldestBlock.timestamp * 1000); // Convert from Unix timestamp
        }
      }
      
      if (highest !== undefined) {
        const newestBlock = await this.getBlock(highest);
        if (newestBlock && newestBlock.timestamp) {
          newestTimestamp = new Date(newestBlock.timestamp * 1000); // Convert from Unix timestamp
        }
      }
      
      // Estimate size (very rough approximation)
      // Assuming average block size of 50KB
      const sizeInBytes = count * 50 * 1024;
      const sizeEstimate = this.formatBytes(sizeInBytes);
      
      return {
        totalBlocks: count,
        oldestBlock: lowest,
        newestBlock: highest,
        sizeEstimate,
        oldestTimestamp,
        newestTimestamp,
        errorBlocks: errorCount
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalBlocks: 0,
        sizeEstimate: '0 B',
        errorBlocks: 0
      };
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
      await db.clear(this.STORE_NAME);
      await db.clear(this.ERROR_STORE_NAME);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Clear blocks older than a certain timestamp
   */
  async clearOldBlocks(olderThanTimestamp: number): Promise<void> {
    if (!this.isInitialized) {
      await this.dbPromise;
    }
    
    try {
      const db = await this.dbPromise;
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const index = tx.store.index('timestamp');
      const range = IDBKeyRange.upperBound(olderThanTimestamp);
      
      let cursor = await index.openCursor(range);
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      
      await tx.done;
    } catch (error) {
      console.error('Failed to clear old blocks:', error);
    }
  }

  /**
   * Format bytes to a human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Convert BigInt values in an object to strings
   */
  private convertBigIntToString(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'bigint') {
      return obj.toString();
    }
    
    if (typeof obj === 'object') {
      if (Array.isArray(obj)) {
        return obj.map(item => this.convertBigIntToString(item));
      }
      
      const result: Record<string, any> = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          result[key] = this.convertBigIntToString(obj[key]);
        }
      }
      return result;
    }
    
    return obj;
  }
}

// Export a singleton instance
export const blockCache = new BlockCache();