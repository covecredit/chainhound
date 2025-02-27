import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { zoom as d3Zoom } from 'd3-zoom';
import { Transaction, Address, TransactionFlow } from '../types/transaction';
import TransactionNode from './TransactionNode';
import TransactionLink from './TransactionLink';
import { Database, RefreshCw, ZoomIn, ZoomOut, Maximize2, Download, Search } from 'lucide-react';

interface BlockchainTransactionVisualizerProps {
  transactions?: Transaction[];
  onFetchTransactions?: () => Promise<Transaction[]>;
  blockchain?: 'ethereum' | 'bsc' | 'polygon' | 'arbitrum' | 'optimism' | string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onAddressSelect?: (address: string) => void;
}

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
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<any>(null);

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
    
    // Create links with proper source and target references
    const links = txs.map(tx => ({
      ...tx,
      source: tx.from,
      target: tx.to
    }));
    
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
    } catch (err) {
      setError('Failed to fetch transactions. Please try again.');
      console.error(err);
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

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', (d: any) => {
        // Color links based on blockchain
        if (d.blockchain === 'bsc') return '#F0B90B'; // BSC yellow
        if (d.blockchain === 'polygon') return '#8247E5'; // Polygon purple
        if (d.blockchain === 'arbitrum') return '#28A0F0'; // Arbitrum blue
        if (d.blockchain === 'optimism') return '#FF0420'; // Optimism red
        return '#ef4444'; // Default red for Ethereum
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
          // Open in a new tab to preserve current view
          window.open(`?address=${d.address}`, '_blank');
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
      // Open in a new tab to preserve current view
      window.open(`?address=${address.address}`, '_blank');
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

  // Export visualization as PNG
  const exportAsPNG = () => {
    if (!svgRef.current) return;
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const svg = svgRef.current;
    const box = svg.getBoundingClientRect();
    
    // Set canvas dimensions to match SVG
    canvas.width = box.width;
    canvas.height = box.height;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    // Fill with background color
    context.fillStyle = '#1f2937';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Convert SVG to data URL
    const data = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    // Create image from SVG
    const img = new Image();
    img.onload = () => {
      // Draw image to canvas
      context.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      
      // Convert canvas to PNG and download
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `chainhound-visualization-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    img.src = url;
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
              onClick={exportAsPNG}
              title="Export as PNG"
            >
              <Download className="h-4 w-4" />
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