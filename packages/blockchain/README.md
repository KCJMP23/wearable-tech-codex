# Blockchain-Based Affiliate Attribution System

A comprehensive blockchain solution for transparent affiliate attribution, commission distribution, and rewards management in the Wearable Tech Codex platform.

## 🎯 Overview

This blockchain package provides:

- **Transparent Attribution**: Immutable tracking of affiliate clicks and conversions
- **Automated Commissions**: Smart contract-based commission distribution
- **Multi-Token Support**: ETH, MATIC, USDC, and custom reward tokens
- **Fraud Prevention**: On-chain verification and anti-fraud mechanisms
- **Gas Optimization**: Efficient transaction batching and network optimization
- **Real-time Monitoring**: Live transaction tracking and status updates

## 🏗️ Architecture

### Smart Contracts

#### AffiliateAttribution.sol
The main contract handling affiliate attribution and commission distribution:

- **Click Registration**: Records affiliate clicks with metadata
- **Conversion Tracking**: Links conversions to originating clicks
- **Commission Calculation**: Automated commission calculations
- **Payment Distribution**: Direct token transfers to affiliates
- **Fraud Detection**: Built-in anti-fraud mechanisms
- **Access Control**: Role-based permissions for operations

#### WearableRewardsToken.sol
ERC20 token for platform rewards and loyalty programs:

- **Mintable**: Controlled token minting for rewards
- **Stakeable**: Staking mechanism with reward tiers
- **Vesting**: Token vesting schedules for affiliates
- **Burnable**: Token burning for deflationary mechanics
- **Pausable**: Emergency pause functionality

### Key Features

#### 🔐 Security Features
- Multi-signature support for high-value operations
- Role-based access control (RBAC)
- Reentrancy protection
- Pausable contracts for emergency situations
- Signature verification for click authenticity

#### ⛽ Gas Optimization
- Batch processing for multiple transactions
- Efficient data structures and storage patterns
- Gas price optimization across networks
- Layer 2 support (Polygon) for lower costs

#### 🌐 Multi-Network Support
- **Ethereum Mainnet**: Production environment
- **Polygon**: Low-cost transactions
- **Testnets**: Development and testing
- **Local**: Hardhat development network

## 🚀 Getting Started

### Prerequisites

```bash
npm install -g hardhat
```

### Installation

```bash
cd packages/blockchain
npm install
```

### Environment Setup

Create a `.env` file:

```env
# Network RPC URLs
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
POLYGON_RPC_URL=https://polygon-rpc.com
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
POLYGON_MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com

# Private Keys (NEVER commit real private keys)
PRIVATE_KEY=your_private_key_here

# API Keys for verification
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# Contract Addresses (updated after deployment)
ETHEREUM_AFFILIATE_ATTRIBUTION_ADDRESS=
ETHEREUM_REWARDS_TOKEN_ADDRESS=
POLYGON_AFFILIATE_ATTRIBUTION_ADDRESS=
POLYGON_REWARDS_TOKEN_ADDRESS=
```

### Compilation

```bash
npm run compile
```

### Testing

```bash
npm run test
```

## 📋 Deployment

### Local Development

1. Start local Hardhat network:
```bash
npx hardhat node
```

2. Deploy contracts:
```bash
npm run deploy:localhost
```

3. Setup test environment:
```bash
npx hardhat run scripts/setup-test-environment.ts --network localhost
```

### Testnet Deployment

1. Deploy to Polygon Mumbai:
```bash
npm run deploy:mumbai
```

2. Setup test environment:
```bash
npx hardhat run scripts/setup-test-environment.ts --network polygonMumbai
```

3. Verify contracts:
```bash
npm run verify:mumbai
```

### Mainnet Deployment

1. Deploy to Polygon Mainnet:
```bash
npm run deploy:polygon
```

2. Verify contracts:
```bash
npm run verify:polygon
```

## 🔧 Usage

### Basic Integration

```typescript
import { BlockchainService } from '@affiliate-factory/blockchain';

// Initialize service
const blockchainService = new BlockchainService(137, privateKey); // Polygon

// Register affiliate click
const clickHash = await blockchainService.registerClick({
  affiliate: '0x...',
  tenantId: 'my-tenant',
  productId: 'product-123',
  metadata: { source: 'website' }
});

// Register conversion
const conversionHash = await blockchainService.registerConversion({
  clickId: clickHash,
  conversionValue: BigInt('100000000000000000000'), // 100 tokens
  token: '0x...', // Token address
  metadata: { orderId: 'ORDER-123' }
});

// Get affiliate stats
const stats = await blockchainService.getAffiliateStats('0x...');
```

### Frontend Integration

```tsx
import { WalletConnection, TransactionMonitor, AffiliateStatsWidget } from './components/blockchain';

function AffiliateDashboard() {
  return (
    <div>
      <WalletConnection onConnectionChange={handleWalletChange} />
      <AffiliateStatsWidget tenantId="my-tenant" />
      <TransactionMonitor tenantId="my-tenant" />
    </div>
  );
}
```

### API Integration

```typescript
// Register click via API
const response = await fetch('/api/blockchain/register-click', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tenantId: 'my-tenant',
    affiliate: '0x...',
    productId: 'product-123',
    metadata: { source: 'website' }
  })
});

// Get affiliate stats via API
const stats = await fetch(`/api/blockchain/affiliate-stats?tenantId=my-tenant&affiliate=0x...`);
```

## 📊 Monitoring & Analytics

### Transaction Monitoring

The system provides real-time monitoring of:
- Click registrations
- Conversion events
- Commission payments
- Token transfers
- Gas usage optimization

### Analytics Dashboard

Built-in analytics include:
- Conversion rates by affiliate
- Revenue attribution
- Commission distribution
- Token staking metrics
- Network performance stats

## 🛡️ Security Considerations

### Smart Contract Security

- **Audited Contracts**: Based on OpenZeppelin standards
- **Access Controls**: Role-based permissions
- **Reentrancy Protection**: Guards against reentrancy attacks
- **Overflow Protection**: SafeMath for all calculations
- **Pausable**: Emergency stop functionality

### Operational Security

- **Multi-sig Wallets**: For high-value operations
- **Private Key Management**: Hardware wallet integration
- **Transaction Monitoring**: Real-time fraud detection
- **Rate Limiting**: API protection mechanisms

### Best Practices

1. **Never expose private keys** in code or environment files
2. **Use hardware wallets** for production deployments
3. **Monitor gas prices** to optimize transaction costs
4. **Implement retry logic** for failed transactions
5. **Validate all inputs** before blockchain submission

## 🌐 Network Configuration

### Supported Networks

| Network | Chain ID | Currency | Status | Gas Costs |
|---------|----------|----------|--------|-----------|
| Ethereum | 1 | ETH | Production | High |
| Polygon | 137 | MATIC | Production | Low |
| Sepolia | 11155111 | SEP | Testnet | Free |
| Mumbai | 80001 | MATIC | Testnet | Free |
| Localhost | 31337 | ETH | Development | Free |

### Gas Optimization

The system includes several gas optimization strategies:

1. **Batch Operations**: Process multiple transactions together
2. **Network Selection**: Automatic network switching based on costs
3. **Gas Price Monitoring**: Real-time gas price optimization
4. **Transaction Queuing**: Intelligent transaction scheduling

## 🔍 Testing

### Unit Tests

```bash
npm run test
```

### Integration Tests

```bash
npm run test:integration
```

### Gas Usage Reports

```bash
npm run test:gas
```

### Coverage Reports

```bash
npm run coverage
```

## 📈 Performance

### Benchmarks

- **Click Registration**: ~50,000 gas
- **Conversion Registration**: ~80,000 gas
- **Commission Payment**: ~60,000 gas
- **Batch Payment (10x)**: ~300,000 gas

### Scaling Solutions

- **Layer 2 Integration**: Polygon for cost reduction
- **State Channels**: For high-frequency operations
- **Batch Processing**: Reduce individual transaction costs
- **Caching**: Off-chain caching for read operations

## 🔄 Upgrade Strategy

### Contract Upgrades

The contracts are designed with upgradeability in mind:

1. **Proxy Patterns**: For logic upgrades
2. **Migration Scripts**: For data migration
3. **Backward Compatibility**: Maintain API compatibility
4. **Gradual Rollouts**: Phased upgrade deployment

### Version Management

- **Semantic Versioning**: Following semver standards
- **Change Logs**: Detailed upgrade documentation
- **Deprecation Notices**: Clear migration timelines
- **Testing Protocols**: Comprehensive upgrade testing

## 🆘 Troubleshooting

### Common Issues

#### Transaction Failures
```bash
# Check gas prices
npx hardhat run scripts/check-gas-prices.ts

# Retry with higher gas limit
npx hardhat run scripts/retry-transaction.ts --gas-multiplier 1.5
```

#### Contract Verification Issues
```bash
# Manual verification
npx hardhat verify --network polygon 0xCONTRACT_ADDRESS

# Check verification status
npx hardhat run scripts/check-verification.ts
```

#### Network Connection Problems
```bash
# Test network connectivity
npx hardhat run scripts/test-connection.ts --network polygon

# Switch to backup RPC
export POLYGON_RPC_URL=https://backup-rpc.com
```

### Debug Tools

- **Hardhat Console**: Interactive contract debugging
- **Transaction Tracer**: Step-by-step execution analysis
- **Gas Profiler**: Identify gas optimization opportunities
- **Event Monitor**: Real-time event tracking

## 📚 Resources

### Documentation

- [Smart Contract API Reference](./docs/contracts.md)
- [TypeScript SDK Guide](./docs/typescript-sdk.md)
- [Frontend Integration](./docs/frontend-integration.md)
- [API Endpoints](./docs/api-reference.md)

### Examples

- [Basic Integration Example](./examples/basic-integration.ts)
- [Advanced Features Example](./examples/advanced-features.ts)
- [Testing Examples](./examples/testing-setup.ts)
- [Gas Optimization Examples](./examples/gas-optimization.ts)

### Community

- [GitHub Issues](https://github.com/your-org/wearable-tech-codex/issues)
- [Discord Community](https://discord.gg/your-community)
- [Developer Documentation](https://docs.your-platform.com)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

### Development Guidelines

- Follow the existing code style
- Write comprehensive tests
- Update documentation
- Use conventional commit messages
- Ensure gas efficiency

---

For more information, see the [main platform documentation](../../README.md).