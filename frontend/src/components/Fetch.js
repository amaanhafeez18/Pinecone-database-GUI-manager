import React, { useState } from 'react';
import axios from 'axios';
import { TextField, Button, Typography, Box, Paper } from '@mui/material';

const Fetch = () => {
  const [ids, setIds] = useState('');
  const [results, setResults] = useState([]);

  const handleFetch = async () => {
    try {
      const response = await axios.get('http://localhost:5000/fetch', {
        params: { ids: JSON.stringify(ids.split(',')) },
      });
      setResults(response.data);
    } catch (error) {
      console.error('Error fetching vectors:', error);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h4" gutterBottom color="primary">
        Fetch Vectors
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <TextField
          label="IDs (comma-separated)"
          variant="outlined"
          value={ids}
          onChange={(e) => setIds(e.target.value)}
          fullWidth
          sx={{ mr: 2 }}
        />
        <Button variant="contained" color="primary" onClick={handleFetch}>
          Fetch
        </Button>
      </Box>
      <Typography variant="h6" color="secondary">Results</Typography>
      <pre>{JSON.stringify(results, null, 2)}</pre>
    </Paper>
  );
};

export default Fetch;
