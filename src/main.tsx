import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useApp } from './lib/store';
document.documentElement.dataset.theme = useApp.getState().theme;
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
