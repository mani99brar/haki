// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {INameWrapper} from "@ensdomains/ens-contracts/contracts/wrapper/INameWrapper.sol";
import {PublicResolver} from "@ensdomains/ens-contracts/contracts/resolvers/PublicResolver.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

contract Haki {
    INameWrapper public immutable nameWrapper;
    PublicResolver public immutable publicResolver;
    bytes32 public immutable parentNode;
    address public immutable marketResolver;
    address public arbitrator;
    address public token;

    uint256 public constant challengeDeposit = 0.01 ether;
    uint64 public constant challengePeriod = 1 days;

    // Fuses: CU (0x1) | CSTR (0x40) = 0x41 (decimal 65)
    // This fits into a uint16.
    uint16 constant LOCK_FUSES = 0x1 | 0x40;

    struct Market {
        address creator;
        uint256 resultTimestamp;
        bytes32 stateRoot;
        bool resolved;
        bool challenged;
        string label;
        uint64 expiry;
    }

    mapping(bytes32 => Market) public markets;
    mapping(bytes32 => mapping(address => bool)) public hasWithdrawn;

    // --- Events ---
    event MarketCreated(bytes32 indexed node, address indexed creator, string label);
    event ResultSubmitted(bytes32 indexed node, string option, bytes32 stateRoot);
    event MarketChallenged(bytes32 indexed node, address indexed challenger);
    event MarketResolved(bytes32 indexed node, string winner, bool wasChallenged);

    constructor(
        address _wrapper,
        address _resolver,
        bytes32 _parentNode,
        address _marketResolver,
        address _arbitrator,
        address _token
    ) {
        nameWrapper = INameWrapper(_wrapper);
        publicResolver = PublicResolver(_resolver);
        parentNode = _parentNode;
        marketResolver = _marketResolver;
        arbitrator = _arbitrator;
        token = _token;
    }

    /**
     * @notice Step 1: Create Market (Held in Escrow)
     */
    function createMarket(string calldata label, string calldata description, string calldata options, uint64 expiry)
        external
    {
        bytes32 labelHash = keccak256(bytes(label));
        bytes32 subnode = keccak256(abi.encodePacked(parentNode, labelHash));

        // ENS Expiry: Must be at least enough for the challenge period
        uint64 fullExpiry = expiry + uint64(challengePeriod) + 7 days;

        nameWrapper.setSubnodeRecord(parentNode, label, address(this), address(publicResolver), 0, 0, fullExpiry);

        publicResolver.setText(subnode, "description", description);
        publicResolver.setText(subnode, "options", options);
        publicResolver.setText(subnode, "status", "Open");

        markets[subnode] = Market({
            creator: msg.sender,
            resultTimestamp: 0,
            stateRoot: bytes32(0),
            resolved: false,
            challenged: false,
            label: label,
            expiry: expiry
        });

        emit MarketCreated(subnode, msg.sender, label);
    }

    /**
     * @notice Step 2: Submit initial result (Starts Challenge Period)
     */
    function submitMarketResult(bytes32 node, string calldata option, bytes32 stateRoot) external {
        require(msg.sender == marketResolver, "Only marketResolver");
        Market storage market = markets[node];
        require(market.creator != address(0), "Market doesn't exist");
        require(!market.resolved, "Already resolved");
        require(market.expiry < block.timestamp, "Market still active");

        publicResolver.setText(node, "status", "Challenge_Period");
        publicResolver.setText(node, "winner", option);

        market.resultTimestamp = block.timestamp;
        market.stateRoot = stateRoot;

        emit ResultSubmitted(node, option, stateRoot);
    }

    /**
     * @notice Step 3: Challenge a result (Escalates to Arbitrator)
     */
    function challengeMarketResult(bytes32 node) external payable {
        require(msg.value >= challengeDeposit, "Insufficient deposit");
        Market storage market = markets[node];
        require(market.resultTimestamp != 0, "Not challengeable");
        require(block.timestamp <= market.resultTimestamp + challengePeriod, "Challenge period passed");
        require(!market.challenged, "Already challenged");

        market.challenged = true;
        publicResolver.setText(node, "status", "Resolving");

        emit MarketChallenged(node, msg.sender);
    }

    /**
     * @notice Final Resolution by Arbitrator (e.g. Kleros)
     */
    function resolveByArbitrator(bytes32 node, string calldata option, bytes32 stateRoot) external {
        require(msg.sender == arbitrator, "Only arbitrator");
        Market storage m = markets[node];
        require(m.challenged, "Not in dispute");

        _finalize(node, option, stateRoot, true);
    }

    /**
     * @notice Finalize after Challenge Period passes without dispute
     */
    function finalizeAndRelease(bytes32 node) external {
        Market storage m = markets[node];
        require(m.resultTimestamp != 0, "No result submitted");
        require(block.timestamp > m.resultTimestamp + challengePeriod, "Challenge period active");
        require(!m.resolved, "Already resolved");
        require(!m.challenged, "Market is in dispute");

        _finalize(node, "", bytes32(0), false); // Result already set in submitMarketResult
    }

    function claimWinnings(bytes32 node, bytes32[] calldata proof, uint256 shares) external {
        Market storage m = markets[node];
        require(m.resolved, "Market not resolved");
        require(!hasWithdrawn[node][msg.sender], "Already claimed");

        string memory winner = publicResolver.text(node, "winner");

        // 1. Verify the leaf belongs to the stateRoot anchored in the contract
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, shares, winner));
        require(MerkleProof.verify(proof, m.stateRoot, leaf), "Invalid Merkle Proof");

        // 2. Verify the user bet on the actual winner stored in ENS
        // We fetch the winner index from the Public Resolver

        // 3. Mark as withdrawn and transfer Yellow tokens
        hasWithdrawn[node][msg.sender] = true;

        // Payout logic (1 share = 1 Yellow token in LMSR finality)
        IERC20(token).transfer(msg.sender, shares);
    }

    /**
     * @dev Internal helper to lock ENS and transfer NFT
     */
    function _finalize(bytes32 node, string memory option, bytes32 stateRoot, bool fromArbitrator) internal {
        Market storage m = markets[node];

        if (fromArbitrator) {
            publicResolver.setText(node, "winner", option);
            m.stateRoot = stateRoot;
        }

        publicResolver.setText(node, "status", "Closed");
        nameWrapper.setFuses(node, LOCK_FUSES);
        nameWrapper.safeTransferFrom(address(this), m.creator, uint256(node), 1, "");

        m.resolved = true;
        emit MarketResolved(node, option, fromArbitrator);
    }

    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    // Also add supportsInterface to be fully compliant
    function supportsInterface(bytes4 interfaceId) public view virtual returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId || interfaceId == 0x01ffc9a7;
    }
}
