import React, { useEffect, useState } from 'react';
import { PaymentCostService } from '@/domains/payments/services/payment-cost.service';
import { RevenueDistribution } from '@/domains/payments/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface RevenueForecastProps {
  writerCoinId: string;
  action: 'generate-game' | 'mint-game';
}

export function RevenueForecast({ writerCoinId, action }: RevenueForecastProps) {
  const [distribution, setDistribution] = useState<RevenueDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function fetchDist() {
      setLoading(true);
      try {
        const dist = await PaymentCostService.calculateDistribution(writerCoinId, action === 'generate-game' ? 'generate-game' : 'mint-nft');
        setDistribution(dist);
      } catch (error) {
        console.error('Failed to fetch revenue distribution', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDist();
  }, [writerCoinId, action]);

  if (!mounted) return <Skeleton className="w-full h-32 rounded-xl" />;
  if (loading) return <Skeleton className="w-full h-32 rounded-xl" />;
  if (!distribution) return null;

  const cost = PaymentCostService.calculateCostSync(writerCoinId, action === 'generate-game' ? 'generate-game' : 'mint-nft');
  const formatted = PaymentCostService.formatDistribution(distribution, cost.decimals, cost.writerCoinSymbol);

  return (
    <Card className="border-purple-500/30 bg-muted/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Revenue Forecast ({cost.writerCoinSymbol})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Writer</div>
            <div className="text-md font-bold text-green-400">{formatted.writerShare}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Creator</div>
            <div className="text-md font-bold text-blue-400">{formatted.creatorShare}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Platform</div>
            <div className="text-md font-bold text-purple-400">{formatted.platformShare}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
