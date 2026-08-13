// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {DailyChallengeVault} from "../src/DailyChallengeVault.sol";
import {IncoTest} from "@inco/lightning/src/test/IncoTest.sol";
import {inco} from "@inco/lightning/src/Lib.sol";
import {ETypes} from "@inco/lightning/src/Types.sol";

contract DailyChallengeVaultTest is IncoTest {
    uint256 private constant DAY = 1_234;
    DailyChallengeVault private vault;

    function setUp() public override {
        super.setUp();

        vm.deal(address(this), 100 ether);
        vault = new DailyChallengeVault(address(this), address(this));

        uint256 deckFee = inco.getEListFee(uint16(vault.DECK_SIZE()), ETypes.Uint256) * 2;
        vault.createDailyChallenge{value: deckFee}(DAY);
    }

    function testEleventhSessionStartsFromReshuffledDeckCycle() public {
        for (uint160 i = 1; i <= 11; i++) {
            _start(address(0x1000 + i));
        }

        (uint256 totalSessions,, bool deckShuffled) = vault.getChallengeStats(DAY);
        assertEq(totalSessions, 11);
        assertTrue(deckShuffled);
    }

    function testModifierMappingPreservesCardFiftyTwo() public {
        assertEq(vault.modifierIdFromCardValue(1), 1);
        assertEq(vault.modifierIdFromCardValue(52), 52);

        vm.expectRevert(bytes("DailyChallengeVault: invalid modifier"));
        vault.modifierIdFromCardValue(0);
        vm.expectRevert(bytes("DailyChallengeVault: invalid modifier"));
        vault.modifierIdFromCardValue(53);
    }

    function testScoringUsesCanonicalModifierValueModuloFour() public view {
        assertEq(vault.getOptimalChoiceForModifier(1), 1);
        assertEq(vault.getOptimalChoiceForModifier(4), 0);
        assertEq(vault.getOptimalChoiceForModifier(52), 0);
    }

    function testRecordingOptimalChoicesProducesFiftyPointScore() public {
        bytes32 sessionId = _start(alice);
        bytes32[5] memory modifiers = vault.getSessionModifiers(sessionId);

        for (uint8 panelIndex = 0; panelIndex < vault.PANELS_PER_GAME(); panelIndex++) {
            uint8 optimalChoice = uint8(uint256(get(modifiers[panelIndex])) % vault.CHOICES_PER_PANEL());
            vm.recordLogs(); // exclude Inco list-shuffle logs, which the fake operation handler does not model
            vault.recordChoice(sessionId, panelIndex, optimalChoice);
            processAllOperations();
        }

        assertEq(uint256(get(vault.getSessionScore(sessionId))), 50);
    }

    /// @dev Choose the label that is exactly `distance` positions away from `optimal`
    /// on a 4-option dial (0..3). Picks the clockwise direction, which is always
    /// reachable since distance ≤ 2.
    function _choiceAtDistance(uint256 optimal, uint8 distance) private pure returns (uint8) {
        return uint8((optimal + distance) % 4);
    }

    function testPanelVerdictsStoreGradientBands() public {
        bytes32 sessionId = _start(alice);
        bytes32[5] memory modifiers = vault.getSessionModifiers(sessionId);

        for (uint8 panelIndex = 0; panelIndex < vault.PANELS_PER_GAME(); panelIndex++) {
            uint256 optimal = uint256(get(modifiers[panelIndex])) % vault.CHOICES_PER_PANEL();
            // panel 0 -> distance 0 (hit), panel 1 -> distance 1 (near miss),
            // panel 2 -> distance 2 (faint), panel 3 -> distance 1 (near miss,
            // opposite direction), panel 4 -> distance 0 again so the session
            // total is exact. Distance 3 is unreachable on a 4-dial ring, so the
            // SCORE_MISS branch only fires if a future tweak widens the dial.
            uint8 distance = panelIndex == 3 ? 1 : (panelIndex == 4 ? 0 : panelIndex);
            uint8 choice = _choiceAtDistance(optimal, distance);
            vm.recordLogs();
            vault.recordChoice(sessionId, panelIndex, choice);
            processAllOperations();
        }

        uint256 verdict0 = uint256(get(vault.getPanelVerdictHandle(sessionId, 0)));
        uint256 verdict1 = uint256(get(vault.getPanelVerdictHandle(sessionId, 1)));
        uint256 verdict2 = uint256(get(vault.getPanelVerdictHandle(sessionId, 2)));
        uint256 verdict3 = uint256(get(vault.getPanelVerdictHandle(sessionId, 3)));
        uint256 verdict4 = uint256(get(vault.getPanelVerdictHandle(sessionId, 4)));

        assertEq(verdict0, 10); // distance 0
        assertEq(verdict1, 6);  // distance 1
        assertEq(verdict2, 3);  // distance 2
        assertEq(verdict3, 6);  // distance 1 (reverse arc)
        assertEq(verdict4, 10); // distance 0

        // Session total must be the sum of per-panel verdicts.
        assertEq(uint256(get(vault.getSessionScore(sessionId))), 10 + 6 + 3 + 6 + 10);
    }

    function _start(address player) private returns (bytes32 sessionId) {
        vm.deal(player, 100 ether);
        uint256 fee = vault.getStartSessionFee(DAY);
        vm.prank(player);
        sessionId = vault.startSession{value: fee}(DAY);
    }
}
