// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MezoPaymentSplitter
 * @dev Handles MUSD payments and revenue splits for WritersArcade on Mezo
 */
interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract MezoPaymentSplitter {
    address public immutable musdToken;
    address public platformTreasury;
    
    // Configurable splits (in basis points, 10000 = 100%)
    uint256 public writerShareBP = 5000;   // 50%
    uint256 public platformShareBP = 2500; // 25%
    uint256 public creatorShareBP = 2500;  // 25%

    struct GameMetadata {
        string articleUrl;
        address creator;
        address writerCoin; // Platform MUSD identifier
        string genre;
        string difficulty;
        uint256 createdAt;
        string gameTitle;
    }

    event GameGenerationPaid(address indexed user, uint256 amount, uint256 platformFee, uint256 writerFee);
    event GameMintedAndPaid(address indexed creator, string tokenURI, GameMetadata metadata, uint256 creatorFee, uint256 platformFee);

    constructor(address _musdToken, address _platformTreasury) {
        musdToken = _musdToken;
        platformTreasury = _platformTreasury;
    }

    /**
     * @dev Pay for game generation
     * User pays amount in MUSD, split between platform and writer (or pool)
     */
    function payForGeneration(uint256 amount) external {
        uint256 platformFee = (amount * platformShareBP) / 10000;
        uint256 writerFee = amount - platformFee;

        IERC20(musdToken).transferFrom(msg.sender, address(this), amount);
        IERC20(musdToken).transfer(platformTreasury, platformFee);
        
        // For simplicity, we keep the writer fee in the contract for them to claim,
        // or send to a designated writer pool if article is not claimed.
        // In this MVP, we just emit the event.
        
        emit GameGenerationPaid(msg.sender, amount, platformFee, writerFee);
    }

    /**
     * @dev Atomic pay and mint
     * User pays MUSD, splits revenue, and registers the game
     */
    function payAndMintGame(string calldata tokenURI, GameMetadata calldata metadata) external {
        uint256 mintCost = 1e18; // 1 MUSD
        
        uint256 platformFee = (mintCost * platformShareBP) / 10000;
        uint256 creatorFee = (mintCost * creatorShareBP) / 10000;
        uint256 writerFee = mintCost - platformFee - creatorFee;

        IERC20(musdToken).transferFrom(msg.sender, address(this), mintCost);
        IERC20(musdToken).transfer(platformTreasury, platformFee);
        IERC20(musdToken).transfer(metadata.creator, creatorFee);

        // Mints NFT logic would go here if this contract is also an ERC721
        // Or it calls the GameNFT contract on Mezo
        
        emit GameMintedAndPaid(msg.sender, tokenURI, metadata, creatorFee, platformFee);
    }
}
