-- Persist the selected motion style so fallback jobs preserve the user's choice.
ALTER TABLE "game_artifact_panels"
  ADD COLUMN "videoStyle" TEXT;
