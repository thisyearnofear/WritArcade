-- Durable product funnel analytics, separate from gameplay resonance events.
CREATE TABLE "product_analytics_events" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "properties" JSONB,
    "path" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_analytics_events_event_occurredAt_idx"
  ON "product_analytics_events"("event", "occurredAt");

CREATE INDEX "product_analytics_events_occurredAt_idx"
  ON "product_analytics_events"("occurredAt");
