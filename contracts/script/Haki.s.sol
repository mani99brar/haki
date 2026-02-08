// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {Haki} from "../src/Haki.sol";

contract DeployHaki is Script {
    // Sepolia ENS Addresses
    address constant NAME_WRAPPER = 0x0635513f179D50A207757E05759CbD106d7dFcE8;
    address constant PUBLIC_RESOLVER = 0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5;

    // Replace with your actual Yellow Token address on Sepolia
    address constant YELLOW_TOKEN = 0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        // 1. Calculate the Namehash for your platform (e.g., "haki-pm.eth")
        // namehash("haki-pm.eth") = keccak256(abi.encodePacked(namehash("eth"), keccak256("haki")))
        bytes32 ethNode = keccak256(abi.encodePacked(bytes32(0), keccak256("eth")));
        bytes32 hakiNode = keccak256(abi.encodePacked(ethNode, keccak256("haki-o")));

        vm.startBroadcast(deployerPrivateKey);

        // 2. Deploy Haki
        // Arguments: Wrapper, Resolver, ParentNode, MarketResolver, Arbitrator, Token
        Haki haki = new Haki(
            NAME_WRAPPER,
            PUBLIC_RESOLVER,
            hakiNode,
            deployerAddress, // Setting deployer as MarketResolver for testing
            deployerAddress, // Setting deployer as Arbitrator for testing
            YELLOW_TOKEN
        );

        console.log("Haki deployed at:", address(haki));
        console.log("Parent Node (haki-pm.eth):");
        console.logBytes32(hakiNode);

        vm.stopBroadcast();
    }
}
