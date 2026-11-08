import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// A customer app running on another port has its own localStorage. Clear the
// admin app's copy of the session before the login screen reads it.
const query = new URLSearchParams(window.location.search);
if (query.get('loggedOut') === '1') {
  ['token', 'role', 'username'].forEach((key) => localStorage.removeItem(key));
  query.delete('loggedOut');
  const cleanSearch = query.toString();
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${cleanSearch ? `?${cleanSearch}` : ''}${window.location.hash}`
  );
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
