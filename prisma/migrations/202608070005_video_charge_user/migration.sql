-- Preserve the charged user independently of game ownership metadata.
ALTER TABLE "games"
  ADD COLUMN "videoPaymentUserId" TEXT;
