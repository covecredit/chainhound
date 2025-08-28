import React, { useState, useEffect } from "react";
import { 
  Search, 
  Code, 
  Play, 
  AlertTriangle, 
  Shield, 
  Zap, 
  FileText, 
  Copy,
  Check,
  Download,
  Upload,
  Settings,
  Eye,
  EyeOff
} from "lucide-react";
import { useWeb3Context } from "../contexts/Web3Context";
import { 
  smartContractAnalyzer, 
  ContractAnalysis, 
  EmulationResult,
  FunctionSignature 
} from "../services/SmartContractAnalyzer";

const SmartContractAuditor: React.FC = () => {
  const { web3 } = useWeb3Context();
  const [contractAddress, setContractAddress] = useState("");
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'decompiler' | 'emulator' | 'vulnerabilities'>('overview');
  const [emulationInput, setEmulationInput] = useState("");
  const [emulationValue, setEmulationValue] = useState("0x0");
  const [emulationGasLimit, setEmulationGasLimit] = useState(1000000);
  const [emulationResult, setEmulationResult] = useState<EmulationResult | null>(null);
  const [isEmulating, setIsEmulating] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState<FunctionSignature | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const analyzeContract = async () => {
    if (!web3 || !contractAddress) return;

    setIsAnalyzing(true);
    try {
      const result = await smartContractAnalyzer.analyzeContract(web3, contractAddress);
      setAnalysis(result);
      setActiveTab('overview');
    } catch (error) {
      console.error('Error analyzing contract:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const emulateFunction = async () => {
    if (!analysis || !selectedFunction) return;

    setIsEmulating(true);
    try {
      const result = await smartContractAnalyzer.emulateExecution(
        analysis.bytecode,
        emulationInput,
        emulationValue,
        emulationGasLimit
      );
      setEmulationResult(result);
    } catch (error) {
      console.error('Error emulating function:', error);
    } finally {
      setIsEmulating(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200';
      case 'HIGH': return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200';
      case 'LOW': return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <AlertTriangle className="w-4 h-4" />;
      case 'HIGH': return <AlertTriangle className="w-4 h-4" />;
      case 'MEDIUM': return <Shield className="w-4 h-4" />;
      case 'LOW': return <Eye className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="bg-gray-800 rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Code className="h-8 w-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Smart Contract Auditor</h1>
              <p className="text-gray-400">Decompile, analyze, and emulate smart contracts</p>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  placeholder="Enter contract address (0x...)"
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && analyzeContract()}
                />
              </div>
            </div>
            <button
              onClick={analyzeContract}
              disabled={isAnalyzing || !contractAddress}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-white font-medium transition-colors flex items-center space-x-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>Analyze Contract</span>
                </>
              )}
            </button>
          </div>
        </div>

        {analysis && (
          <>
            {/* Tabs */}
            <div className="border-b border-gray-700">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'overview', label: 'Overview', icon: Eye },
                  { id: 'decompiler', label: 'Decompiler', icon: Code },
                  { id: 'emulator', label: 'Emulator', icon: Play },
                  { id: 'vulnerabilities', label: 'Vulnerabilities', icon: AlertTriangle }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-2">Contract Info</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Address:</span>
                          <span className="text-white font-mono">{analysis.address}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Type:</span>
                          <span className="text-green-400">Smart Contract</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Bytecode Size:</span>
                          <span className="text-white">{(analysis.bytecode.length - 2) / 2} bytes</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-2">Functions</h3>
                      <div className="space-y-2">
                        {analysis.functionSignatures?.length ? (
                          analysis.functionSignatures.map((func, index) => (
                            <div key={index} className="text-sm">
                              <div className="text-blue-400 font-mono">{func.name}</div>
                              <div className="text-gray-400 text-xs">{func.signature}</div>
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400 text-sm">No functions detected</div>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-2">Security</h3>
                      <div className="space-y-2">
                        {analysis.vulnerabilities?.length ? (
                          <div className="text-red-400 text-sm">
                            {analysis.vulnerabilities.length} vulnerabilities found
                          </div>
                        ) : (
                          <div className="text-green-400 text-sm">No vulnerabilities detected</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {analysis.highLevelCode && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">High-Level Code</h3>
                        <button
                          onClick={() => copyToClipboard(analysis.highLevelCode!, 'High-level code')}
                          className="flex items-center space-x-2 px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm text-white transition-colors"
                        >
                          {copiedText === 'High-level code' ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          <span>Copy</span>
                        </button>
                      </div>
                      <pre className="bg-gray-800 rounded p-4 text-sm text-green-400 overflow-x-auto">
                        <code>{analysis.highLevelCode}</code>
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Decompiler Tab */}
              {activeTab === 'decompiler' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Decompiled Bytecode</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => copyToClipboard(analysis.decompiledCode!, 'Decompiled code')}
                        className="flex items-center space-x-2 px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm text-white transition-colors"
                      >
                        {copiedText === 'Decompiled code' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        <span>Copy</span>
                      </button>
                      <button className="flex items-center space-x-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white transition-colors">
                        <Download className="h-4 w-4" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 rounded-lg p-4">
                    <pre className="bg-gray-800 rounded p-4 text-sm text-yellow-400 overflow-x-auto max-h-96 overflow-y-auto">
                      <code>{analysis.decompiledCode}</code>
                    </pre>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-white mb-2">Raw Bytecode</h4>
                    <pre className="bg-gray-800 rounded p-4 text-sm text-gray-300 overflow-x-auto max-h-32 overflow-y-auto">
                      <code>{analysis.bytecode}</code>
                    </pre>
                  </div>
                </div>
              )}

              {/* Emulator Tab */}
              {activeTab === 'emulator' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Input Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Function Call</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Select Function
                        </label>
                        <select
                          value={selectedFunction?.selector || ''}
                          onChange={(e) => {
                            const func = analysis.functionSignatures?.find(f => f.selector === e.target.value);
                            setSelectedFunction(func || null);
                            if (func) {
                              setEmulationInput(func.selector);
                            }
                          }}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="">Select a function...</option>
                          {analysis.functionSignatures?.map((func, index) => (
                            <option key={index} value={func.selector}>
                              {func.name} - {func.signature}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Function Input (hex)
                        </label>
                        <input
                          type="text"
                          value={emulationInput}
                          onChange={(e) => setEmulationInput(e.target.value)}
                          placeholder="0x..."
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Value (ETH)
                        </label>
                        <input
                          type="text"
                          value={emulationValue}
                          onChange={(e) => setEmulationValue(e.target.value)}
                          placeholder="0x0"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Gas Limit
                        </label>
                        <input
                          type="number"
                          value={emulationGasLimit}
                          onChange={(e) => setEmulationGasLimit(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <button
                        onClick={emulateFunction}
                        disabled={isEmulating || !emulationInput}
                        className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-white font-medium transition-colors flex items-center justify-center space-x-2"
                      >
                        {isEmulating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Emulating...</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            <span>Run Emulation</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Results Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Emulation Results</h3>
                      
                      {emulationResult ? (
                        <div className="bg-gray-700 rounded-lg p-4 space-y-4">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${emulationResult.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className={`font-medium ${emulationResult.success ? 'text-green-400' : 'text-red-400'}`}>
                              {emulationResult.success ? 'Success' : 'Failed'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Gas Used:</span>
                              <div className="text-white font-mono">{emulationResult.gasUsed.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-gray-400">Return Value:</span>
                              <div className="text-white font-mono text-xs break-all">{emulationResult.returnValue}</div>
                            </div>
                          </div>

                          {emulationResult.error && (
                            <div className="bg-red-900 border border-red-700 rounded p-3">
                              <div className="text-red-400 font-medium mb-1">Error:</div>
                              <div className="text-red-300 text-sm">{emulationResult.error}</div>
                            </div>
                          )}

                          {emulationResult.logs && emulationResult.logs.length > 0 && (
                            <div>
                              <div className="text-gray-400 font-medium mb-2">Logs:</div>
                              <div className="bg-gray-800 rounded p-3 max-h-32 overflow-y-auto">
                                {emulationResult.logs.map((log, index) => (
                                  <div key={index} className="text-xs text-gray-300 mb-1">
                                    {JSON.stringify(log, null, 2)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-gray-700 rounded-lg p-4 text-center text-gray-400">
                          Run emulation to see results
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Vulnerabilities Tab */}
              {activeTab === 'vulnerabilities' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Security Analysis</h3>
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-400 text-sm">
                        {analysis.vulnerabilities?.length || 0} vulnerabilities found
                      </span>
                    </div>
                  </div>

                  {analysis.vulnerabilities && analysis.vulnerabilities.length > 0 ? (
                    <div className="space-y-4">
                      {analysis.vulnerabilities.map((vuln, index) => (
                        <div key={index} className="bg-gray-700 rounded-lg p-4 border-l-4 border-red-500">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              {getSeverityIcon(vuln.severity)}
                              <div>
                                <h4 className="text-white font-semibold">{vuln.type}</h4>
                                <p className="text-gray-300 text-sm mt-1">{vuln.description}</p>
                                {vuln.code && (
                                  <pre className="text-xs text-gray-400 mt-2 bg-gray-800 rounded p-2">
                                    <code>{vuln.code}</code>
                                  </pre>
                                )}
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(vuln.severity)}`}>
                              {vuln.severity}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-700 rounded-lg p-8 text-center">
                      <Shield className="h-12 w-12 text-green-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">No Vulnerabilities Detected</h3>
                      <p className="text-gray-400">
                        The contract appears to be secure based on our analysis.
                      </p>
                    </div>
                  )}

                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-white mb-2">Security Recommendations</h4>
                    <ul className="text-gray-300 text-sm space-y-2">
                      <li>• Always use SafeMath for arithmetic operations</li>
                      <li>• Implement reentrancy guards for external calls</li>
                      <li>• Validate all external inputs</li>
                      <li>• Use proper access control mechanisms</li>
                      <li>• Consider gas optimization techniques</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SmartContractAuditor;
