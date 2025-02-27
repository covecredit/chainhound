export interface Transaction {
  id: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  hash: string;
  blockNumber?: number;
  blockchain: 'ethereum' | 'bsc' | 'polygon' | 'arbitrum' | 'optimism' | string;
  crossChainRef?: {
    blockchain: string;
    hash: string;
  }[];
}

export interface Address {
  id: string;
  address: string;
  balance?: string;
  label?: string;
  blockchain?: string;
}

export interface TransactionFlow {
  nodes: Address[];
  links: Transaction[];
}

export interface CrossChainAddress {
  address: string;
  blockchains: {
    name: string;
    balance: string;
    lastActivity: number;
    txCount: number;
  }[];
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  createdAt: number;
  lastUsed?: number;
  permissions: {
    read: boolean;
    write: boolean;
  };
}