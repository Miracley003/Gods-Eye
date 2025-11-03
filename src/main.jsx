import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/globals.css'

console.log('🚀 Gods Eye DApp starting...')

// Add comprehensive error handling
try {
  const rootElement = document.getElementById('root')
  console.log('Root element:', rootElement)
  
  if (!rootElement) {
    throw new Error('Could not find element with id "root"')
  }
  
  const root = ReactDOM.createRoot(rootElement)
  console.log('React root created')
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
  
  console.log('✅ React app mounted successfully!')
} catch (error) {
  console.error('❌ Failed to mount React app:', error)
}
