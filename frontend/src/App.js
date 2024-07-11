import React, { useState } from 'react';
import Upload from './components/Upload';
import Query from './components/Query';
import Fetch from './components/Fetch';
import Update from './components/Update';
import Delete from './components/Delete';
import List from './components/List';
import Stats from './components/Stats';
import Login from './components/Login';
import FileManager from './components/FileManager'; // Import FileManager
import { ThemeProvider, CssBaseline, Container, Box, Button } from '@mui/material';
import theme from './theme'; // Import your custom theme
import logo from './assets/logo.png'; // Import your logo image

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
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
              <Upload />
              <Query />
              <Fetch />
              <Update />
              <Delete />
              <List />
              <Stats />
              <FileManager /> {/* Use FileManager here */}
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
