-- Make post-acceptance video refunds idempotent.
ALTER TABLE "games"
  ADD COLUMN "videoPaymentRef" TEXT,
  ADD COLUMN "videoChargeRefundedAt" TIMESTAMP(3);
