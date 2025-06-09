import React, { useEffect, useState, useMemo } from 'react';
import { useNightscout } from '../contexts/NightscoutContext';
import { BloodGlucoseReading, Meal } from '../types/nightscout';
import { scaleLog, scaleLinear } from '@visx/scale';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { Group } from '@visx/group';
import { Circle } from '@visx/shape';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { format, addDays, subDays, isToday, parseISO } from 'date-fns';
import RamenDiningIcon from '@mui/icons-material/RamenDining';
import BloodtypeIcon from '@mui/icons-material/Bloodtype';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import Badge from '@mui/material/Badge';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import LunchDiningIcon from '@mui/icons-material/LunchDining';
import EmojiFoodBeverageIcon from '@mui/icons-material/EmojiFoodBeverage';
import LocalPizzaIcon from '@mui/icons-material/LocalPizza';
import EggIcon from '@mui/icons-material/Egg';
import OpacityIcon from '@mui/icons-material/Opacity';
import BakeryDiningIcon from '@mui/icons-material/BakeryDining';
import SetMealIcon from '@mui/icons-material/SetMeal';
import { use24HourChartData } from './use24HourChartData';
import { ChartMacroBars } from './Charts/ChartMacroBars';
import { ChartActivityBand } from './Charts/ChartActivityBand';
import { ChartTooltips } from './Charts/ChartTooltips';
import { ChartAxes } from './Charts/ChartAxes';

const width = 900;
const height = 500;
const margin = { top: 40, right: 40, bottom: 60, left: 60 };

const yTicks = [40, 55, 70, 120, 180, 260, 400];
const xHours = Array.from({ length: 24 }, (_, i) => i);

interface ChartDataPoint {
  timestamp: number;
  hour: number;
  value: number;
}

const palette = {
  primary: "#2563eb", // blue-600
  accent: "#14b8a6",  // teal-500
  bg: "#f8fafc",      // slate-50
  border: "#e5e7eb",  // gray-200
  text: "#111827",    // gray-900
  danger: "#ef4444",  // red-500
  muted: "#6b7280",   // gray-500
};

// Define macro colors
const macroColors = {
  carbs: '#2563eb',    // blue
  protein: '#22c55e',  // green
  fat: '#f59e42',      // orange
};

// Move ACTIVITY_LANES, laneHeight, iconHeight, spacing to before activityBandHeight
const ACTIVITY_LANES = [
  { type: 'meal', label: 'Meals' },
  { type: 'mbg', label: 'Manual BG' },
  // Future: { type: 'hr', label: 'Heart Rate' },
  // Future: { type: 'steps', label: 'Steps' },
];
const laneHeight = 28;
const iconHeight = 18;
const spacing = 4;
const activityBandHeight = ACTIVITY_LANES.length * laneHeight;

export const Charts24HourView: React.FC = () => {
  const {
    mbgData,
    sgvData,
    mealData,
    loading,
    error,
    selectedDate,
    setSelectedDate,
    showMBG,
    setShowMBG,
    showSGV,
    setShowSGV,
    showAvg,
    setShowAvg,
    boundLow,
    setBoundLow,
    boundHigh,
    setBoundHigh,
    avgSgv,
  } = use24HourChartData();

  // Tooltip state
  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    showTooltip,
    hideTooltip,
    tooltipOpen
  } = useTooltip<ChartDataPoint>();

  // Tooltip state for meals
  const {
    tooltipData: mealTooltipData,
    tooltipLeft: mealTooltipLeft,
    tooltipTop: mealTooltipTop,
    showTooltip: showMealTooltip,
    hideTooltip: hideMealTooltip,
    tooltipOpen: mealTooltipOpen
  } = useTooltip<Meal>();

  // Tooltip state for MBG activity icons
  const {
    tooltipData: mbgIconTooltipData,
    tooltipLeft: mbgIconTooltipLeft,
    tooltipTop: mbgIconTooltipTop,
    showTooltip: showMbgIconTooltip,
    hideTooltip: hideMbgIconTooltip,
    tooltipOpen: mbgIconTooltipOpen
  } = useTooltip<ChartDataPoint>();

  // Carbs y-axis scale (for meal bars), maps [0, 100] to chart area
  const carbYScale = useMemo(
    () =>
      scaleLinear({
        domain: [0, 100],
        range: [height - margin.bottom, margin.top],
        clamp: true,
      }),
    []
  );

  const yDomain = [30, 400];
  const xScale = useMemo(
    () =>
      scaleLinear({
        domain: [0, 24],
        range: [margin.left, width - margin.right],
      }),
    []
  );
  const yScale = useMemo(
    () =>
      scaleLog({
        domain: yDomain,
        range: [height - margin.bottom, margin.top],
        base: 10,
        clamp: true,
      }),
    []
  );

  const axisBottomOffset = 12; // sensible spacing below activity band
  const svgHeight = height + activityBandHeight + axisBottomOffset;

  // Group activities for the activity band (within 10 minutes)
  const ACTIVITY_BIN_MINUTES = 10;
  type ActivityType = 'meal' | 'mbg';
  type ActivityItem = { type: ActivityType; data: any };
  type ActivityBins = { [key: string]: ActivityItem[] };
  const groupActivities = (): ActivityBins => {
    const bins: ActivityBins = {};
    // Helper to get bin key (rounded to nearest 10 minutes)
    const getBinKey = (date: Date): string => {
      const hour = date.getHours();
      const min = Math.floor(date.getMinutes() / ACTIVITY_BIN_MINUTES) * ACTIVITY_BIN_MINUTES;
      return `${hour}:${min}`;
    };
    mealData.forEach(meal => {
      const date = new Date(meal.timestamp * 1000);
      const key = getBinKey(date);
      if (!bins[key]) bins[key] = [];
      bins[key].push({ type: 'meal', data: meal });
    });
    mbgData.forEach(mbg => {
      const date = new Date(mbg.timestamp);
      const key = getBinKey(date);
      if (!bins[key]) bins[key] = [];
      bins[key].push({ type: 'mbg', data: mbg });
    });
    return bins;
  };
  const activityBins = groupActivities();

  if (loading) return <div className="text-center py-4">Loading chart data...</div>;
  if (error) return <div className="text-red-600 py-4">{error}</div>;

  return (
    <div className="bg-white shadow rounded-lg p-8" style={{ position: 'relative', fontFamily: 'Inter, system-ui, sans-serif', color: palette.text }}>
      <div className="flex flex-wrap gap-4 mb-6 items-end p-4 rounded-lg border border-gray-200 bg-white shadow-sm" style={{ background: palette.bg }}>
        {/* Date picker with prev/next buttons */}
        <label className="flex items-center gap-2 font-medium">
          <span>Date:</span>
          <IconButton
            onClick={() => setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
            size="small"
            style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
            aria-label="Previous day"
          >
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            max={format(new Date(), 'yyyy-MM-dd')}
            className="px-2 py-1 border rounded text-base font-medium"
            style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
          />
          <IconButton
            onClick={() => setSelectedDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
            size="small"
            style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
            aria-label="Next day"
            disabled={isToday(parseISO(selectedDate))}
          >
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </label>
        {/* Existing controls */}
        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" checked={showMBG} onChange={e => setShowMBG(e.target.checked)} />
          Show MBG
        </label>
        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" checked={showSGV} onChange={e => setShowSGV(e.target.checked)} />
          Show SGV
        </label>
        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" checked={showAvg} onChange={e => setShowAvg(e.target.checked)} />
          Show Average Line
        </label>
        <label className="flex items-center gap-2 font-medium">
          Bounds:
          <input
            type="number"
            value={boundLow}
            min={1}
            max={boundHigh - 1}
            onChange={e => setBoundLow(Number(e.target.value))}
            className="w-16 px-1 py-0.5 border rounded"
            style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
          />
          -
          <input
            type="number"
            value={boundHigh}
            min={boundLow + 1}
            max={400}
            onChange={e => setBoundHigh(Number(e.target.value))}
            className="w-16 px-1 py-0.5 border rounded"
            style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
          />
        </label>
      </div>
      <h2 className="text-2xl font-bold mb-6" style={{ color: palette.text, fontWeight: 700 }}>
        24 Hour Activity Chart (Blood Glucose, Meals & Activity)
      </h2>
      <svg width={width} height={svgHeight} style={{ background: palette.bg, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <Group>
          {/* Bounds/Target Zone */}
          <rect
            x={margin.left}
            y={yScale(boundHigh)}
            width={width - margin.left - margin.right}
            height={yScale(boundLow) - yScale(boundHigh)}
            fill="rgba(34,197,94,0.08)"
            stroke="rgba(34,197,94,0.25)"
            strokeWidth={1}
          />
          {/* Axes */}
          <ChartAxes xScale={xScale} yScale={yScale} width={width} height={height} margin={margin} yTicks={yTicks} xHours={xHours} palette={palette} />
          {/* SGV Points */}
          {showSGV && (
            <Group>
              {sgvData.map((d, i) => {
                let color = palette.accent;
                if (d.value > boundHigh) color = palette.danger;
                else if (d.value < boundLow) color = '#f59e42';
                return (
                  <Circle
                    key={`sgv-${i}`}
                    cx={xScale(d.hour)}
                    cy={yScale(d.value)}
                    r={2}
                    fill={color}
                    stroke="transparent"
                    strokeWidth={1}
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.04))' }}
                    onMouseMove={event => {
                      showTooltip({
                        tooltipData: d,
                        tooltipLeft: xScale(d.hour),
                        tooltipTop: yScale(d.value),
                      });
                    }}
                    onMouseLeave={hideTooltip}
                    style={{ cursor: 'pointer' }}
                  />
                );
              })}
            </Group>
          )}
          {/* MBG Points */}
          {showMBG && (
            <Group>
              {mbgData.map((d, i) => (
                <Circle
                  key={`mbg-${i}`}
                  cx={xScale(d.hour)}
                  cy={yScale(d.value)}
                  r={4}
                  fill="transparent"
                  stroke={palette.danger}
                  strokeWidth={2}
                  style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.04))' }}
                  onMouseMove={event => {
                    showTooltip({
                      tooltipData: d,
                      tooltipLeft: xScale(d.hour),
                      tooltipTop: yScale(d.value),
                    });
                  }}
                  onMouseLeave={hideTooltip}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Group>
          )}
          {/* Macro Bars */}
          <ChartMacroBars mealData={mealData} xScale={xScale} yScale={carbYScale} macroColors={macroColors} />
          {/* Activity Band */}
          <ChartActivityBand
            activityBins={activityBins}
            xScale={xScale}
            height={height - margin.bottom}
            laneHeight={laneHeight}
            iconHeight={iconHeight}
            ACTIVITY_LANES={ACTIVITY_LANES}
            palette={palette}
            macroColors={macroColors}
            showMealTooltip={showMealTooltip}
            hideMealTooltip={hideMealTooltip}
          />
        </Group>
      </svg>
      {/* Tooltips */}
      <ChartTooltips
        tooltipOpen={tooltipOpen}
        tooltipData={tooltipData}
        tooltipLeft={tooltipLeft}
        tooltipTop={tooltipTop}
        mealTooltipOpen={mealTooltipOpen}
        mealTooltipData={mealTooltipData}
        mealTooltipLeft={mealTooltipLeft}
        mealTooltipTop={mealTooltipTop}
        mbgIconTooltipOpen={mbgIconTooltipOpen}
        mbgIconTooltipData={mbgIconTooltipData}
        mbgIconTooltipLeft={mbgIconTooltipLeft}
        mbgIconTooltipTop={mbgIconTooltipTop}
        palette={palette}
        macroColors={macroColors}
      />
    </div>
  );
}; 