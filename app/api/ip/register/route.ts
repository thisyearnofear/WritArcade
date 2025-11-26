import { NextRequest, NextResponse } from "next/server";
import { registerGameAsIP, IPRegistrationInput } from "@/lib/story-protocol.service";
import { prisma } from "@/lib/database";
import { Address } from "viem";

/**
 * POST /api/ip/register
 * 
 * Register a generated game as an IP asset on Story Protocol
 * 
 * Request body:
 * {
 *   gameId: string,                         // WritArcade game ID (from database)
 *   title: string,                          // Game title
 *   description: string,                    // Game description
 *   articleUrl: string,                     // Original article URL
 *   gameCreatorAddress: string,             // Wallet address of user (hex)
 *   authorParagraphUsername: string,        // e.g. "fredwilson"
 *   authorWalletAddress: string,            // Author's wallet (hex)
 *   genre: "horror" | "comedy" | "mystery", // Game genre
 *   difficulty: "easy" | "hard",            // Game difficulty
 *   gameMetadataUri: string                 // IPFS URI to game JSON metadata
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   storyIPAssetId: string,
 *   txHash: string,
 *   registeredAt: number,
 *   royaltyConfig: { authorShare, creatorShare, platformShare }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      "gameId",
      "title",
      "description",
      "articleUrl",
      "gameCreatorAddress",
      "authorParagraphUsername",
      "authorWalletAddress",
      "genre",
      "difficulty",
      "gameMetadataUri",
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate genre and difficulty
    const validGenres = ["horror", "comedy", "mystery"];
    const validDifficulties = ["easy", "hard"];

    if (!validGenres.includes(body.genre)) {
      return NextResponse.json(
        { error: "Invalid genre. Must be: horror, comedy, or mystery" },
        { status: 400 }
      );
    }

    if (!validDifficulties.includes(body.difficulty)) {
      return NextResponse.json(
        { error: "Invalid difficulty. Must be: easy or hard" },
        { status: 400 }
      );
    }

    // Validate addresses
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(body.gameCreatorAddress)) {
      return NextResponse.json(
        { error: "Invalid gameCreatorAddress format" },
        { status: 400 }
      );
    }

    if (!addressRegex.test(body.authorWalletAddress)) {
      return NextResponse.json(
        { error: "Invalid authorWalletAddress format" },
        { status: 400 }
      );
    }

    // Prepare registration input
    const registrationInput: IPRegistrationInput = {
      title: body.title,
      description: body.description,
      articleUrl: body.articleUrl,
      gameCreatorAddress: body.gameCreatorAddress as Address,
      authorParagraphUsername: body.authorParagraphUsername,
      authorWalletAddress: body.authorWalletAddress as Address,
      genre: body.genre,
      difficulty: body.difficulty,
      gameMetadataUri: body.gameMetadataUri,
    };

    // Register IP on Story Protocol
    const registrationResult = await registerGameAsIP(registrationInput);

    // Update game record with Story IP Asset ID
    const game = await prisma.game.findUnique({
      where: { id: body.gameId },
    });

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    // Store IP registration metadata in database
    // For now, we'll extend the game record with story IP info
    // In a full implementation, you'd have a separate StoryIPAsset table
    const updatedGame = await prisma.game.update({
      where: { id: body.gameId },
      data: {
        // Store as JSON if your schema allows, or create separate table
        // For this MVP, we'll log it but recommend adding a StoryIPAsset model
      },
    });

    return NextResponse.json({
      success: true,
      storyIPAssetId: registrationResult.storyIPAssetId,
      txHash: registrationResult.txHash,
      registeredAt: registrationResult.registeredAt,
      royaltyConfig: registrationResult.royaltyConfig,
      message: "Game successfully registered as IP on Story Protocol",
    });
  } catch (error) {
    console.error("IP registration error:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("STORY_RPC_URL")) {
        return NextResponse.json(
          {
            error: "Story Protocol is not configured. Please set STORY_RPC_URL.",
          },
          { status: 503 }
        );
      }

      if (error.message.includes("Author not approved")) {
        return NextResponse.json(
          {
            error: "This author is not approved for IP registration on Story.",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error: `IP registration failed: ${error.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "IP registration failed: Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ip/register?storyIPAssetId=...
 * 
 * Get details about a registered IP asset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storyIPAssetId = searchParams.get("storyIPAssetId");

    if (!storyIPAssetId) {
      return NextResponse.json(
        { error: "Missing storyIPAssetId parameter" },
        { status: 400 }
      );
    }

    // In a full implementation, fetch from database or Story Protocol
    // For now, return placeholder
    return NextResponse.json({
      success: true,
      message: "IP asset details would be retrieved from Story Protocol here",
      storyIPAssetId,
    });
  } catch (error) {
    console.error("Error retrieving IP asset:", error);
    return NextResponse.json(
      { error: "Failed to retrieve IP asset" },
      { status: 500 }
    );
  }
}
