import React from 'react';
import '../css/ToastNotificationComponent.css';

function ToastNotificationComponent({ message, type = 'success', onDismiss }) {
  if (!message) return null;
  const icon = type === 'error' ? '!' : type === 'warning' ? 'i' : '✓';
  return (
    <div className={`app-toast app-toast-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <span className="app-toast-icon" aria-hidden="true">{icon}</span>
      <span className="app-toast-message">{message}</span>
      {onDismiss && <button type="button" className="app-toast-close" onClick={onDismiss} aria-label="Đóng thông báo">×</button>}
    </div>
  );
}

export default ToastNotificationComponent;
