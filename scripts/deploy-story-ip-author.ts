/**
 * Deploy StoryIPAuthor Contract
 * 
 * Deploys the StoryIPAuthor contract to Story Protocol testnet/mainnet
 * This contract manages author permissions for IP registration
 * 
 * Usage:
 * npx hardhat run scripts/deploy-story-ip-author.ts --network story-testnet
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Deploying StoryIPAuthor contract...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`📍 Deploying from: ${deployer.address}`);
  console.log(`⛽ Network: ${(await ethers.provider.getNetwork()).name}\n`);

  // Deploy contract
  const StoryIPAuthor = await ethers.getContractFactory("StoryIPAuthor");
  const storyIPAuthor = await StoryIPAuthor.deploy(deployer.address);
  await storyIPAuthor.waitForDeployment();

  const contractAddress = await storyIPAuthor.getAddress();
  console.log(`✅ StoryIPAuthor deployed to: ${contractAddress}\n`);

  // Save deployment info
  const deploymentInfo = {
    contract: "StoryIPAuthor",
    address: contractAddress,
    deployer: deployer.address,
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployedAt: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
  };

  // Save to file
  const deploymentDir = path.join(__dirname, "../contracts");
  const deploymentFile = path.join(deploymentDir, "deployment-story-ip-author.json");

  // Create directory if it doesn't exist
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Deployment info saved to: ${deploymentFile}`);

  // Log setup instructions
  console.log("\n📋 Next Steps:\n");
  console.log("1. Update your .env.local with:");
  console.log(`   STORY_IP_AUTHOR_ADDRESS="${contractAddress}"`);
  console.log("\n2. Approve the first author (example - Fred Wilson from AVC):");
  console.log("   npx hardhat run scripts/approve-author.ts --network story-testnet");
  console.log("\n3. Test IP registration:");
  console.log("   npm run test -- story-protocol");
  console.log("\n4. View on Story Explorer:");
  const network = (await ethers.provider.getNetwork()).name;
  const explorer = network === "story-testnet"
    ? "https://testnet-explorer.story.foundation"
    : "https://explorer.story.foundation";
  console.log(`   ${explorer}/address/${contractAddress}`);

  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
