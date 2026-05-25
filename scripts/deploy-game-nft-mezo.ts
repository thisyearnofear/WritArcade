import { createWalletClient, createPublicClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';

const mezoTestnet = defineChain({
  id: 31611,
  name: 'Mezo Matsnet Testnet',
  nativeCurrency: { name: 'MEZO', symbol: 'MEZO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.test.mezo.org'] },
  },
  blockExplorers: {
    default: { name: 'Mezo Explorer', url: 'https://explorer.test.mezo.org' },
  },
  testnet: true,
});

async function deploy() {
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
  if (!pk) {
    throw new Error('Missing MEZO_DEPLOYER_PRIVATE_KEY');
  }

  const account = privateKeyToAccount(pk as `0x${string}`);

  const client = createWalletClient({
    account,
    chain: mezoTestnet,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain: mezoTestnet,
    transport: http(),
  });

  console.log(`🚀 Deploying GameNFTMezo from: ${account.address}`);

  const artifactPath = path.resolve(process.cwd(), 'contracts/out/GameNFTMezo.sol/GameNFTMezo.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  console.log('Sending deployment transaction...');
  const hash = await client.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode.object,
  });

  console.log(`Transaction Hash: ${hash}`);
  console.log('Waiting for receipt...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.contractAddress) {
    console.log(`✅ GameNFTMezo deployed to: ${receipt.contractAddress}`);
    console.log('');
    console.log('Add to .env.local:');
    console.log(`NEXT_PUBLIC_MEZO_GAME_NFT_ADDRESS=${receipt.contractAddress}`);
  } else {
    console.log('❌ Failed to retrieve contract address.');
  }
}

deploy().catch(console.error);
