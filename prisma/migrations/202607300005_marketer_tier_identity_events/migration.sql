-- Marketer tier v1: no-wallet identity + resonance event log
-- All statements are additive / DROP NOT NULL — no data rewrite, no backfill.

-- AlterTable: users — wallet becomes optional; email + guestKey identities
ALTER TABLE "users" ALTER COLUMN "walletAddress" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN     "email" TEXT,
ADD COLUMN     "guestKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_guestKey_key" ON "users"("guestKey");

-- Invariant: every user has at least one identity key
ALTER TABLE "users" ADD CONSTRAINT "users_identity_check"
CHECK ("walletAddress" IS NOT NULL OR "email" IS NOT NULL OR "guestKey" IS NOT NULL);

-- AlterTable: game_play_events — resonance event log
-- default 'completed' keeps all legacy rows semantically correct
ALTER TABLE "game_play_events" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'completed',
ADD COLUMN     "sessionId" TEXT,
ADD COLUMN     "panelIndex" INTEGER,
ADD COLUMN     "choiceIndex" INTEGER,
ADD COLUMN     "choiceText" TEXT,
ADD COLUMN     "referrer" TEXT,
ADD COLUMN     "embedded" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "game_play_events_gameId_type_playedAt_idx" ON "game_play_events"("gameId", "type", "playedAt");
