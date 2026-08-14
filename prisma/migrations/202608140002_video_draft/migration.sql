-- Stage 2: free motion draft (short, cheap clip to validate before the big
-- spend). Mirrors the companion-column pattern; never touches primary/companion.
ALTER TABLE "game_artifact_panels"
  ADD COLUMN "videoDraftUrl" TEXT,
  ADD COLUMN "videoDraftStatus" TEXT NOT NULL DEFAULT 'idle',
  ADD COLUMN "videoDraftJobId" TEXT,
  ADD COLUMN "videoDraftProvider" TEXT,
  ADD COLUMN "videoDraftError" TEXT,
  ADD COLUMN "videoDraftPolledAt" TIMESTAMP(3);