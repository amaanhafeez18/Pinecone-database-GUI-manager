import React, { useState } from 'react';
import axios from 'axios';
import { Button, TextField, Typography, Box, Paper } from '@mui/material';

const Query = () => {
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('{}');
  const [topK, setTopK] = useState(3);
  const [results, setResults] = useState([]);

  const handleQuery = async () => {
    try {
      const response = await axios.get('http://localhost:5000/query', {
        params: { text, filter, topK },
      });
      setResults(response.data);
    } catch (error) {
      console.error('Error querying vectors:', error);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h4" gutterBottom>
        Query Vectors
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Text"
          variant="outlined"
          value={text}
          onChange={(e) => setText(e.target.value)}
          fullWidth
        />
        <TextField
          label="Filter (JSON)"
          variant="outlined"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          fullWidth
        />
        <TextField
          label="Top K"
          variant="outlined"
          type="number"
          value={topK}
          onChange={(e) => setTopK(e.target.value)}
          fullWidth
        />
        <Button onClick={handleQuery} variant="contained" color="primary">
          Query
        </Button>
      </Box>
      <Typography variant="h6" sx={{ mt: 2 }}>
        Results
      </Typography>
      <pre>{JSON.stringify(results, null, 2)}</pre>
    </Paper>
  );
};

export default Query;
