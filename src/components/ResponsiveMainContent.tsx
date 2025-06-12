import React from 'react';
import { Box } from '@mui/material';

export const ResponsiveMainContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      maxWidth: { xs: '100%', md: 900 },
      mx: 'auto',
      p: { xs: 2, sm: 3, md: 6 },
      width: '100%',
      minHeight: '100vh',
      boxSizing: 'border-box',
    }}
  >
    {children}
  </Box>
); 