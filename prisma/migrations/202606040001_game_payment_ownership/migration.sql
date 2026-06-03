ALTER TABLE "games" ADD COLUMN "ownerWallet" TEXT;
ALTER TABLE "games" ADD COLUMN "ownershipSource" TEXT;

ALTER TABLE "payments" ADD COLUMN "walletAddress" TEXT;
ALTER TABLE "payments" ADD COLUMN "chainId" INTEGER;
