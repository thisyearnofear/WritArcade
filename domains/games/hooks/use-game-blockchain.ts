'use client'

import { useState } from 'react'
import { useWriteContract, useWalletClient, useChainId, useSwitchChain, useAccount } from 'wagmi'
import { parseEther } from 'viem'
import { useToast } from '@/components/ui/use-toast'
import { getWriterCoinById } from '@/lib/writerCoins'
import { CONTRACT_ABIS } from '@/lib/contracts'
import { createStoryClientFromWallet, STORY_CHAIN_ID, STORY_SPG_CONTRACT, isOnStoryNetwork } from '@/lib/story-sdk-client'
import { Game } from '../types'
import { type ComicBookFinalePanelData } from '../components/comic-book-finale'
import { type GameCreator, type GameAuthor } from '@/lib/services/ipfs-metadata.service'

// Mock ABI for V2 functionality
const WRITER_COIN_PAYMENT_ABI = [
    {
        "type": "function",
        "name": "payForGameplay",
        "inputs": [
            { "name": "writerCoin", "type": "address" },
            { "name": "gameCreator", "type": "address" },
            { "name": "amount", "type": "uint256" }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "approve",
        "inputs": [
            { "name": "spender", "type": "address" },
            { "name": "amount", "type": "uint256" }
        ],
        "outputs": [{ "name": "", "type": "bool" }],
        "stateMutability": "nonpayable"
    }
]

const PAYMENT_CONTRACT_ADDRESS = "0xa794b662E103790E44100E4A3240370a5C704209"

export function useGameBlockchain(game: Game) {
    const { toast } = useToast()
    const { writeContractAsync } = useWriteContract()
    const { data: walletClient } = useWalletClient()
    const { address: accountAddress } = useAccount()
    const chainId = useChainId()
    const { switchChain, isPending: isSwitchingChain } = useSwitchChain()

    const [isPaying, setIsPaying] = useState(false)
    const [isMinting, setIsMinting] = useState(false)
    const [isRegisteringDerivative, setIsRegisteringDerivative] = useState(false)
    const [derivativeRegistered, setDerivativeRegistered] = useState(false)
    const [extractedAssetIds, setExtractedAssetIds] = useState<string[]>([])

    const handlePaymentConfirm = async (onSuccess: () => void) => {
        setIsPaying(true)
        try {
            if (!game.playFee) return

            const gameCreator = game.creatorWallet || "0x0000000000000000000000000000000000000000"

            const tx = await writeContractAsync({
                address: PAYMENT_CONTRACT_ADDRESS as `0x${string}`,
                abi: WRITER_COIN_PAYMENT_ABI,
                functionName: 'payForGameplay',
                args: [
                    (getWriterCoinById(game.writerCoinId ?? 'avc')?.address ?? getWriterCoinById('avc')!.address) as `0x${string}`,
                    gameCreator,
                    parseEther(game.playFee)
                ]
            })

            console.log('Payment sent:', tx)
            toast({
                title: "Payment Successful!",
                description: "Insert coin accepted. Game starting...",
            })

            onSuccess()
        } catch (error) {
            console.error('Payment failed', error)
            toast({
                title: "Payment Failed",
                description: "Please ensure you have enough tokens and try again.",
                variant: "destructive"
            })
        } finally {
            setIsPaying(false)
        }
    }

    const handleMintComic = async (_panelData?: ComicBookFinalePanelData[], _metadata?: { nftMetadataUri: string; gameMetadataUri: string; creator: GameCreator; author: GameAuthor }) => {
        if (!accountAddress) {
            toast({ title: 'Wallet not connected', description: 'Connect your wallet to mint.', variant: 'destructive' })
            return
        }

        setIsMinting(true)
        try {
            // 1. POST to get minting payload from server
            const writerCoinId = game.writerCoinId || 'avc'
            const mintResponse = await fetch('/api/games/mint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId: game.id,
                    gameSlug: game.slug,
                    wallet: accountAddress,
                    writerCoinId,
                }),
            })

            if (!mintResponse.ok) {
                const errorData = await mintResponse.json().catch(() => ({}))
                throw new Error(errorData.error || 'Failed to prepare minting')
            }

            const mintData = await mintResponse.json()
            const { contractAddress, metadata: apiMetadata } = mintData.data

            // 2. Build tokenURI as a data URI (no IPFS needed)
            const tokenURI = `data:application/json;base64,${btoa(JSON.stringify(apiMetadata))}`

            // 3. Build metadata tuple for mintGame()
            const authorWallet = (game.authorWallet || '0x0000000000000000000000000000000000000000') as `0x${string}`
            const metadataTuple: [string, `0x${string}`, `0x${string}`, string, string, bigint, string] = [
                game.title,
                accountAddress,
                authorWallet,
                game.genre,
                game.difficulty || 'medium',
                BigInt(Math.floor(Date.now() / 1000)),
                game.imageUrl || '',
            ]

            // 4. Call the contract
            const tx = await writeContractAsync({
                address: contractAddress as `0x${string}`,
                abi: CONTRACT_ABIS.GameNFT,
                functionName: 'mintGame',
                args: [accountAddress, tokenURI, metadataTuple],
            })

            // 5. PATCH with real transaction hash
            const confirmResponse = await fetch('/api/games/mint', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId: game.id,
                    transactionHash: tx,
                    wallet: accountAddress,
                }),
            })

            if (confirmResponse.ok) {
                const confirmData = await confirmResponse.json()
                if (confirmData.data?.extractedAssetIds?.length) {
                    setExtractedAssetIds(confirmData.data.extractedAssetIds)
                }
            }

            toast({ title: '🎉 NFT minted!', description: 'Your comic has been minted on Base.' })
        } catch (error) {
            console.error('Mint failed:', error)
            toast({ title: 'Minting failed', description: error instanceof Error ? error.message : 'Failed to mint comic. Please try again.', variant: 'destructive' })
        } finally {
            setIsMinting(false)
        }
    }

    const handleRegisterDerivativeIp = async () => {
        if (!walletClient || !extractedAssetIds.length) return
        if (!isOnStoryNetwork(chainId)) {
            switchChain({ chainId: STORY_CHAIN_ID })
            return
        }
        setIsRegisteringDerivative(true)
        try {
            const storyClient = createStoryClientFromWallet(walletClient)
            if (!storyClient) throw new Error('Failed to initialize Story Protocol client')

            const parentIpId = game.storyIpId as `0x${string}` | undefined
            if (!parentIpId) throw new Error('Parent game has no Story Protocol IP ID')

            for (const assetId of extractedAssetIds) {
                await storyClient.ipAsset.mintAndRegisterIpAndMakeDerivative({
                    spgNftContract: STORY_SPG_CONTRACT,
                    derivData: {
                        parentIpIds: [parentIpId],
                        licenseTermsIds: [BigInt(1)],
                    },
                    ipMetadata: {
                        ipMetadataURI: `https://writersarcade.vercel.app/api/assets/${assetId}?ipMetadata=true`,
                    },
                })
            }
            setDerivativeRegistered(true)
            toast({ title: '✅ Derivative IP registered', description: 'Asset(s) linked to parent IP on Story Protocol.' })
        } catch (err) {
            toast({ title: 'Derivative IP registration failed', description: err instanceof Error ? err.message : 'Registration failed', variant: 'destructive' })
        } finally {
            setIsRegisteringDerivative(false)
        }
    }

    return {
        isPaying,
        isMinting,
        isRegisteringDerivative,
        derivativeRegistered,
        extractedAssetIds,
        chainId,
        isSwitchingChain,
        handlePaymentConfirm,
        handleMintComic,
        handleRegisterDerivativeIp,
        switchChain,
    }
}
