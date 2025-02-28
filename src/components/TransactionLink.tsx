import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Transaction } from '../types/transaction';

interface TransactionLinkProps {
  transaction: Transaction;
  highlighted: boolean;
  onClick: (transaction: Transaction) => void;
  txType?: string;
  txTypes?: Record<string, { name: string, color: string }>;
}

const TransactionLink: React.FC<TransactionLinkProps> = ({ 
  transaction, 
  highlighted, 
  onClick,
  txType = 'UNKNOWN',
  txTypes = {}
}) => {
  const formatValue = (value: string) => {
    // Convert wei to ETH and format with full precision
    const ethValue = parseFloat(value) / 1e18;
    return ethValue.toString();
  };

  const formatTimestamp = (timestamp: number) => {
    // Convert timestamp to number to avoid BigInt conversion issues
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  // Get blockchain-specific styling
  const getBlockchainColor = (blockchain: string) => {
    switch (blockchain) {
      case 'bsc':
        return 'text-yellow-500'; // BSC yellow
      case 'polygon':
        return 'text-purple-500'; // Polygon purple
      case 'arbitrum':
        return 'text-blue-400'; // Arbitrum blue
      case 'optimism':
        return 'text-red-400'; // Optimism red
      default:
        return 'text-red-500'; // Default Ethereum red
    }
  };

  const getBlockchainBg = (blockchain: string) => {
    switch (blockchain) {
      case 'bsc':
        return 'bg-yellow-900/30'; // BSC yellow
      case 'polygon':
        return 'bg-purple-900/30'; // Polygon purple
      case 'arbitrum':
        return 'bg-blue-900/30'; // Arbitrum blue
      case 'optimism':
        return 'bg-red-900/30'; // Optimism red
      default:
        return 'bg-red-900/30'; // Default Ethereum red
    }
  };

  const getCurrencySymbol = (blockchain: string) => {
    switch (blockchain) {
      case 'bsc':
        return 'BNB';
      case 'polygon':
        return 'MATIC';
      case 'arbitrum':
      case 'optimism':
      default:
        return 'ETH';
    }
  };

  // Get transaction type color
  const getTxTypeColor = () => {
    if (txTypes && txTypes[txType]) {
      return txTypes[txType].color;
    }
    return '#6B7280'; // Default gray
  };

  // Get transaction type name
  const getTxTypeName = () => {
    if (txTypes && txTypes[txType]) {
      return txTypes[txType].name;
    }
    return 'Transaction';
  };

  return (
    <div 
      className={`flex items-center gap-2 p-2 rounded-md transition-all duration-200 cursor-pointer
        ${highlighted ? getBlockchainBg(transaction.blockchain) : 'hover:bg-gray-700'}`}
      onClick={() => onClick(transaction)}
    >
      <ArrowRight className={`h-4 w-4`} style={{ color: getTxTypeColor() }} />
      <div className="text-xs flex-1">
        <div className="flex justify-between items-center">
          <p className="font-medium text-gray-200">
            {formatValue(transaction.value)} {getCurrencySymbol(transaction.blockchain)}
          </p>
          <div className="flex items-center gap-1">
            <span className={`text-xs px-1.5 py-0.5 rounded ${getBlockchainColor(transaction.blockchain)} bg-gray-800`}>
              {transaction.blockchain.toUpperCase()}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800" style={{ color: getTxTypeColor() }}>
              {getTxTypeName()}
            </span>
          </div>
        </div>
        <p className="text-gray-400">{formatTimestamp(transaction.timestamp)}</p>
        
        {transaction.crossChainRef && transaction.crossChainRef.length > 0 && (
          <div className="mt-1 text-xs">
            <p className="text-gray-400 flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
              Cross-chain transaction
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionLink;