-- AlterTable
ALTER TABLE "game_artifact_panels" ADD COLUMN     "videoError" TEXT,
ADD COLUMN     "videoJobId" TEXT,
ADD COLUMN     "videoModel" TEXT,
ADD COLUMN     "videoProvider" TEXT,
ADD COLUMN     "videoStatus" TEXT NOT NULL DEFAULT 'idle',
ADD COLUMN     "videoUrl" TEXT;

-- AlterTable
ALTER TABLE "games" ADD COLUMN     "videoUpsellStatus" TEXT NOT NULL DEFAULT 'idle',
ADD COLUMN     "videoUpsoldAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "game_artifact_panels_videoStatus_updatedAt_idx" ON "game_artifact_panels"("videoStatus", "updatedAt");
