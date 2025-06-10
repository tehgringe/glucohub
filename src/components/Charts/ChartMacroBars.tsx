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

  // Log meal data on first render
  React.useEffect(() => {
    if (!hasLoggedRef.current && mealData.length > 0) {
      // All debug logging suppressed as per request
      // console.log('[ChartMacroBars] Meal data:', {
      //   count: mealData.length,
      //   meals: mealData.map(m => {
      //     if (!m.created_at) {
      //       console.warn('[ChartMacroBars] Invalid created_at for meal:', m);
      //       return null;
      //     }
      //     const utcDate = new Date(m.created_at);
      //     const hour = utcDate.getHours() + utcDate.getMinutes() / 60;
      //     return {
      //       name: m.name,
      //       utc: utcDate.toISOString(),
      //       local: utcDate.toString(),
      //       carbs: m.carbs,
      //       hour
      //     };
      //   }).filter(Boolean)
      // });
      hasLoggedRef.current = true;
    }
  }, [mealData]);

  return (
    <g>
      {[...mealData].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((meal, i) => {
        if (!meal.created_at) {
          // All debug logging suppressed as per request
          // console.warn('[ChartMacroBars] Invalid created_at for meal:', meal);
          return null;
        }
        const utcDate = new Date(meal.created_at);
        const hour = utcDate.getHours() + utcDate.getMinutes() / 60;
        const barX = xScale(hour) - barWidth / 2;
        if (!hasLoggedRef.current) {
          // All debug logging suppressed as per request
          // console.log('[ChartMacroBars] Bar positioning:', {
          //   meal: meal.name,
          //   utc: utcDate.toISOString(),
          //   local: utcDate.toString(),
          //   hour,
          //   carbs: meal.carbs,
          //   barX
          // });
        }
        const carbs = Number(meal.carbs) || 0;
        if (carbs <= 0) {
          // All debug logging suppressed as per request
          // console.warn('[ChartMacroBars] Meal has no carbs:', meal);
          return null;
        }
        const yValue = 40 + (carbs / 100) * (400 - 40);
        const barY = yScale(yValue);
        const barBase = yScale(40);
        const barHeight = barBase - barY;
        return (
          <g key={`meal-${i}`}>
            <rect
              x={barX}
              y={barY}
              width={barWidth}
              height={barHeight}
              fill={macroColors.carbs}
              opacity={0.6}
              onMouseMove={event => {
                showMealTooltip({
                  tooltipData: meal,
                  tooltipLeft: event.clientX - 50,
                  tooltipTop: event.clientY - 50,
                });
              }}
              onMouseLeave={hideMealTooltip}
              style={{ cursor: 'pointer' }}
            />
          </g>
        );
      })}
    </g>
  );
}; 