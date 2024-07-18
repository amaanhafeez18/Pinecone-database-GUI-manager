import React, { useState } from 'react';
import axios from 'axios';
import {
  Grid,
  IconButton,
  CircularProgress,
  Button,
  Typography,
  Paper,
  Box,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { red } from '@mui/material/colors';

function ListFiles({ onSelectFile }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

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

  const deleteFile = async (filename) => {
    if (window.confirm(`Are you sure you want to delete ${filename}?`)) {
      setDeleting(true);
      setDeleteId(filename);
      console.log(`Deleting file: ${filename}`);
      try {
        const response = await axios.delete(`http://localhost:5000/delete-file`, {
          params: { filename }
        });
        console.log('Delete response:', response);
        if (response.status === 200) {
          setFiles(files.filter(file => file.filename !== filename));
        } else {
          console.error('Failed to delete file:', response.data);
        }
      } catch (error) {
        console.error('Error deleting file:', error);
      }
      setDeleting(false);
      setDeleteId(null);
    }
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
        <Box sx={{ flexGrow: 1 }}>
          <Grid container spacing={2}>
            {files.map((file) => (
              <Grid item key={file.filename} xs={12} sm={6} md={4} lg={3}>
                <Paper elevation={1} sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography
                    variant="body1"
                    onClick={() => onSelectFile(file.filename)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    {file.filename}
                  </Typography>
                  <IconButton
                    onClick={() => deleteFile(file.filename)}
                    sx={{
                      color: deleteId === file.filename ? 'inherit' : red[500],
                      '&:hover': {
                        color: red[700],
                      },
                    }}
                  >
                    {deleting && deleteId === file.filename ? (
                      <CircularProgress size={24} />
                    ) : (
                      <DeleteIcon />
                    )}
                  </IconButton>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Paper>
  );
}

export default ListFiles;
