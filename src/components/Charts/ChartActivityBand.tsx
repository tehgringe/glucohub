import React from 'react';
import RamenDiningIcon from '@mui/icons-material/RamenDining';
import BloodtypeIcon from '@mui/icons-material/Bloodtype';
import Badge from '@mui/material/Badge';

interface ActivityBandProps {
  activityBins: { [key: string]: any[] };
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
  activityBins, xScale, height, laneHeight, iconHeight, ACTIVITY_LANES, palette, macroColors, showMealTooltip, hideMealTooltip
}) => (
  <g>
    {ACTIVITY_LANES.map((lane, laneIdx) => (
      Object.entries(activityBins).map(([key, activities], binIdx) => {
        const acts = activities as any[];
        const items = acts.filter(a => a.type === lane.type).map(a => a.data);
        if (items.length === 0) return null;
        const first = items[0];
        const date = new Date(first.timestamp);
        const hour = date.getHours() + date.getMinutes() / 60;
        const x = xScale(hour);
        const bandTop = height;
        const y = bandTop + laneIdx * laneHeight + (laneHeight - iconHeight) / 2;
        const icon = lane.type === 'meal'
          ? <RamenDiningIcon style={{ color: macroColors.carbs, fontSize: iconHeight }} />
          : <BloodtypeIcon style={{ color: palette.danger, fontSize: iconHeight }} />;
        return (
          <foreignObject
            key={`activity-${key}-${lane.type}`}
            x={x - 9}
            y={y}
            width={22}
            height={22}
            style={{ overflow: 'visible' }}
            onMouseMove={event => {
              showMealTooltip({
                tooltipData: items,
                tooltipLeft: x,
                tooltipTop: y - 24,
              });
            }}
            onMouseLeave={hideMealTooltip}
          >
            {items.length > 1 ? (
              <Badge
                badgeContent={items.length}
                color={lane.type === 'meal' ? 'default' : 'error'}
                overlap="circular"
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                sx={{
                  '& .MuiBadge-badge': {
                    background: 'transparent',
                    color: lane.type === 'meal' ? macroColors.carbs : palette.danger,
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 12,
                    minWidth: 0,
                    height: 'auto',
                    right: -2,
                    top: -2,
                    zIndex: 2,
                    boxShadow: 'none',
                    padding: 0,
                  }
                }}
              >
                {icon}
              </Badge>
            ) : (
              icon
            )}
          </foreignObject>
        );
      })
    ))}
  </g>
); 