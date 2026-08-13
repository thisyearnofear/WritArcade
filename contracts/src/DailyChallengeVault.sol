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
 * Uses Inco confidential compute to shuffle a 52-card modifier deck per daily
 * deck cycle, deal five encrypted cards per player without replacement within a
 * cycle, score panel choices against encrypted optimal answers, and reveal at
 * the finale. A fresh encrypted shuffle is created before a session would
 * exhaust the current cycle, so the challenge is not capped at ten players.
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

    /// @notice Gradient scoring bands — verdicts per panel as encrypted euint256.
    uint256 public constant SCORE_DIRECT_HIT = 10;
    uint256 public constant SCORE_NEAR_MISS = 6;
    uint256 public constant SCORE_FAINT = 3;
    uint256 public constant SCORE_MISS = 1; // never 0, so "resonance" is never empty

    struct Challenge {
        uint256 day;
        elist shuffledDeck;
        uint16 nextDrawIndex;
        uint256 deckCycles;
        bool deckShuffled;
        uint256 totalSessions;
        uint256 revealedSessions;
    }

    struct Session {
        address player;
        uint256 challengeDay;
        euint256[] drawnModifiers;
        /// @notice Per-panel verdicts (10 | 6 | 3 | 1). Each handle is allowed to the
        /// player after recordChoice so the UI can show honest per-choice feedback
        /// without opening the running total before reveal.
        euint256[] panelVerdicts;
        euint256 score;
        uint8 panelsCompleted;
        bool completed;
        bool revealed;
    }

    mapping(uint256 => Challenge) public challenges;
    mapping(bytes32 => Session) public sessions;
    mapping(address => bytes32[]) public playerSessions;

    event ChallengeCreated(uint256 indexed day, bytes32 deckHandle);
    event ChallengeDeckReshuffled(uint256 indexed day, uint256 indexed deckCycle, bytes32 deckHandle);
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

        Challenge storage challenge = challenges[day];
        challenge.day = day;
        challenge.deckShuffled = true;
        _shuffleChallengeDeck(day, challenge);

        emit ChallengeCreated(day, elist.unwrap(challenge.shuffledDeck));
    }

    /**
     * @dev Start a session and deal five encrypted modifier cards from the shuffled deck.
     */
    function startSession(uint256 day) external payable returns (bytes32 sessionId) {
        Challenge storage challenge = challenges[day];
        require(challenge.deckShuffled, "DailyChallengeVault: challenge not created");
        uint256 requiredFee = getStartSessionFee(day);
        require(msg.value >= requiredFee, "DailyChallengeVault: insufficient fee");

        // Do not strand the eleventh player: once fewer than five cards remain,
        // create a new encrypted 52-card cycle before dealing the next hand.
        if (_needsDeckReshuffle(challenge)) {
            _shuffleChallengeDeck(day, challenge);
        }

        sessionId = keccak256(abi.encodePacked(msg.sender, day, block.timestamp, challenge.totalSessions));
        require(sessions[sessionId].player == address(0), "DailyChallengeVault: session exists");

        Session storage session = sessions[sessionId];
        session.player = msg.sender;
        session.challengeDay = day;
        session.panelsCompleted = 0;
        session.completed = false;
        session.revealed = false;
        session.score = uint256(0).asEuint256();
        _allowNarrativeOperator(session.score);

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
    function recordChoice(bytes32 sessionId, uint8 panelIndex, uint8 choiceIndex)
        external
        onlyRole(SESSION_MANAGER_ROLE)
    {
        Session storage session = sessions[sessionId];
        require(session.player != address(0), "DailyChallengeVault: unknown session");
        require(!session.completed, "DailyChallengeVault: session completed");
        require(panelIndex == session.panelsCompleted, "DailyChallengeVault: wrong panel");
        require(panelIndex < PANELS_PER_GAME, "DailyChallengeVault: out of range");
        require(choiceIndex < CHOICES_PER_PANEL, "DailyChallengeVault: invalid choice");

        euint256 verdict = _computePanelVerdict(session.drawnModifiers[panelIndex], choiceIndex);

        // The player is not msg.sender here (the session manager relays) — grant
        // session.player access so the UI can decrypt this panel's verdict.
        // The running total (session.score) stays sealed until completeAndReveal.
        verdict.allow(session.player);
        verdict.allowThis();
        _allowNarrativeOperator(verdict);
        session.panelVerdicts.push(verdict);

        session.score = session.score.add(verdict);
        session.score.allowThis();
        _allowNarrativeOperator(session.score);

        session.panelsCompleted++;

        emit PanelCompleted(sessionId, panelIndex, choiceIndex);
    }

    /**
     * @dev Score one panel choice as a gradient verdict against the hidden optimal.
     * Returns 10 | 6 | 3 | 1 as an encrypted euint256.
     *
     * Branch-safe under the FHE constraint: `e.select(c, a, b)` eagerly evaluates
     * *both* branches, so the naive `select(ge, sub(p, o), sub(o, p))` still runs
     * the under-flowing branch and panics. We avoid subtraction by computing the
     * clockwise distance from player → optimal in modular arithmetic, and the
     * counter-clockwise distance under the same pattern, then take the min.
     */
    function _computePanelVerdict(euint256 modifierCard, uint8 choiceIndex) internal returns (euint256) {
        // Labels are already in [0, CHOICES_PER_PANEL).
        euint256 optimalChoice = modifierCard.rem(CHOICES_PER_PANEL);
        euint256 playerChoice = uint256(choiceIndex).asEuint256();

        ebool isHit = optimalChoice.eq(playerChoice);

        // Clockwise distance from playerChoice to optimalChoice:
        //        clockwise = (optimal + N - player) mod N, for N = CHOICES_PER_PANEL.
        // We express it as ((optimal + N) - player) mod N. Adding N to optimalChoice
        // (max 7) and subtracting playerChoice (min 0) is always non-negative, so
        // the sub never underflows regardless of the ebool branch.
        euint256 clockwise = optimalChoice
            .add(CHOICES_PER_PANEL)
            .sub(playerChoice)
            .rem(CHOICES_PER_PANEL); // 0 | 1 | 2 | 3

        // Counter-clockwise distance: (player + N - optimal) mod N — same trick.
        euint256 counterClockwise = playerChoice
            .add(CHOICES_PER_PANEL)
            .sub(optimalChoice)
            .rem(CHOICES_PER_PANEL); // 0 | 1 | 2 | 3

        // Ring distance is the shorter arc; on a 4-dial the max is 2.
        euint256 distance = clockwise.min(counterClockwise); // 0 | 1 | 2

        euint256 verdict = e.select(
            isHit,
            uint256(SCORE_DIRECT_HIT).asEuint256(),
            e.select(
                distance.eq(uint256(1).asEuint256()),
                uint256(SCORE_NEAR_MISS).asEuint256(),
                e.select(
                    distance.eq(uint256(2).asEuint256()),
                    uint256(SCORE_FAINT).asEuint256(),
                    uint256(SCORE_MISS).asEuint256()
                )
            )
        );
        return verdict;
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

    /**
     * @notice Return the exact payable amount required to start a session.
     * Includes a replacement encrypted deck when the current cycle has fewer
     * than five cards left.
     */
    function getStartSessionFee(uint256 day) public view returns (uint256) {
        Challenge storage challenge = challenges[day];
        require(challenge.deckShuffled, "DailyChallengeVault: challenge not created");

        uint256 fee = inco.getFee() * PANELS_PER_GAME;
        if (_needsDeckReshuffle(challenge)) {
            fee += inco.getEListFee(uint16(DECK_SIZE), ETypes.Uint256) * 2;
        }
        return fee;
    }

    /// @notice Card values are canonical modifier IDs in the inclusive 1-52 range.
    function modifierIdFromCardValue(uint256 cardValue) public pure returns (uint8) {
        require(cardValue >= 1 && cardValue <= DECK_SIZE, "DailyChallengeVault: invalid modifier");
        return uint8(cardValue);
    }

    /// @notice Scoring uses the same canonical modifier value that is revealed.
    function getOptimalChoiceForModifier(uint256 modifierId) public pure returns (uint8) {
        return modifierIdFromCardValue(modifierId) % uint8(CHOICES_PER_PANEL);
    }

    function getSessionModifiers(bytes32 sessionId) external view returns (bytes32[PANELS_PER_GAME] memory handles) {
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

    /**
     * @notice Handle for one panel's encrypted verdict (10 | 6 | 3 | 1).
     * @dev Same ACL as getSessionScore. The client attested-decrypts this handle
     * after recordChoice to show per-choice feedback without opening the total.
     */
    function getPanelVerdictHandle(bytes32 sessionId, uint8 panelIndex) external view returns (bytes32) {
        Session storage session = sessions[sessionId];
        require(
            msg.sender == session.player || hasRole(SESSION_MANAGER_ROLE, msg.sender),
            "DailyChallengeVault: not authorized"
        );
        require(panelIndex < session.panelVerdicts.length, "DailyChallengeVault: panel not recorded");
        return euint256.unwrap(session.panelVerdicts[panelIndex]);
    }

    function isSessionRevealed(bytes32 sessionId) external view returns (bool) {
        return sessions[sessionId].revealed;
    }

    function getSessionPlayer(bytes32 sessionId) external view returns (address) {
        return sessions[sessionId].player;
    }

    function getSessionChallengeDay(bytes32 sessionId) external view returns (uint256) {
        return sessions[sessionId].challengeDay;
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

    function _needsDeckReshuffle(Challenge storage challenge) internal view returns (bool) {
        return uint256(challenge.nextDrawIndex) + PANELS_PER_GAME > DECK_SIZE;
    }

    function _shuffleChallengeDeck(uint256 day, Challenge storage challenge) internal {
        elist deck = e.shuffledRange(1, uint16(DECK_SIZE + 1), ETypes.Uint256);
        deck.allowThis();

        challenge.shuffledDeck = deck;
        challenge.nextDrawIndex = 0;
        challenge.deckCycles++;

        emit ChallengeDeckReshuffled(day, challenge.deckCycles, elist.unwrap(deck));
    }

    function _allowNarrativeOperator(euint256 value) internal {
        if (narrativeOperator != address(0)) {
            value.allow(narrativeOperator);
        }
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
