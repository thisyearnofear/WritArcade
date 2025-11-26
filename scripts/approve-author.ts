/**
 * Approve Author for IP Registration
 * 
 * Whitelists a Paragraph author to have their articles converted to games
 * Registers them with Story Protocol for royalty payments
 * 
 * Usage:
 * npx hardhat run scripts/approve-author.ts --network story-testnet \
 *   --paragraph-username fredwilson \
 *   --wallet-address 0x8626f6940E2eb28930DF11c01840a6F0EA48CcBA \
 *   --royalty-share 6000
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface ApprovalConfig {
  paragraphUsername: string;
  walletAddress: string;
  royaltyShare: number;
  contractAddress: string;
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const config = parseArgs(args);

  // Validate inputs
  if (!config.paragraphUsername || !config.walletAddress || !config.royaltyShare) {
    console.error("❌ Missing required arguments");
    console.error("\nUsage:");
    console.error("  npx hardhat run scripts/approve-author.ts --network story-testnet \\");
    console.error("    --paragraph-username <username> \\");
    console.error("    --wallet-address <address> \\");
    console.error("    --royalty-share <basis-points>");
    console.error("\nExample:");
    console.error("  npx hardhat run scripts/approve-author.ts --network story-testnet \\");
    console.error("    --paragraph-username fredwilson \\");
    console.error("    --wallet-address 0x8626f6940E2eb28930DF11c01840a6F0EA48CcBA \\");
    console.error("    --royalty-share 6000");
    process.exit(1);
  }

  console.log("🔐 Approving Author for IP Registration\n");
  console.log(`📝 Author: @${config.paragraphUsername}`);
  console.log(`👛 Wallet: ${config.walletAddress}`);
  console.log(`💰 Royalty Share: ${config.royaltyShare / 100}%\n`);

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log(`🔑 Using account: ${signer.address}\n`);

  // Load StoryIPAuthor contract
  const storyIPAuthorAddress = config.contractAddress || getDeployedContractAddress();
  if (!storyIPAuthorAddress) {
    console.error("❌ StoryIPAuthor contract not found. Please deploy first:");
    console.error("   npx hardhat run scripts/deploy-story-ip-author.ts --network story-testnet");
    process.exit(1);
  }

  console.log(`📍 StoryIPAuthor Contract: ${storyIPAuthorAddress}\n`);

  const StoryIPAuthor = await ethers.getContractFactory("StoryIPAuthor");
  const contract = StoryIPAuthor.attach(storyIPAuthorAddress);

  try {
    console.log("⏳ Sending approval transaction...");
    const tx = await contract.approveAuthor(
      config.paragraphUsername,
      config.walletAddress,
      config.royaltyShare
    );

    console.log(`📤 Tx hash: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log(`✅ Author approved! Block: ${receipt?.blockNumber}\n`);

    // Verify approval
    const permission = await contract.getAuthorPermission(config.paragraphUsername);
    console.log("✓ Approval verified:");
    console.log(`  - Username: @${permission.paragraphUsername}`);
    console.log(`  - Address: ${permission.authorAddress}`);
    console.log(`  - Royalty: ${permission.royaltyShare / 100}%`);
    console.log(`  - Approved: ${permission.approved}`);
    console.log(`  - Created At: ${new Date(Number(permission.createdAt) * 1000).toISOString()}`);

    // Save approval record
    saveApprovalRecord(config, storyIPAuthorAddress, tx.hash);

    console.log("\n📋 Next Steps:");
    console.log("1. Share WritArcade with this author's audience");
    console.log("2. Monitor IP registrations from their articles");
    console.log("3. Verify royalties flowing correctly");

  } catch (error) {
    console.error("❌ Approval failed:", error);
    process.exit(1);
  }
}

function parseArgs(args: string[]): ApprovalConfig & { contractAddress?: string } {
  const config: any = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--paragraph-username" && i + 1 < args.length) {
      config.paragraphUsername = args[++i];
    } else if (args[i] === "--wallet-address" && i + 1 < args.length) {
      config.walletAddress = args[++i];
    } else if (args[i] === "--royalty-share" && i + 1 < args.length) {
      config.royaltyShare = parseInt(args[++i]);
    } else if (args[i] === "--contract-address" && i + 1 < args.length) {
      config.contractAddress = args[++i];
    }
  }

  return config;
}

function getDeployedContractAddress(): string | null {
  try {
    const deploymentFile = path.join(
      __dirname,
      "../contracts/deployment-story-ip-author.json"
    );
    if (fs.existsSync(deploymentFile)) {
      const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
      return deployment.address;
    }
  } catch (error) {
    // File not found or invalid JSON
  }
  return null;
}

function saveApprovalRecord(
  config: ApprovalConfig,
  contractAddress: string,
  txHash: string
) {
  const approvals = loadApprovals();
  approvals.push({
    paragraphUsername: config.paragraphUsername,
    walletAddress: config.walletAddress,
    royaltyShare: config.royaltyShare,
    contractAddress,
    txHash,
    approvedAt: new Date().toISOString(),
  });

  const approvalsFile = path.join(__dirname, "../contracts/author-approvals.json");
  fs.writeFileSync(approvalsFile, JSON.stringify(approvals, null, 2));
}

function loadApprovals(): any[] {
  try {
    const approvalsFile = path.join(__dirname, "../contracts/author-approvals.json");
    if (fs.existsSync(approvalsFile)) {
      return JSON.parse(fs.readFileSync(approvalsFile, "utf-8"));
    }
  } catch (error) {
    // File doesn't exist or is invalid
  }
  return [];
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
