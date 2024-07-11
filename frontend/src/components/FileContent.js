// src/components/FileContent.js
import React, { useState } from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Paper } from '@mui/material';
import axios from 'axios';

function FileContent() {
  const [filename, setFilename] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/file-content?filename=${encodeURIComponent(filename)}`);
      setContent(response.data);
    } catch (error) {
      console.error('Error fetching file content:', error);
      setContent('Failed to fetch file content.');
    }
    setLoading(false);
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h4" gutterBottom>
        Fetch File Content
      </Typography>
      <TextField
        label="Filename"
        value={filename}
        onChange={(e) => setFilename(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />
      <Button variant="contained" onClick={fetchContent} sx={{ mb: 2 }}>
        Fetch Content
      </Button>
      {loading ? (
        <CircularProgress />
      ) : (
        <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
          {content}
        </Typography>
      )}
    </Paper>
  );
}

export default FileContent;
