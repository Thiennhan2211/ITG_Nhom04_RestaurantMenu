import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Store the login handoff before the home page loads authenticated menu data.
const handoff = new URLSearchParams(window.location.hash.slice(1));
const token = handoff.get('qrmenuToken');
if (token) {
  localStorage.setItem('token', token);
  localStorage.setItem('role', 'customer');
  localStorage.setItem('username', handoff.get('qrmenuUsername') || '');
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
