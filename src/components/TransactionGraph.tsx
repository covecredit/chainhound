import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Cog, Wallet, Box, ArrowRight, Tag, Star, AlertTriangle, Info } from 'lucide-react';
import { format } from 'date-fns';

interface Node {
  id: string;
  type: 'address' | 'contract' | 'transaction';
  value?: string;
  tagged?: boolean;
}

interface Link {
  source: string;
  target: string;
  value: string;
  type: 'send' | 'receive' |  'interact';
  timestamp?: number;
  blockNumber?: number;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface TransactionGraphProps {
  data: any;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId: string;
  nodeType: string;
}

const TransactionGraph: React.FC<TransactionGraphProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    nodeId: '',
    nodeType: ''
  });
  const [taggedNodes, setTaggedNodes] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Load tagged nodes from localStorage
  useEffect(() => {
    try {
      const savedTags = localStorage.getItem('chainhound_tagged_nodes');
      if (savedTags) {
        setTaggedNodes(new Set(JSON.parse(savedTags)));
      }
    } catch (error) {
      console.error('Failed to load tagged nodes:', error);
    }
  }, []);
  
  // Save tagged nodes to localStorage
  const saveTaggedNodes = (nodes: Set<string>) => {
    try {
      localStorage.setItem('chainhound_tagged_nodes', JSON.stringify(Array.from(nodes)));
    } catch (error) {
      console.error('Failed to save tagged nodes:', error);
      setErrorMessage('Failed to save tagged node. Please try again.');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };
  
  // Tag a node
  const tagNode = (nodeId: string) => {
    const newTaggedNodes = new Set(taggedNodes);
    newTaggedNodes.add(nodeId);
    setTaggedNodes(newTaggedNodes);
    saveTaggedNodes(newTaggedNodes);
    
    // Update the node in the graph
    if (svgRef.current) {
      d3.select(svgRef.current)
        .selectAll('.node')
        .filter((d: any) => d.id === nodeId)
        .select('circle')
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 3);
    }
  };
  
  // Untag a node
  const untagNode = (nodeId: string) => {
    const newTaggedNodes = new Set(taggedNodes);
    newTaggedNodes.delete(nodeId);
    setTaggedNodes(newTaggedNodes);
    saveTaggedNodes(newTaggedNodes);
    
    // Update the node in the graph
    if (svgRef.current) {
      const isDarkMode = document.documentElement.classList.contains('dark');
      d3.select(svgRef.current)
        .selectAll('.node')
        .filter((d: any) => d.id === nodeId)
        .select('circle')
        .attr('stroke', isDarkMode ? '#333' : '#fff')
        .attr('stroke-width', 2);
    }
  };
  
  // Handle right-click on a node
  const handleContextMenu = (event: MouseEvent, d: any) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      nodeId: d.id,
      nodeType: d.type
    });
  };
  
  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(prev => ({ ...prev, visible: false }));
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);
  
  useEffect(() => {
    if (!data || !svgRef.current) return;
    
    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Process data into graph format
    const graphData = processDataToGraph(data);
    
    // Set up the SVG
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    // Check if dark mode is enabled
    const isDarkMode = document.documentElement.classList.contains('dark');
    
    // Define colors
    const nodeColors = {
      address: '#4f46e5', // indigo
      contract: '#0891b2', // cyan
      transaction: '#f59e0b', // amber
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
    svg.call(
      d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          container.attr('transform', event.transform);
        })
    );
    
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
          .on('end', dragended)
      )
      .on('contextmenu', function(event, d) {
        handleContextMenu(event, d);
      });
    
    // Add circles to nodes
    node.append('circle')
      .attr('r', 20)
      .attr('fill', (d: any) => nodeColors[d.type])
      .attr('stroke', (d: any) => taggedNodes.has(d.id) ? '#f59e0b' : (isDarkMode ? '#333' : '#fff'))
      .attr('stroke-width', (d: any) => taggedNodes.has(d.id) ? 3 : 2);
    
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
          .html('<div style="color: white; display: flex; justify-content: center; align-items: center; height: 100%;">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box">' +
                '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>' +
                '</svg></div>');
      }
      
      // Add star icon for tagged nodes
      if (taggedNodes.has(d.id)) {
        nodeGroup.append('foreignObject')
          .attr('width', 16)
          .attr('height', 16)
          .attr('x', 10)
          .attr('y', -20)
          .html('<div style="color: #f59e0b; display: flex; justify-content: center; align-items: center; height: 100%;">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-star">' +
                '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' +
                '</svg></div>');
      }
    });
    
    // Add tooltips to nodes
    node.append('title')
      .text((d: any) => {
        if (d.type === 'address' || d.type === 'contract') {
          return d.id;
        } else if (d.type === 'transaction' && d.value) {
          return `Transaction: ${d.value}`;
        } else {
          return 'Transaction';
        }
      });
    
    // Add labels to nodes
    node.append('text')
      .attr('dy', 30)
      .attr('text-anchor', 'middle')
      .attr('fill', isDarkMode ? '#ddd' : '#333')
      .text((d: any) => {
        if (d.type === 'address' || d.type === 'contract') {
          return `${d.id.substring(0, 6)}...${d.id.substring(d.id.length - 4)}`;
        } else {
          return 'Tx';
        }
      });
    
    // Add timestamp and block number labels to links
    const linkLabels = container.append('g')
      .selectAll('.link-label')
      .data(graphData.links.filter(link => link.timestamp || link.blockNumber))
      .enter()
      .append('g')
      .attr('class', 'link-label');
    
    linkLabels.append('text')
      .attr('dy', -5)
      .attr('text-anchor', 'middle')
      .attr('fill', isDarkMode ? '#aaa' : '#666')
      .attr('font-size', '8px')
      .text((d: any) => {
        let label = '';
        if (d.blockNumber) {
          label += `Block: ${d.blockNumber}`;
        }
        if (d.timestamp) {
          const date = new Date(Number(d.timestamp) * 1000);
          if (label) label += ' | ';
          label += format(date, 'yyyy-MM-dd HH:mm');
        }
        return label;
      });
    
    // Add legend to the graph
    const legendX = width - 180;
    const legendY = 20;
    
    const legend = svg.append('g')
      .attr('transform', `translate(${legendX}, ${legendY})`);
    
    // Add legend background
    legend.append('rect')
      .attr('width', 160)
      .attr('height', 200)
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('fill', isDarkMode ? 'rgba(31, 41, 55, 0.8)' :  'rgba(255, 255, 255, 0.8)')
      .attr('stroke', isDarkMode ? '#4B5563' : '#E5E7EB')
      .attr('stroke-width', 1);
    
    // Add legend title
    legend.append('text')
      .attr('x', 10)
      .attr('y', 20)
      .attr('font-weight', 'bold')
      .attr('fill', isDarkMode ? '#E5E7EB' : '#1F2937')
      .text('Legend');
    
    // Node types legend
    legend.append('text')
      .attr('x', 10)
      .attr('y', 40)
      .attr('fill', isDarkMode ? '#E5E7EB' : '#1F2937')
      .text('Node Types:');
    
    // Address node
    legend.append('circle')
      .attr('cx', 20)
      .attr('cy', 55)
      .attr('r', 6)
      .attr('fill', nodeColors.address);
    
    legend.append('text')
      .attr('x', 35)
      .attr('y', 58)
      .attr('fill', isDarkMode ? '#E5E7EB' : '#1F2937')
      .text('Address');
    
    // Contract node
    legend.append('circle')
      .attr('cx', 20)
      .attr('cy', 75)
      .attr('r', 6)
      .attr('fill', nodeColors.contract);
    
    legend.append('text')
      .attr('x', 35)
      .attr('y', 78)
      .attr('fill', isDarkMode ? '#E5E7EB' : '#1F2937')
      .text('Contract');
    
    // Transaction node
    legend.append('circle')
      .attr('cx', 20)
      .attr('cy', 95)
      .attr('r', 6)
      .attr('fill', nodeColors.transaction);
    
    legend.append('text')
      .attr('x', 35)
      .attr('y', 98)
      .attr('fill', isDarkMode ? '#E5E7EB' : '#1F2937')
      .text('Transaction');
    
    // Link types legend
    legend.append('text')
      .attr('x', 10)
      .attr('y', 125)
      .attr('fill', isDarkMode ? '#E5E7EB' : '#1F2937')
      .text('Connection Types:');
    
    // Send link
    legend.append('line')
      .attr('x1', 15)
      .attr('y1', 140)
      .attr('x2', 30)
      .attr('y2', 140)
      .attr('stroke', linkColors.send)
      .attr('stroke-width', 2);
    
    legend.append('text')
      .attr('x', 35)
      .attr('y', 143)
      .attr('fill', isDarkMode ? '#E5E7EB' : '#1F2937')
      .text('Send');
    
    // Receive link
    legend.append('line')
      .attr('x1', 15)
      .attr('y1', 160)
      .attr('x2', 30)
      .attr('y2', 160)
      .attr('stroke', linkColors.receive)
      .attr('stroke-width', 2);
    
    legend.append('text')
      .attr('x', 35)
      .attr('y', 163)
      .attr('fill', isDarkMode ? '#E5E7EB' : '#1F2937')
      .text('Receive');
    
    // Interact link
    legend.append('line')
      .attr('x1', 15)
      .attr('y1', 180)
      .attr('x2', 30)
      .attr('y2', 180)
      .attr('stroke', linkColors.interact)
      .attr('stroke-width', 2);
    
    legend.append('text')
      .attr('x', 35)
      .attr('y', 183)
      .attr('fill', isDarkMode ? '#E5E7EB' : '#1F2937')
      .text('Interact');
    
    // Update positions on simulation tick
    simulation.nodes(graphData.nodes as any).on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      
      // Update link label positions
      linkLabels.attr('transform', (d: any) => {
        const x = (d.source.x + d.target.x) / 2;
        const y = (d.source.y + d.target.y) / 2;
        return `translate(${x},${y})`;
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
  }, [data, taggedNodes]);
  
  // Process the data into a format suitable for D3 graph visualization
  const processDataToGraph = (data: any): GraphData => {
    const nodes: Node[] = [];
    const links: Link[] = [];
    const nodeIds = new Set<string>();
    
    const addNode = (id: string, type: 'address' | 'contract' | 'transaction', value?: string) => {
      if (!id) return; // Skip if id is undefined or null
      if (!nodeIds.has(id)) {
        nodes.push({ 
          id, 
          type, 
          value,
          tagged: taggedNodes.has(id)
        });
        nodeIds.add(id);
      }
    };
    
    if (data.type === 'address') {
      // Add the main address node
      addNode(data.address, data.isContract ? 'contract' : 'address');
      
      // Add transaction nodes and links
      if (data.transactions && Array.isArray(data.transactions)) {
        data.transactions.forEach((tx: any, index: number) => {
          if (!tx || !tx.hash) return; // Skip invalid transactions
          
          const txId = `tx-${index}-${tx.hash.substring(0, 8)}`;
          addNode(txId, 'transaction', tx.hash);
          
          if (tx.from && tx.from.toLowerCase() === data.address.toLowerCase()) {
            // This address is sending
            if (tx.to) {
              // Check if the destination is a contract
              const isContractCall = tx._isContractCall === true;
              addNode(tx.to, isContractCall ? 'contract' : 'address');
              links.push({ 
                source: data.address, 
                target: txId, 
                value: tx.value || '0', 
                type: 'send',
                timestamp: tx.timestamp,
                blockNumber: tx.blockNumber
              });
              links.push({ 
                source: txId, 
                target: tx.to, 
                value: tx.value || '0', 
                type: 'send',
                timestamp: tx.timestamp,
                blockNumber: tx.blockNumber
              });
            } else {
              // Contract creation
              const contractAddr = tx.contractAddress || 'contract-creation';
              addNode(contractAddr, 'contract');
              links.push({ 
                source: data.address, 
                target: txId, 
                value: tx.value || '0', 
                type: 'send',
                timestamp: tx.timestamp,
                blockNumber: tx.blockNumber
              });
              links.push({ 
                source: txId, 
                target: contractAddr, 
                value: tx.value || '0', 
                type: 'send',
                timestamp: tx.timestamp,
                blockNumber: tx.blockNumber
              });
            }
          } else if (tx.to && tx.to.toLowerCase() === data.address.toLowerCase()) {
            // This address is receiving
            if (tx.from) {
              addNode(tx.from, 'address');
              links.push({ 
                source: tx.from, 
                target: txId, 
                value: tx.value || '0', 
                type: 'send',
                timestamp: tx.timestamp,
                blockNumber: tx.blockNumber
              });
              links.push({ 
                source: txId, 
                target: data.address, 
                value: tx.value || '0', 
                type: 'receive',
                timestamp: tx.timestamp,
                blockNumber: tx.blockNumber
              });
            }
          }
        });
      }
    } else if (data.type === 'transaction') {
      const tx = data.transaction;
      if (!tx) return { nodes: [], links: [] };
      
      // Add transaction node
      const txId = `tx-${tx.hash ? tx.hash.substring(0, 8) : 'unknown'}`;
      addNode(txId, 'transaction', tx.hash);
      
      // Add from and to nodes
      if (tx.from) {
        addNode(tx.from, 'address');
        links.push({ 
          source: tx.from, 
          target: txId, 
          value: tx.value || '0', 
          type: 'send',
          timestamp: tx.timestamp,
          blockNumber: tx.blockNumber
        });
      }
      
      if (tx.to) {
        // Check if it's a contract
        const isContract = data.receipt?.contractAddress || false;
        addNode(tx.to, isContract ? 'contract' : 'address');
        links.push({ 
          source: txId, 
          target: tx.to, 
          value: tx.value || '0', 
          type: 'send',
          timestamp: tx.timestamp,
          blockNumber: tx.blockNumber
        });
      } else if (data.receipt?.contractAddress) {
        // Contract creation
        addNode(data.receipt.contractAddress, 'contract');
        links.push({ 
          source: txId, 
          target: data.receipt.contractAddress, 
          value: tx.value || '0', 
          type: 'send',
          timestamp: tx.timestamp,
          blockNumber: tx.blockNumber
        });
      }
      
      // If there are internal transactions in the receipt, add those too
      if (data.receipt && data.receipt.logs && Array.isArray(data.receipt.logs)) {
        data.receipt.logs.forEach((log: any, index: number) => {
          if (!log || !log.address) return;
          
          const logId = `log-${index}-${log.transactionHash ? log.transactionHash.substring(0, 8) : index}`;
          addNode(logId, 'transaction');
          addNode(log.address, 'contract');
          
          links.push({ 
            source: txId, 
            target: logId, 
            value: '0', 
            type: 'interact',
            timestamp: tx.timestamp,
            blockNumber: tx.blockNumber
          });
          links.push({ 
            source: logId, 
            target: log.address, 
            value: '0', 
            type: 'interact',
            timestamp: tx.timestamp,
            blockNumber: tx.blockNumber
          });
        });
      }
    } else if (data.type === 'block') {
      if (!data.block) return { nodes: [], links: [] };
      
      // Add block node
      const blockId = `block-${data.block.number || 'unknown'}`;
      addNode(blockId, 'transaction');
      
      // Add transaction nodes and links
      if (data.block.transactions && Array.isArray(data.block.transactions)) {
        const maxTransactionsToShow = Math.min(data.block.transactions.length, 20);
        
        data.block.transactions.slice(0, maxTransactionsToShow).forEach((tx: any, index: number) => {
          if (!tx || !tx.hash) return;
          
          const txId = `tx-${index}-${tx.hash.substring(0, 8)}`;
          addNode(txId, 'transaction', tx.hash);
          
          links.push({ 
            source: blockId, 
            target: txId, 
            value: '0', 
            type: 'interact',
            timestamp: data.block.timestamp,
            blockNumber: data.block.number
          });
          
          if (tx.from) {
            addNode(tx.from, 'address');
            links.push({ 
              source: tx.from, 
              target: txId, 
              value: tx.value || '0', 
              type: 'send',
              timestamp: data.block.timestamp,
              blockNumber: data.block.number
            });
          }
          
          if (tx.to) {
            addNode(tx.to, 'address');
            links.push({ 
              source: txId, 
              target: tx.to, 
              value: tx.value || '0', 
              type: 'send',
              timestamp: data.block.timestamp,
              blockNumber: data.block.number
            });
          } else {
            // Contract creation
            const contractAddr = tx.contractAddress || `contract-creation-${index}`;
            addNode(contractAddr, 'contract');
            links.push({ 
              source: txId, 
              target: contractAddr, 
              value: tx.value || '0', 
              type: 'send',
              timestamp: data.block.timestamp,
              blockNumber: data.block.number
            });
          }
        });
      }
    }
    
    return { nodes, links };
  };
  
  return (
    <div className="relative w-full h-full">
      <svg 
        ref={svgRef} 
        width="100%" 
        height="100%"
        style={{ minHeight: '500px' }}
      ></svg>
      
      {/* Context Menu */}
      {contextMenu.visible && (
        <div 
          className="fixed z-50 bg-white rounded-md shadow-lg py-1 dark:bg-gray-800 dark:border dark:border-gray-700"
          style={{ 
            left: `${contextMenu.x}px`, 
            top: `${contextMenu.y}px`,
            minWidth: '150px'
          }}
        >
          <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
            {contextMenu.nodeType === 'address' ? 'Address' : 
             contextMenu.nodeType === 'contract' ? 'Contract' : 'Transaction'}
          </div>
          <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 border-b dark:border-gray-700 truncate max-w-xs">
            {contextMenu.nodeId}
          </div>
          
          {taggedNodes.has(contextMenu.nodeId) ? (
            <button 
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
              onClick={() => untagNode(contextMenu.nodeId)}
            >
              <Star className="h-4 w-4 mr-2" />
              Remove from case
            </button>
          ) : (
            <button 
              className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
              onClick={() => tagNode(contextMenu.nodeId)}
            >
              <Tag className="h-4 w-4 mr-2" />
              Tag for case
            </button>
          )}
          
          <button 
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 flex items-center"
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.nodeId);
              setContextMenu(prev => ({ ...prev, visible: false }));
            }}
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Copy to clipboard
          </button>
          
          {contextMenu.nodeType === 'address' && (
            <button 
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 flex items-center"
              onClick={() => {
                window.open(`https://etherscan.io/address/${contextMenu.nodeId}`, '_blank');
                setContextMenu(prev => ({ ...prev, visible: false }));
              }}
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View on Etherscan
            </button>
          )}
          
          {contextMenu.nodeType === 'transaction' && contextMenu.nodeId.startsWith('tx-') && (
            <button 
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 flex items-center"
              onClick={() => {
                // Extract the hash from the node ID if possible
                const parts = contextMenu.nodeId.split('-');
                if (parts.length >= 3) {
                  const hash = parts[2];
                  window.open(`https://etherscan.io/tx/0x${hash}`, '_blank');
                }
                setContextMenu(prev => ({ ...prev, visible: false }));
              }}
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View on Etherscan
            </button>
          )}
        </div>
      )}
      
      {/* Error message */}
      {errorMessage && (
        <div className="absolute bottom-4 right-4 bg-red-100 text-red-700 px-4 py-2 rounded-md flex items-center dark:bg-red-900 dark:text-red-200">
          <AlertTriangle className="h-4 w-4 mr-2" />
          {errorMessage}
        </div>
      )}
      
      {/* Info about right-click functionality */}
      <div className="absolute bottom-4 left-4 bg-gray-100 text-gray-700 px-4 py-2 rounded-md flex items-center dark:bg-gray-700 dark:text-gray-200 text-xs">
        <Info className="h-4 w-4 mr-2" />
        Right-click on nodes to tag them for your case
      </div>
    </div>
  );
};

export default TransactionGraph;