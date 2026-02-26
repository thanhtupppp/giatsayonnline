import { createTheme } from '@mui/material/styles';

export function createAppTheme(mode: 'light' | 'dark') {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#1565C0',
        light: '#42A5F5',
        dark: '#0D47A1',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#00897B',
        light: '#4DB6AC',
        dark: '#00695C',
        contrastText: '#FFFFFF',
      },
      success: {
        main: '#43A047',
        light: '#66BB6A',
        dark: '#2E7D32',
      },
      warning: {
        main: '#FB8C00',
        light: '#FFA726',
        dark: '#EF6C00',
      },
      error: {
        main: '#E53935',
        light: '#EF5350',
        dark: '#C62828',
      },
      background: mode === 'light'
        ? { default: '#F5F7FA', paper: '#FFFFFF' }
        : { default: '#121212', paper: '#1E1E1E' },
      text: mode === 'light'
        ? { primary: '#212121', secondary: '#757575' }
        : { primary: '#E0E0E0', secondary: '#AAAAAA' },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 700 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '10px 24px',
            fontSize: '0.95rem',
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: mode === 'light'
              ? '0 2px 12px rgba(0,0,0,0.08)'
              : '0 2px 12px rgba(0,0,0,0.3)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: 'none',
            boxShadow: mode === 'light'
              ? '2px 0 8px rgba(0,0,0,0.05)'
              : '2px 0 8px rgba(0,0,0,0.2)',
          },
        },
      },
    },
  });
}

// Default export for backward compatibility
const theme = createAppTheme('light');
export default theme;
