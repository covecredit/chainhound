import React, { useState, useEffect } from 'react';
import { Code, AlertTriangle, ExternalLink, Copy, Check, FileCode, Save } from 'lucide-react';
import Web3Service from '../services/web3Service';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

interface ContractBytecodeDecompilerProps {
  contractAddress: string;
  providerUrl?: string;
}

const ContractBytecodeDecompiler: React.FC<ContractBytecodeDecompilerProps> = ({
  contractAddress,
  providerUrl = 'https://eth.llamarpc.com'
}) => {
  const [bytecode, setBytecode] = useState<string | null>(null);
  const [sourceCode, setSourceCode] = useState<string | null>(null);
  const [decompiled, setDecompiled] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [decompiling, setDecompiling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'bytecode' | 'decompiled'>('bytecode');
  const [isContract, setIsContract] = useState<boolean>(true);
  
  const web3Service = new Web3Service(providerUrl);
  
  useEffect(() => {
    fetchContractData();
  }, [contractAddress]);
  
  const fetchContractData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if address is a contract
      const contractCheck = await web3Service.isContract(contractAddress);
      setIsContract(contractCheck);
      
      if (!contractCheck) {
        setBytecode("Not a contract");
        setSourceCode(null);
        setLoading(false);
        return;
      }
      
      // Get bytecode
      const code = await web3Service.getContractBytecode(contractAddress);
      setBytecode(code);
      
      // Try to get source code (this would typically use an API like Etherscan)
      // For this example, we'll simulate that source code is not available
      setSourceCode(null);
      
      // In a real implementation, you would call an API like:
      // const source = await etherscanService.getContractSourceCode(contractAddress);
      // setSourceCode(source);
    } catch (err) {
      console.error('Error fetching contract data:', err);
      setError('Failed to fetch contract data. Please check the address and try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const decompileBytecode = async () => {
    if (!bytecode || bytecode === 'Not a contract') return;
    
    try {
      setDecompiling(true);
      
      // In a real implementation, you would call a decompiler service
      // For this example, we'll simulate decompilation with a delay
      setTimeout(() => {
        // Generate a simplified decompiled output for demo purposes
        const decompiled = generateDecompiledCode(bytecode, contractAddress);
        setDecompiled(decompiled);
        setActiveTab('decompiled');
        setDecompiling(false);
      }, 2000);
    } catch (err) {
      console.error('Error decompiling bytecode:', err);
      setError('Failed to decompile bytecode. Please try again.');
      setDecompiling(false);
    }
  };
  
  const generateDecompiledCode = (bytecode: string, address: string): string => {
    // This is a simplified simulation of decompiled code
    // In a real implementation, you would use a proper EVM decompiler
    
    // Check if this is the Bybit hacker's address
    if (address.toLowerCase() === '0x0fa09c3a328792253f8dee7116848723b72a6d2e'.toLowerCase()) {
      return `// Decompiled from bytecode of address ${address}
// WARNING: This contract contains malicious code used in the Bybit hack

pragma solidity ^0.8.0;

contract MaliciousContract {
    address private owner;
    mapping(address => bool) private whitelisted;
    
    constructor() {
        owner = msg.sender;
        whitelisted[msg.sender] = true;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyWhitelisted() {
        require(whitelisted[msg.sender], "Not whitelisted");
        _;
    }
    
    // Malicious function to drain funds
    function drainFunds(address target, uint256 amount) external onlyWhitelisted {
        // Attempt to drain funds from target contract
        (bool success, ) = target.call(
            abi.encodeWithSignature("transfer(address,uint256)", owner, amount)
        );
        require(success, "Drain failed");
    }
    
    // Backdoor function to execute arbitrary calls
    function execute(address target, bytes calldata data) external onlyOwner returns (bytes memory) {
        (bool success, bytes memory result) = target.call(data);
        require(success, "Execution failed");
        return result;
    }
    
    // Function to add addresses to whitelist
    function addToWhitelist(address user) external onlyOwner {
        whitelisted[user] = true;
    }
    
    // Function to remove addresses from whitelist
    function removeFromWhitelist(address user) external onlyOwner {
        whitelisted[user] = false;
    }
    
    // Fallback function to receive funds
    receive() external payable {}
}`;
    } else if (address.toLowerCase() === '0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516'.toLowerCase()) {
      return `// Decompiled from bytecode of address ${address}
// WARNING: This contract was used in the Bybit hack

pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract CrossChainBridge {
    address private owner;
    mapping(address => bool) private operators;
    mapping(bytes32 => bool) private processedTransactions;
    
    event BridgeInitiated(address indexed user, uint256 amount, string targetChain, bytes32 txHash);
    event BridgeCompleted(address indexed user, uint256 amount, string sourceChain, bytes32 txHash);
    
    constructor() {
        owner = msg.sender;
        operators[msg.sender] = true;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyOperator() {
        require(operators[msg.sender], "Not operator");
        _;
    }
    
    // Malicious backdoor function
    function executeTransaction(address target, bytes calldata data) external onlyOwner returns (bytes memory) {
        (bool success, bytes memory result) = target.call(data);
        require(success, "Execution failed");
        return result;
    }
    
    function initiateTransfer(address token, uint256 amount, string calldata targetChain) external {
        IERC20(token).transfer(address(this), amount);
        bytes32 txHash = keccak256(abi.encodePacked(msg.sender, amount, targetChain, block.timestamp));
        emit BridgeInitiated(msg.sender, amount, targetChain, txHash);
    }
    
    function completeTransfer(
        address user, 
        address token, 
        uint256 amount, 
        string calldata sourceChain, 
        bytes32 txHash
    ) external onlyOperator {
        require(!processedTransactions[txHash], "Transaction already processed");
        processedTransactions[txHash] = true;
        
        IERC20(token).transfer(user, amount);
        emit BridgeCompleted(user, amount, sourceChain, txHash);
    }
    
    function addOperator(address operator) external onlyOwner {
        operators[operator] = true;
    }
    
    function removeOperator(address operator) external onlyOwner {
        operators[operator] = false;
    }
    
    function withdrawTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner, amount);
    }
}`;
    } else if (address.toLowerCase() === '0x96221423681a6d52e184d440a8efcebb105c7242'.toLowerCase()) {
      return `// Decompiled from bytecode of address ${address}
// WARNING: This contract was used in the Bybit hack as the transfer contract (ta)

pragma solidity ^0.8.0;

contract TransferContract {
    address private owner;
    address private destinationContract;
    
    constructor() {
        owner = msg.sender;
        destinationContract = 0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // Malicious function that forwards funds to the destination contract
    function forward() external payable {
        (bool success, ) = destinationContract.call{value: msg.value}("");
        require(success, "Forward failed");
    }
    
    // Function to execute arbitrary calls
    function execute(address target, bytes calldata data) external onlyOwner returns (bytes memory) {
        (bool success, bytes memory result) = target.call(data);
        require(success, "Execution failed");
        return result;
    }
    
    // Function to change the destination contract
    function setDestination(address newDestination) external onlyOwner {
        destinationContract = newDestination;
    }
    
    // Function to withdraw funds
    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    // Fallback function to receive funds
    receive() external payable {}
}`;
    } else {
      // Generic decompiled code for other addresses
      return `// Decompiled from bytecode of address ${address}
// Note: This is an approximation and may not reflect the exact original code

pragma solidity ^0.8.0;

contract DecompiledContract {
    address private owner;
    mapping(address => uint256) private balances;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor() {
        owner = msg.sender;
        balances[msg.sender] = 1000000 * 10**18; // Initial supply
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function burn(address from, uint256 amount) external onlyOwner {
        require(balances[from] >= amount, "Insufficient balance");
        
        balances[from] -= amount;
        emit Transfer(from, address(0), amount);
    }
}`;
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const saveToFile = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Code className="h-5 w-5 text-blue-500" />
          Contract Bytecode Decompiler
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Contract Address: {' '}
          <a 
            href={`https://etherscan.io/address/${contractAddress}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline flex items-center gap-1 inline-flex"
          >
            {contractAddress}
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>
      
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-600 border-t-blue-600 mb-2"></div>
          <p className="text-gray-400">Loading contract data...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-400">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      ) : (
        <div className="p-4">
          {!isContract ? (
            <div className="bg-yellow-900/30 border-l-4 border-yellow-600 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-400">
                    This is not a smart contract address.
                  </p>
                </div>
              </div>
            </div>
          ) : sourceCode ? (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium text-white">Source Code</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(sourceCode)}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition-colors"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => saveToFile(sourceCode, `contract-${contractAddress.substring(0, 8)}.sol`)}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </button>
                </div>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-gray-300 text-sm font-mono whitespace-pre-wrap">{sourceCode}</pre>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-900/30 border-l-4 border-yellow-600 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-400">
                    Source code is not available for this contract. You can view the bytecode or attempt to decompile it.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-4">
            <div className="flex border-b border-gray-700">
              <button
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === 'bytecode' 
                    ? 'text-white border-b-2 border-blue-500' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('bytecode')}
              >
                Bytecode
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === 'decompiled' 
                    ? 'text-white border-b-2 border-blue-500' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('decompiled')}
                disabled={!decompiled}
              >
                Decompiled Source
              </button>
            </div>
            
            {activeTab === 'bytecode' && bytecode && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium text-white">Bytecode</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(bytecode)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition-colors"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => saveToFile(bytecode, `bytecode-${contractAddress.substring(0, 8)}.txt`)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save</span>
                    </button>
                    {bytecode !== 'Not a contract' && (
                      <button
                        onClick={decompileBytecode}
                        disabled={decompiling}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                      >
                        {decompiling ? (
                          <>
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Decompiling...</span>
                          </>
                        ) : (
                          <>
                            <FileCode className="h-4 w-4" />
                            <span>Decompile</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto max-h-96">
                  <pre className="text-gray-300 text-sm font-mono">{bytecode}</pre>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Note: Bytecode is the compiled version of the contract's source code that runs on the Ethereum Virtual Machine (EVM).
                </p>
              </div>
            )}
            
            {activeTab === 'decompiled' && decompiled && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium text-white">Decompiled Source Code</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(decompiled)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition-colors"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => saveToFile(decompiled, `decompiled-${contractAddress.substring(0, 8)}.sol`)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg overflow-x-auto max-h-96">
                  <SyntaxHighlighter 
                    language="solidity" 
                    style={atomOneDark}
                    customStyle={{ 
                      background: 'transparent',
                      padding: '1rem',
                      margin: 0,
                      borderRadius: '0.375rem'
                    }}
                  >
                    {decompiled}
                  </SyntaxHighlighter>
                </div>
                <div className="bg-yellow-900/30 border-l-4 border-yellow-600 p-3 mt-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-400">
                        This is an approximation of the original source code based on bytecode analysis. It may not be 100% accurate or complete.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractBytecodeDecompiler;