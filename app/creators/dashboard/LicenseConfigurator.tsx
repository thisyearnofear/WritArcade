'use client';

import { useState, useCallback } from 'react';
import { useAccount, useChainId, useSwitchChain, useWalletClient } from 'wagmi';
import { PILFlavor } from '@story-protocol/core-sdk';
import type { WriterCoin } from '@/lib/writerCoins';
import {
    createStoryClientFromWallet,
    isOnStoryNetwork,
    STORY_CHAIN_ID,
} from '@/lib/story-sdk-client';

// WIP token on Story Aeneid testnet — standard currency for PIL terms
const WIP_TOKEN = '0x1514000000000000000000000000000000000000' as const;

export function LicenseConfigurator({ writerCoin }: { writerCoin: WriterCoin }) {
    const [royalty, setRoyalty] = useState(writerCoin.revenueDistribution.writer);
    const [isSaving, setIsSaving] = useState(false);
    const [savedRoyalty, setSavedRoyalty] = useState(writerCoin.revenueDistribution.writer);
    const [licenseTermsId, setLicenseTermsId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain, isPending: isSwitching } = useSwitchChain();
    const { data: walletClient } = useWalletClient();

    const onStoryNetwork = isOnStoryNetwork(chainId);
    const isDirty = royalty !== savedRoyalty;

    const handleSwitchChain = useCallback(async () => {
        if (!switchChain) return;
        setError(null);
        try {
            await switchChain({ chainId: STORY_CHAIN_ID });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to switch network');
        }
    }, [switchChain]);

    const handleSave = useCallback(async () => {
        if (!walletClient || !isConnected) {
            setError('Connect your wallet first');
            return;
        }
        if (!onStoryNetwork) {
            await handleSwitchChain();
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const storyClient = createStoryClientFromWallet(walletClient);
            if (!storyClient) {
                throw new Error('Failed to initialize Story Protocol client. Ensure wallet is on Story Aeneid network.');
            }

            const terms = PILFlavor.commercialRemix({
                defaultMintingFee: 0n,
                commercialRevShare: royalty,
                currency: WIP_TOKEN,
            });

            const response = await storyClient.license.registerPILTerms(terms);

            setSavedRoyalty(royalty);
            setLicenseTermsId(response.licenseTermsId?.toString() ?? null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to register license terms');
        } finally {
            setIsSaving(false);
        }
    }, [walletClient, isConnected, onStoryNetwork, royalty, handleSwitchChain]);

    const buttonLabel = () => {
        if (isSaving) return 'Registering on Story…';
        if (!isConnected) return 'Connect Wallet';
        if (!onStoryNetwork) return 'Switch to Story Network';
        if (!isDirty && licenseTermsId) return `Saved (Terms ID: ${licenseTermsId})`;
        if (!isDirty) return 'No Changes';
        return 'Register License Terms';
    };

    const buttonDisabled = isSaving || isSwitching || (!isDirty && isConnected && onStoryNetwork);

    return (
        <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white">License Terms (Story Protocol)</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                        Configure how your generated games can be remixed and monetized.
                    </p>
                </div>
                <div className="bg-purple-900/30 text-purple-300 px-3 py-1 rounded-full text-xs font-medium border border-purple-500/30">
                    IP Asset Class: Derivative
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Writer Revenue Share (Royalty)
                    </label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="0"
                            max="50"
                            step="1"
                            value={royalty}
                            onChange={(e) => {
                                setRoyalty(Number(e.target.value));
                                setError(null);
                            }}
                            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                        <span className="text-2xl font-bold text-purple-400 w-16 text-right">
                            {royalty}%
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        This percentage is automatically deducted from every game generation and NFT mint.
                    </p>
                </div>

                <div className="bg-muted/50 rounded p-4 text-sm text-muted-foreground">
                    <p className="text-xs text-muted-foreground">
                        Saving registers new PIL Commercial Remix terms on Story Protocol (Aeneid testnet) with your wallet.
                        Actual on-chain revenue splits for generation and minting are configured separately per writer coin.
                    </p>
                </div>

                {licenseTermsId && !isDirty && (
                    <div className="bg-green-900/20 border border-green-500/30 rounded p-3 text-xs text-green-400">
                        ✅ License terms registered — ID: <span className="font-mono">{licenseTermsId}</span>
                    </div>
                )}

                {error && (
                    <div className="bg-red-900/20 border border-red-500/30 rounded p-3 text-xs text-red-400">
                        {error}
                    </div>
                )}

                <div className="pt-4 border-t border-border flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={buttonDisabled}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                            buttonDisabled
                                ? 'bg-muted text-muted-foreground cursor-default'
                                : !isConnected || !onStoryNetwork
                                ? 'bg-amber-500 hover:bg-amber-400 text-white'
                                : 'bg-purple-600 hover:bg-purple-500 text-white'
                        }`}
                    >
                        {buttonLabel()}
                    </button>
                </div>
            </div>
        </div>
    );
}
