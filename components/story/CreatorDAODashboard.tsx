"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Wallet, Share2, ExternalLink } from "lucide-react";

interface AuthorCreatorDAO {
  authorUsername: string;
  authorWallet: string;
  totalGamesCreated: number;
  totalRoyaltiesEarned: number;
  totalCreatorEarnings: number;
  recentGames: GameDAORecord[];
  groupIpId?: string;
  claimableRewards?: string;
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
  licenseTokenIds?: number[];
}

interface CreatorDAODashboardProps {
  authorUsername: string;
  authorWallet: string;
}

/**
 * Creator DAO Dashboard
 * 
 * Aggregates IP assets and royalty earnings for Paragraph authors
 * who have opted into writersarcade's IP economy.
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
        // Fetch real data from API based on wallet address
        const response = await fetch(`/api/creators/${encodeURIComponent(authorWallet)}/stats`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to load creator stats: ${response.statusText}`);
        }
        
        const apiData = await response.json();
        
        if (apiData.success && apiData.data) {
          setData(apiData.data);
        } else {
          throw new Error(apiData.error || 'No data returned');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load DAO data");
        // Continue showing UI with empty state rather than breaking
      } finally {
        setIsLoading(false);
      }
    };

    if (authorWallet) {
      fetchDAOData();
    }
  }, [authorUsername, authorWallet]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
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
          <p className="text-muted-foreground">No DAO data available</p>
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
          <h1 className="text-3xl font-bold text-foreground">Creator DAO</h1>
          <p className="text-muted-foreground mt-1">For @{data.authorUsername}</p>
        </div>
        <Badge className="text-lg px-3 py-1">Active Creator</Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Games Created */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Games Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-blue-600">{data.totalGamesCreated}</div>
              <p className="text-sm text-muted-foreground">from your articles</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Royalties Earned */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Your Royalties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-green-600">{data.totalRoyaltiesEarned.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">tokens earned</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Ecosystem Volume */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ecosystem Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-purple-600">{totalTokensEarned.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">tokens generated</p>
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
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: "60%" }}></div>
                </div>
              </div>

              {/* Creator Share */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Creators (20%)</span>
                  <span className="text-sm font-bold text-blue-600">
                    {data.totalCreatorEarnings.toLocaleString()} tokens
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: "20%" }}></div>
                </div>
              </div>

              {/* Platform / Treasury Share */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Platform Treasury (20%)</span>
                  <span className="text-sm font-bold text-muted-foreground">
                    {Math.round(data.totalRoyaltiesEarned * 0.25).toLocaleString()} tokens
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-muted-foreground h-2 rounded-full" style={{ width: "20%" }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Group / Royalty Pool Card */}
          <Card>
            <CardHeader>
              <CardTitle>Royalty Pool</CardTitle>
              <CardDescription>EvenSplitGroupPool on Story Protocol</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.groupIpId ? (
                <>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium">Group IP</span>
                    <code className="text-xs text-green-700">{data.groupIpId.slice(0, 10)}...</code>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">Claimable Rewards</span>
                    <span className="font-bold text-blue-600">
                      {data.claimableRewards || "0"} tokens
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No royalty pool group established yet. Games created from your articles will be
                  added to a shared group pool for automated distribution.
                </p>
              )}
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
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
                        <div>
                          <p className="text-sm font-medium">{game.creatorName || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{game.creatorAddress.slice(0, 6)}...</p>
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
                    className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{game.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          by {game.creatorName || game.creatorAddress.slice(0, 6)}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {game.genre}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Your Royalties</p>
                        <p className="font-bold text-green-600">{game.estimatedRoyalties} tokens</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Registered</p>
                        <p className="font-bold">
                          {new Date(game.registeredAt * 1000).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">NFT</p>
                        <p className="font-bold">#{game.baseNFTTokenId || "Unminted"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">License Tokens</p>
                        <p className="font-bold">
                          {game.licenseTokenIds?.length
                            ? game.licenseTokenIds.map((id) => `#${id}`).join(", ")
                            : "—"}
                        </p>
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

        {/* Yield / Royalty Pool Tab */}
        <TabsContent value="yield" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Royalty Pool & Group IP</CardTitle>
              <CardDescription>Collective IP management via EvenSplitGroupPool</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2">
                  Group IP Asset
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                  {data.groupIpId
                    ? `All games are pooled under Group IP ${data.groupIpId.slice(0, 10)}...`
                    : "No group created yet. Create a game to establish your writer's group pool."}
                </p>
                <div className="text-sm text-green-700 dark:text-green-300">
                  <p className="font-semibold">How it works:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Each game is registered as an individual IP Asset</li>
                    <li>All game IPs are added to a writer-specific group</li>
                    <li>Royalties flow into the EvenSplitGroupPool</li>
                    <li>Rewards are evenly distributed to group members</li>
                  </ul>
                </div>
              </div>

              <div className="border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-foreground">Claim Reward</h4>
                  <Badge variant="secondary">
                    {data.claimableRewards || "0"} available
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Claim your share of pooled royalties from the group pool
                </p>
                <Button variant="outline" className="w-full" disabled>
                  Claim from Group Pool
                </Button>
              </div>

              <div className="border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-foreground">Yield Farming (Coming Soon)</h4>
                  <Badge>Future</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Stake your royalty tokens via the IP Account (ERC-6551) to earn additional STORY
                  token rewards. Each IP has its own smart account that can interact with DeFi
                  protocols autonomously.
                </p>
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
            Share writersarcade with your audience to increase game generation
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
