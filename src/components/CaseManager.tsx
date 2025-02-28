import React, { useState, useEffect, useRef } from 'react';
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
  ExternalLink,
  AlertTriangle,
  Pencil
} from 'lucide-react';
import { useCaseManager } from '../hooks/useCaseManager';
import { Case } from '../types/case';
import AddressLabel from './AddressLabel';
import Web3Service from '../services/web3Service';

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
    removeTag,
    addNote,
    updateNote,
    deleteNote
  } = useCaseManager();
  
  const [showCreateCase, setShowCreateCase] = useState<boolean>(false);
  const [newCaseName, setNewCaseName] = useState<string>('');
  const [newCaseDescription, setNewCaseDescription] = useState<string>('');
  const [showImport, setShowImport] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [newInput, setNewInput] = useState<string>('');
  const [newTag, setNewTag] = useState<string>('');
  const [editingOverview, setEditingOverview] = useState<boolean>(false);
  const [overviewContent, setOverviewContent] = useState<string>('');
  const [overviewNoteId, setOverviewNoteId] = useState<string | null>(null);
  const [inputType, setInputType] = useState<'address' | 'contract' | 'auto'>('auto');
  const [inputError, setInputError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const web3Service = new Web3Service();
  
  // Create ByBit case if it doesn't exist
  useEffect(() => {
    const bybitCase = cases.find(c => c.name === "ByBit Hacker");
    if (!bybitCase) {
      createBybitCase();
    }
  }, [cases]);

  // Load overview note when active case changes
  useEffect(() => {
    if (activeCase) {
      const overview = activeCase.notes.find(note => 
        note.content.startsWith('# ByBit Hack Investigation') || 
        note.content.includes('Overview') || 
        note.content.includes('overview')
      );
      
      if (overview) {
        setOverviewNoteId(overview.id);
        setOverviewContent(overview.content);
      } else {
        setOverviewNoteId(null);
        setOverviewContent('');
      }
    } else {
      setOverviewNoteId(null);
      setOverviewContent('');
    }
  }, [activeCase]);
  
  const createBybitCase = () => {
    const bybitCase = createCase("ByBit Hacker", "Investigation into the ByBit hack and associated addresses");
    
    // Add addresses
    const addresses = [
      '0x0fa09c3a328792253f8dee7116848723b72a6d2e', // Bybit hacker address
      '0x96221423681a6d52e184d440a8efcebb105c7242', // Transfer contract (ta)
      '0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516', // Destination contract (da)
      '0x51E9d833Ecae4E8D9D8Be17300AEE6D3398C135D', // FBI identified
      '0x96244D83DC15d36847C35209bBDc5bdDE9bEc3D8', // FBI identified
      '0x83c7678492D623fb98834F0fbcb2E7b7f5Af8950', // FBI identified
      '0x83Ef5E80faD88288F770152875Ab0bb16641a09E', // FBI identified
      '0xAF620E6d32B1c67f3396EF5d2F7d7642Dc2e6CE9', // FBI identified
      '0x3A21F4E6Bbe527D347ca7c157F4233c935779847', // FBI identified
      '0xfa3FcCCB897079fD83bfBA690E7D47Eb402d6c49', // FBI identified
      '0xFc926659Dd8808f6e3e0a8d61B20B871F3Fa6465', // FBI identified
      '0xb172F7e99452446f18FF49A71bfEeCf0873003b4', // FBI identified
      '0x6d46bd3AfF100f23C194e5312f93507978a6DC91', // FBI identified
      '0xf0a16603289eAF35F64077Ba3681af41194a1c09', // FBI identified
      '0x23Db729908137cb60852f2936D2b5c6De0e1c887', // FBI identified
      '0x40e98FeEEbaD7Ddb0F0534Ccaa617427eA10187e', // FBI identified
      '0x140c9Ab92347734641b1A7c124ffDeE58c20C3E3', // FBI identified
      '0x684d4b58Dc32af786BF6D572A792fF7A883428B9', // FBI identified
      '0xBC3e5e8C10897a81b63933348f53f2e052F89a7E', // FBI identified
      '0x5Af75eAB6BEC227657fA3E749a8BFd55f02e4b1D', // FBI identified
      '0xBCA02B395747D62626a65016F2e64A20bd254A39', // FBI identified
      '0x4C198B3B5F3a4b1Aa706daC73D826c2B795ccd67', // FBI identified
      '0xCd7eC020121Ead6f99855cbB972dF502dB5bC63a', // FBI identified
      '0xbdE2Cc5375fa9E0383309A2cA31213f2D6cabcbd', // FBI identified
      '0xD3C611AeD139107DEC2294032da3913BC26507fb', // FBI identified
      '0xB72334cB9D0b614D30C4c60e2bd12fF5Ed03c305', // FBI identified
      '0x8c7235e1A6EeF91b980D0FcA083347FBb7EE1806', // FBI identified
      '0x1bb0970508316DC735329752a4581E0a4bAbc6B4', // FBI identified
      '0x1eB27f136BFe7947f80d6ceE3Cf0bfDf92b45e57', // FBI identified
      '0xCd1a4A457cA8b0931c3BF81Df3CFa227ADBdb6E9', // FBI identified
      '0x09278b36863bE4cCd3d0c22d643E8062D7a11377', // FBI identified
      '0x660BfcEa3A5FAF823e8f8bF57dd558db034dea1d', // FBI identified
      '0xE9bc552fdFa54b30296d95F147e3e0280FF7f7e6', // FBI identified
      '0x30a822CDD2782D2B2A12a08526452e885978FA1D', // FBI identified
      '0xB4a862A81aBB2f952FcA4C6f5510962e18c7f1A2', // FBI identified
      '0x0e8C1E2881F35Ef20343264862A242FB749d6b35', // FBI identified
      '0x9271EDdda0F0f2bB7b1A0c712bdF8dbD0A38d1Ab', // FBI identified
      '0xe69753Ddfbedbd249E703EB374452E78dae1ae49', // FBI identified
      '0x2290937A4498C96eFfb87b8371a33D108F8D433f', // FBI identified
      '0x959c4CA19c4532C97A657D82d97acCBAb70e6fb4', // FBI identified
      '0x52207Ec7B1b43AA5DB116931a904371ae2C1619e', // FBI identified
      '0x9eF42873Ae015AA3da0c4354AeF94a18D2B3407b', // FBI identified
      '0x1542368a03ad1f03d96D51B414f4738961Cf4443', // FBI identified
      '0x21032176B43d9f7E9410fB37290a78f4fEd6044C', // FBI identified
      '0xA4B2Fd68593B6F34E51cB9eDB66E71c1B4Ab449e', // FBI identified
      '0x55CCa2f5eB07907696afe4b9Db5102bcE5feB734', // FBI identified
      '0xA5A023E052243b7cce34Cbd4ba20180e8Dea6Ad6', // FBI identified
      '0xdD90071D52F20e85c89802e5Dc1eC0A7B6475f92', // FBI identified
      '0x1512fcb09463A61862B73ec09B9b354aF1790268', // FBI identified
      '0xF302572594a68aA8F951faE64ED3aE7DA41c72Be', // FBI identified
      '0x723a7084028421994d4a7829108D63aB44658315', // FBI identified
      '0xf03AfB1c6A11A7E370920ad42e6eE735dBedF0b1', // FBI identified
      '0xEB0bAA3A556586192590CAD296b1e48dF62a8549', // FBI identified
      '0xD5b58Cf7813c1eDC412367b97876bD400ea5c489'  // FBI identified
    ];
    
    // Add tags
    const tags = [
      'DPRK', 
      'Lazarus Group', 
      'APT38', 
      'FBI Alert', 
      'Sanctioned',
      'Bybit Hack - FBI Identified',
      'ByBit Hacker'
    ];
    
    // Set active case to the new case
    setActive(bybitCase.id);
    
    // Add addresses and tags
    addresses.forEach(addr => addAddress(addr));
    tags.forEach(tag => addTag(tag));
    
    // Create overview note
    const overviewNote = `# ByBit Hack Investigation

## Analysis of the Smart Contract and Backdoor Mechanism

This case involves the analysis of a smart contract and a backdoor mechanism used to drain funds from ByBit wallets. 
The backdoor code was found in the file \`app-52c9031bfa03da47.js\` on the Safe Global application.

### Backdoor Mechanism

The backdoor code defines a "whitelist" (wa) and "blacklist" (ba) of addresses. If a transaction matched an address in the whitelist, 
it redirected the transfer to smart contract "ta" (0x96221423681a6d52e184d440a8efcebb105c7242) using data stored in "da", 
sending funds to smart contract 0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516.

This JS backdoor essentially allowed the attacker (likely DPRK-affiliated) to drain the ByBit wallet when the caller was 
0x0fa09C3A328792253f8dee7116848723b72a6d2e, effectively targeting only wallets from the "whitelist" while all other transactions were ignored.
The attacker specifically targeted ByBit.

### Key Components of the Backdoor:

- **Whitelist (wa):** List of target addresses to be drained
- **Blacklist (ba):** List of addresses to be ignored
- **Transfer Address (ta):** 0x96221423681a6d52e184d440a8efcebb105c7242
- **Destination Address (da payload):** Encoded function call to transfer funds to 0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516
- **Attacker Address:** 0x0fa09C3A328792253f8dee7116848723b72a6d2e

### Decoding the da Payload

The da payload is an encoded function call. Here's how it breaks down:

**Function Selector:**
- The first 4 bytes (0xa9059cbb) represent the function selector for the transfer function in the ERC-20 token standard.
- The transfer function has the following signature: transfer(address _to, uint256 _value).

**Parameters:**
- The next 32 bytes represent the _to address:
  \`\`\`
  000000000000000000000000bdd077f651ebe7f7b3ce16fe5f2b025be2969516
  \`\`\`
  This decodes to the address 0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516.

- The following 32 bytes represent the _value (amount to transfer):
  \`\`\`
  0000000000000000000000000000000000000000000000000000000000000000
  \`\`\`
  This decodes to the value 0.

### Attack Flow

1. User initiates a transaction on Safe Global app
2. If the user's address is in the whitelist, the backdoor activates
3. Transaction is redirected to contract 0x96221423681a6d52e184d440a8efcebb105c7242
4. Funds are transferred to 0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516
5. The attacker (0x0fa09C3A328792253f8dee7116848723b72a6d2e) can then drain the funds

### FBI Alert Information

The FBI and Internet Crime Complaint Center (IC3) have issued alert I-022625-PSA (February 26, 2025) identifying North Korea as responsible for the $1.5 Billion Bybit Hack. The addresses listed in this case have been identified by the FBI as being associated with this attack.

For more information, see:
- FBI PSA: https://www.ic3.gov/PSA/2025/PSA250226
- Backdoor code: https://web.archive.org/web/20250219172905js_/https://app.safe.global/_next/static/chunks/pages/_app-52c9031bfa03da47.js

### Conclusion

This sophisticated attack specifically targeted ByBit by injecting malicious code into the Safe Global application. 
The backdoor was designed to only activate for specific addresses, making it harder to detect while allowing the 
attacker to drain funds from the targeted wallets.`;
    
    addNote(overviewNote);
  };
  
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
  
  const handleAddInput = async () => {
    if (!activeCase || !newInput.trim()) return;
    
    setInputError(null);
    
    try {
      // Determine if the input is an address or contract
      let isAddress = web3Service.isValidAddress(newInput.trim());
      
      if (!isAddress) {
        setInputError('Invalid Ethereum address format');
        return;
      }
      
      // If auto-detection is enabled, check if it's a contract
      if (inputType === 'auto') {
        try {
          const isContract = await web3Service.isContract(newInput.trim());
          if (isContract) {
            addContract(newInput.trim());
          } else {
            addAddress(newInput.trim());
          }
        } catch (error) {
          // If contract detection fails, default to address
          addAddress(newInput.trim());
        }
      } else if (inputType === 'address') {
        addAddress(newInput.trim());
      } else if (inputType === 'contract') {
        addContract(newInput.trim());
      }
      
      setNewInput('');
    } catch (error) {
      setInputError('Error adding input: ' + (error as Error).message);
    }
  };
  
  const handleAddTag = () => {
    if (!activeCase || !newTag.trim()) return;
    
    addTag(newTag.trim());
    setNewTag('');
  };
  
  const handleSaveOverview = () => {
    if (!activeCase) return;
    
    if (overviewNoteId) {
      // Update existing note
      updateNote(overviewNoteId, overviewContent);
    } else {
      // Create new note
      addNote(overviewContent);
    }
    
    setEditingOverview(false);
  };
  
  const handleDeleteOverview = () => {
    if (!activeCase || !overviewNoteId) return;
    
    deleteNote(overviewNoteId);
    setOverviewNoteId(null);
    setOverviewContent('');
    setEditingOverview(false);
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  const handleAddressClick = (address: string) => {
    window.open(`/?address=${address}`, '_blank');
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
                        className="p-1 text-gray-500 hover:text-red-400 rounded"
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
                  {/* Case Overview */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-md font-medium text-white flex items-center gap-1">
                        <FileText className="h-4 w-4 text-blue-500" />
                        Case Overview
                      </h4>
                      <div className="flex items-center gap-2">
                        {editingOverview ? (
                          <>
                            <button
                              onClick={handleSaveOverview}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              <Save className="h-3 w-3" />
                              <span>Save</span>
                            </button>
                            <button
                              onClick={() => setEditingOverview(false)}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                            >
                              <X className="h-3 w-3" />
                              <span>Cancel</span>
                            </button>
                            {overviewNoteId && (
                              <button
                                onClick={handleDeleteOverview}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Delete</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => setEditingOverview(true)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            <Pencil className="h-3 w-3" />
                            <span>{overviewNoteId ? 'Edit' : 'Add Overview'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {editingOverview ? (
                      <div className="bg-gray-900 rounded-lg border border-gray-700">
                        <textarea
                          value={overviewContent}
                          onChange={(e) => setOverviewContent(e.target.value)}
                          className="w-full h-64 bg-gray-900 text-gray-300 p-3 border-none rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Enter case overview in markdown format..."
                        />
                      </div>
                    ) : overviewNoteId ? (
                      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 prose prose-invert max-w-none">
                        <div className="whitespace-pre-wrap">{overviewContent}</div>
                      </div>
                    ) : (
                      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 text-center">
                        <p className="text-gray-400">No overview available. Click 'Add Overview' to create one.</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-1">
                        <Link className="h-4 w-4 text-blue-500" />
                        Addresses & Contracts
                      </h4>
                      <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            value={newInput}
                            onChange={(e) => setNewInput(e.target.value)}
                            placeholder="Add address or contract (0x...)"
                            className="flex-1 rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-1 text-sm text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                          <select
                            value={inputType}
                            onChange={(e) => setInputType(e.target.value as 'address' | 'contract' | 'auto')}
                            className="rounded-md border border-gray-600 bg-gray-700 shadow-sm px-2 py-1 text-sm text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="auto">Auto-detect</option>
                            <option value="address">Address</option>
                            <option value="contract">Contract</option>
                          </select>
                          <button
                            onClick={handleAddInput}
                            disabled={!newInput.trim()}
                            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            Add
                          </button>
                        </div>
                        
                        {inputError && (
                          <div className="mb-3 text-xs text-red-400">
                            {inputError}
                          </div>
                        )}
                        
                        <div className="mb-2">
                          <h5 className="text-xs font-medium text-gray-400 mb-1">Addresses ({activeCase.addresses.length})</h5>
                          {activeCase.addresses.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-2">No addresses added</p>
                          ) : (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                              {activeCase.addresses.map(address => (
                                <div key={address} className="flex justify-between items-center bg-gray-800 p-2 rounded">
                                  <div className="text-sm text-gray-300 truncate flex-1 cursor-pointer" onClick={() => handleAddressClick(address)}>
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
                        
                        <div>
                          <h5 className="text-xs font-medium text-gray-400 mb-1">Contracts ({activeCase.contracts.length})</h5>
                          {activeCase.contracts.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-2">No contracts added</p>
                          ) : (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                              {activeCase.contracts.map(contract => (
                                <div key={contract} className="flex justify-between items-center bg-gray-800 p-2 rounded">
                                  <div className="text-sm text-gray-300 truncate flex-1 cursor-pointer" onClick={() => handleAddressClick(contract)}>
                                    <AddressLabel address={contract} showEdit={false} />
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
                    
                    <div>
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
                      
                      {/* Notes Summary */}
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-1">
                          <FileText className="h-4 w-4 text-green-500" />
                          Notes
                        </h4>
                        <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                          {activeCase.notes.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-2">No notes added</p>
                          ) : (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                              {activeCase.notes.map(note => (
                                <div key={note.id} className="bg-gray-800 p-2 rounded">
                                  <div className="flex justify-between items-start">
                                    <div className="text-sm text-gray-300 truncate">
                                      {note.content.split('\n')[0] || 'Empty note'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {new Date(note.timestamp).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="mt-2 text-center">
                            <a 
                              href="#" 
                              onClick={(e) => {
                                e.preventDefault();
                                window.location.href = '/?tab=notes';
                              }}
                              className="text-xs text-blue-400 hover:underline"
                            >
                              Manage notes in Notes tab
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Alert for Bybit Hack Case */}
                  {activeCase.name === "ByBit Hacker" && (
                    <div className="mt-4 bg-red-900/20 border-l-4 border-red-600 p-4 rounded-r-md">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-md font-medium text-red-400">High-Risk Investigation</h3>
                          <div className="mt-2 text-sm text-gray-300">
                            <p className="mb-2">
                              This case involves addresses associated with the Bybit hack, where approximately $1.4B in cryptocurrency was stolen.
                              The FBI has identified these addresses as being linked to North Korean threat actors.
                            </p>
                            <p>
                              Exercise caution when interacting with these addresses and report any suspicious activity to the appropriate authorities.
                            </p>
                          </div>
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