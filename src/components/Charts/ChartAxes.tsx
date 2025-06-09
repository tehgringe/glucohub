import React from 'react';
import { AxisLeft, AxisBottom } from '@visx/axis';

interface ChartAxesProps {
  xScale: any;
  yScale: any;
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  yTicks: number[];
  xHours: number[];
  palette: any;
}

export const ChartAxes: React.FC<ChartAxesProps> = ({ xScale, yScale, width, height, margin, yTicks, xHours, palette }) => (
  <g>
    {yTicks.map((tick, i) => {
      const y = yScale(tick);
      return (
        <g key={`y-tick-${tick}`}> 
          <circle
            cx={margin.left}
            cy={y}
            r={3.5}
            fill="#b0b4ba"
          />
          <text
            x={margin.left + 12}
            y={y}
            dy=".32em"
            textAnchor="start"
            fontSize={12}
            fill={palette.text}
          >
            {tick}
          </text>
        </g>
      );
    })}
    {/* Custom x-axis tick dots and labels, no solid axis line */}
    {xHours.map((hour, i) => {
      const x = xScale(hour);
      // Make dots at 0, 3, 6, 9, 12, 15, 18, 21 larger
      const isMajor = hour % 3 === 0;
      const dotRadius = isMajor ? 4.375 : 3.5;
      return (
        <g key={`x-tick-${hour}`}> 
          <circle
            cx={x}
            cy={height - margin.bottom + 10}
            r={dotRadius}
            fill="#b0b4ba"
          />
          {isMajor && (
            <text
              x={x}
              y={height - margin.bottom + 24}
              textAnchor="middle"
              fontSize={11}
              fill={palette.text}
              fontFamily="Inter, sans-serif"
            >
              {hour}
            </text>
          )}
        </g>
      );
    })}
  </g>
); 