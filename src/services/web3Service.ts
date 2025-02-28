import Web3 from 'web3';
import { ethers } from 'ethers';
import { Transaction, CrossChainAddress } from '../types/transaction';
import { EventLog } from '../types/event';
import axios from 'axios';

// ABI fragment for common events
const COMMON_EVENT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "spender",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "amount0In",
        "type": "uint256"
      },
      {
        "indexed": false,
        "name": "amount1In",
        "type": "uint256"
      },
      {
        "indexed": false,
        "name": "amount0Out",
        "type": "uint256"
      },
      {
        "indexed": false,
        "name": "amount1Out",
        "type": "uint256"
      },
      {
        "indexed": true,
        "name": "to",
        "type": "address"
      }
    ],
    "name": "Swap",
    "type": "event"
  }
];

// Chain configuration
const CHAIN_CONFIG = {
  ethereum: {
    name: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
    symbol: 'ETH',
    decimals: 18
  },
  bsc: {
    name: 'Binance Smart Chain',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorer: 'https://bscscan.com',
    symbol: 'BNB',
    decimals: 18
  },
  polygon: {
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    symbol: 'MATIC',
    decimals: 18
  },
  arbitrum: {
    name: 'Arbitrum',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    symbol: 'ETH',
    decimals: 18
  },
  optimism: {
    name: 'Optimism',
    rpcUrl: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    symbol: 'ETH',
    decimals: 18
  },
  avalanche: {
    name: 'Avalanche',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorer: 'https://snowtrace.io',
    symbol: 'AVAX',
    decimals: 18
  },
  fantom: {
    name: 'Fantom',
    rpcUrl: 'https://rpc.ftm.tools',
    explorer: 'https://ftmscan.com',
    symbol: 'FTM',
    decimals: 18
  },
  harmony: {
    name: 'Harmony',
    rpcUrl: 'https://api.harmony.one',
    explorer: 'https://explorer.harmony.one',
    symbol: 'ONE',
    decimals: 18
  },
  cronos: {
    name: 'Cronos',
    rpcUrl: 'https://evm.cronos.org',
    explorer: 'https://cronoscan.com',
    symbol: 'CRO',
    decimals: 18
  },
  moonbeam: {
    name: 'Moonbeam',
    rpcUrl: 'https://rpc.api.moonbeam.network',
    explorer: 'https://moonbeam.moonscan.io',
    symbol: 'GLMR',
    decimals: 18
  }
};

// Bridge contracts for cross-chain tracking
const BRIDGE_CONTRACTS = {
  ethereum: [
    '0x3ee18B2214AFF97000D974cf647E7C347E8fa585', // Wormhole
    '0xf92cD566Ea4864356C5491c177A430C222d7e678', // Arbitrum Bridge
    '0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1', // Optimism Bridge
    '0xa0c68c638235ee32657e8f720a23cec1bfc77c77',  // Polygon Bridge
    '0x8f5b1b6c96aa70e94d0e0956b894beac27b41d08'   // Avalanche Bridge
  ],
  bsc: [
    '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B', // Wormhole
    '0x0000000000000000000000000000000000001004'  // BSC Bridge
  ],
  polygon: [
    '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', // Polygon Bridge
    '0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE'  // Polygon PoS Bridge
  ],
  arbitrum: [
    '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f', // Arbitrum Bridge
    '0x8315177aB297bA92A06054cE80a67Ed4DBd7ed3a'  // Arbitrum Gateway
  ],
  avalanche: [
    '0xE78388b4CE79068e89Bf8aA7f218eF6b9AB0e9d0', // Avalanche Bridge
    '0x8EB8a3b98659Cce290402893d0123abb75E3ab28'  // Avalanche-Ethereum Bridge
  ]
};

// Known cross-chain addresses (same entity on different chains)
const CROSS_CHAIN_ADDRESSES = {
  '0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516': {
    ethereum: '0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516',
    bsc: '0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516',
    polygon: '0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516',
    arbitrum: '0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516'
  },
  '0x0fa09c3a328792253f8dee7116848723b72a6d2e': {
    ethereum: '0x0fa09c3a328792253f8dee7116848723b72a6d2e',
    bsc: '0x0fa09c3a328792253f8dee7116848723b72a6d2e',
    polygon: '0x0fa09c3a328792253f8dee7116848723b72a6d2e'
  }
};

class Web3Service {
  private web3Instances: Record<string, Web3>;
  private ethersProviders: Record<string, ethers.JsonRpcProvider>;
  
  constructor(provider?: string) {
    this.web3Instances = {};
    this.ethersProviders = {};
    
    try {
      // Initialize providers for all supported chains
      Object.entries(CHAIN_CONFIG).forEach(([chain, config]) => {
        try {
          this.web3Instances[chain] = new Web3(config.rpcUrl);
          this.ethersProviders[chain] = new ethers.JsonRpcProvider(config.rpcUrl);
        } catch (error) {
          console.warn(`Error initializing ${chain} provider, using fallback:`, error);
          // Fallback to a dummy provider that will return sample data
          this.web3Instances[chain] = new Web3('http://localhost:8545');
          this.ethersProviders[chain] = new ethers.JsonRpcProvider('http://localhost:8545');
        }
      });
      
      // Set default provider if provided
      if (provider) {
        this.web3Instances.ethereum = new Web3(provider);
        this.ethersProviders.ethereum = new ethers.JsonRpcProvider(provider);
      }
    } catch (error) {
      console.warn("Error initializing Web3Service, using fallback:", error);
      // Fallback to a dummy provider that will return sample data
      this.web3Instances.ethereum = new Web3('http://localhost:8545');
      this.ethersProviders.ethereum = new ethers.JsonRpcProvider('http://localhost:8545');
    }
  }

  // Set a new provider for a specific chain
  setProvider(provider: string, chain: string = 'ethereum'): void {
    try {
      this.web3Instances[chain] = new Web3(provider);
      this.ethersProviders[chain] = new ethers.JsonRpcProvider(provider);
    } catch (error) {
      console.warn(`Error setting provider for ${chain}, using fallback:`, error);
      // Fallback to a dummy provider
      this.web3Instances[chain] = new Web3('http://localhost:8545');
      this.ethersProviders[chain] = new ethers.JsonRpcProvider('http://localhost:8545');
    }
  }

  // Get chain configuration
  getChainConfig(chain: string): any {
    return CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG] || CHAIN_CONFIG.ethereum;
  }

  // Get all supported chains
  getSupportedChains(): string[] {
    return Object.keys(CHAIN_CONFIG);
  }

  // Validate Ethereum address
  isValidAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch (error) {
      console.warn("Error validating address:", error);
      return false;
    }
  }

  // Format address to checksum format
  formatAddress(address: string): string {
    try {
      return ethers.getAddress(address);
    } catch (error) {
      console.warn("Error formatting address:", error);
      return address;
    }
  }

  // Get the latest block number for a specific chain
  async getLatestBlockNumber(chain: string = 'ethereum'): Promise<number> {
    try {
      return await this.web3Instances[chain].eth.getBlockNumber();
    } catch (error) {
      console.warn(`Error getting latest block number for ${chain}, using fallback:`, error);
      // Return a fallback block number to prevent further errors
      return chain === 'bsc' ? 30000000 : 17000000; // Use recent block numbers as fallback
    }
  }

  // Get transactions from a specific block on a specific chain
  async getTransactionsFromBlock(blockNumber: number, chain: string = 'ethereum'): Promise<Transaction[]> {
    try {
      // Ensure block number is valid and positive
      if (blockNumber <= 0) {
        return [];
      }
      
      // Convert block number to hex string for web3
      const blockNumberHex = '0x' + blockNumber.toString(16);
      
      // Try to get the block with transactions
      const block = await this.web3Instances[chain].eth.getBlock(blockNumberHex, true);
      
      if (!block || !block.transactions || !Array.isArray(block.transactions)) {
        return [];
      }
      
      return block.transactions.map((tx: any, index: number) => ({
        id: `${chain}-${blockNumber}-${index}`,
        from: tx.from,
        to: tx.to || '0x0000000000000000000000000000000000000000', // Contract creation
        value: tx.value.toString(),
        timestamp: Number(block.timestamp), // Convert to number to avoid BigInt issues
        hash: tx.hash,
        blockNumber: blockNumber,
        blockchain: chain,
        input: tx.input || '0x'
      }));
    } catch (error) {
      console.warn(`Error fetching transactions from block on ${chain}, using fallback:`, error);
      return this.getSampleTransactions(5, chain); // Return sample data instead of throwing
    }
  }

  // Get the latest transactions from a specific chain
  async getLatestTransactions(count: number = 10, chain: string = 'ethereum'): Promise<Transaction[]> {
    try {
      const latestBlock = await this.getLatestBlockNumber(chain);
      let transactions: Transaction[] = [];
      let currentBlock = latestBlock;
      let blocksChecked = 0;
      const maxBlocksToCheck = 5; // Limit to prevent too many requests
      
      // Fetch transactions from blocks until we have enough
      while (transactions.length < count && blocksChecked < maxBlocksToCheck && currentBlock > 0) {
        try {
          const blockTxs = await this.getTransactionsFromBlock(currentBlock, chain);
          transactions = [...transactions, ...blockTxs];
        } catch (err) {
          console.warn(`Error fetching block ${currentBlock} on ${chain}:`, err);
        }
        
        currentBlock--;
        blocksChecked++;
      }
      
      // If we couldn't get enough transactions, use sample data
      if (transactions.length === 0) {
        return this.getSampleTransactions(count, chain);
      }
      
      // Return only the requested number of transactions
      return transactions.slice(0, count);
    } catch (error) {
      console.warn(`Error fetching latest transactions on ${chain}, using fallback:`, error);
      // Return sample transactions to prevent UI from breaking
      return this.getSampleTransactions(count, chain);
    }
  }

  // Get transactions for a specific address on a specific chain
  async getAddressTransactions(address: string, count: number = 10, chain: string = 'ethereum'): Promise<Transaction[]> {
    try {
      // Validate address
      if (!this.isValidAddress(address)) {
        // Return sample transactions if address is invalid
        return this.getSampleTransactionsForAddress(count, address, chain);
      }
      
      // Format address to checksum format
      const checksumAddress = this.formatAddress(address);
      
      // Note: This is a simplified implementation
      // In a real-world scenario, you would use an indexing service or API
      // like Etherscan, Alchemy, or The Graph for efficient address transaction lookups
      
      // For demo purposes, just return sample transactions
      return this.getSampleTransactionsForAddress(count, checksumAddress, chain);
    } catch (error) {
      console.warn(`Error fetching address transactions on ${chain}, using fallback:`, error);
      return this.getSampleTransactionsForAddress(count, address, chain);
    }
  }

  // Get cross-chain transactions for an address
  async getCrossChainTransactions(address: string, count: number = 10): Promise<Transaction[]> {
    try {
      // Validate address
      if (!this.isValidAddress(address)) {
        return [];
      }
      
      // Format address to checksum format
      const checksumAddress = this.formatAddress(address);
      
      // Get transactions from multiple chains
      const chains = Object.keys(CHAIN_CONFIG).slice(0, 3); // Limit to first 3 chains for performance
      let allTransactions: Transaction[] = [];
      
      for (const chain of chains) {
        try {
          const txs = await this.getAddressTransactions(checksumAddress, Math.ceil(count / chains.length), chain);
          allTransactions = [...allTransactions, ...txs];
        } catch (err) {
          console.warn(`Error fetching ${chain} transactions:`, err);
        }
      }
      
      // Sort by timestamp (newest first)
      allTransactions.sort((a, b) => b.timestamp - a.timestamp);
      
      // Add cross-chain references
      const enhancedTransactions = this.addCrossChainReferences(allTransactions);
      
      return enhancedTransactions.slice(0, count);
    } catch (error) {
      console.warn('Error fetching cross-chain transactions, using fallback:', error);
      return this.getSampleTransactions(count);
    }
  }

  // Add cross-chain references to transactions
  private addCrossChainReferences(transactions: Transaction[]): Transaction[] {
    // This is a simplified implementation
    // In a real-world scenario, you would use a more sophisticated algorithm
    // to identify cross-chain transactions based on bridge contracts, timestamps, etc.
    
    // Group transactions by timestamp (within a 10-minute window)
    const timeGroups: Record<string, Transaction[]> = {};
    
    transactions.forEach(tx => {
      // Check if transaction involves a bridge contract
      const isBridgeTx = this.isBridgeTransaction(tx);
      
      if (isBridgeTx) {
        // Round timestamp to nearest 10-minute window
        const timeWindow = Math.floor(tx.timestamp / 600) * 600;
        if (!timeGroups[timeWindow]) {
          timeGroups[timeWindow] = [];
        }
        timeGroups[timeWindow].push(tx);
      }
    });
    
    // Add cross-chain references to transactions in the same time window
    Object.values(timeGroups).forEach(group => {
      if (group.length > 1) {
        // Add cross-chain references to each transaction in the group
        group.forEach(tx => {
          tx.crossChainRef = group
            .filter(ref => ref.id !== tx.id)
            .map(ref => ({
              blockchain: ref.blockchain,
              hash: ref.hash
            }));
        });
      }
    });
    
    return transactions;
  }

  // Check if a transaction involves a bridge contract
  private isBridgeTransaction(tx: Transaction): boolean {
    const chain = tx.blockchain;
    const bridgeContracts = BRIDGE_CONTRACTS[chain as keyof typeof BRIDGE_CONTRACTS] || [];
    
    return bridgeContracts.some(contract => 
      tx.to.toLowerCase() === contract.toLowerCase() || 
      tx.from.toLowerCase() === contract.toLowerCase()
    );
  }

  // Get cross-chain address information
  async getCrossChainAddressInfo(address: string): Promise<CrossChainAddress> {
    try {
      // Validate address
      if (!this.isValidAddress(address)) {
        throw new Error('Invalid address');
      }
      
      // Format address to checksum format
      const checksumAddress = this.formatAddress(address);
      
      // Check if this is a known cross-chain address
      const knownAddresses = CROSS_CHAIN_ADDRESSES[checksumAddress.toLowerCase()];
      
      // Get information from multiple chains
      const chains = Object.keys(CHAIN_CONFIG).slice(0, 3); // Limit to first 3 chains for performance
      const blockchainInfo = [];
      
      for (const chain of chains) {
        // Use the known address for this chain if available, otherwise use the same address
        const chainAddress = knownAddresses ? 
          knownAddresses[chain as keyof typeof knownAddresses] || checksumAddress : 
          checksumAddress;
        
        try {
          // Get balance
          const balance = await this.getAddressBalance(chainAddress, chain);
          
          // Get transaction count (simplified)
          const txs = await this.getAddressTransactions(chainAddress, 5, chain);
          const txCount = txs.length;
          
          // Get last activity timestamp
          const lastActivity = txs.length > 0 ? 
            Math.max(...txs.map(tx => tx.timestamp)) : 
            0;
          
          blockchainInfo.push({
            name: chain,
            balance,
            txCount,
            lastActivity
          });
        } catch (err) {
          console.warn(`Error getting ${chain} info for address ${chainAddress}:`, err);
          // Add placeholder data
          blockchainInfo.push({
            name: chain,
            balance: '0',
            txCount: 0,
            lastActivity: 0
          });
        }
      }
      
      return {
        address: checksumAddress,
        blockchains: blockchainInfo
      };
    } catch (error) {
      console.warn('Error fetching cross-chain address info, using fallback:', error);
      // Return fallback data
      return {
        address: address,
        blockchains: [
          {
            name: 'ethereum',
            balance: '0.5',
            txCount: 10,
            lastActivity: Math.floor(Date.now() / 1000) - 86400 // 1 day ago
          },
          {
            name: 'bsc',
            balance: '2.3',
            txCount: 5,
            lastActivity: Math.floor(Date.now() / 1000) - 172800 // 2 days ago
          }
        ]
      };
    }
  }

  // Get balance for an address on a specific chain
  async getAddressBalance(address: string, chain: string = 'ethereum'): Promise<string> {
    try {
      // Validate address
      if (!this.isValidAddress(address)) {
        return "0";
      }
      
      // Format address to checksum format
      const checksumAddress = this.formatAddress(address);
      
      try {
        const balance = await this.web3Instances[chain].eth.getBalance(checksumAddress);
        return this.web3Instances[chain].utils.fromWei(balance, 'ether');
      } catch (err) {
        console.warn(`Error getting balance on ${chain}, using fallback:`, err);
        return (Math.random() * 10).toFixed(4); // Return random balance for demo
      }
    } catch (error) {
      console.warn(`Error fetching address balance on ${chain}, using fallback:`, error);
      return (Math.random() * 5).toFixed(4); // Return random balance for demo
    }
  }

  // Get contract bytecode
  async getContractBytecode(address: string, chain: string = 'ethereum'): Promise<string> {
    try {
      // Validate address
      if (!this.isValidAddress(address)) {
        return "Not a valid address";
      }
      
      // Format address to checksum format
      const checksumAddress = this.formatAddress(address);
      
      try {
        const code = await this.web3Instances[chain].eth.getCode(checksumAddress);
        return code === '0x' ? 'Not a contract' : code;
      } catch (err) {
        console.warn(`Error getting contract code on ${chain}, using fallback:`, err);
        // Return sample bytecode for demo
        return "0x608060405234801561001057600080fd5b50600436106100415760003560e01c8063251c1aa3146100465780635c60da1b146100645780638f28397014610082575b600080fd5b61004e61009e565b60405161005b919061024a565b60405180910390f35b61006c6100a4565b60405161007991906101f1565b60405180910390f35b61009c600480360381019061009791906101b8565b6100c8565b005b60005481565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b806000806101000a81 548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506000808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81548160ff0219169083151502179055505050565b60008135905061016d816102a6565b92915050565b60008151905061018281610...";
      }
    } catch (error) {
      console.warn(`Error fetching contract bytecode on ${chain}, using fallback:`, error);
      return "Error fetching bytecode";
    }
  }

  // Check if an address is a contract
  async isContract(address: string, chain: string = 'ethereum'): Promise<boolean> {
    try {
      // Validate address
      if (!this.isValidAddress(address)) {
        return false;
      }
      
      // Format address to checksum format
      const checksumAddress = this.formatAddress(address);
      
      try {
        const code = await this.web3Instances[chain].eth.getCode(checksumAddress);
        return code !== '0x';
      } catch (err) {
        console.warn(`Error checking if address is a contract on ${chain}, using fallback:`, err);
        // For demo purposes, assume some addresses are contracts
        const knownContracts = [
          '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
          '0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516',
          '0x96221423681a6d52e184d440a8efcebb105c7242'
        ];
        return knownContracts.includes(checksumAddress.toLowerCase());
      }
    } catch (error) {
      console.warn(`Error checking if address is a contract on ${chain}, using fallback:`, error);
      return false;
    }
  }

  // Get transaction details
  async getTransactionDetails(txHash: string, chain: string = 'ethereum'): Promise<any> {
    try {
      try {
        const tx = await this.web3Instances[chain].eth.getTransaction(txHash);
        const receipt = await this.web3Instances[chain].eth.getTransactionReceipt(txHash);
        
        return {
          ...tx,
          receipt,
          blockchain: chain
        };
      } catch (err) {
        console.warn(`Error getting transaction details on ${chain}, using fallback:`, err);
        return null;
      }
    } catch (error) {
      console.warn(`Error fetching transaction details on ${chain}, using fallback:`, error);
      return null;
    }
  }

  // Get contract events
  async getContractEvents(contractAddress: string, chain: string = 'ethereum', fromBlock?: number, toBlock?: number): Promise<EventLog[]> {
    try {
      // Validate address
      if (!this.isValidAddress(contractAddress)) {
        return this.getSampleEvents(contractAddress, chain);
      }
      
      // Format address to checksum format
      const checksumAddress = this.formatAddress(contractAddress);
      
      // Check if the address is a contract
      const isContract = await this.isContract(checksumAddress, chain);
      if (!isContract) {
        return this.getSampleEvents(contractAddress, chain);
      }
      
      try {
        // In a real implementation, you would use web3 or ethers to get events
        // For example:
        // const contract = new this.web3Instances[chain].eth.Contract(COMMON_EVENT_ABI, checksumAddress);
        // const events = await contract.getPastEvents('allEvents', {
        //   fromBlock: fromBlock || 0,
        //   toBlock: toBlock || 'latest'
        // });
        
        // For demo purposes, just return sample events
        return this.getSampleEvents(contractAddress, chain);
      } catch (err) {
        console.warn(`Error getting contract events on ${chain}, using fallback:`, err);
        return this.getSampleEvents(contractAddress, chain);
      }
    } catch (error) {
      console.warn(`Error fetching contract events on ${chain}, using fallback:`, error);
      return this.getSampleEvents(contractAddress, chain);
    }
  }

  // Generate sample transactions for demo purposes
  private getSampleTransactions(count: number, chain: string = 'ethereum'): Transaction[] {
    const now = Math.floor(Date.now() / 1000);
    const sampleAddresses = [
      '0xfa09c3a328792253f8dee7116848723b72a6d2ea',
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
      '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
      '0xdfd5293d8e347dfe59e90efd55b2956a1343963d',
      '0x28c6c06298d514db089934071355e5743bf21d60',
      '0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516' // Added the requested address
    ];
    
    // Add bridge contracts for cross-chain transactions
    const bridgeContracts = BRIDGE_CONTRACTS[chain as keyof typeof BRIDGE_CONTRACTS] || [];
    
    // Sample input data for different transaction types
    const sampleInputs = {
      TRANSFER: '0x', // Simple ETH transfer has empty input
      CONTRACT_CALL: '0x23b872dd000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', // transferFrom
      TOKEN_TRANSFER: '0xa9059cbb0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a', // transfer
      SWAP: '0x38ed17390000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000', // swapExactTokensForTokens
    };
    
    return Array.from({ length: count }, (_, i) => {
      const fromIndex = Math.floor(Math.random() * sampleAddresses.length);
      let toIndex = Math.floor(Math.random() * sampleAddresses.length);
      
      // Occasionally use a bridge contract as the destination
      const useBridge = Math.random() < 0.2 && bridgeContracts.length > 0;
      const to = useBridge 
        ? bridgeContracts[Math.floor(Math.random() * bridgeContracts.length)]
        : sampleAddresses[toIndex];
      
      const value = (Math.random() * 10).toFixed(18);
      const timestamp = now - i * 3600; // 1 hour apart
      
      // Determine transaction type
      let txType = 'TRANSFER';
      let input = sampleInputs.TRANSFER;
      
      if (Math.random() < 0.3) {
        txType = 'CONTRACT_CALL';
        input = sampleInputs.CONTRACT_CALL;
      } else if (Math.random() < 0.5) {
        txType = 'TOKEN_TRANSFER';
        input = sampleInputs.TOKEN_TRANSFER;
      } else if (Math.random() < 0.2) {
        txType = 'SWAP';
        input = sampleInputs.SWAP;
      }
      
      // If it's a bridge transaction, override the type
      if (useBridge) {
        txType = 'BRIDGE';
      }
      
      const tx: Transaction = {
        id: `sample-${chain}-${i}`,
        from: sampleAddresses[fromIndex],
        to,
        value: this.web3Instances[chain].utils.toWei(value, 'ether'),
        timestamp: timestamp,
        hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        blockNumber: chain === 'bsc' ? 30000000 - i : 17000000 - i,
        blockchain: chain,
        input,
        type: txType
      };
      
      // Add cross-chain reference for bridge transactions
      if (useBridge) {
        const otherChains = Object.keys(CHAIN_CONFIG).filter(c => c !== chain);
        const otherChain = otherChains[Math.floor(Math.random() * otherChains.length)];
        tx.crossChainRef = [{
          blockchain: otherChain,
          hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
        }];
      }
      
      return tx;
    });
  }

  // Generate sample transactions for a specific address
  private getSampleTransactionsForAddress(count: number, address: string, chain: string = 'ethereum'): Transaction[] {
    const now = Math.floor(Date.now() / 1000);
    const sampleAddresses = [
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
      '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
      '0xdfd5293d8e347dfe59e90efd55b2956a1343963d',
      '0x28c6c06298d514db089934071355e5743bf21d60'
    ];
    
    // Add bridge contracts for cross-chain transactions
    const bridgeContracts = BRIDGE_CONTRACTS[chain as keyof typeof BRIDGE_CONTRACTS] || [];
    
    // Sample input data for different transaction types
    const sampleInputs = {
      TRANSFER: '0x', // Simple ETH transfer has empty input
      CONTRACT_CALL: '0x23b872dd000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', // transferFrom
      TOKEN_TRANSFER: '0xa9059cbb0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a', // transfer
      SWAP: '0x38ed17390000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000', // swapExactTokensForTokens
    };
    
    return Array.from({ length: count }, (_, i) => {
      // Alternate between incoming and outgoing transactions
      const isIncoming = i % 2 === 0;
      
      // Occasionally use a bridge contract
      const useBridge = Math.random() < 0.3 && bridgeContracts.length > 0;
      const otherParty = useBridge
        ? bridgeContracts[Math.floor(Math.random() * bridgeContracts.length)]
        : sampleAddresses[Math.floor(Math.random() * sampleAddresses.length)];
      
      const value = (Math.random() * 10).toFixed(18);
      const timestamp = now - i * 3600; // 1 hour apart
      
      // Determine transaction type
      let txType = 'TRANSFER';
      let input = sampleInputs.TRANSFER;
      
      if (Math.random() < 0.3) {
        txType = 'CONTRACT_CALL';
        input = sampleInputs.CONTRACT_CALL;
      } else if (Math.random() < 0.5) {
        txType = 'TOKEN_TRANSFER';
        input = sampleInputs.TOKEN_TRANSFER;
      } else if (Math.random() < 0.2) {
        txType = 'SWAP';
        input = sampleInputs.SWAP;
      }
      
      // If it's a bridge transaction, override the type
      if (useBridge) {
        txType = 'BRIDGE';
      }
      
      const tx: Transaction = {
        id: `sample-${chain}-${address}-${i}`,
        from: isIncoming ? otherParty : address,
        to: isIncoming ? address : otherParty,
        value: this.web3Instances[chain].utils.toWei(value, 'ether'),
        timestamp: timestamp,
        hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        blockNumber: chain === 'bsc' ? 30000000 - i : 17000000 - i,
        blockchain: chain,
        input,
        type: txType
      };
      
      // Add cross-chain reference for bridge transactions
      if (useBridge) {
        const otherChains = Object.keys(CHAIN_CONFIG).filter(c => c !== chain);
        const otherChain = otherChains[Math.floor(Math.random() * otherChains.length)];
        tx.crossChainRef = [{
          blockchain: otherChain,
          hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
        }];
      }
      
      return tx;
    });
  }

  // Generate sample events for demo purposes
  private getSampleEvents(contractAddress: string, chain: string = 'ethereum'): EventLog[] {
    const now = Math.floor(Date.now() / 1000);
    const sampleAddresses = [
      '0xfa09c3a328792253f8dee7116848723b72a6d2ea',
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
      '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
      '0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516' // Added the requested address
    ];
    
    const eventTypes = ['Transfer', 'Approval', 'Swap', 'Deposit', 'Withdrawal', 'BridgeInitiated', 'BridgeCompleted'];
    
    return Array.from({ length: 10 }, (_, i) => {
      const eventName = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const timestamp = now - i * 3600; // 1 hour apart
      const blockNumber = chain === 'bsc' ? 30000000 - i : 17000000 - i;
      const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      
      let parameters: Record<string, any> = {};
      
      if (eventName === 'Transfer') {
        parameters = {
          from: sampleAddresses[Math.floor(Math.random() * sampleAddresses.length)],
          to: sampleAddresses[Math.floor(Math.random() * sampleAddresses.length)],
          value: this.web3Instances[chain].utils.toWei((Math.random() * 10).toFixed(18), 'ether')
        };
      } else if (eventName === 'Approval') {
        parameters = {
          owner: sampleAddresses[Math.floor(Math.random() * sampleAddresses.length)],
          spender: sampleAddresses[Math.floor(Math.random() * sampleAddresses.length)],
          value: this.web3Instances[chain].utils.toWei((Math.random() * 100).toFixed(18), 'ether')
        };
      } else if (eventName === 'Swap') {
        parameters = {
          sender: sampleAddresses[Math.floor(Math.random() * sampleAddresses.length)],
          amount0In: this.web3Instances[chain].utils.toWei((Math.random() * 5).toFixed(18), 'ether'),
          amount1In: this.web3Instances[chain].utils.toWei((Math.random() * 0.1).toFixed(18), 'ether'),
          amount0Out: this.web3Instances[chain].utils.toWei((Math.random() * 0.1).toFixed(18), 'ether'),
          amount1Out: this.web3Instances[chain].utils.toWei((Math.random() * 5).toFixed(18), 'ether'),
          to: sampleAddresses[Math.floor(Math.random() * sampleAddresses.length)]
        };
      } else if (eventName === 'BridgeInitiated' || eventName === 'BridgeCompleted') {
        parameters = {
          user: sampleAddresses[Math.floor(Math.random() * sampleAddresses.length)],
          amount: this.web3Instances[chain].utils.toWei((Math.random() * 10).toFixed(18), 'ether'),
          targetChain: chain === 'ethereum' ? 'bsc' : 'ethereum',
          nonce: Math.floor(Math.random() * 1000000)
        };
      } else {
        parameters = {
          user: sampleAddresses[Math.floor(Math.random() * sampleAddresses.length)],
          amount: this.web3Instances[chain].utils.toWei((Math.random() * 10).toFixed(18), 'ether')
        };
      }
      
      return {
        address: contractAddress,
        blockNumber: blockNumber,
        transactionHash: txHash,
        logIndex: i,
        eventName: eventName,
        parameters: parameters,
        timestamp: timestamp
      };
    });
  }
}

export default Web3Service;