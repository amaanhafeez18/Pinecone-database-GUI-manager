import React, { useState } from 'react';
import axios from 'axios';
import {
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Button,
  Typography,
  Paper,
  Box,
} from '@mui/material';

function ListFiles({ onSelectFile }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/listfile');
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching file list:', error);
    }
    setLoading(false);
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h4" gutterBottom>
        File List
      </Typography>
      <Button variant="contained" onClick={fetchFiles} sx={{ mb: 2 }}>
        Fetch Files
      </Button>
      {loading ? (
        <CircularProgress />
      ) : (
        <List>
          {files.map((file) => (
            <ListItem
              key={file.filename}
              button
              onClick={() => onSelectFile(file.filename)}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.08)',
                },
              }}
            >
              <ListItemText
                primary={file.filename}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
}

export default ListFiles;
