import React, { useState } from 'react';
import axios from 'axios';
import { Button, TextField, Typography, Box, Paper, List, ListItem, ListItemText } from '@mui/material';

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
      setResults(response.data.matches);
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
      <List>
        {results.map((result, index) => (
          <ListItem key={index} divider>
            <ListItemText
              primary={`ID: ${result.id}`}
              secondary={
                <Box>
                  <Typography variant="body2">Score: {result.score}</Typography>
                  <Typography variant="body2">Chunk Index: {result.metadata.chunkIndex}</Typography>
                  <Typography variant="body2">Filename: {result.metadata.filename}</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    Chunk Content: {result.metadata.chunkContent}
                  </Typography>
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default Query;
