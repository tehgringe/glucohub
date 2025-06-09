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
import { parseSimulatedStepsCSV, SimulatedStepsRow } from '../utils/csvParser';
import { parseRealHeartRateCSV, SimulatedHeartRateRow } from '../utils/csvParser';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChartActivityArea from './Charts/ChartActivityArea';

const width = 1200;
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
        domain: [40, 400],
        range: [height - margin.bottom, margin.top],
        clamp: true,
      }),
    []
  );

  type ActivityType = 'meal' | 'mbg';
  type ActivityItem = { type: ActivityType; data: any };
  type ActivityBins = { [key: string]: ActivityItem[] };
  const groupActivities = (): ActivityBins => {
    const bins: ActivityBins = {};
    const getBinKey = (date: Date): string => format(date, 'HH:mm');
    mealData.forEach((meal) => {
      const date = new Date(meal.timestamp);
      const binKey = getBinKey(date);
      if (!bins[binKey]) bins[binKey] = [];
      bins[binKey].push({ type: 'meal', data: meal });
    });
    mbgData.forEach((mbg) => {
      const date = new Date(mbg.timestamp);
      const binKey = getBinKey(date);
      if (!bins[binKey]) bins[binKey] = [];
      bins[binKey].push({ type: 'mbg', data: mbg });
    });
    return bins;
  };
  const activityBins = useMemo(() => groupActivities(), [mealData, mbgData]);

  const [stepsData, setStepsData] = useState<SimulatedStepsRow[]>([]);
  const [hrData, setHrData] = useState<SimulatedHeartRateRow[]>([]);

  useEffect(() => {
    fetch('/simulated_steps_data.csv')
      .then(res => res.text())
      .then(text => {
        console.log('Raw CSV text:', text);
        const parsed = parseSimulatedStepsCSV(text);
        console.log('Parsed steps data:', parsed);
        setStepsData(parsed);
      })
      .catch(err => {
        console.error('Error loading steps data:', err);
        setStepsData([]);
      });
  }, []);

  useEffect(() => {
    fetch('/HeartRate3.csv')
      .then(res => res.text())
      .then(text => setHrData(parseRealHeartRateCSV(text)))
      .catch(() => setHrData([]));
  }, []);

  // Position the heart rate band as the topmost lane in the activity area
  const hrBandHeight = 40;
  const hrBandTop = height + 8; // Just below the main chart area
  const stepsBandTop = hrBandTop + hrBandHeight + 8;
  const stepsBarColor = '#FFB566'; // pastel orange

  // Tooltip for steps
  const {
    tooltipData: stepsTooltipData,
    tooltipLeft: stepsTooltipLeft,
    tooltipTop: stepsTooltipTop,
    showTooltip: showStepsTooltip,
    hideTooltip: hideStepsTooltip,
    tooltipOpen: stepsTooltipOpen
  } = useTooltip<SimulatedStepsRow>();

  // Filter steps data to only show entries for the selected date
  const filteredStepsData = useMemo(() => {
    const selectedDateStr = selectedDate;
    return stepsData.filter(step => {
      const stepDate = format(step.start, 'yyyy-MM-dd');
      return stepDate === selectedDateStr;
    });
  }, [stepsData, selectedDate]);

  // Filter HR data to only show entries for the selected date
  const filteredHrData = useMemo(() => {
    const selectedDateStr = selectedDate;
    const filtered = hrData.filter(hr => format(hr.datetime, 'yyyy-MM-dd') === selectedDateStr);
    console.log('Filtered heart rate data for selected date:', filtered);
    return filtered;
  }, [hrData, selectedDate]);

  const hrLineColor = '#FF7A7A'; // pastel red

  // Y-scale for heart rate
  const hrYScale = scaleLinear({
    domain: [60, 130],
    range: [hrBandTop + hrBandHeight, hrBandTop],
  });

  // Heart rate y-axis ticks
  const hrYTicks = [60, 80, 100, 120, 130];

  // Tooltip for heart rate
  const {
    tooltipData: hrTooltipData,
    tooltipLeft: hrTooltipLeft,
    tooltipTop: hrTooltipTop,
    showTooltip: showHrTooltip,
    hideTooltip: hideHrTooltip,
    tooltipOpen: hrTooltipOpen
  } = useTooltip<SimulatedHeartRateRow>();

  // Ensure filteredHrData is sorted by timestamp before averaging
  const sortedHrData = useMemo(() =>
    [...filteredHrData].sort((a, b) => a.datetime.getTime() - b.datetime.getTime()),
    [filteredHrData]
  );

  // Compute 1-minute averages for heart rate data
  const hrMinuteAverages = useMemo(() => {
    const byMinute = new Map<string, { sum: number; count: number; ts: number }>();
    sortedHrData.forEach(hr => {
      const d = hr.datetime;
      const minuteKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`;
      if (!byMinute.has(minuteKey)) {
        byMinute.set(minuteKey, { sum: 0, count: 0, ts: new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()).getTime() });
      }
      const entry = byMinute.get(minuteKey)!;
      entry.sum += hr.heartrate;
      entry.count += 1;
    });
    return Array.from(byMinute.values()).map(({ sum, count, ts }) => ({
      datetime: new Date(ts),
      heartrate: sum / count,
      count
    })).sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
  }, [sortedHrData]);

  // Split hrMinuteAverages into segments where the gap is >5 minutes
  const hrSegments = useMemo(() => {
    if (!hrMinuteAverages.length) return [];
    const segments: typeof hrMinuteAverages[] = [];
    let current: typeof hrMinuteAverages = [hrMinuteAverages[0]];
    for (let i = 1; i < hrMinuteAverages.length; i++) {
      const prev = hrMinuteAverages[i - 1];
      const curr = hrMinuteAverages[i];
      if (curr.datetime.getTime() - prev.datetime.getTime() > 5 * 60 * 1000) {
        segments.push(current);
        current = [];
      }
      current.push(curr);
    }
    if (current.length) segments.push(current);
    return segments;
  }, [hrMinuteAverages]);

  // Calculate the mean HR for the day
  const hrMean = useMemo(() => {
    if (!hrMinuteAverages.length) return 0;
    return hrMinuteAverages.reduce((sum, d) => sum + d.heartrate, 0) / hrMinuteAverages.length;
  }, [hrMinuteAverages]);

  // Find elevated HR periods (>= mean+20 for 30+ consecutive minutes)
  const hrBadges = useMemo(() => {
    const threshold = hrMean + 20;
    const badges = [];
    let run: typeof hrMinuteAverages = [];
    for (let i = 0; i < hrMinuteAverages.length; i++) {
      if (hrMinuteAverages[i].heartrate >= threshold) {
        run.push(hrMinuteAverages[i]);
      } else {
        if (run.length >= 30) {
          // Compute average HR and midpoint
          const avgHR = run.reduce((sum, d) => sum + d.heartrate, 0) / run.length;
          const midIdx = Math.floor(run.length / 2);
          badges.push({
            datetime: run[midIdx].datetime,
            avgHR,
            start: run[0].datetime,
            end: run[run.length - 1].datetime
          });
        }
        run = [];
      }
    }
    // Check for run at end
    if (run.length >= 30) {
      const avgHR = run.reduce((sum, d) => sum + d.heartrate, 0) / run.length;
      const midIdx = Math.floor(run.length / 2);
      badges.push({
        datetime: run[midIdx].datetime,
        avgHR,
        start: run[0].datetime,
        end: run[run.length - 1].datetime
      });
    }
    return badges;
  }, [hrMinuteAverages, hrMean]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  // Add debug logging for rendering
  console.log('Current steps data for rendering:', stepsData);
  console.log('Steps band position:', { stepsBandTop, stepsBandHeight });

  return (
    <div>
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
      <svg width={width} height={height} style={{ background: palette.bg }}>
        <Group>
          <rect
            x={margin.left}
            y={yScale(boundHigh)}
            width={width - margin.left - margin.right}
            height={yScale(boundLow) - yScale(boundHigh)}
            fill={palette.accent}
            opacity={0.12}
            stroke={palette.accent}
            strokeWidth={2}
            rx={6}
          />
          <ChartAxes xScale={xScale} yScale={yScale} width={width} height={height} margin={margin} yTicks={yTicks} xHours={xHours} palette={palette} />
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
                      tooltipLeft: event.clientX - 50,
                      tooltipTop: event.clientY - 50,
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
                    tooltipLeft: event.clientX - 50,
                    tooltipTop: event.clientY - 50,
                  });
                }}
                onMouseLeave={hideTooltip}
              />
            ))}
          {showAvg && avgSgv > 0 && (
            <line
              x1={margin.left}
              y1={yScale(avgSgv)}
              x2={width - margin.right}
              y2={yScale(avgSgv)}
              stroke={palette.text}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          )}
          <ChartMacroBars
            mealData={mealData}
            xScale={xScale}
            yScale={yScale}
            macroColors={macroColors}
            showMealTooltip={showMealTooltip}
            hideMealTooltip={hideMealTooltip}
          />
        </Group>
      </svg>
      <svg width={width} height={120} style={{ background: palette.bg, display: 'block' }}>
        <ChartActivityArea
          hrSegments={hrSegments}
          hrBadges={hrBadges}
          filteredStepsData={filteredStepsData}
          activityBins={activityBins}
          xScale={xScale}
          width={width}
          margin={margin}
          palette={palette}
          macroColors={macroColors}
          showHrTooltip={showHrTooltip}
          hideHrTooltip={hideHrTooltip}
          showStepsTooltip={showStepsTooltip}
          hideStepsTooltip={hideStepsTooltip}
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
        stepsTooltipOpen={stepsTooltipOpen}
        stepsTooltipData={stepsTooltipData}
        stepsTooltipLeft={stepsTooltipLeft}
        stepsTooltipTop={stepsTooltipTop}
        hrTooltipOpen={hrTooltipOpen}
        hrTooltipData={hrTooltipData}
        hrTooltipLeft={hrTooltipLeft}
        hrTooltipTop={hrTooltipTop}
        palette={palette}
        macroColors={macroColors}
      />
    </div>
  );
};