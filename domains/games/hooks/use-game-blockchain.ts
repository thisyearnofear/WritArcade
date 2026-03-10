'use client'

import { useState } from 'react'
import { useWriteContract, useWalletClient, useChainId, useSwitchChain } from 'wagmi'
import { parseEther } from 'viem'
import { useToast } from '@/components/ui/use-toast'
import { getWriterCoinById } from '@/lib/writerCoins'
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

    const handleMintComic = async (panelData: ComicBookFinalePanelData[], metadata?: { nftMetadataUri: string; gameMetadataUri: string; creator: GameCreator; author: GameAuthor }) => {
        setIsMinting(true)
        try {
            const nftMetadata = {
                name: game.title,
                description: game.description,
                image: panelData[0]?.imageUrl || undefined,
                attributes: [
                    { trait_type: 'Genre', value: game.genre },
                    { trait_type: 'Subgenre', value: game.subgenre },
                    { trait_type: 'Difficulty', value: game.difficulty || 'standard' },
                    { trait_type: 'Panels', value: String(panelData.length) },
                ],
                sourceArticle: {
                    url: game.articleUrl || undefined,
                    author: game.authorParagraphUsername || 'Unknown Author',
                    authorWallet: game.authorWallet || undefined,
                    publication: game.publicationName || 'Unknown Publication',
                },
                creator: {
                    wallet: game.creatorWallet || undefined,
                    timestamp: new Date().toISOString(),
                },
                game: {
                    title: game.title,
                    tagline: game.tagline,
                    promptModel: game.promptModel,
                    promptName: game.promptName,
                },
            }

            const body = {
                gameId: game.id,
                gameSlug: game.slug,
                metadata: nftMetadata,
                panels: panelData.length,
                ...(metadata && {
                    nftMetadataUri: metadata.nftMetadataUri,
                    gameMetadataUri: metadata.gameMetadataUri,
                    creator: metadata.creator,
                    author: metadata.author,
                })
            }

            const mintResponse = await fetch('/api/games/mint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            if (!mintResponse.ok) {
                const errorData = await mintResponse.json().catch(() => ({}))
                throw new Error(errorData.error || 'Failed to mint NFT')
            }

            const mintData = await mintResponse.json()

            const confirmResponse = await fetch('/api/games/mint', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId: game.id,
                    transactionHash: mintData.transactionHash || mintData.data?.transactionHash || 'pending',
                    tokenId: mintData.tokenId || mintData.data?.tokenId,
                }),
            })

            if (confirmResponse.ok) {
                const confirmData = await confirmResponse.json()
                if (confirmData.data?.extractedAssetIds?.length) {
                    setExtractedAssetIds(confirmData.data.extractedAssetIds)
                }
            }

            toast({ title: '🎉 NFT minting started!', description: 'Your NFT is being minted on Base.' })
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
