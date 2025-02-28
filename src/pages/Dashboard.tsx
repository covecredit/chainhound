import React, { useState, useEffect } from 'react';
import { Search, Clock, FileText, Network, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWeb3Context } from '../contexts/Web3Context';

interface RecentSearch {
  query: string;
  timestamp: number;
  type: 'address' | 'transaction' | 'block' | 'unknown';
}

const Dashboard = () => {
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState('');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const navigate = useNavigate();
  const { web3, isConnected } = useWeb3Context();
  
  // Load recent searches from localStorage on component mount
  useEffect(() => {
    const savedSearches = localStorage.getItem('chainhound_recent_searches');
    if (savedSearches) {
      try {
        setRecentSearches(JSON.parse(savedSearches));
      } catch (err) {
        console.error('Failed to parse recent searches:', err);
      }
    }
  }, []);
  
  const determineSearchType = (query: string): 'address' | 'transaction' | 'block' | 'unknown' => {
    if (web3?.utils.isAddress(query)) {
      return 'address';
    } else if (query.startsWith('0x') && query.length === 66) {
      return 'transaction';
    } else if (!isNaN(Number(query))) {
      return 'block';
    }
    return 'unknown';
  };
  
  const addToRecentSearches = (query: string) => {
    const type = determineSearchType(query);
    const newSearch: RecentSearch = {
      query,
      timestamp: Date.now(),
      type
    };
    
    // Add to beginning of array and limit to 10 items
    const updatedSearches = [newSearch, ...recentSearches.filter(s => s.query !== query)].slice(0, 10);
    setRecentSearches(updatedSearches);
    
    // Save to localStorage
    localStorage.setItem('chainhound_recent_searches', JSON.stringify(updatedSearches));
  };
  
  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    
    if (!isConnected || !web3) {
      setError('Not connected to Ethereum network. Please check your connection in Settings.');
      return;
    }
    
    try {
      setError('');
      
      // Add to recent searches
      addToRecentSearches(searchInput);
      
      // Store the search query in session storage
      sessionStorage.setItem('chainhound_search', searchInput);
      
      // Navigate to transaction viewer with the search query
      navigate('/transactions');
    } catch (err: any) {
      console.error('Error processing search:', err);
      setError(err.message || 'Failed to process search query');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  const handleRecentSearchClick = (query: string) => {
    setSearchInput(query);
    sessionStorage.setItem('chainhound_search', query);
    navigate('/transactions');
  };
  
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  const getSearchTypeIcon = (type: string) => {
    switch (type) {
      case 'address':
        return <div className="w-2 h-2 rounded-full bg-indigo-600 mr-2"></div>;
      case 'transaction':
        return <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>;
      case 'block':
        return <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>;
      default:
        return <div className="w-2 h-2 rounded-full bg-gray-500 mr-2"></div>;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md dark:bg-gray-800 dark:text-white">
        <h1 className="text-2xl font-bold mb-4">Welcome to ChainHound</h1>
        <p className="text-gray-600 mb-6 dark:text-gray-300">
          Your comprehensive blockchain forensic tool for Ethereum analysis. Search for addresses, transactions, 
          contracts, and more to build detailed forensic reports.
        </p>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 p-4 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
            <div className="flex items-center mb-2">
              <Search className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
              <h3 className="font-semibold">Quick Search</h3>
            </div>
            <div className="mt-4">
              <input 
                type="text" 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter address, transaction, contract, or block ID..." 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
              <button 
                onClick={handleSearch}
                className="mt-2 w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition"
              >
                Search
              </button>
              
              {error && (
                <div className="mt-2 p-2 bg-red-100 text-red-700 rounded text-sm flex items-start dark:bg-red-900 dark:text-red-200">
                  <AlertTriangle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              {!isConnected && (
                <div className="mt-2 p-2 bg-yellow-100 text-yellow-700 rounded text-sm dark:bg-yellow-900 dark:text-yellow-200">
                  Not connected to Ethereum network. Please check your connection in Settings.
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1 p-4 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
            <div className="flex items-center mb-2">
              <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
              <h3 className="font-semibold">Recent Activity</h3>
            </div>
            <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto">
              {recentSearches.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No recent activity</p>
              ) : (
                recentSearches.map((search, index) => (
                  <div 
                    key={index} 
                    className="p-2 border rounded text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 dark:border-gray-600 flex items-center justify-between"
                    onClick={() => handleRecentSearchClick(search.query)}
                  >
                    <div className="flex items-center overflow-hidden">
                      {getSearchTypeIcon(search.type)}
                      <span className="truncate">{search.query}</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">
                      {formatTimestamp(search.timestamp)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md dark:bg-gray-800 dark:text-white">
          <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-100 text-indigo-600 mb-4 dark:bg-indigo-900 dark:text-indigo-300">
            <Network className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-medium">Transaction Viewer</h3>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Visualize transaction flows with interactive graphs and identify patterns.
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md dark:bg-gray-800 dark:text-white">
          <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-100 text-indigo-600 mb-4 dark:bg-indigo-900 dark:text-indigo-300">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-medium">Case Management</h3>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Create and manage forensic cases with detailed notes and evidence.
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md dark:bg-gray-800 dark:text-white">
          <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-100 text-indigo-600 mb-4 dark:bg-indigo-900 dark:text-indigo-300">
            <Clock className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-medium">Timeline Analysis</h3>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Track blockchain activities over time to identify suspicious patterns.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;