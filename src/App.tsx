import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, NavLink } from 'react-router-dom';
import { NightscoutProvider } from './contexts/NightscoutContext';
import { MealLogger } from './components/MealLogger';
import { MealPlans } from './components/MealPlans';
import { BloodGlucose } from './components/BloodGlucose';
import { SensorGlucose } from './components/SensorGlucose';
import { BloodGlucoseUpload } from './components/BloodGlucoseUpload';
import ApiV3Test from './components/ApiV3Test';
import XdripDbAnalyzer from './components/XdripDbAnalyzer';
import DataRecovery from './components/DataRecovery';
import DataFix from './components/DataFix';
import { Charts } from './components/Charts';
import { Settings } from './components/Settings';
import DataRecoveryToolkit from './components/DataRecoveryToolkit';
import { Drawer, List, ListItem, ListItemText, Collapse, ListSubheader, Toolbar, Box, Divider } from '@mui/material';
import { ExpandLess, ExpandMore, Timeline, Radar, Restaurant, Settings as MuiSettings, Science, BarChart, PieChart, ListAlt, Build, Storage, BugReport, Assignment, Fastfood, MenuBook } from '@mui/icons-material';
import glucohubLogo from './../public/glucohub_logo_small.png';
import { MacroPieExample } from './components/Charts/MacroPieExample';
import { BubbleChart as MuiBubbleChart } from '@mui/icons-material';
import { BubbleChart } from './components/Charts/BubbleChart';
import { use24HourChartData } from './components/use24HourChartData';

const drawerWidth = 260;

// Helper for NavLink className
const navLinkClass = (isActive: boolean) => (isActive ? 'Mui-selected' : '');

function SidebarNav() {
  const [open, setOpen] = useState({
    charts: true,
    bg: false,
    meals: false,
    tools: false,
    settings: false,
  });
  const location = useLocation();
  const handleToggle = (key: keyof typeof open) => setOpen(prev => ({ ...prev, [key]: !prev[key] }));
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', background: '#f8fafc' },
      }}
    >
      <Toolbar>
        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
          <img src={glucohubLogo} alt="GlucoHub Logo" style={{ height: 120, width: 120, borderRadius: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }} />
        </Box>
      </Toolbar>
      <Divider />
      <List component="nav" sx={{ pt: 0 }}>
        {/* Charts */}
        <ListItem component="div" onClick={() => handleToggle('charts')}>
          <BarChart sx={{ mr: 2 }} fontSize="small" />
          <ListItemText primary="Charts" primaryTypographyProps={{ style: { fontSize: '0.95rem' } }} />
          {open.charts ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={open.charts} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItem button disableGutters>
              <NavLink
                to="/charts?view=linear"
                className={({ isActive }) => navLinkClass(isActive)}
                style={{ display: 'flex', alignItems: 'center', paddingLeft: 32, width: '100%' }}
              >
                <Timeline sx={{ mr: 1, color: '#374151' }} fontSize="small" />
                <ListItemText primary="24-Hour Linear" primaryTypographyProps={{ style: { color: '#374151', fontSize: '0.85rem' } }} />
              </NavLink>
            </ListItem>
            <ListItem button disableGutters>
              <NavLink
                to="/charts?view=wheel"
                className={({ isActive }) => navLinkClass(isActive)}
                style={{ display: 'flex', alignItems: 'center', paddingLeft: 32, width: '100%' }}
              >
                <Radar sx={{ mr: 1, color: '#374151' }} fontSize="small" />
                <ListItemText primary="Time Wheel" primaryTypographyProps={{ style: { color: '#374151', fontSize: '0.85rem' } }} />
              </NavLink>
            </ListItem>
            <ListItem button disableGutters>
              <NavLink
                to="/charts/macro-pie-example"
                className={({ isActive }) => navLinkClass(isActive)}
                style={{ display: 'flex', alignItems: 'center', paddingLeft: 32, width: '100%' }}
              >
                <PieChart sx={{ mr: 1, color: '#374151' }} fontSize="small" />
                <ListItemText primary="Macros" primaryTypographyProps={{ style: { color: '#374151', fontSize: '0.85rem' } }} />
              </NavLink>
            </ListItem>
            <ListItem button disableGutters>
              <NavLink
                to="/charts/macro-bg-bubble"
                className={({ isActive }) => navLinkClass(isActive)}
                style={{ display: 'flex', alignItems: 'center', paddingLeft: 32, width: '100%' }}
              >
                <MuiBubbleChart sx={{ mr: 1, color: '#374151' }} fontSize="small" />
                <ListItemText primary="Macro-BG Bubble" primaryTypographyProps={{ style: { color: '#374151', fontSize: '0.85rem' } }} />
              </NavLink>
            </ListItem>
          </List>
        </Collapse>
        {/* Blood Glucose */}
        <ListItem component="div" onClick={() => handleToggle('bg')}>
          <Science sx={{ mr: 2 }} />
          <ListItemText primary="Blood Glucose" primaryTypographyProps={{ style: { fontSize: '0.95rem' } }} />
          {open.bg ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={open.bg} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItem button disableGutters>
              <NavLink
                to="/blood-glucose"
                className={({ isActive }) => navLinkClass(isActive)}
                style={{ display: 'flex', alignItems: 'center', paddingLeft: 32, width: '100%' }}
              >
                <ListAlt sx={{ mr: 1 }} fontSize="small" />
                <ListItemText primary="Overview" primaryTypographyProps={{ style: { fontSize: '0.85rem' } }} />
              </NavLink>
            </ListItem>
            <ListItem button disableGutters>
              <NavLink
                to="/sensor-glucose"
                className={({ isActive }) => navLinkClass(isActive)}
                style={{ display: 'flex', alignItems: 'center', paddingLeft: 32, width: '100%' }}
              >
                <Assignment sx={{ mr: 1 }} fontSize="small" />
                <ListItemText primary="Sensor Entry" primaryTypographyProps={{ style: { fontSize: '0.85rem' } }} />
              </NavLink>
            </ListItem>
            <ListItem button disableGutters>
              <NavLink
                to="/upload"
                className={({ isActive }) => navLinkClass(isActive)}
                style={{ display: 'flex', alignItems: 'center', paddingLeft: 32, width: '100%' }}
              >
                <Storage sx={{ mr: 1 }} fontSize="small" />
                <ListItemText primary="Upload" primaryTypographyProps={{ style: { fontSize: '0.85rem' } }} />
              </NavLink>
            </ListItem>
          </List>
        </Collapse>
        {/* Meals */}
        <ListItem component="div" onClick={() => handleToggle('meals')}>
          <Fastfood sx={{ mr: 2 }} />
          <ListItemText primary="Meals" primaryTypographyProps={{ style: { fontSize: '0.95rem' } }} />
          {open.meals ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={open.meals} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItem button disableGutters>
              <NavLink
                to="/"
                className={({ isActive }) => navLinkClass(isActive)}
                style={{ display: 'flex', alignItems: 'center', paddingLeft: 32, width: '100%' }}
              >
                <Restaurant sx={{ mr: 1 }} fontSize="small" />
                <ListItemText primary="Meal Logger" primaryTypographyProps={{ style: { fontSize: '0.85rem' } }} />
              </NavLink>
            </ListItem>
            <ListItem button disableGutters>
              <NavLink
                to="/meal-plans"
                className={({ isActive }) => navLinkClass(isActive)}
                style={{ display: 'flex', alignItems: 'center', paddingLeft: 32, width: '100%' }}
              >
                <MenuBook sx={{ mr: 1 }} fontSize="small" />
                <ListItemText primary="Meal Plans" primaryTypographyProps={{ style: { fontSize: '0.85rem' } }} />
              </NavLink>
            </ListItem>
          </List>
        </Collapse>
        {/* Advanced Tools */}
        <ListItem component="div" onClick={() => handleToggle('tools')}>
          <Build sx={{ mr: 2 }} />
          <ListItemText primary="Advanced Tools" primaryTypographyProps={{ style: { fontSize: '0.95rem' } }} />
          {open.tools ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={open.tools} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItem button disableGutters>
              <NavLink
                to="/api-v3-test"
                className={({ isActive }) => navLinkClass(isActive)}
                style={{ display: 'flex', alignItems: 'center', paddingLeft: 32, width: '100%' }}
              >
                <BugReport sx={{ mr: 1 }} fontSize="small" />
                <ListItemText primary="API v3 Test" primaryTypographyProps={{ style: { fontSize: '0.85rem' } }} />
              </NavLink>
            </ListItem>
            <ListItem button disableGutters>
              <NavLink
                to="/xdrip-db"
                className={({ isActive }) => navLinkClass(isActive)}
                style={{ display: 'flex', alignItems: 'center', paddingLeft: 32, width: '100%' }}
              >
                <Storage sx={{ mr: 1 }} fontSize="small" />
                <ListItemText primary="xDrip DB" primaryTypographyProps={{ style: { fontSize: '0.85rem' } }} />
              </NavLink>
            </ListItem>
            <ListItem button disableGutters>
              <NavLink
                to="/data-recovery"
                className={({ isActive }) => navLinkClass(isActive)}
                style={{ display: 'flex', alignItems: 'center', paddingLeft: 32, width: '100%' }}
              >
                <Build sx={{ mr: 1 }} fontSize="small" />
                <ListItemText primary="Data Recovery Toolkit" primaryTypographyProps={{ style: { fontSize: '0.85rem' } }} />
              </NavLink>
            </ListItem>
            <ListItem button disableGutters>
              <NavLink
                to="/data-fix"
                className={({ isActive }) => navLinkClass(isActive)}
                style={{ display: 'flex', alignItems: 'center', paddingLeft: 32, width: '100%' }}
              >
                <Build sx={{ mr: 1 }} fontSize="small" />
                <ListItemText primary="Data Fix" primaryTypographyProps={{ style: { fontSize: '0.85rem' } }} />
              </NavLink>
            </ListItem>
          </List>
        </Collapse>
        {/* Settings */}
        <ListItem component="div" onClick={() => handleToggle('settings')}>
          <MuiSettings sx={{ mr: 2 }} />
          <ListItemText primary="Settings" primaryTypographyProps={{ style: { fontSize: '0.95rem' } }} />
          {open.settings ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={open.settings} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItem button disableGutters>
              <NavLink
                to="/config"
                className={({ isActive }) => navLinkClass(isActive)}
                style={{ display: 'flex', alignItems: 'center', paddingLeft: 32, width: '100%' }}
              >
                <MuiSettings sx={{ mr: 1 }} fontSize="small" />
                <ListItemText primary="Configuration" primaryTypographyProps={{ style: { fontSize: '0.85rem' } }} />
              </NavLink>
            </ListItem>
          </List>
        </Collapse>
      </List>
    </Drawer>
  );
}

function AppLayout() {
  return (
    <Box sx={{ display: 'flex' }}>
      <SidebarNav />
      <Box component="main" sx={{ flexGrow: 1, bgcolor: '#f3f4f6', minHeight: '100vh', p: 3 }}>
        <Routes>
          <Route path="/" element={<MealLogger />} />
          <Route path="/meal-plans" element={<MealPlans />} />
          <Route path="/blood-glucose" element={<BloodGlucose />} />
          <Route path="/sensor-glucose" element={<SensorGlucose />} />
          <Route path="/upload" element={<BloodGlucoseUpload />} />
          <Route path="/charts" element={<Charts />} />
          <Route path="/charts/macro-pie-example" element={<MacroPieExample />} />
          <Route path="/charts/macro-bg-bubble" element={<MacroBgBubbleExample />} />
          <Route path="/api-v3-test" element={<ApiV3Test />} />
          <Route path="/xdrip-db" element={<XdripDbAnalyzer />} />
          <Route path="/data-recovery" element={<DataRecoveryToolkit />} />
          <Route path="/data-fix" element={<DataFix />} />
          <Route path="/config" element={<Settings onSave={() => {}} />} />
        </Routes>
      </Box>
    </Box>
  );
}

function MacroBgBubbleExample() {
  const { meals, sgvData, loading, error } = use24HourChartData();
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  // Map sgvData to ensure required fields for BubbleChart
  const mappedSgvData = sgvData.map(d => ({
    ...d,
    date: (d as any).date ?? (d as any).timestamp ?? 0,
    value: (d as any).value ?? 0,
    device: (d as any).device ?? 'CGM',
    source: (d as any).source ?? 'unknown',
    device_source: (d as any).device_source ?? 'unknown',
    test: (d as any).test ?? false,
  }));
  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Macro-BG Bubble Chart</h2>
      <BubbleChart meals={meals} sgvData={mappedSgvData} width={700} height={480} />
    </div>
  );
}

export default function App() {
  return (
    <NightscoutProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </NightscoutProvider>
  );
} 