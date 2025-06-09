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
import { ConfigForm } from './components/ConfigForm';
import DataRecoveryToolkit from './components/DataRecoveryToolkit';
import { Drawer, List, ListItem, ListItemText, Collapse, ListSubheader, Toolbar, Box, Divider } from '@mui/material';
import { ExpandLess, ExpandMore, Timeline, Radar, Restaurant, Settings, Science, BarChart, ListAlt, Build, Storage, BugReport, Assignment, Fastfood, MenuBook } from '@mui/icons-material';

const drawerWidth = 260;

// Helper for NavLink className
const navLinkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'Mui-selected' : undefined);

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
          <img src="/GlucoHub_logo.png" alt="GlucoHub Logo" style={{ height: 120, width: 120, borderRadius: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }} />
        </Box>
      </Toolbar>
      <Divider />
      <List component="nav" sx={{ pt: 0 }}>
        {/* Charts */}
        <ListItem component="div" onClick={() => handleToggle('charts')}>
          <BarChart sx={{ mr: 2 }} />
          <ListItemText primary="Charts" />
          {open.charts ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={open.charts} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItem button component={NavLink} to="/charts?view=linear" sx={{ pl: 4 }} className={({ isActive }) => navLinkClass({ isActive })}>
              <Timeline sx={{ mr: 1 }} fontSize="small" />
              <ListItemText primary="24-Hour Linear" />
            </ListItem>
            <ListItem button component={NavLink} to="/charts?view=wheel" sx={{ pl: 4 }} className={({ isActive }) => navLinkClass({ isActive })}>
              <Radar sx={{ mr: 1 }} fontSize="small" />
              <ListItemText primary="Time Wheel" />
            </ListItem>
          </List>
        </Collapse>
        {/* Blood Glucose */}
        <ListItem component="div" onClick={() => handleToggle('bg')}>
          <Science sx={{ mr: 2 }} />
          <ListItemText primary="Blood Glucose" />
          {open.bg ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={open.bg} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItem button component={NavLink} to="/blood-glucose" sx={{ pl: 4 }} className={({ isActive }) => navLinkClass({ isActive })}>
              <ListAlt sx={{ mr: 1 }} fontSize="small" />
              <ListItemText primary="Overview" />
            </ListItem>
            <ListItem button component={NavLink} to="/sensor-glucose" sx={{ pl: 4 }} className={({ isActive }) => navLinkClass({ isActive })}>
              <Assignment sx={{ mr: 1 }} fontSize="small" />
              <ListItemText primary="Sensor Entry" />
            </ListItem>
            <ListItem button component={NavLink} to="/upload" sx={{ pl: 4 }} className={({ isActive }) => navLinkClass({ isActive })}>
              <Storage sx={{ mr: 1 }} fontSize="small" />
              <ListItemText primary="Upload" />
            </ListItem>
          </List>
        </Collapse>
        {/* Meals */}
        <ListItem component="div" onClick={() => handleToggle('meals')}>
          <Fastfood sx={{ mr: 2 }} />
          <ListItemText primary="Meals" />
          {open.meals ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={open.meals} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItem button component={NavLink} to="/" sx={{ pl: 4 }} className={({ isActive }) => navLinkClass({ isActive })}>
              <Restaurant sx={{ mr: 1 }} fontSize="small" />
              <ListItemText primary="Meal Logger" />
            </ListItem>
            <ListItem button component={NavLink} to="/meal-plans" sx={{ pl: 4 }} className={({ isActive }) => navLinkClass({ isActive })}>
              <MenuBook sx={{ mr: 1 }} fontSize="small" />
              <ListItemText primary="Meal Plans" />
            </ListItem>
          </List>
        </Collapse>
        {/* Advanced Tools */}
        <ListItem component="div" onClick={() => handleToggle('tools')}>
          <Build sx={{ mr: 2 }} />
          <ListItemText primary="Advanced Tools" />
          {open.tools ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={open.tools} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItem button component={NavLink} to="/api-v3-test" sx={{ pl: 4 }} className={({ isActive }) => navLinkClass({ isActive })}>
              <BugReport sx={{ mr: 1 }} fontSize="small" />
              <ListItemText primary="API v3 Test" />
            </ListItem>
            <ListItem button component={NavLink} to="/xdrip-db" sx={{ pl: 4 }} className={({ isActive }) => navLinkClass({ isActive })}>
              <Storage sx={{ mr: 1 }} fontSize="small" />
              <ListItemText primary="xDrip DB" />
            </ListItem>
            <ListItem button component={NavLink} to="/data-recovery" sx={{ pl: 4 }} className={({ isActive }) => navLinkClass({ isActive })}>
              <Build sx={{ mr: 1 }} fontSize="small" />
              <ListItemText primary="Data Recovery Toolkit" />
            </ListItem>
            <ListItem button component={NavLink} to="/data-fix" sx={{ pl: 4 }} className={({ isActive }) => navLinkClass({ isActive })}>
              <Build sx={{ mr: 1 }} fontSize="small" />
              <ListItemText primary="Data Fix" />
            </ListItem>
          </List>
        </Collapse>
        {/* Settings */}
        <ListItem component="div" onClick={() => handleToggle('settings')}>
          <Settings sx={{ mr: 2 }} />
          <ListItemText primary="Settings" />
          {open.settings ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={open.settings} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItem button component={NavLink} to="/config" sx={{ pl: 4 }} className={({ isActive }) => navLinkClass({ isActive })}>
              <Settings sx={{ mr: 1 }} fontSize="small" />
              <ListItemText primary="Configuration" />
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
          <Route path="/api-v3-test" element={<ApiV3Test />} />
          <Route path="/xdrip-db" element={<XdripDbAnalyzer />} />
          <Route path="/data-recovery" element={<DataRecoveryToolkit />} />
          <Route path="/data-fix" element={<DataFix />} />
          <Route path="/config" element={<ConfigForm />} />
        </Routes>
      </Box>
    </Box>
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