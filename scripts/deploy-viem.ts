import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';

async function deploy() {
  // Load env vars from .env.local
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#\s]+)="?(.*?)"?$/);
      if (match) {
        process.env[match[1]] = match[2];
      }
    });
  }

  const pk = process.env.MEZO_DEPLOYER_PRIVATE_KEY;
  const treasury = process.env.PLATFORM_TREASURY_ADDRESS;
  const musd = process.env.MEZO_TESTNET_MUSD_ADDRESS;

  if (!pk || !treasury || !musd) {
    throw new Error('Missing environment variables');
  }

  const account = privateKeyToAccount(pk as `0x${string}`);

  const client = createWalletClient({
    account,
    transport: http('https://rpc.test.mezo.org'),
  });

  const publicClient = createPublicClient({
    transport: http('https://rpc.test.mezo.org'),
  });

  console.log(`🚀 Deploying from address: ${account.address}`);

  // Load contract artifact
  const artifactPath = path.resolve(process.cwd(), 'out/MezoPaymentSplitter.sol/MezoPaymentSplitter.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  console.log('Sending deployment transaction...');
  const hash = await client.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode.object,
    args: [musd as `0x${string}`, treasury as `0x${string}`],
  });

  console.log(`Transaction Hash: ${hash}`);
  console.log('Waiting for receipt...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  if (receipt.contractAddress) {
    console.log(`✅ Deployed to: ${receipt.contractAddress}`);
    console.log(`➡️ Next, run: ./scripts/deploy-goldsky.sh ${receipt.contractAddress}`);
  } else {
    console.log('❌ Failed to retrieve contract address.');
  }
}

deploy().catch(console.error);
