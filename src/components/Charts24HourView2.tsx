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
import BakeryDiningIcon from '@mui/icons-material/BakeryDining';
import SetMealIcon from '@mui/icons-material/SetMeal';
import OpacityIcon from '@mui/icons-material/Opacity';
import { use24HourChartData } from './use24HourChartData';
import { ChartMacroBars } from './Charts/ChartMacroBars';
import { ChartActivityBand } from './Charts/ChartActivityBand';
import { ChartTooltips } from './Charts/ChartTooltips';
import { ChartAxes } from './Charts/ChartAxes';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { ResponsiveMainContent } from './ResponsiveMainContent';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import useResizeObserver from 'use-resize-observer';

const DEFAULT_WIDTH = 1200;
const MIN_WIDTH = 350;
const MAX_WIDTH = 1200;
const height = 500;
const margin = { top: 40, right: 40, bottom: 60, left: 60 };
const yTicks = [40, 55, 70, 120, 180, 260, 400];
const xHours = Array.from({ length: 24 }, (_, i) => i);

// Modern pastel-wellness palette
const palette = {
  primary: '#3385A0', // teal-slate
  accent: '#7ED6A5',  // soft mint
  bg: '#f8fafc',      // very light
  border: '#e5e7eb',  // gray-200
  text: '#111827',    // gray-900
  danger: '#ef4444',  // red-500
  muted: '#7A8492',   // steel-gray
};
const macroColors = {
  carbs: '#9B7EDA',    // muted lavender
  protein: '#7ED6A5',  // soft mint
  fat: '#FFB566',      // warm amber
};
const ACTIVITY_LANES = [
  { type: 'meal', label: 'Meals' },
  { type: 'mbg', label: 'Manual BG' },
];
const laneHeight = 28;
const iconHeight = 18;
const activityBandHeight = ACTIVITY_LANES.length * laneHeight;
const stepsBandHeight = 22;
const totalHeight = height + activityBandHeight + stepsBandHeight + 16; // Add padding

interface ChartDataPoint {
  timestamp: number;
  hour: number;
  value: number;
}

export const Charts24HourView2: React.FC = () => {
  const {
    mbgData,
    sgvData,
    meals,
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

  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    showTooltip,
    hideTooltip,
    tooltipOpen
  } = useTooltip<ChartDataPoint>();
  const {
    tooltipData: mealTooltipData,
    tooltipLeft: mealTooltipLeft,
    tooltipTop: mealTooltipTop,
    showTooltip: showMealTooltip,
    hideTooltip: hideMealTooltip,
    tooltipOpen: mealTooltipOpen
  } = useTooltip<Meal>();
  const {
    tooltipData: mbgIconTooltipData,
    tooltipLeft: mbgIconTooltipLeft,
    tooltipTop: mbgIconTooltipTop,
    showTooltip: showMbgIconTooltip,
    hideTooltip: hideMbgIconTooltip,
    tooltipOpen: mbgIconTooltipOpen
  } = useTooltip<ChartDataPoint>();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { ref: chartContainerRef, width: containerWidth = DEFAULT_WIDTH } = useResizeObserver<HTMLDivElement>();
  const chartWidth = Math.max(Math.min(containerWidth, MAX_WIDTH), MIN_WIDTH);

  const xScale = useMemo(
    () =>
      scaleLinear({
        domain: [0, 24],
        range: [margin.left, chartWidth - margin.right],
      }),
    [chartWidth]
  );
  const yScale = useMemo(
    () =>
      scaleLog({
        domain: [40, 400],
        range: [height - margin.bottom, margin.top],
        clamp: true,
      }),
    []
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  // Add debug logging for rendering

  return (
    <ResponsiveMainContent>
      <div ref={chartContainerRef} style={{ width: '100%', maxWidth: MAX_WIDTH, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: palette.text, marginBottom: 16 }}>
            24 Hour Activity Chart (Blood Glucose, Meals & Activity)
          </h2>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={showMBG}
                onChange={(e) => setShowMBG(e.target.checked)}
                style={{ accentColor: palette.primary }}
              />
              <span style={{ color: palette.text }}>Show MBG</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={showSGV}
                onChange={(e) => setShowSGV(e.target.checked)}
                style={{ accentColor: palette.primary }}
              />
              <span style={{ color: palette.text }}>Show SGV</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={showAvg}
                onChange={(e) => setShowAvg(e.target.checked)}
                style={{ accentColor: palette.primary }}
              />
              <span style={{ color: palette.text }}>Show Average</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: palette.text }}>Bounds:</span>
              <input
                type="number"
                value={boundLow}
                onChange={(e) => setBoundLow(Number(e.target.value))}
                style={{ width: 60, padding: 4, borderRadius: 4, border: `1px solid ${palette.border}` }}
              />
              <span style={{ color: palette.text }}>-</span>
              <input
                type="number"
                value={boundHigh}
                onChange={(e) => setBoundHigh(Number(e.target.value))}
                style={{ width: 60, padding: 4, borderRadius: 4, border: `1px solid ${palette.border}` }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: palette.text }}>Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ padding: 4, borderRadius: 4, border: `1px solid ${palette.border}` }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <IconButton
                onClick={() => setSelectedDate((d) => format(subDays(parseISO(d), 1), 'yyyy-MM-dd'))}
                size="small"
                style={{ color: palette.primary }}
              >
                <ArrowBackIosNewIcon />
              </IconButton>
              <IconButton
                onClick={() => setSelectedDate((d) => format(addDays(parseISO(d), 1), 'yyyy-MM-dd'))}
                size="small"
                style={{ color: palette.primary }}
              >
                <ArrowForwardIosIcon />
              </IconButton>
            </div>
          </div>
        </div>
        <svg width={chartWidth} height={height} style={{ background: palette.bg, display: 'block', maxWidth: '100%' }}>
          <Group>
            <rect
              x={margin.left}
              y={yScale(boundHigh)}
              width={chartWidth - margin.left - margin.right}
              height={yScale(boundLow) - yScale(boundHigh)}
              fill={palette.accent}
              opacity={0.12}
              stroke={palette.accent}
              strokeWidth={2}
              rx={6}
            />
            <ChartAxes xScale={xScale} yScale={yScale} width={chartWidth} height={height} margin={margin} yTicks={yTicks} xHours={xHours} palette={palette} />
            <ChartMacroBars
              mealData={meals}
              xScale={xScale}
              yScale={yScale}
              macroColors={macroColors}
              showMealTooltip={showMealTooltip}
              hideMealTooltip={hideMealTooltip}
            />
            {showSGV &&
              sgvData.map((d, i) => {
                let color = palette.primary;
                if (d.value > boundHigh || d.value < boundLow) color = '#f59e42';
                return (
                  <Circle
                    key={`sgv-${i}`}
                    cx={xScale(d.hour)}
                    cy={yScale(d.value)}
                    r={4}
                    fill={color}
                    fillOpacity={0.5}
                    onMouseEnter={event => {
                      showTooltip({
                        tooltipData: d,
                        tooltipLeft: event.clientX + 10,
                        tooltipTop: event.clientY + 10,
                      });
                    }}
                    onMouseLeave={hideTooltip}
                  />
                );
              })}
            {showMBG &&
              mbgData.map((d, i) => (
                <Circle
                  key={`mbg-${i}`}
                  cx={xScale(d.hour)}
                  cy={yScale(d.value)}
                  r={4}
                  fill={palette.danger}
                  onMouseEnter={event => {
                    showTooltip({
                      tooltipData: d,
                      tooltipLeft: event.clientX + 10,
                      tooltipTop: event.clientY + 10,
                    });
                  }}
                  onMouseLeave={hideTooltip}
                />
              ))}
            {showAvg && avgSgv > 0 && (
              <line
                x1={margin.left}
                y1={yScale(avgSgv)}
                x2={chartWidth - margin.right}
                y2={yScale(avgSgv)}
                stroke={palette.text}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
            )}
          </Group>
        </svg>
        <svg width={chartWidth} height={ACTIVITY_LANES.length * laneHeight + 8} style={{ display: 'block', marginLeft: 0, maxWidth: '100%' }}>
          <ChartActivityBand
            activities={[
              ...meals.map(meal => ({ type: 'meal', data: meal })),
              ...mbgData.map(mbg => ({ type: 'mbg', data: mbg })),
            ]}
            xScale={xScale}
            height={4} // top padding for icons
            laneHeight={laneHeight}
            iconHeight={iconHeight}
            ACTIVITY_LANES={ACTIVITY_LANES}
            palette={palette}
            macroColors={macroColors}
            showMealTooltip={showMealTooltip}
            hideMealTooltip={hideMealTooltip}
          />
        </svg>
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
    </ResponsiveMainContent>
  );
};