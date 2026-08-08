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

    function _start(address player) private returns (bytes32 sessionId) {
        vm.deal(player, 100 ether);
        uint256 fee = vault.getStartSessionFee(DAY);
        vm.prank(player);
        sessionId = vault.startSession{value: fee}(DAY);
    }
}
