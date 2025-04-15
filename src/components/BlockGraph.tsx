import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import type {
  SimulationNodeDatum,
  SimulationLinkDatum,
  DragBehavior,
} from "d3";
import {
  Wallet,
  Cog,
  Box,
  ArrowRight,
  Cuboid as Cube,
  AlertTriangle,
} from "lucide-react";
import {
  formatWeiToEth,
  safelyConvertBigIntToString,
} from "../utils/bigIntUtils";
import BlockLegend from "./BlockLegend";
import Web3 from "web3";

interface Node extends d3.SimulationNodeDatum {
  id: string;
  type: "address" | "contract" | "transaction" | "block";
  role?: "from" | "to" | "source" | "destination";
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

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
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

// Full-featured processDataToGraph implementation
function processDataToGraph(
  data: any,
  knownContracts?: Set<string>
): GraphData {
  console.debug("[ChainHound Debug] processDataToGraph called", {
    data,
    knownContracts,
  });
  if (!data) return { nodes: [], links: [] };
  const nodes: Node[] = [];
  const links: Link[] = [];
  const nodeMap = new Map<string, Node>();
  const linkSet = new Set<string>();

  // Helper to add a node if not exists
  function addNode(node: Node) {
    if (!nodeMap.has(node.id)) {
      nodeMap.set(node.id, node);
      nodes.push(node);
      console.debug("[ChainHound Debug] Added node", node);
    }
  }

  // Helper to add a link if not exists
  function addLink(link: Link) {
    const sourceId =
      typeof link.source === "string" ? link.source : link.source.id;
    const targetId =
      typeof link.target === "string" ? link.target : link.target.id;
    const key = `${sourceId}->${targetId}`;
    if (!linkSet.has(key)) {
      linkSet.add(key);
      links.push({
        ...link,
        source: sourceId,
        target: targetId,
      });
    }
  }

  // Process block data
  if (data.type === "block" && data.block) {
    const block = data.block;
    // Add block node
    addNode({
      id: block.hash,
      type: "block",
      hash: block.hash,
      blockNumber: block.number,
      timestamp: block.timestamp,
    });

    // Process transactions
    if (block.transactions && Array.isArray(block.transactions)) {
      block.transactions.forEach((tx: any) => {
        // Add transaction node
        addNode({
          id: tx.hash,
          type: "transaction",
          hash: tx.hash,
          blockNumber: block.number,
          timestamp: tx.timestamp || block.timestamp,
          value: tx.value,
        });

        // Link transaction to block
        addLink({
          source: tx.hash,
          target: block.hash,
          value: tx.value,
          type: "interact",
          gas: tx.gas,
          gasPrice: tx.gasPrice,
          gasUsed: tx.gasUsed,
        });

        // Process source (from) address
        if (tx.from) {
          const isContract =
            knownContracts?.has(tx.from.toLowerCase()) || false;
          addNode({
            id: tx.from,
            type: isContract ? "contract" : "address",
            role: "source",
          });
          addLink({
            source: tx.from,
            target: tx.hash,
            value: tx.value,
            type: "send",
          });
        }

        // Process destination (to) address
        if (tx.to) {
          const isContract = knownContracts?.has(tx.to.toLowerCase()) || false;
          addNode({
            id: tx.to,
            type: isContract ? "contract" : "address",
            role: "destination",
          });
          addLink({
            source: tx.hash,
            target: tx.to,
            value: tx.value,
            type: "receive",
          });
        }
      });
    }
  } else if (data.type === "address" || data.type === "contract") {
    // Address/contract search: node, all txs, counterparties
    const addr = data.address;
    const isContract = data.isContract || false;
    addNode({
      id: addr,
      type: isContract ? "contract" : "address",
    });
    if (data.transactions && Array.isArray(data.transactions)) {
      data.transactions.forEach((tx: any) => {
        // Transaction node
        addNode({
          id: tx.hash,
          type: "transaction",
          hash: tx.hash,
          blockNumber: tx.blockNumber,
          timestamp: tx.timestamp,
          value: tx.value,
        });
        // Link: tx -> block (if block info available)
        if (tx.blockHash) {
          addNode({
            id: tx.blockHash,
            type: "block",
            hash: tx.blockHash,
            blockNumber: tx.blockNumber,
          });
          addLink({
            source: tx.hash,
            target: tx.blockHash,
            value: tx.value,
            type: "interact",
            gas: tx.gas,
            gasPrice: tx.gasPrice,
            gasUsed: tx.gasUsed,
          });
        }
        // From node
        if (tx.from) {
          const isFromContract =
            knownContracts?.has(tx.from.toLowerCase()) || false;
          addNode({
            id: tx.from,
            type: isFromContract ? "contract" : "address",
            role: "source",
          });
          addLink({
            source: tx.from,
            target: tx.hash,
            value: tx.value,
            type: "send",
          });
        }
        // To node
        if (tx.to) {
          const isToContract =
            knownContracts?.has(tx.to.toLowerCase()) || false;
          addNode({
            id: tx.to,
            type: isToContract ? "contract" : "address",
            role: "destination",
          });
          addLink({
            source: tx.hash,
            target: tx.to,
            value: tx.value,
            type: "receive",
          });
        }
      });
    }
  } else if (data.type === "transaction" && data.transaction) {
    // Transaction search: tx node, block, from, to
    const tx = data.transaction;
    addNode({
      id: tx.hash,
      type: "transaction",
      hash: tx.hash,
      blockNumber: tx.blockNumber,
      timestamp: tx.timestamp,
      value: tx.value,
    });
    if (tx.blockHash) {
      addNode({
        id: tx.blockHash,
        type: "block",
        hash: tx.blockHash,
        blockNumber: tx.blockNumber,
      });
      addLink({
        source: tx.hash,
        target: tx.blockHash,
        value: tx.value,
        type: "interact",
        gas: tx.gas,
        gasPrice: tx.gasPrice,
        gasUsed: tx.gasUsed,
      });
    }
    if (tx.from) {
      const isFromContract =
        knownContracts?.has(tx.from.toLowerCase()) || false;
      addNode({
        id: tx.from,
        type: isFromContract ? "contract" : "address",
        role: "source",
      });
      addLink({
        source: tx.from,
        target: tx.hash,
        value: tx.value,
        type: "send",
      });
    }
    if (tx.to) {
      const isToContract = knownContracts?.has(tx.to.toLowerCase()) || false;
      addNode({
        id: tx.to,
        type: isToContract ? "contract" : "address",
        role: "destination",
      });
      addLink({
        source: tx.hash,
        target: tx.to,
        value: tx.value,
        type: "receive",
      });
    }
  }

  console.debug("[ChainHound Debug] Returning graphData", { nodes, links });
  return { nodes, links };
}

const BlockGraph: React.FC<BlockGraphProps> = ({
  data,
  onNodeClick,
  onNodeDoubleClick,
}) => {
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

  // Helper to reset graph positions
  const resetGraph = () => {
    setRandomizeKey((k) => k + 1);
  };

  // Helper to randomize (jiggle) node positions
  const randomizeGraph = () => {
    if (simulationRef.current) {
      simulationRef.current.nodes().forEach((node) => {
        node.x += (Math.random() - 0.5) * 80;
        node.y += (Math.random() - 0.5) * 80;
        node.fx = node.x;
        node.fy = node.y;
      });
      simulationRef.current.alpha(0.7).restart();
      setTimeout(() => {
        simulationRef.current?.stop();
        simulationRef.current?.nodes().forEach((node) => {
          node.fx = node.x;
          node.fy = node.y;
        });
      }, 800);
    }
  };

  // --- CONTEXT MENU & LABELS ---
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: any;
  } | null>(null);
  const [nodeLabels, setNodeLabels] = useState<
    Record<string, { text: string; color: string }>
  >({});
  const [labelInput, setLabelInput] = useState("");

  // Handle left-click on node to show label menu
  function handleNodeClick(event: MouseEvent, d: Node) {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, node: d });
    setLabelInput(nodeLabels[d.id]?.text || "");
  }

  // Handle right-click on node
  function handleNodeContextMenu(event: MouseEvent, d: Node) {
    event.preventDefault();
    // Right-click is now used for dragging, so we don't show the context menu
  }

  // Handle label save
  function handleLabelSave() {
    if (contextMenu && contextMenu.node) {
      const color =
        labelColors[Object.keys(nodeLabels).length % labelColors.length];
      setNodeLabels((prev) => ({
        ...prev,
        [contextMenu.node.id]: { text: labelInput, color },
      }));
      setContextMenu(null);
    }
  }

  // D3 rendering with icons, full metadata, context menu, and labels
  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;
    try {
      d3.select(svgRef.current).selectAll("*").remove();
      setErrorMessage(null);
      setGraphVisible(false);
      const safeData = safelyConvertBigIntToString(data);
      const knownContracts = new Set<string>();
      if (safeData && safeData.transactions) {
        safeData.transactions.forEach((tx: any) => {
          if (tx.to && tx.input && tx.input !== "0x") {
            knownContracts.add(tx.to.toLowerCase());
          }
        });
      }
      const graphData = processDataToGraph(safeData, knownContracts);
      if (graphData.nodes.length === 0) {
        setErrorMessage(
          "No graph data to display. Try a different search query."
        );
        return;
      }

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      // Create SVG with proper dimensions
      const svg = d3
        .select(svgRef.current)
        .attr("width", width)
        .attr("height", height);

      // Create a group for the graph that will be transformed
      const g = svg.append("g").attr("class", "graph-group");

      // Set up zoom behavior
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        });

      // Apply zoom to SVG
      svg.call(zoom);

      // Store zoom for controls
      (svgRef.current as any).__zoomBehavior = zoom;

      // Find main node (search term or block)
      let mainNodeId = null;
      if (safeData?.type === "block" && safeData.block)
        mainNodeId = safeData.block.hash;
      else if (
        (safeData?.type === "address" || safeData?.type === "contract") &&
        safeData.address
      )
        mainNodeId = safeData.address;
      else if (safeData?.type === "transaction" && safeData.transaction)
        mainNodeId = safeData.transaction.hash;

      // Set initial positions: spiral out from the center
      const centerX = width / 2;
      const centerY = height / 2;
      const spiralSeparation = 60;
      let spiralIndex = 0;

      graphData.nodes.forEach((node) => {
        if (node.id === mainNodeId) {
          node.x = centerX;
          node.y = centerY;
          node.fx = centerX;
          node.fy = centerY;
        } else {
          // Spiral formula: r = a + b*theta
          const theta = spiralIndex * 0.7;
          const r = spiralSeparation * Math.sqrt(spiralIndex + 1);
          node.x = centerX + r * Math.cos(theta);
          node.y = centerY + r * Math.sin(theta);
          spiralIndex++;
        }
      });

      // Create drag behavior
      const drag = d3
        .drag<SVGGElement, Node>()
        .on("start", function (event, d) {
          if (!event.active && simulation)
            simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", function (event, d) {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", function (event, d) {
          if (!event.active && simulation) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        });

      // Create a map to store node references
      const nodeMap = new Map<string, Node>();
      graphData.nodes.forEach((node) => {
        nodeMap.set(node.id, node);
      });

      // Draw links with proper styling and colors
      const link = g
        .append("g")
        .attr("stroke-opacity", 1)
        .lower() // Ensure links are beneath nodes
        .selectAll<SVGLineElement, Link>("line")
        .data(graphData.links)
        .enter()
        .append("line")
        .attr("stroke-width", 3)
        .attr("stroke", (d: Link): string => {
          if (d.type === "send") return "#e11d48"; // Strong red for source links
          if (d.type === "receive") return "#0ea5e9"; // Strong blue for destination links
          return "#6366f1"; // Indigo for other links
        })
        .attr("marker-end", "url(#arrowhead)");

      // Add arrowhead marker definition
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

      // Draw nodes as groups with larger size
      const nodeGroup = g
        .append("g")
        .selectAll<SVGGElement, Node>("g")
        .data(graphData.nodes)
        .enter()
        .append("g")
        .attr("cursor", "pointer")
        .call(drag);

      // Draw nodes as circles with larger radius
      nodeGroup
        .append("circle")
        .attr("r", 30)
        .attr("fill", (d: Node): string => {
          if (d.type === "block") return nodeRoleColors.block;
          if (d.type === "transaction") return nodeRoleColors.transaction;
          if (d.type === "contract")
            return d.role === "source"
              ? nodeRoleColors.from_contract
              : nodeRoleColors.to_contract;
          if (d.type === "address")
            return d.role === "source"
              ? nodeRoleColors.from_wallet
              : nodeRoleColors.to_wallet;
          return "#aaa";
        });

      // Add node icons with proper centering
      nodeGroup
        .append("foreignObject")
        .attr("x", -14)
        .attr("y", -14)
        .attr("width", 28)
        .attr("height", 28)
        .attr("transform", "translate(0, 0)")
        .html((d: Node): string => {
          if (d.type === "block") return nodeRoleIcons.block;
          if (d.type === "transaction") return nodeRoleIcons.transaction;
          if (d.type === "contract")
            return d.role === "source"
              ? nodeRoleIcons.from_contract
              : nodeRoleIcons.to_contract;
          if (d.type === "address")
            return d.role === "source"
              ? nodeRoleIcons.from_wallet
              : nodeRoleIcons.to_wallet;
          return "";
        });

      // Add labels with better visibility and positioning, multiline
      nodeGroup
        .append("text")
        .attr("y", 38)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .attr("fill", "#ffffff")
        .attr("stroke", "#000000")
        .attr("stroke-width", "0.5px")
        .attr("paint-order", "stroke")
        .selectAll("tspan")
        .data((d: Node) => {
          if (d.type === "block") {
            return [
              `Block #${d.blockNumber}`,
              `Hash: ${d.hash}`,
              d.timestamp
                ? `Time: ${new Date(
                    Number(d.timestamp) * 1000
                  ).toLocaleString()}`
                : "",
            ];
          }
          if (d.type === "transaction") {
            return [
              `Tx Hash: ${d.hash}`,
              `Value: ${formatWeiToEth(d.value || "0")} ETH`,
            ];
          }
          if (d.type === "address" || d.type === "contract") {
            return [
              `Address: ${d.id}`,
              `Type: ${d.type}${d.role ? ` (${d.role})` : ""}`,
            ];
          }
          return [d.id];
        })
        .enter()
        .append("tspan")
        .attr("x", 0)
        .attr("dy", (d, i) => (i === 0 ? 0 : 15))
        .text((d) => d);

      // Add gas information to links, positioned at link midpoint
      const gasLabels = g
        .append("g")
        .selectAll<SVGTextElement, Link>("text")
        .data(graphData.links.filter((l) => l.gas || l.gasPrice || l.gasUsed))
        .enter()
        .append("text")
        .attr("font-size", 11)
        .attr("fill", "#fff")
        .attr("stroke", "#000")
        .attr("stroke-width", "0.5px")
        .attr("paint-order", "stroke")
        .attr("text-anchor", "middle");

      // Simulation with adjusted forces for better layout
      const simulation = d3
        .forceSimulation<Node>(graphData.nodes)
        .force(
          "link",
          d3
            .forceLink<Node, Link>(graphData.links)
            .id((d) => d.id)
            .distance(180)
        )
        .force("charge", d3.forceManyBody<Node>().strength(-700))
        .force("center", d3.forceCenter<Node>(width / 2, height / 2))
        .force("collision", d3.forceCollide<Node>().radius(55).strength(1));

      simulation.alpha(1).restart();

      simulation.on("tick", () => {
        link
          .attr("x1", (d: Link) => {
            const source = nodeMap.get(d.source as string);
            return source?.x ?? 0;
          })
          .attr("y1", (d: Link) => {
            const source = nodeMap.get(d.source as string);
            return source?.y ?? 0;
          })
          .attr("x2", (d: Link) => {
            const target = nodeMap.get(d.target as string);
            return target?.x ?? 0;
          })
          .attr("y2", (d: Link) => {
            const target = nodeMap.get(d.target as string);
            return target?.y ?? 0;
          });

        nodeGroup.attr(
          "transform",
          (d: Node) => `translate(${d.x ?? 0},${d.y ?? 0})`
        );

        // Update gas label positions to be at the midpoint of each link
        gasLabels
          .attr("x", (l: Link) => {
            const source = nodeMap.get(l.source as string);
            const target = nodeMap.get(l.target as string);
            return source && target ? (source.x + target.x) / 2 : 0;
          })
          .attr("y", (l: Link) => {
            const source = nodeMap.get(l.source as string);
            const target = nodeMap.get(l.target as string);
            return source && target ? (source.y + target.y) / 2 : 0;
          })
          .text((l: Link): string => {
            const parts: string[] = [];
            if (l.gas) parts.push(`Gas: ${l.gas}`);
            if (l.gasPrice)
              parts.push(`GasPrice: ${formatWeiToEth(l.gasPrice)} Gwei`);
            if (l.gasUsed) parts.push(`GasUsed: ${l.gasUsed}`);
            return parts.join(" | ");
          });
      });

      simulationRef.current = simulation;
      setGraphVisible(true);
    } catch (error) {
      setErrorMessage(
        `Failed to render graph: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setGraphVisible(false);
    }
  }, [data, onNodeClick, onNodeDoubleClick, randomizeKey, nodeLabels]);

  // Update zoom controls
  const zoomIn = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoom = (svgRef.current as any).__zoomBehavior;
    if (!zoom) return;
    svg.transition().duration(200).call(zoom.scaleBy, 1.2);
  };

  const zoomOut = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoom = (svgRef.current as any).__zoomBehavior;
    if (!zoom) return;
    svg.transition().duration(200).call(zoom.scaleBy, 0.8);
  };

  // Add error message display
  if (errorMessage) {
    return (
      <div className="flex items-center justify-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
        <span className="text-red-700 dark:text-red-300">{errorMessage}</span>
      </div>
    );
  }

  // --- LEGEND, ZOOM, CONTEXT MENU, LABELS ---
  // Legend items
  const legendItems = [
    {
      key: "block",
      label: "Block ID",
      color: nodeRoleColors.block,
      icon: nodeRoleIcons.block,
    },
    {
      key: "transaction",
      label: "Transaction",
      color: nodeRoleColors.transaction,
      icon: nodeRoleIcons.transaction,
    },
    {
      key: "from_wallet",
      label: "Wallet (from)",
      color: nodeRoleColors.from_wallet,
      icon: nodeRoleIcons.from_wallet,
    },
    {
      key: "to_wallet",
      label: "Wallet (to)",
      color: nodeRoleColors.to_wallet,
      icon: nodeRoleIcons.to_wallet,
    },
    {
      key: "from_contract",
      label: "Contract (from)",
      color: nodeRoleColors.from_contract,
      icon: nodeRoleIcons.from_contract,
    },
    {
      key: "to_contract",
      label: "Contract (to)",
      color: nodeRoleColors.to_contract,
      icon: nodeRoleIcons.to_contract,
    },
  ];

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[600px] relative bg-white dark:bg-gray-900 rounded-lg shadow-sm"
    >
      {/* Legend */}
      <div className="absolute top-4 left-4 z-20 bg-white/90 dark:bg-gray-900/90 rounded shadow p-2 flex flex-col gap-2 border border-gray-200 dark:border-gray-700">
        {legendItems.map((item, i) => (
          <div key={item.key} className="flex items-center gap-2">
            <span
              dangerouslySetInnerHTML={{ __html: item.icon }}
              style={{ color: item.color }}
            />
            <span
              className="text-xs font-semibold"
              style={{ color: item.color }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={zoomIn}
          className="bg-indigo-600 text-white rounded p-2 shadow w-10 h-10 flex items-center justify-center text-lg font-bold"
        >
          +
        </button>
        <button
          onClick={zoomOut}
          className="bg-indigo-600 text-white rounded p-2 shadow w-10 h-10 flex items-center justify-center text-lg font-bold"
        >
          -
        </button>
      </div>
      {/* Graph SVG */}
      <svg
        ref={svgRef}
        className={`w-full h-full transition-opacity duration-300 ${
          graphVisible ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* Context menu for tagging */}
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 1000,
          }}
          className="bg-white border rounded shadow p-2"
        >
          <div className="mb-2 font-semibold">Tag label</div>
          <input
            className="border rounded px-2 py-1 text-xs w-32 mb-2"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            placeholder="Enter label"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              className="bg-indigo-600 text-white px-2 py-1 rounded text-xs"
              onClick={handleLabelSave}
            >
              Save
            </button>
            <button
              className="bg-gray-200 px-2 py-1 rounded text-xs"
              onClick={() => setContextMenu(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Legend and color/icon definitions
const nodeRoleColors = {
  block: "#6366f1",
  transaction: "#f59e42",
  from_wallet: "#059669", // dark green
  to_wallet: "#0ea5e9", // vivid blue
  from_contract: "#a21caf", // deep purple
  to_contract: "#dc2626", // strong red
};
const nodeRoleIcons = {
  block:
    '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>', // 3D cube style
  transaction:
    '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M8 12h8M12 8v8"/></svg>',
  from_wallet:
    '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="10" rx="2"/><circle cx="7" cy="12" r="1.5"/></svg>', // wallet icon
  to_wallet:
    '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="10" rx="2"/><circle cx="17" cy="12" r="1.5"/></svg>', // wallet icon
  from_contract:
    '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/><circle cx="12" cy="12" r="4"/><path d="M15.5 8.5l-7 7"/></svg>', // cog icon
  to_contract:
    '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l-3 3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/><circle cx="12" cy="12" r="4"/><path d="M8.5 8.5l7 7"/></svg>', // cog icon
};
const labelColors = [
  "#f87171",
  "#fbbf24",
  "#34d399",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#facc15",
  "#4ade80",
  "#38bdf8",
  "#818cf8",
  "#f472b6",
  "#fcd34d",
  "#6ee7b7",
  "#93c5fd",
  "#c4b5fd",
  "#f9a8d4",
  "#fde68a",
  "#bbf7d0",
  "#a5b4fc",
  "#fbcfe8",
  "#fef08a",
  "#bef264",
  "#fca5a5",
  "#fdba74",
  "#fcd34d",
  "#a3e635",
  "#fbbf24",
  "#f472b6",
  "#f87171",
  "#fbbf24",
  "#34d399",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#facc15",
  "#4ade80",
  "#38bdf8",
  "#818cf8",
  "#f472b6",
  "#fcd34d",
  "#6ee7b7",
  "#93c5fd",
  "#c4b5fd",
  "#f9a8d4",
  "#fde68a",
  "#bbf7d0",
  "#a5b4fc",
  "#fbcfe8",
  "#fef08a",
  "#bef264",
  "#fca5a5",
  "#fdba74",
  "#fcd34d",
  "#a3e635",
  "#fbbf24",
  "#f472b6",
];

export default BlockGraph;
