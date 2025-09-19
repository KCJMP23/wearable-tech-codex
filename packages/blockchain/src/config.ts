import { type NetworkConfig } from './types';

// Default network configurations
export const NETWORK_CONFIGS: Record<number, NetworkConfig> = {
  // Ethereum Mainnet
  1: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
    explorerUrl: 'https://etherscan.io',
    currency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    contracts: {
      affiliateAttribution: '0x0000000000000000000000000000000000000000', // To be deployed
      rewardsToken: '0x0000000000000000000000000000000000000000', // To be deployed
    },
    gasSettings: {
      maxFeePerGas: BigInt('20000000000'), // 20 gwei
      maxPriorityFeePerGas: BigInt('2000000000'), // 2 gwei
    },
  },

  // Sepolia Testnet
  11155111: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID',
    explorerUrl: 'https://sepolia.etherscan.io',
    currency: {
      name: 'Sepolia Ether',
      symbol: 'SEP',
      decimals: 18,
    },
    contracts: {
      affiliateAttribution: '0x0000000000000000000000000000000000000000', // To be deployed
      rewardsToken: '0x0000000000000000000000000000000000000000', // To be deployed
    },
    gasSettings: {
      maxFeePerGas: BigInt('10000000000'), // 10 gwei
      maxPriorityFeePerGas: BigInt('1000000000'), // 1 gwei
    },
  },

  // Polygon Mainnet
  137: {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    currency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    contracts: {
      affiliateAttribution: '0x0000000000000000000000000000000000000000', // To be deployed
      rewardsToken: '0x0000000000000000000000000000000000000000', // To be deployed
    },
    gasSettings: {
      gasPrice: BigInt('35000000000'), // 35 gwei
    },
  },

  // Polygon Mumbai Testnet
  80001: {
    chainId: 80001,
    name: 'Polygon Mumbai',
    rpcUrl: process.env.POLYGON_MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
    explorerUrl: 'https://mumbai.polygonscan.com',
    currency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    contracts: {
      affiliateAttribution: '0x0000000000000000000000000000000000000000', // To be deployed
      rewardsToken: '0x0000000000000000000000000000000000000000', // To be deployed
    },
    gasSettings: {
      gasPrice: BigInt('35000000000'), // 35 gwei
    },
  },

  // Local Hardhat Network
  31337: {
    chainId: 31337,
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    explorerUrl: 'http://localhost:3000',
    currency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    contracts: {
      affiliateAttribution: '0x0000000000000000000000000000000000000000',
      rewardsToken: '0x0000000000000000000000000000000000000000',
    },
    gasSettings: {
      gasPrice: BigInt('20000000000'), // 20 gwei
    },
  },
};

// Supported tokens on each network
export const SUPPORTED_TOKENS: Record<number, Record<string, string>> = {
  // Ethereum Mainnet
  1: {
    USDC: '0xA0b86a33E6417c80e8D46b78E08D04D2Cd66dBE0',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  // Polygon Mainnet
  137: {
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  },
  // Mumbai Testnet
  80001: {
    USDC: '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23',
    WMATIC: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
  },
  // Sepolia Testnet
  11155111: {
    USDC: '0x0000000000000000000000000000000000000000', // Mock address
    WETH: '0x0000000000000000000000000000000000000000', // Mock address
  },
};

// Default blockchain service configuration
export const DEFAULT_BLOCKCHAIN_CONFIG = {
  networks: NETWORK_CONFIGS,
  defaultNetwork: process.env.NODE_ENV === 'production' ? 137 : 80001, // Polygon mainnet in prod, Mumbai in dev
  enableDevMode: process.env.NODE_ENV !== 'production',
  gasMultiplier: 1.2, // 20% buffer for gas estimates
  confirmationBlocks: {
    1: 12,     // Ethereum mainnet
    137: 64,   // Polygon mainnet
    80001: 32, // Mumbai testnet
    11155111: 6, // Sepolia testnet
    31337: 1,  // Local
  },
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  maxGasPrice: {
    1: BigInt('100000000000'),     // 100 gwei for Ethereum
    137: BigInt('500000000000'),   // 500 gwei for Polygon
    80001: BigInt('500000000000'), // 500 gwei for Mumbai
    11155111: BigInt('50000000000'), // 50 gwei for Sepolia
    31337: BigInt('20000000000'),  // 20 gwei for local
  },
};

// Contract addresses will be updated after deployment
export const CONTRACT_ADDRESSES = {
  affiliateAttribution: {
    1: process.env.ETHEREUM_AFFILIATE_ATTRIBUTION_ADDRESS,
    137: process.env.POLYGON_AFFILIATE_ATTRIBUTION_ADDRESS,
    80001: process.env.MUMBAI_AFFILIATE_ATTRIBUTION_ADDRESS,
    11155111: process.env.SEPOLIA_AFFILIATE_ATTRIBUTION_ADDRESS,
    31337: process.env.LOCAL_AFFILIATE_ATTRIBUTION_ADDRESS,
  },
  rewardsToken: {
    1: process.env.ETHEREUM_REWARDS_TOKEN_ADDRESS,
    137: process.env.POLYGON_REWARDS_TOKEN_ADDRESS,
    80001: process.env.MUMBAI_REWARDS_TOKEN_ADDRESS,
    11155111: process.env.SEPOLIA_REWARDS_TOKEN_ADDRESS,
    31337: process.env.LOCAL_REWARDS_TOKEN_ADDRESS,
  },
};

// Gas optimization presets
export const GAS_PRESETS = {
  slow: {
    gasMultiplier: 1.0,
    maxFeePerGasMultiplier: 0.8,
    maxPriorityFeePerGasMultiplier: 0.5,
  },
  standard: {
    gasMultiplier: 1.1,
    maxFeePerGasMultiplier: 1.0,
    maxPriorityFeePerGasMultiplier: 1.0,
  },
  fast: {
    gasMultiplier: 1.3,
    maxFeePerGasMultiplier: 1.5,
    maxPriorityFeePerGasMultiplier: 2.0,
  },
} as const;

// Event signatures for listening to contract events
export const EVENT_SIGNATURES = {
  ClickRegistered: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  ConversionRegistered: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  CommissionPaid: '0x567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456',
  TokensStaked: '0x890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
  RewardsClaimed: '0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
} as const;

// Role hashes for access control
export const ROLES = {
  DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
  ADMIN_ROLE: '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775',
  OPERATOR_ROLE: '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929',
  VERIFIER_ROLE: '0x7837b411e8ab1a4cfa38c80dfb6e4f7e10e77b4e934e24acddb0a06f5b96f9e3',
  MINTER_ROLE: '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6',
  BURNER_ROLE: '0x3c11d16cbaffd01df69ce1c404f6340ee057498f5f00246190ea54220576a848',
  PAUSER_ROLE: '0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a',
} as const;

// Common token decimals
export const TOKEN_DECIMALS = {
  ETH: 18,
  MATIC: 18,
  USDC: 6,
  USDT: 6,
  DAI: 18,
  WRT: 18, // Wearable Rewards Token
} as const;

// Commission rate limits (in basis points)
export const COMMISSION_LIMITS = {
  MIN_RATE: 0,        // 0%
  MAX_RATE: 10000,    // 100%
  DEFAULT_RATE: 500,  // 5%
  TYPICAL_RATES: {
    electronics: 300,    // 3%
    wearables: 500,      // 5%
    accessories: 800,    // 8%
    premium: 1200,       // 12%
  },
} as const;

// Staking parameters
export const STAKING_CONFIG = {
  MIN_STAKE: BigInt('1000000000000000000000'), // 1,000 WRT
  MAX_STAKE: BigInt('1000000000000000000000000'), // 1,000,000 WRT
  LOCK_PERIODS: {
    FLEXIBLE: 0,
    MONTH_3: 90 * 24 * 60 * 60,    // 3 months
    MONTH_6: 180 * 24 * 60 * 60,   // 6 months
    YEAR_1: 365 * 24 * 60 * 60,    // 1 year
  },
  APY_RATES: {
    FLEXIBLE: 500,    // 5%
    MONTH_3: 750,     // 7.5%
    MONTH_6: 1000,    // 10%
    YEAR_1: 1500,     // 15%
  },
} as const;

// Fraud detection thresholds
export const FRAUD_DETECTION = {
  MAX_CLICKS_PER_HOUR: 100,
  MAX_CONVERSIONS_PER_HOUR: 50,
  MIN_TIME_BETWEEN_CLICKS: 1000, // 1 second
  SUSPICIOUS_PATTERNS: {
    HIGH_CONVERSION_RATE: 0.8,    // 80%+
    RAPID_SUCCESSION: 5000,        // 5 seconds
    SAME_IP_THRESHOLD: 10,         // clicks from same IP
  },
} as const;

// Monitoring and alerting
export const MONITORING_CONFIG = {
  HEALTH_CHECK_INTERVAL: 30000,      // 30 seconds
  TRANSACTION_TIMEOUT: 300000,       // 5 minutes
  RETRY_INTERVALS: [1000, 5000, 15000], // 1s, 5s, 15s
  ALERT_THRESHOLDS: {
    HIGH_GAS_PRICE: BigInt('100000000000'), // 100 gwei
    LOW_BALANCE_WARNING: BigInt('1000000000000000000'), // 1 ETH/MATIC
    FAILED_TRANSACTION_RATE: 0.1, // 10%
  },
} as const;