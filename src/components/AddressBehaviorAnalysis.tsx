import React, { useState, useEffect } from 'react';
import { BarChart, PieChart, Shield, AlertTriangle, Clock, ArrowDownUp, Activity, Users, FileText, Download } from 'lucide-react';
import Web3Service from '../services/web3Service';
import { Transaction } from '../types/transaction';
import { EventLog } from '../types/event';
import AddressLabel from './AddressLabel';

interface AddressBehaviorAnalysisProps {
  address: string;
  providerUrl?: string;
}

interface BehaviorMetrics {
  totalTransactions: number;
  incomingCount: number;
  outgoingCount: number;
  uniqueContacts: number;
  contractInteractions: number;
  averageValue: number;
  largestTransaction: number;
  activityByTime: Record<string, number>;
  trustScore: number;
  riskFactors: string[];
  lastActivity: number;
  firstActivity: number;
  historyPoisoningRisk: {
    detected: boolean;
    similarAddresses: string[];
    lowValueTxCount: number;
  };
}

const AddressBehaviorAnalysis: React.FC<AddressBehaviorAnalysisProps> = ({
  address,
  providerUrl = 'https://eth.llamarpc.com'
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [metrics, setMetrics] = useState<BehaviorMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('month');
  
  const web3Service = new Web3Service(providerUrl);
  
  useEffect(() => {
    fetchData();
  }, [address, timeRange]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch transactions (get more to have better analysis)
      const txs = await web3Service.getAddressTransactions(address, 100);
      setTransactions(txs);
      
      // Check if address is a contract
      const isContract = await web3Service.isContract(address);
      
      // If it's a contract, fetch events
      let eventLogs: EventLog[] = [];
      if (isContract) {
        eventLogs = await web3Service.getContractEvents(address);
        setEvents(eventLogs);
      }
      
      // Calculate behavior metrics
      calculateMetrics(txs, eventLogs, isContract);
    } catch (err) {
      console.error('Error fetching address behavior data:', err);
      setError('Failed to analyze address behavior. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const calculateMetrics = (txs: Transaction[], eventLogs: EventLog[], isContract: boolean) => {
    // Filter transactions by time range if needed
    const filteredTxs = filterByTimeRange(txs);
    
    // Basic transaction metrics
    const incomingTxs = filteredTxs.filter(tx => tx.to.toLowerCase() === address.toLowerCase());
    const outgoingTxs = filteredTxs.filter(tx => tx.from.toLowerCase() === address.toLowerCase());
    
    // Unique addresses interacted with
    const contacts = new Set<string>();
    filteredTxs.forEach(tx => {
      if (tx.from.toLowerCase() !== address.toLowerCase()) {
        contacts.add(tx.from.toLowerCase());
      }
      if (tx.to.toLowerCase() !== address.toLowerCase()) {
        contacts.add(tx.to.toLowerCase());
      }
    });
    
    // Contract interactions
    const contractInteractions = outgoingTxs.filter(tx => {
      // This is a simplified check - in a real app, you'd check if the destination is a contract
      return tx.to.toLowerCase() !== address.toLowerCase();
    }).length;
    
    // Transaction values
    const values = filteredTxs.map(tx => parseFloat(tx.value) / 1e18);
    const totalValue = values.reduce((sum, val) => sum + val, 0);
    const averageValue = values.length > 0 ? totalValue / values.length : 0;
    const largestTransaction = Math.max(...values, 0);
    
    // Activity by time
    const activityByTime: Record<string, number> = {};
    filteredTxs.forEach(tx => {
      const date = new Date(Number(tx.timestamp) * 1000);
      const hour = date.getHours();
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      
      if (!activityByTime[timeSlot]) {
        activityByTime[timeSlot] = 0;
      }
      activityByTime[timeSlot]++;
    });
    
    // Find first and last activity
    const timestamps = filteredTxs.map(tx => Number(tx.timestamp));
    const firstActivity = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const lastActivity = timestamps.length > 0 ? Math.max(...timestamps) : 0;
    
    // Check for address history poisoning
    const historyPoisoningRisk = detectAddressHistoryPoisoning(filteredTxs);
    
    // Calculate risk factors
    const riskFactors: string[] = [];
    
    // Check for high-value transactions
    if (largestTransaction > 10) {
      riskFactors.push('High-value transactions detected');
    }
    
    // Check for unusual activity patterns
    const hourlyDistribution = Object.values(activityByTime);
    const maxHourlyActivity = Math.max(...hourlyDistribution, 0);
    const avgHourlyActivity = hourlyDistribution.reduce((sum, val) => sum + val, 0) / 
                             (hourlyDistribution.length || 1);
    
    if (maxHourlyActivity > avgHourlyActivity * 3) {
      riskFactors.push('Unusual activity spikes detected');
    }
    
    // Check for address history poisoning
    if (historyPoisoningRisk.detected) {
      riskFactors.push('Potential address history poisoning attack detected');
    }
    
    // Check for interactions with known suspicious addresses
    const suspiciousAddresses = [
      '0xfa09c3a328792253f8dee7116848723b72a6d2ea',
      '0x0fa09c3a328792253f8dee7116848723b72a6d2e', // Bybit hacker address
      '0xdfd5293d8e347dfe59e90efd55b2956a1343963d',
      '0x21a31ee1afc51d94c2efccaa2092ad1028285549'
    ];
    
    // Check if this address is the Bybit hacker address
    if (address.toLowerCase() === '0x0fa09c3a328792253f8dee7116848723b72a6d2e'.toLowerCase() ||
        address.toLowerCase() === '0xfa09c3a328792253f8dee7116848723b72a6d2ea'.toLowerCase()) {
      riskFactors.push('Address identified as Bybit hack perpetrator');
      riskFactors.push('Associated with theft of over $1.4B in cryptocurrency');
      riskFactors.push('High-risk malicious actor');
    }
    
    // Check if this address is the cross-chain bridge used in the Bybit hack
    if (address.toLowerCase() === '0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516'.toLowerCase()) {
      riskFactors.push('Contract used in the Bybit hack');
      riskFactors.push('Associated with laundering of stolen funds');
      riskFactors.push('Cross-chain bridge with suspicious transaction patterns');
    }
    
    // Check for interactions with suspicious addresses
    const hasSuspiciousInteractions = filteredTxs.some(tx => 
      suspiciousAddresses.includes(tx.from.toLowerCase()) || 
      suspiciousAddresses.includes(tx.to.toLowerCase())
    );
    
    if (hasSuspiciousInteractions) {
      riskFactors.push('Interactions with known suspicious addresses detected');
    }
    
    // Check for cross-chain activity (potential money laundering)
    const hasMultipleChains = new Set(filteredTxs.map(tx => tx.blockchain)).size > 1;
    if (hasMultipleChains) {
      riskFactors.push('Cross-chain activity detected (potential money laundering)');
    }
    
    // Calculate trust score (0-100)
    // This is a simplified algorithm - a real one would be more sophisticated
    let trustScore = 100;
    
    // Deduct points for risk factors
    trustScore -= riskFactors.length * 15;
    
    // Adjust based on transaction history
    if (filteredTxs.length < 5) {
      trustScore -= 10; // New address with little history
    }
    
    // Adjust based on contract interactions
    if (isContract) {
      // Contracts are generally more trusted if they have many interactions
      trustScore += 5;
    }
    
    // Adjust based on activity consistency
    const activityConsistency = avgHourlyActivity / (maxHourlyActivity || 1);
    trustScore += Math.round(activityConsistency * 10);
    
    // Adjust for address history poisoning
    if (historyPoisoningRisk.detected) {
      trustScore -= 25;
    }
    
    // Special case for known malicious addresses
    if (address.toLowerCase() === '0x0fa09c3a328792253f8dee7116848723b72a6d2e'.toLowerCase() ||
        address.toLowerCase() === '0xfa09c3a328792253f8dee7116848723b72a6d2ea'.toLowerCase() ||
        address.toLowerCase() === '0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516'.toLowerCase()) {
      trustScore = 0; // Zero trust for known malicious addresses
    }
    
    // Ensure score is within 0-100 range
    trustScore = Math.max(0, Math.min(100, trustScore));
    
    setMetrics({
      totalTransactions: filteredTxs.length,
      incomingCount: incomingTxs.length,
      outgoingCount: outgoingTxs.length,
      uniqueContacts: contacts.size,
      contractInteractions,
      averageValue,
      largestTransaction,
      activityByTime,
      trustScore,
      riskFactors,
      lastActivity,
      firstActivity,
      historyPoisoningRisk
    });
  };
  
  // Filter transactions by time range
  const filterByTimeRange = (txs: Transaction[]): Transaction[] => {
    if (timeRange === 'all') return txs;
    
    const now = Math.floor(Date.now() / 1000);
    let cutoffTime: number;
    
    switch (timeRange) {
      case 'week':
        cutoffTime = now - 7 * 24 * 60 * 60; // 7 days
        break;
      case 'month':
        cutoffTime = now - 30 * 24 * 60 * 60; // 30 days
        break;
      case 'year':
        cutoffTime = now - 365 * 24 * 60 * 60; // 365 days
        break;
      default:
        cutoffTime = 0;
    }
    
    return txs.filter(tx => Number(tx.timestamp) >= cutoffTime);
  };
  
  // Detect address history poisoning
  const detectAddressHistoryPoisoning = (txs: Transaction[]) => {
    const incomingTxs = txs.filter(tx => tx.to.toLowerCase() === address.toLowerCase());
    const result = {
      detected: false,
      similarAddresses: [] as string[],
      lowValueTxCount: 0
    };
    
    // Check for low value transactions (less than 0.001 ETH)
    const lowValueTxs = incomingTxs.filter(tx => parseFloat(tx.value) / 1e18 < 0.001);
    result.lowValueTxCount = lowValueTxs.length;
    
    // If there are many low value transactions, check for similar addresses
    if (lowValueTxs.length >= 3) {
      // Get all unique sender addresses
      const senders = [...new Set(lowValueTxs.map(tx => tx.from.toLowerCase()))];
      
      // Check for similar addresses (addresses that differ by only a few characters)
      const similarAddresses: string[] = [];
      
      for (let i = 0; i < senders.length; i++) {
        for (let j = i + 1; j < senders.length; j++) {
          const address1 = senders[i];
          const address2 = senders[j];
          
          // Calculate how many characters are different
          let diffCount = 0;
          for (let k = 0; k < address1.length; k++) {
            if (address1[k] !== address2[k]) {
              diffCount++;
            }
          }
          
          // If addresses are very similar (differ by 4 or fewer characters)
          if (diffCount > 0 && diffCount <= 4) {
            if (!similarAddresses.includes(address1)) similarAddresses.push(address1);
            if (!similarAddresses.includes(address2)) similarAddresses.push(address2);
          }
        }
      }
      
      result.similarAddresses = similarAddresses;
      result.detected = similarAddresses.length >= 2;
    }
    
    return result;
  };
  
  // Format timestamp to readable date
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };
  
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Address Behavior Analysis
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Analyzing behavior for <AddressLabel address={address} showEdit={false} />
          </p>
        </div>
        
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-600 border-t-blue-600 mb-2"></div>
          <p className="text-gray-400">Analyzing address behavior...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Address Behavior Analysis
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Error analyzing <AddressLabel address={address} showEdit={false} />
          </p>
        </div>
        
        <div className="p-8 text-center text-red-400">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  if (!metrics) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Address Behavior Analysis
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            No data available for <AddressLabel address={address} showEdit={false} />
          </p>
        </div>
        
        <div className="p-8 text-center text-gray-400">
          <p>No transaction data available to analyze.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Address Behavior Analysis
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Analyzing behavior for <AddressLabel address={address} showEdit={false} />
            </p>
          </div>
          <div>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-1 text-sm text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="year">Past Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {/* Trust Score */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-3">Trust Score</h3>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield className={`h-5 w-5 ${
                  metrics.trustScore > 70 ? 'text-green-500' : 
                  metrics.trustScore > 40 ? 'text-yellow-500' : 
                  'text-red-500'
                }`} />
                <span className="text-lg font-bold text-white">{metrics.trustScore}/100</span>
              </div>
              <div className={`px-2 py-1 rounded text-sm ${
                metrics.trustScore > 70 ? 'bg-green-900/30 text-green-400' : 
                metrics.trustScore > 40 ? 'bg-yellow-900/30 text-yellow-400' : 
                'bg-red-900/30 text-red-400'
              }`}>
                {metrics.trustScore > 70 ? 'Low Risk' : 
                 metrics.trustScore > 40 ? 'Medium Risk' : 
                 'High Risk'}
              </div>
            </div>
            
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${
                  metrics.trustScore > 70 ? 'bg-green-500' : 
                  metrics.trustScore > 40 ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`} 
                style={{ width: `${metrics.trustScore}%` }}
              ></div>
            </div>
            
            {metrics.riskFactors.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-white mb-2">Risk Factors:</h4>
                <ul className="space-y-1">
                  {metrics.riskFactors.map((factor, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        {/* Address History Poisoning Warning */}
        {metrics.historyPoisoningRisk.detected && (
          <div className="mb-6">
            <div className="bg-red-900/20 border-l-4 border-red-600 p-4 rounded-r-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-md font-medium text-red-400">Address History Poisoning Detected</h3>
                  <div className="mt-2 text-sm text-gray-300">
                    <p className="mb-2">
                      This address has received multiple low-value transactions ({metrics.historyPoisoningRisk.lowValueTxCount} transactions) 
                      from similar-looking addresses. This is a common pattern in address history poisoning attacks.
                    </p>
                    <p>
                      Attackers send small amounts from addresses that look similar to legitimate addresses you've interacted with. 
                      When you later check your transaction history to copy an address, you might accidentally copy the attacker's 
                      similar-looking address instead.
                    </p>
                    
                    {metrics.historyPoisoningRisk.similarAddresses.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-white mb-1">Similar Addresses Detected:</h4>
                        <div className="bg-gray-800 p-2 rounded max-h-32 overflow-y-auto">
                          {metrics.historyPoisoningRisk.similarAddresses.map((addr, index) => (
                            <div key={index} className="text-xs font-mono text-gray-400 mb-1">
                              {addr}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Transaction Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Transaction Activity</h3>
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Total Transactions</div>
                  <div className="text-xl font-bold text-white">{metrics.totalTransactions}</div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Unique Contacts</div>
                  <div className="text-xl font-bold text-white">{metrics.uniqueContacts}</div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Incoming</div>
                  <div className="text-xl font-bold text-green-400">{metrics.incomingCount}</div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Outgoing</div>
                  <div className="text-xl font-bold text-red-400">{metrics.outgoingCount}</div>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex justify-between items-center mb-1">
                  <div className="text-sm text-gray-400">First Activity</div>
                  <div className="text-sm text-gray-300">{formatTimestamp(metrics.firstActivity)}</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-400">Last Activity</div>
                  <div className="text-sm text-gray-300">{formatTimestamp(metrics.lastActivity)}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Value Analysis</h3>
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Average Value</div>
                  <div className="text-xl font-bold text-white">{metrics.averageValue.toFixed(4)} ETH</div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Largest Transaction</div>
                  <div className="text-xl font-bold text-white">{metrics.largestTransaction.toFixed(4)} ETH</div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg col-span-2">
                  <div className="text-sm text-gray-400 mb-1">Contract Interactions</div>
                  <div className="text-xl font-bold text-white">{metrics.contractInteractions}</div>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="text-sm text-gray-400 mb-2">Transaction Value Distribution</div>
                <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-red-500" style={{ width: '100%' }}></div>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500">Small</span>
                  <span className="text-xs text-gray-500">Large</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Activity Patterns */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-3">Activity Patterns</h3>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="text-sm text-gray-400 mb-2">Activity by Hour of Day</div>
            <div className="h-40 flex items-end">
              {Array.from({ length: 24 }).map((_, hour) => {
                const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
                const count = metrics.activityByTime[timeSlot] || 0;
                const maxCount = Math.max(...Object.values(metrics.activityByTime), 1);
                const height = count > 0 ? (count / maxCount) * 100 : 0;
                
                return (
                  <div key={hour} className="flex-1 flex flex-col items-center">
                    <div 
                      className={`w-full mx-0.5 ${count > 0 ? 'bg-blue-500' : 'bg-gray-700'}`} 
                      style={{ height: `${height}%` }}
                    ></div>
                    <div className="text-xs text-gray-500 mt-1">{hour}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Behavioral Insights */}
        <div>
          <h3 className="text-lg font-medium text-white mb-3">Behavioral Insights</h3>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Activity className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="text-md font-medium text-white">Transaction Pattern</h4>
                  <p className="text-sm text-gray-300">
                    {metrics.incomingCount > metrics.outgoingCount * 2 
                      ? 'This address primarily receives funds with limited outgoing transactions, suggesting it may be a storage or collection address.' 
                      : metrics.outgoingCount > metrics.incomingCount * 2
                      ? 'This address primarily sends funds with limited incoming transactions, suggesting it may be a distribution or spending address.'
                      : 'This address has a balanced pattern of incoming and outgoing transactions, suggesting regular activity.'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="text-md font-medium text-white">Temporal Pattern</h4>
                  <p className="text-sm text-gray-300">
                    {Object.keys(metrics.activityByTime).length < 5
                      ? 'Activity is concentrated during specific hours, which could indicate automated transactions or a user in a specific timezone.'
                      : 'Activity is distributed across many hours of the day, suggesting either global usage or non-time-dependent automated transactions.'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Users className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="text-md font-medium text-white">Interaction Pattern</h4>
                  <p className="text-sm text-gray-300">
                    {metrics.uniqueContacts < 5
                      ? 'This address interacts with a very limited number of other addresses, suggesting a focused or private usage pattern.'
                      : metrics.uniqueContacts > 20
                      ? 'This address interacts with many different addresses, suggesting it may be a high-activity account like an exchange or service.'
                      : 'This address has a moderate number of contacts, consistent with typical user behavior.'}
                  </p>
                </div>
              </div>
              
              {metrics.historyPoisoningRisk.detected && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="text-md font-medium text-white">Address History Poisoning</h4>
                    <p className="text-sm text-gray-300">
                      This address shows signs of being targeted by address history poisoning attacks. Be extremely careful when copying addresses from your transaction history.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressBehaviorAnalysis;