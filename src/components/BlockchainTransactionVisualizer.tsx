import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { zoom as d3Zoom } from 'd3-zoom';
import { Transaction, Address, TransactionFlow } from '../types/transaction';
import TransactionNode from './TransactionNode';
import TransactionLink from './TransactionLink';
import { Database, RefreshCw, ZoomIn, ZoomOut, Maximize2, Download, Search, Info } from 'lucide-react';
import JSZip from 'jszip';
import { toPng, toSvg } from 'html-to-image';
import { saveAs } from 'file-saver';

interface BlockchainTransactionVisualizerProps {
  transactions?: Transaction[];
  onFetchTransactions?: () => Promise<Transaction[]>;
  blockchain?: 'ethereum' | 'bsc' | 'polygon' | 'arbitrum' | 'optimism' | string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onAddressSelect?: (address: string) => void;
}

// Transaction types with colors
const TRANSACTION_TYPES = {
  TRANSFER: { name: 'Transfer', color: '#3B82F6' }, // Blue
  CONTRACT_CALL: { name: 'Contract Call', color: '#10B981' }, // Green
  TOKEN_TRANSFER: { name: 'Token Transfer', color: '#F59E0B' }, // Yellow
  BRIDGE: { name: 'Bridge', color: '#8B5CF6' }, // Purple
  SWAP: { name: 'Swap', color: '#EC4899' }, // Pink
  UNKNOWN: { name: 'Unknown', color: '#6B7280' } // Gray
};

const BlockchainTransactionVisualizer: React.FC<BlockchainTransactionVisualizerProps> = ({
  transactions: initialTransactions,
  onFetchTransactions,
  blockchain = 'ethereum',
  autoRefresh = false,
  refreshInterval = 30000,
  onAddressSelect
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions || []);
  const [transactionFlow, setTransactionFlow] = useState<TransactionFlow>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<Address | null>(null);
  const [highlightedTransaction, setHighlightedTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showLegend, setShowLegend] = useState<boolean>(true);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<any>(null);
  const legendRef = useRef<HTMLDivElement>(null);

  // Determine transaction type based on transaction data
  const getTransactionType = (tx: Transaction): keyof typeof TRANSACTION_TYPES => {
    // Check if it's a bridge transaction
    if (tx.crossChainRef && tx.crossChainRef.length > 0) {
      return 'BRIDGE';
    }
    
    // Check if it's a contract call (has input data)
    if (tx.input && tx.input !== '0x') {
      // Check if it's a token transfer (ERC20 transfer method signature)
      if (tx.input.startsWith('0xa9059cbb')) {
        return 'TOKEN_TRANSFER';
      }
      
      // Check if it's a swap (common DEX method signatures)
      if (tx.input.startsWith('0x38ed1739') || // swapExactTokensForTokens
          tx.input.startsWith('0x7ff36ab5') || // swapExactETHForTokens
          tx.input.startsWith('0x4a25d94a')) { // swapTokensForExactETH
        return 'SWAP';
      }
      
      return 'CONTRACT_CALL';
    }
    
    // Simple ETH transfer
    if (tx.value && parseFloat(tx.value) > 0) {
      return 'TRANSFER';
    }
    
    return 'UNKNOWN';
  };

  // Process transactions to create a flow graph
  const processTransactions = (txs: Transaction[]) => {
    if (!txs || txs.length === 0) {
      setTransactionFlow({ nodes: [], links: [] });
      return;
    }
    
    const addressMap = new Map<string, Address>();
    
    // Create nodes from transaction addresses
    txs.forEach(tx => {
      if (!addressMap.has(tx.from)) {
        addressMap.set(tx.from, { 
          id: tx.from, 
          address: tx.from,
          blockchain: tx.blockchain
        });
      }
      
      if (!addressMap.has(tx.to)) {
        addressMap.set(tx.to, { 
          id: tx.to, 
          address: tx.to,
          blockchain: tx.blockchain
        });
      }
    });
    
    const nodes = Array.from(addressMap.values());
    
    // Create links with proper source and target references and transaction types
    const links = txs.map(tx => {
      const txType = getTransactionType(tx);
      return {
        ...tx,
        source: tx.from,
        target: tx.to,
        type: txType
      };
    });
    
    setTransactionFlow({
      nodes,
      links: links,
    });
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    if (!onFetchTransactions) return;
    
    try {
      setLoading(true);
      setError(null);
      const txs = await onFetchTransactions();
      setTransactions(txs);
      processTransactions(txs);
    } catch (error) {
      setError('Failed to fetch transactions. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize and handle auto-refresh
  useEffect(() => {
    if (initialTransactions && initialTransactions.length > 0) {
      setTransactions(initialTransactions);
      processTransactions(initialTransactions);
    } else if (onFetchTransactions) {
      fetchTransactions();
    }

    let intervalId: number | undefined;
    
    if (autoRefresh && onFetchTransactions) {
      intervalId = window.setInterval(() => {
        fetchTransactions();
      }, refreshInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [initialTransactions, onFetchTransactions, autoRefresh, refreshInterval]);

  // D3 visualization
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || transactionFlow.nodes.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = 500;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Clear previous visualization
    svg.selectAll('*').remove();

    // Create a container group for all elements that will be zoomed
    const g = svg.append('g');

    // Create a map of node IDs to node objects for the simulation
    const nodeMap = new Map();
    transactionFlow.nodes.forEach(node => {
      nodeMap.set(node.id, {...node});
    });

    // Create link objects with proper source and target references
    const links = transactionFlow.links.map(link => ({
      ...link,
      source: nodeMap.get(link.from),
      target: nodeMap.get(link.to)
    }));

    // Create force simulation with the prepared nodes and links
    const simulation = d3.forceSimulation(Array.from(nodeMap.values()))
      .force('link', d3.forceLink(links)
        .id((d: any) => d.id)
        .distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60));

    // Create arrow marker for links
    g.append('defs').selectAll('marker')
      .data(['end'])
      .enter().append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#ef4444')
      .attr('d', 'M0,-5L10,0L0,5');

    // Create links with different colors based on transaction type
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', (d: any) => {
        // Color links based on transaction type
        const txType = d.type || 'UNKNOWN';
        return TRANSACTION_TYPES[txType].color;
      })
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: any) => Math.sqrt(parseFloat(d.value) / 1e18) + 1)
      .attr('marker-end', 'url(#arrow)')
      .on('click', (event, d: any) => {
        setHighlightedTransaction(d);
      });

    // Create node groups
    const node = g.append('g')
      .selectAll('.node')
      .data(Array.from(nodeMap.values()))
      .enter().append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))
      .on('click', (event, d: any) => {
        setSelectedNode(d);
        if (onAddressSelect) {
          onAddressSelect(d.address);
        }
      });

    // Add circles to nodes
    node.append('circle')
      .attr('r', 25)
      .attr('fill', (d: any) => {
        // Color nodes based on blockchain
        if (d.blockchain === 'bsc') return '#2E2E2E'; // BSC dark
        if (d.blockchain === 'polygon') return '#1E1E1E'; // Polygon dark
        if (d.blockchain === 'arbitrum') return '#1A1A1A'; // Arbitrum dark
        if (d.blockchain === 'optimism') return '#1F1F1F'; // Optimism dark
        return '#1f2937'; // Default Ethereum dark
      })
      .attr('stroke', (d: any) => {
        // Color node borders based on blockchain
        if (d.blockchain === 'bsc') return '#F0B90B'; // BSC yellow
        if (d.blockchain === 'polygon') return '#8247E5'; // Polygon purple
        if (d.blockchain === 'arbitrum') return '#28A0F0'; // Arbitrum blue
        if (d.blockchain === 'optimism') return '#FF0420'; // Optimism red
        return '#ef4444'; // Default red for Ethereum
      })
      .attr('stroke-width', 2);

    // Add wallet icon to nodes
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-family', 'sans-serif')
      .attr('font-size', '20px')
      .text('💼');

    // Add address labels
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 40)
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('fill', '#d1d5db')
      .text((d: any) => d.address);

    // Add blockchain indicator
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 55)
      .attr('font-size', '9px')
      .attr('font-family', 'sans-serif')
      .attr('fill', (d: any) => {
        // Color blockchain text based on blockchain
        if (d.blockchain === 'bsc') return '#F0B90B'; // BSC yellow
        if (d.blockchain === 'polygon') return '#8247E5'; // Polygon purple
        if (d.blockchain === 'arbitrum') return '#28A0F0'; // Arbitrum blue
        if (d.blockchain === 'optimism') return '#FF0420'; // Optimism red
        return '#ef4444'; // Default red for Ethereum
      })
      .text((d: any) => d.blockchain ? d.blockchain.toUpperCase() : 'ETH');

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Set up zoom behavior
    const zoom = d3Zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    // Store zoom reference for external controls
    zoomRef.current = zoom;

    // Apply zoom behavior to SVG
    svg.call(zoom);

    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      svg.attr('width', newWidth);
      simulation.force('center', d3.forceCenter(newWidth / 2, height / 2));
      simulation.alpha(0.3).restart();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      simulation.stop();
    };
  }, [transactionFlow, onAddressSelect]);

  const handleNodeClick = (address: Address) => {
    setSelectedNode(selectedNode?.id === address.id ? null : address);
    if (onAddressSelect) {
      onAddressSelect(address.address);
    }
  };

  const handleTransactionClick = (transaction: Transaction) => {
    setHighlightedTransaction(highlightedTransaction?.id === transaction.id ? null : transaction);
  };

  // Zoom control handlers
  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 1.2);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 0.8);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  // Export visualization as PNG with full canvas
  const exportVisualization = async () => {
    if (!svgRef.current) return;
    
    try {
      setLoading(true);
      
      // Create a zip file to store both visible and full visualizations
      const zip = new JSZip();
      
      // Get the visible area as PNG
      const visiblePng = await toPng(svgRef.current, {
        backgroundColor: '#1f2937',
        width: svgRef.current.clientWidth,
        height: svgRef.current.clientHeight
      });
      
      // Get the SVG as text for full visualization
      const svgText = await toSvg(svgRef.current, {
        backgroundColor: '#1f2937',
        width: svgRef.current.clientWidth,
        height: svgRef.current.clientHeight
      });
      
      // Add legend to the zip if it's visible
      if (showLegend && legendRef.current) {
        const legendPng = await toPng(legendRef.current, {
          backgroundColor: '#1f2937'
        });
        zip.file("chainhound-visualization-legend.png", legendPng.split(',')[1], {base64: true});
      }
      
      // Add the images to the zip
      zip.file("chainhound-visualization-visible.png", visiblePng.split(',')[1], {base64: true});
      zip.file("chainhound-visualization-full.svg", svgText);
      
      // Add transaction data as JSON
      zip.file("transaction-data.json", JSON.stringify(transactions, null, 2));
      
      // Generate the zip file
      const zipBlob = await zip.generateAsync({type: "blob"});
      
      // Create download link
      const timestamp = new Date().toISOString().slice(0, 10);
      saveAs(zipBlob, `chainhound-visualization-${timestamp}.zip`);
    } catch (error) {
      console.error("Error exporting visualization:", error);
      setError("Failed to export visualization. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-500" />
            {blockchain.charAt(0).toUpperCase() + blockchain.slice(1)} Transaction Flow
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-700 rounded-md">
              <button 
                className="p-2 text-gray-300 hover:text-white"
                onClick={handleZoomOut}
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-xs text-gray-400 px-1">{Math.round(zoomLevel * 100)}%</span>
              <button 
                className="p-2 text-gray-300 hover:text-white"
                onClick={handleZoomIn}
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button 
                className="p-2 text-gray-300 hover:text-white"
                onClick={handleResetZoom}
                title="Reset Zoom"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
            <button 
              className="p-2 text-gray-300 hover:text-white bg-gray-700 rounded-md"
              onClick={exportVisualization}
              title="Export Visualization"
            >
              <Download className="h-4 w-4" />
            </button>
            <button 
              className="p-2 text-gray-300 hover:text-white bg-gray-700 rounded-md"
              onClick={() => setShowLegend(!showLegend)}
              title={showLegend ? "Hide Legend" : "Show Legend"}
            >
              <Info className="h-4 w-4" />
            </button>
            {onFetchTransactions && (
              <button 
                className="flex items-center gap-1 px-3 py-1 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors"
                onClick={fetchTransactions}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 text-red-400 border-b border-red-900">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4">
        <div className="lg:col-span-3 border-r border-gray-700">
          <div ref={containerRef} className="w-full h-[500px] relative bg-gray-900">
            {loading && (
              <div className="absolute inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-10">
                <div className="flex flex-col items-center">
                  <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                  <p className="mt-2 text-gray-300">Loading transactions...</p>
                </div>
              </div>
            )}
            {transactionFlow.nodes.length === 0 && !loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No transaction data available to visualize</p>
                  <button 
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    onClick={fetchTransactions}
                  >
                    Fetch Transactions
                  </button>
                </div>
              </div>
            ) : (
              <svg ref={svgRef} className="w-full h-full"></svg>
            )}
            
            {/* Transaction Type Legend */}
            {showLegend && transactionFlow.nodes.length > 0 && (
              <div 
                ref={legendRef}
                className="absolute top-4 left-4 bg-gray-800 p-3 rounded-md shadow-lg border border-gray-700 z-10"
              >
                <h3 className="text-sm font-medium text-white mb-2">Transaction Types</h3>
                <div className="space-y-2">
                  {Object.entries(TRANSACTION_TYPES).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: value.color }}
                      ></div>
                      <span className="text-xs text-gray-300">{value.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 overflow-y-auto h-[500px] bg-gray-800">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">ADDRESSES</h3>
            <div className="space-y-2">
              {transactionFlow.nodes.length === 0 ? (
                <p className="text-sm text-gray-500">No addresses to display</p>
              ) : (
                transactionFlow.nodes.map(node => (
                  <TransactionNode 
                    key={node.id} 
                    data={node} 
                    selected={selectedNode?.id === node.id}
                    onClick={handleNodeClick}
                  />
                ))
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">TRANSACTIONS</h3>
            <div className="space-y-2">
              {transactionFlow.links.length === 0 ? (
                <p className="text-sm text-gray-500">No transactions to display</p>
              ) : (
                transactionFlow.links.map(transaction => (
                  <TransactionLink 
                    key={transaction.id} 
                    transaction={transaction} 
                    highlighted={highlightedTransaction?.id === transaction.id}
                    onClick={handleTransactionClick}
                    txType={transaction.type || 'UNKNOWN'}
                    txTypes={TRANSACTION_TYPES}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockchainTransactionVisualizer;