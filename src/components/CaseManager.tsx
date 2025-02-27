import React, { useState, useRef } from 'react';
import { 
  Folder, 
  FolderPlus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  FileText, 
  Download, 
  Upload,
  Tag,
  Clock,
  Check,
  Link,
  ExternalLink
} from 'lucide-react';
import { useCaseManager } from '../hooks/useCaseManager';
import { Case } from '../types/case';
import AddressLabel from './AddressLabel';

const CaseManager: React.FC = () => {
  const {
    cases,
    activeCase,
    createCase,
    deleteCase,
    setActive,
    exportCase,
    importCase,
    addAddress,
    addContract,
    removeAddress,
    removeContract,
    addTag,
    removeTag
  } = useCaseManager();
  
  const [showCreateCase, setShowCreateCase] = useState<boolean>(false);
  const [newCaseName, setNewCaseName] = useState<string>('');
  const [newCaseDescription, setNewCaseDescription] = useState<string>('');
  const [showImport, setShowImport] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState<string>('');
  const [newContract, setNewContract] = useState<string>('');
  const [newTag, setNewTag] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleCreateCase = () => {
    if (!newCaseName.trim()) return;
    
    createCase(newCaseName.trim(), newCaseDescription.trim());
    setNewCaseName('');
    setNewCaseDescription('');
    setShowCreateCase(false);
  };
  
  const handleExportCase = (caseId: string) => {
    const exportData = exportCase(caseId);
    if (!exportData) return;
    
    const { data, filename } = exportData;
    
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
  
  const handleImportClick = () => {
    setShowImport(true);
    setImportError(null);
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const success = importCase(content);
        
        if (success) {
          setShowImport(false);
          setImportError(null);
        } else {
          setImportError('Invalid case file format');
        }
      } catch (error) {
        setImportError('Error reading file');
        console.error('Error reading file:', error);
      }
    };
    
    reader.readAsText(file);
  };
  
  const handleAddAddress = () => {
    if (!activeCase || !newAddress.trim()) return;
    
    addAddress(newAddress.trim());
    setNewAddress('');
  };
  
  const handleAddContract = () => {
    if (!activeCase || !newContract.trim()) return;
    
    addContract(newContract.trim());
    setNewContract('');
  };
  
  const handleAddTag = () => {
    if (!activeCase || !newTag.trim()) return;
    
    addTag(newTag.trim());
    setNewTag('');
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  const shortenAddress = (addr: string) => {
    return `${addr.substring(0, 8)}...${addr.substring(addr.length - 6)}`;
  };
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Folder className="h-5 w-5 text-blue-500" />
            Case Manager
          </h2>
          <div className="flex items-center gap-2">
            <button 
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              onClick={() => setShowCreateCase(true)}
            >
              <FolderPlus className="h-4 w-4" />
              <span>New Case</span>
            </button>
            <button 
              className="flex items-center gap-1 px-3 py-1 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors"
              onClick={handleImportClick}
            >
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Manage your blockchain forensics cases
        </p>
      </div>
      
      {cases.length === 0 ? (
        <div className="p-8 text-center">
          <Folder className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No cases created yet</p>
          <button
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            onClick={() => setShowCreateCase(true)}
          >
            Create Your First Case
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 border-r border-gray-700">
            <div className="p-3 border-b border-gray-700 bg-gray-900">
              <h3 className="text-sm font-medium text-white">Cases</h3>
            </div>
            <div className="divide-y divide-gray-700 max-h-[400px] overflow-y-auto">
              {cases.map(caseItem => (
                <div 
                  key={caseItem.id} 
                  className={`p-3 cursor-pointer ${activeCase?.id === caseItem.id ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
                  onClick={() => setActive(caseItem.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-white">{caseItem.name}</h3>
                        {activeCase?.id === caseItem.id && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-900/50 text-blue-400">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">{caseItem.description}</p>
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(caseItem.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportCase(caseItem.id);
                        }}
                        className="p-1 text-gray-400 hover:text-white rounded"
                        title="Export case"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCase(caseItem.id);
                        }}
                        className="p-1 text-red-400 hover:text-red-300 rounded"
                        title="Delete case"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="md:col-span-2">
            {activeCase ? (
              <div>
                <div className="p-4 border-b border-gray-700 bg-gray-900">
                  <h3 className="text-lg font-medium text-white">{activeCase.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">{activeCase.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      <span>Created: {formatDate(activeCase.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <FileText className="h-3 w-3" />
                      <span>Notes: {activeCase.notes.length}</span>
                    </div>
                    {activeCase.tags.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Tag className="h-3 w-3" />
                        <span>{activeCase.tags.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-1">
                        <Link className="h-4 w-4 text-blue-500" />
                        Addresses
                      </h4>
                      <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            value={newAddress}
                            onChange={(e) => setNewAddress(e.target.value)}
                            placeholder="Add address (0x...)"
                            className="flex-1 rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-1 text-sm text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            onClick={handleAddAddress}
                            disabled={!newAddress.trim()}
                            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            Add
                          </button>
                        </div>
                        
                        {activeCase.addresses.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-2">No addresses added</p>
                        ) : (
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {activeCase.addresses.map(address => (
                              <div key={address} className="flex justify-between items-center bg-gray-800 p-2 rounded">
                                <div className="text-sm text-gray-300 truncate flex-1">
                                  <AddressLabel address={address} showEdit={false} />
                                </div>
                                <div className="flex items-center gap-1">
                                  <a
                                    href={`https://etherscan.io/address/${address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 text-gray-400 hover:text-blue-400 rounded"
                                    title="View on Etherscan"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                  <button
                                    onClick={() => removeAddress(address)}
                                    className="p-1 text-gray-400 hover:text-red-400 rounded"
                                    title="Remove address"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-1">
                        <FileText className="h-4 w-4 text-green-500" />
                        Contracts
                      </h4>
                      <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            value={newContract}
                            onChange={(e) => setNewContract(e.target.value)}
                            placeholder="Add contract (0x...)"
                            className="flex-1 rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-1 text-sm text-gray-200 focus:outline-none focus:ring-green-500 focus:border-green-500"
                          />
                          <button
                            onClick={handleAddContract}
                            disabled={!newContract.trim()}
                            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            Add
                          </button>
                        </div>
                        
                        {activeCase.contracts.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-2">No contracts added</p>
                        ) : (
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {activeCase.contracts.map(contract => (
                              <div key={contract} className="flex justify-between items-center bg-gray-800 p-2 rounded">
                                <div className="text-sm text-gray-300 truncate flex-1">
                                  {shortenAddress(contract)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <a
                                    href={`https://etherscan.io/address/${contract}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 text-gray-400 hover:text-blue-400 rounded"
                                    title="View on Etherscan"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                  <button
                                    onClick={() => removeContract(contract)}
                                    className="p-1 text-gray-400 hover:text-red-400 rounded"
                                    title="Remove contract"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-1">
                      <Tag className="h-4 w-4 text-yellow-500" />
                      Tags
                    </h4>
                    <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Add tag"
                          className="flex-1 rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-1 text-sm text-gray-200 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                        />
                        <button
                          onClick={handleAddTag}
                          disabled={!newTag.trim()}
                          className="px-3 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          Add
                        </button>
                      </div>
                      
                      {activeCase.tags.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-2">No tags added</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {activeCase.tags.map(tag => (
                            <div key={tag} className="flex items-center gap-1 px-2 py-1 bg-gray-800 rounded text-sm text-gray-300">
                              <span>{tag}</span>
                              <button
                                onClick={() => removeTag(tag)}
                                className="text-gray-400 hover:text-red-400"
                                title="Remove tag"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {activeCase.name === "ByBit Hacker" && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Case Overview
                      </h4>
                      <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                        <h5 className="text-md font-medium text-white mb-2">Analysis of the Smart Contract and Backdoor Mechanism</h5>
                        
                        <div className="space-y-3 text-sm text-gray-300">
                          <p>
                            This case involves the analysis of a smart contract and a backdoor mechanism used to drain funds from ByBit wallets. 
                            The backdoor code was found in the file <code>app-52c9031bfa03da47.js</code> on the Safe Global application.
                          </p>
                          
                          <h6 className="text-sm font-medium text-white mt-3">Backdoor Mechanism</h6>
                          <p>
                            The backdoor code defines a "whitelist" (wa) and "blacklist" (ba) of addresses. If a transaction matched an address in the whitelist, 
                            it redirected the transfer to smart contract "ta" (0x96221423681a6d52e184d440a8efcebb105c7242) using data stored in "da", 
                            sending funds to smart contract 0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516.
                          </p>
                          
                          <p>
                            This JS backdoor essentially allowed the attacker (likely DPRK-affiliated) to drain the ByBit wallet when the caller was 
                            0x0fa09C3A328792253f8dee7116848723b72a6d2e, effectively targeting only wallets from the "whitelist" while all other transactions were ignored.
                            The attacker specifically targeted ByBit.
                          </p>
                          
                          <div className="pl-3 border-l-2 border-gray-700 mt-3">
                            <p className="font-medium">Key Components of the Backdoor:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-2">
                              <li><strong>Whitelist (wa):</strong> List of target addresses to be drained</li>
                              <li><strong>Blacklist (ba):</strong> List of addresses to be ignored</li>
                              <li><strong>Transfer Address (ta):</strong> 0x96221423681a6d52e184d440a8efcebb105c7242</li>
                              <li><strong>Destination Address (da payload):</strong> Encoded function call to transfer funds to 0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516</li>
                              <li><strong>Attacker Address:</strong> 0x0fa09C3A328792253f8dee7116848723b72a6d2e</li>
                            </ul>
                          </div>
                          
                          <h6 className="text-sm font-medium text-white mt-3">Decoding the da Payload</h6>
                          <p>
                            The da payload is an encoded function call. Here's how it breaks down:
                          </p>
                          
                          <div className="pl-3 border-l-2 border-gray-700">
                            <p>Function Selector:</p>
                            <ul className="list-disc pl-5 space-y-1">
                              <li>The first 4 bytes (0xa9059cbb) represent the function selector for the transfer function in the ERC-20 token standard.</li>
                              <li>The transfer function has the following signature: transfer(address _to, uint256 _value).</li>
                            </ul>
                            
                            <p className="mt-2">Parameters:</p>
                            <ul className="list-disc pl-5 space-y-1">
                              <li>The next 32 bytes represent the _to address:
                                <div className="bg-gray-800 p-1 rounded font-mono text-xs mt-1">
                                  000000000000000000000000bdd077f651ebe7f7b3ce16fe5f2b025be2969516
                                </div>
                                This decodes to the address <span className="text-blue-400">0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516</span>.
                              </li>
                              <li>The following 32 bytes represent the _value (amount to transfer):
                                <div className="bg-gray-800 p-1 rounded font-mono text-xs mt-1">
                                  0000000000000000000000000000000000000000000000000000000000000000
                                </div>
                                This decodes to the value 0.
                              </li>
                            </ul>
                          </div>
                          
                          <h6 className="text-sm font-medium text-white mt-3">Attack Flow</h6>
                          <ol className="list-decimal pl-5 space-y-1 mt-2">
                            <li>User initiates a transaction on Safe Global app</li>
                            <li>If the user's address is in the whitelist, the backdoor activates</li>
                            <li>Transaction is redirected to contract 0x96221423681a6d52e184d440a8efcebb105c7242</li>
                            <li>Funds are transferred to 0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516</li>
                            <li>The attacker (0x0fa09C3A328792253f8dee7116848723b72a6d2e) can then drain the funds</li>
                          </ol>
                          
                          <p className="font-medium mt-3">Conclusion</p>
                          <p>
                            This sophisticated attack specifically targeted ByBit by injecting malicious code into the Safe Global application. 
                            The backdoor was designed to only activate for specific addresses, making it harder to detect while allowing the 
                            attacker to drain funds from the targeted wallets.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-400">Select a case to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {showCreateCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4">Create New Case</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Case Name
                </label>
                <input
                  type="text"
                  value={newCaseName}
                  onChange={(e) => setNewCaseName(e.target.value)}
                  placeholder="e.g., Bybit Hack Investigation"
                  className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newCaseDescription}
                  onChange={(e) => setNewCaseDescription(e.target.value)}
                  placeholder="Brief description of the case..."
                  rows={3}
                  className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateCase(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCase}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={!newCaseName.trim()}
              >
                Create Case
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4">Import Case</h3>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-300">
                Select a ChainHound case file (.json) to import.
              </p>
              
              <div className="mt-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 border border-dashed border-gray-500"
                >
                  <Upload className="h-5 w-5" />
                  <span>Select Case File</span>
                </button>
              </div>
              
              {importError && (
                <p className="text-sm text-red-400 mt-2">
                  {importError}
                </p>
              )}
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowImport(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseManager;