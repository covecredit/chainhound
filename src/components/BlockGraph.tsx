import React, { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import {
  Wallet,
  Cog,
  Box,
  ArrowRight,
  Cuboid as Cube,
  AlertTriangle,
  Camera,
  Tag as TagIcon,
} from "lucide-react";
import {
  formatWeiToEth,
  safelyConvertBigIntToString,
} from "../utils/bigIntUtils";
import BlockLegend from "./BlockLegend";
import Web3 from "web3";
import { toPng } from "html-to-image";
import TagMenu from "./TagMenu";
import { tagManager } from "../services/TagManager";
import { smartContractAnalyzer } from "../services/SmartContractAnalyzer";

// Define node role icons
const nodeRoleIcons = {
  block:
    '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M9 21V9"/><path d="M15 21V9"/><path d="M3 15h18"/></svg>', // 3D cube with depth
  transaction:
    '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M8 12h8M12 8v8"/></svg>',
  from_wallet:
    '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="10" rx="2"/><circle cx="7" cy="12" r="1.5"/></svg>',
  to_wallet:
    '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="10" rx="2"/><circle cx="17" cy="12" r="1.5"/></svg>',
  from_contract:
    '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>', // Smart contract icon
  to_contract:
    '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>', // Smart contract icon
  contract:
    '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>', // Smart contract icon
};

interface Node {
  id: string;
  type: "address" | "contract" | "transaction" | "block";
  role?: "from" | "to";
  value?: string;
  blockNumber?: number;
  hash?: string;
  timestamp?: number;
  data?: any;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Link {
  source: string;
  target: string;
  value: string;
  type: "send" | "receive" | "interact";
  gas?: string;
  gasPrice?: string;
  gasUsed?: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface BlockGraphProps {
  data: any;
  onNodeClick?: (node: Node) => void;
  onNodeDoubleClick?: (node: Node) => void;
}

// Helper to check if an address is a smart contract (basic heuristic: if code is present or from data)
function isSmartContract(address: string, knownContracts: Set<string>) {
  return knownContracts.has(address.toLowerCase());
}

// Enhanced smart contract detection
async function detectSmartContract(
  web3: any,
  address: string
): Promise<boolean> {
  try {
    if (!web3) return false;
    const code = await web3.eth.getCode(address);
    return code !== "0x" && code !== "0x0";
  } catch (error) {
    console.error("Error detecting smart contract:", error);
    return false;
  }
}

// Process data into graph format
function processDataToGraph(data: any, knownContracts: Set<string>): GraphData {
  const nodes: Node[] = [];
  const links: Link[] = [];
  const nodeIds = new Set<string>();

  try {
    if (data.type === "block" && data.block) {
      // Add block node
      const blockId = `block-${data.block.number}`;
      if (!nodeIds.has(blockId)) {
        nodes.push({
          id: blockId,
          type: "block",
          blockNumber: data.block.number,
          hash: data.block.hash,
          timestamp: data.block.timestamp,
          data: data.block,
        });
        nodeIds.add(blockId);
      }

      // Process transactions in the block
      if (data.block.transactions && Array.isArray(data.block.transactions)) {
        data.block.transactions.forEach((tx: any, index: number) => {
          const txId = `tx-${tx.hash || index}`;

          // Add transaction node
          if (!nodeIds.has(txId)) {
            nodes.push({
              id: txId,
              type: "transaction",
              hash: tx.hash,
              blockNumber: data.block.number,
              timestamp: data.block.timestamp,
              value: tx.value,
              data: tx,
            });
            nodeIds.add(txId);
          }

          // Link block to transaction
          links.push({
            source: blockId,
            target: txId,
            value: tx.value || "0",
            type: "interact",
          });

          // Add address nodes and links
          if (tx.from) {
            const fromId = `addr-${tx.from}`;
            if (!nodeIds.has(fromId)) {
              nodes.push({
                id: fromId,
                type: isSmartContract(tx.from, knownContracts)
                  ? "contract"
                  : "address",
                role: "from",
                data: { address: tx.from },
              });
              nodeIds.add(fromId);
            }

            links.push({
              source: fromId,
              target: txId,
              value: tx.value || "0",
              type: "send",
              gas: tx.gas,
              gasPrice: tx.gasPrice,
              gasUsed: tx.gasUsed,
            });
          }

          if (tx.to) {
            const toId = `addr-${tx.to}`;
            if (!nodeIds.has(toId)) {
              nodes.push({
                id: toId,
                type: isSmartContract(tx.to, knownContracts)
                  ? "contract"
                  : "address",
                role: "to",
                data: { address: tx.to },
              });
              nodeIds.add(toId);
            }

            links.push({
              source: txId,
              target: toId,
              value: tx.value || "0",
              type: "receive",
            });
          }
        });
      }
    } else if (data.type === "transaction" && data.transaction) {
      // Single transaction view
      const tx = data.transaction;
      const txId = `tx-${tx.hash}`;

      nodes.push({
        id: txId,
        type: "transaction",
        hash: tx.hash,
        blockNumber: tx.blockNumber,
        timestamp: tx.timestamp,
        value: tx.value,
        data: tx,
      });
      nodeIds.add(txId);

      if (tx.from) {
        const fromId = `addr-${tx.from}`;
        nodes.push({
          id: fromId,
          type: isSmartContract(tx.from, knownContracts)
            ? "contract"
            : "address",
          role: "from",
          data: { address: tx.from },
        });
        nodeIds.add(fromId);

        links.push({
          source: fromId,
          target: txId,
          value: tx.value || "0",
          type: "send",
        });
      }

      if (tx.to) {
        const toId = `addr-${tx.to}`;
        nodes.push({
          id: toId,
          type: isSmartContract(tx.to, knownContracts) ? "contract" : "address",
          role: "to",
          data: { address: tx.to },
        });
        nodeIds.add(toId);

        links.push({
          source: txId,
          target: toId,
          value: tx.value || "0",
          type: "receive",
        });
      }
    } else if (data.type === "address" && data.transactions) {
      // Address view with transactions
      const addressId = `addr-${data.address}`;
      nodes.push({
        id: addressId,
        type: data.isContract ? "contract" : "address",
        data: { address: data.address },
      });
      nodeIds.add(addressId);

      // Process transactions
      data.transactions.forEach((tx: any, index: number) => {
        const txId = `tx-${tx.hash || index}`;

        if (!nodeIds.has(txId)) {
          nodes.push({
            id: txId,
            type: "transaction",
            hash: tx.hash,
            blockNumber: tx.blockNumber,
            timestamp: tx.timestamp,
            value: tx.value,
            data: tx,
          });
          nodeIds.add(txId);
        }

        // Link address to transaction
        if (tx.from && tx.from.toLowerCase() === data.address.toLowerCase()) {
          links.push({
            source: addressId,
            target: txId,
            value: tx.value || "0",
            type: "send",
          });

          // Add recipient if exists
          if (tx.to) {
            const toId = `addr-${tx.to}`;
            if (!nodeIds.has(toId)) {
              nodes.push({
                id: toId,
                type: isSmartContract(tx.to, knownContracts)
                  ? "contract"
                  : "address",
                role: "to",
                data: { address: tx.to },
              });
              nodeIds.add(toId);
            }

            links.push({
              source: txId,
              target: toId,
              value: tx.value || "0",
              type: "receive",
            });
          }
        } else if (
          tx.to &&
          tx.to.toLowerCase() === data.address.toLowerCase()
        ) {
          links.push({
            source: txId,
            target: addressId,
            value: tx.value || "0",
            type: "receive",
          });

          // Add sender if exists
          if (tx.from) {
            const fromId = `addr-${tx.from}`;
            if (!nodeIds.has(fromId)) {
              nodes.push({
                id: fromId,
                type: isSmartContract(tx.from, knownContracts)
                  ? "contract"
                  : "address",
                role: "from",
                data: { address: tx.from },
              });
              nodeIds.add(fromId);
            }

            links.push({
              source: fromId,
              target: txId,
              value: tx.value || "0",
              type: "send",
            });
          }
        }
      });
    }

    return { nodes, links };
  } catch (error) {
    console.error("Error processing data to graph:", error);
    return { nodes: [], links: [] };
  }
}

const BlockGraph: React.FC<BlockGraphProps> = ({
  data,
  onNodeClick,
  onNodeDoubleClick,
}) => {
  // Tag menu state
  const [tagMenuState, setTagMenuState] = useState<{
    show: boolean;
    nodeId: string;
    nodeType: "address" | "contract" | "transaction" | "block";
    nodeData?: any;
    position: { x: number; y: number };
  }>({
    show: false,
    nodeId: "",
    nodeType: "address",
    nodeData: undefined,
    position: { x: 0, y: 0 },
  });

  const [smartContractMenuState, setSmartContractMenuState] = useState<{
    show: boolean;
    nodeId: string;
    nodeData?: any;
    position: { x: number; y: number };
  }>({
    show: false,
    nodeId: "",
    nodeData: undefined,
    position: { x: 0, y: 0 },
  });

  // Track drag state to prevent click during drag
  const dragStateRef = useRef<{ isDragging: boolean; dragStartTime: number }>({
    isDragging: false,
    dragStartTime: 0,
  });
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
  const [randomizeKey, setRandomizeKey] = useState(0);
  const [graphVisible, setGraphVisible] = useState(false);
  const web3 = new Web3(Web3.givenProvider || "http://localhost:8545");
  const [addressTypes, setAddressTypes] = useState<
    Record<string, "wallet" | "contract">
  >({});
  const [zoomLevel, setZoomLevel] = useState(1);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [showShortLabels, setShowShortLabels] = useState(() => {
    const saved = localStorage.getItem("blockGraph_shortLabels");
    return saved ? JSON.parse(saved) : false;
  });

  // Add pin state to control graph elasticity
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem("blockGraph_isPinned");
    return saved ? JSON.parse(saved) : false;
  });

  // Save preferences when they change
  useEffect(() => {
    localStorage.setItem(
      "blockGraph_shortLabels",
      JSON.stringify(showShortLabels)
    );
  }, [showShortLabels]);

  useEffect(() => {
    localStorage.setItem("blockGraph_isPinned", JSON.stringify(isPinned));
  }, [isPinned]);

  // Add web3.js address type detection and update node color/icon logic
  useEffect(() => {
    if (!data) return;
    // Get all unique addresses
    const addresses = Array.from(
      new Set(
        data?.transactions
          ?.flatMap((tx: any) => [tx.from, tx.to])
          .filter(Boolean)
      )
    );
    // Check each address type
    Promise.all(
      addresses.map(async (addr) => {
        try {
          const code = await web3.eth.getCode(addr);
          return [
            addr,
            code && code !== "0x" && code !== "0x0" ? "contract" : "wallet",
          ];
        } catch {
          return [addr, "wallet"];
        }
      })
    ).then((results) => {
      setAddressTypes(Object.fromEntries(results));
    });
  }, [data]);

  const captureGraph = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      const dataUrl = await toPng(containerRef.current, { quality: 0.95 });

      const link = document.createElement("a");
      link.download = `chainhound-graph-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Error capturing graph:", error);
    }
  }, []);

  // Helper to randomize (jiggle) node positions
  const randomizeGraph = () => {
    if (simulationRef.current) {
      simulationRef.current.nodes().forEach((node) => {
        node.x += (Math.random() - 0.5) * 80;
        node.y += (Math.random() - 0.5) * 80;
      });
      simulationRef.current.alpha(0.7).restart();
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (zoomRef.current && svgRef.current) {
      const svg = d3.select(svgRef.current);
      zoomRef.current.scaleBy(svg.transition().duration(300), 1.5);
    }
  };

  const handleZoomOut = () => {
    if (zoomRef.current && svgRef.current) {
      const svg = d3.select(svgRef.current);
      zoomRef.current.scaleBy(svg.transition().duration(300), 1 / 1.5);
    }
  };

  const resetGraph = useCallback(() => {
    console.debug("[ChainHound Debug] Resetting graph...");

    // Stop any existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Clear existing graph elements
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.selectAll("g").remove();
      svg.selectAll("defs").remove();
    }

    // Reset zoom
    if (zoomRef.current && svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg
        .transition()
        .duration(500)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }

    // Reset node positions (but preserve pin state)
    resetNodePositions();

    // Force re-render by toggling visibility and incrementing key
    setGraphVisible(false);
    setRandomizeKey((prev) => prev + 1);

    // Small delay to ensure cleanup before re-render
    setTimeout(() => {
      setGraphVisible(true);
    }, 100);
  }, []);

  const fitToView = useCallback(() => {
    if (!svgRef.current || !data) return;

    console.debug("[ChainHound Debug] Fitting graph to view...");

    const svg = d3.select(svgRef.current);
    const container = svg.select("g");

    if (container.empty()) {
      console.warn("[ChainHound Debug] No container found for fit to view");
      return;
    }

    try {
      // Get the bounding box of all nodes
      const nodes = container.selectAll(".nodes g");
      if (nodes.empty()) {
        console.warn("[ChainHound Debug] No nodes found for fit to view");
        return;
      }

      // Calculate bounds
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

      nodes.each(function () {
        const transform = d3.select(this).attr("transform");
        if (transform) {
          const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
          if (match) {
            const x = parseFloat(match[1]);
            const y = parseFloat(match[2]);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      });

      // Add padding for node radius
      const padding = 50;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;

      // Calculate scale and translation
      const width = svgRef.current.clientWidth;
      const height = svgRef.current.clientHeight;
      const graphWidth = maxX - minX;
      const graphHeight = maxY - minY;

      // Calculate fit-to-view scale with some padding
      const scale = Math.min(width / graphWidth, height / graphHeight) * 0.8;
      const translateX = width / 2 - (minX + graphWidth / 2) * scale;
      const translateY = height / 2 - (minY + graphHeight / 2) * scale;

      // Apply transform
      if (zoomRef.current) {
        const transform = d3.zoomIdentity
          .translate(translateX, translateY)
          .scale(scale);

        svg
          .transition()
          .duration(750)
          .call(zoomRef.current.transform, transform);
      }
    } catch (error) {
      console.error("[ChainHound Debug] Error in fitToView:", error);
    }
  }, [data]);

  const renderGraph = () => {
    // This function is called by the useEffect when data changes
    // The actual rendering logic is in the useEffect
    setRandomizeKey((prev) => prev + 1);
  };

  const recenterOnSearchNode = () => {
    if (!svgRef.current || !containerRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Find the main search node (block, transaction, or address)
    let searchNodeId = null;
    if (data.type === "block" && data.block) {
      searchNodeId = `block-${data.block.number}`;
    } else if (data.type === "transaction" && data.transaction) {
      searchNodeId = `tx-${data.transaction.hash}`;
    } else if (data.type === "address") {
      searchNodeId = `addr-${data.address}`;
    }

    if (searchNodeId && simulationRef.current) {
      const nodes = simulationRef.current.nodes();
      const searchNode = nodes.find((n) => n.id === searchNodeId);

      if (
        searchNode &&
        searchNode.x !== undefined &&
        searchNode.y !== undefined
      ) {
        // Center the view on the search node
        const scale = 1.5; // Zoom in a bit
        const translateX = width / 2 - searchNode.x * scale;
        const translateY = height / 2 - searchNode.y * scale;

        svg
          .transition()
          .duration(750)
          .call(
            zoomRef.current!.transform,
            d3.zoomIdentity.scale(scale).translate(translateX, translateY)
          );
      }
    }
  };

  const handleResetZoom = () => {
    if (zoomRef.current && svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg
        .transition()
        .duration(500)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  const expandGraph = () => {
    if (svgRef.current && containerRef.current) {
      const svg = d3.select(svgRef.current);
      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Get current transform
      const transform = d3.zoomTransform(svg.node() as any);
      const currentScale = transform.k;

      // Calculate new scale to fit the view
      const newScale = Math.min(width / 800, height / 600) * 0.9;

      svg
        .transition()
        .duration(750)
        .call(
          zoomRef.current!.transform,
          d3.zoomIdentity.scale(newScale).translate(width / 2, height / 2)
        );
    }
  };

  const togglePin = () => {
    setIsPinned(!isPinned);

    if (simulationRef.current) {
      const simulation = simulationRef.current;

      if (!isPinned) {
        // Pinning the graph - stop elastic movement
        simulation.alphaDecay(1).velocityDecay(1);
        simulation.alpha(0);
      } else {
        // Unpinning the graph - restore elastic movement
        // Preserve fixed positions when restarting
        const fixedPositions = new Map<
          string,
          { fx: number | null; fy: number | null }
        >();
        simulation.nodes().forEach((node) => {
          fixedPositions.set(node.id, { fx: node.fx, fy: node.fy });
        });

        simulation.alphaDecay(0.02).velocityDecay(0.3);
        simulation.alpha(0.3).restart();

        // Restore fixed positions after restart
        setTimeout(() => {
          simulation.nodes().forEach((node) => {
            const fixed = fixedPositions.get(node.id);
            if (fixed) {
              node.fx = fixed.fx;
              node.fy = fixed.fy;
            }
          });
        }, 0);
      }
    }
  };

  const resetNodePositions = () => {
    if (simulationRef.current) {
      const simulation = simulationRef.current;
      const nodes = simulation.nodes();

      // Reset all fixed positions
      nodes.forEach((node) => {
        node.fx = null;
        node.fy = null;
      });

      // Restart simulation with appropriate settings based on pin state
      if (isPinned) {
        // If pinned, stop elastic movement
        simulation.alphaDecay(1).velocityDecay(1);
        simulation.alpha(0);
      } else {
        // If unpinned, restore elastic movement
        simulation.alpha(1).alphaDecay(0.02).velocityDecay(0.3).restart();
      }
    }
  };

  // New function to preserve fixed positions during simulation restarts
  const preserveFixedPositions = () => {
    if (simulationRef.current) {
      const simulation = simulationRef.current;
      const nodes = simulation.nodes();

      // Store current fixed positions
      const fixedPositions = new Map<
        string,
        { fx: number | null; fy: number | null }
      >();
      nodes.forEach((node) => {
        fixedPositions.set(node.id, { fx: node.fx, fy: node.fy });
      });

      // Only restart if there are actually fixed positions to preserve
      const hasFixedPositions = Array.from(fixedPositions.values()).some(
        (pos) => pos.fx !== null || pos.fy !== null
      );

      if (hasFixedPositions) {
        // Restart simulation with minimal alpha to maintain positions
        simulation.alpha(0.05).restart();

        // Restore fixed positions after restart with multiple attempts
        const restorePositions = () => {
          nodes.forEach((node) => {
            const fixed = fixedPositions.get(node.id);
            if (fixed && (fixed.fx !== null || fixed.fy !== null)) {
              node.fx = fixed.fx;
              node.fy = fixed.fy;
            }
          });
        };

        // Try to restore positions multiple times to ensure they stick
        setTimeout(restorePositions, 0);
        setTimeout(restorePositions, 50);
        setTimeout(restorePositions, 100);
      }
    }
  };

  const showSmartContractMenu = (event: any, node: Node) => {
    setSmartContractMenuState({
      show: true,
      nodeId: node.id,
      nodeData: node.data,
      position: { x: event.pageX, y: event.pageY },
    });
  };

  const handleDecompileContract = () => {
    // Navigate to Smart Contract Auditor with the contract address
    const contractAddress = smartContractMenuState.nodeId
      .replace("contract-", "")
      .replace("from_contract-", "")
      .replace("to_contract-", "");
    window.location.href = `/smart-contract-auditor?address=${contractAddress}`;
    setSmartContractMenuState({
      show: false,
      nodeId: "",
      nodeData: undefined,
      position: { x: 0, y: 0 },
    });
  };

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    try {
      // Clear previous graph
      d3.select(svgRef.current).selectAll("*").remove();
      setErrorMessage(null);
      setGraphVisible(false); // Hide graph while drawing

      // Process data into graph format
      const safeData = safelyConvertBigIntToString(data);

      // Collect known contract addresses from transactions
      const knownContracts = new Set<string>();
      if (safeData && safeData.transactions) {
        safeData.transactions.forEach((tx: any) => {
          // Heuristic: if input is not '0x' and to is present, it's likely a contract
          if (tx.to && tx.input && tx.input !== "0x") {
            knownContracts.add(tx.to.toLowerCase());
          }
        });
      }

      // Process data into graph format, pass knownContracts
      const graphData = processDataToGraph(safeData, knownContracts);

      if (graphData.nodes.length === 0) {
        console.debug(
          "[BlockGraph] No nodes returned from processDataToGraph, setting error message."
        );
        setErrorMessage(
          "No graph data to display. Try a different search query."
        );
        return;
      }

      // Get container dimensions
      const containerRect = containerRef.current.getBoundingClientRect();
      const width = containerRect.width || 800;
      const height = containerRect.height || 600;

      // Create SVG
      const svg = d3
        .select(svgRef.current)
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`);

      // Create zoom behavior
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          const { transform } = event;
          setZoomLevel(transform.k);
          svg.select(".graph-container").attr("transform", transform);
        });

      zoomRef.current = zoom;
      svg.call(zoom);

      // Create container group for zoom/pan
      const container = svg.append("g").attr("class", "graph-container");

      // Create a map to store node references
      const nodeMap = new Map<string, Node>();
      graphData.nodes.forEach((node) => {
        nodeMap.set(node.id, node);
      });
      console.debug(
        "[ChainHound Debug] Node map created with",
        nodeMap.size,
        "nodes"
      );

      // Initialize nodes with proper positions to prevent stacking
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.3;

      graphData.nodes.forEach((node, index) => {
        const angle = (index / graphData.nodes.length) * 2 * Math.PI;
        const distance = radius * (0.5 + Math.random() * 0.5);
        node.x = centerX + Math.cos(angle) * distance;
        node.y = centerY + Math.sin(angle) * distance;
        node.fx = null; // Allow free movement
        node.fy = null;
      });

      // Create simulation first
      const simulation = d3
        .forceSimulation<Node>(graphData.nodes)
        .force(
          "link",
          d3
            .forceLink<Node, Link>(graphData.links)
            .id((d) => d.id)
            .distance(120) // Increased distance between connected nodes
        )
        .force("charge", d3.forceManyBody<Node>().strength(-200)) // Reduced repulsion
        .force("center", d3.forceCenter<Node>(width / 2, height / 2))
        .force("collision", d3.forceCollide<Node>().radius(50).strength(0.8)); // Increased collision radius

      // Store simulation reference
      simulationRef.current = simulation;

      // Configure drag behavior to allow free movement with better click handling
      const drag = d3
        .drag<SVGGElement, Node>()
        .on("start", (event, d) => {
          // Track drag start
          dragStateRef.current.isDragging = true;
          dragStateRef.current.dragStartTime = Date.now();

          // Hide tooltip during drag
          d3.selectAll(".tooltip").remove();

          // Ensure simulation is active for dragging
          if (!event.active) {
            simulation.alphaTarget(0.3).restart();
          }

          // Set initial fixed position
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          // Ensure tooltip stays hidden during drag
          d3.selectAll(".tooltip").remove();

          // Update fixed position during drag
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);

          // Only fix node position if there was significant movement
          const dx = event.x - (d.x || 0);
          const dy = event.y - (d.y || 0);
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 5) {
            // Significant movement - fix the node position
            d.fx = event.x;
            d.fy = event.y;
          } else {
            // Minimal movement - treat as a click, don't fix position
            d.fx = null;
            d.fy = null;
          }

          // Reset drag state after a short delay to allow click to fire
          setTimeout(() => {
            dragStateRef.current.isDragging = false;
          }, 50);
        });

      // Create links group first
      const linksGroup = container.append("g").attr("class", "links");
      console.debug("[ChainHound Debug] Created links group");

      // Add arrowhead marker definition BEFORE creating links
      svg
        .append("defs")
        .append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "-0 -5 10 10")
        .attr("refX", 8)
        .attr("refY", 0)
        .attr("orient", "auto")
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("xoverflow", "visible")
        .append("svg:path")
        .attr("d", "M 0,-5 L 10 ,0 L 0,5")
        .attr("fill", "#999")
        .style("stroke", "none");
      console.debug("[ChainHound Debug] Added arrowhead marker");

      // Draw links with proper styling and colors
      const link = linksGroup
        .selectAll("line")
        .data(graphData.links)
        .enter()
        .append("line")
        .attr("stroke-width", 3)
        .attr("stroke", (d: Link): string => {
          if (d.type === "send") return "#ff6b6b"; // Red for source links
          if (d.type === "receive") return "#4ecdc4"; // Teal for destination links
          return "#999"; // Gray for block-transaction links
        })
        .attr("marker-end", "url(#arrowhead)")
        .attr("opacity", 0.8);
      console.debug("[ChainHound Debug] Created", link.size(), "link elements");

      // Draw nodes as groups with larger size - DRAW NODES AFTER LINKS
      const nodeGroup = container
        .append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(graphData.nodes)
        .enter()
        .append("g")
        .attr("cursor", "pointer")
        .call(drag);

      // Add circles to nodes with proper styling
      nodeGroup
        .append("circle")
        .attr("r", 25)
        .attr("fill", (d: any) => {
          switch (d.type) {
            case "address":
              // Different colors for receiving vs sending wallets
              if (d.role === "destination" || d.role === "to") {
                return "#10b981"; // Green for receiving wallets
              } else if (d.role === "source" || d.role === "from") {
                return "#ef4444"; // Red for sending wallets
              }
              return "#6366f1"; // Indigo for unknown role
            case "contract":
              return "#06b6d4"; // Cyan
            case "transaction":
              return "#f59e0b"; // Amber
            case "block":
              return "#3b82f6"; // Blue
            default:
              return "#6b7280"; // Gray
          }
        })
        .attr("stroke", (d: any) => {
          // Add colored border for tagged nodes
          const tags = tagManager.getTagsForNode(d.id);
          if (tags.length > 0) {
            return tags[0].color; // Use first tag's color for border
          }
          return "#1f2937"; // Default dark border
        })
        .attr("stroke-width", (d: any) => {
          // Thicker border for tagged nodes
          const tags = tagManager.getTagsForNode(d.id);
          return tags.length > 0 ? 4 : 2;
        })
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"); // Subtle shadow

      // Add icons to nodes
      nodeGroup
        .append("foreignObject")
        .attr("width", 24)
        .attr("height", 24)
        .attr("x", -12)
        .attr("y", -12)
        .append("xhtml:div")
        .style("width", "100%")
        .style("height", "100%")
        .style("display", "flex")
        .style("align-items", "center")
        .style("justify-content", "center")
        .style("color", "#ffffff")
        .html((d: any) => {
          if (d.type === "block") return nodeRoleIcons.block;
          if (d.type === "transaction") return nodeRoleIcons.transaction;
          if (d.type === "contract") {
            if (d.role === "from") return nodeRoleIcons.from_contract;
            if (d.role === "to") return nodeRoleIcons.to_contract;
            return nodeRoleIcons.contract; // Default contract icon
          }
          if (d.type === "address") {
            if (d.role === "from") return nodeRoleIcons.from_wallet;
            if (d.role === "to") return nodeRoleIcons.to_wallet;
            return nodeRoleIcons.from_wallet; // Default wallet icon
          }
          return nodeRoleIcons.transaction;
        });

      // Add labels with improved readability and tag information
      nodeGroup
        .append("text")
        .text((d: any) => {
          let baseText = "";
          if (d.type === "block") baseText = `Block ${d.blockNumber}`;
          else if (d.type === "transaction")
            baseText = showShortLabels
              ? `Tx ${d.hash?.slice(0, 8) || "N/A"}`
              : `Tx ${d.hash || "N/A"}`;
          else if (d.type === "address" || d.type === "contract") {
            const address = d.data?.address || "N/A";
            baseText = showShortLabels ? address.slice(0, 8) : address;
          } else {
            const id = d.id || "N/A";
            baseText = showShortLabels ? id.slice(0, 8) : id;
          }

          // Add tag information to label
          const tags = tagManager.getTagsForNode(d.id);
          if (tags.length > 0) {
            const tagText = tags.map((tag) => tag.text).join(", ");
            return `${baseText} [${tagText}]`;
          }
          return baseText;
        })
        .attr("text-anchor", "middle")
        .attr("dy", 35)
        .attr("fill", "#f9fafb") // Light gray text
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .attr("font-family", "monospace")
        .style("text-shadow", "0 1px 2px rgba(0,0,0,0.8)"); // Dark shadow for readability

      // Add tooltips with complete node data and proper text wrapping
      nodeGroup
        .on("mouseover", function (event, d) {
          // Remove any existing tooltips first
          d3.selectAll(".tooltip").remove();

          const tooltip = d3
            .select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "#1f2937")
            .style("color", "#f9fafb")
            .style("padding", "12px 16px")
            .style("border-radius", "8px")
            .style("font-size", "12px")
            .style("font-family", "monospace")
            .style("pointer-events", "none")
            .style("z-index", "1000")
            .style("box-shadow", "0 8px 16px rgba(0,0,0,0.4)")
            .style("border", "1px solid #374151")
            .style("max-width", "400px")
            .style("line-height", "1.4")
            .style("word-wrap", "break-word")
            .style("overflow-wrap", "break-word")
            .style("white-space", "normal");

          let tooltipContent = "";

          if (d.type === "block") {
            tooltipContent = `
              <div style="margin-bottom: 8px;">
                <strong style="color: #3b82f6; font-size: 14px;">Block ${
                  d.blockNumber
                }</strong>
              </div>
              <div style="margin-bottom: 4px;"><strong>Hash:</strong> <span style="word-break: break-all;">${
                d.hash || "N/A"
              }</span></div>
              <div style="margin-bottom: 4px;"><strong>Timestamp:</strong> ${
                d.timestamp || "N/A"
              }</div>
              <div style="margin-bottom: 4px;"><strong>Type:</strong> Block</div>
              ${
                d.data
                  ? `<div style="margin-bottom: 4px;"><strong>Gas Used:</strong> ${
                      d.data.gasUsed || "N/A"
                    }</div>`
                  : ""
              }
              ${
                d.data
                  ? `<div style="margin-bottom: 4px;"><strong>Gas Limit:</strong> ${
                      d.data.gasLimit || "N/A"
                    }</div>`
                  : ""
              }
              ${
                d.data
                  ? `<div style="margin-bottom: 4px;"><strong>Difficulty:</strong> ${
                      d.data.difficulty || "N/A"
                    }</div>`
                  : ""
              }
            `;
          } else if (d.type === "transaction") {
            tooltipContent = `
              <div style="margin-bottom: 8px;">
                <strong style="color: #f59e0b; font-size: 14px;">Transaction</strong>
              </div>
              <div style="margin-bottom: 4px;"><strong>Hash:</strong> <span style="word-break: break-all;">${
                d.hash || "N/A"
              }</span></div>
              <div style="margin-bottom: 4px;"><strong>Value:</strong> ${
                d.value || "0"
              } ETH</div>
              <div style="margin-bottom: 4px;"><strong>Block:</strong> ${
                d.blockNumber || "N/A"
              }</div>
              <div style="margin-bottom: 4px;"><strong>Type:</strong> Transaction</div>
              ${
                d.data
                  ? `<div style="margin-bottom: 4px;"><strong>From:</strong> <span style="word-break: break-all;">${
                      d.data.from || "N/A"
                    }</span></div>`
                  : ""
              }
              ${
                d.data
                  ? `<div style="margin-bottom: 4px;"><strong>To:</strong> <span style="word-break: break-all;">${
                      d.data.to || "N/A"
                    }</span></div>`
                  : ""
              }
              ${
                d.data
                  ? `<div style="margin-bottom: 4px;"><strong>Gas:</strong> ${
                      d.data.gas || "N/A"
                    }</div>`
                  : ""
              }
              ${
                d.data
                  ? `<div style="margin-bottom: 4px;"><strong>Gas Price:</strong> ${
                      d.data.gasPrice || "N/A"
                    }</div>`
                  : ""
              }
              ${
                d.data
                  ? `<div style="margin-bottom: 4px;"><strong>Gas Used:</strong> ${
                      d.data.gasUsed || "N/A"
                    }</div>`
                  : ""
              }
              ${
                d.data
                  ? `<div style="margin-bottom: 4px;"><strong>Nonce:</strong> ${
                      d.data.nonce || "N/A"
                    }</div>`
                  : ""
              }
              ${
                d.data
                  ? `<div style="margin-bottom: 4px;"><strong>Input:</strong> <span style="word-break: break-all;">${
                      d.data.input
                        ? d.data.input.length > 50
                          ? d.data.input.slice(0, 50) + "..."
                          : d.data.input
                        : "N/A"
                    }</span></div>`
                  : ""
              }
            `;
          } else if (d.type === "address" || d.type === "contract") {
            tooltipContent = `
              <div style="margin-bottom: 8px;">
                <strong style="color: ${
                  d.type === "contract" ? "#06b6d4" : "#6366f1"
                }; font-size: 14px;">
                  ${d.type === "contract" ? "Smart Contract" : "Address"}
                </strong>
              </div>
              <div style="margin-bottom: 4px;"><strong>Address:</strong> <span style="word-break: break-all;">${
                d.data?.address || "N/A"
              }</span></div>
              <div style="margin-bottom: 4px;"><strong>Role:</strong> ${
                d.role || "Unknown"
              }</div>
              <div style="margin-bottom: 4px;"><strong>Type:</strong> ${
                d.type
              }</div>
              ${
                d.data
                  ? `<div style="margin-bottom: 4px;"><strong>Balance:</strong> ${
                      d.data.balance || "N/A"
                    } ETH</div>`
                  : ""
              }
              ${
                d.data
                  ? `<div style="margin-bottom: 4px;"><strong>Transaction Count:</strong> ${
                      d.data.transactionCount || "N/A"
                    }</div>`
                  : ""
              }
              ${
                d.data && d.type === "contract"
                  ? `<div style="margin-bottom: 4px;"><strong>Contract Code:</strong> ${
                      d.data.code ? "Yes" : "No"
                    }</div>`
                  : ""
              }
            `;
          }

          tooltip.html(tooltipContent);
        })
        .on("mousemove", function (event) {
          const tooltip = d3.select(".tooltip");
          if (!tooltip.empty()) {
            const tooltipNode = tooltip.node();
            if (tooltipNode) {
              const rect = tooltipNode.getBoundingClientRect();
              const windowWidth = window.innerWidth;
              const windowHeight = window.innerHeight;

              let left = event.pageX + 10;
              let top = event.pageY - 10;

              // Adjust if tooltip would go off screen
              if (left + rect.width > windowWidth) {
                left = event.pageX - rect.width - 10;
              }
              if (top + rect.height > windowHeight) {
                top = event.pageY - rect.height - 10;
              }
              if (left < 0) left = 10;
              if (top < 0) top = 10;

              tooltip.style("left", left + "px").style("top", top + "px");
            }
          }
        })
        .on("mouseout", function () {
          d3.selectAll(".tooltip").remove();
        });

      // Add click handlers - only trigger callbacks, don't reset graph
      nodeGroup.on("click", (event, d) => {
        // Prevent event propagation to avoid graph reorganization
        event.stopPropagation();

        // Only trigger click if it wasn't a drag
        if (!dragStateRef.current.isDragging && onNodeClick) {
          onNodeClick(d as Node);
        }
      });

      // Add right-click handler for tag menu
      nodeGroup.on("contextmenu", (event, d) => {
        event.preventDefault();
        event.stopPropagation();

        const node = d as Node;

        // Check if this is a smart contract node
        if (
          node.type === "contract" ||
          (node.type === "address" && node.role?.includes("contract"))
        ) {
          // Show smart contract context menu
          showSmartContractMenu(event, node);
        } else {
          // Show regular tag menu
          setTagMenuState({
            show: true,
            nodeId: d.id,
            nodeType: d.type,
            nodeData: d.data,
            position: { x: event.pageX, y: event.pageY },
          });
        }
      });

      // Add double-click handler for tag menu (instead of resetting graph)
      nodeGroup.on("dblclick", (event, d) => {
        event.preventDefault();
        event.stopPropagation();

        setTagMenuState({
          show: true,
          nodeId: d.id,
          nodeType: d.type,
          nodeData: d.data,
          position: { x: event.pageX, y: event.pageY },
        });
      });

      // Start simulation with adjusted parameters for better control
      // Only restart if not already running to prevent unnecessary resets
      if (!simulation.alpha()) {
        // Preserve any existing fixed positions when starting simulation
        const fixedPositions = new Map<
          string,
          { fx: number | null; fy: number | null }
        >();
        simulation.nodes().forEach((node) => {
          fixedPositions.set(node.id, { fx: node.fx, fy: node.fy });
        });

        simulation.alpha(1).alphaDecay(0.02).velocityDecay(0.3).restart();

        // Restore fixed positions after restart
        setTimeout(() => {
          simulation.nodes().forEach((node) => {
            const fixed = fixedPositions.get(node.id);
            if (fixed) {
              node.fx = fixed.fx;
              node.fy = fixed.fy;
            }
          });
        }, 0);
      }

      // Ensure simulation stays active for dragging
      simulation.on("end", () => {
        // Keep simulation alive for dragging even when it naturally ends
        // But preserve fixed positions (fx, fy) when restarting
        if (!isPinned) {
          // Only restart if there are nodes with fixed positions AND the simulation has actually stopped
          const hasFixedPositions = simulation
            .nodes()
            .some((node) => node.fx !== null || node.fy !== null);
          const isSimulationActive = simulation.alpha() > 0;

          if (hasFixedPositions && !isSimulationActive) {
            // Small delay to ensure the simulation has fully stopped
            setTimeout(() => {
              preserveFixedPositions();
            }, 10);
          }
        }
      });

      // Update positions on each tick
      simulation.on("tick", () => {
        // Update link positions with proper node lookup
        link
          .attr("x1", (d: Link) => {
            const sourceId =
              typeof d.source === "string" ? d.source : d.source.id;
            const source = nodeMap.get(sourceId);
            return source?.x ?? 0;
          })
          .attr("y1", (d: Link) => {
            const sourceId =
              typeof d.source === "string" ? d.source : d.source.id;
            const source = nodeMap.get(sourceId);
            return source?.y ?? 0;
          })
          .attr("x2", (d: Link) => {
            const targetId =
              typeof d.target === "string" ? d.target : d.target.id;
            const target = nodeMap.get(targetId);
            return target?.x ?? 0;
          })
          .attr("y2", (d: Link) => {
            const targetId =
              typeof d.target === "string" ? d.target : d.target.id;
            const target = nodeMap.get(targetId);
            return target?.y ?? 0;
          });

        // Update node positions
        nodeGroup.attr(
          "transform",
          (d: Node) => `translate(${d.x ?? 0},${d.y ?? 0})`
        );
      });

      // Show graph after rendering
      setTimeout(() => {
        setGraphVisible(true);
      }, 200);
    } catch (error) {
      console.error("Error rendering graph:", error);
      setErrorMessage(
        `Failed to render graph: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setGraphVisible(false);
    }
  }, [data, onNodeClick, onNodeDoubleClick, randomizeKey, showShortLabels]);

  // Add error message display
  if (errorMessage) {
    return (
      <div className="flex items-center justify-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
        <span className="text-red-700 dark:text-red-300">{errorMessage}</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gray-900">
      <div
        ref={containerRef}
        className="w-full h-full border border-gray-700 rounded-lg overflow-hidden bg-gray-900"
      >
        <svg
          ref={svgRef}
          className="w-full h-full bg-gray-900"
          style={{ display: graphVisible ? "block" : "none" }}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      {/* Tag Menu */}
      {tagMenuState.show && (
        <TagMenu
          nodeId={tagMenuState.nodeId}
          nodeType={tagMenuState.nodeType}
          nodeData={tagMenuState.nodeData}
          position={tagMenuState.position}
          onClose={() => setTagMenuState((prev) => ({ ...prev, show: false }))}
          onTagAdded={(tag) => {
            // Force re-render to update node appearance
            setRandomizeKey((prev) => prev + 1);
          }}
          onTagUpdated={(tag) => {
            // Force re-render to update node appearance
            setRandomizeKey((prev) => prev + 1);
          }}
          onTagRemoved={(tagId) => {
            // Force re-render to update node appearance
            setRandomizeKey((prev) => prev + 1);
          }}
        />
      )}

      {/* Smart Contract Menu */}
      {smartContractMenuState.show && (
        <div
          className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-2 min-w-48"
          style={{
            left: smartContractMenuState.position.x,
            top: smartContractMenuState.position.y,
          }}
        >
          <div className="text-white text-sm font-medium mb-2 px-2 py-1 border-b border-gray-600">
            Smart Contract
          </div>
          <button
            onClick={handleDecompileContract}
            className="w-full text-left px-2 py-1 text-gray-300 hover:bg-gray-700 rounded text-sm flex items-center space-x-2"
          >
            <Code className="h-4 w-4" />
            <span>Decompile & Analyze</span>
          </button>
          <button
            onClick={() =>
              setSmartContractMenuState({
                show: false,
                nodeId: "",
                nodeData: undefined,
                position: { x: 0, y: 0 },
              })
            }
            className="w-full text-left px-2 py-1 text-gray-300 hover:bg-gray-700 rounded text-sm flex items-center space-x-2"
          >
            <TagIcon className="h-4 w-4" />
            <span>Add Tag</span>
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="absolute top-4 right-4 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-2">
        <div className="flex flex-col gap-1">
          {/* Zoom Controls */}
          <button
            onClick={() => {
              if (zoomRef.current && svgRef.current) {
                const svg = d3.select(svgRef.current);
                svg
                  .transition()
                  .duration(500)
                  .call(zoomRef.current.scaleBy, 1.2);
              }
            }}
            className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
            title="Zoom In"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </button>
          <button
            onClick={() => {
              if (zoomRef.current && svgRef.current) {
                const svg = d3.select(svgRef.current);
                svg
                  .transition()
                  .duration(500)
                  .call(zoomRef.current.scaleBy, 0.8);
              }
            }}
            className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 12H6"
              />
            </svg>
          </button>

          {/* Divider */}
          <div className="border-t border-gray-600 my-1"></div>

          {/* Action Controls */}
          <button
            onClick={resetGraph}
            className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
            title="Refresh Graph Layout"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button
            onClick={fitToView}
            className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
            title="Scale Graph to View"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </button>
          <button
            onClick={() => setShowShortLabels(!showShortLabels)}
            className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
            title={showShortLabels ? "Show Full Labels" : "Show Short Labels"}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <button
            onClick={captureGraph}
            className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
            title="Capture Graph"
          >
            <Camera className="w-4 h-4" />
          </button>
          <button
            onClick={togglePin}
            className={`p-2 hover:bg-gray-700 rounded transition-colors ${
              isPinned
                ? "text-blue-400 hover:text-blue-300"
                : "text-gray-300 hover:text-white"
            }`}
            title={
              isPinned
                ? "Unpin Graph (Enable Elastic Movement)"
                : "Pin Graph (Disable Elastic Movement)"
            }
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockGraph;
