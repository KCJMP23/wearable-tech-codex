import { ethers } from "hardhat";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface DeploymentConfig {
  network: string;
  contracts: {
    rewardsToken: string;
    affiliateAttribution: string;
  };
  deployer: string;
  blockNumber: number;
  timestamp: string;
}

async function main() {
  const networkName = (await ethers.provider.getNetwork()).name;
  const deploymentFile = join(__dirname, "../deployments", `${networkName}.json`);

  if (!existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }

  const deployment: DeploymentConfig = JSON.parse(readFileSync(deploymentFile, "utf8"));

  console.log("🔍 Starting contract verification...");
  console.log("📡 Network:", deployment.network);
  console.log("📦 Contracts to verify:", Object.keys(deployment.contracts).length);

  // Verify AffiliateRewardsToken
  console.log("\n🔍 Verifying AffiliateRewardsToken...");
  try {
    await run("verify:verify", {
      address: deployment.contracts.rewardsToken,
      constructorArguments: [],
    });
    console.log("✅ AffiliateRewardsToken verified successfully");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ AffiliateRewardsToken already verified");
    } else {
      console.error("❌ Failed to verify AffiliateRewardsToken:", error.message);
    }
  }

  // Verify AffiliateAttribution
  console.log("\n🔍 Verifying AffiliateAttribution...");
  try {
    await run("verify:verify", {
      address: deployment.contracts.affiliateAttribution,
      constructorArguments: [],
    });
    console.log("✅ AffiliateAttribution verified successfully");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ AffiliateAttribution already verified");
    } else {
      console.error("❌ Failed to verify AffiliateAttribution:", error.message);
    }
  }

  console.log("\n🎉 Verification process completed!");
  
  // Generate verification report
  const report = {
    network: deployment.network,
    timestamp: new Date().toISOString(),
    contracts: {
      rewardsToken: {
        address: deployment.contracts.rewardsToken,
        explorerUrl: getExplorerUrl(deployment.contracts.rewardsToken, networkName),
      },
      affiliateAttribution: {
        address: deployment.contracts.affiliateAttribution,
        explorerUrl: getExplorerUrl(deployment.contracts.affiliateAttribution, networkName),
      },
    },
  };

  console.log("\n📋 Verification Report:");
  console.log(JSON.stringify(report, null, 2));
}

function getExplorerUrl(address: string, network: string): string {
  const explorers: Record<string, string> = {
    ethereum: "https://etherscan.io",
    polygon: "https://polygonscan.com",
    sepolia: "https://sepolia.etherscan.io",
    polygonMumbai: "https://mumbai.polygonscan.com",
  };

  const baseUrl = explorers[network] || "https://etherscan.io";
  return `${baseUrl}/address/${address}`;
}

// Import hardhat's run function
const { run } = require("hardhat");

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });