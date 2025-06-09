import React, { useRef } from 'react';

interface MacroBarProps {
  mealData: any[];
  xScale: (hour: number) => number;
  yScale: (value: number) => number;
  macroColors: { carbs: string; protein: string; fat: string };
  barWidth?: number;
  showMealTooltip: (args: any) => void;
  hideMealTooltip: () => void;
}

export const ChartMacroBars: React.FC<MacroBarProps> = ({ mealData, xScale, yScale, macroColors, barWidth = 16, showMealTooltip, hideMealTooltip }) => {
  const hasLoggedRef = useRef(false);

  return (
    <g>
      {mealData.map((meal, i) => {
        // Validate timestamp
        if (!meal.timestamp || isNaN(meal.timestamp)) {
          console.warn('Invalid timestamp for meal:', meal);
          return null;
        }

        // Use milliseconds for timestamp (consistent with data fetching)
        const mealDate = new Date(meal.timestamp);
        if (isNaN(mealDate.getTime())) {
          console.warn('Invalid date for meal:', meal);
          return null;
        }

        // Calculate hour of day as a float (e.g., 13.5 for 1:30pm), in local time to match ramen noodle icons
        const hour = mealDate.getHours() + mealDate.getMinutes() / 60;
        const barX = xScale(hour) - barWidth / 2;

        // Only use carbs for bar height
        const carbs = Number(meal.carbs) || 0;
        if (carbs <= 0) return null;

        // Scale carbs (0-100) to y-axis (40-400)
        const yValue = 40 + (carbs / 100) * (400 - 40);
        const barY = yScale(yValue);
        const barBase = yScale(40); // bottom of the chart
        const barHeight = barBase - barY;

        // Only log debug info on first render
        if (!hasLoggedRef.current) {
          console.log('[CarbBar Debug]', {
            mealTimestamp: meal.timestamp,
            mealDate: mealDate,
            hour,
            carbs
          });
          if (i === mealData.length - 1) {
            hasLoggedRef.current = true;
          }
        }

        return (
          <g key={`carb-bar-${i}`}
            style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.06))' }}
          >
            <rect
              x={barX}
              y={barY}
              width={barWidth}
              height={barHeight}
              fill={macroColors.carbs}
              fillOpacity={0.7}
              onMouseMove={event => {
                if (showMealTooltip) {
                  showMealTooltip({
                    tooltipData: [meal],
                    tooltipLeft: event.clientX - 50,
                    tooltipTop: event.clientY - 50,
                  });
                }
              }}
              onMouseLeave={hideMealTooltip}
            />
            <text
              x={xScale(hour)}
              y={barY - 6}
              textAnchor="middle"
              fontSize={13}
              fill="#888"
              fontWeight={600}
            >
              {carbs}
            </text>
          </g>
        );
      })}
    </g>
  );
}; 