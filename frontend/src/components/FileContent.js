import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Paper, IconButton } from '@mui/material';
import axios from 'axios';
import Collapse from '@mui/material/Collapse';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;


function FileContent({ selectedFile, onFileUpdated }) {
  const [filename, setFilename] = useState(selectedFile || '');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [editable, setEditable] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (selectedFile) {
      setFilename(selectedFile);
      fetchContent(selectedFile);
    }
  }, [selectedFile]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchContent = async (file) => {
    setLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/file-content?filename=${encodeURIComponent(file)}`, {
        headers: getAuthHeaders()
      });
      setContent(response.data);
      setExpanded(true);
    } catch (error) {
      console.error('Error fetching file content:', error);
      setContent('Failed to fetch file content.');
    }
    setLoading(false);
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
      await axios.delete(`${BACKEND_URL}/delete-file`, {
        headers: getAuthHeaders(),
        params: { filename }
      });

      // Re-upload the edited content
      const formData = new FormData();
      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], filename, { type: 'text/plain' });
      formData.append('file', file);

      await axios.post(`${BACKEND_URL}/upsert`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...getAuthHeaders(),
        }
      });

      setEditable(false);
      onFileUpdated(); // Call parent callback to refresh the file list
    } catch (error) {
      console.error('Error saving and uploading file:', error);
    }
    setUploading(false);
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          View
        </Typography>
        <IconButton
          size="large"
          onClick={editable ? handleView : handleEdit}
          aria-expanded={expanded}
          sx={{ ml: 'auto' }}
        >
          {editable ? <VisibilityIcon fontSize="large" /> : <EditIcon fontSize="large" />}
        </IconButton>
        <IconButton
          size="large"
          onClick={handleToggleExpand}
          aria-expanded={expanded}
        >
          {expanded ? <ExpandLessIcon fontSize="large" /> : <ExpandMoreIcon fontSize="large" />}
        </IconButton>
      </Box>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <TextField
          label="Filename"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
          disabled
        />

        {editable ? (
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
  );
}

export default FileContent;
