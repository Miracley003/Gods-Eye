import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ExternalLink, Check, AlertTriangle, Loader } from 'lucide-react';
import { 
  getPaymentContract, 
  switchToMonadNetwork, 
  switchToSepoliaNetwork,
  isNetworkSupported,
  getCurrentNetworkInfo,
  BENEFICIARY_ADDRESS,
  getMinimumFee
} from '../../../utils/contracts';
import { ethers } from 'ethers';

const RealPaymentFlow = ({ wallet, onPaymentComplete }) => {
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [currentFee, setCurrentFee] = useState('0.001');
  const [analysisRequestId, setAnalysisRequestId] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState('');

  // Fetch real minimum fee from contract
  useEffect(() => {
    const fetchRealFee = async () => {
      if (wallet?.signer) {
        try {
          const fee = await getMinimumFee(wallet.signer);
          setCurrentFee(fee);
        } catch (error) {
          console.error('Failed to fetch minimum fee, using default:', error);
          // Keep default fee
        }
      }
    };

    fetchRealFee();
  }, [wallet]);

  const generateRequestId = () => {
    return ethers.hexlify(ethers.randomBytes(32));
  };

  const notifyBackend = async (requestId, walletAddress, txHash, chainId) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      
      console.log('📡 Notifying backend of payment...', {
        requestId,
        walletAddress,
        txHash,
        chainId
      });

      const response = await fetch(`${backendUrl}/api/payment-confirmed`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          requestId, 
          walletAddress, 
          txHash,
          chainId,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Backend error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Backend processing failed');
      }

      console.log('✅ Backend payment confirmation successful:', result);
      return result.requestId; // Return the analysis request ID
        
    } catch (err) {
      console.error('❌ Backend notification failed:', err);
      throw new Error(`Failed to start analysis: ${err.message}`);
    }
  };

  const checkAnalysisStatus = async (requestId) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/analysis/${requestId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return { status: 'analyzing' }; // Still processing
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const analysis = await response.json();
      return { status: 'completed', analysis };
    } catch (error) {
      console.error('Error checking analysis status:', error);
      return { status: 'analyzing' }; // Assume still processing on error
    }
  };

  const handleRealPayment = async () => {
    if (!wallet?.signer) {
      setError('Wallet not connected properly');
      return;
    }

    setPaymentStatus('processing');
    setError('');
    setAnalysisStatus('');

    try {
      // Check if current network is supported
      const currentChainId = await wallet.signer.getChainId();
      if (!isNetworkSupported(currentChainId)) {
        setError(`Network not supported. Please switch to Sepolia or Monad testnet.`);
        setPaymentStatus('failed');
        return;
      }

      // Get contract instance
      const contract = await getPaymentContract(wallet.signer);
      
      // Get minimum fee from contract
      const minFeeWei = await contract.minFeeWei();
      const minFeeEth = ethers.formatEther(minFeeWei);
      setCurrentFee(minFeeEth);
      
      // Generate unique request ID
      const requestId = generateRequestId();
      
      console.log(`💰 Paying ${minFeeEth} ETH for analysis request: ${requestId}`);
      
      // Execute REAL payment transaction
      const tx = await contract.payForAnalysis(requestId, { 
        value: minFeeWei,
        gasLimit: 100000 // Explicit gas limit for better UX
      });
      
      setTxHash(tx.hash);
      setPaymentStatus('confirming');
      
      console.log('⏳ Waiting for transaction confirmation...', tx.hash);
      
      // Wait for REAL transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log('✅ Transaction confirmed, notifying backend...');
        setPaymentStatus('completed');
        
        // Notify backend about successful payment
        try {
          setAnalysisStatus('starting');
          const analysisRequestId = await notifyBackend(requestId, wallet.address, tx.hash, currentChainId);
          setAnalysisRequestId(analysisRequestId);
          
          // Start polling for analysis completion
          setAnalysisStatus('analyzing');
          await waitForAnalysisCompletion(analysisRequestId);
          
        } catch (backendError) {
          console.error('Backend process failed:', backendError);
          setError(`Payment successful but analysis failed to start: ${backendError.message}`);
          setAnalysisStatus('failed');
          // Still complete payment flow since payment was successful
          setTimeout(() => {
            onPaymentComplete(requestId);
          }, 3000);
        }
        
      } else {
        throw new Error('Transaction failed on-chain');
      }
      
    } catch (err) {
      console.error('❌ Payment error:', err);
      
      // Handle specific error cases
      if (err.code === 'INSUFFICIENT_FUNDS') {
        setError('Insufficient funds for transaction. Please add ETH to your wallet.');
      } else if (err.code === 'USER_REJECTED') {
        setError('Transaction was rejected by user.');
      } else if (err.message?.includes('network')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err.message || 'Transaction failed. Please try again.');
      }
      
      setPaymentStatus('failed');
    }
  };

  const waitForAnalysisCompletion = async (requestId) => {
    const maxAttempts = 30; // 5 minutes max (10-second intervals)
    let attempts = 0;

    const poll = async () => {
      attempts++;
      console.log(`🔄 Checking analysis status (attempt ${attempts})...`);

      const result = await checkAnalysisStatus(requestId);
      
      if (result.status === 'completed') {
        console.log('✅ Analysis completed successfully!');
        setAnalysisStatus('completed');
        
        // Short delay before moving to next step
        setTimeout(() => {
          onPaymentComplete(requestId);
        }, 2000);
        
        return;
      }

      if (attempts >= maxAttempts) {
        console.warn('⚠️ Analysis timeout - proceeding anyway');
        setAnalysisStatus('timeout');
        setTimeout(() => {
          onPaymentComplete(requestId);
        }, 2000);
        return;
      }

      // Continue polling
      setTimeout(poll, 10000); // Check every 10 seconds
    };

    await poll();
  };

  const handleSwitchToSepolia = async () => {
    try {
      setPaymentStatus('switching');
      await switchToSepoliaNetwork();
      setPaymentStatus('pending');
      setError('');
      
      // Refresh fee for new network
      if (wallet?.signer) {
        const fee = await getMinimumFee(wallet.signer);
        setCurrentFee(fee);
      }
    } catch (err) {
      setError(`Failed to switch network: ${err.message}`);
      setPaymentStatus('failed');
    }
  };

  const handleSwitchToMonad = async () => {
    try {
      setPaymentStatus('switching');
      await switchToMonadNetwork();
      setPaymentStatus('pending');
      setError('');
      
      // Refresh fee for new network
      if (wallet?.signer) {
        const fee = await getMinimumFee(wallet.signer);
        setCurrentFee(fee);
      }
    } catch (err) {
      setError(`Failed to switch network: ${err.message}`);
      setPaymentStatus('failed');
    }
  };

  const getNetworkName = (chainId) => {
    const network = getCurrentNetworkInfo(chainId);
    return network.name;
  };

  const getExplorerUrl = () => {
    if (!txHash || !wallet) return '#';
    
    const network = getCurrentNetworkInfo(wallet.chainId);
    return `${network.explorer}/tx/${txHash}`;
  };

  const getAnalysisStatusMessage = () => {
    switch (analysisStatus) {
      case 'starting': return 'Starting blockchain analysis...';
      case 'analyzing': return 'Analyzing wallet transactions on blockchain...';
      case 'completed': return 'Analysis complete!';
      case 'failed': return 'Analysis failed';
      case 'timeout': return 'Analysis taking longer than expected...';
      default: return '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gray-900/50 backdrop-blur-sm border border-emerald-500/20 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-white mb-6">Real Payment Required</h2>
        
        {/* Network Info */}
        {wallet && (
          <div className={`flex items-center justify-between p-4 rounded-lg mb-4 ${
            isNetworkSupported(wallet.chainId) 
              ? 'bg-blue-500/10 border border-blue-500/20' 
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            <div className="flex items-center space-x-2">
              {isNetworkSupported(wallet.chainId) ? (
                <Check className="w-5 h-5 text-blue-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              )}
              <span className={isNetworkSupported(wallet.chainId) ? 'text-blue-400' : 'text-red-400'}>
                Network: {getNetworkName(wallet.chainId)}
              </span>
            </div>
            {!isNetworkSupported(wallet.chainId) && (
              <div className="flex space-x-2">
                <button
                  onClick={handleSwitchToSepolia}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                >
                  Switch to Sepolia
                </button>
                <button
                  onClick={handleSwitchToMonad}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                >
                  Switch to Monad
                </button>
              </div>
            )}
          </div>
        )}

        {/* Analysis Status */}
        {analysisStatus && (
          <div className="flex items-center space-x-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
            <Loader className="w-5 h-5 text-blue-400 animate-spin" />
            <div>
              <p className="text-blue-400 font-semibold">Analysis Status</p>
              <p className="text-blue-300/80 text-sm">{getAnalysisStatusMessage()}</p>
              {analysisRequestId && (
                <p className="text-blue-300/60 text-xs font-mono mt-1">
                  ID: {analysisRequestId.slice(0, 16)}...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Payment Details */}
        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center p-4 bg-black/30 rounded-lg">
            <span className="text-gray-400">Minimum Fee</span>
            <span className="text-white font-semibold">{currentFee} ETH</span>
          </div>
          
          <div className="flex justify-between items-center p-4 bg-black/30 rounded-lg">
            <span className="text-gray-400">Recipient Address</span>
            <span className="text-emerald-400 font-mono text-sm">
              {BENEFICIARY_ADDRESS.slice(0, 6)}...{BENEFICIARY_ADDRESS.slice(-4)}
            </span>
          </div>

          <div className="flex justify-between items-center p-4 bg-black/30 rounded-lg">
            <span className="text-gray-400">Your Wallet</span>
            <span className="text-cyan-400 font-mono text-sm">
              {wallet?.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : 'Not connected'}
            </span>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start space-x-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-6">
          <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-yellow-400 font-semibold mb-1">Real Blockchain Transaction</p>
            <p className="text-yellow-300/80">
              • This is a REAL payment on the blockchain<br/>
              • Funds will be sent to the beneficiary address<br/>
              • Transaction cannot be reversed<br/>
              • Real blockchain analysis will begin after payment
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-start space-x-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-6">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-red-400 font-semibold mb-1">Error</p>
              <p className="text-red-300/80">{error}</p>
            </div>
          </div>
        )}

        {/* Payment Button */}
        <motion.button
          onClick={handleRealPayment}
          disabled={!wallet || !isNetworkSupported(wallet.chainId) || 
                   (paymentStatus !== 'pending' && paymentStatus !== 'failed') ||
                   analysisStatus}
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all ${
            (paymentStatus === 'pending' || paymentStatus === 'failed') && 
            wallet && 
            isNetworkSupported(wallet.chainId) &&
            !analysisStatus
              ? 'bg-gradient-to-r from-emerald-500 to-purple-600 hover:from-emerald-600 hover:to-purple-700 text-white'
              : paymentStatus === 'processing' || paymentStatus === 'confirming' || paymentStatus === 'switching'
              ? 'bg-blue-600 text-white'
              : 'bg-emerald-600 text-white'
          } ${(!wallet || !isNetworkSupported(wallet.chainId) || analysisStatus) ? 'opacity-50 cursor-not-allowed' : ''}`}
          whileHover={
            (paymentStatus === 'pending' || paymentStatus === 'failed') && 
            wallet && 
            isNetworkSupported(wallet.chainId) &&
            !analysisStatus ? { scale: 1.02 } : {}
          }
        >
          {analysisStatus ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader className="w-5 h-5 animate-spin" />
              <span>{getAnalysisStatusMessage()}</span>
            </div>
          ) : paymentStatus === 'pending' ? (
            `Pay ${currentFee} ETH & Start Real Analysis`
          ) : paymentStatus === 'processing' ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader className="w-5 h-5 animate-spin" />
              <span>Processing Payment...</span>
            </div>
          ) : paymentStatus === 'confirming' ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader className="w-5 h-5 animate-spin" />
              <span>Confirming Transaction...</span>
            </div>
          ) : paymentStatus === 'switching' ? (
            'Switching Network...'
          ) : paymentStatus === 'completed' ? (
            <div className="flex items-center justify-center space-x-2">
              <Check className="w-5 h-5" />
              <span>Payment Confirmed!</span>
            </div>
          ) : paymentStatus === 'failed' ? (
            'Retry Payment'
          ) : !wallet ? (
            'Connect Wallet First'
          ) : !isNetworkSupported(wallet.chainId) ? (
            'Unsupported Network'
          ) : (
            'Pay & Start Analysis'
          )}
        </motion.button>

        {/* Transaction Link */}
        {txHash && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-center"
          >
            <a
              href={getExplorerUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-emerald-400 hover:text-emerald-300 text-sm"
            >
              <span>View Real Transaction on Explorer</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </motion.div>
        )}

        {/* Network Help */}
        {(!wallet || !isNetworkSupported(wallet.chainId)) && (
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm mb-3">Need test ETH?</p>
            <div className="flex justify-center space-x-4">
              <a
                href="https://sepoliafaucet.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm underline"
              >
                Get Sepolia ETH
              </a>
              <a
                href="https://faucet.monad.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 text-sm underline"
              >
                Get Monad MON
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealPaymentFlow;