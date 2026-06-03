'use client'

import { useState } from 'react'
import { useWriteContract, useWalletClient, useChainId, useSwitchChain, useAccount } from 'wagmi'
import { parseEther, encodeFunctionData, maxUint256 } from 'viem'
import { useToast } from '@/components/ui/use-toast'
import { getWriterCoinById } from '@/lib/writerCoins'
import { CONTRACT_ABIS } from '@/lib/contracts'
import { createStoryClientFromWallet, STORY_CHAIN_ID, STORY_SPG_CONTRACT, isOnStoryNetwork, LICENSE_TERMS_ID_COMMERCIAL_REMIX } from '@/lib/story-sdk-client'
import { BASE_MAINNET_CHAIN_ID } from '@/lib/chains'
import { Game } from '../types'
import { type ComicBookFinalePanelData } from '../components/comic-book-finale'
import { type GameCreator, type GameAuthor } from '@/lib/services/ipfs-metadata.service'

// ABI for gameplay payments (legacy V1 contract)
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

// ABI for WriterCoinPayment.payAndMintGame (Base mainnet)
// This contract has MINTER_ROLE on GameNFT, so it can mint on behalf of users
const WRITER_COIN_PAYMENT_ABI_V2 = [
    {
        "type": "function",
        "name": "payAndMintGame",
        "inputs": [
            { "name": "writerCoin", "type": "address" },
            { "name": "tokenURI", "type": "string" },
            {
                "name": "metadata",
                "type": "tuple",
                "components": [
                    { "name": "articleUrl", "type": "string" },
                    { "name": "creator", "type": "address" },
                    { "name": "writerCoin", "type": "address" },
                    { "name": "genre", "type": "string" },
                    { "name": "difficulty", "type": "string" },
                    { "name": "createdAt", "type": "uint256" },
                    { "name": "gameTitle", "type": "string" }
                ]
            }
        ],
        "outputs": [{ "name": "tokenId", "type": "uint256" }],
        "stateMutability": "nonpayable"
    }
]

// ERC20 ABI for approve
const ERC20_ABI = [
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
            const { contractAddress, metadata: apiMetadata, chainId: targetChainId } = mintData.data

            // 1b. Switch chain if needed
            if (targetChainId && chainId !== targetChainId) {
                await switchChain({ chainId: targetChainId })
                // Give the wallet a moment to process the chain switch
                await new Promise(r => setTimeout(r, 1000))
            }

            // 2. Build tokenURI as a data URI (no IPFS needed)
            const tokenURI = `data:application/json;base64,${btoa(JSON.stringify(apiMetadata))}`

            // 3. Determine minting path based on chain
            const isBase = targetChainId === BASE_MAINNET_CHAIN_ID
            let tx: string

            if (isBase) {
                // BASE MAINNET: Route through WriterCoinPayment which has MINTER_ROLE
                // User must approve WriterCoinPayment to spend their writer coins first
                const writerCoin = getWriterCoinById(writerCoinId)
                if (!writerCoin) throw new Error(`Unknown writer coin: ${writerCoinId}`)

                const paymentAddress = writerCoin.paymentContractAddress

                // Approve WriterCoinPayment to spend the writer coin (max uint256 for convenience)
                toast({ title: 'Approving token spend…', description: 'Your wallet will ask you to approve the payment contract.' })
                const approveTx = await writeContractAsync({
                    address: writerCoin.address as `0x${string}`,
                    abi: ERC20_ABI,
                    functionName: 'approve',
                    args: [paymentAddress as `0x${string}`, maxUint256],
                })
                console.log('[Mint] Approval tx:', approveTx)

                // Build the metadata tuple matching the Solidity struct:
                // (articleUrl, creator, writerCoin, genre, difficulty, createdAt, gameTitle)
                const metadataTuple = {
                    articleUrl: game.articleUrl || '',
                    creator: accountAddress,
                    writerCoin: writerCoin.address as `0x${string}`,
                    genre: game.genre,
                    difficulty: game.difficulty || 'medium',
                    createdAt: BigInt(Math.floor(Date.now() / 1000)),
                    gameTitle: game.title,
                }

                toast({ title: 'Minting NFT…', description: 'Confirm the mint transaction in your wallet.' })

                // Call WriterCoinPayment.payAndMintGame — this atomically:
                // 1. Transfers mintCost from user
                // 2. Distributes revenue shares
                // 3. Calls GameNFT.mintGame() internally (has MINTER_ROLE)
                tx = await writeContractAsync({
                    address: paymentAddress as `0x${string}`,
                    abi: WRITER_COIN_PAYMENT_ABI_V2,
                    functionName: 'payAndMintGame',
                    args: [writerCoin.address as `0x${string}`, tokenURI, metadataTuple],
                })
            } else {
                // MEZO or other chains: GameNFT has no access control, mint directly
                const authorWallet = (game.authorWallet || '0x0000000000000000000000000000000000000000') as `0x${string}`
                const metadataTuple: [string, `0x${string}`, `0x${string}`, string, string, bigint, string] = [
                    game.articleUrl || game.title,
                    accountAddress,
                    authorWallet,
                    game.genre,
                    game.difficulty || 'medium',
                    BigInt(Math.floor(Date.now() / 1000)),
                    game.title,
                ]

                tx = await writeContractAsync({
                    address: contractAddress as `0x${string}`,
                    abi: CONTRACT_ABIS.GameNFT,
                    functionName: 'mintGame',
                    args: [accountAddress, tokenURI, metadataTuple],
                })
            }

            // 4. PATCH with real transaction hash
            const confirmResponse = await fetch('/api/games/mint', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId: game.id,
                    transactionHash: tx,
                    wallet: accountAddress,
                    contractAddress,
                    chainId: targetChainId,
                }),
            })

            if (confirmResponse.ok) {
                const confirmData = await confirmResponse.json()
                if (confirmData.data?.extractedAssetIds?.length) {
                    setExtractedAssetIds(confirmData.data.extractedAssetIds)
                }
            }

            toast({ title: '🎉 NFT minted!', description: `Your comic has been minted on ${isBase ? 'Base' : 'Mezo'}.` })
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
                await storyClient.ipAsset.registerDerivativeIpAsset({
                    nft: { type: "mint", spgNftContract: STORY_SPG_CONTRACT },
                    derivData: {
                        parentIpIds: [parentIpId],
                        licenseTermsIds: [LICENSE_TERMS_ID_COMMERCIAL_REMIX],
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
