import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Badge,
  useTheme,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  AccountBalanceWallet as WalletIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

export const Navbar = () => {
  const theme = useTheme();

  return (
    <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Trading Bot
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton color="inherit" size="large">
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton color="inherit" size="large">
            <WalletIcon />
          </IconButton>

          <IconButton color="inherit" size="large">
            <SettingsIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}; 