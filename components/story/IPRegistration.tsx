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
  gameMetadataUri?: string;
}

interface IPRegistrationProps {
  game: GameIPMetadata;
  onRegistrationComplete?: (result: IPRegistrationResult) => void | Promise<void>;
}

const ROYALTY_CONFIG = {
  authorShare: 6000,
  creatorShare: 3000,
  platformShare: 1000,
};

export function IPRegistration({ game, onRegistrationComplete }: IPRegistrationProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { data: walletClient } = useWalletClient();

  const [isRegistering, setIsRegistering] = useState(false);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const [result, setResult] = useState<IPRegistrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedLicenseId, setSelectedLicenseId] = useState<bigint>(2n);

  const onStoryNetwork = isOnStoryNetwork(chainId);
  const isRegistered = result !== null;

  const handleSwitchChain = useCallback(async () => {
    if (!switchChain) return;
    setIsSwitchingChain(true);
    setError(null);
    try {
      await switchChain({ chainId: STORY_CHAIN_ID });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to switch network";
      setError(`Could not switch to Story Network (ID: ${STORY_CHAIN_ID}). ${msg}`);
    } finally {
      setIsSwitchingChain(false);
    }
  }, [switchChain]);

  const handleRegisterIP = useCallback(async () => {
    if (!walletClient || !address) {
      setError("Please connect your wallet");
      return;
    }
    if (!onStoryNetwork) {
      setError(`Please switch to Story Network (ID: ${STORY_CHAIN_ID}). Your wallet is on chain ${chainId}.`);
      return;
    }

    setIsRegistering(true);
    setError(null);

    try {
      const storyClient = createStoryClientFromWallet(walletClient);
      if (!storyClient) {
        throw new Error("Failed to initialize Story Protocol client. Check console for details.");
      }

      let metadataUri = game.gameMetadataUri;
      if (!metadataUri) {
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
    } catch (err) {
      console.error("IP Registration error:", err);
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
    } finally {
      setIsRegistering(false);
    }
  }, [walletClient, address, onStoryNetwork, chainId, game, selectedLicenseId, onRegistrationComplete]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      console.error("Failed to copy");
    }
  };

  return (
    <Card className="w-full border border-white/10 bg-black/70 text-white shadow-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <div>
              <CardTitle className="text-lg text-white">Register IP</CardTitle>
              <CardDescription className="text-sm text-white/65">
                Own your creation on Story Protocol
              </CardDescription>
            </div>
          </div>
          {isRegistered && <CheckCircle2 className="h-6 w-6 text-green-500" />}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isRegistered && (
          <>
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm text-white/80">
              Sign with your wallet to register this game as IP on Story Protocol. You retain full ownership.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/65">Royalty split</label>
              <div className="h-3 rounded-full overflow-hidden flex bg-white/10">
                <div className="bg-blue-500 h-full" style={{ width: '60%' }} title="Author 60%" />
                <div className="bg-purple-500 h-full" style={{ width: '30%' }} title="You 30%" />
                <div className="bg-white/45 h-full" style={{ width: '10%' }} title="Platform 10%" />
              </div>
              <div className="flex justify-between text-[11px] text-white/60">
                <span>Author 60%</span><span>You 30%</span><span>Platform 10%</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/65">License type</label>
              <div className="grid gap-1.5">
                {[
                  { id: 2, name: 'Commercial Remix' },
                  { id: 3, name: 'Commercial Use' },
                  { id: 1, name: 'Non-Commercial' },
                ].map((license) => (
                  <label key={license.id}
                    className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer text-sm ${
                      license.id === 2
                        ? 'border-purple-400/60 bg-purple-500/15'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                    }`}>
                    <input type="radio" name="license" value={license.id}
                      checked={selectedLicenseId === BigInt(license.id)}
                      onChange={() => setSelectedLicenseId(BigInt(license.id))}
                      className="h-4 w-4 text-purple-600" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-white">{license.name}</span>
                      {license.id === 2 && (
                        <Badge className="text-[10px] bg-purple-500/20 text-purple-100 border border-purple-400/30">
                          Recommended
                        </Badge>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-amber-500/10 border border-amber-400/30 rounded-lg">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${onStoryNetwork ? 'bg-green-500' : 'bg-amber-500'}`} />
                <span className="text-sm text-amber-100">
                  {onStoryNetwork ? 'Connected to Story Network' : `Switch to Story (chain ${chainId || '?'})`}
                </span>
              </div>
              <Badge variant="outline" className="text-xs border-amber-400/40 text-amber-100">Testnet</Badge>
            </div>

            {error && (
              <div className="rounded-lg border border-red-700/50 bg-red-900/20 p-3 flex gap-2">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-100 text-sm">Registration failed</p>
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            )}

            {!isConnected ? (
              <Button disabled className="w-full" size="lg">
                <Wallet className="mr-2 h-4 w-4" />
                Connect wallet first
              </Button>
            ) : !onStoryNetwork ? (
              <Button onClick={handleSwitchChain}
                disabled={isSwitching || isSwitchingChain}
                className="w-full bg-amber-500 text-black hover:bg-amber-400" size="lg">
                {(isSwitching || isSwitchingChain) ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Switching…</>
                ) : (
                  <><ArrowRightLeft className="mr-2 h-4 w-4" /> Switch to Story Network</>
                )}
              </Button>
            ) : (
              <Button onClick={handleRegisterIP} disabled={isRegistering}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" size="lg">
                {isRegistering ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Awaiting signature…</>
                ) : (
                  <><PenLine className="mr-2 h-4 w-4" /> Sign & register IP</>
                )}
              </Button>
            )}

            <p className="text-xs text-center text-white/55">
              Optional. You can skip and mint on Base without IP registration.
            </p>
          </>
        )}

        {isRegistered && result && (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-700/50 bg-green-900/20 p-4">
              <div className="flex gap-2 mb-1.5">
                <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                <h3 className="font-semibold text-green-100">IP registered!</h3>
              </div>
              <p className="text-sm text-green-300">
                You own this IP on Story Protocol. Others can license derivatives from you.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">IP Asset ID</label>
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-lg p-3">
                <code className="text-sm font-mono text-white/90 flex-1 break-all">{result.ipId}</code>
                <button onClick={() => copyToClipboard(result.ipId, "ipId")}
                  className="p-1.5 hover:bg-white/10 rounded transition-colors">
                  {copiedField === "ipId" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-white/60" />}
                </button>
              </div>
            </div>

            <Button variant="outline" className="w-full" asChild>
              <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer">
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

export function IPRegistrationBadge({ isRegistered, ipId }: { isRegistered: boolean; ipId?: string }) {
  if (!isRegistered) {
    return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700">Register IP</Badge>;
  }
  return (
    <a href={ipId ? getIPAssetExplorerUrl(ipId) : "#"} target="_blank" rel="noopener noreferrer" className="inline-flex">
      <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">✓ IP Registered</Badge>
    </a>
  );
}
