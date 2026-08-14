-- Phase 2: persist the locked pre-production still (the native-ratio master
-- frame / through-line object) and the complementary 16:9 wide clip generated
-- from that same still. Both are derived from the one paid "Animate" upsell.
ALTER TABLE "game_artifact_panels"
  ADD COLUMN "videoStillUrl" TEXT,
  ADD COLUMN "videoCompanionUrl" TEXT,
  ADD COLUMN "videoCompanionStatus" TEXT NOT NULL DEFAULT 'idle',
  ADD COLUMN "videoCompanionJobId" TEXT,
  ADD COLUMN "videoCompanionProvider" TEXT,
  ADD COLUMN "videoCompanionError" TEXT,
  ADD COLUMN "videoCompanionPolledAt" TIMESTAMP(3);