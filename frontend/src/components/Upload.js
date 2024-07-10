import React, { useState } from 'react';
import axios from 'axios';
import { Button, TextField, Typography, Box, CircularProgress, Paper } from '@mui/material';

const Upload = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    console.log('Selected Files:', selectedFiles);
    setFiles(selectedFiles);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      console.error('No files selected.');
      return;
    }

    setUploading(true);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('file', file);
    });

    try {
      const response = await axios.post('http://localhost:5000/upsert', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('Upload Response:', response.data);
      setUploadMessage('Files uploaded successfully.');
    } catch (error) {
      console.error('Error uploading files:', error);
      setUploadMessage('Failed to upload files. ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h4" gutterBottom color="primary">
        Upload Files
      </Typography>
      <Box component="div" sx={{ mb: 2 }}>
        <input type="file" onChange={handleFileChange} multiple />
      </Box>
      <Button onClick={handleUpload} variant="contained" color="primary" disabled={uploading}>
        {uploading ? <CircularProgress size={24} /> : 'Upload'}
      </Button>
      {uploadMessage && <Typography variant="body1" sx={{ mt: 2 }} color="secondary">{uploadMessage}</Typography>}
    </Paper>
  );
};

export default Upload;
