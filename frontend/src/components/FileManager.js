import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Typography, CircularProgress, Paper, IconButton, Grid, Collapse, Card, CardContent, Tooltip, ListItemIcon, Alert, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import axios from 'axios';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { red } from '@mui/material/colors';
import DescriptionIcon from '@mui/icons-material/Description';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

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
  const [deleteNotification, setDeleteNotification] = useState('');
  const [cantEditNotification, setCantEditNotification] = useState(''); // State for "can't edit" notification
  const [category, setCategory] = useState('ALL DEPT'); // Default value
  const [password, setPassword] = useState(''); // State for password input
  const [deptOptions, setDeptOptions] = useState([]); // State for dropdown options
  const [loadingDepts, setLoadingDepts] = useState(false); // State for loading dropdown options
  const [error, setError] = useState(''); // State for error messages

  useEffect(() => {
    fetchDeptOptions();
  }, []);

  useEffect(() => {
    if (selectedFile) {
      fetchContent(selectedFile);
    }
  }, [selectedFile]);

  useEffect(() => {
    setFiles([]);
    setSelectedFile('');
    setContent('');
    localStorage.setItem('category', category);
  }, [category]);

  useEffect(() => {
    localStorage.setItem('password', password);
  }, [password]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchDeptOptions = async () => {
    setLoadingDepts(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/array-values`, { headers: getAuthHeaders() });
      setDeptOptions(response.data);
    } catch (error) {
      console.error('Error fetching department options:', error);
    }
    setLoadingDepts(false);
  };

  const fetchFiles = async () => {
    setLoadingFiles(true);
    setError(''); // Reset error message
    try {
      const response = await axios.get(`${BACKEND_URL}/listfile`, {
        headers: getAuthHeaders(), // Include authentication headers
        params: {
          category,
          password // Include the password as a query parameter
        }
      });
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching file list:', error);
      if (error.response && error.response.data && error.response.data.error) {
        // Display the error message from the backend
        setError(error.response.data.error);
      } else {
        // Display a generic error message
        setError('Failed to fetch file list.');
      }
    }
    setLoadingFiles(false);
  };

  const fetchContent = async (file) => {
    setLoadingContent(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/file-content?filename=${encodeURIComponent(file)}`, { headers: getAuthHeaders() });
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
    if (category !== 'ALL DEPT') {
      setEditable(true);
    } else {
      setCantEditNotification('Editing is not allowed for files in the "ALL DEPT" category.');
      setTimeout(() => setCantEditNotification(''), 5000); // Clear notification after 5 seconds
    }
  };

  const handleView = () => {
    setEditable(false);
  };

  const retryRequest = async (fn, retries = 3, delay = 1000) => {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(fn, retries - 1, delay);
    }
  };

  const handleSaveAndUpload = async () => {
    setUploading(true);
    try {
      // Delete the file
      await axios.delete(`${BACKEND_URL}/delete-file`, {
        headers: getAuthHeaders(),
        params: { filename: selectedFile }
      });

      // Re-upload the edited content
      const formData = new FormData();
      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], selectedFile, { type: 'text/plain' });
      formData.append('file', file);

      await retryRequest(() => axios.post(`${BACKEND_URL}/upsert`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...getAuthHeaders(),
        },
        params: {
          category,
          password // Include the password as a query parameter
        }
      }));

      // Show confirmation message
      setContent('');
      setEditable(false);
      fetchFiles(); // Refresh the file list
      setDeleteNotification(`File ${selectedFile} uploaded successfully`);
      alert('File has been successfully saved and uploaded.');
    } catch (error) {
      console.error('Error saving and uploading file:', error);
      alert('Failed to save and upload file.');
    }
    setUploading(false);
  };

  const deleteFile = async (filename) => {
    if (window.confirm(`Are you sure you want to delete ${filename}?`)) {
      setDeleting(true);
      setDeleteId(filename);
      try {
        const response = await axios.delete(`${BACKEND_URL}/delete-file`, {
          headers: getAuthHeaders(),
          params: { filename }
        });
        if (response.status === 200) {
          setFiles(files.filter(file => file.filename !== filename));
          if (filename === selectedFile) {
            setSelectedFile('');
            setContent('');
          }
          setDeleteNotification(`File '${filename}' has been deleted.`);
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
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="category-label">Category</InputLabel>
          <Select
            labelId="category-label"
            id="category"
            value={category}
            label="Category"
            onChange={(e) => setCategory(e.target.value)}
            disabled={loadingDepts}
          >
            <MenuItem value="ALL DEPT">ALL DEPT</MenuItem>
            {deptOptions.map((dept) => (
              <MenuItem key={dept} value={dept}>
                {dept}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          onClick={fetchFiles}
          sx={{ mb: 2 }}
          disabled={!password} // Disable the button if password is empty
        >
          Login and Load Files
        </Button>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
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
        <Paper elevation={3} sx={{ p: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6">{selectedFile}</Typography>
            <Button onClick={handleToggleExpand} variant="contained" sx={{ mb: 1 }}>
              {expanded ? 'Collapse' : 'Expand'}
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </Button>
            {expanded && (
              <Collapse in={expanded}>
                {loadingContent ? (
                  <CircularProgress />
                ) : (
                  <Box>
                    <TextField
                      fullWidth
                      multiline
                      rows={10}
                      variant="outlined"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      disabled={!editable || category === 'ALL DEPT'}
                    />
                    {editable ? (
                      <Button
                        variant="contained"
                        onClick={handleSaveAndUpload}
                        sx={{ mt: 2 }}
                        disabled={uploading}
                      >
                        {uploading ? <CircularProgress size={24} /> : 'Save and Upload'}
                      </Button>
                    ) : (
                      <>
                        <Tooltip title="Edit">
                          <IconButton onClick={handleEdit} color="primary">
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View">
                          <IconButton onClick={handleView} color="primary">
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    <Tooltip title="Delete">
                      <IconButton
                        onClick={() => deleteFile(selectedFile)}
                        color="error"
                        disabled={deleting}
                      >
                        {deleting ? <CircularProgress size={24} /> : <DeleteIcon />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </Collapse>
            )}
          </Box>
          {deleteNotification && (
            <Alert severity="success">
              {deleteNotification}
            </Alert>
          )}
          {cantEditNotification && (
            <Alert severity="warning">
              {cantEditNotification}
            </Alert>
          )}
        </Paper>
      )}
    </Box>
  );
}

export default FileManager;
