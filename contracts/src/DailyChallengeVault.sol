// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {euint256, ebool, e, inco} from "@inco/lightning/src/Lib.sol";
import {elist, ETypes} from "@inco/lightning/src/Types.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title DailyChallengeVault
 * @dev Confidential game session manager for WritersArcade daily challenges.
 *
 * Uses Inco confidential compute to shuffle a shared 52-card modifier deck once
 * per day, deal five encrypted cards per player without replacement, score panel
 * choices against encrypted optimal answers, and reveal at the finale.
 *
 * Flow:
 *   1. Backend creates the daily challenge and shuffles the deck via e.shuffledRange()
 *   2. Player starts a session and receives five encrypted cards from the deck
 *   3. Backend records each panel choice and updates the encrypted score
 *   4. Player calls completeAndReveal to publish score + modifiers
 */
contract DailyChallengeVault is AccessControl, Ownable2Step {
    using e for euint256;
    using e for uint256;
    using e for elist;

    bytes32 public constant SESSION_MANAGER_ROLE = keccak256("SESSION_MANAGER_ROLE");

    /// @notice Backend operator allowed to decrypt cards for AI narrative generation (never exposed to client)
    address public narrativeOperator;

    uint256 public constant DECK_SIZE = 52;
    uint256 public constant PANELS_PER_GAME = 5;
    uint256 public constant CHOICES_PER_PANEL = 4;
    uint256 public constant SCORE_PER_HIT = 10;

    struct Challenge {
        uint256 day;
        elist shuffledDeck;
        uint16 nextDrawIndex;
        bool deckShuffled;
        uint256 totalSessions;
        uint256 revealedSessions;
    }

    struct Session {
        address player;
        uint256 challengeDay;
        euint256[] drawnModifiers;
        euint256 score;
        uint8 panelsCompleted;
        bool completed;
        bool revealed;
    }

    mapping(uint256 => Challenge) public challenges;
    mapping(bytes32 => Session) public sessions;
    mapping(address => bytes32[]) public playerSessions;

    event ChallengeCreated(uint256 indexed day, bytes32 deckHandle);
    event SessionStarted(bytes32 indexed sessionId, address indexed player, uint256 indexed day);
    event PanelCompleted(bytes32 indexed sessionId, uint8 panelIndex, uint8 choiceIndex);
    event SessionCompleted(bytes32 indexed sessionId);
    event SessionRevealed(bytes32 indexed sessionId);

    constructor(address initialOwner, address _narrativeOperator) Ownable(initialOwner) {
        require(initialOwner != address(0), "DailyChallengeVault: zero owner");
        require(_narrativeOperator != address(0), "DailyChallengeVault: zero operator");
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(SESSION_MANAGER_ROLE, initialOwner);
        narrativeOperator = _narrativeOperator;
    }

    /**
     * @dev Create a daily challenge and shuffle the shared modifier deck.
     * Modifier IDs are values 1-52; the shuffle order is encrypted on-chain.
     */
    function createDailyChallenge(uint256 day) external payable onlyRole(SESSION_MANAGER_ROLE) {
        require(!challenges[day].deckShuffled, "DailyChallengeVault: already shuffled");

        uint256 listFee = inco.getEListFee(uint16(DECK_SIZE), ETypes.Uint256);
        require(msg.value >= listFee * 2, "DailyChallengeVault: insufficient fee for shuffle");

        elist deck = e.shuffledRange(1, uint16(DECK_SIZE + 1), ETypes.Uint256);
        deck.allowThis();

        challenges[day] = Challenge({
            day: day,
            shuffledDeck: deck,
            nextDrawIndex: 0,
            deckShuffled: true,
            totalSessions: 0,
            revealedSessions: 0
        });

        emit ChallengeCreated(day, elist.unwrap(deck));
    }

    /**
     * @dev Start a session and deal five encrypted modifier cards from the shuffled deck.
     */
    function startSession(uint256 day) external payable returns (bytes32 sessionId) {
        Challenge storage challenge = challenges[day];
        require(challenge.deckShuffled, "DailyChallengeVault: challenge not created");
        require(
            uint256(challenge.nextDrawIndex) + PANELS_PER_GAME <= DECK_SIZE,
            "DailyChallengeVault: deck exhausted"
        );
        require(msg.value >= inco.getFee() * PANELS_PER_GAME, "DailyChallengeVault: insufficient fee");

        sessionId = keccak256(abi.encodePacked(msg.sender, day, block.timestamp, challenge.totalSessions));
        require(sessions[sessionId].player == address(0), "DailyChallengeVault: session exists");

        Session storage session = sessions[sessionId];
        session.player = msg.sender;
        session.challengeDay = day;
        session.panelsCompleted = 0;
        session.completed = false;
        session.revealed = false;
        session.score = uint256(0).asEuint256();

        for (uint8 i = 0; i < PANELS_PER_GAME; i++) {
            uint16 deckIndex = challenge.nextDrawIndex + i;
            euint256 card = e.getEuint256(challenge.shuffledDeck, deckIndex);
            card.allow(msg.sender);
            card.allowThis();
            if (narrativeOperator != address(0)) {
                card.allow(narrativeOperator);
            }
            session.drawnModifiers.push(card);
        }

        challenge.nextDrawIndex += uint16(PANELS_PER_GAME);
        challenge.totalSessions++;
        playerSessions[msg.sender].push(sessionId);

        emit SessionStarted(sessionId, msg.sender, day);
    }

    /**
     * @dev Record a player's choice for a panel and update the encrypted score.
     * optimalChoice = modifier % CHOICES_PER_PANEL (0-3, matching choiceIndex).
     */
    function recordChoice(
        bytes32 sessionId,
        uint8 panelIndex,
        uint8 choiceIndex
    ) external onlyRole(SESSION_MANAGER_ROLE) {
        Session storage session = sessions[sessionId];
        require(session.player != address(0), "DailyChallengeVault: unknown session");
        require(!session.completed, "DailyChallengeVault: session completed");
        require(panelIndex == session.panelsCompleted, "DailyChallengeVault: wrong panel");
        require(panelIndex < PANELS_PER_GAME, "DailyChallengeVault: out of range");
        require(choiceIndex < CHOICES_PER_PANEL, "DailyChallengeVault: invalid choice");

        euint256 modifierCard = session.drawnModifiers[panelIndex];
        euint256 optimalChoice = modifierCard.rem(CHOICES_PER_PANEL);
        euint256 playerChoice = uint256(choiceIndex).asEuint256();

        ebool isHit = optimalChoice.eq(playerChoice);
        euint256 scoreDelta = e.select(isHit, uint256(SCORE_PER_HIT).asEuint256(), uint256(0).asEuint256());
        session.score = session.score.add(scoreDelta);
        session.score.allowThis();

        session.panelsCompleted++;

        emit PanelCompleted(sessionId, panelIndex, choiceIndex);
    }

    /**
     * @dev Complete the session and reveal the score + modifiers on-chain.
     */
    function completeAndReveal(bytes32 sessionId) external {
        Session storage session = sessions[sessionId];
        require(session.player == msg.sender, "DailyChallengeVault: not session owner");
        require(session.panelsCompleted == PANELS_PER_GAME, "DailyChallengeVault: not complete");
        require(!session.revealed, "DailyChallengeVault: already revealed");

        session.completed = true;
        session.revealed = true;

        session.score.reveal();

        for (uint8 i = 0; i < PANELS_PER_GAME; i++) {
            session.drawnModifiers[i].reveal();
        }

        challenges[session.challengeDay].revealedSessions++;

        emit SessionCompleted(sessionId);
        emit SessionRevealed(sessionId);
    }

    function getSessionModifiers(bytes32 sessionId)
        external
        view
        returns (bytes32[PANELS_PER_GAME] memory handles)
    {
        Session storage session = sessions[sessionId];
        require(
            msg.sender == session.player || hasRole(SESSION_MANAGER_ROLE, msg.sender),
            "DailyChallengeVault: not authorized"
        );
        for (uint8 i = 0; i < PANELS_PER_GAME; i++) {
            handles[i] = euint256.unwrap(session.drawnModifiers[i]);
        }
    }

    function getSessionScore(bytes32 sessionId) external view returns (bytes32) {
        Session storage session = sessions[sessionId];
        require(
            msg.sender == session.player || hasRole(SESSION_MANAGER_ROLE, msg.sender),
            "DailyChallengeVault: not authorized"
        );
        return euint256.unwrap(session.score);
    }

    function isSessionRevealed(bytes32 sessionId) external view returns (bool) {
        return sessions[sessionId].revealed;
    }

    function getSessionPlayer(bytes32 sessionId) external view returns (address) {
        return sessions[sessionId].player;
    }

    function getChallengeStats(uint256 day)
        external
        view
        returns (uint256 totalSessions, uint256 revealedSessions, bool deckShuffled)
    {
        Challenge storage challenge = challenges[day];
        return (challenge.totalSessions, challenge.revealedSessions, challenge.deckShuffled);
    }

    function getPlayerSessions(address player) external view returns (bytes32[] memory) {
        return playerSessions[player];
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
