// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MezoBoostedSplitter
 * @dev Extension of MezoPaymentSplitter that incorporates a 10% revenue boost for MEZO token holders.
 * Boosted creator shares are deducted proportionally from the platform treasury share.
 */

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract MezoBoostedSplitter {
    address public immutable musdToken;
    address public immutable mezoToken; // MEZO System Precompile
    address public platformTreasury;
    
    // Configurable splits (in basis points, 10000 = 100%)
    uint256 public writerShareBP = 5000;   // 50%
    uint256 public platformShareBP = 2500; // 25%
    uint256 public creatorShareBP = 2500;  // 25%
    
    // MEZO Holder configuration
    uint256 public constant HOLDER_THRESHOLD = 1e18; // 1 MEZO
    uint256 public constant BOOST_BP = 1000; // 10% boost to creator share

    struct GameMetadata {
        string articleUrl;
        address creator;
        address writerCoin;
        string genre;
        string difficulty;
        uint256 createdAt;
        string gameTitle;
    }

    event GameMintedAndPaid(address indexed creator, string tokenURI, GameMetadata metadata, uint256 creatorFee, uint256 platformFee, bool boosted);

    constructor(address _musdToken, address _mezoToken, address _platformTreasury) {
        musdToken = _musdToken;
        mezoToken = _mezoToken;
        platformTreasury = _platformTreasury;
    }

    /**
     * @dev Checks if the user is a MEZO holder
     */
    function isMezoHolder(address user) public view returns (bool) {
        return IERC20(mezoToken).balanceOf(user) >= HOLDER_THRESHOLD;
    }

    /**
     * @dev Atomic pay and mint with boost logic
     */
    function payAndMintGame(string calldata tokenURI, GameMetadata calldata metadata) external {
        uint256 mintCost = 1e18; // 1 MUSD
        bool boosted = isMezoHolder(msg.sender);
        
        uint256 platformFee = (mintCost * platformShareBP) / 10000;
        uint256 creatorFee = (mintCost * creatorShareBP) / 10000;
        
        // Apply 10% boost to creator share if holder
        if (boosted) {
            uint256 boostAmount = (creatorFee * BOOST_BP) / 10000;
            creatorFee += boostAmount;
            platformFee -= boostAmount;
        }
        
        uint256 writerFee = mintCost - platformFee - creatorFee;

        IERC20(musdToken).transferFrom(msg.sender, address(this), mintCost);
        IERC20(musdToken).transfer(platformTreasury, platformFee);
        IERC20(musdToken).transfer(metadata.creator, creatorFee);

        emit GameMintedAndPaid(msg.sender, tokenURI, metadata, creatorFee, platformFee, boosted);
    }
}
