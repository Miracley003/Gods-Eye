// src/App.jsx
import React, { useState } from 'react';

function App() {
  const [wallet, setWallet] = useState(null);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Simple matrix-like background */}
      <div className="absolute inset-0 opacity-20">
        <div className="cyber-grid absolute inset-0"></div>
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="relative w-24 h-24 mx-auto mb-8">
            {/* Simple eye logo */}
            <div className="absolute inset-0 border-4 border-emerald-400 rounded-full animate-pulse"></div>
            <div className="absolute inset-4 bg-black rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-emerald-400 rounded-full"></div>
            </div>
          </div>
          
          <h1 className="text-6xl font-bold matrix-text mb-4">
            GODS EYE
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Cross-Chain Wallet Forensics & Security
          </p>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto bg-gray-900 bg-opacity-50 rounded-lg p-8 backdrop-blur-sm border border-emerald-400">
          {!wallet ? (
            <div className="text-center">
              <h2 className="text-3xl font-bold text-emerald-400 mb-4">
                Connect Your Wallet
              </h2>
              <p className="text-gray-300 mb-6">
                To begin wallet analysis and security scanning
              </p>
              <button 
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 glow-border"
                onClick={() => setWallet('0x742...d35a')}
              >
                🔗 Connect Wallet
              </button>
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-3xl font-bold text-emerald-400 mb-4">
                Wallet Connected
              </h2>
              <p className="text-gray-300 mb-4">
                Address: {wallet}
              </p>
              <div className="bg-black bg-opacity-50 rounded p-4 mb-6">
                <p className="text-emerald-300">
                  ✅ Ready for cross-chain analysis
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Transaction history • Security scan • Forensic report
                </p>
              </div>
              <button 
                className="bg-red-500 hover:bg-red-400 text-white font-bold py-2 px-6 rounded transition-all"
                onClick={() => setWallet(null)}
              >
                Disconnect
              </button>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="text-center mt-16 text-gray-500">
          <p>Built for Web3 Security • Always Require Your Signature</p>
          <p className="text-sm mt-2">
            Recipient: 0x259E...01a1 • Minimum Fee: $10 Equivalent
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
