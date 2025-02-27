import React, { useState } from 'react';
import { AlertTriangle, Shield, ExternalLink, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface Threat {
  id: string;
  name: string;
  category: 'social' | 'technical' | 'hybrid';
  severity: 'high' | 'medium' | 'low';
  description: string;
  indicators: string[];
  mitigations: string[];
  examples?: string[];
}

const ThreatManager: React.FC = () => {
  const [expandedThreat, setExpandedThreat] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  
  const threats: Threat[] = [
    {
      id: 'address-poisoning',
      name: 'Address History Poisoning',
      category: 'technical',
      severity: 'high',
      description: 'Address history poisoning is an attack where malicious actors send multiple small-value transactions to a target wallet from addresses that closely resemble legitimate addresses the victim has previously interacted with. When the victim later reviews their transaction history to copy a previously used address, they might inadvertently copy one of these similar-looking malicious addresses instead.',
      indicators: [
        'Multiple low-value transactions (typically 0.0001 ETH or less)',
        'Sender addresses that closely resemble legitimate addresses',
        'Transactions that serve no apparent purpose',
        'Addresses that differ by only a few characters from legitimate addresses'
      ],
      mitigations: [
        'Always verify the full address before sending transactions',
        'Use address book features in wallets to save trusted addresses',
        'Enable address verification features in wallet software',
        'Never copy addresses directly from transaction history',
        'Use hardware wallets with display screens to verify recipient addresses'
      ],
      examples: [
        '0x0fa09c3a328792253f8dee7116848723b72a6d2e vs 0x0fa09c3a328792253f8dee7116848723b72a6d2f (differs by last character)',
        '0xdfd5293d8e347dfe59e90efd55b2956a1343963d vs 0xdfd5293d8e347dfe59e90efd55b2956a1343963e (differs by last character)'
      ]
    },
    {
      id: 'phishing',
      name: 'Phishing Attacks',
      category: 'social',
      severity: 'high',
      description: 'Phishing attacks involve creating fake websites, emails, or messages that impersonate legitimate cryptocurrency services to trick users into revealing private keys, seed phrases, or approving malicious transactions.',
      indicators: [
        'Unsolicited messages or emails about cryptocurrency',
        'Urgent requests requiring immediate action',
        'Slight variations in domain names or URLs',
        'Requests for private keys or seed phrases',
        'Promises of free tokens or airdrops'
      ],
      mitigations: [
        'Never share private keys or seed phrases with anyone',
        'Verify website URLs carefully before connecting wallets',
        'Use hardware wallets for additional security',
        'Enable two-factor authentication where available',
        'Be skeptical of unsolicited messages and offers'
      ]
    },
    {
      id: 'approval-phishing',
      name: 'Token Approval Phishing',
      category: 'hybrid',
      severity: 'high',
      description: 'Attackers trick users into approving malicious smart contracts to spend their tokens. Once approved, the attacker can drain the victim\'s wallet of the approved tokens at any time.',
      indicators: [
        'Requests to approve token spending without clear purpose',
        'Unlimited token approvals',
        'Suspicious dApps requesting approvals',
        'Approvals for recently created or unverified contracts'
      ],
      mitigations: [
        'Review all approval requests carefully',
        'Set spending limits when approving tokens',
        'Use tools to monitor and revoke token approvals',
        'Only interact with verified dApps and contracts',
        'Regularly audit and revoke unnecessary approvals'
      ]
    },
    {
      id: 'fake-tokens',
      name: 'Fake Token Scams',
      category: 'technical',
      severity: 'medium',
      description: 'Scammers create tokens with names similar to legitimate projects or airdrop worthless tokens to wallets. When victims try to sell these tokens, they interact with malicious contracts that steal their funds.',
      indicators: [
        'Unexpected tokens appearing in wallet',
        'Tokens with names similar to popular projects',
        'Tokens requiring approval to sell',
        'Websites requiring connection to swap the tokens'
      ],
      mitigations: [
        'Research tokens thoroughly before interacting with them',
        'Ignore unexpected airdrops',
        'Use separate wallets for different activities',
        'Never connect your wallet to unknown websites to sell suspicious tokens'
      ]
    },
    {
      id: 'sim-swapping',
      name: 'SIM Swapping',
      category: 'social',
      severity: 'high',
      description: 'Attackers use social engineering to convince mobile carriers to transfer a victim\'s phone number to a SIM card they control, allowing them to bypass SMS-based two-factor authentication and access cryptocurrency accounts.',
      indicators: [
        'Sudden loss of mobile service',
        'Unexpected two-factor authentication requests',
        'Unauthorized account access notifications',
        'Password reset emails you didn\'t request'
      ],
      mitigations: [
        'Use authentication apps instead of SMS for 2FA',
        'Add a PIN or password to your mobile account',
        'Use hardware security keys where possible',
        'Consider using a dedicated phone number for financial accounts'
      ]
    },
    {
      id: 'malicious-signatures',
      name: 'Malicious Message Signatures',
      category: 'technical',
      severity: 'high',
      description: 'Attackers trick users into signing seemingly harmless messages that actually authorize transactions or approvals that can drain their wallets.',
      indicators: [
        'Requests to sign messages without clear purpose',
        'Complex or obfuscated message content',
        'Signature requests from unfamiliar dApps',
        'Messages containing transaction data'
      ],
      mitigations: [
        'Only sign messages from trusted sources',
        'Read the full content of messages before signing',
        'Be wary of messages containing hexadecimal data',
        'Use hardware wallets that display signature contents'
      ]
    },
    {
      id: 'clipboard-hijacking',
      name: 'Clipboard Hijacking',
      category: 'technical',
      severity: 'medium',
      description: 'Malware that monitors the clipboard for cryptocurrency addresses and replaces them with attacker-controlled addresses when users copy and paste addresses for transactions.',
      indicators: [
        'Addresses changing after copying and pasting',
        'Transactions sent to unexpected addresses',
        'Unusual system behavior when copying addresses'
      ],
      mitigations: [
        'Always verify the full address after pasting',
        'Use address book features in wallets',
        'Scan for malware regularly',
        'Consider using a hardware wallet'
      ]
    },
    {
      id: 'fake-support',
      name: 'Fake Support Scams',
      category: 'social',
      severity: 'medium',
      description: 'Scammers pose as customer support for cryptocurrency exchanges or wallet services, offering to help with issues but actually attempting to steal private information or funds.',
      indicators: [
        'Unsolicited offers of help via direct message',
        'Support representatives contacting you first',
        'Requests for remote access to your device',
        'Requests for private keys or seed phrases'
      ],
      mitigations: [
        'Only contact support through official channels',
        'Never share private keys or seed phrases',
        'Be skeptical of anyone offering unsolicited help',
        'Verify the identity of support personnel'
      ]
    },
    {
      id: 'rugpulls',
      name: 'Rug Pulls',
      category: 'hybrid',
      severity: 'high',
      description: 'Project developers abandon a project and run away with investor funds, often after artificially inflating the price of the project\'s tokens.',
      indicators: [
        'Anonymous team members',
        'Unrealistic promises or returns',
        'Limited technical documentation',
        'Locked liquidity for short periods',
        'Highly concentrated token ownership'
      ],
      mitigations: [
        'Research projects thoroughly before investing',
        'Check token distribution and liquidity locks',
        'Verify team identities and backgrounds',
        'Start with small investments in new projects',
        'Be wary of projects with excessive hype'
      ]
    }
  ];
  
  const toggleThreat = (id: string) => {
    setExpandedThreat(expandedThreat === id ? null : id);
  };
  
  const filteredThreats = threats.filter(threat => {
    const matchesSearch = threat.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          threat.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || threat.category === categoryFilter;
    const matchesSeverity = severityFilter === 'all' || threat.severity === severityFilter;
    
    return matchesSearch && matchesCategory && matchesSeverity;
  });
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-900/30 text-red-400 border-red-700/30';
      case 'medium':
        return 'bg-yellow-900/30 text-yellow-400 border-yellow-700/30';
      case 'low':
        return 'bg-green-900/30 text-green-400 border-green-700/30';
      default:
        return 'bg-gray-900/30 text-gray-400 border-gray-700/30';
    }
  };
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'social':
        return 'bg-blue-900/30 text-blue-400 border-blue-700/30';
      case 'technical':
        return 'bg-purple-900/30 text-purple-400 border-purple-700/30';
      case 'hybrid':
        return 'bg-indigo-900/30 text-indigo-400 border-indigo-700/30';
      default:
        return 'bg-gray-900/30 text-gray-400 border-gray-700/30';
    }
  };
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Blockchain Threat Manager
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Learn about common blockchain threats and how to protect yourself
        </p>
      </div>
      
      <div className="p-4 border-b border-gray-700 bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search threats..."
                className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm pl-10 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-500" />
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500"
            >
              <option value="all">All Categories</option>
              <option value="social">Social Engineering</option>
              <option value="technical">Technical</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Severity
            </label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500"
            >
              <option value="all">All Severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="space-y-4">
          {filteredThreats.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No threats found matching your filters</p>
            </div>
          ) : (
            filteredThreats.map(threat => (
              <div 
                key={threat.id} 
                className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden"
              >
                <div 
                  className="p-4 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleThreat(threat.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${getSeverityColor(threat.severity)}`}>
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-md font-medium text-white">{threat.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getCategoryColor(threat.category)}`}>
                          {threat.category === 'social' ? 'Social Engineering' : 
                           threat.category === 'technical' ? 'Technical' : 'Hybrid'}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getSeverityColor(threat.severity)}`}>
                          {threat.severity.charAt(0).toUpperCase() + threat.severity.slice(1)} Severity
                        </span>
                      </div>
                    </div>
                  </div>
                  {expandedThreat === threat.id ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                
                {expandedThreat === threat.id && (
                  <div className="p-4 border-t border-gray-700">
                    <p className="text-gray-300 mb-4">{threat.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          Warning Signs
                        </h4>
                        <ul className="space-y-1 text-sm">
                          {threat.indicators.map((indicator, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-red-500 mt-1">•</span>
                              <span className="text-gray-300">{indicator}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-1">
                          <Shield className="h-4 w-4 text-green-500" />
                          Protection Measures
                        </h4>
                        <ul className="space-y-1 text-sm">
                          {threat.mitigations.map((mitigation, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-green-500 mt-1">•</span>
                              <span className="text-gray-300">{mitigation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    {threat.examples && threat.examples.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-white mb-2">Examples</h4>
                        <div className="bg-gray-800 p-3 rounded-md">
                          <ul className="space-y-1 text-sm">
                            {threat.examples.map((example, index) => (
                              <li key={index} className="text-gray-300 font-mono">{example}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4 flex justify-end">
                      <a 
                        href={`https://www.google.com/search?q=blockchain+${threat.name.replace(/\s+/g, '+')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        Learn more
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ThreatManager;