/**
 * Story Protocol License Token Service
 *
 * Mint and manage license tokens as tradeable ERC-721s.
 * License tokens represent the right to create derivative works
 * from an IP Asset under specific license terms.
 */

import { Address } from "viem";
import { StoryClient } from "@story-protocol/core-sdk";

export interface MintLicenseTokensInput {
  licensorIpId: Address;
  licenseTermsId: bigint | number;
  receiver: Address;
  amount?: number;
}

export interface MintLicenseTokensResult {
  licenseTokenIds: bigint[];
  txHash: string;
}

export async function mintLicenseTokens(
  client: StoryClient,
  input: MintLicenseTokensInput
): Promise<MintLicenseTokensResult> {
  console.log(`🎫 Minting ${input.amount || 1} license token(s) for IP ${input.licensorIpId}`);

  const response = await client.license.mintLicenseTokens({
    licensorIpId: input.licensorIpId,
    licenseTermsId: input.licenseTermsId,
    receiver: input.receiver,
    amount: input.amount || 1,
  });

  console.log(`✅ License token(s) minted: ${response.txHash}`);

  return {
    licenseTokenIds: (response.licenseTokenIds as bigint[]) || [],
    txHash: response.txHash as string,
  };
}

export async function getLicenseTerms(
  client: StoryClient,
  licenseTermsId: bigint | number
) {
  const terms = await client.license.getLicenseTerms(licenseTermsId);
  return terms;
}
