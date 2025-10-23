import { ethers } from 'ethers';

// Gods Eye Payment Contract ABI
export const GODS_EYE_PAYMENT_ABI = [
  "function payForAnalysis(bytes32 requestId) external payable",
  "function minFeeWei() external view returns (uint256)",
  "function beneficiary() external view returns (address)",
  "function updateMinFee(uint256 _newMinFee) external",
  "event RequestCreated(bytes32 indexed requestId, address indexed payer, uint256 chainId, uint256 paidAmount)"
];

// Contract addresses for different networks
// TODO: Deploy your contract to these networks and update addresses
export const PAYMENT_CONTRACT_ADDRESSES = {
  1: '0x0000000000000000000000000000000000000000', // Ethereum Mainnet (placeholder)
  11155111: '0xA0058544d40CDf6DE767536054e10d2082b6ec42', // Sepolia Testnet (placeholder)
  10143: '0x9555ec75780819C94E84704Ed452d9031C8196F9', // Monad Testnet (placeholder)
};

// Network configurations
export const SUPPORTED_NETWORKS = {
  1: {
    name: 'Ethereum Mainnet',
    symbol: 'ETH',
    explorer: 'https://etherscan.io'
  },
  11155111: {
    name: 'Sepolia Testnet',
    symbol: 'ETH',
    explorer: 'https://sepolia.etherscan.io'
  },
  10143: {
    name: 'Monad Testnet',
    symbol: 'MON',
    explorer: 'https://testnet.monadexplorer.com',
    faucet: 'https://faucet.monad.xyz'
  }
};

export const BENEFICIARY_ADDRESS = '0x259EC4405206286CaeCA0D210c056CbC2C5f01a1';

// Helper function to get contract instance - FIXED: Added async
export const getPaymentContract = async (signer) => {
  const chainId = await signer.getChainId();
  const address = PAYMENT_CONTRACT_ADDRESSES[chainId];
  
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error(`No contract deployed on network ${chainId}. Please deploy contract first.`);
  }
  
  return new ethers.Contract(address, GODS_EYE_PAYMENT_ABI, signer);
};

// Helper function to switch to specific network
export const switchToNetwork = async (chainId) => {
  if (!window.ethereum) {
    throw new Error('No Ethereum wallet found');
  }

  const chainIdHex = `0x${chainId.toString(16)}`;
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
    return true;
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask.
    if (switchError.code === 4902) {
      return await addNetworkToWallet(chainId);
    }
    throw switchError;
  }
};

// Helper to add network to wallet if not present
const addNetworkToWallet = async (chainId) => {
  const networkConfig = SUPPORTED_NETWORKS[chainId];
  
  if (!networkConfig) {
    throw new Error(`Network ${chainId} not supported`);
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: `0x${chainId.toString(16)}`,
        chainName: networkConfig.name,
        rpcUrls: [getRpcUrl(chainId)],
        nativeCurrency: {
          name: networkConfig.symbol,
          symbol: networkConfig.symbol,
          decimals: 18,
        },
        blockExplorerUrls: [networkConfig.explorer],
      }],
    });
    return true;
  } catch (addError) {
    console.error(`Failed to add ${networkConfig.name} to wallet:`, addError);
    throw new Error(`Failed to add ${networkConfig.name} to your wallet`);
  }
};

// Get RPC URL for different networks
const getRpcUrl = (chainId) => {
  const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY;
  
  switch (chainId) {
    case 1: // Ethereum Mainnet
      return `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`;
    case 11155111: // Sepolia
      return `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`;
    case 10143: // Monad Testnet
      return 'https://testnet-rpc.monad.xyz';
    default:
      throw new Error(`No RPC URL configured for network ${chainId}`);
  }
};

// Helper function to switch to Monad Testnet specifically
export const switchToMonadNetwork = async () => {
  return await switchToNetwork(10143);
};

// Helper function to switch to Sepolia Testnet specifically
export const switchToSepoliaNetwork = async () => {
  return await switchToNetwork(11155111);
};

// Check if current network is supported
export const isNetworkSupported = (chainId) => {
  return !!PAYMENT_CONTRACT_ADDRESSES[chainId] && 
         PAYMENT_CONTRACT_ADDRESSES[chainId] !== '0x0000000000000000000000000000000000000000';
};

// Get current network info
export const getCurrentNetworkInfo = (chainId) => {
  return SUPPORTED_NETWORKS[chainId] || { name: `Unknown Network (${chainId})`, symbol: 'ETH' };
};

// Get minimum fee for current network
export const getMinimumFee = async (signer) => {
  try {
    const contract = await getPaymentContract(signer);
    const minFeeWei = await contract.minFeeWei();
    return ethers.formatEther(minFeeWei);
  } catch (error) {
    console.error('Failed to get minimum fee:', error);
    return '0.001'; // Default fallback
  }
};