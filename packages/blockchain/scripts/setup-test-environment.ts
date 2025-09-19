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
  const [deployer, affiliate1, affiliate2, tenant1] = await ethers.getSigners();
  const networkName = (await ethers.provider.getNetwork()).name;
  const deploymentFile = join(__dirname, "../deployments", `${networkName}.json`);

  if (!existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}. Please deploy contracts first.`);
  }

  const deployment: DeploymentConfig = JSON.parse(readFileSync(deploymentFile, "utf8"));

  console.log("🧪 Setting up test environment...");
  console.log("📡 Network:", deployment.network);
  console.log("🔑 Deployer:", deployer.address);
  console.log("👤 Test Affiliate 1:", affiliate1.address);
  console.log("👤 Test Affiliate 2:", affiliate2.address);
  console.log("🏢 Test Tenant:", tenant1.address);

  // Connect to deployed contracts
  const rewardsToken = await ethers.getContractAt("AffiliateRewardsToken", deployment.contracts.rewardsToken);
  const affiliateAttribution = await ethers.getContractAt("AffiliateAttribution", deployment.contracts.affiliateAttribution);

  console.log("\n📦 Connected to contracts:");
  console.log("ART Token:", await rewardsToken.getAddress());
  console.log("Attribution:", await affiliateAttribution.getAddress());

  // Setup test data
  console.log("\n⚙️  Setting up test configuration...");

  // 1. Configure test tenant
  const tenantId = "test-affiliate-inc";
  const defaultCommissionRate = 750; // 7.5%
  const minPayoutAmount = ethers.parseEther("5"); // 5 ART minimum

  console.log("🏢 Configuring test tenant...");
  const configureTx = await affiliateAttribution.configureTenant(
    tenantId,
    tenant1.address, // payout wallet
    defaultCommissionRate,
    [await rewardsToken.getAddress()], // authorized tokens
    minPayoutAmount
  );
  await configureTx.wait();
  console.log("✅ Test tenant configured");

  // 2. Register test affiliates
  console.log("\n👥 Registering test affiliates...");
  
  const registerAff1Tx = await affiliateAttribution.registerAffiliate(
    affiliate1.address,
    "affiliate1@test.com",
    JSON.stringify({
      name: "Test Affiliate 1",
      website: "https://test-affiliate-1.com",
      category: "affiliate",
    })
  );
  await registerAff1Tx.wait();
  console.log("✅ Affiliate 1 registered");

  const registerAff2Tx = await affiliateAttribution.registerAffiliate(
    affiliate2.address,
    "affiliate2@test.com",
    JSON.stringify({
      name: "Test Affiliate 2",
      website: "https://test-affiliate-2.com",
      category: "electronics",
    })
  );
  await registerAff2Tx.wait();
  console.log("✅ Affiliate 2 registered");

  // 3. Mint some test tokens for distribution
  console.log("\n💰 Minting test tokens...");
  const testTokenAmount = ethers.parseEther("10000"); // 10,000 ART for testing

  const mintTx = await rewardsToken.mint(
    tenant1.address,
    testTokenAmount,
    "Test token allocation for affiliate payouts"
  );
  await mintTx.wait();
  console.log(`✅ Minted ${ethers.formatEther(testTokenAmount)} ART to tenant wallet`);

  // 4. Approve affiliate attribution contract to spend tokens
  console.log("\n🔓 Setting up token approvals...");
  const rewardsTokenAsTenant = rewardsToken.connect(tenant1);
  const approveTx = await rewardsTokenAsTenant.approve(
    await affiliateAttribution.getAddress(),
    testTokenAmount
  );
  await approveTx.wait();
  console.log("✅ Token approval set for affiliate payouts");

  // 5. Create some sample transactions
  console.log("\n📊 Creating sample transactions...");

  // Sample product IDs
  const products = [
    "premium-product-1",
    "bestseller-item-2",
    "trending-product-3",
    "featured-item-4",
    "popular-product-5",
  ];

  // Generate some clicks and conversions
  for (let i = 0; i < 5; i++) {
    const affiliate = i % 2 === 0 ? affiliate1.address : affiliate2.address;
    const productId = products[i];
    
    // Register click
    const clickId = ethers.keccak256(
      ethers.toUtf8Bytes(`${affiliate}-${productId}-${Date.now()}-${i}`)
    );
    
    const clickTx = await affiliateAttribution.registerClick(
      clickId,
      affiliate,
      tenantId,
      productId,
      JSON.stringify({
        timestamp: Date.now(),
        userAgent: "Mozilla/5.0 (Test Browser)",
        referrer: "https://test-site.com",
      })
    );
    await clickTx.wait();
    console.log(`✅ Click ${i + 1} registered for ${productId}`);

    // Register conversion (50% conversion rate for testing)
    if (i % 2 === 0) {
      const conversionId = ethers.keccak256(
        ethers.toUtf8Bytes(`conversion-${clickId}-${Date.now()}`)
      );
      
      const conversionValue = ethers.parseEther((Math.random() * 500 + 100).toFixed(2)); // $100-$600
      const customCommissionRate = i === 0 ? 1000 : 0; // 10% for first conversion, default for others
      
      const conversionTx = await affiliateAttribution.registerConversion(
        conversionId,
        clickId,
        conversionValue,
        customCommissionRate,
        await rewardsToken.getAddress(),
        JSON.stringify({
          orderId: `ORDER-${Date.now()}-${i}`,
          customerEmail: `customer${i}@test.com`,
          productPrice: ethers.formatEther(conversionValue),
        })
      );
      await conversionTx.wait();
      console.log(`✅ Conversion ${Math.floor(i / 2) + 1} registered for ${productId}`);

      // Pay commission immediately for demonstration
      const payTx = await affiliateAttribution.payCommission(
        conversionId,
        await rewardsToken.getAddress()
      );
      await payTx.wait();
      console.log(`💰 Commission paid for conversion ${Math.floor(i / 2) + 1}`);
    }
  }

  // 6. Setup staking for rewards token (if enabled)
  console.log("\n🥩 Setting up staking examples...");
  
  // Give affiliates some tokens to stake
  const stakeAmount = ethers.parseEther("1000"); // 1000 ART each
  
  for (const affiliate of [affiliate1, affiliate2]) {
    const mintStakeTx = await rewardsToken.mint(
      affiliate.address,
      stakeAmount,
      "Test tokens for staking demonstration"
    );
    await mintStakeTx.wait();
    
    // Stake some tokens
    const rewardsTokenAsAffiliate = rewardsToken.connect(affiliate);
    const stakeTx = await rewardsTokenAsAffiliate.stake(ethers.parseEther("500"));
    await stakeTx.wait();
    
    console.log(`✅ ${affiliate.address} staked 500 ART`);
  }

  // 7. Display test environment summary
  console.log("\n📋 Test Environment Summary:");
  console.log("=" * 50);
  
  // Get affiliate stats
  for (const [index, affiliate] of [affiliate1, affiliate2].entries()) {
    const stats = await affiliateAttribution.getAffiliateStats(affiliate.address);
    const balance = await rewardsToken.balanceOf(affiliate.address);
    const stakedBalance = await rewardsToken.stakedBalances(affiliate.address);
    
    console.log(`\n👤 Affiliate ${index + 1} (${affiliate.address}):`);
    console.log(`   📧 Email: affiliate${index + 1}@test.com`);
    console.log(`   💰 ART Balance: ${ethers.formatEther(balance)}`);
    console.log(`   🥩 Staked: ${ethers.formatEther(stakedBalance)}`);
    console.log(`   📊 Total Earned: ${ethers.formatEther(stats[0])}`);
    console.log(`   👆 Total Clicks: ${stats[1].toString()}`);
    console.log(`   ✅ Total Conversions: ${stats[2].toString()}`);
    console.log(`   📈 Active: ${stats[3]}`);
  }

  // Tenant info
  const tenantBalance = await rewardsToken.balanceOf(tenant1.address);
  console.log(`\n🏢 Tenant (${tenant1.address}):`);
  console.log(`   🆔 Tenant ID: ${tenantId}`);
  console.log(`   💰 ART Balance: ${ethers.formatEther(tenantBalance)}`);
  console.log(`   📊 Commission Rate: ${defaultCommissionRate / 100}%`);
  console.log(`   💸 Min Payout: ${ethers.formatEther(minPayoutAmount)} ART`);

  // Contract info
  console.log(`\n📦 Contract Addresses:`);
  console.log(`   🪙 AffiliateRewardsToken: ${await rewardsToken.getAddress()}`);
  console.log(`   🔗 AffiliateAttribution: ${await affiliateAttribution.getAddress()}`);

  console.log("\n🧪 Test Commands:");
  console.log("   # Check affiliate stats:");
  console.log(`   npx hardhat run scripts/get-affiliate-stats.ts --network ${networkName}`);
  console.log("   # Create more test transactions:");
  console.log(`   npx hardhat run scripts/simulate-transactions.ts --network ${networkName}`);
  console.log("   # Test frontend integration:");
  console.log("   Open the web app and connect with one of the test wallets");

  console.log("\n✨ Test environment setup completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });