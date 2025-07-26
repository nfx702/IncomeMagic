'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useTheme } from '@/components/providers/ThemeProvider';

interface OptionsData {
  strike: number;
  expiration: string;
  openInterest: number;
  volume: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  type: 'call' | 'put';
}

interface ChartLayer {
  name: string;
  metric: keyof OptionsData;
  visual: 'bar-length' | 'dot-size-color' | 'heat-ring' | 'indicator';
  colorGradient?: {
    low: string;
    medium?: string;
    high: string;
  };
  position: 'outermost' | 'middle' | 'inner' | 'center';
  tooltipTemplate: string;
}

interface RadialChartProps {
  data: OptionsData[];
  layers: ChartLayer[];
  width?: number;
  height?: number;
  className?: string;
}

export const RadialMultilayerChart: React.FC<RadialChartProps> = ({
  data,
  layers,
  width = 400,
  height = 400,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { theme } = useTheme();
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: '' });

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = 40;
    const radius = (Math.min(width, height) / 2) - margin;
    const center = { x: width / 2, y: height / 2 };

    // Create main container
    const container = svg
      .append('g')
      .attr('transform', `translate(${center.x},${center.y})`);

    // Sort layers by position (outermost to center)
    const sortedLayers = [...layers].sort((a, b) => {
      const positions = { 'outermost': 0, 'middle': 1, 'inner': 2, 'center': 3 };
      return positions[a.position] - positions[b.position];
    });

    // Calculate radius for each layer
    const layerRadii = sortedLayers.map((_, i) => {
      return radius * (1 - (i * 0.2));
    });

    // Process each layer
    sortedLayers.forEach((layer, layerIndex) => {
      const layerRadius = layerRadii[layerIndex];
      const innerRadius = layerIndex < sortedLayers.length - 1 ? layerRadii[layerIndex + 1] : 0;

      if (layer.visual === 'bar-length') {
        renderRadialBars(container, data, layer, layerRadius, innerRadius);
      } else if (layer.visual === 'dot-size-color') {
        renderDotScatter(container, data, layer, layerRadius);
      } else if (layer.visual === 'heat-ring') {
        renderHeatRing(container, data, layer, layerRadius, innerRadius);
      } else if (layer.visual === 'indicator') {
        renderGreeksIndicators(container, data, layer, layerRadius);
      }
    });

    // Add center label
    container
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('fill', 'var(--text-primary)')
      .text('Options Market');

  }, [data, layers, width, height, theme]);

  const renderRadialBars = (
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: OptionsData[],
    layer: ChartLayer,
    outerRadius: number,
    innerRadius: number
  ) => {
    const maxValue = d3.max(data, d => d[layer.metric] as number) || 1;
    const angleScale = d3.scaleLinear()
      .domain([0, data.length])
      .range([0, 2 * Math.PI]);

    const barWidth = (2 * Math.PI) / data.length * 0.8;

    const colorScale = d3.scaleSequential(d3.interpolateRgb(
      layer.colorGradient?.low || '#6a5acd',
      layer.colorGradient?.high || '#ff1493'
    )).domain([0, maxValue]);

    const bars = container
      .selectAll(`.bar-${layer.name}`)
      .data(data)
      .enter()
      .append('path')
      .attr('class', `bar-${layer.name}`)
      .attr('d', (d, i) => {
        const value = d[layer.metric] as number;
        const barHeight = (value / maxValue) * (outerRadius - innerRadius);
        const startAngle = angleScale(i) - barWidth / 2;
        const endAngle = angleScale(i) + barWidth / 2;

        const arc = d3.arc()
          .innerRadius(innerRadius)
          .outerRadius(innerRadius + barHeight)
          .startAngle(startAngle)
          .endAngle(endAngle);

        return arc({
          innerRadius,
          outerRadius: innerRadius + barHeight,
          startAngle,
          endAngle
        }) || '';
      })
      .style('fill', d => colorScale(d[layer.metric] as number))
      .style('opacity', 0.8)
      .style('transition', 'all 0.3s ease')
      .on('mouseover', (event, d) => {
        d3.select(event.target).style('opacity', 1);
        showTooltip(event, d, layer);
      })
      .on('mouseout', (event) => {
        d3.select(event.target).style('opacity', 0.8);
        hideTooltip();
      });
  };

  const renderDotScatter = (
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: OptionsData[],
    layer: ChartLayer,
    radius: number
  ) => {
    const maxValue = d3.max(data, d => d[layer.metric] as number) || 1;
    const sizeScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([2, 12]);

    const colorScale = d3.scaleSequential(d3.interpolateRgb(
      layer.colorGradient?.low || '#00bfff',
      layer.colorGradient?.high || '#ff00ff'
    )).domain([0, maxValue]);

    const angleStep = (2 * Math.PI) / data.length;

    container
      .selectAll(`.dot-${layer.name}`)
      .data(data)
      .enter()
      .append('circle')
      .attr('class', `dot-${layer.name}`)
      .attr('cx', (d, i) => radius * Math.cos(angleStep * i - Math.PI / 2))
      .attr('cy', (d, i) => radius * Math.sin(angleStep * i - Math.PI / 2))
      .attr('r', d => sizeScale(d[layer.metric] as number))
      .style('fill', d => colorScale(d[layer.metric] as number))
      .style('opacity', 0.7)
      .style('transition', 'all 0.3s ease')
      .on('mouseover', (event, d) => {
        d3.select(event.target).attr('r', (sizeScale(d[layer.metric] as number) * 1.2));
        showTooltip(event, d, layer);
      })
      .on('mouseout', (event, d) => {
        d3.select(event.target).attr('r', sizeScale(d[layer.metric] as number));
        hideTooltip();
      });
  };

  const renderHeatRing = (
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: OptionsData[],
    layer: ChartLayer,
    outerRadius: number,
    innerRadius: number
  ) => {
    const maxValue = d3.max(data, d => d[layer.metric] as number) || 1;
    const angleStep = (2 * Math.PI) / data.length;

    const colorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain([0, maxValue]);

    data.forEach((d, i) => {
      const startAngle = angleStep * i - angleStep / 2;
      const endAngle = angleStep * i + angleStep / 2;

      const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius)
        .startAngle(startAngle)
        .endAngle(endAngle);

      container
        .append('path')
        .datum(d)
        .attr('d', arc({
          innerRadius,
          outerRadius,
          startAngle,
          endAngle
        }))
        .style('fill', colorScale(d[layer.metric] as number))
        .style('opacity', 0.6)
        .style('transition', 'all 0.3s ease')
        .on('mouseover', (event, d) => {
          d3.select(event.target).style('opacity', 0.9);
          showTooltip(event, d, layer);
        })
        .on('mouseout', (event) => {
          d3.select(event.target).style('opacity', 0.6);
          hideTooltip();
        });
    });
  };

  const renderGreeksIndicators = (
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: OptionsData[],
    layer: ChartLayer,
    radius: number
  ) => {
    const greeks = ['delta', 'gamma', 'theta', 'vega'];
    const greekRadius = radius / 4;

    greeks.forEach((greek, i) => {
      const angle = (i * Math.PI) / 2;
      const x = greekRadius * Math.cos(angle);
      const y = greekRadius * Math.sin(angle);

      const avgValue = d3.mean(data, d => Math.abs(d[greek as keyof OptionsData] as number)) || 0;

      container
        .append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 8)
        .style('fill', 'var(--accent-primary)')
        .style('opacity', 0.7);

      container
        .append('text')
        .attr('x', x)
        .attr('y', y + 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('fill', 'var(--text-secondary)')
        .text(greek.toUpperCase());
    });
  };

  const showTooltip = (event: any, d: OptionsData, layer: ChartLayer) => {
    const content = layer.tooltipTemplate
      .replace('{x}', d.strike.toString())
      .replace('{y}', (d[layer.metric] as number).toFixed(2));

    setTooltip({
      visible: true,
      x: event.pageX + 10,
      y: event.pageY - 10,
      content
    });
  };

  const hideTooltip = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="overflow-visible"
      />
      
      {tooltip.visible && (
        <div
          className="fixed z-50 glass-card p-2 text-sm pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            borderRadius: '12px'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

// Default configuration for options trading
export const defaultOptionsLayers: ChartLayer[] = [
  {
    name: 'openInterest',
    metric: 'openInterest',
    visual: 'bar-length',
    colorGradient: {
      low: '#6a5acd',
      medium: '#ff69b4',
      high: '#ff1493'
    },
    position: 'outermost',
    tooltipTemplate: 'Strike: {x}, OI: {y}'
  },
  {
    name: 'volume',
    metric: 'volume',
    visual: 'dot-size-color',
    colorGradient: {
      low: '#00bfff',
      high: '#ff00ff'
    },
    position: 'middle',
    tooltipTemplate: 'Strike: {x}, Volume: {y}'
  },
  {
    name: 'impliedVolatility',
    metric: 'impliedVolatility',
    visual: 'heat-ring',
    position: 'inner',
    tooltipTemplate: 'Strike: {x}, IV: {y}%'
  },
  {
    name: 'greeks',
    metric: 'delta',
    visual: 'indicator',
    position: 'center',
    tooltipTemplate: 'Greeks Overview'
  }
];