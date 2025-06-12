import React from 'react';
import { Pie } from '@visx/shape';
import BakeryDiningIcon from '@mui/icons-material/BakeryDining';
import SetMealIcon from '@mui/icons-material/SetMeal';
import OpacityIcon from '@mui/icons-material/Opacity';

const macroColors = {
  carbs: '#9B7EDA',    // muted lavender
  protein: '#7ED6A5',  // soft mint
  fat: '#FFB566',      // warm amber
};

interface MacroPieChartProps {
  carbs: number;
  protein: number;
  fat: number;
  label?: string;
  size?: number;
}

const iconMap: Record<string, React.ReactNode> = {
  Carbs: <BakeryDiningIcon sx={{ fontSize: 18, color: '#d1d5db' }} />,
  Protein: <SetMealIcon sx={{ fontSize: 18, color: '#d1d5db' }} />,
  Fat: <OpacityIcon sx={{ fontSize: 18, color: '#d1d5db' }} />,
};

export const MacroPieChart: React.FC<MacroPieChartProps> = ({ carbs, protein, fat, label, size = 180 }) => {
  const data = [
    { key: 'Carbs', value: carbs, color: macroColors.carbs },
    { key: 'Protein', value: protein, color: macroColors.protein },
    { key: 'Fat', value: fat, color: macroColors.fat },
  ].filter(d => d.value > 0);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = size / 2;
  return (
    <div style={{ display: 'inline-block', textAlign: 'center' }}>
      {label && <div style={{ fontWeight: 600, marginBottom: 8 }}>{label}</div>}
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        <g transform={`translate(${radius},${radius})`}>
          <Pie
            data={data}
            pieValue={d => d.value}
            outerRadius={radius - 8}
            innerRadius={(radius - 8) * 0.7}
          >
            {pie =>
              pie.arcs.map((arc, i) => (
                <g key={i}>
                  <path d={pie.path(arc) || ''} fill={arc.data.color} />
                  {/* Icons hidden for now */}
                </g>
              ))
            }
          </Pie>
        </g>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 8 }}>
        {data.map(d => (
          <span key={d.key} style={{ display: 'flex', alignItems: 'center', fontSize: 13 }}>
            <span style={{ width: 14, height: 14, background: d.color, borderRadius: 3, display: 'inline-block', marginRight: 5, border: '1px solid #ddd' }} />
            {d.key}
          </span>
        ))}
      </div>
    </div>
  );
}; 