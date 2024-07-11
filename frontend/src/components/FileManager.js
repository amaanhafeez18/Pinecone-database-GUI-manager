import React, { useState } from 'react';
import { Container, Box } from '@mui/material';
import ListFiles from './ListFiles';
import FileContent from './FileContent';

function FileManager() {
  const [selectedFile, setSelectedFile] = useState('');

  const handleSelectFile = (filename) => {
    setSelectedFile(filename);
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <ListFiles onSelectFile={handleSelectFile} />
      </Box>
      <Box>
        <FileContent selectedFile={selectedFile} />
      </Box>
    </Container>
  );
}

export default FileManager;
