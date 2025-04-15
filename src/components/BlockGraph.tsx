import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
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

interface Node {
  id: string;
  type: "address" | "contract" | "transaction" | "block";
  role?: "from" | "to";
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

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    try {
      // Clear previous graph
      d3.select(svgRef.current).selectAll("*").remove();
      setErrorMessage(null);

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
      console.debug(
        "[BlockGraph] Rendering graph with nodes:",
        graphData.nodes
      );
      console.debug(
        "[BlockGraph] Rendering graph with links:",
        graphData.links
      );

      // Set up the SVG with full width
      const svg = d3.select(svgRef.current);
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight || 600;

      svg
        .attr("width", "100%")
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`);

      // Check if dark mode is enabled
      const isDarkMode = document.documentElement.classList.contains("dark");

      // Define colors
      const nodeColors = {
        address: "#4f46e5", // indigo
        contract: "#0891b2", // cyan
        transaction: "#f59e0b", // amber
        block: "#3b82f6", // blue
      };

      const roleColors = {
        from: "#ef4444", // red
        to: "#10b981", // emerald
      };

      const linkColors = {
        send: "#9333ea", // purple
        receive: "#10b981", // emerald
        interact: "#8b5cf6", // violet
      };

      // Layout: block node in center, transactions spiral, addresses/contracts extend out
      const centerX = width / 2;
      const centerY = height / 2;
      // Find block node
      const blockNode = graphData.nodes.find((n) => n.type === "block");
      if (blockNode) {
        blockNode.x = centerX;
        blockNode.y = centerY;
        blockNode.fx = centerX;
        blockNode.fy = centerY;
      }
      // Spiral layout for transactions
      const txNodes = graphData.nodes.filter((n) => n.type === "transaction");
      const spiralStep = 40; // reduced from 60
      const spiralAngleStep = Math.PI / 8; // tighter spiral
      const spiralStartAngle = -Math.PI / 2; // Start from directly above

      // Place transaction nodes in a spiral starting above the block node
      txNodes.forEach((node, i) => {
        const angle = spiralStartAngle + i * spiralAngleStep;
        const radius = 120 + i * spiralStep;
        node.x = centerX + Math.cos(angle) * radius;
        node.y = centerY + Math.sin(angle) * radius;
        node.fx = node.x;
        node.fy = node.y;
      });
      // Improved spiral/angle layout for addresses/contracts
      // Place 'from' and 'to' nodes at distinct angles from the transaction node
      const txNodeMap = new Map(
        graphData.nodes
          .filter((n) => n.type === "transaction")
          .map((n) => [n.id, n])
      );
      graphData.nodes.forEach((node, idx) => {
        if (node.type === "address" || node.type === "contract") {
          // Find all links to this node
          const linksTo = graphData.links.filter((l) => l.target === node.id);
          const linksFrom = graphData.links.filter((l) => l.source === node.id);
          // If this node is a 'from' or 'to' for a transaction, offset at distinct angles
          let txLink = null;
          let angle = 0;
          let dist = 100 + Math.random() * 30;
          if (node.role === "from") {
            txLink = linksTo.find((l) => txNodeMap.has(l.target));
            angle = -Math.PI / 3; // -60 degrees
          } else if (node.role === "to") {
            txLink = linksFrom.find((l) => txNodeMap.has(l.source));
            angle = Math.PI / 3; // +60 degrees
          }
          if (txLink) {
            const txNode = txNodeMap.get(
              node.role === "from" ? txLink.target : txLink.source
            );
            if (txNode) {
              node.x = txNode.x + Math.cos(angle) * dist;
              node.y = txNode.y + Math.sin(angle) * dist;
              node.fx = node.x;
              node.fy = node.y;
              return;
            }
          }
          // Fallback: spread other address/contract nodes around their transaction(s)
          const txLinks = linksTo
            .concat(linksFrom)
            .filter((l) => txNodeMap.has(l.source) || txNodeMap.has(l.target));
          txLinks.forEach((link, i) => {
            const txNode =
              txNodeMap.get(link.source) || txNodeMap.get(link.target);
            if (txNode) {
              const angle =
                (2 * Math.PI * i) / txLinks.length + Math.random() * 0.2;
              const dist = 100 + Math.random() * 30;
              node.x = txNode.x + Math.cos(angle) * dist;
              node.y = txNode.y + Math.sin(angle) * dist;
              node.fx = node.x;
              node.fy = node.y;
            }
          });
        }
      });

      // Place 'from' and 'to' nodes at 260° and 30° from the transaction node
      graphData.nodes.forEach((node) => {
        if (node.type === "address" || node.type === "contract") {
          let txLink = null;
          let angle = 0;
          let dist = 110 + Math.random() * 20;
          if (node.role === "from") {
            txLink = graphData.links.find(
              (l) => l.source === node.id && txNodeMap.has(l.target)
            );
            angle = 4.53786; // 260 degrees in radians
          } else if (node.role === "to") {
            txLink = graphData.links.find(
              (l) => l.target === node.id && txNodeMap.has(l.source)
            );
            angle = 0.523599; // 30 degrees in radians
          }
          if (txLink) {
            const txNode = txNodeMap.get(
              node.role === "from" ? txLink.target : txLink.source
            );
            if (txNode) {
              node.x = txNode.x + Math.cos(angle) * dist;
              node.y = txNode.y + Math.sin(angle) * dist;
              node.fx = node.x;
              node.fy = node.y;
              return;
            }
          }
          // Fallback: spread other address/contract nodes around their transaction(s)
          const txLinks = linksTo
            .concat(linksFrom)
            .filter((l) => txNodeMap.has(l.source) || txNodeMap.has(l.target));
          txLinks.forEach((link, i) => {
            const txNode =
              txNodeMap.get(link.source) || txNodeMap.get(link.target);
            if (txNode) {
              const angle =
                (2 * Math.PI * i) / txLinks.length + Math.random() * 0.2;
              const dist = 100 + Math.random() * 30;
              node.x = txNode.x + Math.cos(angle) * dist;
              node.y = txNode.y + Math.sin(angle) * dist;
              node.fx = node.x;
              node.fy = node.y;
            }
          });
        }
      });

      // Place address/contract nodes further out from their transaction
      graphData.nodes.forEach((node) => {
        if (node.type === "address" || node.type === "contract") {
          // Find link to transaction
          const link = graphData.links.find(
            (l) => l.source === node.id || l.target === node.id
          );
          let txNode = null;
          if (link) {
            txNode = txNodes.find(
              (tx) => tx.id === link.source || tx.id === link.target
            );
          }
          if (txNode) {
            const angle = Math.atan2(txNode.y - centerY, txNode.x - centerX);
            const dist = 80;
            node.x = txNode.x + Math.cos(angle) * dist;
            node.y = txNode.y + Math.sin(angle) * dist;
            node.fx = node.x;
            node.fy = node.y;
          } else {
            // Place randomly if not linked
            node.x = centerX + (Math.random() - 0.5) * width * 0.7;
            node.y = centerY + (Math.random() - 0.5) * height * 0.7;
            node.fx = node.x;
            node.fy = node.y;
          }
        }
      });

      // Create a simulation
      const simulation = d3
        .forceSimulation(graphData.nodes)
        .force(
          "link",
          d3
            .forceLink()
            .id((d: any) => d.id)
            .distance(100) // reduced from 160
            .strength(1)
        )
        .force("charge", d3.forceManyBody().strength(-600)) // reduced from -900
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(36).strength(1.5)); // reduced radius

      // Store simulation in ref for later access
      simulationRef.current = simulation;

      // Create a container for the graph
      const container = svg.append("g");

      // Add zoom behavior
      const zoom = d3
        .zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          container.attr("transform", event.transform);
        });

      svg.call(zoom as any);

      // Create links
      const link = container
        .append("g")
        .selectAll("line")
        .data(graphData.links)
        .enter()
        .append("line")
        .attr("stroke", (d: any) => linkColors[d.type])
        .attr("stroke-width", 2)
        .attr("marker-end", "url(#arrowhead)");

      // Add arrowhead marker
      svg
        .append("defs")
        .append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("orient", "auto")
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", isDarkMode ? "#aaa" : "#888");

      // Create node groups
      const node = container
        .append("g")
        .selectAll(".node")
        .data(graphData.nodes)
        .enter()
        .append("g")
        .attr("class", "node")
        .call(
          d3
            .drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended) as any
        )
        .on("click", function (event, d: any) {
          event.stopPropagation();
          handleNodeClick(d);
        })
        .on("dblclick", function (event, d: any) {
          event.stopPropagation();
          handleNodeDoubleClick(d);
        });

      // Add circles to nodes
      node
        .append("circle")
        .attr("r", 20)
        .attr("fill", (d: any) =>
          d.role ? roleColors[d.role] : nodeColors[d.type]
        )
        .attr("stroke", isDarkMode ? "#333" : "#fff")
        .attr("stroke-width", 2)
        .attr("cursor", "pointer");

      // Add icons to nodes
      node.each(function (d: any) {
        const nodeGroup = d3.select(this);

        if (d.type === "address") {
          nodeGroup
            .append("foreignObject")
            .attr("width", 20)
            .attr("height", 20)
            .attr("x", -10)
            .attr("y", -10)
            .attr("cursor", "pointer")
            .html(
              '<div style="color: white; display: flex; justify-content: center; align-items: center; height: 100%;">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wallet">' +
                '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>' +
                "</svg></div>"
            );
        } else if (d.type === "contract") {
          nodeGroup
            .append("foreignObject")
            .attr("width", 20)
            .attr("height", 20)
            .attr("x", -10)
            .attr("y", -10)
            .attr("cursor", "pointer")
            .html(
              '<div style="color: white; display: flex; justify-content: center; align-items: center; height: 100%;">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cog">' +
                '<path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/><path d="M12 22v-2"/><path d="m17 20.66-1-1.73"/><path d="M11 10.27 7 3.34"/><path d="m20.66 17-1.73-1"/><path d="m3.34 7 1.73 1"/><path d="M14 12h8"/><path d="M2 12h2"/><path d="m20.66 7-1.73 1"/><path d="m3.34 17 1.73-1"/><path d="m17 3.34-1 1.73"/><path d="m11 13.73-4 6.93"/>' +
                "</svg></div>"
            );
        } else if (d.type === "transaction") {
          nodeGroup
            .append("foreignObject")
            .attr("width", 20)
            .attr("height", 20)
            .attr("x", -10)
            .attr("y", -10)
            .attr("cursor", "pointer")
            .html(
              '<div style="color: white; display: flex; justify-content: center; align-items: center; height: 100%;">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box">' +
                '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>' +
                "</svg></div>"
            );
        } else if (d.type === "block") {
          nodeGroup
            .append("foreignObject")
            .attr("width", 20)
            .attr("height", 20)
            .attr("x", -10)
            .attr("y", -10)
            .attr("cursor", "pointer")
            .html(
              '<div style="color: white; display: flex; justify-content: center; align-items: center; height: 100%;">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cube">' +
                '<path d="m21 16-9 5-9-5V8l9-5 9 5v8z"/><path d="m3 8 9 5 9-5"/><path d="M12 3v10"/>' +
                "</svg></div>"
            );
        }
      });

      // Add tooltips to nodes
      node.append("title").text((d: any) => {
        if (d.type === "address" || d.type === "contract") {
          return d.role ? `${d.role.toUpperCase()}: ${d.id}` : d.id;
        } else if (d.type === "transaction" && d.hash) {
          return `Transaction: ${d.hash}`;
        } else if (d.type === "block" && d.blockNumber) {
          return `Block: ${d.blockNumber}`;
        } else {
          return d.type.charAt(0).toUpperCase() + d.type.slice(1);
        }
      });

      // Add labels to nodes - NEVER SHORTEN ADDRESSES
      node
        .append("text")
        .attr("dy", 30)
        .attr("text-anchor", "middle")
        .attr("fill", isDarkMode ? "#ddd" : "#333")
        .attr("font-size", "8px")
        .attr("cursor", "pointer")
        .text((d: any) => {
          if (d.type === "address" || d.type === "contract") {
            // Display full address - never shorten for security reasons
            return d.id;
          } else if (d.type === "transaction") {
            // Show full hash, no shortening
            return d.hash ? `TX: ${d.hash}` : "TX";
          } else if (d.type === "block") {
            // Include full timestamp in block label
            const blockLabel = `Block #${d.blockNumber}`;
            if (d.timestamp) {
              const date = new Date(d.timestamp * 1000);
              return `${blockLabel} (${date.toLocaleString()})`;
            }
            return blockLabel;
          }
          return "";
        });

      // Add gas info only to transaction-block links
      link.each(function (d: any) {
        const linkElement = d3.select(this);
        const linkData = linkElement.datum() as any;

        // Check if this is a transaction-block link (type interact)
        if (
          linkData.type === "interact" &&
          (linkData.gas || linkData.gasPrice)
        ) {
          // Add gas info as text along the link
          container
            .append("text")
            .attr("class", "link-label")
            .attr("dy", -5)
            .attr("text-anchor", "middle")
            .attr("fill", isDarkMode ? "#aaa" : "#666")
            .attr("font-size", "7px")
            .text(() => {
              let label = "";
              if (linkData.gas) label += `Gas: ${linkData.gas}`;
              if (linkData.gasPrice) {
                if (label) label += ", ";
                label += `Price: ${linkData.gasPrice} Gwei`;
              }
              return label;
            });
        }
      });

      // Add gas price label to block->transaction links only, using correct value from transaction
      link.each(function (d: any) {
        if (d.type === "interact") {
          // Find the transaction node for this link
          const tx = graphData.nodes.find(
            (n) => n.id === d.target && n.type === "transaction"
          );
          if (tx && tx.gasPrice) {
            const gwei = parseFloat(tx.gasPrice) / 1e9;
            container
              .append("text")
              .attr("class", "link-label")
              .attr("dy", -5)
              .attr("text-anchor", "middle")
              .attr("fill", isDarkMode ? "#aaa" : "#666")
              .attr("font-size", "9px")
              .text(() => `Gas: ${gwei.toFixed(3)} Gwei`);
          }
        }
      });

      // Add legend
      const legendContainer = svg
        .append("g")
        .attr("class", "legend")
        .attr("transform", `translate(20, ${height - 180})`);

      // Add background for legend
      legendContainer
        .append("rect")
        .attr("width", 150)
        .attr("height", 170)
        .attr(
          "fill",
          isDarkMode ? "rgba(31, 41, 55, 0.8)" : "rgba(255, 255, 255, 0.8)"
        )
        .attr("stroke", isDarkMode ? "#4B5563" : "#E5E7EB")
        .attr("stroke-width", 1)
        .attr("rx", 5)
        .attr("ry", 5);

      // Add legend title
      legendContainer
        .append("text")
        .attr("x", 10)
        .attr("y", 20)
        .attr("fill", isDarkMode ? "#E5E7EB" : "#111827")
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .text("Legend");

      // Node types
      const nodeTypes = [
        {
          type: "address",
          color: nodeColors.address,
          label: "Address",
          icon: "wallet",
        },
        {
          type: "contract",
          color: nodeColors.contract,
          label: "Contract",
          icon: "cog",
        },
        {
          type: "transaction",
          color: nodeColors.transaction,
          label: "Transaction",
          icon: "box",
        },
        {
          type: "block",
          color: nodeColors.block,
          label: "Block",
          icon: "cube",
        },
      ];

      // Add node type legends
      nodeTypes.forEach((item, i) => {
        const y = 35 + i * 15;

        // Add circle
        legendContainer
          .append("circle")
          .attr("cx", 15)
          .attr("cy", y)
          .attr("r", 5)
          .attr("fill", item.color);

        // Add label
        legendContainer
          .append("text")
          .attr("x", 25)
          .attr("y", y + 3)
          .attr("fill", isDarkMode ? "#E5E7EB" : "#111827")
          .attr("font-size", "8px")
          .text(item.label);
      });

      // Add role legends
      const roles = [
        { role: "from", color: roleColors.from, label: "From Address" },
        { role: "to", color: roleColors.to, label: "To Address" },
      ];

      // Add role legends
      roles.forEach((item, i) => {
        const y = 35 + nodeTypes.length * 15 + 10 + i * 15;

        // Add circle
        legendContainer
          .append("circle")
          .attr("cx", 15)
          .attr("cy", y)
          .attr("r", 5)
          .attr("fill", item.color);

        // Add label
        legendContainer
          .append("text")
          .attr("x", 25)
          .attr("y", y + 3)
          .attr("fill", isDarkMode ? "#E5E7EB" : "#111827")
          .attr("font-size", "8px")
          .text(item.label);
      });

      // Add link type legends
      const linkTypes = [
        { type: "send", color: linkColors.send, label: "Send" },
        { type: "interact", color: linkColors.interact, label: "Interact" },
      ];

      // Add link type legends
      linkTypes.forEach((item, i) => {
        const y = 35 + nodeTypes.length * 15 + roles.length * 15 + 20 + i * 15;

        // Add line
        legendContainer
          .append("line")
          .attr("x1", 5)
          .attr("y1", y)
          .attr("x2", 25)
          .attr("y2", y)
          .attr("stroke", item.color)
          .attr("stroke-width", 2);

        // Add label
        legendContainer
          .append("text")
          .attr("x", 30)
          .attr("y", y + 3)
          .attr("fill", isDarkMode ? "#E5E7EB" : "#111827")
          .attr("font-size", "8px")
          .text(item.label);
      });

      // Update positions on simulation tick
      simulation.nodes(graphData.nodes as any).on("tick", () => {
        link
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);

        node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);

        // Update link labels position
        container
          .selectAll(".link-label")
          .attr("x", function (d: any, i) {
            const linkData = link.data()[i];
            return linkData ? (linkData.source.x + linkData.target.x) / 2 : 0;
          })
          .attr("y", function (d: any, i) {
            const linkData = link.data()[i];
            return linkData ? (linkData.source.y + linkData.target.y) / 2 : 0;
          });
      });

      // Improved collision detection and node spacing (include label width)
      const labelPadding = 60; // extra padding for text labels
      simulation.force(
        "collision",
        d3
          .forceCollide()
          .radius(54 + labelPadding)
          .strength(3)
      );
      simulation.force("charge", d3.forceManyBody().strength(-1400));

      // After layout, set all nodes as fixed
      simulationRef.current?.nodes().forEach((node) => {
        node.fx = node.x;
        node.fy = node.y;
      });

      (simulation.force("link") as d3.ForceLink<any, any>).links(
        graphData.links
      );

      // Animate the graph drawing
      simulation.alpha(1).restart();
      setTimeout(() => {
        simulation.stop();
        simulationRef.current?.nodes().forEach((node) => {
          node.fx = node.x;
          node.fy = node.y;
        });
      }, 1500); // Let the animation run for 1.5s then fix nodes

      // Drag functions
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
        simulation.force("collision").initialize(simulation.nodes()); // keep collision active during drag
      }

      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = event.x;
        event.subject.fy = event.y;
        simulation.force("collision").initialize(simulation.nodes());
      }

      // On node click/double-click, only update selected node details, do not trigger simulation restart or re-layout
      const handleNodeClick = (node) => {
        if (onNodeClick) onNodeClick(node);
      };
      const handleNodeDoubleClick = (node) => {
        if (onNodeDoubleClick) onNodeDoubleClick(node);
      };

      // Clean up when component unmounts
      return () => {
        if (simulationRef.current) {
          simulationRef.current.stop();
        }
      };
    } catch (error) {
      console.error("Error rendering graph:", error);
      setErrorMessage(
        `Failed to render graph: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }, [data, onNodeClick, onNodeDoubleClick, randomizeKey]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Error message */}
      {errorMessage && (
        <div className="absolute top-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center dark:bg-red-900/50 dark:border-red-800 /50 dark:text-red-300 z-20">
          <AlertTriangle className="inline-block mr-2" size={16} />
          <span>{errorMessage}</span>
        </div>
      )}
      {/* Graph SVG */}
      <svg ref={svgRef} className="w-full h-full" />
      {/* Control buttons bottom right */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 items-end">
        <button
          onClick={resetGraph}
          className="bg-indigo-600 text-white px-3 py-2 rounded shadow hover:bg-indigo-700 text-xs font-semibold transition border border-indigo-700"
        >
          Reset Graph
        </button>
        <button
          onClick={randomizeGraph}
          className="bg-indigo-600 text-white px-3 py-2 rounded shadow hover:bg-indigo-700 text-xs font-semibold transition border border-indigo-700"
        >
          Randomize
        </button>
      </div>
    </div>
  );
};

// Improved processDataToGraph: always create block node and transaction nodes if present
function processDataToGraph(
  data: any,
  knownContracts?: Set<string>
): { nodes: any[]; links: any[] } {
  console.debug("[BlockGraph] processDataToGraph input:", data);
  // Unwrap if data is in { block: {...}, type: 'block' } format
  if (data && data.block && typeof data.block === "object") {
    data = data.block;
    console.debug("[BlockGraph] Unwrapped block property:", data);
  }
  if (!data) {
    console.debug("[BlockGraph] No data provided to processDataToGraph");
    return { nodes: [], links: [] };
  }
  const nodes: any[] = [];
  const links: any[] = [];

  // Always create block node if block data is present
  if (data.number !== undefined) {
    nodes.push({
      id: `block-${data.number}`,
      type: "block",
      blockNumber: data.number,
      timestamp: data.timestamp,
      hash: data.hash,
    });
  }

  // Transactions
  if (Array.isArray(data.transactions) && data.transactions.length > 0) {
    data.transactions.forEach((tx: any, i: number) => {
      const txId = tx.hash || `tx-${i}`;
      nodes.push({
        id: txId,
        type: "transaction",
        hash: tx.hash,
        value: tx.value,
        blockNumber: tx.blockNumber,
        gasPrice: tx.gasPrice,
      });
      // Link block -> transaction
      if (data.number !== undefined) {
        links.push({
          source: `block-${data.number}`,
          target: txId,
          type: "interact",
          value: tx.value,
        });
      }
      // From address
      if (tx.from) {
        const fromType =
          knownContracts && isSmartContract(tx.from, knownContracts)
            ? "contract"
            : "address";
        nodes.push({
          id: tx.from,
          type: fromType,
          role: "from",
        });
        links.push({
          source: tx.from,
          target: txId,
          type: "send",
          value: tx.value,
        });
      }
      // To address/contract
      if (tx.to) {
        const toType =
          knownContracts && isSmartContract(tx.to, knownContracts)
            ? "contract"
            : "address";
        nodes.push({
          id: tx.to,
          type: toType,
          role: "to",
        });
        links.push({
          source: txId,
          target: tx.to,
          type: "receive",
          value: tx.value,
        });
      }
    });
  }

  // If there are no transactions and a block node exists, still return the block node
  if (nodes.length === 0 && data.number !== undefined) {
    console.debug(
      "[BlockGraph] No transactions, but block node exists. Returning block node only."
    );
    nodes.push({
      id: `block-${data.number}`,
      type: "block",
      blockNumber: data.number,
      timestamp: data.timestamp,
      hash: data.hash,
    });
  }

  // Deduplicate nodes by id
  const uniqueNodes = Object.values(
    nodes.reduce((acc, node) => {
      acc[node.id] = { ...acc[node.id], ...node };
      return acc;
    }, {} as Record<string, any>)
  );

  console.debug("[BlockGraph] processDataToGraph output nodes:", uniqueNodes);
  console.debug("[BlockGraph] processDataToGraph output links:", links);

  return { nodes: uniqueNodes, links };
}

export default BlockGraph;
