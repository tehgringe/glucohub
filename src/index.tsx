import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { NightscoutProvider } from './contexts/NightscoutContext';
import { SpeedInsights } from "@vercel/speed-insights/react"

// All debug logging suppressed as per request

const rootElement = document.getElementById('root');
// console.log('Root element:', rootElement);

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

const root = ReactDOM.createRoot(rootElement);
// console.log('Created root:', root);

root.render(
  <React.StrictMode>
    <NightscoutProvider>
      <App />
    </NightscoutProvider>
  </React.StrictMode>
);

// console.log('Application rendered');

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(); 