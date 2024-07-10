import React, { useState } from 'react';
import axios from 'axios';
import { Button, TextField, Typography, Box, Paper } from '@mui/material';

const Delete = () => {
  const [ids, setIds] = useState('');

  const handleDelete = async () => {
    try {
      const response = await axios.delete('http://localhost:5000/delete', {
        data: { ids: JSON.stringify(ids.split(',')) },
      });
      console.log(response.data);
    } catch (error) {
      console.error('Error deleting vectors:', error);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h4" gutterBottom>
        Delete Vectors
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          label="IDs (comma-separated)"
          variant="outlined"
          value={ids}
          onChange={(e) => setIds(e.target.value)}
          fullWidth
        />
        <Button onClick={handleDelete} variant="contained" color="primary">
          Delete
        </Button>
      </Box>
    </Paper>
  );
};

export default Delete;
