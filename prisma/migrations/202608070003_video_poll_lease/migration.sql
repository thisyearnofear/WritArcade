-- Coordinate provider polling across server instances.
ALTER TABLE "game_artifact_panels"
  ADD COLUMN "videoPolledAt" TIMESTAMP(3);
