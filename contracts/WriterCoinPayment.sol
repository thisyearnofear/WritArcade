// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title WriterCoinPayment
 * @dev Handles payments and revenue distribution for game generation and NFT minting
 * 
 * Users pay in writer coins (e.g., $AVC) to:
 * 1. Generate games from articles (100 tokens)
 * 2. Mint generated games as NFTs (50 tokens)
 * 
 * Revenue is split:
 * - Game generation: 60% writer, 20% platform, 20% creator pool
 * - NFT minting: 30% creator, 15% writer, 5% platform
 */
contract WriterCoinPayment is Ownable, ReentrancyGuard {
    
    // Payment configuration
    struct PaymentConfig {
        uint256 gameGenerationCost;  // Cost to generate a game (e.g., 100 tokens)
        uint256 mintCost;            // Cost to mint as NFT (e.g., 50 tokens)
        bool enabled;                // Whether payments are enabled for this coin
    }
    
    // Revenue distribution (in basis points, 100 = 1%)
    struct RevenueDistribution {
        uint256 writerShare;         // Share for the writer (e.g., 6000 = 60%)
        uint256 platformShare;       // Share for the platform (e.g., 2000 = 20%)
        uint256 creatorPoolShare;    // Share for creator pool (e.g., 2000 = 20%)
    }
    
    // Writer coin whitelist
    mapping(address => PaymentConfig) public whitelistedCoins;
    
    // Revenue distribution for each coin
    mapping(address => RevenueDistribution) public revenueDistributions;
    
    // Mapping of coin address to writer's treasury address
    mapping(address => address) public writerTreasuries;
    
    // Platform treasury address
    address public platformTreasury;
    
    // Creator pool address
    address public creatorPool;
    
    // Events
    event GameGenerated(
        address indexed user,
        address indexed writerCoin,
        uint256 amount,
        uint256 writerShare,
        uint256 platformShare,
        uint256 creatorShare
    );
    
    event GameMinted(
        address indexed user,
        address indexed writerCoin,
        uint256 amount,
        uint256 creatorShare,
        uint256 writerShare,
        uint256 platformShare
    );
    
    event CoinWhitelisted(
        address indexed coinAddress,
        uint256 generationCost,
        uint256 mintCost
    );
    
    event CoinRemoved(address indexed coinAddress);
    
    event TreasuryUpdated(address indexed writerCoin, address indexed newTreasury);
    
    event PlatformTreasuryUpdated(address indexed newTreasury);
    
    event CreatorPoolUpdated(address indexed newPool);
    
    constructor(address _platformTreasury, address _creatorPool) {
        require(_platformTreasury != address(0), "Platform treasury cannot be zero");
        require(_creatorPool != address(0), "Creator pool cannot be zero");
        
        platformTreasury = _platformTreasury;
        creatorPool = _creatorPool;
    }
    
    /**
     * @dev Whitelist a writer coin for use in the platform
     * @param coinAddress ERC20 token contract address
     * @param gameGenerationCost Cost in tokens to generate a game
     * @param mintCost Cost in tokens to mint as NFT
     * @param treasury Address to receive writer's share
     * @param writerShare Basis points for writer (e.g., 6000 = 60%)
     * @param platformShare Basis points for platform (e.g., 2000 = 20%)
     * @param creatorPoolShare Basis points for creator pool (e.g., 2000 = 20%)
     */
    function whitelistCoin(
        address coinAddress,
        uint256 gameGenerationCost,
        uint256 mintCost,
        address treasury,
        uint256 writerShare,
        uint256 platformShare,
        uint256 creatorPoolShare
    ) external onlyOwner {
        require(coinAddress != address(0), "Coin address cannot be zero");
        require(treasury != address(0), "Treasury cannot be zero");
        require(gameGenerationCost > 0, "Generation cost must be greater than 0");
        require(mintCost > 0, "Mint cost must be greater than 0");
        require(
            writerShare + platformShare + creatorPoolShare == 10000,
            "Shares must total 10000 basis points"
        );
        
        whitelistedCoins[coinAddress] = PaymentConfig({
            gameGenerationCost: gameGenerationCost,
            mintCost: mintCost,
            enabled: true
        });
        
        revenueDistributions[coinAddress] = RevenueDistribution({
            writerShare: writerShare,
            platformShare: platformShare,
            creatorPoolShare: creatorPoolShare
        });
        
        writerTreasuries[coinAddress] = treasury;
        
        emit CoinWhitelisted(coinAddress, gameGenerationCost, mintCost);
    }
    
    /**
     * @dev Remove a writer coin from whitelist
     * @param coinAddress The coin to remove
     */
    function removeCoin(address coinAddress) external onlyOwner {
        require(whitelistedCoins[coinAddress].enabled, "Coin not whitelisted");
        whitelistedCoins[coinAddress].enabled = false;
        emit CoinRemoved(coinAddress);
    }
    
    /**
     * @dev Update a writer's treasury address
     * @param coinAddress The writer coin address
     * @param newTreasury The new treasury address
     */
    function updateWriterTreasury(address coinAddress, address newTreasury) external onlyOwner {
        require(whitelistedCoins[coinAddress].enabled, "Coin not whitelisted");
        require(newTreasury != address(0), "Treasury cannot be zero");
        writerTreasuries[coinAddress] = newTreasury;
        emit TreasuryUpdated(coinAddress, newTreasury);
    }
    
    /**
     * @dev Update platform treasury address
     * @param newTreasury The new treasury address
     */
    function updatePlatformTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Treasury cannot be zero");
        platformTreasury = newTreasury;
        emit PlatformTreasuryUpdated(newTreasury);
    }
    
    /**
     * @dev Update creator pool address
     * @param newPool The new pool address
     */
    function updateCreatorPool(address newPool) external onlyOwner {
        require(newPool != address(0), "Pool cannot be zero");
        creatorPool = newPool;
        emit CreatorPoolUpdated(newPool);
    }
    
    /**
     * @dev Process payment for game generation
     * @param writerCoin The writer coin token address
     * @param user The user generating the game
     */
    function payForGameGeneration(address writerCoin, address user) external nonReentrant {
        require(whitelistedCoins[writerCoin].enabled, "Writer coin not whitelisted");
        require(user != address(0), "User cannot be zero");
        
        uint256 amount = whitelistedCoins[writerCoin].gameGenerationCost;
        
        // Transfer tokens from user to this contract
        IERC20 token = IERC20(writerCoin);
        require(
            token.transferFrom(user, address(this), amount),
            "Token transfer failed"
        );
        
        // Calculate shares
        RevenueDistribution memory distribution = revenueDistributions[writerCoin];
        uint256 writerShare = (amount * distribution.writerShare) / 10000;
        uint256 platformShare = (amount * distribution.platformShare) / 10000;
        uint256 creatorShare = (amount * distribution.creatorPoolShare) / 10000;
        
        // Distribute tokens
        require(
            token.transfer(writerTreasuries[writerCoin], writerShare),
            "Writer transfer failed"
        );
        require(
            token.transfer(platformTreasury, platformShare),
            "Platform transfer failed"
        );
        require(
            token.transfer(creatorPool, creatorShare),
            "Creator pool transfer failed"
        );
        
        emit GameGenerated(user, writerCoin, amount, writerShare, platformShare, creatorShare);
    }
    
    /**
     * @dev Process payment for NFT minting
     * @param writerCoin The writer coin token address
     * @param user The user minting the NFT
     */
    function payForMinting(address writerCoin, address user) external nonReentrant {
        require(whitelistedCoins[writerCoin].enabled, "Writer coin not whitelisted");
        require(user != address(0), "User cannot be zero");
        
        uint256 amount = whitelistedCoins[writerCoin].mintCost;
        
        // Transfer tokens from user to this contract
        IERC20 token = IERC20(writerCoin);
        require(
            token.transferFrom(user, address(this), amount),
            "Token transfer failed"
        );
        
        // Calculate shares for minting (different distribution)
        uint256 creatorShare = (amount * 3000) / 10000;      // 30%
        uint256 writerShare = (amount * 1500) / 10000;       // 15%
        uint256 platformShare = (amount * 500) / 10000;      // 5%
        // 50% goes to creator/user directly (not distributed here)
        
        // Distribute tokens
        require(
            token.transfer(user, amount - creatorShare - writerShare - platformShare),
            "Creator transfer failed"
        );
        require(
            token.transfer(writerTreasuries[writerCoin], writerShare),
            "Writer transfer failed"
        );
        require(
            token.transfer(platformTreasury, platformShare),
            "Platform transfer failed"
        );
        
        emit GameMinted(user, writerCoin, amount, creatorShare, writerShare, platformShare);
    }
    
    /**
     * @dev Check if a coin is whitelisted
     * @param coinAddress The coin to check
     * @return bool
     */
    function isCoinWhitelisted(address coinAddress) external view returns (bool) {
        return whitelistedCoins[coinAddress].enabled;
    }
    
    /**
     * @dev Get payment config for a coin
     * @param coinAddress The coin to check
     * @return PaymentConfig struct
     */
    function getCoinConfig(address coinAddress) external view returns (PaymentConfig memory) {
        return whitelistedCoins[coinAddress];
    }
    
    /**
     * @dev Get revenue distribution for a coin
     * @param coinAddress The coin to check
     * @return RevenueDistribution struct
     */
    function getRevenueDistribution(address coinAddress) external view returns (RevenueDistribution memory) {
        return revenueDistributions[coinAddress];
    }
}
