import React, { useState } from 'react';
import axios from 'axios';
import { Button, TextField, Typography, Box, CircularProgress, Paper, IconButton, Tooltip, Collapse } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Upload = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [textRows, setTextRows] = useState(5);
  const [showMessage, setShowMessage] = useState(true);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFiles([selectedFile]);
    setExpanded(true);
    setShowMessage(true);

    const fileType = selectedFile.type;

    if (fileType === 'text/plain') {
      processTextFile(selectedFile);
    } else {
      setUploadMessage('Only text files are allowed.');
      setFiles([]);
      setExpanded(false);
    }
  };

  const processTextFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setFileContent(content);
      setEditedContent(content);
      const contentLines = Math.ceil(content.split('\n').length * 0.75);
      setTextRows(contentLines > 5 ? contentLines : 5);
    };
    reader.readAsText(file);
  };

  const handleToggleExpand = () => {
    setExpanded(!expanded);
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleView = () => {
    setEditMode(false);
  };

  const handleSaveAndUpload = async () => {
    if (files.length === 0) {
      console.error('No files selected.');
      return;
    }

    const getAuthHeaders = () => {
      const token = localStorage.getItem('token');
      return token ? { Authorization: `Bearer ${token}` } : {};
    };

    setUploading(true);

    const contentToUpload = editedContent || fileContent;

    const formData = new FormData();
    const blob = new Blob([contentToUpload], { type: 'text/plain' });
    formData.append('file', new File([blob], files[0].name));
    const password = localStorage.getItem("password");
    const category = localStorage.getItem("category")
    try {
      const response = await axios.post(`${BACKEND_URL}/upsert`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...getAuthHeaders()
        },
        params: {
          category,
          password // Include the password as a query parameter
        }
      });
      setUploadMessage(`${files[0].name} uploaded successfully. Please click "Load Files" to refresh the list of files.`);
      setExpanded(false);
    } catch (error) {
      if (error.response && error.response.status === 409) {
        setUploadMessage(`Failed to upload ${files[0].name}. ${error.response.data}`);
      } else {
        setUploadMessage(`Failed to upload ${files[0].name}. Please try again later.`);
      }
    } finally {
      setUploading(false);
      setShowMessage(true);
    }
  };

  const getMessageColor = () => {
    return uploadMessage.includes('successfully') ? 'green' : 'red';
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Upload Files
        </Typography>
        <Tooltip title={editMode ? 'View Mode' : 'Edit Mode'}>
          <IconButton
            size="large"
            onClick={editMode ? handleView : handleEdit}
            aria-expanded={expanded}
            sx={{ ml: 'auto' }}
          >
            {editMode ? <VisibilityIcon fontSize="large" /> : <EditIcon fontSize="large" />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Upload File">
          <label htmlFor="file-upload">
            <IconButton
              component="span"
              size="large"
              sx={{ ml: 'auto' }}
            >
              <CloudUploadIcon fontSize="large" />
            </IconButton>
          </label>
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
        <input
          id="file-upload"
          type="file"
          accept=".txt"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </Box>

      <Collapse in={expanded && files.length > 0} timeout="auto" unmountOnExit>
        <Box component="div" sx={{ mb: 2 }}>
          {files.length > 0 && (
            <Typography variant="body1" gutterBottom color="textSecondary">
              Selected File: {files[0].name}
            </Typography>
          )}

          {editMode ? (
            <TextField
              multiline
              rows={textRows}
              variant="outlined"
              fullWidth
              value={editedContent}
              onChange={(e) => {
                setEditedContent(e.target.value);
                const contentLines = Math.ceil(e.target.value.split('\n').length * 0.75);
                setTextRows(contentLines > 5 ? contentLines : 5);
              }}
              sx={{ overflowY: 'auto' }}
            />
          ) : (
            <Box sx={{ mb: 2 }}>
              <TextField
                multiline
                rows={textRows}
                variant="outlined"
                fullWidth
                value={fileContent}
                InputProps={{
                  readOnly: true,
                }}
                sx={{ overflowY: 'auto' }}
              />
            </Box>
          )}
        </Box>
      </Collapse>

      <Box sx={{ mt: 2 }}>
        <Button onClick={handleSaveAndUpload} variant="contained" color="primary" disabled={uploading}>
          {uploading ? <CircularProgress size={24} /> : 'Save and Upload'}
        </Button>
      </Box>

      {/* Always visible message */}
      {showMessage && (
        <Typography variant="body1" sx={{ mt: 2, color: getMessageColor() }}>
          {uploadMessage}
        </Typography>
      )}
    </Paper>
  );
};

export default Upload;
