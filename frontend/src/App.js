import React, { useState, useEffect } from 'react';
import Upload from './components/Upload';
import Login from './components/Login';
import FileManager from './components/FileManager';
import { ThemeProvider, CssBaseline, Container, Box, Button } from '@mui/material';
import theme from './theme';
import logo from './assets/logo.png';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Clear the token from localStorage on component mount
    localStorage.removeItem('token');
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1, backgroundColor: theme.palette.primary.main }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <img src={logo} alt="Pinecone Logo" style={{ height: 50, marginRight: 16 }} />
          </Box>
          {isAuthenticated && (
            <Button
              variant="contained"
              sx={{
                backgroundColor: theme.palette.primary.light,
                color: theme.palette.primary.contrastText,
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
              }}
              onClick={handleLogout}
            >
              Logout
            </Button>
          )}
        </Box>
        <Container sx={{ py: 4 }}>
          {isAuthenticated ? (
            <>
              <FileManager />
              <Upload />
            </>
          ) : (
            <Login onLogin={handleLogin} />
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
