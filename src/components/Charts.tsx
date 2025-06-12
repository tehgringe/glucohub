import React from 'react';
import { Charts24HourView2 as Charts24HourViewModern } from './Charts24HourView2';
import { TimeWheelChart } from './Charts/TimeWheelChart';
import { Box } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { ResponsiveMainContent } from './ResponsiveMainContent';

type ChartView = 'linear' | 'wheel';

export function Charts() {
  const [searchParams] = useSearchParams();
  const view = (searchParams.get('view') || 'linear') as ChartView;

  return (
    <ResponsiveMainContent>
      <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          {view === 'linear' ? (
            <Charts24HourViewModern />
          ) : (
            <TimeWheelChart width={800} height={800} />
          )}
        </Box>
      </Box>
    </ResponsiveMainContent>
  );
} 