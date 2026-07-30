-- CreateEnum
CREATE TYPE "CreditTransactionStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "sourceSnippet" TEXT;

-- AlterTable
ALTER TABLE "games" ADD COLUMN     "approvalStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "articleFidelityScore" DOUBLE PRECISION,
ADD COLUMN     "cdrReadConditionType" TEXT,
ADD COLUMN     "cdrVaultedAt" TIMESTAMP(3),
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hypercertCid" TEXT,
ADD COLUMN     "hypercertUri" TEXT,
ADD COLUMN     "lastPlayedAt" TIMESTAMP(3),
ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'story',
ADD COLUMN     "nftChainId" INTEGER,
ADD COLUMN     "nftContractAddress" TEXT,
ADD COLUMN     "playCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "playFee" TEXT,
ADD COLUMN     "promptVaultUuid" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "secretPanelCiphertext" TEXT,
ADD COLUMN     "secretPanelDataHash" TEXT,
ADD COLUMN     "secretPanelGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "secretPanelImagePrompt" TEXT,
ADD COLUMN     "storyIpId" TEXT,
ADD COLUMN     "storyRegisteredAt" TIMESTAMP(3),
ADD COLUMN     "storyRegistrationTxHash" TEXT,
ADD COLUMN     "superrareContract" TEXT,
ADD COLUMN     "superrareMintedAt" TIMESTAMP(3),
ADD COLUMN     "superrareTokenId" TEXT,
ADD COLUMN     "userWallet" TEXT,
ADD COLUMN     "wordleAnswerVaultUuid" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isCreator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "storyGroupIpId" TEXT,
ADD COLUMN     "totalCreditsPurchased" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "game_play_events" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_play_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_feedbacks" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT,
    "npsScore" INTEGER NOT NULL,
    "npsComment" TEXT,
    "fidelityRating" INTEGER,
    "narrativeQuality" INTEGER,
    "engagementScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "panel_ratings" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "panelIndex" INTEGER NOT NULL,
    "userId" TEXT,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "panel_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "etherfuseOrderId" TEXT,
    "externalRef" TEXT,
    "fiatAmount" INTEGER NOT NULL,
    "fiatCurrency" TEXT NOT NULL DEFAULT 'USD',
    "creditAmount" INTEGER NOT NULL,
    "status" "CreditTransactionStatus" NOT NULL DEFAULT 'pending',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farcaster_notification_tokens" (
    "id" TEXT NOT NULL,
    "fid" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "url" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farcaster_notification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_play_events_gameId_playedAt_idx" ON "game_play_events"("gameId", "playedAt");

-- CreateIndex
CREATE INDEX "game_play_events_playedAt_idx" ON "game_play_events"("playedAt");

-- CreateIndex
CREATE UNIQUE INDEX "game_feedbacks_gameId_userId_createdAt_key" ON "game_feedbacks"("gameId", "userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "panel_ratings_gameId_panelIndex_userId_key" ON "panel_ratings"("gameId", "panelIndex", "userId");

-- CreateIndex
CREATE INDEX "credit_transactions_userId_idx" ON "credit_transactions"("userId");

-- CreateIndex
CREATE INDEX "credit_transactions_etherfuseOrderId_idx" ON "credit_transactions"("etherfuseOrderId");

-- CreateIndex
CREATE INDEX "farcaster_notification_tokens_fid_idx" ON "farcaster_notification_tokens"("fid");

-- CreateIndex
CREATE UNIQUE INDEX "farcaster_notification_tokens_fid_token_key" ON "farcaster_notification_tokens"("fid", "token");

-- AddForeignKey
ALTER TABLE "game_play_events" ADD CONSTRAINT "game_play_events_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_feedbacks" ADD CONSTRAINT "game_feedbacks_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panel_ratings" ADD CONSTRAINT "panel_ratings_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games_from_articles" ADD CONSTRAINT "games_from_articles_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games_from_assets" ADD CONSTRAINT "games_from_assets_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

