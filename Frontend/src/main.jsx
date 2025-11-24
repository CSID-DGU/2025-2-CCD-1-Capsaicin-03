// src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './routes/Router'; 
import './index.css';
import ReactGA from "react-ga4";

ReactGA.initialize("G-L9G2TS3RHX");

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);