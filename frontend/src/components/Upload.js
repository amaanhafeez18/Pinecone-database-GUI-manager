import React, { useState } from 'react';
import axios from 'axios';
import { Button, TextField, Typography, Box, CircularProgress, Paper, IconButton, Tooltip } from '@mui/material';
import Collapse from '@mui/material/Collapse';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'; // Import file icon

const Upload = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [expanded, setExpanded] = useState(false); // Initially collapsed
  const [textRows, setTextRows] = useState(5); // Initial rows for the TextField

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    console.log('Selected File:', selectedFile);
    setFiles([selectedFile]);
    setExpanded(true); // Expand content when file is selected

    // Read the selected file's content
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setFileContent(content);
      setEditedContent(content); // Initialize editedContent with fileContent
      
      // Calculate number of lines based on 75% of file content length
      const contentLines = Math.ceil(content.split('\n').length * 0.75);
      setTextRows(contentLines > 5 ? contentLines : 5); // Ensure at least 5 rows
    };
    reader.readAsText(selectedFile);
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

    setUploading(true);

    // Determine content to upload
    const contentToUpload = editedContent || fileContent; // Use edited content if available, otherwise original

    const formData = new FormData();
    const blob = new Blob([contentToUpload], { type: 'text/plain' });
    formData.append('file', new File([blob], files[0].name));

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
      if (error.response && error.response.status === 409) {
        setUploadMessage(`Failed to upload files. ${error.response.data}`);
      } else {
        setUploadMessage('Failed to upload files. Please try again later.');
      }
    } finally {
      setUploading(false);
    }
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
        <Tooltip title={expanded ? 'Collapse' : 'Expand'}>
          <IconButton
            size="large"
            onClick={handleToggleExpand}
            aria-expanded={expanded}
          >
            {expanded ? <ExpandLessIcon fontSize="large" /> : <ExpandMoreIcon fontSize="large" />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Upload File">
          <label htmlFor="file-upload">
            <IconButton
              component="span"
              size="large"
              sx={{ ml: 2 }}
            >
              <InsertDriveFileIcon fontSize="large" />
            </IconButton>
          </label>
        </Tooltip>
        <input
          id="file-upload"
          type="file"
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
                // Calculate number of lines based on 75% of edited content length
                const contentLines = Math.ceil(e.target.value.split('\n').length * 0.75);
                setTextRows(contentLines > 5 ? contentLines : 5); // Ensure at least 5 rows
              }}
              sx={{ overflowY: 'auto' }} // Add scrollbar when content exceeds the height
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
                sx={{ overflowY: 'auto' }} // Add scrollbar when content exceeds the height
              />
            </Box>
          )}

          <Button onClick={handleSaveAndUpload} variant="contained" color="primary" disabled={uploading}>
            {uploading ? <CircularProgress size={24} /> : 'Save and Upload'}
          </Button>
          {uploadMessage && <Typography variant="body1" sx={{ mt: 2 }} color="secondary">{uploadMessage}</Typography>}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default Upload;
