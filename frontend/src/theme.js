import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      light: '##16181b',    // Light Cyan
      main: '#101214',     // Cyan
      dark: '#008ba3',     // Dark Cyan
      contrastText: '#ffffff', // White
    },
    secondary: {
      light: '#ffcc80',    // Light Orange
      main: '#29b6f6',     // Orange
      dark: '#c66900',     // Dark Orange
      contrastText: '#000000', // Black
    },
    background: {
      default: '#f0f4f8',  // Light Gray for background
    },
  },
});

export default theme;
