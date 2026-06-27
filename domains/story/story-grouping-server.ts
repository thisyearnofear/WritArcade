/**
 * Story Protocol Grouping Module — Server-Side
 *
 * Uses the platform wallet to create and manage group IP Assets.
 * The platform pays gas for group operations so users only sign
 * their own IP registration transaction.
 *
 * ENV: STORY_PLATFORM_PRIVATE_KEY (required)
 *      STORY_RPC_URL (optional, defaults to Aeneid)
 */

import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { StoryClient } from "@story-protocol/core-sdk";

const STORY_RPC_URL = process.env.STORY_RPC_URL || "https://aeneid.storyrpc.io";
const EVEN_SPLIT_GROUP_POOL = "0xf96f2c30b41Cb6e0290de43C8528ae83d4f33F89" as const;

const STORY_CHAIN = {
  id: 1315,
  name: "Story Aeneid",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [STORY_RPC_URL] } },
};

/**
 * Get or create a StoryClient using the platform wallet.
 * Singleton pattern — reuses client across calls.
 */
let _platformClient: StoryClient | null = null;
let _platformAccount: `0x${string}` | null = null;

function getPlatformStoryClient(): { client: StoryClient; account: `0x${string}` } {
  if (_platformClient && _platformAccount) {
    return { client: _platformClient, account: _platformAccount };
  }

  const privateKey = process.env.STORY_PLATFORM_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("STORY_PLATFORM_PRIVATE_KEY is not configured");
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  _platformAccount = account.address;

  const transport = http(STORY_RPC_URL);
  const walletClient = createWalletClient({ account, chain: STORY_CHAIN, transport });

  const client = StoryClient.newClient({
    account: walletClient.account,
    transport: http(STORY_RPC_URL),
  });

  _platformClient = client;
  return { client, account: _platformAccount };
}

export type GroupOperationResult =
  | { status: "ok"; groupIpId?: string; txHash: string }
  | { status: "skipped"; reason: string }
  | { status: "error"; error: string };

/**
 * Ensure a writer has a group IP Asset, and add the given game IP to it.
 *
 * 1. If the writer already has a group (storyGroupIpId on User), add the IP to it.
 * 2. If not, create a new group, save the groupIpId to the User record, and add the IP.
 *
 * Runs server-side with the platform wallet paying gas.
 */
export async function ensureGroupForWriter(
  userWalletAddress: string,
  gameIpId: string,
): Promise<GroupOperationResult> {
  if (!process.env.STORY_PLATFORM_PRIVATE_KEY) {
    console.warn('[grouping] STORY_PLATFORM_PRIVATE_KEY not configured — skipping group creation');
    return { status: "skipped", reason: "Platform key not configured" };
  }

  try {
    const { client } = getPlatformStoryClient();

    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findFirst({
      where: { walletAddress: { equals: userWalletAddress, mode: "insensitive" } },
    });

    let groupIpId = user?.storyGroupIpId;

    if (!groupIpId) {
      console.log(`[grouping] Creating group for writer ${userWalletAddress}`);
      const groupResponse = await client.groupClient.registerGroup({
        groupPool: EVEN_SPLIT_GROUP_POOL,
      });
      groupIpId = groupResponse.groupId as string;
      console.log(`[grouping] Group created: ${groupIpId}`);

      try {
        await prisma.user.update({
          where: { walletAddress: userWalletAddress },
          data: { storyGroupIpId: groupIpId },
        });
      } catch (dbError) {
        console.warn(`[grouping] Failed to save groupIpId to user:`, dbError);
      }
    }

    console.log(`[grouping] Adding IP ${gameIpId} to group ${groupIpId}`);
    const addResponse = await client.groupClient.addIpsToGroup({
      groupIpId: groupIpId as `0x${string}`,
      ipIds: [gameIpId as `0x${string}`],
    });

    console.log(`[grouping] IP added to group: ${addResponse.txHash}`);
    return { status: "ok", groupIpId, txHash: addResponse.txHash as string };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Group operation failed";
    console.error(`[grouping] Error: ${message}`);
    return { status: "error", error: message };
  }
}

/**
 * Collect and distribute group royalties for a writer's group.
 */
export async function collectAndDistribute(
  userWalletAddress: string,
  memberIpIds: string[],
): Promise<GroupOperationResult> {
  try {
    const { client } = getPlatformStoryClient();

    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findFirst({
      where: { walletAddress: { equals: userWalletAddress, mode: "insensitive" } },
    });

    if (!user?.storyGroupIpId) {
      return { status: "skipped", reason: "No group IP found for this writer" };
    }

    const response = await client.groupClient.collectAndDistributeGroupRoyalties({
      groupIpId: user.storyGroupIpId as `0x${string}`,
      currencyTokens: [],
      memberIpIds: memberIpIds.map((id) => id as `0x${string}`),
    });

    return { status: "ok", txHash: response.txHash as string };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Distribution failed";
    console.error(`[grouping] collectAndDistribute error: ${message}`);
    return { status: "error", error: message };
  }
}
