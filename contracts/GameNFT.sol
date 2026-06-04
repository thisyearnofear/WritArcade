// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title GameNFT
 * @dev ERC-721 collection for games generated from articles.
 *
 * The payment contract mints through MINTER_ROLE. Metadata remains available
 * on-chain for app indexing, while tokenURI carries the full NFT JSON.
 */
contract GameNFT is ERC721URIStorage, ERC2981, AccessControl, Ownable2Step {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    struct GameMetadata {
        string articleUrl;
        address creator;
        address writerCoin;
        string genre;
        string difficulty;
        uint256 createdAt;
        string gameTitle;
    }

    uint256 private _nextTokenId = 1;
    bool public mintingPaused;
    string private _contractMetadataURI;

    mapping(uint256 tokenId => GameMetadata metadata) public games;
    mapping(address creator => uint256[] tokenIds) public creatorGames;

    event GameMinted(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed writerCoin,
        string genre,
        string difficulty,
        string articleUrl
    );
    event ContractURIUpdated(string contractURI);
    event MintingPauseUpdated(bool paused);

    constructor(
        address initialOwner,
        string memory initialContractURI,
        address royaltyReceiver,
        uint96 royaltyFeeNumerator
    ) ERC721("WritArcade Games", "GAME") Ownable(initialOwner) {
        require(initialOwner != address(0), "GameNFT: zero owner");

        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);

        _contractMetadataURI = initialContractURI;
        if (royaltyReceiver != address(0) && royaltyFeeNumerator > 0) {
            _setDefaultRoyalty(royaltyReceiver, royaltyFeeNumerator);
        }
    }

    /**
     * @dev Mint a new game NFT.
     * @param to Address receiving the NFT.
     * @param tokenURI_ Token metadata URI.
     * @param metadata Game metadata mirrored on-chain for discovery.
     */
    function mintGame(
        address to,
        string memory tokenURI_,
        GameMetadata memory metadata
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        require(!mintingPaused, "GameNFT: minting paused");
        require(to != address(0), "GameNFT: zero recipient");
        require(metadata.creator != address(0), "GameNFT: zero creator");
        require(metadata.writerCoin != address(0), "GameNFT: zero writer coin");
        require(bytes(tokenURI_).length > 0, "GameNFT: empty tokenURI");
        require(bytes(metadata.genre).length > 0, "GameNFT: empty genre");
        require(bytes(metadata.difficulty).length > 0, "GameNFT: empty difficulty");
        require(bytes(metadata.gameTitle).length > 0, "GameNFT: empty title");

        tokenId = _nextTokenId++;

        games[tokenId] = metadata;
        creatorGames[metadata.creator].push(tokenId);

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        emit GameMinted(
            tokenId,
            metadata.creator,
            metadata.writerCoin,
            metadata.genre,
            metadata.difficulty,
            metadata.articleUrl
        );
    }

    function setMintingPaused(bool paused) external onlyOwner {
        mintingPaused = paused;
        emit MintingPauseUpdated(paused);
    }

    function setContractURI(string calldata newContractURI) external onlyOwner {
        _contractMetadataURI = newContractURI;
        emit ContractURIUpdated(newContractURI);
    }

    function contractURI() external view returns (string memory) {
        return _contractMetadataURI;
    }

    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function deleteDefaultRoyalty() external onlyOwner {
        _deleteDefaultRoyalty();
    }

    function getGameMetadata(uint256 tokenId) external view returns (GameMetadata memory) {
        require(_ownerOf(tokenId) != address(0), "GameNFT: nonexistent token");
        return games[tokenId];
    }

    function getCreatorGames(address creator) external view returns (uint256[] memory) {
        return creatorGames[creator];
    }

    function getTotalGamesMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    function tokenExists(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC2981, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
