"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, Copy } from "lucide-react";

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
  gameMetadataUri: string;
}

interface IPRegistrationProps {
  game: GameIPMetadata;
  onRegistrationComplete?: (result: IPRegistrationResult) => void;
}

interface IPRegistrationResult {
  storyIPAssetId: string;
  txHash: string;
  registeredAt: number;
  royaltyConfig: {
    authorShare: number;
    creatorShare: number;
    platformShare: number;
  };
}

/**
 * IP Registration Component
 * 
 * Allows users to register their generated games as IP assets on Story Protocol.
 * Shows:
 * - Registration status
 * - Story IP Asset ID
 * - Royalty configuration (60% author, 30% creator, 10% platform)
 * - Transaction hash
 */
export function IPRegistration({ game, onRegistrationComplete }: IPRegistrationProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IPRegistrationResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleRegisterIP = async () => {
    setIsRegistering(true);
    setError(null);

    try {
      const response = await fetch("/api/ip/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId: game.gameId,
          title: game.title,
          description: game.description,
          articleUrl: game.articleUrl,
          gameCreatorAddress: game.gameCreatorAddress,
          authorParagraphUsername: game.authorParagraphUsername,
          authorWalletAddress: game.authorWalletAddress,
          genre: game.genre,
          difficulty: game.difficulty,
          gameMetadataUri: game.gameMetadataUri,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to register IP");
      }

      const data = await response.json();
      setResult(data);
      setIsRegistered(true);
      onRegistrationComplete?.(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    } finally {
      setIsRegistering(false);
    }
  };

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
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Register as Story Protocol IP</CardTitle>
            <CardDescription>
              Make your game a tradeable IP asset with built-in royalty distribution
            </CardDescription>
          </div>
          {isRegistered && <CheckCircle2 className="h-6 w-6 text-green-500" />}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Section */}
        {!isRegistered ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What happens when you register?</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Your game becomes a Story Protocol IP asset</li>
                <li>Royalty tokens are minted for each recipient</li>
                <li>Can be traded/licensed on secondary markets</li>
                <li>Revenue automatically split: 60% author, 30% creator, 10% platform</li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Registration Failed</p>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

            <Button
              onClick={handleRegisterIP}
              disabled={isRegistering}
              className="w-full"
              size="lg"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering IP...
                </>
              ) : (
                "Register as Story Protocol IP"
              )}
            </Button>
          </div>
        ) : null}

        {/* Success State */}
        {isRegistered && result && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                <h3 className="font-semibold text-green-900">IP Registration Complete!</h3>
              </div>
              <p className="text-sm text-green-800">
                Your game is now registered as a Story Protocol IP asset
              </p>
            </div>

            {/* IP Asset ID */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Story IP Asset ID</label>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <code className="text-sm font-mono text-gray-900 flex-1 break-all">
                  {result.storyIPAssetId}
                </code>
                <button
                  onClick={() => copyToClipboard(result.storyIPAssetId, "ipAssetId")}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedField === "ipAssetId" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Transaction Hash */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Transaction Hash</label>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <code className="text-sm font-mono text-gray-900 flex-1 break-all">
                  {result.txHash}
                </code>
                <button
                  onClick={() => copyToClipboard(result.txHash, "txHash")}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedField === "txHash" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Royalty Configuration */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Royalty Distribution</label>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">Article Author</span>
                  <Badge variant="secondary">
                    {(result.royaltyConfig.authorShare / 100).toFixed(0)}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">Game Creator (You)</span>
                  <Badge variant="secondary">
                    {(result.royaltyConfig.creatorShare / 100).toFixed(0)}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">Platform</span>
                  <Badge variant="secondary">
                    {(result.royaltyConfig.platformShare / 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-amber-900 mb-2">Next Steps</h3>
              <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
                <li>View your IP asset on Story Protocol dashboard</li>
                <li>Mint your game as an NFT on Base (optional)</li>
                <li>Share your game with the community</li>
                <li>Earn royalties from secondary sales</li>
              </ol>
            </div>

            {/* Story Protocol Link */}
            <Button
              variant="outline"
              className="w-full"
              asChild
            >
              <a
                href={`https://story.foundation/ip/${result.storyIPAssetId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Story Protocol →
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact version for game cards/previews
 */
export function IPRegistrationBadge({ isRegistered, storyIPAssetId }: { isRegistered: boolean; storyIPAssetId?: string }) {
  if (!isRegistered) {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        Not Registered
      </Badge>
    );
  }

  return (
    <Badge className="bg-green-100 text-green-800 border-green-300">
      ✓ Story IP Registered
    </Badge>
  );
}
