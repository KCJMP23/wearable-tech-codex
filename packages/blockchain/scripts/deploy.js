"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const fs_1 = require("fs");
const path_1 = require("path");
const NETWORK_CONFIGS = {
    ethereum: {
        name: "Ethereum Mainnet",
        chainId: 1,
        isTestnet: false,
        gasMultiplier: 1.2,
        confirmations: 12,
    },
    polygon: {
        name: "Polygon Mainnet",
        chainId: 137,
        isTestnet: false,
        gasMultiplier: 1.3,
        confirmations: 64,
    },
    sepolia: {
        name: "Sepolia Testnet",
        chainId: 11155111,
        isTestnet: true,
        gasMultiplier: 1.1,
        confirmations: 6,
    },
    polygonMumbai: {
        name: "Polygon Mumbai Testnet",
        chainId: 80001,
        isTestnet: true,
        gasMultiplier: 1.1,
        confirmations: 32,
    },
    localhost: {
        name: "Localhost",
        chainId: 31337,
        isTestnet: true,
        gasMultiplier: 1.0,
        confirmations: 1,
    },
};
async function main() {
    const [deployer] = await hardhat_1.ethers.getSigners();
    const network = await hardhat_1.ethers.provider.getNetwork();
    const networkName = network.name === "unknown" ? "localhost" : network.name;
    console.log("🚀 Starting deployment process...");
    console.log("📡 Network:", networkName);
    console.log("🔑 Deployer:", deployer.address);
    console.log("💰 Balance:", hardhat_1.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    const networkConfig = NETWORK_CONFIGS[networkName];
    if (!networkConfig) {
        throw new Error(`Unsupported network: ${networkName}`);
    }
    // Estimate gas prices
    const feeData = await hardhat_1.ethers.provider.getFeeData();
    console.log("⛽ Gas Price:", hardhat_1.ethers.formatUnits(feeData.gasPrice || 0, "gwei"), "gwei");
    // Deploy Wearable Rewards Token
    console.log("\n📦 Deploying WearableRewardsToken...");
    const WearableRewardsTokenFactory = await hardhat_1.ethers.getContractFactory("WearableRewardsToken");
    const gasEstimateToken = await WearableRewardsTokenFactory.getDeployTransaction().estimateGas();
    const adjustedGasLimitToken = gasEstimateToken * BigInt(Math.ceil(networkConfig.gasMultiplier * 100)) / BigInt(100);
    const rewardsToken = await WearableRewardsTokenFactory.deploy({
        gasLimit: adjustedGasLimitToken,
    });
    await rewardsToken.waitForDeployment();
    const rewardsTokenAddress = await rewardsToken.getAddress();
    console.log("✅ WearableRewardsToken deployed to:", rewardsTokenAddress);
    console.log("🧾 Transaction hash:", rewardsToken.deploymentTransaction()?.hash);
    // Wait for confirmations if not localhost
    if (networkName !== "localhost") {
        console.log(`⏳ Waiting for ${networkConfig.confirmations} confirmations...`);
        await rewardsToken.deploymentTransaction()?.wait(networkConfig.confirmations);
    }
    // Deploy Affiliate Attribution Contract
    console.log("\n📦 Deploying AffiliateAttribution...");
    const AffiliateAttributionFactory = await hardhat_1.ethers.getContractFactory("AffiliateAttribution");
    const gasEstimateAttribution = await AffiliateAttributionFactory.getDeployTransaction().estimateGas();
    const adjustedGasLimitAttribution = gasEstimateAttribution * BigInt(Math.ceil(networkConfig.gasMultiplier * 100)) / BigInt(100);
    const affiliateAttribution = await AffiliateAttributionFactory.deploy({
        gasLimit: adjustedGasLimitAttribution,
    });
    await affiliateAttribution.waitForDeployment();
    const affiliateAttributionAddress = await affiliateAttribution.getAddress();
    console.log("✅ AffiliateAttribution deployed to:", affiliateAttributionAddress);
    console.log("🧾 Transaction hash:", affiliateAttribution.deploymentTransaction()?.hash);
    // Wait for confirmations if not localhost
    if (networkName !== "localhost") {
        console.log(`⏳ Waiting for ${networkConfig.confirmations} confirmations...`);
        await affiliateAttribution.deploymentTransaction()?.wait(networkConfig.confirmations);
    }
    // Setup initial configuration
    console.log("\n⚙️  Setting up initial configuration...");
    // Grant MINTER_ROLE to AffiliateAttribution contract on RewardsToken
    const MINTER_ROLE = await rewardsToken.MINTER_ROLE();
    const grantRoleTx = await rewardsToken.grantRole(MINTER_ROLE, affiliateAttributionAddress);
    await grantRoleTx.wait();
    console.log("✅ Granted MINTER_ROLE to AffiliateAttribution contract");
    // Configure example tenant (if testnet)
    if (networkConfig.isTestnet) {
        console.log("🧪 Setting up test configuration for testnet...");
        const configureTenantTx = await affiliateAttribution.configureTenant("test-tenant", deployer.address, // payout wallet
        500, // 5% commission rate
        [rewardsTokenAddress], // authorized tokens
        hardhat_1.ethers.parseEther("10") // min payout amount
        );
        await configureTenantTx.wait();
        console.log("✅ Configured test tenant");
        // Register deployer as test affiliate
        const registerAffiliateTx = await affiliateAttribution.registerAffiliate(deployer.address, "test@example.com", "Test affiliate metadata");
        await registerAffiliateTx.wait();
        console.log("✅ Registered test affiliate");
    }
    // Save deployment information
    const deploymentInfo = {
        network: networkName,
        contracts: {
            rewardsToken: rewardsTokenAddress,
            affiliateAttribution: affiliateAttributionAddress,
        },
        deployer: deployer.address,
        blockNumber: await hardhat_1.ethers.provider.getBlockNumber(),
        timestamp: new Date().toISOString(),
    };
    const deploymentsDir = (0, path_1.join)(__dirname, "../deployments");
    const deploymentFile = (0, path_1.join)(deploymentsDir, `${networkName}.json`);
    // Create deployments directory if it doesn't exist
    try {
        await Promise.resolve().then(() => __importStar(require("fs"))).then(fs => fs.mkdirSync(deploymentsDir, { recursive: true }));
    }
    catch (error) {
        // Directory might already exist
    }
    (0, fs_1.writeFileSync)(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Deployment info saved to:", deploymentFile);
    // Update network configuration file
    updateNetworkConfig(networkName, deploymentInfo);
    // Generate TypeScript types
    console.log("\n🔧 Generating TypeScript types...");
    try {
        await Promise.resolve().then(() => __importStar(require("child_process"))).then(cp => {
            cp.execSync("npx hardhat typechain", { stdio: "inherit" });
        });
        console.log("✅ TypeScript types generated");
    }
    catch (error) {
        console.log("⚠️  Failed to generate TypeScript types:", error);
    }
    // Verification instructions
    if (!networkConfig.isTestnet) {
        console.log("\n🔍 Verification commands:");
        console.log(`npx hardhat verify --network ${networkName} ${rewardsTokenAddress}`);
        console.log(`npx hardhat verify --network ${networkName} ${affiliateAttributionAddress}`);
    }
    console.log("\n🎉 Deployment completed successfully!");
    console.log("\n📋 Summary:");
    console.log("Network:", networkConfig.name);
    console.log("WearableRewardsToken:", rewardsTokenAddress);
    console.log("AffiliateAttribution:", affiliateAttributionAddress);
    console.log("Deployer:", deployer.address);
    if (networkConfig.isTestnet) {
        console.log("\n🧪 Test Configuration:");
        console.log("- Test tenant configured with ID: test-tenant");
        console.log("- Deployer registered as test affiliate");
        console.log("- 5% commission rate set");
        console.log("- Minimum payout: 10 WRT");
    }
    console.log("\n🚨 Next steps:");
    console.log("1. Update your .env file with the contract addresses");
    console.log("2. Verify contracts on block explorer (if mainnet)");
    console.log("3. Update frontend configuration");
    console.log("4. Test the deployment with sample transactions");
}
function updateNetworkConfig(networkName, deploymentInfo) {
    const configPath = (0, path_1.join)(__dirname, "../src/config.ts");
    if (!(0, fs_1.existsSync)(configPath)) {
        console.log("⚠️  Config file not found, skipping update");
        return;
    }
    try {
        let configContent = (0, fs_1.readFileSync)(configPath, "utf8");
        // Update contract addresses in the config
        const rewardsTokenRegex = new RegExp(`(${networkName}.*?rewardsToken:\\s*)'0x[a-fA-F0-9]{40}'`, "s");
        const affiliateAttributionRegex = new RegExp(`(${networkName}.*?affiliateAttribution:\\s*)'0x[a-fA-F0-9]{40}'`, "s");
        if (rewardsTokenRegex.test(configContent)) {
            configContent = configContent.replace(rewardsTokenRegex, `$1'${deploymentInfo.contracts.rewardsToken}'`);
        }
        if (affiliateAttributionRegex.test(configContent)) {
            configContent = configContent.replace(affiliateAttributionRegex, `$1'${deploymentInfo.contracts.affiliateAttribution}'`);
        }
        (0, fs_1.writeFileSync)(configPath, configContent);
        console.log("✅ Updated network configuration");
    }
    catch (error) {
        console.log("⚠️  Failed to update config file:", error);
    }
}
// Handle script execution
main()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
});
