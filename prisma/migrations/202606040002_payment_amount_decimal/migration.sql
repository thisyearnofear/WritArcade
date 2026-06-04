ALTER TABLE "payments" ALTER COLUMN "amount" TYPE DECIMAL(78,0) USING "amount"::numeric;
