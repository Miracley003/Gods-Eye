import express from 'express';
import { ethers } from 'ethers';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// GRACEFUL HANDLING OF MISSING API KEY
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
if (!ALCHEMY_API_KEY) {
  console.error('❌ CRITICAL: ALCHEMY_API_KEY missing in backend/.env');
  console.error('💡 Get your key from: https://dashboard.alchemy.com');
  console.error('💡 Then add: ALCHEMY_API_KEY=your_key_here to backend/.env');
  // Don't exit - run in limited mode
}

// Initialize providers only if API key exists
const providers = {};
if (ALCHEMY_API_KEY) {
  providers[1] = new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`);
  providers[11155111] = new ethers.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`);
  providers[10143] = new ethers.JsonRpcProvider('https://testnet-rpc.monad.xyz');
  console.log('✅ Alchemy provider initialized');
} else {
  console.log('⚠️  Running in limited mode - no blockchain access');
}

const analysisResults = new Map();

// REAL ANALYSIS FUNCTIONS
async function fetchWalletTransactions(walletAddress, chainId = 11155111) {
  if (!providers[chainId]) {
    throw new Error('Blockchain provider not available - check ALCHEMY_API_KEY');
  }

  const provider = providers[chainId];
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 10000);

  console.log(`📊 Fetching real transactions for ${walletAddress} on chain ${chainId}`);

  const sentTxs = await provider.getLogs({ 
    fromBlock, 
    toBlock: currentBlock, 
    address: walletAddress 
  });
  
  const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const receivedTxs = await provider.getLogs({
    fromBlock, 
    toBlock: currentBlock,
    topics: [transferTopic, null, ethers.zeroPadValue(walletAddress, 32)]
  });

  return { 
    sentTransactions: sentTxs, 
    receivedTransfers: receivedTxs, 
    blockRange: { fromBlock, toBlock: currentBlock } 
  };
}

async function analyzeTransactions(walletAddress, transactionData) {
  const flags = [];
  let riskScore = 0;

  // Analyze recent transactions (limit to 20 for performance)
  for (const txLog of transactionData.sentTransactions.slice(0, 20)) {
    try {
      const provider = providers[11155111]; // Use Sepolia for analysis
      const tx = await provider.getTransaction(txLog.transactionHash);
      
      if (tx) {
        const valueEth = parseFloat(ethers.formatEther(tx.value || '0'));
        
        // Flag large transfers
        if (valueEth > 1.0) {
          flags.push({
            risk: 60, 
            type: 'LARGE_TRANSFER', 
            severity: 'medium',
            title: 'Large Value Transfer',
            description: `Transfer of ${valueEth.toFixed(4)} ETH detected`,
            evidence: { 
              txHash: tx.hash, 
              to: tx.to, 
              value: valueEth.toString(),
              timestamp: new Date().toISOString()
            }
          });
          riskScore += 60;
        }

        // Flag contract interactions
        if (tx.data && tx.data !== '0x') {
          flags.push({
            risk: 40, 
            type: 'CONTRACT_INTERACTION', 
            severity: 'medium', 
            title: 'Contract Interaction',
            description: `Interacted with contract: ${tx.to ? `${tx.to.slice(0,8)}...${tx.to.slice(-6)}` : 'Unknown'}`,
            evidence: { 
              txHash: tx.hash, 
              to: tx.to, 
              method: tx.data.substring(0, 10),
              timestamp: new Date().toISOString()
            }
          });
          riskScore += 40;
        }
      }
    } catch (error) {
      console.error('Error analyzing transaction:', error);
    }
  }

  riskScore = Math.min(100, riskScore);
  return { 
    riskScore, 
    flags, 
    transactionCount: transactionData.sentTransactions.length,
    analyzedTransactions: Math.min(transactionData.sentTransactions.length, 20)
  };
}

// API ENDPOINTS
app.get('/health', (req, res) => {
  res.json({ 
    status: ALCHEMY_API_KEY ? 'FULL' : 'LIMITED',
    timestamp: new Date().toISOString(),
    service: 'Gods Eye Backend',
    blockchain: ALCHEMY_API_KEY ? 'CONNECTED' : 'DISCONNECTED',
    message: ALCHEMY_API_KEY ? 'Ready for real analysis' : 'Add ALCHEMY_API_KEY for blockchain access'
  });
});

app.post('/api/analyze-wallet', async (req, res) => {
  try {
    const { walletAddress, chainId = 11155111, paymentTxHash } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }

    if (!ALCHEMY_API_KEY) {
      return res.status(503).json({ 
        error: 'Blockchain service unavailable. Add ALCHEMY_API_KEY to backend/.env' 
      });
    }

    const requestId = ethers.hexlify(ethers.randomBytes(32));
    
    // Respond immediately
    res.json({ 
      requestId, 
      status: 'analyzing', 
      message: 'Real blockchain analysis started' 
    });

    // Perform analysis in background
    setTimeout(async () => {
      try {
        console.log(`🔍 Starting REAL analysis for ${walletAddress}`);
        const transactionData = await fetchWalletTransactions(walletAddress, chainId);
        const analysis = await analyzeTransactions(walletAddress, transactionData);
        
        const result = {
          requestId, 
          wallet: walletAddress, 
          chainId, 
          paymentTxHash,
          timestamp: new Date().toISOString(), 
          ...analysis,
          transactionData: { 
            sentCount: transactionData.sentTransactions.length,
            receivedCount: transactionData.receivedTransfers.length,
            blockRange: transactionData.blockRange
          }
        };

        analysisResults.set(requestId, result);
        console.log(`✅ REAL analysis completed for ${walletAddress}. Risk score: ${analysis.riskScore}`);
        
      } catch (error) {
        console.error('Real analysis failed:', error);
        analysisResults.set(requestId, { 
          requestId, 
          wallet: walletAddress, 
          error: error.message, 
          riskScore: 0, 
          flags: [] 
        });
      }
    }, 100);

  } catch (error) {
    console.error('Analysis endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analysis/:requestId', (req, res) => {
  const analysis = analysisResults.get(req.params.requestId);
  if (!analysis) {
    return res.status(404).json({ error: 'Analysis not found or still in progress' });
  }
  res.json(analysis);
});

app.post('/api/payment-confirmed', async (req, res) => {
  try {
    const { requestId, walletAddress, txHash, chainId } = req.body;
    
    if (!ALCHEMY_API_KEY) {
      return res.status(503).json({ 
        error: 'Blockchain service unavailable. Add ALCHEMY_API_KEY to backend/.env' 
      });
    }

    console.log(`💰 REAL payment confirmed: ${txHash} for ${walletAddress}`);

    // Verify transaction on blockchain
    const provider = providers[chainId] || providers[11155111];
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt || receipt.status !== 1) {
      return res.status(400).json({ error: 'Transaction failed or not found on blockchain' });
    }

    // Start analysis
    const analyzeResponse = await axios.post(`http://localhost:${PORT}/api/analyze-wallet`, {
      walletAddress, 
      chainId, 
      paymentTxHash: txHash
    });

    res.json({ 
      success: true, 
      requestId: analyzeResponse.data.requestId, 
      message: 'Payment confirmed and REAL analysis started' 
    });
    
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server (WON'T CRASH WITHOUT API KEY)
app.listen(PORT, () => {
  console.log(`🚀 GODS EYE BACKEND RUNNING ON PORT ${PORT}`);
  console.log(`🔗 Alchemy API: ${ALCHEMY_API_KEY ? '✅ CONFIGURED' : '❌ MISSING'}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  if (!ALCHEMY_API_KEY) {
    console.log(`💡 Get API key from: https://dashboard.alchemy.com`);
    console.log(`💡 Then add ALCHEMY_API_KEY=your_key to backend/.env`);
  }
});