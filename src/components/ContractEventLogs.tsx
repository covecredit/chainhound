import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, ExternalLink, Filter, RefreshCw, Download, Copy, Check } from 'lucide-react';
import Web3Service from '../services/web3Service';
import { EventLog } from '../types/event';
import AddressLabel from './AddressLabel';

interface ContractEventLogsProps {
  contractAddress: string;
  providerUrl?: string;
}

const ContractEventLogs: React.FC<ContractEventLogsProps> = ({
  contractAddress,
  providerUrl = 'https://eth.llamarpc.com'
}) => {
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [copied, setCopied] = useState<boolean>(false);
  
  const web3Service = new Web3Service(providerUrl);
  
  useEffect(() => {
    fetchEventLogs();
  }, [contractAddress]);
  
  const fetchEventLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const logs = await web3Service.getContractEvents(contractAddress);
      setEventLogs(logs);
      
      // Extract unique event types
      const types = Array.from(new Set(logs.map(log => log.eventName)));
      setEventTypes(types);
    } catch (err) {
      console.error('Error fetching event logs:', err);
      setError('Failed to fetch event logs. Please check the contract address and try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const formatTimestamp = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };
  
  const getExplorerUrl = (hash: string) => {
    // For transactions, we could create a transaction detail page in the future
    // For now, just link to the address history
    return `/?address=${hash}`;
  };
  
  const filteredEvents = selectedEventType === 'all' 
    ? eventLogs 
    : eventLogs.filter(log => log.eventName === selectedEventType);
  
  const exportToCSV = () => {
    if (filteredEvents.length === 0) return;
    
    // Create CSV header
    const headers = ['Event Name', 'Transaction Hash', 'Block Number', 'Timestamp', 'Parameters'];
    
    // Create CSV rows
    const rows = filteredEvents.map(log => {
      const parameters = Object.entries(log.parameters)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ');
      
      return [
        log.eventName,
        log.transactionHash,
        log.blockNumber.toString(),
        log.timestamp ? formatTimestamp(log.timestamp) : 'N/A',
        parameters
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
    link.setAttribute('download', `contract-events-${contractAddress.substring(0, 8)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const exportToJSON = () => {
    if (filteredEvents.length === 0) return;
    
    // Create JSON content
    const jsonContent = JSON.stringify(filteredEvents, null, 2);
    
    // Create and download JSON file
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `contract-events-${contractAddress.substring(0, 8)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const copyToClipboard = () => {
    if (filteredEvents.length === 0) return;
    
    // Create JSON content
    const jsonContent = JSON.stringify(filteredEvents, null, 2);
    
    // Copy to clipboard
    navigator.clipboard.writeText(jsonContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Contract Event Logs
          </h2>
          <div className="flex items-center gap-2">
            <button 
              className="flex items-center gap-1 px-3 py-1 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors"
              onClick={fetchEventLogs}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
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
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Viewing events for contract <AddressLabel address={contractAddress} showEdit={false} showFull={true} />
        </p>
      </div>
      
      <div className="p-4 border-b border-gray-700 bg-gray-900">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-grow">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              <Filter className="h-4 w-4 inline mr-1" />
              Filter by Event Type
            </label>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Events</option>
              {eventTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-600 border-t-blue-600 mb-2"></div>
          <p className="text-gray-400">Loading event logs...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-400">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <p>No event logs found for this contract.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Event
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Transaction
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Block
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Timestamp
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Parameters
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {filteredEvents.map((log, index) => (
                <tr key={`${log.transactionHash}-${log.logIndex}`} className="hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-900/30 text-blue-400">
                      {log.eventName}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400">
                    <a 
                      href={getExplorerUrl(log.transactionHash)} 
                      className="flex items-center gap-1 hover:underline"
                    >
                      {log.transactionHash}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {log.blockNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {log.timestamp ? formatTimestamp(log.timestamp) : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300">
                      {Object.entries(log.parameters).map(([key, value], i) => (
                        <div key={i} className="mb-1">
                          <span className="text-gray-400">{key}:</span>{' '}
                          {typeof value === 'string' && value.startsWith('0x') && value.length === 42 ? (
                            <AddressLabel address={value} showEdit={false} showFull={true} />
                          ) : (
                            <span>{String(value)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ContractEventLogs;