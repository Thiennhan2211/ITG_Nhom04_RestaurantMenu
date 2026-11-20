import React from 'react';
import axios from 'axios';
import './App.css';
import MyProvider from './contexts/MyProvider';
import Main from './components/MainComponent';
import { BrowserRouter } from 'react-router-dom';

const isAdminApiRequest = (requestUrl) => {
  if (!requestUrl) return false;
  try {
    const parsedUrl = new URL(requestUrl, window.location.origin);
    return parsedUrl.origin === window.location.origin && parsedUrl.pathname.startsWith('/api/');
  } catch {
    return false;
  }
};

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && isAdminApiRequest(error.config?.url)) {
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
