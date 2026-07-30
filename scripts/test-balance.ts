import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

async function test() {
  const wallet = '0x55A5705453Ee82c742274154136Fce8149597058'
  const rpcUrls = [
    'https://mainnet.base.org',
    'https://base.llamarpc.com',
    'https://base-mainnet.public.blastapi.io'
  ]

  for (const rpc of rpcUrls) {
    console.log(`Testing RPC: ${rpc}`)
    try {
      const client = createPublicClient({
        chain: base,
        transport: http(rpc, { timeout: 10000 }),
      })
      
      const chainId = await client.getChainId()
      console.log(`Chain ID: ${chainId}`)

      const ABI = [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: 'balance', type: 'uint256' }],
        },
      ]

      // Test with AVC token
      const avcAddress = '0x06FC3D5D2369561e28F261148576520F5e49D6ea'
      const balance = await client.readContract({
        address: avcAddress,
        abi: ABI,
        functionName: 'balanceOf',
        args: [wallet],
      })
      console.log(`Balance: ${balance}`)
    } catch (e) {
      console.error(`Error with ${rpc}:`, e)
    }
  }
}

test()
