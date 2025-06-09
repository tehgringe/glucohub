import React, { useMemo, useState } from 'react';
import { use24HourChartData } from '../use24HourChartData';
import { Group } from '@visx/group';
import { scaleLinear } from '@visx/scale';
import { LinePath } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { ChartTooltips } from './ChartTooltips';

const GLUCOSE_MIN = 40;
const GLUCOSE_MAX = 400;
const CENTER = 200;
const RADIUS = 150;
const STROKE_WIDTH = 2.5;

const glucoseZones = [
  { from: 40, to: 70, color: 'rgba(255,0,0,0.10)' }, // hypo
  { from: 70, to: 120, color: 'rgba(0,255,0,0.05)' }, // normal
  { from: 120, to: 180, color: 'rgba(255,165,0,0.08)' }, // hyper
];

const polarAngle = (time: number) => ((time / 24) * 2 * Math.PI) - Math.PI / 2;
const polarToCartesian = (r: number, angle: number): [number, number] => [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)];

// Modern dark palette
const palette = {
  primary: '#7ED6A5', // mint
  accent: '#9B7EDA',  // lavender
  bg: '#181A20',      // dark
  border: '#23242a',  // dark border
  text: '#f8fafc',    // light text
  danger: '#ef4444',  // red-500
  muted: '#7A8492',   // steel-gray
};
const macroColors = {
  carbs: '#9B7EDA',    // muted lavender
  protein: '#7ED6A5',  // soft mint
  fat: '#FFB566',      // warm amber
};

interface TimeWheelChartProps {
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
}

export function TimeWheelChart({ width = 400, height = 400, margin = { top: 0, right: 0, bottom: 0, left: 0 } }: TimeWheelChartProps) {
  const {
    sgvData,
    mealData = [],
    loading,
    error,
    showSGV,
    boundLow = 70,
    boundHigh = 180,
    avgSgv,
  } = use24HourChartData();

  // Tooltip state for SGV points
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipData, setTooltipData] = useState<any>(null);
  const [tooltipLeft, setTooltipLeft] = useState(0);
  const [tooltipTop, setTooltipTop] = useState(0);

  // Scales
  const radiusScale = useMemo(() =>
    scaleLinear({ domain: [GLUCOSE_MIN, GLUCOSE_MAX], range: [40, RADIUS], clamp: true }),
    []
  );

  // Prepare SGV data for plotting
  const sgvPoints = useMemo(() => {
    if (!sgvData.length) return [];
    return sgvData.map(point => {
      const angle = polarAngle(point.hour);
      const r = radiusScale(point.value);
      const [x, y] = polarToCartesian(r, angle);
      return { ...point, x, y, angle, r, type: 'sgv' };
    });
  }, [sgvData, radiusScale]);

  // Prepare meal event icons
  const mealIcons = useMemo(() => {
    if (!mealData.length) return [];
    return mealData.map((meal: any) => {
      // Use meal.hour if available, otherwise compute from timestamp
      let hour = meal.hour;
      if (hour === undefined && meal.timestamp) {
        const date = new Date(meal.timestamp);
        hour = date.getHours() + date.getMinutes() / 60;
      }
      const angle = polarAngle(hour);
      const [x, y] = polarToCartesian(RADIUS + 18, angle);
      return { ...meal, x, y, angle };
    });
  }, [mealData]);

  // Tooltip handlers
  const handlePointMouseEnter = (event: React.MouseEvent, point: any) => {
    setTooltipOpen(true);
    setTooltipData(point);
    setTooltipLeft(event.clientX - 50);
    setTooltipTop(event.clientY - 50);
  };
  const handlePointMouseLeave = () => {
    setTooltipOpen(false);
    setTooltipData(null);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ position: 'relative', background: palette.bg, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
      <svg width={width} height={height} style={{ background: palette.bg, borderRadius: 16 }}>
        <defs>
          <radialGradient id="glucoseGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f5a623" />
            <stop offset="100%" stopColor="#f54291" />
          </radialGradient>
        </defs>
        <Group top={0} left={0}>
          {/* Zone Rings */}
          {glucoseZones.map((zone, i) => (
            <circle
              key={i}
              cx={CENTER}
              cy={CENTER}
              r={radiusScale(zone.to)}
              fill={zone.color}
            />
          ))}

          {/* Radial Hour Lines */}
          {Array.from({ length: 24 }, (_, hour: number) => {
            const angle = polarAngle(hour);
            const [x, y] = polarToCartesian(RADIUS, angle);
            return (
              <line
                key={`hr-${hour}`}
                x1={CENTER}
                y1={CENTER}
                x2={x}
                y2={y}
                stroke="#2c2c2c"
                strokeWidth={hour % 3 === 0 ? 1.5 : 0.7}
                strokeDasharray={hour % 3 === 0 ? '0' : '2,2'}
              />
            );
          })}

          {/* Glucose LinePath */}
          {showSGV && sgvPoints.length > 1 && (
            <LinePath
              data={sgvPoints}
              curve={curveMonotoneX}
              x={d => d.x}
              y={d => d.y}
              stroke="url(#glucoseGradient)"
              strokeWidth={STROKE_WIDTH}
            />
          )}

          {/* Dots */}
          {showSGV && sgvPoints.map((point, i) => (
            <circle
              key={`sgv-dot-${i}`}
              cx={point.x}
              cy={point.y}
              r={2.2}
              fill="#ccc"
              style={{ cursor: 'pointer' }}
              onMouseEnter={e => handlePointMouseEnter(e, point)}
              onMouseMove={e => handlePointMouseEnter(e, point)}
              onMouseLeave={handlePointMouseLeave}
            />
          ))}

          {/* Meal Icons */}
          {mealIcons.map((meal: any, i: number) => (
            <text key={`meal-${i}`} x={meal.x} y={meal.y} fontSize={15} fill={macroColors.carbs} textAnchor="middle" alignmentBaseline="middle">🍽️</text>
          ))}
        </Group>
      </svg>
      {/* SGV Tooltip */}
      <ChartTooltips
        tooltipOpen={tooltipOpen}
        tooltipData={tooltipData}
        tooltipLeft={tooltipLeft}
        tooltipTop={tooltipTop}
        palette={palette}
        macroColors={macroColors}
      />
    </div>
  );
} 