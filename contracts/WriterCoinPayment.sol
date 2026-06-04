// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IGameNFT {
    struct GameMetadata {
        string articleUrl;
        address creator;
        address writerCoin;
        string genre;
        string difficulty;
        uint256 createdAt;
        string gameTitle;
    }

    function mintGame(
        address to,
        string memory tokenURI,
        GameMetadata memory metadata
    ) external returns (uint256);

    function ownerOf(uint256 tokenId) external view returns (address);
}

/**
 * @title WriterCoinPayment
 * @dev Handles writer-coin payments for generation, NFT minting, and gameplay.
 *
 * Minting pulls the full configured mint cost from the minter first, then
 * distributes creator/writer/platform shares and refunds the undistributed
 * remainder to the minter. This keeps the payment contract solvent even when
 * it starts with a zero writer-coin balance.
 */
contract WriterCoinPayment is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct PaymentConfig {
        uint256 gameGenerationCost;
        uint256 mintCost;
        bool enabled;
    }

    struct RevenueDistribution {
        uint256 writerShare;
        uint256 platformShare;
        uint256 creatorPoolShare;
    }

    struct MintDistribution {
        uint256 creatorShare;
        uint256 writerShare;
        uint256 platformShare;
    }

    struct GameplayDistribution {
        uint256 creatorShare;
        uint256 writerShare;
        uint256 platformShare;
    }

    mapping(address coin => PaymentConfig config) public whitelistedCoins;
    mapping(address coin => RevenueDistribution distribution) public revenueDistributions;
    mapping(address coin => MintDistribution distribution) public mintDistributions;
    mapping(address coin => GameplayDistribution distribution) public gameplayDistributions;
    mapping(address coin => address treasury) public writerTreasuries;

    address public platformTreasury;
    address public creatorPool;
    IGameNFT public gameNFT;

    event GameGenerated(
        address indexed user,
        address indexed writerCoin,
        uint256 amountPaid,
        uint256 writerShare,
        uint256 platformShare,
        uint256 creatorPoolShare
    );

    event GameMinted(
        address indexed minter,
        address indexed writerCoin,
        uint256 tokenId,
        uint256 amountPaid,
        uint256 creatorShare,
        uint256 writerShare,
        uint256 platformShare,
        uint256 minterRefund
    );

    event GameplayPaid(
        address indexed player,
        address indexed gameCreator,
        address indexed writerCoin,
        uint256 gameId,
        uint256 amountPaid,
        uint256 creatorShare,
        uint256 writerShare,
        uint256 platformShare
    );

    event CoinWhitelisted(
        address indexed coinAddress,
        uint256 gameGenerationCost,
        uint256 mintCost
    );
    event CoinRemoved(address indexed coinAddress);
    event TreasuryUpdated(address indexed writerCoin, address indexed newTreasury);
    event PlatformTreasuryUpdated(address indexed newTreasury);
    event CreatorPoolUpdated(address indexed newPool);
    event CoinConfigUpdated(
        address indexed coinAddress,
        uint256 newGenerationCost,
        uint256 newMintCost
    );
    event GameNFTUpdated(address indexed newGameNFT);
    event RevenueSplitsUpdated(address indexed coinAddress, string distributionType);

    constructor(
        address initialOwner,
        address _platformTreasury,
        address _creatorPool,
        address _gameNFT
    ) Ownable(initialOwner) {
        require(initialOwner != address(0), "WriterCoinPayment: zero owner");
        require(_platformTreasury != address(0), "WriterCoinPayment: zero platform treasury");
        require(_creatorPool != address(0), "WriterCoinPayment: zero creator pool");

        platformTreasury = _platformTreasury;
        creatorPool = _creatorPool;

        if (_gameNFT != address(0)) {
            gameNFT = IGameNFT(_gameNFT);
            emit GameNFTUpdated(_gameNFT);
        }
    }

    function whitelistCoin(
        address coinAddress,
        uint256 gameGenerationCost,
        uint256 mintCost,
        address treasury,
        uint256 writerShare,
        uint256 platformShare,
        uint256 creatorPoolShare,
        uint256 mintCreatorShare,
        uint256 mintWriterShare,
        uint256 mintPlatformShare,
        uint256 playCreatorShare,
        uint256 playWriterShare,
        uint256 playPlatformShare
    ) external onlyOwner {
        _validateCoinConfig(coinAddress, gameGenerationCost, mintCost, treasury);
        _validateRevenueSplits(
            writerShare,
            platformShare,
            creatorPoolShare,
            mintCreatorShare,
            mintWriterShare,
            mintPlatformShare,
            playCreatorShare,
            playWriterShare,
            playPlatformShare
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

        mintDistributions[coinAddress] = MintDistribution({
            creatorShare: mintCreatorShare,
            writerShare: mintWriterShare,
            platformShare: mintPlatformShare
        });

        gameplayDistributions[coinAddress] = GameplayDistribution({
            creatorShare: playCreatorShare,
            writerShare: playWriterShare,
            platformShare: playPlatformShare
        });

        writerTreasuries[coinAddress] = treasury;

        emit CoinWhitelisted(coinAddress, gameGenerationCost, mintCost);
    }

    function setGameNFT(address _gameNFT) external onlyOwner {
        require(_gameNFT != address(0), "WriterCoinPayment: zero GameNFT address");
        gameNFT = IGameNFT(_gameNFT);
        emit GameNFTUpdated(_gameNFT);
    }

    function removeCoin(address coinAddress) external onlyOwner {
        require(whitelistedCoins[coinAddress].enabled, "WriterCoinPayment: coin not whitelisted");
        whitelistedCoins[coinAddress].enabled = false;
        emit CoinRemoved(coinAddress);
    }

    function updateWriterTreasury(address coinAddress, address newTreasury) external onlyOwner {
        require(whitelistedCoins[coinAddress].enabled, "WriterCoinPayment: coin not whitelisted");
        require(newTreasury != address(0), "WriterCoinPayment: zero treasury");
        writerTreasuries[coinAddress] = newTreasury;
        emit TreasuryUpdated(coinAddress, newTreasury);
    }

    function updatePlatformTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "WriterCoinPayment: zero treasury");
        platformTreasury = newTreasury;
        emit PlatformTreasuryUpdated(newTreasury);
    }

    function updateCreatorPool(address newPool) external onlyOwner {
        require(newPool != address(0), "WriterCoinPayment: zero pool");
        creatorPool = newPool;
        emit CreatorPoolUpdated(newPool);
    }

    function updateCoinConfig(
        address coinAddress,
        uint256 newGenerationCost,
        uint256 newMintCost
    ) external onlyOwner {
        require(whitelistedCoins[coinAddress].enabled, "WriterCoinPayment: coin not whitelisted");
        require(newGenerationCost > 0, "WriterCoinPayment: zero generation cost");
        require(newMintCost > 0, "WriterCoinPayment: zero mint cost");

        whitelistedCoins[coinAddress].gameGenerationCost = newGenerationCost;
        whitelistedCoins[coinAddress].mintCost = newMintCost;

        emit CoinConfigUpdated(coinAddress, newGenerationCost, newMintCost);
    }

    function updateRevenueSplits(
        address coinAddress,
        uint256 genWriter,
        uint256 genPlatform,
        uint256 genPool,
        uint256 mintCreator,
        uint256 mintWriter,
        uint256 mintPlatform,
        uint256 playCreator,
        uint256 playWriter,
        uint256 playPlatform
    ) external onlyOwner {
        require(whitelistedCoins[coinAddress].enabled, "WriterCoinPayment: coin not whitelisted");
        _validateRevenueSplits(
            genWriter,
            genPlatform,
            genPool,
            mintCreator,
            mintWriter,
            mintPlatform,
            playCreator,
            playWriter,
            playPlatform
        );

        revenueDistributions[coinAddress] = RevenueDistribution(genWriter, genPlatform, genPool);
        mintDistributions[coinAddress] = MintDistribution(mintCreator, mintWriter, mintPlatform);
        gameplayDistributions[coinAddress] = GameplayDistribution(playCreator, playWriter, playPlatform);

        emit RevenueSplitsUpdated(coinAddress, "all");
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function payForGameGeneration(address writerCoin) external nonReentrant whenNotPaused {
        PaymentConfig memory config = whitelistedCoins[writerCoin];
        require(config.enabled, "WriterCoinPayment: coin not whitelisted");

        uint256 amount = config.gameGenerationCost;
        IERC20 token = IERC20(writerCoin);
        RevenueDistribution memory distribution = revenueDistributions[writerCoin];

        uint256 writerShare = (amount * distribution.writerShare) / 10000;
        uint256 platformShare = (amount * distribution.platformShare) / 10000;
        uint256 creatorPoolShare = amount - writerShare - platformShare;

        token.safeTransferFrom(msg.sender, address(this), amount);
        token.safeTransfer(writerTreasuries[writerCoin], writerShare);
        token.safeTransfer(platformTreasury, platformShare);
        token.safeTransfer(creatorPool, creatorPoolShare);

        emit GameGenerated(msg.sender, writerCoin, amount, writerShare, platformShare, creatorPoolShare);
    }

    function payAndMintGame(
        address writerCoin,
        string memory tokenURI,
        IGameNFT.GameMetadata memory metadata
    ) external nonReentrant whenNotPaused returns (uint256 tokenId) {
        require(address(gameNFT) != address(0), "WriterCoinPayment: GameNFT not set");
        PaymentConfig memory config = whitelistedCoins[writerCoin];
        require(config.enabled, "WriterCoinPayment: coin not whitelisted");
        require(metadata.creator == msg.sender, "WriterCoinPayment: creator must be minter");
        require(bytes(tokenURI).length > 0, "WriterCoinPayment: empty tokenURI");
        require(metadata.writerCoin == writerCoin, "WriterCoinPayment: writerCoin mismatch");

        uint256 mintCost = config.mintCost;
        IERC20 token = IERC20(writerCoin);
        MintDistribution memory dist = mintDistributions[writerCoin];

        uint256 creatorShare = (mintCost * dist.creatorShare) / 10000;
        uint256 writerShare = (mintCost * dist.writerShare) / 10000;
        uint256 platformShare = (mintCost * dist.platformShare) / 10000;
        uint256 minterRefund = mintCost - creatorShare - writerShare - platformShare;

        token.safeTransferFrom(msg.sender, address(this), mintCost);

        if (creatorShare > 0) {
            token.safeTransfer(metadata.creator, creatorShare);
        }
        if (writerShare > 0) {
            token.safeTransfer(writerTreasuries[writerCoin], writerShare);
        }
        if (platformShare > 0) {
            token.safeTransfer(platformTreasury, platformShare);
        }
        if (minterRefund > 0) {
            token.safeTransfer(msg.sender, minterRefund);
        }

        tokenId = gameNFT.mintGame(msg.sender, tokenURI, metadata);

        emit GameMinted(
            msg.sender,
            writerCoin,
            tokenId,
            mintCost,
            creatorShare,
            writerShare,
            platformShare,
            minterRefund
        );
    }

    function payForGameplay(
        address writerCoin,
        uint256 gameId,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        PaymentConfig memory config = whitelistedCoins[writerCoin];
        require(config.enabled, "WriterCoinPayment: coin not whitelisted");
        require(amount > 0, "WriterCoinPayment: zero amount");
        require(address(gameNFT) != address(0), "WriterCoinPayment: GameNFT not set");

        address gameCreator = gameNFT.ownerOf(gameId);
        IERC20 token = IERC20(writerCoin);
        GameplayDistribution memory dist = gameplayDistributions[writerCoin];

        uint256 creatorShare = (amount * dist.creatorShare) / 10000;
        uint256 writerShare = (amount * dist.writerShare) / 10000;
        uint256 platformShare = amount - creatorShare - writerShare;

        token.safeTransferFrom(msg.sender, address(this), amount);
        if (creatorShare > 0) {
            token.safeTransfer(gameCreator, creatorShare);
        }
        if (writerShare > 0) {
            token.safeTransfer(writerTreasuries[writerCoin], writerShare);
        }
        if (platformShare > 0) {
            token.safeTransfer(platformTreasury, platformShare);
        }

        emit GameplayPaid(
            msg.sender,
            gameCreator,
            writerCoin,
            gameId,
            amount,
            creatorShare,
            writerShare,
            platformShare
        );
    }

    function isCoinWhitelisted(address coinAddress) external view returns (bool) {
        return whitelistedCoins[coinAddress].enabled;
    }

    function getCoinConfig(address coinAddress) external view returns (PaymentConfig memory) {
        return whitelistedCoins[coinAddress];
    }

    function getRevenueDistribution(address coinAddress) external view returns (RevenueDistribution memory) {
        return revenueDistributions[coinAddress];
    }

    function getMintDistribution(address coinAddress) external view returns (MintDistribution memory) {
        return mintDistributions[coinAddress];
    }

    function getGameplayDistribution(address coinAddress) external view returns (GameplayDistribution memory) {
        return gameplayDistributions[coinAddress];
    }

    function emergencyWithdraw(address tokenAddress, uint256 amount) external onlyOwner {
        require(tokenAddress != address(0), "WriterCoinPayment: zero token address");
        require(amount > 0, "WriterCoinPayment: zero amount");
        IERC20(tokenAddress).safeTransfer(owner(), amount);
    }

    function emergencyWithdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "WriterCoinPayment: zero native balance");

        (bool success, ) = owner().call{value: balance}("");
        require(success, "WriterCoinPayment: native withdrawal failed");
    }

    function _validateCoinConfig(
        address coinAddress,
        uint256 gameGenerationCost,
        uint256 mintCost,
        address treasury
    ) private pure {
        require(coinAddress != address(0), "WriterCoinPayment: zero coin address");
        require(treasury != address(0), "WriterCoinPayment: zero treasury");
        require(gameGenerationCost > 0, "WriterCoinPayment: zero generation cost");
        require(mintCost > 0, "WriterCoinPayment: zero mint cost");
    }

    function _validateRevenueSplits(
        uint256 genWriter,
        uint256 genPlatform,
        uint256 genPool,
        uint256 mintCreator,
        uint256 mintWriter,
        uint256 mintPlatform,
        uint256 playCreator,
        uint256 playWriter,
        uint256 playPlatform
    ) private pure {
        require(genWriter + genPlatform + genPool == 10000, "WriterCoinPayment: generation shares != 100%");
        require(mintCreator + mintWriter + mintPlatform <= 10000, "WriterCoinPayment: mint shares > 100%");
        require(playCreator + playWriter + playPlatform == 10000, "WriterCoinPayment: gameplay shares != 100%");
    }

    receive() external payable {}
}
