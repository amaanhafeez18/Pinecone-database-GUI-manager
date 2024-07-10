import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      light: '#1F2329',    // Light Cyan
      main: '#101214',     // Cyan
      dark: '#009a5e',     // Dark Cyan
      contrastText: '#ffffff', // White
    },
    secondary: {
      light: '#ffcc80',    // Light Orange
      main: '#009a5e',     // Orange
      dark: '#c66900',     // Dark Orange
      contrastText: '#000000', // Black
    },
    background: {
      default: '#f0f4f8',  // Light Gray for background
    },
  },
});

export default theme;
