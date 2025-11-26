"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Users, Wallet, Share2, ExternalLink } from "lucide-react";

interface AuthorCreatorDAO {
  authorUsername: string;
  authorWallet: string;
  totalGamesCreated: number;
  totalRoyaltiesEarned: number;
  totalCreatorEarnings: number;
  recentGames: GameDAORecord[];
}

interface GameDAORecord {
  gameId: string;
  title: string;
  genre: "horror" | "comedy" | "mystery";
  creatorAddress: string;
  creatorName?: string;
  storyIPAssetId: string;
  registeredAt: number;
  estimatedRoyalties: number;
  baseNFTTokenId?: number;
}

interface CreatorDAODashboardProps {
  authorUsername: string;
  authorWallet: string;
}

/**
 * Creator DAO Dashboard
 * 
 * Aggregates IP assets and royalty earnings for Paragraph authors
 * who have opted into WritArcade's IP economy.
 * 
 * Shows:
 * - Total games created from author's articles
 * - Royalty tracking (60% author share)
 * - Creator DAO treasury
 * - Recent games + earnings
 * - Yield farming opportunities
 */
export function CreatorDAODashboard({ authorUsername, authorWallet }: CreatorDAODashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<AuthorCreatorDAO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("overview");

  useEffect(() => {
    const fetchDAOData = async () => {
      try {
        setIsLoading(true);
        // In production, this would fetch from your API
        // For now, return mock data for demonstration
        const mockData: AuthorCreatorDAO = {
          authorUsername: authorUsername,
          authorWallet: authorWallet,
          totalGamesCreated: 12,
          totalRoyaltiesEarned: 2400, // 60% of 4000 tokens earned
          totalCreatorEarnings: 1600, // 30% of 4000 tokens earned
          recentGames: [
            {
              gameId: "game-001",
              title: "The Future of AI",
              genre: "mystery",
              creatorAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f42bA",
              creatorName: "Alice",
              storyIPAssetId: "story-ip-001",
              registeredAt: Math.floor(Date.now() / 1000) - 86400,
              estimatedRoyalties: 250,
              baseNFTTokenId: 1,
            },
            {
              gameId: "game-002",
              title: "Web3 Lessons",
              genre: "comedy",
              creatorAddress: "0x8626f6940E2eb28930DF11c01840a6F0EA48CcBA",
              creatorName: "Bob",
              storyIPAssetId: "story-ip-002",
              registeredAt: Math.floor(Date.now() / 1000) - 172800,
              estimatedRoyalties: 200,
              baseNFTTokenId: 2,
            },
            {
              gameId: "game-003",
              title: "Startup Lessons",
              genre: "horror",
              creatorAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f42bA",
              creatorName: "Alice",
              storyIPAssetId: "story-ip-003",
              registeredAt: Math.floor(Date.now() / 1000) - 259200,
              estimatedRoyalties: 150,
              baseNFTTokenId: 3,
            },
          ],
        };
        setData(mockData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load DAO data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDAOData();
  }, [authorUsername, authorWallet]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-red-600">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <p className="text-gray-500">No DAO data available</p>
        </CardContent>
      </Card>
    );
  }

  const totalTokensEarned = data.totalRoyaltiesEarned + data.totalCreatorEarnings;

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Creator DAO</h1>
          <p className="text-gray-500 mt-1">For @{data.authorUsername}</p>
        </div>
        <Badge className="text-lg px-3 py-1">Active Creator</Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Games Created */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Games Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-blue-600">{data.totalGamesCreated}</div>
              <p className="text-sm text-gray-500">from your articles</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Royalties Earned */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Your Royalties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-green-600">{data.totalRoyaltiesEarned.toLocaleString()}</div>
              <p className="text-sm text-gray-500">tokens earned</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Ecosystem Volume */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Ecosystem Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-purple-600">{totalTokensEarned.toLocaleString()}</div>
              <p className="text-sm text-gray-500">tokens generated</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1">
            <TrendingUp className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="games" className="flex-1">
            <Share2 className="w-4 h-4 mr-2" />
            Games
          </TabsTrigger>
          <TabsTrigger value="yield" className="flex-1">
            <Wallet className="w-4 h-4 mr-2" />
            Yield Farming
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Breakdown</CardTitle>
              <CardDescription>How your royalties are distributed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Author Share */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Your Share (60%)</span>
                  <span className="text-sm font-bold text-green-600">
                    {data.totalRoyaltiesEarned.toLocaleString()} tokens
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: "60%" }}></div>
                </div>
              </div>

              {/* Creator Share */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Creators (30%)</span>
                  <span className="text-sm font-bold text-blue-600">
                    {data.totalCreatorEarnings.toLocaleString()} tokens
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: "30%" }}></div>
                </div>
              </div>

              {/* Platform Share */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Platform (10%)</span>
                  <span className="text-sm font-bold text-gray-600">
                    {Math.round(totalTokensEarned * 0.1).toLocaleString()} tokens
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gray-500 h-2 rounded-full" style={{ width: "10%" }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Creators</CardTitle>
              <CardDescription>Who's building on your content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...new Map(data.recentGames.map(g => [g.creatorAddress, g])).values()]
                  .sort((a, b) => b.estimatedRoyalties - a.estimatedRoyalties)
                  .slice(0, 5)
                  .map((game) => (
                    <div
                      key={game.creatorAddress}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
                        <div>
                          <p className="text-sm font-medium">{game.creatorName || "Unknown"}</p>
                          <p className="text-xs text-gray-500">{game.creatorAddress.slice(0, 6)}...</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{game.estimatedRoyalties} tokens</Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Games Tab */}
        <TabsContent value="games" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Games</CardTitle>
              <CardDescription>Games created from your articles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentGames.map((game) => (
                  <div
                    key={game.gameId}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{game.title}</h3>
                        <p className="text-sm text-gray-500">
                          by {game.creatorName || game.creatorAddress.slice(0, 6)}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {game.genre}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                      <div>
                        <p className="text-gray-500">Your Royalties</p>
                        <p className="font-bold text-green-600">{game.estimatedRoyalties} tokens</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Registered</p>
                        <p className="font-bold">
                          {new Date(game.registeredAt * 1000).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">NFT</p>
                        <p className="font-bold">#{game.baseNFTTokenId || "Unminted"}</p>
                      </div>
                    </div>

                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View IP on Story Protocol
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Yield Farming Tab */}
        <TabsContent value="yield" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Yield Farming on Story</CardTitle>
              <CardDescription>Stake your royalty tokens to earn additional rewards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Coming Soon</h3>
                <p className="text-sm text-blue-800">
                  When Story Protocol launches native yield farming, you'll be able to stake your
                  royalty tokens here to earn additional rewards.
                </p>
              </div>

              <div className="space-y-3">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">Royalty Token Staking</h4>
                    <Badge>Coming Q1 2026</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Stake your {data.totalRoyaltiesEarned} royalty tokens
                  </p>
                  <p className="text-sm text-gray-500">
                    Expected APY: 5-10% in STORY token (estimated)
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">Creator DAO Treasury</h4>
                    <Badge>Coming Q1 2026</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Pool royalties with other creators for better yields
                  </p>
                  <p className="text-sm text-gray-500">
                    Governance token: TBD (Community decides)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Call to Action */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">Maximize Your Earnings</CardTitle>
          <CardDescription>
            Share WritArcade with your audience to increase game generation
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button className="flex-1">Share with Audience</Button>
          <Button variant="outline" className="flex-1">
            View Referral Stats
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
