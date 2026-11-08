import React from 'react';
import axios from 'axios';
import CustomerHomeComponent from './components/CustomerHomeComponent';

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['x-access-token'] = token;
  }
  return config;
});

function App() {
  return <CustomerHomeComponent />;
}

export default App;
