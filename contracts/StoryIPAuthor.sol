// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title StoryIPAuthor
 * @dev Manages author permissions for game IP registration on Story Protocol
 * 
 * Authors (from Paragraph) can grant permission for their articles to be converted to games.
 * Games generated from approved articles are registered as IP on Story with proper royalty splits.
 * 
 * Royalty Structure:
 * - 60%: Article Author (Paragraph writer)
 * - 30%: Game Creator (WritArcade user)
 * - 10%: WritArcade Platform
 */
contract StoryIPAuthor is Ownable {
    using Counters for Counters.Counter;
    
    // Track author permissions
    struct AuthorPermission {
        address authorAddress;           // Wallet address of article author
        string paragraphUsername;        // Paragraph username (e.g., "fredwilson")
        bool approved;                   // Can articles from this author be converted?
        uint256 createdAt;              // When permission was granted
        uint256 royaltyShare;           // Author's royalty % (in basis points, 6000 = 60%)
    }
    
    // Track games registered as IP
    struct IPAssetRecord {
        string storyIPAssetId;          // Story Protocol IP Asset ID
        string articleUrl;              // Original article URL
        address gameCreator;            // User who generated the game
        address authorAddress;          // Author of the article
        string genre;                   // Horror, Comedy, Mystery
        string difficulty;              // Easy, Hard
        uint256 registeredAt;           // When registered on Story
        bool ipRegistered;              // Whether IP was successfully registered
        uint256 baseNFTTokenId;         // Base blockchain NFT token ID (after minting)
    }
    
    // Author permissions (Paragraph username => permission)
    mapping(string => AuthorPermission) public authorPermissions;
    
    // IP Asset records (Story IP Asset ID => record)
    mapping(string => IPAssetRecord) public ipAssets;
    
    // Track games per author
    mapping(address => string[]) public authorIPAssets;
    
    // Track games per creator
    mapping(address => string[]) public creatorIPAssets;
    
    // Counter for unique IP asset identifiers
    Counters.Counter private _ipAssetIdCounter;
    
    // Events
    event AuthorApproved(
        string indexed paragraphUsername,
        address indexed authorAddress,
        uint256 royaltyShare
    );
    
    event AuthorRevoked(
        string indexed paragraphUsername,
        address indexed authorAddress
    );
    
    event IPAssetRegistered(
        string indexed storyIPAssetId,
        string articleUrl,
        address indexed gameCreator,
        address indexed authorAddress,
        string genre,
        string difficulty,
        uint256 authorShare,
        uint256 creatorShare,
        uint256 platformShare
    );
    
    event IPAssetLinkedToNFT(
        string indexed storyIPAssetId,
        uint256 indexed baseNFTTokenId
    );
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    /**
     * @dev Approve an author to have their articles converted to games on Story
     * @param paragraphUsername Paragraph username (e.g., "fredwilson")
     * @param authorAddress Wallet address of the author
     * @param royaltyShare Author's royalty share in basis points (6000 = 60%)
     */
    function approveAuthor(
        string calldata paragraphUsername,
        address authorAddress,
        uint256 royaltyShare
    ) external onlyOwner {
        require(authorAddress != address(0), "Author address cannot be zero");
        require(bytes(paragraphUsername).length > 0, "Paragraph username cannot be empty");
        require(royaltyShare > 0 && royaltyShare <= 10000, "Royalty share must be 0-10000 bps");
        
        authorPermissions[paragraphUsername] = AuthorPermission({
            authorAddress: authorAddress,
            paragraphUsername: paragraphUsername,
            approved: true,
            createdAt: block.timestamp,
            royaltyShare: royaltyShare
        });
        
        emit AuthorApproved(paragraphUsername, authorAddress, royaltyShare);
    }
    
    /**
     * @dev Revoke an author's permission to have their articles converted
     * @param paragraphUsername The Paragraph username to revoke
     */
    function revokeAuthor(string calldata paragraphUsername) external onlyOwner {
        require(bytes(paragraphUsername).length > 0, "Paragraph username cannot be empty");
        require(authorPermissions[paragraphUsername].approved, "Author not approved");
        
        address authorAddress = authorPermissions[paragraphUsername].authorAddress;
        authorPermissions[paragraphUsername].approved = false;
        
        emit AuthorRevoked(paragraphUsername, authorAddress);
    }
    
    /**
     * @dev Register a game as an IP asset on Story Protocol
     * Called after Story Protocol registration succeeds
     * @param storyIPAssetId The IP Asset ID returned by Story Protocol
     * @param articleUrl Original article URL
     * @param gameCreator Address of user who created the game
     * @param paragraphUsername Username of article author
     * @param genre Game genre (Horror, Comedy, Mystery)
     * @param difficulty Game difficulty (Easy, Hard)
     * @return ipAssetId The ID for internal tracking
     */
    function registerIPAsset(
        string calldata storyIPAssetId,
        string calldata articleUrl,
        address gameCreator,
        string calldata paragraphUsername,
        string calldata genre,
        string calldata difficulty
    ) external onlyOwner returns (string memory) {
        require(gameCreator != address(0), "Game creator cannot be zero address");
        require(bytes(storyIPAssetId).length > 0, "Story IP Asset ID cannot be empty");
        require(bytes(articleUrl).length > 0, "Article URL cannot be empty");
        require(bytes(paragraphUsername).length > 0, "Paragraph username cannot be empty");
        
        // Verify author is approved
        AuthorPermission memory permission = authorPermissions[paragraphUsername];
        require(permission.approved, "Author not approved for IP registration");
        
        // Create record
        IPAssetRecord memory record = IPAssetRecord({
            storyIPAssetId: storyIPAssetId,
            articleUrl: articleUrl,
            gameCreator: gameCreator,
            authorAddress: permission.authorAddress,
            genre: genre,
            difficulty: difficulty,
            registeredAt: block.timestamp,
            ipRegistered: true,
            baseNFTTokenId: 0  // Set later when NFT is minted
        });
        
        ipAssets[storyIPAssetId] = record;
        authorIPAssets[permission.authorAddress].push(storyIPAssetId);
        creatorIPAssets[gameCreator].push(storyIPAssetId);
        
        // Calculate royalty splits (in basis points)
        uint256 authorShare = permission.royaltyShare;      // e.g., 6000 (60%)
        uint256 creatorShare = 3000;                        // 30%
        uint256 platformShare = 10000 - authorShare - creatorShare; // Remainder
        
        emit IPAssetRegistered(
            storyIPAssetId,
            articleUrl,
            gameCreator,
            permission.authorAddress,
            genre,
            difficulty,
            authorShare,
            creatorShare,
            platformShare
        );
        
        return storyIPAssetId;
    }
    
    /**
     * @dev Link an IP Asset to its Base NFT token ID after minting
     * @param storyIPAssetId The Story IP Asset ID
     * @param baseNFTTokenId The Base blockchain NFT token ID
     */
    function linkNFTToIPAsset(
        string calldata storyIPAssetId,
        uint256 baseNFTTokenId
    ) external onlyOwner {
        require(ipAssets[storyIPAssetId].ipRegistered, "IP Asset not registered");
        ipAssets[storyIPAssetId].baseNFTTokenId = baseNFTTokenId;
        
        emit IPAssetLinkedToNFT(storyIPAssetId, baseNFTTokenId);
    }
    
    /**
     * @dev Check if an author is approved
     * @param paragraphUsername The Paragraph username to check
     * @return bool Whether author is approved
     */
    function isAuthorApproved(string calldata paragraphUsername) external view returns (bool) {
        return authorPermissions[paragraphUsername].approved;
    }
    
    /**
     * @dev Get author permission details
     * @param paragraphUsername The Paragraph username
     * @return AuthorPermission struct
     */
    function getAuthorPermission(string calldata paragraphUsername) 
        external 
        view 
        returns (AuthorPermission memory) 
    {
        return authorPermissions[paragraphUsername];
    }
    
    /**
     * @dev Get IP asset details
     * @param storyIPAssetId The Story IP Asset ID
     * @return IPAssetRecord struct
     */
    function getIPAssetRecord(string calldata storyIPAssetId) 
        external 
        view 
        returns (IPAssetRecord memory) 
    {
        return ipAssets[storyIPAssetId];
    }
    
    /**
     * @dev Get all IP assets registered by an author
     * @param authorAddress The author's wallet address
     * @return Array of Story IP Asset IDs
     */
    function getAuthorIPAssets(address authorAddress) 
        external 
        view 
        returns (string[] memory) 
    {
        return authorIPAssets[authorAddress];
    }
    
    /**
     * @dev Get all IP assets created by a user
     * @param gameCreator The game creator's wallet address
     * @return Array of Story IP Asset IDs
     */
    function getCreatorIPAssets(address gameCreator) 
        external 
        view 
        returns (string[] memory) 
    {
        return creatorIPAssets[gameCreator];
    }
}
