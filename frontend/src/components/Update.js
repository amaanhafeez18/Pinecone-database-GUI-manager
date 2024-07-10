import React, { useState } from 'react';
import axios from 'axios';
import { Button, TextField, Typography, Box, Paper } from '@mui/material';

const Update = () => {
  const [id, setId] = useState('');
  const [values, setValues] = useState('');
  const [metadata, setMetadata] = useState('{}');

  const handleUpdate = async () => {
    try {
      const response = await axios.post('http://localhost:5000/update', {
        id,
        values: JSON.parse(`[${values}]`),
        metadata: JSON.parse(metadata),
      });
      console.log(response.data);
    } catch (error) {
      console.error('Error updating vector:', error);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h4" gutterBottom>
        Update Vector
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="ID"
          variant="outlined"
          value={id}
          onChange={(e) => setId(e.target.value)}
          fullWidth
        />
        <TextField
          label="Values (comma-separated)"
          variant="outlined"
          value={values}
          onChange={(e) => setValues(e.target.value)}
          fullWidth
        />
        <TextField
          label="Metadata (JSON)"
          variant="outlined"
          value={metadata}
          onChange={(e) => setMetadata(e.target.value)}
          fullWidth
        />
        <Button onClick={handleUpdate} variant="contained" color="primary">
          Update
        </Button>
      </Box>
    </Paper>
  );
};

export default Update;
