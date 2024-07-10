import React, { useState } from 'react';
import axios from 'axios';
import { Button, Typography, Box, Paper } from '@mui/material';

const Stats = () => {
  const [stats, setStats] = useState({});

  const handleStats = async () => {
    try {
      const response = await axios.get('http://localhost:5000/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error retrieving stats:', error);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h4" gutterBottom>
        Index Stats
      </Typography>
      <Button onClick={handleStats} variant="contained" color="primary">
        Get Stats
      </Button>
      <Typography variant="h6" sx={{ mt: 2 }}>
        Stats
      </Typography>
      <pre>{JSON.stringify(stats, null, 2)}</pre>
    </Paper>
  );
};

export default Stats;
