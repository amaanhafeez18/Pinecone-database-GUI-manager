import React, { useState } from 'react';
import { Container, Box } from '@mui/material';
import ListFiles from './ListFiles';
import FileContent from './FileContent';

function FileManager() {
  const [selectedFile, setSelectedFile] = useState('');

  const handleSelectFile = (filename) => {
    setSelectedFile(filename);
  };

  const handleFileUpdated = () => {
    // Function to handle updates after a file is edited and re-uploaded
    setSelectedFile('');
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <ListFiles onSelectFile={handleSelectFile} />
      </Box>
      <Box>
        <FileContent selectedFile={selectedFile} onFileUpdated={handleFileUpdated} />
      </Box>
    </Container>
  );
}

export default FileManager;
