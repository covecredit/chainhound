import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Wallet, Cog, Box, ArrowRight, Cuboid as Cube, AlertTriangle } from 'lucide-react';
import { formatWeiToEth, safelyConvertBigIntToString } from '../utils/bigIntUtils';

interface Node {
  id: string;
  type: 'address' | 'contract' | 'transaction' | 'block';
  role?: 'from' | 'to';
  value?: string;
  blockNumber?: number;
  hash?: string;
  timestamp?: number;
  data?: any;
}

interface Link {
  source: string;
  target: string;
  value: string;
  type: 'send' | 'receive' | 'interact';
  gas?: string;
  gasPrice?: string;
  gasUsed?: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface TransactionGraphProps {
  data: any;
  onNodeClick?: (node: Node) => void;
}

const TransactionGraph: React.FC<TransactionGraphProps> = ({ data, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;
    
    try {
      // Clear previous graph
      d3.select(svgRef.current).selectAll('*').remove();
      setErrorMessage(null);
      
      // Process data into graph format - ensure we're working with a safe copy (no BigInt values)
      const safeData = safelyConvertBigIntToString(data);
      const graphData = processDataToGraph(safeData);
      
      if (graphData.nodes.length === 0) {
        setErrorMessage("No graph data to display. Try a different search query.");
        return;
      }
      
      // Set up the SVG
      const svg = d3.select(svgRef.current);
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      // Check if dark mode is enabled
      const isDarkMode = document.documentElement.classList.contains('dark');
      
      // Define colors
      const nodeColors = {
        address: '#4f46e5', // indigo
        contract: '#0891b2', // cyan
        transaction: '#f59e0b', // amber
        block: '#3b82f6', // blue (changed from emerald to blue)
      };
      
      const roleColors = {
        from: '#ef4444', // red
        to: '#10b981', // emerald
      };
      
      const linkColors = {
        send: '#ef4444', // red
        receive: '#10b981', // emerald
        interact: '#8b5cf6', // violet
      };
      
      // Create a simulation
      const simulation = d3.forceSimulation()
        .force('link', d3.forceLink().id((d: any) => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(50));
      
      // Create a container for the graph
      const container = svg.append('g');
      
      // Add zoom behavior
      const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          container.attr('transform', event.transform);
        });
      
      svg.call(zoom as any);
      
      // Create links
      const link = container.append('g')
        .selectAll('line')
        .data(graphData.links)
        .enter()
        .append('line')
        .attr('stroke', (d: any) => linkColors[d.type])
        .attr('stroke-width', 2)
        .attr('marker-end', 'url(#arrowhead)');
      
      // Add arrowhead marker
      svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', isDarkMode ? '#aaa' : '#888');
      
      // Create node groups
      const node = container.append('g')
        .selectAll('.node')
        .data(graphData.nodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .call(
          d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended) as any
        )
        .on('click', function(event, d: any) {
          if (onNodeClick) {
            event.stopPropagation();
            onNodeClick(d);
          }
        });
      
      // Add circles to nodes
      node.append('circle')
        .attr('r', 20)
        .attr('fill', (d: any) => d.role ? roleColors[d.role] : nodeColors[d.type])
        .attr('stroke', isDarkMode ? '#333' : '#fff')
        .attr('stroke-width', 2)
        .attr('cursor', 'pointer');
      
      // Add icons to nodes
      node.each(function(d: any) {
        const nodeGroup = d3.select(this);
        
        if (d.type === 'address') {
          // Add wallet icon
          nodeGroup.append('foreignObject')
            .attr('width', 20)
            .attr('height', 20)
            .attr('x', -10)
            .attr('y', -10)
            .attr('cursor', 'pointer')
            .html('<div style="color: white; display: flex; justify-content: center; align-items: center; height: 100%;">' +
                  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wallet">' +
                  '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>' +
                  '</svg></div>');
        } else if (d.type === 'contract') {
          // Add cog icon
          nodeGroup.append('foreignObject')
            .attr('width', 20)
            .attr('height', 20)
            .attr('x', -10)
            .attr('y', -10)
            .attr('cursor', 'pointer')
            .html('<div style="color: white; display: flex; justify-content: center; align-items: center; height: 100%;">' +
                  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cog">' +
                  '<path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/><path d="M12 22v-2"/><path d="m17 20.66-1-1.73"/><path d="M11 10.27 7 3.34"/><path d="m20.66 17-1.73-1"/><path d="m3.34 7 1.73 1"/><path d="M14 12h8"/><path d="M2 12h2"/><path d="m20.66 7-1.73 1"/><path d="m3.34 17 1.73-1"/><path d="m17 3.34-1 1.73"/><path d="m11 13.73-4 6.93"/>' +
                  '</svg></div>');
        } else if (d.type === 'transaction') {
          // Add box icon
          nodeGroup.append('foreignObject')
            .attr('width', 20)
            .attr('height', 20)
            .attr('x', -10)
            .attr('y', -10)
            .attr('cursor', 'pointer')
            .html('<div style="color: white; display: flex; justify-content: center; align-items: center; height: 100%;">' +
                  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box">' +
                  '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>' +
                  '</svg></div>');
        } else if (d.type === 'block') {
          // Add cube icon
          nodeGroup.append('foreignObject')
            .attr('width', 20)
            .attr('height', 20)
            .attr('x', -10)
            .attr('y', -10)
            .attr('cursor', 'pointer')
            .html('<div style="color: white; display: flex; justify-content: center; align-items: center; height: 100%;">' +
                  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cube">' +
                  '<path d="m21 16-9 5-9-5V8l9-5 9 5v8z"/><path d="m3 8 9 5 9-5"/><path d="M12 3v10"/>' +
                  '</svg></div>');
        }
      });
      
      // Add tooltips to nodes
      node.append('title')
        .text((d: any) => {
          if (d.type === 'address' || d.type === 'contract') {
            return d.role ? `${d.role.toUpperCase()}: ${d.id}` : d.id;
          } else if (d.type === 'transaction' && d.hash) {
            return `Transaction: ${d.hash}`;
          } else if (d.type === 'block' && d.blockNumber) {
            return `Block: ${d.blockNumber}`;
          } else {
            return d.type.charAt(0).toUpperCase() + d.type.slice(1);
          }
        });
      
      // Add labels to nodes
      node.append('text')
        .attr('dy', 30)
        .attr('text-anchor', 'middle')
        .attr('fill', isDarkMode ? '#ddd' : '#333')
        .attr('font-size', '8px')
        .attr('cursor', 'pointer')
        .text((d: any) => {
          if (d.type === 'address' || d.type === 'contract') {
            return `${d.id.substring(0, 6)}...${d.id.substring(d.id.length - 4)}`;
          } else if (d.type === 'transaction') {
            return d.hash ? `${d.hash.substring(0, 6)}...` : 'TX';
          } else if (d.type === 'block') {
            return `Block #${d.blockNumber}`;
          }
          return '';
        });
      
      // Add gas info to links
      link.each(function(d: any) {
        if (d.gas || d.gasPrice) {
          const linkElement = d3.select(this);
          const linkData = linkElement.datum() as any;
          
          // Add gas info as text along the link
          container.append('text')
            .attr('class', 'link-label')
            .attr('dy', -5)
            .attr('text-anchor', 'middle')
            .attr('fill', isDarkMode ? '#aaa' : '#666')
            .attr('font-size', '7px')
            .text(() => {
              let label = '';
              if (linkData.gas) label += `Gas: ${linkData.gas}`;
              if (linkData.gasPrice) {
                if (label) label += ', ';
                label += `Price: ${linkData.gasPrice} Gwei`;
              }
              return label;
            });
        }
      });
      
      // Update positions on simulation tick
      simulation.nodes(graphData.nodes as any).on('tick', () => {
        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);
        
        node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        
        // Update link labels position
        container.selectAll('.link-label')
          .attr('x', function(d: any, i) {
            const linkData = link.data()[i];
            return linkData ? (linkData.source.x + linkData.target.x) / 2 : 0;
          })
          .attr('y', function(d: any, i) {
            const linkData = link.data()[i];
            return linkData ? (linkData.source.y + linkData.target.y) / 2 : 0;
          });
      });
      
      (simulation.force('link') as d3.ForceLink<any, any>).links(graphData.links);
      
      // Drag functions
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      // Clean up when component unmounts
      return () => {
        simulation.stop();
      };
    } catch (error) {
      console.error('Error rendering graph:', error);
      setErrorMessage(`Failed to render graph: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [data, onNodeClick]);
  
  // Process the data into a format suitable for D3 graph visualization
  const processDataToGraph = (data: any): GraphData => {
    const nodes: Node[] = [];
    const links: Link[] = [];
    const nodeIds = new Set<string>();
    
    const addNode = (id: string, type: 'address' | 'contract' | 'transaction' | 'block', options: any = {}) => {
      if (!id) return; // Skip if id is undefined or null
      if (!nodeIds.has(id)) {
        nodes.push({ 
          id, 
          type, 
          role: options.role,
          value: options.value,
          blockNumber: options.blockNumber,
          hash: options.hash,
          timestamp: options.timestamp,
          data: options.data
        });
        nodeIds.add(id);
      }
    };
    
    try {
      if (data.type === 'address') {
        // Add the main address node
        addNode(data.address, data.isContract ? 'contract' : 'address', { data: data });
        
        // Add transaction nodes and links
        if (data.transactions && Array.isArray(data.transactions)) {
          data.transactions.forEach((tx: any, index: number) => {
            if (!tx || !tx.hash) return; // Skip invalid transactions
            
            const txId = `tx-${index}-${tx.hash.substring(0, 8)}`;
            addNode(txId, 'transaction', { 
              value: tx.value, 
              hash: tx.hash, 
              blockNumber: tx.blockNumber,
              timestamp: tx.timestamp,
              data: tx
            });
            
            if (tx.from && tx.from.toLowerCase() === data.address.toLowerCase()) {
              // This address is sending
              if (tx.to) {
                // Check if the destination is a contract
                const isContractCall = tx._isContractCall === true;
                addNode(tx.to, isContractCall ? 'contract' : 'address', { 
                  role: 'to',
                  data: { address: tx.to, isContract: isContractCall }
                });
                links.push({ 
                  source: data.address, 
                  target: txId, 
                  value: tx.value || '0', 
                  type: 'send',
                  gas: tx.gas,
                  gasPrice: tx.gasPrice,
                  gasUsed: tx.gasUsed
                });
                links.push({ 
                  source: txId, 
                  target: tx.to, 
                  value: tx.value || '0', 
                  type: 'send',
                  gas: tx.gas,
                  gasPrice: tx.gasPrice,
                  gasUsed: tx.gasUsed
                });
              } else {
                // Contract creation
                const contractAddr = tx.contractAddress || 'contract-creation';
                addNode(contractAddr, 'contract', { 
                  role: 'to',
                  data: { address: contractAddr, isContract: true }
                });
                links.push({ 
                  source: data.address, 
                  target: txId, 
                  value: tx.value || '0', 
                  type: 'send',
                  gas: tx.gas,
                  gasPrice: tx.gasPrice,
                  gasUsed: tx.gasUsed
                });
                links.push({ 
                  source: txId, 
                  target: contractAddr, 
                  value: tx.value || '0', 
                  type: 'send',
                  gas: tx.gas,
                  gasPrice: tx.gasPrice,
                  gasUsed: tx.gasUsed
                });
              }
            } else if (tx.to && tx.to.toLowerCase() === data.address.toLowerCase()) {
              // This address is receiving
              if (tx.from) {
                addNode(tx.from, 'address', { 
                  role: 'from',
                  data: { address: tx.from, isContract: false }
                });
                links.push({ 
                  source: tx.from, 
                  target: txId, 
                  value: tx.value || '0', 
                  type: 'send',
                  gas: tx.gas,
                  gasPrice: tx.gasPrice,
                  gasUsed: tx.gasUsed
                });
                links.push({ 
                  source: txId, 
                  target: data.address, 
                  value: tx.value || '0', 
                  type: 'receive',
                  gas: tx.gas,
                  gasPrice: tx.gasPrice,
                  gasUsed: tx.gasUsed
                });
              }
            }
            
            // Add block node if available
            if (tx.blockNumber) {
              const blockId = `block-${tx.blockNumber}`;
              addNode(blockId, 'block', { 
                blockNumber: tx.blockNumber,
                timestamp: tx.timestamp,
                data: { number: tx.blockNumber, timestamp: tx.timestamp }
              });
              links.push({ 
                source: blockId, 
                target: txId, 
                value: '0', 
                type: 'interact'
              });
            }
          });
        }
      } else if (data.type === 'transaction') {
        // Add transaction node
        const tx = data.transaction;
        if (!tx) return { nodes: [], links: [] };
        
        // Add transaction node
        const txId = `tx-${tx.hash ? tx.hash.substring(0, 8) : 'unknown'}`;
        addNode(txId, 'transaction', { 
          value: tx.value, 
          hash: tx.hash,
          blockNumber: tx.blockNumber,
          timestamp: tx.timestamp,
          data: tx
        });
        
        // Add from and to nodes
        if (tx.from) {
          addNode(tx.from, 'address', { role: 'from' });
          links.push({ 
            source: tx.from, 
            target: txId, 
            value: tx.value || '0', 
            type: 'send',
            gas: tx.gas,
            gasPrice: tx.gasPrice
          });
        }
        
        if (tx.to) {
          // Check if it's a contract
          const isContract = data.receipt?.contractAddress || false;
          addNode(tx.to, isContract ? 'contract' : 'address', { role: 'to' });
          links.push({ 
            source: txId, 
            target: tx.to, 
            value: tx.value || '0', 
            type: 'send',
            gas: tx.gas,
            gasPrice: tx.gasPrice
          });
        } else if (data.receipt?.contractAddress) {
          // Contract creation
          addNode(data.receipt.contractAddress, 'contract', { role: 'to' });
          links.push({ 
            source: txId, 
            target: data.receipt.contractAddress, 
            value: tx.value || '0', 
            type: 'send',
            gas: tx.gas,
            gasPrice: tx.gasPrice
          });
        }
      } else if (data.type === 'block') {
        if (!data.block) return { nodes: [], links: [] };
        
        // Add block node
        const blockId = `block-${data.block.number || 'unknown'}`;
        addNode(blockId, 'block', { 
          blockNumber: data.block.number,
          timestamp: data.block.timestamp,
          hash: data.block.hash,
          data: data.block
        });
        
        // Add transaction nodes and links
        if (data.block.transactions && Array.isArray(data.block.transactions)) {
          const maxTransactionsToShow = Math.min(data.block.transactions.length, 20);
          
          data.block.transactions.slice(0, maxTransactionsToShow).forEach((tx: any, index: number) => {
            if (!tx || !tx.hash) return;
            
            const txId = `tx-${index}-${tx.hash.substring(0, 8)}`;
            addNode(txId, 'transaction', { 
              value: tx.value,
              hash: tx.hash,
              blockNumber: data.block.number,
              timestamp: data.block.timestamp,
              data: tx
            });
            
            links.push({ source: blockId, target: txId, value: '0', type: 'interact' });
            
            if (tx.from) {
              addNode(tx.from, 'address', { role: 'from' });
              links.push({ 
                source: tx.from, 
                target: txId, 
                value: tx.value || '0', 
                type: 'send',
                gas: tx.gas,
                gasPrice: tx.gasPrice
              });
            }
            
            if (tx.to) {
              addNode(tx.to, 'address', { role: 'to' });
              links.push({ 
                source: txId, 
                target: tx.to, 
                value: tx.value || '0', 
                type: 'send',
                gas: tx.gas,
                gasPrice: tx.gasPrice
              });
            }
          });
        }
      }
      
      return { nodes, links };
    } catch (error) {
      console.error('Error processing data for graph:', error);
      return { nodes: [], links: [] };
    }
  };
  
  return (
    <div ref={containerRef} className="w-full h-full relative">
      {errorMessage && (
        <div className="absolute top-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center dark:bg-red-900/50 dark:border-red-800 dark:text-red-300">
          <AlertTriangle className="inline-block mr-2" size={16} />
          {errorMessage}
        </div>
      )}
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};

export default TransactionGraph;