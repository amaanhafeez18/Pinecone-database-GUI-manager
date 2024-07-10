// frontend/src/components/List.js
import React, { useState } from 'react';
import axios from 'axios';
import { TextField, Button, Typography, Box, Paper } from '@mui/material';

const List = () => {
  const [prefix, setPrefix] = useState('');
  const [limit, setLimit] = useState(10);
  const [paginationToken, setPaginationToken] = useState('');
  const [results, setResults] = useState([]);

  const handleList = async () => {
    try {
      const response = await axios.get('http://localhost:5000/list', {
        params: { prefix, limit, paginationToken },
      });
      setResults(response.data);
    } catch (error) {
      console.error('Error listing vectors:', error);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h4" gutterBottom>
        List Vectors
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Prefix"
          variant="outlined"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          fullWidth
        />
        <TextField
          label="Limit"
          variant="outlined"
          type="number"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          fullWidth
        />
        <TextField
          label="Pagination Token"
          variant="outlined"
          value={paginationToken}
          onChange={(e) => setPaginationToken(e.target.value)}
          fullWidth
        />
        <Button variant="contained" color="primary" onClick={handleList}>
          List
        </Button>
      </Box>
      <Typography variant="h6" sx={{ mt: 2 }}>
        Results
      </Typography>
      <pre>{JSON.stringify(results, null, 2)}</pre>
    </Paper>
  );
};

export default List;
