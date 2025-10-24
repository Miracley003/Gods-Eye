// src/App.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import WalletConnect from './components/WalletConnect/WalletConnect';
import Dashboard from './components/Dashboard/Dashboard';
import MatrixBackground from './components/MatrixBackground';
import './styles/globals.css';

const GodsEyeLogo = () => (
  <motion.div
    className="relative w-24 h-24 mx-auto mb-8"
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ duration: 1, type: "spring" }}
  >
    {/* Outer Ring */}
    <motion.div
      className="absolute inset-0 border-4 border-emerald-400 rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
    />
    
    {/* Eye Container */}
    <div className="absolute inset-4 bg-black rounded-full overflow-hidden">
      {/* Matrix Grid Pattern */}
      <div className="absolute inset-0 opacity-30">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex justify-between h-3">
            {Array.from({ length: 8 }).map((_, j) => (
              <motion.div
                key={j}
                className="w-3 h-3 bg-emerald-400 rounded-sm"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{
                  duration: 2,
                  delay: (i * 8 + j) * 0.1,
                  repeat: Infinity,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      
      {/* Iris */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-12 h-12 bg-gradient-to-br from-emerald-400 to-purple-600 rounded-full transform -translate-x-1/2 -translate-y-1/2"
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
        }}
      />
      
      {/* Pupil */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-6 h-6 bg-black rounded-full transform -translate-x-1/2 -translate-y-1/2"
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      />
      
      {/* Glare */}
      <motion.div
        className="absolute top-3 left-3 w-4 h-4 bg-white rounded-full opacity-40"
        animate={{
          x: [0, 2, 0],
          y: [0, 2, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
        }}
      />
    </div>
  </motion.div>
);

function App() {
  const [wallet, setWallet] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <MatrixBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <motion.header
          className="text-center mb-12"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <GodsEyeLogo />
          <motion.h1
            className="text-6xl font-bold bg-gradient-to-r from-emerald-400 via-purple-500 to-cyan-400 bg-clip-text text-transparent mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            GODS EYE
          </motion.h1>
          <motion.p
            className="text-xl text-gray-300 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
          >
            Cross-Chain Wallet Forensics & Security
          </motion.p>
        </motion.header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto">
          {!wallet ? (
            <WalletConnect onConnect={setWallet} />
          ) : (
            <Dashboard 
              wallet={wallet} 
              analysis={analysis}
              onAnalysisComplete={setAnalysis}
            />
          )}
        </main>

        {/* Footer */}
        <motion.footer
          className="text-center mt-16 text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
        >
          <p>Built for Web3 Security • Always Require Your Signature</p>
          <p className="text-sm mt-2">
            Recipient: 0x259E...01a1 • Minimum Fee: $10 Equivalent
          </p>
        </motion.footer>
      </div>
    </div>
  );
}

export default App;
