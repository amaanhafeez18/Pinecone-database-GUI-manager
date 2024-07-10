// src/components/Login.js
import React, { useState } from 'react';
import { Box, Button, Container, TextField, Typography } from '@mui/material';





const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    const hardcodedUsername = process.env.REACT_APP_USERNAME;
    const hardcodedPassword = process.env.REACT_APP_PASSWORD;

    if (username === hardcodedUsername && password === hardcodedPassword) {
      onLogin();
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">
          Login
        </Typography>
        <TextField
          margin="normal"
          required
          fullWidth
          label="Username"
          autoComplete="username"
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <Typography color="error">{error}</Typography>}
        <Button
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          onClick={handleLogin}
        >
          Login
        </Button>
      </Box>
    </Container>
  );
};

export default Login;
