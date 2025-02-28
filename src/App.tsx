import React, { useState, useEffect } from 'react';
import BlockchainTransactionVisualizer from './components/BlockchainTransactionVisualizer';
import AddressTransactionHistory from './components/AddressTransactionHistory';
import ContractBytecodeDecompiler from './components/ContractBytecodeDecompiler';
import ContractEventLogs from './components/ContractEventLogs';
import AddressLabelManager from './components/AddressLabelManager';
import AddressBehaviorAnalysis from './components/AddressBehaviorAnalysis';
import AlertsManager from './components/AlertsManager';
import CrossChainAnalyzer from './components/CrossChainAnalyzer';
import ApiAccessManager from './components/ApiAccessManager';
import DonationBanner from './components/DonationBanner';
import CaseManager from './components/CaseManager';
import NoteScratchpad from './components/NoteScratchpad';
import ReportGenerator from './components/ReportGenerator';
import ThreatManager from './components/ThreatManager';
import Web3Service from './services/web3Service';
import { Transaction } from './types/transaction';
import { Toaster } from 'react-hot-toast';
import { 
  ArrowRight, 
  Database, 
  Settings, 
  Search, 
  BarChart3, 
  ShieldAlert,
  Bell,
  Trash2,
  Network,
  Key,
  Code,
  Folder,
  FileText,
  AlertTriangle,
  Mail
} from 'lucide-react';
import { useAlerts } from './hooks/useAlerts';
import { useStorage } from './hooks/useStorage';

function App() {
  const [blockchain, setBlockchain] = useState<'ethereum' | 'bsc' | 'polygon'>('ethereum');
  const [providerUrl, setProviderUrl] = useState<string>('https://eth.llamarpc.com');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [useSampleData, setUseSampleData] = useState<boolean>(false);
  const [transactionCount, setTransactionCount] = useState<number>(10);
  const [activeTab, setActiveTab] = useState<'visualizer' | 'history' | 'decompiler' | 'events' | 'labels' | 'behavior' | 'alerts' | 'cross-chain' | 'api' | 'cases' | 'notes' | 'reports' | 'threats'>('alerts');
  const [searchAddress, setSearchAddress] = useState<string>('0x0fa09c3a328792253f8dee7116848723b72a6d2e');
  const [showForgetMeConfirm, setShowForgetMeConfirm] = useState<boolean>(false);
  const [showDonationBanner, setShowDonationBanner] = useState<boolean>(true);
  const [showDataExportImport, setShowDataExportImport] = useState<boolean>(false);
  const [importData, setImportData] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const web3Service = new Web3Service(providerUrl);
  const { clearAllStoredData, exportStorageData, importStorageData, getFromStorage, setInStorage } = useStorage();
  const { checkForAlerts } = useAlerts();
  
  const fetchTransactions = async (): Promise<Transaction[]> => {
    try {
      setLoading(true);
      setError(null);
      const transactions = await web3Service.getLatestTransactions(transactionCount, blockchain);
      // Check for alerts when new transactions are fetched
      checkForAlerts(transactions);
      return transactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to fetch transactions. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchAddressTransactions = async (): Promise<Transaction[]> => {
    try {
      return await web3Service.getAddressTransactions(searchAddress, transactionCount, blockchain);
    } catch (error) {
      console.error('Error fetching address transactions:', error);
      throw error;
    }
  };

  const handleForgetMe = () => {
    clearAllStoredData();
    setShowForgetMeConfirm(false);
    window.location.reload();
  };

  const handleAddressSelect = (address: string) => {
    setSearchAddress(address);
    setActiveTab('history');
  };
  
  const handleExportData = () => {
    const data = exportStorageData();
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `chainhound-data-${timestamp}.json`;
    
    // Create and download file
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleImportData = () => {
    if (!importData.trim()) {
      setImportError('Please paste the exported data');
      return;
    }
    
    try {
      const success = importStorageData(importData);
      if (success) {
        setShowDataExportImport(false);
        setImportData('');
        setImportError(null);
        window.location.reload();
      } else {
        setImportError('Invalid data format');
      }
    } catch (error) {
      console.error('Error importing data:', error);
      setImportError('Error importing data');
    }
  };

  // Check if donation banner should be shown
  useEffect(() => {
    const donationBannerClosed = getFromStorage('donation-banner-closed', false);
    if (donationBannerClosed) {
      setShowDonationBanner(false);
    }
  }, []);

  const handleCloseDonationBanner = () => {
    setShowDonationBanner(false);
  };

  // Output the Lord's Prayer to console when the component mounts
  useEffect(() => {
    console.log(`
    Our Father, who art in heaven,
    hallowed be thy name;
    thy kingdom come;
    thy will be done on earth as it is in heaven.
    Give us this day our daily bread;
    and forgive us our trespasses
    as we forgive those who trespass against us;
    and lead us not into temptation,
    but deliver us from evil.
    Amen.
    `);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* <!-- "For there is nothing hidden that will not be disclosed, and nothing concealed that will not be known or brought out into the open." - Luke 8:17 --> */}
      {/* <!-- "The Lord detests dishonest scales, but accurate weights find favor with him." - Proverbs 11:1 --> */}
      {/* <!-- "For the love of money is a root of all kinds of evil." - 1 Timothy 6:10 --> */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#1f2937',
            color: '#f3f4f6',
            border: '1px solid #374151'
          },
        }}
      />
      
      <header className="bg-gray-800 shadow-md border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM21 21l-6-6" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 8h6M7 12h4" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div>
                <h1 className="text-xl font-bold text-white">ChainHound</h1>
                <p className="text-xs text-gray-400">hunt for suspicious blockchain activity</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab('cases')}
                className={`px-3 py-1.5 rounded-md ${
                  activeTab === 'cases' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } flex items-center gap-1`}
                title="Case Manager"
              >
                <Folder className="h-4 w-4" />
                <span>Case Manager</span>
              </button>
              <button
                onClick={() => setActiveTab('threats')}
                className={`px-3 py-1.5 rounded-md ${
                  activeTab === 'threats' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } flex items-center gap-1`}
                title="Threat Manager"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Threat Manager</span>
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-full hover:bg-gray-700"
                title="Settings"
              >
                <Settings className="h-5 w-5 text-gray-300" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showSettings && (
          <div className="mb-6 bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700">
            <h2 className="text-lg font-medium text-white mb-4">Explorer Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Blockchain
                </label>
                <select
                  value={blockchain}
                  onChange={(e) => setBlockchain(e.target.value as any)}
                  className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ethereum">Ethereum</option>
                  <option value="bsc">Binance Smart Chain</option>
                  <option value="polygon">Polygon</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Data Source
                </label>
                <div className="flex items-center space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-blue-600"
                      checked={useSampleData}
                      onChange={() => setUseSampleData(true)}
                    />
                    <span className="ml-2 text-gray-300">Sample Data</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-blue-600"
                      checked={!useSampleData}
                      onChange={() => setUseSampleData(false)}
                    />
                    <span className="ml-2 text-gray-300">Live Data</span>
                  </label>
                </div>
              </div>
              
              {!useSampleData && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Provider URL
                    </label>
                    <input
                      type="text"
                      value={providerUrl}
                      onChange={(e) => setProviderUrl(e.target.value)}
                      placeholder="e.g., https://eth.llamarpc.com"
                      className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Transaction Count
                    </label>
                    <input
                      type="number"
                      value={transactionCount}
                      onChange={(e) => setTransactionCount(parseInt(e.target.value))}
                      min={1}
                      max={50}
                      className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              )}
              
              <div className="md:col-span-2 border-t border-gray-700 pt-4 mt-2">
                <h3 className="text-md font-medium text-white mb-2">Privacy Settings</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => setShowForgetMeConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete My Data
                  </button>
                  <button
                    onClick={() => setShowDataExportImport(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Database className="h-4 w-4" />
                    Export/Import Data
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  We don't track our users or collect any personal information. These buttons let you manage your locally stored data.
                </p>
              </div>
            </div>
          </div>
        )}

        {showForgetMeConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4">Confirm Data Deletion</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete all your stored data? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowForgetMeConfirm(false)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleForgetMe}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete All Data
                </button>
              </div>
            </div>
          </div>
        )}
        
        {showDataExportImport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4">Export/Import Data</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-md font-medium text-gray-300 mb-2">Export Data</h4>
                  <p className="text-sm text-gray-400 mb-3">
                    Export all your saved data (alerts, labels, cases, notes) to a JSON file.
                  </p>
                  <button
                    onClick={handleExportData}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Database className="h-4 w-4" />
                    <span>Export Data</span>
                  </button>
                </div>
                
                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-md font-medium text-gray-300 mb-2">Import Data</h4>
                  <p className="text-sm text-gray-400 mb-3">
                    Import previously exported data. This will replace your current data.
                  </p>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Paste exported JSON data here..."
                    rows={5}
                    className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 mb-2"
                  />
                  {importError && (
                    <p className="text-sm text-red-400 mb-2">{importError}</p>
                  )}
                  <button
                    onClick={handleImportData}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <Database className="h-4 w-4" />
                    <span>Import Data</span>
                  </button>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDataExportImport(false)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showDonationBanner && (
          <DonationBanner 
            address="0x34B362450c05b34f222a55113532c8F4b82E50CC" 
            onClose={handleCloseDonationBanner}
          />
        )}

        <div className="mb-6">
          <div className="w-full">
            <div className="relative">
              <input
                type="text"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="Enter an Ethereum address or contract"
                className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm pl-10 pr-4 py-2 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-500" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setActiveTab('alerts')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'alerts' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Alerts
            </button>
            <button
              onClick={() => setActiveTab('cross-chain')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'cross-chain' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Cross-Chain
            </button>
            <button
              onClick={() => setActiveTab('visualizer')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'visualizer' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Visualizer
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'history' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setActiveTab('behavior')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'behavior' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Threat Analysis
            </button>
            <button
              onClick={() => setActiveTab('decompiler')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'decompiler' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Decompiler
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'events' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Events
            </button>
            <button
              onClick={() => setActiveTab('labels')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'labels' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Labels
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'api' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              API
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'notes' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'reports' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Reports
            </button>
          </div>
        </div>

        <div className="rounded-lg overflow-hidden border-2 border-gray-700 shadow-lg">
          {activeTab === 'alerts' && (
            <AlertsManager
              address={searchAddress}
              providerUrl={providerUrl}
            />
          )}

          {activeTab === 'cross-chain' && (
            <CrossChainAnalyzer
              address={searchAddress}
              providerUrl={providerUrl}
            />
          )}

          {activeTab === 'visualizer' && (
            <BlockchainTransactionVisualizer
              onFetchTransactions={fetchTransactions}
              blockchain={blockchain}
              autoRefresh={!useSampleData}
              refreshInterval={30000}
              onAddressSelect={handleAddressSelect}
            />
          )}

          {activeTab === 'history' && (
            <AddressTransactionHistory
              address={searchAddress}
              providerUrl={providerUrl}
            />
          )}

          {activeTab === 'behavior' && (
            <AddressBehaviorAnalysis
              address={searchAddress}
              providerUrl={providerUrl}
            />
          )}

          {activeTab === 'decompiler' && (
            <ContractBytecodeDecompiler
              contractAddress={searchAddress}
              providerUrl={providerUrl}
            />
          )}

          {activeTab === 'events' && (
            <ContractEventLogs
              contractAddress={searchAddress}
              providerUrl={providerUrl}
            />
          )}

          {activeTab === 'labels' && (
            <AddressLabelManager />
          )}

          {activeTab === 'api' && (
            <ApiAccessManager />
          )}
          
          {activeTab === 'cases' && (
            <CaseManager />
          )}
          
          {activeTab === 'notes' && (
            <NoteScratchpad />
          )}
          
          {activeTab === 'reports' && (
            <ReportGenerator />
          )}

          {activeTab === 'threats' && (
            <ThreatManager />
          )}
        </div>
      </main>

      <footer className="bg-gray-800 mt-12 py-6 border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-center text-gray-400 text-sm">
              ChainHound &copy; {new Date().getFullYear()} - Blockchain Forensics Explorer
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-2">
                <a
                  href="https://github.com/covecredit/chainhound"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-300"
                >
                  <Code className="h-4 w-4" />
                </a>
                <a
                  href="mailto:info@hacker.house"
                  className="text-gray-400 hover:text-gray-300"
                >
                  <Mail className="h-4 w-4" />
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Support development:</span>
                <span className="text-xs font-mono text-gray-400">0x34B362450c05b34f222a55113532c8F4b82E50CC</span>
              </div>
            </div>
            <p className="text-center text-gray-400 text-sm">
              ChainHound is a product of <a href="https://hacker.house" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">https://hacker.house</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;