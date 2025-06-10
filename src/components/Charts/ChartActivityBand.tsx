import React from 'react';
import RamenDiningIcon from '@mui/icons-material/RamenDining';
import BloodtypeIcon from '@mui/icons-material/Bloodtype';

interface ActivityBandProps {
  activities: any[]; // Flat array of activities
  xScale: (hour: number) => number;
  height: number;
  laneHeight: number;
  iconHeight: number;
  ACTIVITY_LANES: { type: string; label: string }[];
  palette: any;
  macroColors: any;
  showMealTooltip: (args: any) => void;
  hideMealTooltip: () => void;
}

export const ChartActivityBand: React.FC<ActivityBandProps> = ({
  activities,
  xScale,
  height,
  laneHeight,
  iconHeight,
  ACTIVITY_LANES,
  palette,
  macroColors,
  showMealTooltip,
  hideMealTooltip,
}) => {
  // Filter out meal activities (using created_at) and mbg activities (using timestamp or hour).
  const mealActivities = activities.filter(a => a.type === 'meal' && a.data.created_at);
  const mbgActivities = activities.filter(a => a.type === 'mbg');

  // Render meal lane (each meal icon plotted individually using created_at)
  const mealLaneIdx = ACTIVITY_LANES.findIndex(l => l.type === 'meal');
  const mbgLaneIdx = ACTIVITY_LANES.findIndex(l => l.type === 'mbg');

  return (
    <g>
      {/* Meal Lane (each meal icon plotted individually using created_at) */}
      {mealActivities.map((a, i) => {
        const meal = a.data;
        // Robust date extraction: try date (ms), then timestamp (s), then created_at (ISO)
        let utcDate = null;
        if (meal.date && !isNaN(meal.date)) {
          utcDate = new Date(meal.date);
        } else if (meal.timestamp && !isNaN(meal.timestamp)) {
          // Heuristic: if timestamp is in the past and < 10^12, treat as seconds
          const ts = meal.timestamp > 1e12 ? meal.timestamp : meal.timestamp * 1000;
          utcDate = new Date(ts);
        } else if (meal.created_at) {
          utcDate = new Date(meal.created_at);
        } else {
          return null;
        }
        if (!utcDate || isNaN(utcDate.getTime())) {
          return null;
        }
        const hour = utcDate.getHours() + utcDate.getMinutes() / 60;
        if (typeof hour !== 'number' || isNaN(hour)) {
          return null;
        }
        const x = xScale(hour);
        if (typeof x !== 'number' || isNaN(x)) {
          return null;
        }
        const bandTop = height;
        const y = bandTop + mealLaneIdx * laneHeight + (laneHeight - iconHeight) / 2;
        return (
          <foreignObject
            key={`meal-activity-${i}`}
            x={x - 9}
            y={y}
            width={22}
            height={22}
            style={{ overflow: 'visible' }}
            onMouseMove={event => {
              showMealTooltip({ tooltipData: [meal], tooltipLeft: x, tooltipTop: y - 24 });
            }}
            onMouseLeave={hideMealTooltip}
          >
            <RamenDiningIcon style={{ color: macroColors.carbs, fontSize: iconHeight }} />
          </foreignObject>
        );
      })}

      {/* MBG Lane (each mbg icon plotted individually) */}
      {mbgActivities.map((a, i) => {
        const mbg = a.data;
        let hour: number;
        if (typeof mbg.hour === 'number') {
          hour = mbg.hour;
        } else if (mbg.timestamp) {
          const date = new Date(mbg.timestamp);
          hour = !isNaN(date.getTime()) ? date.getHours() + date.getMinutes() / 60 : NaN;
        } else {
          hour = NaN;
        }
        if (typeof hour !== 'number' || isNaN(hour)) {
          return null;
        }
        const x = xScale(hour);
        const bandTop = height;
        const y = bandTop + mbgLaneIdx * laneHeight + (laneHeight - iconHeight) / 2;
        return (
          <foreignObject
            key={`mbg-activity-${i}`}
            x={x - 9}
            y={y}
            width={22}
            height={22}
            style={{ overflow: 'visible' }}
            onMouseMove={event => {
              showMealTooltip({ tooltipData: [mbg], tooltipLeft: x, tooltipTop: y - 24 });
            }}
            onMouseLeave={hideMealTooltip}
          >
            <BloodtypeIcon style={{ color: palette.danger, fontSize: iconHeight }} />
          </foreignObject>
        );
      })}
    </g>
  );
}; 