import React, { useMemo } from 'react';
import { Meal, BloodGlucoseReading } from '../../types/nightscout';
import { scaleLinear } from '@visx/scale';
import { Group } from '@visx/group';
import { TooltipWithBounds, useTooltip, defaultStyles } from '@visx/tooltip';
import { ResponsiveMainContent } from '../ResponsiveMainContent';

// Utility: compute energy in kJ
function calcEnergyKJ(carbs: number, protein: number, fat: number) {
  return carbs * 17 + protein * 17 + fat * 37;
}

// Utility: get CGM readings within ±2h of meal
function getMealCgmWindow(meal: Meal, sgvData: BloodGlucoseReading[]) {
  if (!meal.created_at) return [];
  const mealTime = new Date(meal.created_at).getTime();
  const windowStart = mealTime - 2 * 60 * 60 * 1000;
  const windowEnd = mealTime + 2 * 60 * 60 * 1000;
  return sgvData.filter(d => d.date >= windowStart && d.date <= windowEnd).sort((a, b) => a.date - b.date);
}

// Utility: calculate BG metrics
function calcBgMetrics(meal: Meal, sgvData: BloodGlucoseReading[]) {
  const mealTime = meal.created_at ? new Date(meal.created_at).getTime() : null;
  if (!mealTime) return { peak: null, timeToPeak: null, auc: null };
  const postMeal = sgvData.filter(d => d.date >= mealTime && d.date <= mealTime + 2 * 60 * 60 * 1000);
  if (!postMeal.length) return { peak: null, timeToPeak: null, auc: null };
  const peak = Math.max(...postMeal.map(d => d.value));
  const peakPoint = postMeal.find(d => d.value === peak);
  const timeToPeak = peakPoint ? (peakPoint.date - mealTime) / 60000 : null;
  // AUC: trapezoidal rule
  let auc = 0;
  for (let i = 1; i < postMeal.length; i++) {
    const dt = (postMeal[i].date - postMeal[i - 1].date) / 60000; // min
    const avg = (postMeal[i].value + postMeal[i - 1].value) / 2;
    auc += avg * dt;
  }
  return { peak, timeToPeak, auc };
}

interface BubbleChartProps {
  meals: Meal[];
  sgvData: BloodGlucoseReading[];
  width?: number;
  height?: number;
}

export const BubbleChart: React.FC<BubbleChartProps> = ({ meals, sgvData, width = 600, height = 400 }) => {
  // Prepare data
  const chartData = useMemo(() => meals.map(meal => {
    const totalMacros = (Number(meal.carbs) || 0) + (Number(meal.protein) || 0) + (Number(meal.fat) || 0);
    const pctCarbs = totalMacros ? (Number(meal.carbs) || 0) / totalMacros : 0;
    const pctProtein = totalMacros ? (Number(meal.protein) || 0) / totalMacros : 0;
    const pctFat = totalMacros ? (Number(meal.fat) || 0) / totalMacros : 0;
    const energy = calcEnergyKJ(Number(meal.carbs) || 0, Number(meal.protein) || 0, Number(meal.fat) || 0);
    const cgmWindow = getMealCgmWindow(meal, sgvData);
    const { peak, timeToPeak, auc } = calcBgMetrics(meal, cgmWindow);
    return {
      meal,
      pctCarbs,
      pctProtein,
      pctFat,
      energy,
      peak,
      timeToPeak,
      auc,
    };
  }).filter(d => d.peak !== null && d.energy > 0), [meals, sgvData]);

  // Scales
  const xScale = scaleLinear({ domain: [0, 1], range: [60, width - 60] });
  const yMax = Math.max(...chartData.map(d => d.peak || 0), 200);
  const yMin = Math.min(...chartData.map(d => d.peak || 0), 60);
  const yScale = scaleLinear({ domain: [yMin, yMax], range: [height - 60, 60] });
  const sizeScale = scaleLinear({ domain: [0, Math.max(...chartData.map(d => d.energy), 1000)], range: [12, 48] });
  const colorScale = scaleLinear({ domain: [0, 1], range: ['#e0e7ef', '#7ED6A5'] }); // %Protein

  // Tooltip
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } = useTooltip<any>();

  return (
    <ResponsiveMainContent>
      <div style={{ position: 'relative' }}>
        <svg width={width} height={height} style={{ background: '#f8fafc', borderRadius: 12 }}>
          <Group>
            {/* Axes */}
            <line x1={60} y1={height - 60} x2={width - 40} y2={height - 60} stroke="#bbb" strokeWidth={1.5} />
            <line x1={60} y1={height - 60} x2={60} y2={40} stroke="#bbb" strokeWidth={1.5} />
            {/* Axis labels */}
            <text x={width / 2} y={height - 20} textAnchor="middle" fontSize={15} fill="#333">% Carbs</text>
            <text x={20} y={height / 2} textAnchor="middle" fontSize={15} fill="#333" transform={`rotate(-90, 20, ${height / 2})`}>Peak BG (mg/dL)</text>
            {/* Bubbles */}
            {chartData.map((d, i) => (
              <circle
                key={i}
                cx={xScale(d.pctCarbs)}
                cy={yScale(d.peak ?? 0)}
                r={sizeScale(d.energy)}
                fill={colorScale(d.pctProtein)}
                fillOpacity={0.7}
                stroke="#7ED6A5"
                strokeWidth={1.5}
                onMouseMove={e => showTooltip({ tooltipData: d, tooltipLeft: xScale(d.pctCarbs) + 10, tooltipTop: yScale(d.peak ?? 0) - 10 })}
                onMouseLeave={hideTooltip}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </Group>
        </svg>
        {tooltipOpen && tooltipData && (
          <TooltipWithBounds top={tooltipTop} left={tooltipLeft} style={{ ...defaultStyles, fontSize: 14, zIndex: 10 }}>
            <div><strong>{tooltipData.meal.name}</strong></div>
            <div>Carbs: {tooltipData.meal.carbs}g ({Math.round(tooltipData.pctCarbs * 100)}%)</div>
            <div>Protein: {tooltipData.meal.protein}g ({Math.round(tooltipData.pctProtein * 100)}%)</div>
            <div>Fat: {tooltipData.meal.fat}g ({Math.round(tooltipData.pctFat * 100)}%)</div>
            <div>Energy: {tooltipData.energy} kJ</div>
            <div>Peak BG: {tooltipData.peak} mg/dL</div>
            <div>Time to Peak: {tooltipData.timeToPeak ? tooltipData.timeToPeak.toFixed(0) : 'N/A'} min</div>
            <div>AUC: {tooltipData.auc ? tooltipData.auc.toFixed(0) : 'N/A'}</div>
          </TooltipWithBounds>
        )}
      </div>
    </ResponsiveMainContent>
  );
}; 