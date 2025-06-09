import React from 'react';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import RamenDiningIcon from '@mui/icons-material/RamenDining';
import BloodtypeIcon from '@mui/icons-material/Bloodtype';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { LinePath } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import Tooltip from '@mui/material/Tooltip';

interface HeartRateRow {
  datetime: Date;
  heartrate: number;
}
interface StepsRow {
  start: Date;
  end: Date;
  steps: number;
  duration: number;
}
interface ActivityItem {
  type: 'meal' | 'mbg';
  data: any;
}
interface ChartActivityAreaProps {
  hrSegments: HeartRateRow[][];
  hrBadges: { datetime: Date; avgHR: number; start: Date; end: Date; }[];
  filteredStepsData: StepsRow[];
  activityBins: { [key: string]: ActivityItem[] };
  xScale: (hour: number) => number;
  width: number;
  margin: { left: number; right: number };
  palette: any;
  macroColors: any;
  showHrTooltip: (args: any) => void;
  hideHrTooltip: () => void;
  showStepsTooltip: (args: any) => void;
  hideStepsTooltip: () => void;
  showMealTooltip: (args: any) => void;
  hideMealTooltip: () => void;
}

const HR_LINE_COLOR = '#FF7A7A';
const STEPS_BAR_COLOR = '#FFB566';
const HR_BAND_HEIGHT = 32;
const STEPS_BAND_HEIGHT = 22;
const ACTIVITY_BAND_HEIGHT = 28;
const ICON_HEIGHT = 18;
const LANE_PADDING = 8;

const getHour = (date: Date) => date.getHours() + date.getMinutes() / 60;

const ChartActivityArea: React.FC<ChartActivityAreaProps> = ({
  hrSegments,
  hrBadges,
  filteredStepsData,
  activityBins,
  xScale,
  width,
  margin,
  palette,
  macroColors,
  showHrTooltip,
  hideHrTooltip,
  showStepsTooltip,
  hideStepsTooltip,
  showMealTooltip,
  hideMealTooltip,
}) => {
  // Lane positions
  const hrBandTop = 0;
  const stepsBandTop = hrBandTop + HR_BAND_HEIGHT + LANE_PADDING;
  const activityBandTop = stepsBandTop + STEPS_BAND_HEIGHT + LANE_PADDING;

  return (
    <g>
      {/* Heart Rate Lane */}
      {hrSegments.map((segment, idx) => (
        segment.length > 1 && (
          <g key={`hr-segment-${idx}`}>
            <LinePath
              data={segment}
              x={hr => xScale(getHour(hr.datetime))}
              y={hr => hrBandTop + HR_BAND_HEIGHT - ((hr.heartrate - 60) / 70) * HR_BAND_HEIGHT}
              stroke={HR_LINE_COLOR}
              strokeWidth={1.5}
              curve={curveMonotoneX}
            />
          </g>
        )
      ))}
      {/* Steps Lane */}
      {filteredStepsData.map((step, i) => {
        const x1 = xScale(getHour(step.start));
        const x2 = xScale(getHour(step.end));
        const y = stepsBandTop;
        return (
          <g key={`steps-bar-${i}`}>
            <rect
              x={x1}
              y={y}
              width={Math.max(8, x2 - x1)}
              height={STEPS_BAND_HEIGHT}
              fill={STEPS_BAR_COLOR}
              rx={6}
              opacity={0.6}
              onMouseMove={e => {
                showStepsTooltip({
                  tooltipData: step,
                  tooltipLeft: e.clientX - 50,
                  tooltipTop: e.clientY - 50
                });
              }}
              onMouseLeave={hideStepsTooltip}
              style={{ cursor: 'pointer' }}
            />
            <foreignObject
              x={x1 - 12}
              y={y + 2}
              width={20}
              height={20}
              style={{ overflow: 'visible' }}
              onMouseMove={e => {
                showStepsTooltip({
                  tooltipData: step,
                  tooltipLeft: e.clientX - 50,
                  tooltipTop: e.clientY - 50
                });
              }}
              onMouseLeave={hideStepsTooltip}
            >
              <DirectionsWalkIcon style={{ color: STEPS_BAR_COLOR, fontSize: 18 }} />
            </foreignObject>
          </g>
        );
      })}
      {/* Meals & MBG Lane (collapsed) */}
      {Object.entries(activityBins).map(([key, activities], binIdx) => {
        const y = activityBandTop + (ACTIVITY_BAND_HEIGHT - ICON_HEIGHT) / 2;
        return activities.map((a, i) => {
          const date = new Date(a.data.timestamp);
          const x = xScale(getHour(date));
          let icon = null;
          if (a.type === 'meal') {
            icon = <RamenDiningIcon style={{ color: macroColors.carbs, fontSize: ICON_HEIGHT }} />;
          } else if (a.type === 'mbg') {
            icon = <BloodtypeIcon style={{ color: palette.danger, fontSize: ICON_HEIGHT }} />;
          }
          return (
            <foreignObject
              key={`activity-${key}-${a.type}-${i}`}
              x={x - 9}
              y={y}
              width={22}
              height={22}
              style={{ overflow: 'visible' }}
              onMouseMove={event => {
                showMealTooltip({
                  tooltipData: [a.data],
                  tooltipLeft: event.clientX - 50,
                  tooltipTop: event.clientY - 50,
                });
              }}
              onMouseLeave={hideMealTooltip}
            >
              {icon}
            </foreignObject>
          );
        });
      })}
      {hrBadges.map((badge, i) => {
        const x = xScale(getHour(badge.datetime));
        const y = hrBandTop + HR_BAND_HEIGHT - ((badge.avgHR - 60) / 70) * HR_BAND_HEIGHT;
        return (
          <Tooltip
            key={`hr-badge-${i}`}
            title={`Elevated HR: ${badge.avgHR.toFixed(1)} bpm\n${badge.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${badge.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            placement="top"
            arrow
          >
            <g style={{ pointerEvents: 'auto', cursor: 'pointer' }}>
              <FavoriteIcon
                x={x - 10}
                y={y - 10}
                style={{
                  fontSize: 20,
                  fill: '#FF7A7A',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.10))',
                  transform: `translate(${x - 10}px, ${y - 10}px)`
                }}
              />
            </g>
          </Tooltip>
        );
      })}
    </g>
  );
};

export default ChartActivityArea; 