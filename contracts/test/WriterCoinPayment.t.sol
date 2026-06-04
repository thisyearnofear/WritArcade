// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../GameNFT.sol";
import "../WriterCoinPayment.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface Vm {
    function prank(address sender) external;
    function startPrank(address sender) external;
    function stopPrank() external;
    function expectRevert() external;
    function expectRevert(bytes calldata revertData) external;
}

contract MockWriterCoin is ERC20 {
    constructor() ERC20("Mock Writer Coin", "MWC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract WriterCoinPaymentTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    address private constant OWNER = address(0x1000);
    address private constant MINTER = address(0x2000);
    address private constant SPOOFED_CREATOR = address(0x3000);
    address private constant WRITER_TREASURY = address(0x4000);
    address private constant PLATFORM_TREASURY = address(0x5000);
    address private constant CREATOR_POOL = address(0x6000);
    address private constant ROYALTY_RECEIVER = address(0x7000);

    MockWriterCoin private coin;
    GameNFT private nft;
    WriterCoinPayment private payment;

    function setUp() public {
        vm.startPrank(OWNER);
        coin = new MockWriterCoin();
        nft = new GameNFT(OWNER, "ipfs://collection", ROYALTY_RECEIVER, 500);
        payment = new WriterCoinPayment(
            OWNER,
            PLATFORM_TREASURY,
            CREATOR_POOL,
            address(nft)
        );

        nft.grantRole(nft.MINTER_ROLE(), address(payment));
        payment.whitelistCoin(
            address(coin),
            100 ether,
            50 ether,
            WRITER_TREASURY,
            6000,
            2000,
            2000,
            5000,
            1500,
            500,
            8000,
            1000,
            1000
        );
        vm.stopPrank();

        coin.mint(MINTER, 1000 ether);
    }

    function testPayAndMintWorksFromZeroPaymentContractBalance() public {
        IGameNFT.GameMetadata memory metadata = _metadata(MINTER);

        vm.startPrank(MINTER);
        coin.approve(address(payment), 50 ether);
        uint256 tokenId = payment.payAndMintGame(address(coin), "ipfs://game", metadata);
        vm.stopPrank();

        assert(tokenId == 1);
        assert(nft.ownerOf(tokenId) == MINTER);
        assert(nft.getTotalGamesMinted() == 1);

        assert(coin.balanceOf(address(payment)) == 0);
        assert(coin.balanceOf(WRITER_TREASURY) == 7.5 ether);
        assert(coin.balanceOf(PLATFORM_TREASURY) == 2.5 ether);

        // The minter is also the game creator in the app flow, so they receive
        // creator share plus the undistributed minter refund.
        assert(coin.balanceOf(MINTER) == 990 ether);
    }

    function testMintRejectsSpoofedCreatorMetadata() public {
        IGameNFT.GameMetadata memory metadata = _metadata(SPOOFED_CREATOR);

        vm.startPrank(MINTER);
        coin.approve(address(payment), 50 ether);
        vm.expectRevert(bytes("WriterCoinPayment: creator must be minter"));
        payment.payAndMintGame(address(coin), "ipfs://game", metadata);
        vm.stopPrank();
    }

    function testGameNFTSupportsDefaultRoyalties() public {
        vm.prank(OWNER);
        uint256 tokenId = nft.mintGame(MINTER, "ipfs://direct", _nftMetadata(MINTER));

        (address receiver, uint256 royaltyAmount) = nft.royaltyInfo(tokenId, 100 ether);

        assert(receiver == ROYALTY_RECEIVER);
        assert(royaltyAmount == 5 ether);
    }

    function testPaymentPauseBlocksMinting() public {
        vm.prank(OWNER);
        payment.pause();

        vm.startPrank(MINTER);
        coin.approve(address(payment), 50 ether);
        vm.expectRevert();
        payment.payAndMintGame(address(coin), "ipfs://game", _metadata(MINTER));
        vm.stopPrank();
    }

    function _metadata(address creator) private view returns (IGameNFT.GameMetadata memory) {
        return IGameNFT.GameMetadata({
            articleUrl: "https://paragraph.com/@writer/post",
            creator: creator,
            writerCoin: address(coin),
            genre: "mystery",
            difficulty: "medium",
            createdAt: 1_780_000_000,
            gameTitle: "The Test Arcade"
        });
    }

    function _nftMetadata(address creator) private view returns (GameNFT.GameMetadata memory) {
        return GameNFT.GameMetadata({
            articleUrl: "https://paragraph.com/@writer/post",
            creator: creator,
            writerCoin: address(coin),
            genre: "mystery",
            difficulty: "medium",
            createdAt: 1_780_000_000,
            gameTitle: "The Test Arcade"
        });
    }
}
