import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Toolbar,
  Box,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  SwapHoriz as SwapIcon,
  History as HistoryIcon,
  Analytics as AnalyticsIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const DRAWER_WIDTH = 240;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Trading', icon: <SwapIcon />, path: '/trading' },
  { text: 'Historique', icon: <HistoryIcon />, path: '/history' },
  { text: 'Analyse', icon: <AnalyticsIcon />, path: '/analytics' },
  { text: 'Sécurité', icon: <SecurityIcon />, path: '/security' },
  { text: 'Paramètres', icon: <SettingsIcon />, path: '/settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedPath = location.pathname;

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
        },
      }}
    >
      <Toolbar /> {/* Espace pour la navbar */}
      <List sx={{ mt: 2 }}>
        {menuItems.map((item, index) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={selectedPath === item.path}
              onClick={() => handleNavigation(item.path)}
              sx={{
                '&.Mui-selected': {
                  bgcolor: 'primary.dark',
                  '&:hover': {
                    bgcolor: 'primary.main',
                  },
                },
                borderRadius: '0 24px 24px 0',
                mr: 2,
              }}
            >
              <ListItemIcon
                sx={{ color: selectedPath === item.path ? 'primary.light' : 'inherit' }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};
