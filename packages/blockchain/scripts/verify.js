"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const fs_1 = require("fs");
const path_1 = require("path");
async function main() {
    const networkName = (await hardhat_1.ethers.provider.getNetwork()).name;
    const deploymentFile = (0, path_1.join)(__dirname, "../deployments", `${networkName}.json`);
    if (!(0, fs_1.existsSync)(deploymentFile)) {
        throw new Error(`Deployment file not found: ${deploymentFile}`);
    }
    const deployment = JSON.parse((0, fs_1.readFileSync)(deploymentFile, "utf8"));
    console.log("🔍 Starting contract verification...");
    console.log("📡 Network:", deployment.network);
    console.log("📦 Contracts to verify:", Object.keys(deployment.contracts).length);
    // Verify WearableRewardsToken
    console.log("\n🔍 Verifying WearableRewardsToken...");
    try {
        await run("verify:verify", {
            address: deployment.contracts.rewardsToken,
            constructorArguments: [],
        });
        console.log("✅ WearableRewardsToken verified successfully");
    }
    catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log("✅ WearableRewardsToken already verified");
        }
        else {
            console.error("❌ Failed to verify WearableRewardsToken:", error.message);
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
    }
    catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log("✅ AffiliateAttribution already verified");
        }
        else {
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
function getExplorerUrl(address, network) {
    const explorers = {
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
