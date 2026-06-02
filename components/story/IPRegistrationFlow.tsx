'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Wallet,
  ArrowRightLeft,
  Info,
} from 'lucide-react';
import {
  useStoryProtocolFlow,
  RegistrationFlowContext,
  type IPRegistrationResult,
} from '@/hooks/use-story-protocol-flow';

interface IPRegistrationFlowProps {
  isOpen: boolean;
  context: RegistrationFlowContext;
  onClose: () => void;
  onSuccess?: (result: IPRegistrationResult) => void;
  _onSuccess?: (result: IPRegistrationResult) => void;
}

/**
 * IP Registration Flow Modal
 *
 * Orchestrated flow:
 * 1. Wallet prerequisite check
 * 2. Network prerequisite check
 * 3. User confirmation with Story Protocol context
 * 4. Registration (signature + chain tx)
 * 5. Success with next steps
 */
export function IPRegistrationFlow({
  isOpen,
  context,
  onClose,
  _onSuccess,
}: IPRegistrationFlowProps) {
  const flow = useStoryProtocolFlow(context);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Start flow when modal opens
  const handleOpenChange = (open: boolean) => {
    if (open && flow.state === 'idle') {
      flow.startFlow();
    } else if (!open) {
      flow.reset();
      onClose();
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <div>
              <DialogTitle>Register IP on Story Protocol</DialogTitle>
              <DialogDescription>
                Own your creation as on-chain intellectual property
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* ===== PREREQUISITE CHECKS ===== */}

          {/* Wallet Connection */}
          <Card className="border-blue-200/50 dark:border-blue-900/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-blue-500" />
                  <CardTitle className="text-base">Wallet Connection</CardTitle>
                </div>
                {flow.isConnected ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                )}
              </div>
            </CardHeader>
            {!flow.isConnected && (
              <CardContent className="text-sm text-muted-foreground">
                Connect your wallet to proceed with registration
              </CardContent>
            )}
            {flow.isConnected && (
              <CardContent className="text-sm text-green-600 dark:text-green-400">
                ✓ Connected: {flow.address?.slice(0, 6)}...{flow.address?.slice(-4)}
              </CardContent>
            )}
          </Card>

          {/* Network Selection */}
          {flow.isConnected && (
            <Card
              className={
                flow.onStoryNetwork
                  ? 'border-green-200/50 dark:border-green-900/50'
                  : 'border-amber-200/50 dark:border-amber-900/50'
              }
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-blue-500" />
                    <CardTitle className="text-base">Story Network</CardTitle>
                  </div>
                  {flow.onStoryNetwork ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!flow.onStoryNetwork ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Switch to Story Aeneid Testnet to register your IP
                    </p>
                    <Button
                      onClick={flow.switchToStoryNetwork}
                      disabled={flow.state === 'switching-chain'}
                      className="w-full"
                      size="sm"
                    >
                      {flow.state === 'switching-chain' ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Switching...
                        </>
                      ) : (
                        <>
                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                          Switch to Story Network
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✓ Connected to Story Aeneid Testnet
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* ===== REGISTRATION STEP ===== */}

          {flow.isConnected && flow.onStoryNetwork && !flow.isRegistered && (
            <>
              {/* Value Proposition */}
              <Card className="border-purple-200/50 dark:border-purple-900/50 bg-purple-50/20 dark:bg-purple-950/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <CardTitle className="text-base">What You Get</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">
                      <strong>You own the IP</strong> — registered on Story blockchain
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">
                      <strong>Derivatives allowed</strong> — others can license and remix
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">
                      <strong>Automatic royalties</strong> — earn from derivative works
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Royalty Distribution */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Royalty Distribution
                </label>
                <div className="h-4 rounded-full overflow-hidden flex bg-muted">
                  <div
                    className="bg-blue-500 h-full"
                    style={{ width: '60%' }}
                    title="Author: 60%"
                  />
                  <div className="bg-purple-500 h-full" style={{ width: '30%' }} title="Creator: 30%" />
                  <div className="bg-muted-foreground h-full" style={{ width: '10%' }} title="Platform: 10%" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Author 60%</span>
                  <span>You 30%</span>
                  <span>Platform 10%</span>
                </div>
              </div>

              {/* Error State */}
              {flow.error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900 dark:text-red-100">Error</p>
                    <p className="text-sm text-red-800 dark:text-red-200">{flow.error}</p>
                  </div>
                </div>
              )}

              {/* Progress Indicator */}
              {['uploading', 'signing'].includes(flow.state) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 flex gap-3">
                  <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">{flow.progress.current}</p>
                    {flow.progress.details && (
                      <p className="text-sm text-blue-800 dark:text-blue-200">{flow.progress.details}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <Button
                onClick={
                  flow.state === 'confirming' ? flow.confirmAndProceed : flow.confirmAndProceed
                }
                disabled={['uploading', 'signing'].includes(flow.state) || flow.error !== null}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                size="lg"
              >
                {flow.state === 'signing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Awaiting Signature...
                  </>
                ) : flow.state === 'uploading' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing Metadata...
                  </>
                ) : (
                  <>🔏 Sign & Register IP</>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                This transaction will be signed by your wallet. You are registering your creation as IP.
              </p>
            </>
          )}

          {/* ===== SUCCESS STATE ===== */}

          {flow.isRegistered && flow.result && (
            <>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                <div className="flex gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <h3 className="font-semibold text-green-900 dark:text-green-100">
                    IP Registration Complete!
                  </h3>
                </div>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Your creation is now registered as IP on Story Protocol. Others can discover and
                  license derivatives from you.
                </p>
              </div>

              {/* Royalty Pool Info */}
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                <div className="flex gap-2 mb-1">
                  <span className="text-sm">🏦</span>
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100 text-sm">
                    Royalty Pool Created
                  </h4>
                </div>
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  Your IP has been added to your writer royalty pool. All future games you register will be
                  pooled together — royalties from derivatives flow here and are distributed evenly.
                  Claim anytime from your <strong>Dashboard</strong>.
                </p>
              </div>

              {/* IP Asset ID */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  IP Asset ID
                </label>
                <div className="flex items-center gap-2 bg-muted border border-border rounded-lg p-3">
                  <code className="text-sm font-mono text-foreground flex-1 break-all">
                    {flow.result.ipId}
                  </code>
                  <button
                    onClick={() => copyToClipboard(flow.result!.ipId, 'ipId')}
                    className="p-1.5 hover:bg-muted/80 rounded transition-colors"
                  >
                    {copiedField === 'ipId' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Explorer Link */}
              <Button
                variant="outline"
                className="w-full"
                asChild
              >
                <a
                  href={flow.result.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on Story Protocol
                </a>
              </Button>

              {/* Next Steps */}
              <Card className="border-blue-200/50 dark:border-blue-900/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">What's Next?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    • <strong>Royalty pool active</strong> — Your IP is pooled with other games for even royalty distribution
                  </p>
                  <p>
                    • <strong>License for derivatives</strong> — Others can create remixes and earn you royalties
                  </p>
                  <p>
                    • <strong>Claim from Dashboard</strong> — Collect pooled royalties anytime from your creator dashboard
                  </p>
                </CardContent>
              </Card>

              <Button onClick={onClose} className="w-full" variant="secondary">
                Close
              </Button>
            </>
          )}

          {/* ===== ERROR STATE ===== */}

          {flow.state === 'error' && flow.error && !flow.isRegistered && (
            <>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">Registration Failed</h3>
                <p className="text-sm text-red-800 dark:text-red-200 mb-4">{flow.error}</p>
              </div>

              <div className="flex gap-3">
                <Button onClick={flow.reset} className="flex-1" variant="outline">
                  Try Again
                </Button>
                <Button onClick={onClose} className="flex-1" variant="secondary">
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
