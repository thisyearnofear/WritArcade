"use client";

import { useState, useCallback } from "react";
import { useAccount, useChainId, useSwitchChain, useWalletClient } from "wagmi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, Copy, ExternalLink, Wallet, ArrowRightLeft, PenLine } from "lucide-react";
import {
  createStoryClientFromWallet,
  isOnStoryNetwork,
  STORY_CHAIN_ID,
  getIPAssetExplorerUrl
} from "@/lib/story-sdk-client";
import { registerGameAsIP, IPRegistrationResult } from "@/lib/story-protocol.service";
import { uploadToIPFS } from "@/lib/ipfs-utils";
import { Address } from "viem";

// ============================================================================
// Types
// ============================================================================

export interface GameIPMetadata {
  gameId: string;
  title: string;
  description: string;
  articleUrl: string;
  gameCreatorAddress: string;
  authorParagraphUsername: string;
  authorWalletAddress: string;
  genre: "horror" | "comedy" | "mystery";
  difficulty: "easy" | "hard";
  gameMetadataUri?: string; // Optional - will upload if not provided
}

interface IPRegistrationProps {
  game: GameIPMetadata;
  onRegistrationComplete?: (result: IPRegistrationResult) => void | Promise<void>;
}

// Royalty configuration (basis points - divide by 100 for percentage)
const ROYALTY_CONFIG = {
  authorShare: 6000,   // 60%
  creatorShare: 3000,  // 30%
  platformShare: 1000, // 10%
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * IP Registration Component - Client-Side Wallet Signing
 * 
 * Now integrated with useStoryProtocolFlow hook for orchestrated user flow.
 * Can render as:
 * - Card (existing full UI)
 * - Modal (via parent container)
 * - Inline (minimal mode)
 * 
 * Flow:
 * 1. User views value proposition
 * 2. Pre-requisites check (wallet + network)
 * 3. User confirms with context
 * 4. Wallet signature requested
 * 5. Success: show IP details and next steps
 */
export function IPRegistration({ game, onRegistrationComplete }: IPRegistrationProps) {
  // Wallet state from wagmi
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { data: walletClient } = useWalletClient();

  // Component state (legacy for backward compatibility, can be replaced with hook)
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const [result, setResult] = useState<IPRegistrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedLicenseId, setSelectedLicenseId] = useState<bigint>(2n); // Default to Commercial Remix

  // Derived state
  const onStoryNetwork = isOnStoryNetwork(chainId);
  const isRegistered = result !== null;

  // Switch to Story network
  const handleSwitchChain = useCallback(async () => {
    if (!switchChain) return;

    setIsSwitchingChain(true);
    setError(null);

    try {
      await switchChain({ chainId: STORY_CHAIN_ID });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch network");
    } finally {
      setIsSwitchingChain(false);
    }
  }, [switchChain]);

  // Register IP - USER SIGNS THIS TRANSACTION
  const handleRegisterIP = useCallback(async () => {
    if (!walletClient || !address) {
      setError("Please connect your wallet");
      return;
    }

    if (!onStoryNetwork) {
      setError("Please switch to Story network first");
      return;
    }

    setIsRegistering(true);
    setError(null);

    try {
      // 1. Create Story client from user's wallet
      const storyClient = createStoryClientFromWallet(walletClient);
      if (!storyClient) {
        throw new Error("Failed to initialize Story Protocol client");
      }

      // 2. Upload metadata to IPFS if not provided
      let metadataUri = game.gameMetadataUri;
      if (!metadataUri) {
        console.log("📤 Uploading game metadata to IPFS...");
        metadataUri = await uploadToIPFS({
          name: game.title,
          description: game.description,
          external_url: game.articleUrl,
          attributes: [
            { trait_type: "Genre", value: game.genre },
            { trait_type: "Difficulty", value: game.difficulty },
            { trait_type: "Author", value: game.authorParagraphUsername },
          ],
        });
      }

      // 3. Register IP - THIS PROMPTS WALLET SIGNATURE
      console.log("🔏 Requesting wallet signature for IP registration...");
      console.log(`📄 Using license terms ID: ${selectedLicenseId}`);
      const registrationResult = await registerGameAsIP(storyClient, {
        title: game.title,
        description: game.description,
        articleUrl: game.articleUrl,
        gameCreatorAddress: address as Address,
        authorParagraphUsername: game.authorParagraphUsername,
        authorWalletAddress: game.authorWalletAddress as Address,
        genre: game.genre,
        difficulty: game.difficulty,
        gameMetadataUri: metadataUri,
        nftMetadataUri: metadataUri,
        licenseTermsId: selectedLicenseId,
      });

      await onRegistrationComplete?.(registrationResult);
      setResult(registrationResult);

      console.log("✅ IP Registration complete:", registrationResult.ipId);
    } catch (err) {
      console.error("IP Registration error:", err);
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
    } finally {
      setIsRegistering(false);
    }
  }, [walletClient, address, onStoryNetwork, game, selectedLicenseId, onRegistrationComplete]);

  // Copy to clipboard
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Card className="w-full border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Story Protocol branding */}
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <div>
              <CardTitle className="text-lg">Register Your IP</CardTitle>
              <CardDescription className="text-sm">
                Own your creation on Story Protocol
              </CardDescription>
            </div>
          </div>
          {isRegistered && <CheckCircle2 className="h-6 w-6 text-green-500" />}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Pre-Registration: Value Proposition */}
        {!isRegistered && (
          <>
            {/* Ownership Explainer */}
            <div className="bg-white/60 dark:bg-white/5 border border-purple-200 dark:border-purple-700 rounded-xl p-4">
              <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Your Signature = Your Ownership
              </h3>
              <p className="text-sm text-foreground mb-3">
                When you sign this transaction, <strong>YOU</strong> become the on-chain owner of this IP.
                Not us. Your wallet. Your IP.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Registered on Story Protocol blockchain</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Commercial remix license (others can build on your work)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Automatic royalties from derivatives</span>
                </li>
              </ul>
            </div>

            {/* Royalty Distribution Visual */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Royalty Distribution
              </label>
              <div className="h-4 rounded-full overflow-hidden flex bg-muted">
                <div
                  className="bg-blue-500 h-full flex items-center justify-center"
                  style={{ width: `${ROYALTY_CONFIG.authorShare / 100}%` }}
                  title={`Author: ${ROYALTY_CONFIG.authorShare / 100}%`}
                />
                <div
                  className="bg-purple-500 h-full flex items-center justify-center"
                  style={{ width: `${ROYALTY_CONFIG.creatorShare / 100}%` }}
                  title={`Creator: ${ROYALTY_CONFIG.creatorShare / 100}%`}
                />
                <div
                  className="bg-muted-foreground h-full flex items-center justify-center"
                  style={{ width: `${ROYALTY_CONFIG.platformShare / 100}%` }}
                  title={`Platform: ${ROYALTY_CONFIG.platformShare / 100}%`}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  Author 60%
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  You 30%
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                  Platform 10%
                </span>
              </div>
            </div>

            {/* License Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                License Type
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 2, name: 'Commercial Remix', description: 'Others can build on your work and sell derivatives', recommended: true },
                  { id: 3, name: 'Commercial Use', description: 'Others can use your work commercially', recommended: false },
                  { id: 1, name: 'Non-Commercial', description: 'Free to use but no commercial derivatives', recommended: false }
                ].map((license) => (
                  <div
                    key={license.id}
                    className={`relative flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                      license.recommended
                        ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-border hover:border-foreground/20'
                    }`}
                  >
                    <div className="flex items-center h-5">
                      <input
                        type="radio"
                        name="license"
                        value={license.id}
                        checked={selectedLicenseId === BigInt(license.id)}
                        onChange={() => setSelectedLicenseId(BigInt(license.id))}
                        className="h-4 w-4 text-purple-600 border-border focus:ring-purple-500"
                      />
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">
                          {license.name}
                        </span>
                        {license.recommended && (
                          <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {license.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Network Status */}
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${onStoryNetwork ? 'bg-green-500' : 'bg-amber-500'}`} />
                <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  {onStoryNetwork ? 'Connected to Story Network' : 'Switch to Story Network'}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                Testnet
              </Badge>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-100">Registration Failed</p>
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!isConnected ? (
              <Button disabled className="w-full" size="lg">
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet First
              </Button>
            ) : !onStoryNetwork ? (
              <Button
                onClick={handleSwitchChain}
                disabled={isSwitching || isSwitchingChain}
                className="w-full bg-amber-500 hover:bg-amber-600"
                size="lg"
              >
                {(isSwitching || isSwitchingChain) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Switching Network...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Switch to Story Network
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleRegisterIP}
                disabled={isRegistering}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                size="lg"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Awaiting Signature...
                  </>
                ) : (
                  <>
                    <PenLine className="mr-2 h-4 w-4" />
                    Sign & Register IP
                  </>
                )}
              </Button>
            )}

            <p className="text-xs text-center text-muted-foreground">
              This is optional. You can skip and mint on Base without IP registration.
            </p>
          </>
        )}

        {/* Post-Registration: Success State */}
        {isRegistered && result && (
          <div className="space-y-4">
            {/* Success Banner */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
              <div className="flex gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  IP Registration Complete!
                </h3>
              </div>
              <p className="text-sm text-green-800 dark:text-green-200">
                You now own this IP on Story Protocol. Others can license derivatives from you.
              </p>
            </div>

            {/* IP Asset ID */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Your IP Asset ID
              </label>
              <div className="flex items-center gap-2 bg-muted border border-border rounded-lg p-3">
                <code className="text-sm font-mono text-foreground flex-1 break-all">
                  {result.ipId}
                </code>
                <button
                  onClick={() => copyToClipboard(result.ipId, "ipId")}
                  className="p-1.5 hover:bg-muted/80 rounded transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedField === "ipId" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            {/* Transaction Hash */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Transaction
              </label>
              <div className="flex items-center gap-2 bg-muted border border-border rounded-lg p-3">
                <code className="text-xs font-mono text-muted-foreground flex-1 truncate">
                  {result.txHash}
                </code>
                <a
                  href={result.txExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-muted/80 rounded transition-colors"
                  title="View on Explorer"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              </div>
            </div>

            {/* View on Story Protocol */}
            <Button
              variant="outline"
              className="w-full"
              asChild
            >
              <a
                href={result.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View on Story Protocol
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Badge Component (for compact displays)
// ============================================================================

/**
 * Compact IP registration status badge for game cards/previews
 */
export function IPRegistrationBadge({
  isRegistered,
  ipId
}: {
  isRegistered: boolean;
  ipId?: string;
}) {
  if (!isRegistered) {
    return (
      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700">
        Register IP
      </Badge>
    );
  }

  return (
    <a
      href={ipId ? getIPAssetExplorerUrl(ipId) : "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex"
    >
      <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
        ✓ IP Registered
      </Badge>
    </a>
  );
}
