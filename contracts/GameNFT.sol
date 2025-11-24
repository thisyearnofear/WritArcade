// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title GameNFT
 * @dev ERC-721 NFT contract for games generated from articles
 * 
 * Games can be minted as NFTs on Base chain, with metadata tracking:
 * - Original article URL
 * - Creator (user who generated the game)
 * - Writer coin used
 * - Genre and difficulty
 * - Creation timestamp
 */
contract GameNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIdCounter;
    
    // Game metadata stored on-chain
    struct GameMetadata {
        string articleUrl;      // Paragraph article URL (e.g., https://avc.xyz/blog/...)
        address creator;        // User who generated the game
        address writerCoin;     // Writer coin contract address used
        string genre;           // Horror, Comedy, or Mystery
        string difficulty;      // Easy or Hard
        uint256 createdAt;      // Timestamp when game was generated
        string gameTitle;       // Title of the generated game
    }
    
    // Mapping from token ID to game metadata
    mapping(uint256 => GameMetadata) public games;
    
    // Track games minted per creator
    mapping(address => uint256[]) public creatorGames;
    
    // Event emitted when a game is minted
    event GameMinted(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed writerCoin,
        string genre,
        string difficulty,
        string articleUrl
    );
    
    constructor() ERC721("WritArcade Games", "GAME") {}
    
    /**
     * @dev Mint a new game NFT
     * @param to Address to mint the NFT to
     * @param tokenURI IPFS URI containing game metadata and images
     * @param metadata Game metadata struct
     * @return tokenId The ID of the newly minted token
     */
    function mintGame(
        address to,
        string memory tokenURI,
        GameMetadata memory metadata
    ) external onlyOwner returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(metadata.creator != address(0), "Creator cannot be zero address");
        require(metadata.writerCoin != address(0), "Writer coin cannot be zero address");
        require(bytes(metadata.genre).length > 0, "Genre cannot be empty");
        require(bytes(metadata.difficulty).length > 0, "Difficulty cannot be empty");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        // Store metadata
        games[tokenId] = metadata;
        creatorGames[metadata.creator].push(tokenId);
        
        // Mint the token
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        emit GameMinted(
            tokenId,
            metadata.creator,
            metadata.writerCoin,
            metadata.genre,
            metadata.difficulty,
            metadata.articleUrl
        );
        
        return tokenId;
    }
    
    /**
     * @dev Get game metadata for a token
     * @param tokenId The token ID
     * @return GameMetadata struct
     */
    function getGameMetadata(uint256 tokenId) external view returns (GameMetadata memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return games[tokenId];
    }
    
    /**
     * @dev Get all games created by an address
     * @param creator The creator address
     * @return Array of token IDs
     */
    function getCreatorGames(address creator) external view returns (uint256[] memory) {
        return creatorGames[creator];
    }
    
    /**
     * @dev Get total number of games minted
     * @return Total count of games
     */
    function getTotalGamesMinted() external view returns (uint256) {
        return _tokenIdCounter.current();
    }
    
    /**
     * @dev Check if a token exists
     * @param tokenId The token ID
     * @return bool
     */
    function tokenExists(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}
