import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, Typography, List, ListItem, ListItemText, Link } from '@mui/material';

const ListFiles = ({ trigger }) => {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await axios.get('http://localhost:5000/listfile');
        setFiles(response.data);
      } catch (error) {
        console.error('Error fetching file list:', error);
      }
    };

    fetchFiles();
  }, [trigger]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom color="primary">
        All Files
      </Typography>
      <List>
        {files.map((file, index) => (
          <ListItem key={index}>
            <ListItemText>
              <Link href={file.url} target="_blank" rel="noopener noreferrer">
                {file.filename}
              </Link>
            </ListItemText>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default ListFiles;
