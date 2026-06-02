/**
 * Story Protocol Grouping Module Service
 *
 * Manages Group IP Assets and EvenSplitGroupPool for on-chain royalty distribution.
 * Replaces custom 60/20/20 revenue split with Story-native group pools.
 */

import { Address } from "viem";
import { StoryClient } from "@story-protocol/core-sdk";
import { WIP_TOKEN_ADDRESS } from "./story-sdk-client";

const EVEN_SPLIT_GROUP_POOL = "0xf96f2c30b41Cb6e0290de43C8528ae83d4f33F89" as const;

export interface CreateGroupResult {
  groupId: string;
  txHash: string;
}

export interface GroupMember {
  ipId: Address;
  sharePercentage: number;
}

export interface CollectAndDistributeResult {
  txHash: string;
  collected: { ipId: string; amount: string; token: string }[];
}

export async function createGroupForWriter(
  client: StoryClient,
  groupPool: Address = EVEN_SPLIT_GROUP_POOL
): Promise<CreateGroupResult> {
  console.log(`🏗️ Creating group IP with pool ${groupPool}`);

  const response = await client.groupClient.registerGroup({
    groupPool,
  });

  console.log(`✅ Group IP created: ${response.groupId} (tx: ${response.txHash})`);

  return {
    groupId: response.groupId as string,
    txHash: response.txHash as string,
  };
}

export async function addIpsToGroup(
  client: StoryClient,
  groupIpId: Address,
  memberIpIds: Address[]
): Promise<string> {
  console.log(`➕ Adding ${memberIpIds.length} IP(s) to group ${groupIpId}`);

  const response = await client.groupClient.addIpsToGroup({
    groupIpId,
    ipIds: memberIpIds,
  });

  console.log(`✅ IPs added to group: ${response.txHash}`);
  return response.txHash as string;
}

export async function registerGameAndAddToGroup(
  client: StoryClient,
  groupIpId: Address,
  ipRegistrationRequest: Parameters<typeof client.groupClient.mintAndRegisterIpAndAttachLicenseAndAddToGroup>[0]
): Promise<{ ipId: string; txHash: string }> {
  const response = await client.groupClient.mintAndRegisterIpAndAttachLicenseAndAddToGroup(ipRegistrationRequest);

  return {
    ipId: response.ipId as string,
    txHash: response.txHash as string,
  };
}

export async function collectAndDistributeGroupRoyalties(
  client: StoryClient,
  groupIpId: Address,
  memberIpIds: Address[],
  currencyTokens: Address[] = [WIP_TOKEN_ADDRESS]
): Promise<CollectAndDistributeResult> {
  console.log(`💰 Collecting and distributing group royalties for ${groupIpId}`);

  const response = await client.groupClient.collectAndDistributeGroupRoyalties({
    groupIpId,
    currencyTokens,
    memberIpIds,
  });

  const collected = (response.collectedRoyalties || []).map((r: any) => ({
    ipId: r.ipId as string,
    amount: r.amount?.toString() || "0",
    token: r.token as string,
  }));

  console.log(`✅ Group royalties distributed: ${response.txHash}`);

  return {
    txHash: response.txHash as string,
    collected,
  };
}

export async function getClaimableRewards(
  client: StoryClient,
  groupIpId: Address,
  currencyToken: Address,
  memberIpIds: Address[]
): Promise<bigint[]> {
  console.log(`🔍 Checking claimable rewards for group ${groupIpId}`);

  const rewards = await client.groupClient.getClaimableReward({
    groupIpId,
    currencyToken,
    memberIpIds,
  });

  return rewards;
}

export async function claimGroupReward(
  client: StoryClient,
  groupIpId: Address,
  currencyToken: Address,
  memberIpIds: Address[]
): Promise<string> {
  console.log(`🏆 Claiming group reward for ${groupIpId}`);

  const response = await client.groupClient.claimReward({
    groupIpId,
    currencyToken,
    memberIpIds,
  });

  return response.txHash as string;
}

export async function removeIpsFromGroup(
  client: StoryClient,
  groupIpId: Address,
  ipIds: Address[]
): Promise<string> {
  console.log(`➖ Removing ${ipIds.length} IP(s) from group ${groupIpId}`);

  const response = await client.groupClient.removeIpsFromGroup({
    groupIpId,
    ipIds,
  });

  return response.txHash as string;
}

export { EVEN_SPLIT_GROUP_POOL };
