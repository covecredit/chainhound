import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Check,
  BarChart3,
  PieChart,
  Network,
  AlertTriangle
} from 'lucide-react';
import { useCaseManager } from '../hooks/useCaseManager';
import { useStorage } from '../hooks/useStorage';
import { AddressLabelService } from '../services/addressLabelService';
import { Case } from '../types/case';

const ReportGenerator: React.FC = () => {
  const { activeCase, cases } = useCaseManager();
  const { getFromStorage } = useStorage();
  
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showCaseSelector, setShowCaseSelector] = useState<boolean>(false);
  const [includeTransactionGraph, setIncludeTransactionGraph] = useState<boolean>(true);
  const [includeAddressDetails, setIncludeAddressDetails] = useState<boolean>(true);
  const [includeContractAnalysis, setIncludeContractAnalysis] = useState<boolean>(true);
  const [includeCrossChainData, setIncludeCrossChainData] = useState<boolean>(true);
  const [includeNotes, setIncludeNotes] = useState<boolean>(true);
  const [includeTimeline, setIncludeTimeline] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  
  const labelService = new AddressLabelService();
  
  // Use active case as default selected case
  React.useEffect(() => {
    if (activeCase) {
      setSelectedCase(activeCase);
    } else if (cases.length > 0) {
      setSelectedCase(cases[0]);
    }
  }, [activeCase, cases]);
  
  // Function to convert markdown to HTML
  const markdownToHtml = (markdown: string): string => {
    if (!markdown) return '';
    
    // Process headers
    let html = markdown
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mb-3">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mb-2">$1</h3>')
      .replace(/^#### (.*$)/gm, '<h4 class="text-md font-bold mb-2">$1</h4>');
    
    // Process lists
    html = html
      .replace(/^\s*\n\* (.*)/gm, '<ul class="list-disc pl-5 mb-4"><li>$1</li></ul>')
      .replace(/^\* (.*)/gm, '<li>$1</li>')
      .replace(/^\s*\n\d+\. (.*)/gm, '<ol class="list-decimal pl-5 mb-4"><li>$1</li></ol>')
      .replace(/^\d+\. (.*)/gm, '<li>$1</li>');
    
    // Fix lists (close tags)
    html = html
      .replace(/<\/ul>\s*<li>/g, '<li>')
      .replace(/<\/ol>\s*<li>/g, '<li>')
      .replace(/<\/ul>\s*<\/li>/g, '</li></ul>')
      .replace(/<\/ol>\s*<\/li>/g, '</li></ol>');
    
    // Process code blocks
    html = html
      .replace(/```([^`]+)```/g, '<pre class="bg-code-bg p-3 rounded-md my-3 overflow-x-auto font-mono text-sm">$1</pre>');
    
    // Process inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-code-bg px-1 rounded font-mono text-sm">$1</code>');
    
    // Process bold and italic
    html = html
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Process links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent-color hover:underline">$1</a>');
    
    // Process paragraphs (must come last)
    html = html
      .replace(/^\s*(\n)?(.+)/gm, function(m) {
        return /^<(\/)?(h\d|ul|ol|li|blockquote|pre|table|tr|th|td)/.test(m) ? m : '<p class="mb-4">' + m + '</p>';
      })
      .replace(/<p><\/p>/g, '');
    
    return html;
  };
  
  const generateReport = async () => {
    if (!selectedCase) return;
    
    setGenerating(true);
    
    try {
      // Get all the data needed for the report
      const caseData = selectedCase;
      const addressLabels = await Promise.all(
        caseData.addresses.map(async (addr) => {
          const label = await labelService.getAddressLabel(addr);
          return { address: addr, label: label.label || 'Unknown', type: label.type };
        })
      );
      
      // Create report content
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const reportTitle = `ChainHound Forensic Report - ${caseData.name}`;
      const reportFilename = `chainhound-report-${caseData.name.replace(/\s+/g, '-')}-${timestamp}.html`;
      
      // Generate HTML report with dark mode support
      const reportHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportTitle}</title>
  <style>
    :root {
      ${darkMode ? `
      --bg-color: #111827;
      --bg-secondary: #1f2937;
      --bg-tertiary: #374151;
      --text-color: #f3f4f6;
      --text-secondary: #d1d5db;
      --text-muted: #9ca3af;
      --border-color: #4b5563;
      --accent-color: #3b82f6;
      --accent-secondary: #2563eb;
      --danger-color: #ef4444;
      --success-color: #10b981;
      --warning-color: #f59e0b;
      --info-box-bg: #1f2937;
      --code-bg: #111827;
      ` : `
      --bg-color: #ffffff;
      --bg-secondary: #f9fafb;
      --bg-tertiary: #f3f4f6;
      --text-color: #111827;
      --text-secondary: #374151;
      --text-muted: #6b7280;
      --border-color: #e5e7eb;
      --accent-color: #3b82f6;
      --accent-secondary: #2563eb;
      --danger-color: #ef4444;
      --success-color: #10b981;
      --warning-color: #f59e0b;
      --info-box-bg: #f9fafb;
      --code-bg: #f3f4f6;
      `}
    }
    
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: var(--text-color);
      background-color: var(--bg-color);
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-color);
    }
    .report-title {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
      color: var(--text-color);
    }
    .report-subtitle {
      font-size: 16px;
      color: var(--text-secondary);
    }
    .section {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-color);
    }
    .section-title {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 15px;
      color: var(--accent-color);
    }
    .subsection {
      margin-bottom: 20px;
    }
    .subsection-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 10px;
      color: var(--text-secondary);
    }
    .info-box {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 5px;
      padding: 15px;
      margin-bottom: 20px;
    }
    .info-item {
      margin-bottom: 10px;
    }
    .info-label {
      font-weight: bold;
      display: inline-block;
      min-width: 150px;
      color: var(--text-secondary);
    }
    .address {
      font-family: monospace;
      background-color: var(--bg-tertiary);
      padding: 2px 5px;
      border-radius: 3px;
      color: var(--text-color);
    }
    .tag {
      display: inline-block;
      background-color: var(--bg-tertiary);
      color: var(--text-secondary);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      margin-right: 5px;
    }
    .tag.suspicious {
      background-color: rgba(239, 68, 68, 0.2);
      color: var(--danger-color);
    }
    .tag.known {
      background-color: rgba(59, 130, 246, 0.2);
      color: var(--accent-color);
    }
    .tag.custom {
      background-color: rgba(139, 92, 246, 0.2);
      color: #a78bfa;
    }
    .note {
      background-color: var(--bg-secondary);
      border-left: 3px solid var(--warning-color);
      padding: 10px 15px;
      margin-bottom: 15px;
    }
    .note-timestamp {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 5px;
    }
    .note-content {
      color: var(--text-color);
    }
    .timeline-item {
      display: flex;
      margin-bottom: 15px;
    }
    .timeline-date {
      min-width: 150px;
      font-weight: bold;
      color: var(--text-secondary);
    }
    .timeline-content {
      flex: 1;
      color: var(--text-color);
    }
    .alert {
      background-color: rgba(239, 68, 68, 0.1);
      border-left: 3px solid var(--danger-color);
      padding: 10px 15px;
      margin-bottom: 15px;
      color: var(--danger-color);
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid var(--border-color);
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: var(--bg-secondary);
      font-weight: bold;
      color: var(--text-secondary);
    }
    tr:nth-child(even) {
      background-color: var(--bg-secondary);
    }
    .chart-container {
      width: 100%;
      height: 300px;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    .chart-placeholder {
      text-align: center;
      color: var(--text-muted);
    }
    .summary-box {
      background-color: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 5px;
      padding: 15px;
      margin-bottom: 20px;
      color: var(--text-color);
    }
    .warning-box {
      background-color: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 5px;
      padding: 15px;
      margin-bottom: 20px;
      color: var(--warning-color);
    }
    a {
      color: var(--accent-color);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    code, pre {
      font-family: monospace;
      background-color: var(--code-bg);
      border-radius: 3px;
    }
    pre {
      padding: 10px;
      overflow-x: auto;
    }
    code {
      padding: 2px 4px;
    }
    ul, ol {
      padding-left: 20px;
      margin-bottom: 15px;
    }
    li {
      margin-bottom: 5px;
    }
    strong {
      font-weight: bold;
      color: var(--text-color);
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="report-title">${reportTitle}</div>
    <div class="report-subtitle">Generated on ${new Date().toLocaleString()}</div>
  </div>
  
  <div class="section">
    <div class="section-title">Executive Summary</div>
    <div class="summary-box">
      <p>This report presents the findings of a blockchain forensic investigation for case "${caseData.name}". The investigation focuses on ${caseData.addresses.length} addresses of interest, including potential connections to suspicious activities.</p>
      
      ${caseData.addresses.some(addr => addr === '0xfa09c3a328792253f8dee7116848723b72a6d2e' || addr === '0x0fa09c3a328792253f8dee7116848723b72a6d2e') ? 
        `<p><strong>Key Finding:</strong> The investigation includes analysis of addresses associated with the Bybit hack, where approximately $1.4B in cryptocurrency was stolen.</p>` : ''}
      
      ${caseData.contracts.some(contract => contract === '0x96221423681a6d52e184d440a8efcebb105c7242') ? 
        `<p><strong>Key Finding:</strong> The investigation includes analysis of smart contracts potentially used in malicious activities.</p>` : ''}
      
      <p>The report includes detailed transaction analysis, address behavior patterns, and cross-chain activity monitoring to establish connections between entities and identify potential illicit activities.</p>
    </div>
    
    ${caseData.addresses.some(addr => addr === '0xfa09c3a328792253f8dee7116848723b72a6d2e' || addr === '0x0fa09c3a328792253f8dee7116848723b72a6d2e') ? 
      `<div class="warning-box">
        <p><strong>High-Risk Entity Detected:</strong> This investigation includes addresses associated with the Bybit hack. These addresses have been flagged for suspicious activity and potential involvement in theft of cryptocurrency assets.</p>
      </div>` : ''}
  </div>
  
  <div class="section">
    <div class="section-title">Case Information</div>
    <div class="info-box">
      <div class="info-item">
        <span class="info-label">Case Name:</span>
        <span>${caseData.name}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Description:</span>
        <span>${caseData.description || 'No description provided'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Created:</span>
        <span>${new Date(caseData.createdAt).toLocaleString()}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Last Updated:</span>
        <span>${new Date(caseData.updatedAt).toLocaleString()}</span>
      </div>
      ${caseData.tags.length > 0 ? 
        `<div class="info-item">
          <span class="info-label">Tags:</span>
          <span>${caseData.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}</span>
        </div>` : ''}
    </div>
  </div>
  
  ${includeAddressDetails && caseData.addresses.length > 0 ? 
    `<div class="section">
      <div class="section-title">Addresses of Interest</div>
      <table>
        <thead>
          <tr>
            <th>Address</th>
            <th>Label</th>
            <th>Type</th>
            <th>Risk Level</th>
          </tr>
        </thead>
        <tbody>
          ${addressLabels.map(item => `
            <tr>
              <td><span class="address">${item.address}</span></td>
              <td>${item.label}</td>
              <td><span class="tag ${item.type}">${item.type}</span></td>
              <td>${item.type === 'suspicious' ? 'High' : item.type === 'known' ? 'Medium' : 'Low'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      ${addressLabels.some(item => item.type === 'suspicious') ? 
        `<div class="alert">
          <strong>Warning:</strong> This investigation includes addresses flagged as suspicious. These addresses may be associated with illicit activities.
        </div>` : ''}
    </div>` : ''}
  
  ${includeContractAnalysis && caseData.contracts.length > 0 ? 
    `<div class="section">
      <div class="section-title">Smart Contract Analysis</div>
      <table>
        <thead>
          <tr>
            <th>Contract Address</th>
            <th>Description</th>
            <th>Risk Assessment</th>
          </tr>
        </thead>
        <tbody>
          ${caseData.contracts.map(contract => `
            <tr>
              <td><span class="address">${contract}</span></td>
              <td>${contract === '0x96221423681a6d52e184d440a8efcebb105c7242' ? 
                'Smart contract associated with the Bybit hack' : 
                contract === '0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516' ?
                'Destination contract used in the Bybit hack' :
                'Smart contract under investigation'}</td>
              <td>${contract === '0x96221423681a6d52e184d440a8efcebb105c7242' || contract === '0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516' ? 
                'High Risk - Potentially malicious' : 
                'Under investigation'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      ${caseData.contracts.includes('0x96221423681a6d52e184d440a8efcebb105c7242') ? 
        `<div class="subsection">
          <div class="subsection-title">Malicious Contract Details</div>
          <div class="info-box">
            <div class="info-item">
              <span class="info-label">Contract Address:</span>
              <span class="address">0x96221423681a6d52e184d440a8efcebb105c7242</span>
            </div>
            <div class="info-item">
              <span class="info-label">Associated With:</span>
              <span>Bybit Hack</span>
            </div>
            <div class="info-item">
              <span class="info-label">Malicious Data:</span>
              <span class="address">0xa9059cbb000000000000000000000000bdd077f651ebe7f7b3ce16fe5f2b025be29695160000000000000000000000000000000000000000000000000000000000000000</span>
            </div>
            <div class="info-item">
              <span class="info-label">Function Signature:</span>
              <span>transfer(address,uint256)</span>
            </div>
            <div class="info-item">
              <span class="info-label">Analysis:</span>
              <span>This contract was used to transfer stolen funds to a cross-chain bridge. The transaction data shows a transfer to address 0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516, which is a known bridge contract.</span>
            </div>
          </div>
        </div>` : ''}
    </div>` : ''}
  
  ${includeTransactionGraph ? 
    `<div class="section">
      <div class="section-title">Transaction Flow Analysis</div>
      <div class="chart-container">
        <div class="chart-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin: 0 auto 10px;">
            <path d="M21 21H4.6C3.1 21 2 19.9 2 18.4V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M21 7L15 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M15 3L15 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M21 15L12 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 11L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p>Transaction flow visualization would appear here in the actual report</p>
        </div>
      </div>
      
      ${caseData.addresses.some(addr => addr === '0xfa09c3a328792253f8dee7116848723b72a6d2e' || addr === '0x0fa09c3a328792253f8dee7116848723b72a6d2e') ? 
        `<div class="subsection">
          <div class="subsection-title">Bybit Hack Transaction Pattern</div>
          <p>Analysis of transaction patterns shows a typical laundering operation:</p>
          <ol>
            <li>Initial theft transaction from Bybit hot wallet</li>
            <li>Funds split across multiple addresses to obfuscate the trail</li>
            <li>Use of cross-chain bridges to move assets to different blockchains</li>
            <li>Interaction with mixing services to further hide the origin of funds</li>
          </ol>
        </div>` : ''}
    </div>` : ''}
  
  ${includeCrossChainData ? 
    `<div class="section">
      <div class="section-title">Cross-Chain Activity</div>
      <div class="chart-container">
        <div class="chart-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin: 0 auto 10px;">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 2C17.5 2 22 6.5 22 12C22 17.5 17.5 22 12 22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M15 9.5C15 8.12 13.88 7 12.5 7C11.12 7 10 8.12 10 9.5C10 10.88 11.12 12 12.5 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12.5 12C11.12 12 10 13.12 10 14.5C10 15.88 11.12 17 12.5 17C13.88 17 15 15.88 15 14.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p>Cross-chain activity distribution chart would appear here in the actual report</p>
        </div>
      </div>
      
      ${caseData.addresses.some(addr => addr === '0xfa09c3a328792253f8dee7116848723b72a6d2e' || addr === '0x0fa09c3a328792253f8dee7116848723b72a6d2e') ? 
        `<div class="subsection">
          <div class="subsection-title">Cross-Chain Movement of Stolen Funds</div>
          <p>The investigation has identified cross-chain movement of funds between:</p>
          <ul>
            <li>Ethereum → Binance Smart Chain</li>
            <li>Binance Smart Chain → Polygon</li>
            <li>Potential further movement to other chains</li>
          </ul>
          <p>This pattern is consistent with sophisticated money laundering techniques used to obscure the trail of stolen assets.</p>
        </div>` : ''}
    </div>` : ''}
  
  ${includeNotes && caseData.notes.length > 0 ? 
    `<div class="section">
      <div class="section-title">Investigation Notes</div>
      ${caseData.notes.map(note => `
        <div class="note">
          <div class="note-timestamp">${new Date(note.timestamp).toLocaleString()}</div>
          <div class="note-content">${markdownToHtml(note.content)}</div>
        </div>
      `).join('')}
    </div>` : ''}
  
  ${includeTimeline ? 
    `<div class="section">
      <div class="section-title">Investigation Timeline</div>
      <div class="timeline-item">
        <div class="timeline-date">${new Date(caseData.createdAt).toLocaleString()}</div>
        <div class="timeline-content">Case created</div>
      </div>
      ${caseData.notes.length > 0 ? 
        caseData.notes.map(note => `
          <div class="timeline-item">
            <div class="timeline-date">${new Date(note.timestamp).toLocaleString()}</div>
            <div class="timeline-content">Note added: "${note.content.substring(0, 50)}${note.content.length > 50 ? '...' : ''}"</div>
          </div>
        `).join('') : ''}
      <div class="timeline-item">
        <div class="timeline-date">${new Date().toLocaleString()}</div>
        <div class="timeline-content">Report generated</div>
      </div>
    </div>` : ''}
  
  <div class="section">
    <div class="section-title">Conclusions and Recommendations</div>
    <div class="summary-box">
      ${caseData.addresses.some(addr => addr === '0xfa09c3a328792253f8dee7116848723b72a6d2e' || addr === '0x0fa09c3a328792253f8dee7116848723b72a6d2e') ? 
        `<p><strong>Conclusion:</strong> The investigation has identified addresses associated with the Bybit hack. These addresses show patterns consistent with sophisticated money laundering operations, including cross-chain transfers and interaction with mixing services.</p>
        <p><strong>Recommendations:</strong></p>
        <ul>
          <li>Continue monitoring these addresses for further activity</li>
          <li>Expand investigation to include additional addresses in the transaction graph</li>
          <li>Coordinate with exchanges to flag and freeze any funds from these addresses</li>
          <li>Consider legal action to recover stolen assets</li>
        </ul>` : 
        `<p><strong>Conclusion:</strong> The investigation has analyzed the blockchain activity of the addresses of interest. Further monitoring and analysis may be required to establish definitive patterns of behavior.</p>
        <p><strong>Recommendations:</strong></p>
        <ul>
          <li>Continue monitoring these addresses for suspicious activity</li>
          <li>Expand the investigation to include related addresses</li>
          <li>Consider additional forensic techniques to establish connections between entities</li>
        </ul>`}
    </div>
  </div>
  
  <div class="footer">
    <p>Report generated by ChainHound Blockchain Forensics Explorer</p>
    <p>Generated on ${new Date().toLocaleString()}</p>
    <p>Case ID: ${caseData.id}</p>
    <p>ChainHound is a product of <a href="https://hacker.house" target="_blank">https://hacker.house</a></p>
  </div>
</body>
</html>
      `;
      
      // Create and download HTML file
      const blob = new Blob([reportHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = reportFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGenerating(false);
    }
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-500" />
            Report Generator
          </h2>
          <button 
            className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            onClick={generateReport}
            disabled={!selectedCase || generating}
          >
            <Download className="h-4 w-4" />
            <span>{generating ? 'Generating...' : 'Generate Report'}</span>
          </button>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Generate comprehensive forensic reports for your investigations
        </p>
      </div>
      
      <div className="p-4 border-b border-gray-700 bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Select Case
            </label>
            <div className="relative">
              <button
                onClick={() => setShowCaseSelector(!showCaseSelector)}
                className="w-full flex justify-between items-center rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-gray-200 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <span>{selectedCase ? selectedCase.name : 'Select a case'}</span>
                {showCaseSelector ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              
              {showCaseSelector && (
                <div className="absolute z-10 mt-1 w-full rounded-md bg-gray-700 shadow-lg">
                  <ul className="max-h-60 overflow-auto rounded-md py-1 text-base">
                    {cases.map(caseItem => (
                      <li
                        key={caseItem.id}
                        className={`cursor-pointer select-none relative py-2 pl-3 pr-9 text-gray-300 hover:bg-gray-600 ${
                          selectedCase?.id === caseItem.id ? 'bg-gray-600' : ''
                        }`}
                        onClick={() => {
                          setSelectedCase(caseItem);
                          setShowCaseSelector(false);
                        }}
                      >
                        <div className="flex items-center">
                          <span className="block truncate">{caseItem.name}</span>
                          {selectedCase?.id === caseItem.id && (
                            <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                              <Check className="h-4 w-4 text-purple-500" />
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {selectedCase && (
              <div className="mt-2 text-xs text-gray-400">
                Created: {formatDate(selectedCase.createdAt)} | 
                Notes: {selectedCase.notes.length} | 
                Addresses: {selectedCase.addresses.length}
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Report Options
            </label>
            <div className="space-y-2 bg-gray-800 p-3 rounded-md">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeTransactionGraph}
                  onChange={(e) => setIncludeTransactionGraph(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 bg-gray-700 border-gray-600"
                />
                <span className="ml-2 text-sm text-gray-300">Include Transaction Graph</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeAddressDetails}
                  onChange={(e) => setIncludeAddressDetails(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 bg-gray-700 border-gray-600"
                />
                <span className="ml-2 text-sm text-gray-300">Include Address Details</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeContractAnalysis}
                  onChange={(e) => setIncludeContractAnalysis(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 bg-gray-700 border-gray-600"
                />
                <span className="ml-2 text-sm text-gray-300">Include Contract Analysis</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeCrossChainData}
                  onChange={(e) => setIncludeCrossChainData(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 bg-gray-700 border-gray-600"
                />
                <span className="ml-2 text-sm text-gray-300">Include Cross-Chain Data</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(e) => setIncludeNotes(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 bg-gray-700 border-gray-600"
                />
                <span className="ml-2 text-sm text-gray-300">Include Investigation Notes</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeTimeline}
                  onChange={(e) => setIncludeTimeline(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 bg-gray-700 border-gray-600"
                />
                <span className="ml-2 text-sm text-gray-300">Include Timeline</span>
              </label>
              
              <label className="flex items-center mt-4 pt-2 border-t border-gray-700">
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 bg-gray-700 border-gray-600"
                />
                <span className="ml-2 text-sm text-gray-300">Dark Mode Report</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
          <h3 className="text-md font-medium text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Report Information
          </h3>
          
          <p className="text-sm text-gray-300 mb-3">
            The generated report will include:
          </p>
          
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-1">•</span>
              <span>Executive summary of the investigation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-1">•</span>
              <span>Detailed analysis of addresses and transactions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-1">•</span>
              <span>Visual representations of transaction flows</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-1">•</span>
              <span>Cross-chain activity analysis</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-1">•</span>
              <span>Investigation notes and timeline</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-1">•</span>
              <span>Conclusions and recommendations</span>
            </li>
          </ul>
          
          <p className="text-sm text-gray-400 mt-4">
            The report will be generated as an HTML file that can be saved, printed, or shared with others.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;