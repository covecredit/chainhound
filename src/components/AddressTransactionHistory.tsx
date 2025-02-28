import React, { useState, useEffect } from 'react';
import { Calendar, Filter, ExternalLink, Clock, ArrowDownUp, Code, AlertTriangle, Download, Copy, Check } from 'lucide-react';
import Web3Service from '../services/web3Service';
import { Transaction } from '../types/transaction';
import AddressLabel from './AddressLabel';

interface AddressTransactionHistoryProps {
  address: string;
  providerUrl?: string;
}

const AddressTransactionHistory: React.FC<AddressTransactionHistoryProps> = ({
  address,
  providerUrl = 'https://eth.llamarpc.com'
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({
    start: '',
    end: new Date().toISOString().split('T')[0]
  });
  const [transactionType, setTransactionType] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [copied, setCopied] = useState<boolean>(false);
  const [blockchain, setBlockchain] = useState<'ethereum' | 'bsc' | 'polygon' | 'all'>('all');
  
  const web3Service = new Web3Service(providerUrl);
  
  useEffect(() => {
    fetchTransactions();
  }, [address]);
  
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch transactions from all chains
      const chains = ['ethereum', 'bsc', 'polygon'];
      let allTransactions: Transaction[] = [];
      
      for (const chain of chains) {
        try {
          const txs = await web3Service.getAddressTransactions(address, 20, chain);
          allTransactions = [...allTransactions, ...txs];
        } catch (err) {
          console.error(`Error fetching ${chain} transactions:`, err);
        }
      }
      
      // Sort by timestamp (newest first)
      allTransactions.sort((a, b) => b.timestamp - a.timestamp);
      
      setTransactions(allTransactions);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to fetch transactions. Please check the address and try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const formatTimestamp = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };
  
  const formatValue = (value: string) => {
    // Convert wei to ETH and format with full precision
    const ethValue = parseFloat(value) / 1e18;
    return ethValue.toString();
  };
  
  const handleExternalLinkClick = (e: React.MouseEvent, chain: string, hash: string, isAddress: boolean = false) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Open in a new tab
    const url = isAddress ? `/?address=${hash}` : `https://etherscan.io/tx/${hash}`;
    window.open(url, '_blank');
  };
  
  const getCurrencySymbol = (chain: string) => {
    return {
      ethereum: 'ETH',
      bsc: 'BNB',
      polygon: 'MATIC',
      arbitrum: 'ETH',
      optimism: 'ETH'
    }[chain] || 'ETH';
  };
  
  const getTransactionDirection = (tx: Transaction) => {
    const isIncoming = tx.to.toLowerCase() === address.toLowerCase();
    const isOutgoing = tx.from.toLowerCase() === address.toLowerCase();
    
    return {
      isIncoming,
      isOutgoing,
      direction: isIncoming ? 'incoming' : isOutgoing ? 'outgoing' : 'other'
    };
  };
  
  const filteredTransactions = transactions
    .filter(tx => {
      // Filter by blockchain
      if (blockchain !== 'all' && tx.blockchain !== blockchain) {
        return false;
      }
      
      // Filter by transaction type
      const { isIncoming, isOutgoing } = getTransactionDirection(tx);
      
      if (transactionType === 'incoming') return isIncoming;
      if (transactionType === 'outgoing') return isOutgoing;
      return true;
    })
    .filter(tx => {
      // Filter by date range
      const txDate = new Date(Number(tx.timestamp) * 1000);
      const startDate = dateRange.start ? new Date(dateRange.start) : new Date(0);
      const endDate = dateRange.end ? new Date(dateRange.end) : new Date();
      endDate.setHours(23, 59, 59, 999); // End of the day
      
      return txDate >= startDate && txDate <= endDate;
    })
    .sort((a, b) => {
      if (sortOrder === 'desc') {
        return Number(b.timestamp) - Number(a.timestamp);
      } else {
        return Number(a.timestamp) - Number(b.timestamp);
      }
    });
  
  const exportToCSV = () => {
    if (filteredTransactions.length === 0) return;
    
    // Create CSV header
    const headers = ['Blockchain', 'Transaction Hash', 'From', 'To', 'Value', 'Timestamp', 'Block Number'];
    
    // Create CSV rows
    const rows = filteredTransactions.map(tx => {
      return [
        tx.blockchain.toUpperCase(),
        tx.hash,
        tx.from,
        tx.to,
        `${formatValue(tx.value)} ${getCurrencySymbol(tx.blockchain)}`,
        formatTimestamp(tx.timestamp),
        tx.blockNumber?.toString() || 'N/A'
      ];
    });
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions-${address.substring(0, 8)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const exportToJSON = () => {
    if (filteredTransactions.length === 0) return;
    
    // Create JSON content
    const jsonContent = JSON.stringify(filteredTransactions, null, 2);
    
    // Create and download JSON file
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions-${address.substring(0, 8)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const copyToClipboard = () => {
    if (filteredTransactions.length === 0) return;
    
    // Create JSON content
    const jsonContent = JSON.stringify(filteredTransactions, null, 2);
    
    // Copy to clipboard
    navigator.clipboard.writeText(jsonContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">
            Transaction History for <AddressLabel address={address} showEdit={false} />
          </h2>
          <div className="relative group">
            <button 
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <div className="absolute right-0 mt-1 w-36 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 hidden group-hover:block">
              <button
                onClick={exportToCSV}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
              >
                Export as CSV
              </button>
              <button
                onClick={exportToJSON}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
              >
                Export as JSON
              </button>
              <button
                onClick={copyToClipboard}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center"
              >
                {copied ? <Check className="h-3 w-3 mr-1 text-green-500" /> : <Copy className="h-3 w-3 mr-1" />}
                Copy to clipboard
              </button>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Showing {filteredTransactions.length} transactions
        </p>
      </div>
      
      <div className="p-4 border-b border-gray-700 bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              <Calendar className="h-4 w-4 inline mr-1" />
              Date Range
            </label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="self-center text-gray-400">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              <Filter className="h-4 w-4 inline mr-1" />
              Transaction Type
            </label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value as any)}
              className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Transactions</option>
              <option value="incoming">Incoming</option>
              <option value="outgoing">Outgoing</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              <Filter className="h-4 w-4 inline mr-1" />
              Blockchain
            </label>
            <select
              value={blockchain}
              onChange={(e) => setBlockchain(e.target.value as any)}
              className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Blockchains</option>
              <option value="ethereum">Ethereum</option>
              <option value="bsc">Binance Smart Chain</option>
              <option value="polygon">Polygon</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              <Clock className="h-4 w-4 inline mr-1" />
              Sort Order
            </label>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="w-full flex items-center justify-center gap-2 rounded-md border border-gray-600 shadow-sm px-3 py-2 bg-gray-700 text-sm text-gray-200 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-blue-500"
            >
              <ArrowDownUp className="h-4 w-4" />
              {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
            </button>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-600 border-t-blue-600 mb-2"></div>
          <p className="text-gray-400">Loading transactions...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-400">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <p>No transactions found matching the current filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Blockchain
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Transaction Hash
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date & Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  From
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  To
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {filteredTransactions.map((tx) => {
                const { direction } = getTransactionDirection(tx);
                
                return (
                  <tr key={tx.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        tx.blockchain === 'ethereum' ? 'bg-blue-900/30 text-blue-400' :
                        tx.blockchain === 'bsc' ? 'bg-yellow-900/30 text-yellow-400' :
                        tx.blockchain === 'polygon' ? 'bg-purple-900/30 text-purple-400' :
                        'bg-gray-700 text-gray-400'
                      }`}>
                        {tx.blockchain.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400">
                      <a 
                        href="#"
                        onClick={(e) => handleExternalLinkClick(e, tx.blockchain, tx.hash)}
                        className="flex items-center gap-1 hover:underline"
                      >
                        {tx.hash}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {formatTimestamp(tx.timestamp)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${direction === 'outgoing' ? 'font-semibold text-red-400' : 'text-gray-400'}`}>
                      <a 
                        href="#"
                        onClick={(e) => handleExternalLinkClick(e, tx.blockchain, tx.from, true)}
                        className="hover:underline"
                      >
                        <AddressLabel address={tx.from} showEdit={false} showFull={true} />
                      </a>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${direction === 'incoming' ? 'font-semibold text-green-400' : 'text-gray-400'}`}>
                      <a 
                        href="#"
                        onClick={(e) => handleExternalLinkClick(e, tx.blockchain, tx.to, true)}
                        className="hover:underline"
                      >
                        <AddressLabel address={tx.to} showEdit={false} showFull={true} />
                      </a>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      direction === 'incoming' ? 'text-green-400' : 
                      direction === 'outgoing' ? 'text-red-400' : 'text-gray-300'
                    }`}>
                      {formatValue(tx.value)} {getCurrencySymbol(tx.blockchain)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AddressTransactionHistory;