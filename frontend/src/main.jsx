import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Disable browser right-click context menu (prevents white popup on HMI touch screen / hard clicks)
document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
