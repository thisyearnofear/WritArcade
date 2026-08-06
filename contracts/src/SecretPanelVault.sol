// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {euint256, e, inco} from "@inco/lightning/src/Lib.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title SecretPanelVault
 * @dev Stores encrypted secret panel content using Inco confidential compute.
 *
 * Payloads larger than one euint256 plaintext (32 bytes) are stored as multiple
 * encrypted chunks. Clients decrypt all chunks and reassemble the JSON.
 */
contract SecretPanelVault is AccessControl, Ownable2Step {
    using e for euint256;
    using e for bytes;

    bytes32 public constant VAULT_MANAGER_ROLE = keccak256("VAULT_MANAGER_ROLE");

    address public gameNFT;

    mapping(uint256 => euint256[]) private secretPanelChunks;
    mapping(uint256 => euint256) public wordleAnswerHandle;

    mapping(uint256 => bool) public hasSecretPanel;
    mapping(uint256 => bool) public hasWordleAnswer;

    event SecretPanelStored(uint256 indexed tokenId, address indexed storer, uint256 chunkCount);
    event WordleAnswerStored(uint256 indexed tokenId, address indexed storer);
    event AccessGranted(uint256 indexed tokenId, address indexed grantee);
    event GameNFTUpdated(address indexed newGameNFT);

    constructor(address initialOwner, address _gameNFT) Ownable(initialOwner) {
        require(initialOwner != address(0), "SecretPanelVault: zero owner");
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(VAULT_MANAGER_ROLE, initialOwner);
        gameNFT = _gameNFT;
    }

    /**
     * @dev Store an encrypted secret panel as one or more ciphertext chunks.
     */
    function storeSecretPanel(
        uint256 tokenId,
        bytes[] calldata ciphertextChunks
    ) external payable onlyRole(VAULT_MANAGER_ROLE) {
        require(gameNFT != address(0), "SecretPanelVault: GameNFT not set");
        require(!hasSecretPanel[tokenId], "SecretPanelVault: already stored");
        require(ciphertextChunks.length > 0, "SecretPanelVault: empty payload");
        require(
            msg.value >= inco.getFee() * ciphertextChunks.length,
            "SecretPanelVault: fee not paid"
        );

        address nftOwner = _getNftOwner(tokenId);

        for (uint256 i = 0; i < ciphertextChunks.length; i++) {
            euint256 handle = ciphertextChunks[i].newEuint256(msg.sender);
            handle.allowThis();

            if (nftOwner != address(0)) {
                handle.allow(nftOwner);
            }

            secretPanelChunks[tokenId].push(handle);
        }

        hasSecretPanel[tokenId] = true;

        if (nftOwner != address(0)) {
            emit AccessGranted(tokenId, nftOwner);
        }

        emit SecretPanelStored(tokenId, msg.sender, ciphertextChunks.length);
    }

    function storeWordleAnswer(
        uint256 tokenId,
        bytes calldata ciphertext
    ) external payable onlyRole(VAULT_MANAGER_ROLE) {
        require(gameNFT != address(0), "SecretPanelVault: GameNFT not set");
        require(!hasWordleAnswer[tokenId], "SecretPanelVault: already stored");
        require(msg.value >= inco.getFee(), "SecretPanelVault: fee not paid");

        euint256 handle = ciphertext.newEuint256(msg.sender);
        wordleAnswerHandle[tokenId] = handle;
        hasWordleAnswer[tokenId] = true;

        handle.allowThis();

        address nftOwner = _getNftOwner(tokenId);
        if (nftOwner != address(0)) {
            handle.allow(nftOwner);
            emit AccessGranted(tokenId, nftOwner);
        }

        emit WordleAnswerStored(tokenId, msg.sender);
    }

    function grantAccessToNewOwner(
        uint256 tokenId,
        address newOwner
    ) external onlyRole(VAULT_MANAGER_ROLE) {
        require(newOwner != address(0), "SecretPanelVault: zero owner");

        if (hasSecretPanel[tokenId]) {
            euint256[] storage chunks = secretPanelChunks[tokenId];
            for (uint256 i = 0; i < chunks.length; i++) {
                chunks[i].allow(newOwner);
            }
            emit AccessGranted(tokenId, newOwner);
        }

        if (hasWordleAnswer[tokenId]) {
            wordleAnswerHandle[tokenId].allow(newOwner);
        }
    }

    function getSecretPanelChunkCount(uint256 tokenId) external view returns (uint256) {
        require(hasSecretPanel[tokenId], "SecretPanelVault: no panel stored");
        return secretPanelChunks[tokenId].length;
    }

    function getSecretPanelChunkHandle(uint256 tokenId, uint256 index) external view returns (bytes32) {
        require(hasSecretPanel[tokenId], "SecretPanelVault: no panel stored");
        return euint256.unwrap(secretPanelChunks[tokenId][index]);
    }

    /// @dev Backward-compatible alias for single-chunk panels.
    function getSecretPanelHandle(uint256 tokenId) external view returns (bytes32) {
        require(hasSecretPanel[tokenId], "SecretPanelVault: no panel stored");
        require(secretPanelChunks[tokenId].length > 0, "SecretPanelVault: no chunks");
        return euint256.unwrap(secretPanelChunks[tokenId][0]);
    }

    function getWordleAnswerHandle(uint256 tokenId) external view returns (bytes32) {
        require(hasWordleAnswer[tokenId], "SecretPanelVault: no answer stored");
        return euint256.unwrap(wordleAnswerHandle[tokenId]);
    }

    function setGameNFT(address _gameNFT) external onlyOwner {
        require(_gameNFT != address(0), "SecretPanelVault: zero GameNFT");
        gameNFT = _gameNFT;
        emit GameNFTUpdated(_gameNFT);
    }

    function _getNftOwner(uint256 tokenId) internal view returns (address) {
        if (gameNFT == address(0)) return address(0);

        (bool success, bytes memory data) = gameNFT.staticcall(
            abi.encodeWithSignature("ownerOf(uint256)", tokenId)
        );
        if (!success || data.length == 0) return address(0);
        return abi.decode(data, (address));
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
