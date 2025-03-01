import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { format } from 'date-fns';
import { safelyConvertBigIntToString } from '../utils/bigIntUtils';

interface TransactionTimelineProps {
  data: any;
}

const TransactionTimeline: React.FC<TransactionTimelineProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!data || !svgRef.current) return;
    
    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Process data for timeline
    const timelineData = processDataForTimeline(data);
    if (timelineData.length === 0) return;
    
    // Set up the SVG
    const svg = d3.select(svgRef.current);
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = svgRef.current.clientHeight - margin.top - margin.bottom;
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Check if dark mode is enabled
    const isDarkMode = document.documentElement.classList.contains('dark');
    const textColor = isDarkMode ? '#ddd' : '#333';
    const gridColor = isDarkMode ? '#555' : '#ddd';
    
    // Set up scales
    const x = d3.scaleTime()
      .domain(d3.extent(timelineData, d => d.date) as [Date, Date])
      .range([0, width]);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(timelineData, d => d.count) as number])
      .nice()
      .range([height, 0]);
    
    // Add X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('fill', textColor);
    
    // Add Y axis
    g.append('g')
      .call(d3.axisLeft(y))
      .selectAll('text')
      .attr('fill', textColor);
    
    // Add grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x)
        .tickSize(-height)
        .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', gridColor);
    
    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', gridColor);
    
    // Add the area
    g.append('path')
      .datum(timelineData)
      .attr('fill', 'rgba(79, 70, 229, 0.2)')
      .attr('stroke', 'none')
      .attr('d', d3.area<any>()
        .x(d => x(d.date))
        .y0(height)
        .y1(d => y(d.count))
      );
    
    // Add the line
    g.append('path')
      .datum(timelineData)
      .attr('fill', 'none')
      .attr('stroke', '#4f46e5')
      .attr('stroke-width', 2)
      .attr('d', d3.line<any>()
        .x(d => x(d.date))
        .y(d => y(d.count))
      );
    
    // Add dots
    g.selectAll('.dot')
      .data(timelineData)
      .enter().append('circle')
      .attr('class', 'dot')
      .attr('cx', d => x(d.date))
      .attr('cy', d => y(d.count))
      .attr('r', 4)
      .attr('fill', '#4f46e5');
    
    // Add tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background-color', isDarkMode ? '#333' : 'white')
      .style('color', isDarkMode ? '#fff' : '#333')
      .style('border', isDarkMode ? '1px solid #555' : '1px solid #ddd')
      .style('border-radius', '4px')
      .style('padding', '8px')
      .style('pointer-events', 'none')
      .style('opacity', 0);
    
    g.selectAll('.dot')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('r', 6)
          .attr('fill', '#3730a3');
        
        tooltip.transition()
          .duration(200)
          .style('opacity', .9);
        
        tooltip.html(`
          <div>
            <strong>Date:</strong> ${format(d.date, 'PPpp')}
            <br/>
            <strong>Transactions:</strong> ${d.count}
          </div>
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('r', 4)
          .attr('fill', '#4f46e5');
        
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });
    
    // Add title
    g.append('text')
      .attr('x', width / 2)
      .attr('y', 0)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .attr('fill', textColor)
      .text('Transaction Activity Over Time');
    
    // Clean up tooltip when component unmounts
    return () => {
      d3.select('body').selectAll('.tooltip').remove();
    };
  }, [data]);
  
  // Process the data for timeline visualization
  const processDataForTimeline = (data: any) => {
    // Make sure we're working with a safe copy of the data (no BigInt values)
    const safeData = safelyConvertBigIntToString(data);
    
    const timelineData: { date: Date; count: number }[] = [];
    
    if (safeData.type === 'address' && safeData.transactions && safeData.transactions.length > 0) {
      // Group transactions by day
      const txByDay = new Map<string, number>();
      
      safeData.transactions.forEach((tx: any) => {
        if (tx.timestamp) {
          try {
            const timestamp = typeof tx.timestamp === 'string' ? parseInt(tx.timestamp, 10) : Number(tx.timestamp);
            if (!isNaN(timestamp)) {
              const date = new Date(timestamp * 1000);
              const dateKey = date.toISOString().split('T')[0];
              
              txByDay.set(dateKey, (txByDay.get(dateKey) || 0) + 1);
            }
          } catch (error) {
            console.error('Error processing timestamp:', error);
          }
        }
      });
      
      // Convert to array for D3
      Array.from(txByDay.entries()).forEach(([dateStr, count]) => {
        timelineData.push({
          date: new Date(dateStr),
          count
        });
      });
      
      // Sort by date
      timelineData.sort((a, b) => a.date.getTime() - b.date.getTime());
    } else if (safeData.type === 'block') {
      // For blocks, we'll just show a single point
      if (safeData.block && safeData.block.timestamp) {
        try {
          const timestamp = typeof safeData.block.timestamp === 'string' ? 
            parseInt(safeData.block.timestamp, 10) : Number(safeData.block.timestamp);
          
          if (!isNaN(timestamp)) {
            timelineData.push({
              date: new Date(timestamp * 1000),
              count: safeData.block.transactions ? safeData.block.transactions.length : 0
            });
          }
        } catch (error) {
          console.error('Error processing block timestamp:', error);
        }
      }
    } else if (safeData.type === 'transaction') {
      // For a single transaction, we'll just show a single point
      if (safeData.transaction && safeData.transaction.timestamp) {
        try {
          const timestamp = typeof safeData.transaction.timestamp === 'string' ? 
            parseInt(safeData.transaction.timestamp, 10) : Number(safeData.transaction.timestamp);
          
          if (!isNaN(timestamp)) {
            timelineData.push({
              date: new Date(timestamp * 1000),
              count: 1
            });
          }
        } catch (error) {
          console.error('Error processing transaction timestamp:', error);
        }
      }
    }
    
    return timelineData;
  };
  
  return (
    <svg ref={svgRef} width="100%" height="100%"></svg>
  );
};

export default TransactionTimeline;