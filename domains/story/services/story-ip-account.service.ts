/**
 * Story Protocol IP Account Service
 *
 * Manages IP Account (ERC-6551) operations for autonomous royalty forwarding,
 * metadata updates, and token transfers from the IP's own account.
 *
 * Each IP Asset has an associated IP Account — a modified ERC-6551 Token Bound Account
 * that can execute transactions, hold tokens, and manage permissions on behalf of the IP.
 */

import { Address, Hex } from "viem";
import { StoryClient } from "@story-protocol/core-sdk";
import { WIP_TOKEN_ADDRESS } from "./story-sdk-client";

export interface TransferErc20Input {
  tokenAddress: Address;
  amount: bigint | number;
  recipient: Address;
}

export async function executeFromIp(
  client: StoryClient,
  ipId: Address,
  to: Address,
  data: Hex,
  value: number = 0
): Promise<string> {
  console.log(`⚙️ Executing transaction from IP Account ${ipId}`);

  const response = await client.ipAccount.execute({
    ipId,
    to,
    value,
    data,
  });

  console.log(`✅ IP Account execution: ${response.txHash}`);
  return response.txHash as string;
}

export async function transferErc20FromIp(
  client: StoryClient,
  ipId: Address,
  tokens: TransferErc20Input[]
): Promise<string> {
  console.log(`💸 Transferring ${tokens.length} token(s) from IP Account ${ipId}`);

  const response = await client.ipAccount.transferErc20({
    ipId,
    tokens: tokens.map((t) => ({
      address: t.tokenAddress,
      amount: t.amount,
      target: t.recipient,
    })),
  });

  console.log(`✅ ERC-20 transfer from IP Account: ${response.txHash}`);
  return response.txHash as string;
}

export async function transferWipFromIp(
  client: StoryClient,
  ipId: Address,
  amount: bigint | number,
  recipient: Address
): Promise<string> {
  return transferErc20FromIp(client, ipId, [
    { tokenAddress: WIP_TOKEN_ADDRESS, amount, recipient },
  ]);
}

export async function setIpMetadata(
  client: StoryClient,
  ipId: Address,
  metadataURI: string,
  metadataHash: Hex
): Promise<string> {
  console.log(`📝 Setting IP metadata for ${ipId}`);

  const response = await client.ipAccount.setIpMetadata({
    ipId,
    metadataURI,
    metadataHash,
  });

  console.log(`✅ IP metadata updated: ${response}`);
  return response;
}

export async function getIpToken(
  client: StoryClient,
  ipId: Address
): Promise<{ chainId: bigint; tokenContract: Address; tokenId: bigint }> {
  const token = await client.ipAccount.getToken(ipId);

  return {
    chainId: token.chainId,
    tokenContract: token.tokenContract as Address,
    tokenId: token.tokenId,
  };
}

export async function getIpAccountNonce(
  client: StoryClient,
  ipId: Address
): Promise<bigint> {
  const nonce = await client.ipAccount.getIpAccountNonce(ipId);
  return typeof nonce === "bigint" ? nonce : BigInt(nonce);
}
