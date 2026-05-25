// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract GameNFTMezo is ERC721URIStorage {
    uint256 private _nextTokenId;

    struct GameMetadata {
        string articleUrl;
        address creator;
        address writerCoin;
        string genre;
        string difficulty;
        uint256 createdAt;
        string gameTitle;
    }

    mapping(uint256 => GameMetadata) public games;
    mapping(address => uint256[]) public creatorGames;

    event GameMinted(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed writerCoin,
        string genre,
        string difficulty,
        string articleUrl
    );

    constructor() ERC721("WritArcade Games", "GAME") {}

    function mintGame(
        address to,
        string memory tokenURI,
        GameMetadata memory metadata
    ) external returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(metadata.creator != address(0), "Creator cannot be zero address");
        require(metadata.writerCoin != address(0), "Writer coin cannot be zero address");
        require(bytes(metadata.genre).length > 0, "Genre cannot be empty");
        require(bytes(metadata.difficulty).length > 0, "Difficulty cannot be empty");

        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        games[tokenId] = metadata;
        creatorGames[metadata.creator].push(tokenId);

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

    function getGameMetadata(uint256 tokenId) external view returns (GameMetadata memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return games[tokenId];
    }

    function getCreatorGames(address creator) external view returns (uint256[] memory) {
        return creatorGames[creator];
    }

    function getTotalGamesMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    function tokenExists(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}
