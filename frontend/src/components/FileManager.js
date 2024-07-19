import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Typography, CircularProgress, Paper, IconButton, Grid, Collapse, Card, CardContent, Tooltip, ListItemIcon
} from '@mui/material';
import axios from 'axios';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { red } from '@mui/material/colors';
import DescriptionIcon from '@mui/icons-material/Description';

function FileManager() {
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState('');
  const [content, setContent] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [editable, setEditable] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchFiles(); // Fetch files when component mounts
  }, []);

  useEffect(() => {
    if (selectedFile) {
      fetchContent(selectedFile);
    }
  }, [selectedFile]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchFiles = async () => {
    setLoadingFiles(true);
    try {
      const response = await axios.get('http://localhost:5000/listfile', { headers: getAuthHeaders() });
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching file list:', error);
    }
    setLoadingFiles(false);
  };

  const fetchContent = async (file) => {
    setLoadingContent(true);
    try {
      const response = await axios.get(`http://localhost:5000/file-content?filename=${encodeURIComponent(file)}`, { headers: getAuthHeaders() });
      setContent(response.data);
      setExpanded(true);
    } catch (error) {
      console.error('Error fetching file content:', error);
      setContent('Failed to fetch file content.');
    }
    setLoadingContent(false);
  };

  const handleToggleExpand = () => {
    setExpanded(!expanded);
    if (!expanded && selectedFile) {
      fetchContent(selectedFile);
    }
  };

  const handleEdit = () => {
    setEditable(true);
  };

  const handleView = () => {
    setEditable(false);
  };

  const handleSaveAndUpload = async () => {
    setUploading(true);
    try {
      // Delete the file
      await axios.delete(`http://localhost:5000/delete-file`, {
        headers: getAuthHeaders(),
        params: { filename: selectedFile }
      });
      // Re-upload the edited content
      const formData = new FormData();
      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], selectedFile, { type: 'text/plain' });
      formData.append('file', file);
      await axios.post('http://localhost:5000/upsert', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...getAuthHeaders(),
        }
      });
      setEditable(false);
      fetchFiles(); // Refresh the file list
    } catch (error) {
      console.error('Error saving and uploading file:', error);
    }
    setUploading(false);
  };

  const deleteFile = async (filename) => {
    if (window.confirm(`Are you sure you want to delete ${filename}?`)) {
      setDeleting(true);
      setDeleteId(filename);
      try {
        const response = await axios.delete(`http://localhost:5000/delete-file`, {
          headers: getAuthHeaders(),
          params: { filename }
        });
        if (response.status === 200) {
          setFiles(files.filter(file => file.filename !== filename));
          if (filename === selectedFile) {
            setSelectedFile('');
            setContent('');
          }
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
    <Box>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          Polichat Database
        </Typography>
        <Button variant="contained" onClick={fetchFiles} sx={{ mb: 2 }}>
          Load Files
        </Button>
        {loadingFiles ? (
          <CircularProgress />
        ) : (
          <Grid container spacing={2}>
            {files.map((file) => (
              <Grid item key={file.filename} xs={12} sm={6} md={4}>
                <Card
                  onClick={() => setSelectedFile(file.filename)}
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: selectedFile === file.filename ? 'rgba(0, 0, 0, 0.12)' : 'inherit',
                  }}
                >
                  <CardContent>
                    <Typography variant="body1">{file.filename}</Typography>
                    <ListItemIcon>
                      <DescriptionIcon />
                    </ListItemIcon>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
      {selectedFile && (
        <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" sx={{ flexGrow: 1 }}>
              {selectedFile}
            </Typography>
            <Tooltip title={editable ? 'View Mode' : 'Edit Mode'}>
              <IconButton
                size="large"
                onClick={editable ? handleView : handleEdit}
                aria-expanded={expanded}
                sx={{ ml: 'auto' }}
              >
                {editable ? <VisibilityIcon fontSize="large" /> : <EditIcon fontSize="large" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete File">
              <IconButton
                size="large"
                onClick={() => deleteFile(selectedFile)}
                sx={{ color: red[500] }}
              >
                <DeleteIcon fontSize="large" />
              </IconButton>
            </Tooltip>
            <Tooltip title={expanded ? 'Collapse' : 'Expand'}>
              <IconButton
                size="large"
                onClick={handleToggleExpand}
                aria-expanded={expanded}
              >
                {expanded ? <ExpandLessIcon fontSize="large" /> : <ExpandMoreIcon fontSize="large" />}
              </IconButton>
            </Tooltip>
          </Box>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            {loadingContent ? (
              <CircularProgress />
            ) : editable ? (
              <TextField
                multiline
                value={content}
                onChange={(e) => setContent(e.target.value)}
                fullWidth
                rows={10}
                variant="outlined"
              />
            ) : (
              <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                {content}
              </Typography>
            )}
            {uploading && (
              <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />
            )}
            {editable && (
              <Button
                onClick={handleSaveAndUpload}
                variant="contained"
                color="primary"
                sx={{ mt: 2 }}
              >
                Save and Upload
              </Button>
            )}
          </Collapse>
        </Paper>
      )}
    </Box>
  );
}

export default FileManager;
