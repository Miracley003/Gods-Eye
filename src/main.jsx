import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/globals.css'

console.log('🚀 Gods Eye DApp starting...')

try {
  const root = ReactDOM.createRoot(document.getElementById('root'))
  root.render(<App />)
  console.log('✅ React app mounted successfully!')
} catch (error) {
  console.error('❌ Failed to mount React app:', error)
}
