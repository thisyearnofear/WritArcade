-- Persist canonical completed game artifacts for public gallery/NFT views.
ALTER TABLE "games"
  ADD COLUMN "nftMetadataUri" TEXT,
  ADD COLUMN "gameMetadataUri" TEXT,
  ADD COLUMN "artifactManifestUri" TEXT,
  ADD COLUMN "artifactSavedAt" TIMESTAMP(3);

CREATE TABLE "game_artifact_panels" (
  "id" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "panelIndex" INTEGER NOT NULL,
  "narrativeText" TEXT NOT NULL,
  "imageUrl" TEXT,
  "imageModel" TEXT,
  "userChoice" TEXT,
  "audioUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "game_artifact_panels_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "game_artifact_panels_gameId_panelIndex_key"
  ON "game_artifact_panels"("gameId", "panelIndex");

CREATE INDEX "game_artifact_panels_gameId_panelIndex_idx"
  ON "game_artifact_panels"("gameId", "panelIndex");

ALTER TABLE "game_artifact_panels"
  ADD CONSTRAINT "game_artifact_panels_gameId_fkey"
  FOREIGN KEY ("gameId") REFERENCES "games"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
