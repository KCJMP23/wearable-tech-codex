import { Address, Hash } from 'viem';

// Network configuration
export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  currency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  contracts: {
    affiliateAttribution: Address;
    rewardsToken: Address;
  };
  gasSettings: {
    gasPrice?: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
  };
}

// Smart contract types
export interface Click {
  clickId: Hash;
  affiliate: Address;
  tenantId: string;
  productId: string;
  timestamp: bigint;
  metadata: string;
  verified: boolean;
}

export interface Conversion {
  conversionId: Hash;
  clickId: Hash;
  affiliate: Address;
  tenantId: string;
  productId: string;
  conversionValue: bigint;
  commissionRate: bigint;
  commissionAmount: bigint;
  timestamp: bigint;
  paid: boolean;
  metadata: string;
}

export interface Affiliate {
  wallet: Address;
  email: string;
  totalEarned: bigint;
  totalClicks: bigint;
  totalConversions: bigint;
  active: boolean;
  registeredAt: bigint;
  metadata: string;
}

export interface TenantConfig {
  tenantId: string;
  payoutWallet: Address;
  defaultCommissionRate: bigint;
  active: boolean;
  minPayoutAmount: bigint;
}

export interface VestingSchedule {
  totalAmount: bigint;
  releasedAmount: bigint;
  startTime: bigint;
  cliffDuration: bigint;
  vestingDuration: bigint;
  revocable: boolean;
  revoked: boolean;
}

export interface RewardTier {
  minStake: bigint;
  multiplier: bigint;
  active: boolean;
}

// Transaction types
export interface BlockchainTransaction {
  id: string;
  tenantId: string;
  transactionHash: Hash | null;
  transactionType: 'click' | 'conversion' | 'commission' | 'reward';
  userWallet: Address | null;
  amountWei: bigint | null;
  tokenAddress: Address | null;
  productId: string | null;
  clickId: string | null;
  conversionId: string | null;
  metadata: Record<string, any>;
  blockNumber: bigint | null;
  gasUsed: number | null;
  gasPrice: bigint | null;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: string;
  confirmedAt: string | null;
}

// API request/response types
export interface RegisterClickRequest {
  affiliate: Address;
  tenantId: string;
  productId: string;
  metadata?: Record<string, any>;
  signature?: string;
}

export interface RegisterConversionRequest {
  clickId: Hash;
  conversionValue: bigint;
  commissionRate?: bigint;
  token: Address;
  metadata?: Record<string, any>;
}

export interface PayCommissionRequest {
  conversionId: Hash;
  token: Address;
}

export interface BatchPayCommissionRequest {
  conversionIds: Hash[];
  token: Address;
}

export interface RegisterAffiliateRequest {
  affiliate: Address;
  email: string;
  metadata?: Record<string, any>;
}

export interface ConfigureTenantRequest {
  tenantId: string;
  payoutWallet: Address;
  defaultCommissionRate: bigint;
  authorizedTokens: Address[];
  minPayoutAmount: bigint;
}

// Wallet connection types
export interface WalletConnectionState {
  address: Address | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  connector: any | null;
}

export interface ConnectWalletOptions {
  chainId?: number;
  onSuccess?: (address: Address) => void;
  onError?: (error: Error) => void;
}

// Transaction monitoring types
export interface TransactionStatus {
  hash: Hash;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: bigint;
  blockHash?: Hash;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
  confirmations: number;
  timestamp?: bigint;
}

export interface TransactionReceipt {
  hash: Hash;
  blockNumber: bigint;
  blockHash: Hash;
  gasUsed: bigint;
  effectiveGasPrice: bigint;
  status: 'success' | 'reverted';
  logs: Array<{
    address: Address;
    topics: Hash[];
    data: Hash;
  }>;
}

// Event types for real-time updates
export interface ClickRegisteredEvent {
  clickId: Hash;
  affiliate: Address;
  tenantId: string;
  productId: string;
  timestamp: bigint;
}

export interface ConversionRegisteredEvent {
  conversionId: Hash;
  clickId: Hash;
  affiliate: Address;
  tenantId: string;
  conversionValue: bigint;
  commissionAmount: bigint;
}

export interface CommissionPaidEvent {
  affiliate: Address;
  token: Address;
  amount: bigint;
  conversionId: Hash;
}

export interface TokensStakedEvent {
  user: Address;
  amount: bigint;
}

export interface RewardsClaimedEvent {
  user: Address;
  amount: bigint;
}

// Error types
export interface BlockchainError extends Error {
  code: string;
  reason?: string;
  transactionHash?: Hash;
  data?: any;
}

export interface ContractCallError extends BlockchainError {
  method: string;
  params: any[];
}

export interface TransactionError extends BlockchainError {
  gasLimit?: bigint;
  gasPrice?: bigint;
  nonce?: number;
}

// Gas estimation types
export interface GasEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  estimatedCost: bigint;
}

export interface GasOptimizationOptions {
  speed: 'slow' | 'standard' | 'fast';
  maxGasPrice?: bigint;
  gasMultiplier?: number;
}

// Analytics types
export interface AffiliateStats {
  totalEarned: bigint;
  totalClicks: bigint;
  totalConversions: bigint;
  conversionRate: number;
  averageCommission: bigint;
  pendingCommissions: Record<Address, bigint>;
}

export interface TenantStats {
  totalRevenue: bigint;
  totalCommissionsPaid: bigint;
  totalClicks: bigint;
  totalConversions: bigint;
  topAffiliates: Array<{
    address: Address;
    earned: bigint;
    conversions: bigint;
  }>;
  topProducts: Array<{
    productId: string;
    revenue: bigint;
    conversions: bigint;
  }>;
}

// Configuration types
export interface BlockchainServiceConfig {
  networks: Record<number, NetworkConfig>;
  defaultNetwork: number;
  privateKey?: string;
  infuraProjectId?: string;
  alchemyApiKey?: string;
  walletConnectProjectId?: string;
  enableDevMode: boolean;
  gasMultiplier: number;
  confirmationBlocks: number;
  retryAttempts: number;
  retryDelay: number;
}

// WebSocket types for real-time monitoring
export interface WebSocketMessage {
  type: 'click' | 'conversion' | 'commission' | 'reward' | 'error';
  data: any;
  timestamp: number;
}

export interface RealtimeSubscription {
  id: string;
  tenantId?: string;
  affiliateAddress?: Address;
  eventTypes: string[];
  callback: (message: WebSocketMessage) => void;
}

// Token types
export interface TokenInfo {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  verified: boolean;
}

export interface TokenBalance {
  token: TokenInfo;
  balance: bigint;
  formattedBalance: string;
  usdValue?: number;
}

export interface TokenApproval {
  token: Address;
  owner: Address;
  spender: Address;
  amount: bigint;
}

// Staking types
export interface StakingInfo {
  totalStaked: bigint;
  availableRewards: bigint;
  currentTier: number;
  nextTierRequirement: bigint;
  apy: number;
  lockPeriod: bigint;
}

export interface StakePosition {
  amount: bigint;
  rewardDebt: bigint;
  lastClaimTime: bigint;
  lockEndTime: bigint;
}

// Batch operation types
export interface BatchOperation {
  id: string;
  operations: Array<{
    type: string;
    params: any;
  }>;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  results: any[];
  errors: string[];
}

// Multi-signature types
export interface MultiSigTransaction {
  id: bigint;
  to: Address;
  value: bigint;
  data: Hash;
  executed: boolean;
  confirmations: number;
  requiredConfirmations: number;
  signers: Address[];
}

export interface MultiSigProposal {
  proposer: Address;
  target: Address;
  value: bigint;
  calldata: Hash;
  description: string;
  deadline: bigint;
  executed: boolean;
}

// Oracle types for price feeds
export interface PriceData {
  token: Address;
  price: bigint;
  decimals: number;
  timestamp: bigint;
  source: string;
}

export interface PriceFeed {
  tokenA: Address;
  tokenB: Address;
  price: bigint;
  lastUpdated: bigint;
  confidence: number;
}