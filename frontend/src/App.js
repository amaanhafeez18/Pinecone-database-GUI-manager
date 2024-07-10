import React from 'react';
import Upload from './components/Upload';
import Query from './components/Query';
import Fetch from './components/Fetch';
import Update from './components/Update';
import Delete from './components/Delete';
import List from './components/List';
import Stats from './components/Stats';
import { ThemeProvider, CssBaseline, Container, Typography, Box } from '@mui/material';
import theme from './theme'; // Import your custom theme
import logo from './assets/logo.png'; // Import your logo image

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1, backgroundColor: theme.palette.primary.main }}>
          <img src={logo} alt="Pinecone Logo" style={{ height: 50, marginRight: 16 }} />

        </Box>
        <Container sx={{ py: 4 }}>
          <Upload />
          <Query />
          <Fetch />
          <Update />
          <Delete />
          <List />
          <Stats />
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
