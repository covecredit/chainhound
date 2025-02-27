import React from 'react';
import { Wallet } from 'lucide-react';
import { Address } from '../types/transaction';

interface TransactionNodeProps {
  data: Address;
  selected: boolean;
  onClick: (address: Address) => void;
}

const TransactionNode: React.FC<TransactionNodeProps> = ({ data, selected, onClick }) => {
  const shortenAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Get blockchain-specific styling
  const getBlockchainColor = (blockchain?: string) => {
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

  const getBlockchainBorder = (blockchain?: string) => {
    switch (blockchain) {
      case 'bsc':
        return 'border-yellow-500'; // BSC yellow
      case 'polygon':
        return 'border-purple-500'; // Polygon purple
      case 'arbitrum':
        return 'border-blue-400'; // Arbitrum blue
      case 'optimism':
        return 'border-red-400'; // Optimism red
      default:
        return 'border-red-500'; // Default Ethereum red
    }
  };

  return (
    <div 
      className={`p-3 rounded-lg shadow-md transition-all duration-200 cursor-pointer
        ${selected ? `bg-${data.blockchain === 'bsc' ? 'yellow' : data.blockchain === 'polygon' ? 'purple' : data.blockchain === 'arbitrum' ? 'blue' : data.blockchain === 'optimism' ? 'red' : 'red'}-900/50 border-2 ${getBlockchainBorder(data.blockchain)}` : 'bg-gray-700 border border-gray-600 hover:border-red-400'}`}
      onClick={() => onClick(data)}
    >
      <div className="flex items-center gap-2">
        <div className={`p-2 bg-gray-800 rounded-full ${getBlockchainColor(data.blockchain)}`}>
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-sm text-gray-200">{data.label || shortenAddress(data.address)}</p>
          {data.balance && (
            <p className="text-xs text-gray-400">{data.balance} {data.blockchain === 'bsc' ? 'BNB' : data.blockchain === 'polygon' ? 'MATIC' : 'ETH'}</p>
          )}
          {data.blockchain && (
            <p className={`text-xs ${getBlockchainColor(data.blockchain)}`}>
              {data.blockchain.toUpperCase()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionNode;