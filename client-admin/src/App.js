import React from 'react';
import axios from 'axios';
import './App.css';
import MyProvider from './contexts/MyProvider';
import Main from './components/MainComponent';
import { BrowserRouter } from 'react-router-dom';

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('qrmenu:session-expired'));
    }
    return Promise.reject(error);
  }
);

function App() {
  return (
    <MyProvider>
      <BrowserRouter>
        <Main />
      </BrowserRouter>
    </MyProvider>
  );
}

export default App;
