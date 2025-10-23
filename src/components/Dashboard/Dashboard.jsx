// src/components/Dashboard/Dashboard.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, Download, RotateCcw } from 'lucide-react';
import PaymentFlow from '../Payment/RealPaymentFlow';
import AnalysisResults from '../Analysis/AnalysisResults';
import Remediation from '../Remediation/Remediation';

const Dashboard = ({ wallet, analysis, onAnalysisComplete }) => {
  const [currentStep, setCurrentStep] = useState('payment');
  const [localAnalysis, setLocalAnalysis] = useState(analysis);

  const steps = [
    { id: 'payment', name: 'Payment', status: currentStep === 'payment' ? 'current' : 'complete' },
    { id: 'analysis', name: 'Analysis', status: currentStep === 'analysis' ? 'current' : 'upcoming' },
    { id: 'results', name: 'Results', status: currentStep === 'results' ? 'current' : 'upcoming' },
    { id: 'remediation', name: 'Remediation', status: currentStep === 'remediation' ? 'current' : 'upcoming' },
  ];

  const handlePaymentComplete = () => {
    setCurrentStep('analysis');
    // Simulate analysis
    setTimeout(() => {
      const mockAnalysis = generateMockAnalysis(wallet);
      setLocalAnalysis(mockAnalysis);
      onAnalysisComplete(mockAnalysis);
      setCurrentStep('results');
    }, 3000);
  };

  return (
    <div className="space-y-8">
      {/* Progress Steps */}
      <nav className="flex justify-center">
        <ol className="flex items-center space-x-8">
          {steps.map((step, index) => (
            <li key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <motion.div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                    step.status === 'complete'
                      ? 'bg-emerald-500 border-emerald-500'
                      : step.status === 'current'
                      ? 'border-emerald-500 bg-transparent'
                      : 'border-gray-600 bg-transparent'
                  }`}
                  whileHover={{ scale: 1.1 }}
                >
                  {step.status === 'complete' ? (
                    <CheckCircle className="w-6 h-6 text-white" />
                  ) : (
                    <span className={`text-sm font-semibold ${
                      step.status === 'current' ? 'text-emerald-500' : 'text-gray-500'
                    }`}>
                      {index + 1}
                    </span>
                  )}
                </motion.div>
                <span className={`mt-2 text-sm font-medium ${
                  step.status === 'current' ? 'text-emerald-400' : 'text-gray-400'
                }`}>
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="w-16 h-0.5 bg-gray-600 ml-8"></div>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {currentStep === 'payment' && (
          <motion.div
            key="payment"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <PaymentFlow wallet={wallet} onPaymentComplete={handlePaymentComplete} />
          </motion.div>
        )}

        {currentStep === 'analysis' && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="text-center py-16"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-8"
            />
            <h3 className="text-2xl font-bold text-white mb-4">Analyzing Wallet Activity</h3>
            <p className="text-gray-400">Scanning transactions across all EVM chains...</p>
          </motion.div>
        )}

        {currentStep === 'results' && localAnalysis && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AnalysisResults 
              analysis={localAnalysis} 
              onContinue={() => setCurrentStep('remediation')}
            />
          </motion.div>
        )}

        {currentStep === 'remediation' && localAnalysis && (
          <motion.div
            key="remediation"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Remediation analysis={localAnalysis} wallet={wallet} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Mock analysis data generator
const generateMockAnalysis = (wallet) => ({
  wallet: wallet.address,
  chainId: wallet.chainId,
  timestamp: new Date().toISOString(),
  riskScore: 72,
  flags: [
    {
      type: 'HIGH_RISK_APPROVAL',
      severity: 'high',
      title: 'Unlimited Token Approval',
      description: 'Found unlimited approval to potentially risky contract',
      evidence: {
        txHash: '0xabc123...def456',
        timestamp: '2024-01-15T14:03:10Z',
        token: 'USDC',
        spender: '0x742d35Cc6634C0532925a3b8D...',
        amount: 'Unlimited'
      }
    },
    {
      type: 'SUSPICIOUS_TRANSFER',
      severity: 'medium',
      title: 'Transfer to New Address',
      description: 'Large transfer to previously unseen address',
      evidence: {
        txHash: '0xdef456...ghi789',
        timestamp: '2024-01-15T14:05:22Z',
        amount: '1.5 ETH',
        to: '0x893F...a1b2c3'
      }
    }
  ],
  transactions: [
    {
      hash: '0xabc123...def456',
      timestamp: '2024-01-15T14:03:10Z',
      method: 'approve',
      from: wallet.address,
      to: '0x742d35Cc6634C0532925a3b8D...',
      value: '0 ETH',
      token: 'USDC',
      status: 'success'
    },
    {
      hash: '0xdef456...ghi789',
      timestamp: '2024-01-15T14:05:22Z',
      method: 'transfer',
      from: wallet.address,
      to: '0x893F...a1b2c3',
      value: '1.5 ETH',
      token: 'ETH',
      status: 'success'
    }
  ],
  approvals: [
    {
      token: 'USDC',
      spender: '0x742d35Cc6634C0532925a3b8D...',
      allowance: 'Unlimited',
      lastUpdated: '2024-01-15T14:03:10Z'
    }
  ]
});

export default Dashboard;