import React from 'react';
import { TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import BakeryDiningIcon from '@mui/icons-material/BakeryDining';
import SetMealIcon from '@mui/icons-material/SetMeal';
import OpacityIcon from '@mui/icons-material/Opacity';
import BloodtypeIcon from '@mui/icons-material/Bloodtype';
import SensorsIcon from '@mui/icons-material/Sensors';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import FavoriteIcon from '@mui/icons-material/Favorite';

function isMBG(data: any) {
  // Explicitly check for type 'mbg', or fallback to old logic
  return data && (data.type === 'mbg' || (typeof data.value === 'number' && data.carbs === undefined && data.type === undefined));
}

function isSGV(data: any) {
  // Explicitly check for type 'sgv', or fallback to old logic
  return data && (data.type === 'sgv' || (typeof data.value === 'number' && data.carbs === undefined && data.type === undefined));
}

export const ChartTooltips = ({
  tooltipOpen, tooltipData, tooltipLeft, tooltipTop,
  mealTooltipOpen, mealTooltipData, mealTooltipLeft, mealTooltipTop,
  mbgIconTooltipOpen, mbgIconTooltipData, mbgIconTooltipLeft, mbgIconTooltipTop,
  stepsTooltipOpen, stepsTooltipData, stepsTooltipLeft, stepsTooltipTop,
  hrTooltipOpen, hrTooltipData, hrTooltipLeft, hrTooltipTop,
  palette, macroColors
}: any) => {
  // Helper to render SGV tooltip
  const renderSGVTooltip = (data: any, left: number, top: number) => (
    <TooltipWithBounds
      key={data.timestamp}
      top={top}
      left={left}
      style={{
        ...defaultStyles,
        background: palette.bg,
        border: `1px solid ${palette.primary}`,
        borderRadius: 4,
        padding: 8,
        fontSize: 12,
        color: palette.primary,
      }}
    >
      <div>
        <strong>Sensor Glucose</strong>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span title="SGV" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <SensorsIcon style={{ fontSize: 18, color: palette.primary, verticalAlign: 'middle' }} />
            <span style={{ fontWeight: 600 }}>{data.value} mg/dL</span>
          </span>
        </div>
        <div style={{ marginTop: 8, color: palette.muted, fontSize: 13 }}>
          {data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </div>
      </div>
    </TooltipWithBounds>
  );

  // Helper to render MBG tooltip in meal style
  const renderMBGTooltip = (data: any, left: number, top: number) => (
    <TooltipWithBounds
      key={data.timestamp}
      top={top}
      left={left}
      style={{
        ...defaultStyles,
        background: palette.bg,
        border: `1px solid ${palette.danger}`,
        borderRadius: 4,
        padding: 8,
        fontSize: 12,
        color: palette.danger,
      }}
    >
      <div>
        <strong>Manual Blood Glucose</strong>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span title="MBG" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <BloodtypeIcon style={{ fontSize: 18, color: palette.danger, verticalAlign: 'middle' }} />
            <span style={{ fontWeight: 600 }}>{data.value} mg/dL</span>
          </span>
        </div>
        <div style={{ marginTop: 8, color: palette.muted, fontSize: 13 }}>
          {data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </div>
      </div>
    </TooltipWithBounds>
  );

  // Helper to render meal tooltip (unchanged)
  const renderMealTooltip = (data: any, left: number, top: number) => (
    <TooltipWithBounds
      key={data.id}
      top={top}
      left={left}
      style={{
        ...defaultStyles,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 4,
        padding: 8,
        fontSize: 12,
        color: palette.text,
      }}
    >
      <div>
        <strong>Meal:</strong> {data.name || 'Meal'}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span title="Carbs" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <BakeryDiningIcon style={{ fontSize: 18, color: macroColors.carbs, verticalAlign: 'middle' }} />
            <span>{data.carbs}g</span>
          </span>
          <span title="Protein" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <SetMealIcon style={{ fontSize: 18, color: macroColors.protein, verticalAlign: 'middle' }} />
            <span>{data.protein}g</span>
          </span>
          <span title="Fat" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <OpacityIcon style={{ fontSize: 18, color: macroColors.fat, verticalAlign: 'middle' }} />
            <span>{data.fat}g</span>
          </span>
        </div>
        {data.notes && data.notes !== data.name && (
          <div style={{ marginTop: 8, color: palette.muted, fontSize: 14 }}>{data.notes}</div>
        )}
        <div style={{ marginTop: 8, color: palette.muted, fontSize: 13 }}>
          {(() => {
            const mealDate = data.created_at ? new Date(data.created_at) : null;
            return mealDate && !isNaN(mealDate.getTime())
              ? mealDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'N/A';
          })()}
        </div>
      </div>
    </TooltipWithBounds>
  );

  // Helper to render steps tooltip
  const renderStepsTooltip = (data: any, left: number, top: number) => (
    <TooltipWithBounds
      key={data.start?.toISOString?.() || 'steps'}
      top={top}
      left={left}
      style={{
        ...defaultStyles,
        background: palette.bg,
        border: `1px solid #FFB566`,
        borderRadius: 4,
        padding: 8,
        fontSize: 12,
        color: '#FFB566',
      }}
    >
      <div>
        <strong style={{ color: '#FFB566' }}>Steps Activity</strong>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span title="Steps" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <DirectionsWalkIcon style={{ fontSize: 18, color: '#FFB566', verticalAlign: 'middle' }} />
            <span style={{ fontWeight: 600 }}>{data.steps} steps</span>
          </span>
        </div>
        <div style={{ marginTop: 8, color: palette.muted, fontSize: 13 }}>
          {data.duration} min &bull; {data.start ? data.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} - {data.end ? data.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </div>
      </div>
    </TooltipWithBounds>
  );

  // Helper to render heart rate tooltip
  const renderHrTooltip = (data: any, left: number, top: number) => (
    <TooltipWithBounds
      key={data.datetime?.toISOString?.() || 'hr'}
      top={top}
      left={left}
      style={{
        ...defaultStyles,
        background: palette.bg,
        border: `1px solid #FF7A7A`,
        borderRadius: 4,
        padding: 8,
        fontSize: 12,
        color: '#FF7A7A',
      }}
    >
      <div>
        <strong style={{ color: '#FF7A7A' }}>Heart Rate</strong>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span title="Heart Rate" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <FavoriteIcon style={{ fontSize: 18, color: '#FF7A7A', verticalAlign: 'middle' }} />
            <span style={{ fontWeight: 600 }}>{data.heartrate} bpm</span>
          </span>
        </div>
        <div style={{ marginTop: 8, color: palette.muted, fontSize: 13 }}>
          {data.datetime ? data.datetime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </div>
      </div>
    </TooltipWithBounds>
  );

  // Render logic for meal, MBG, and SGV tooltips
  const renderMealOrMBGOrSGVTooltip = (data: any, left: number, top: number) => {
    if (!data) return null;
    if (Array.isArray(data)) data = data[0];
    if (isSGV(data)) return renderSGVTooltip(data, left, top);
    if (isMBG(data)) return renderMBGTooltip(data, left, top);
    return renderMealTooltip(data, left, top);
  };

  return (
    <>
      {tooltipOpen && tooltipData && (isSGV(tooltipData) ? renderSGVTooltip(tooltipData, tooltipLeft, tooltipTop) : isMBG(tooltipData) ? renderMBGTooltip(tooltipData, tooltipLeft, tooltipTop) : null)}
      {mealTooltipOpen && mealTooltipData && renderMealOrMBGOrSGVTooltip(mealTooltipData, mealTooltipLeft, mealTooltipTop)}
      {mbgIconTooltipOpen && mbgIconTooltipData && renderMBGTooltip(mbgIconTooltipData, mbgIconTooltipLeft, mbgIconTooltipTop)}
      {stepsTooltipOpen && stepsTooltipData && renderStepsTooltip(stepsTooltipData, stepsTooltipLeft, stepsTooltipTop)}
      {hrTooltipOpen && hrTooltipData && renderHrTooltip(hrTooltipData, hrTooltipLeft, hrTooltipTop)}
    </>
  );
}; 