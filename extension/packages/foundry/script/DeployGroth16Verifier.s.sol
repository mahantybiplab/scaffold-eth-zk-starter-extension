// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import { Groth16Verifier } from "../contracts/Groth16Verifier.sol";

contract DeployGroth16Verifier is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        // Deploy the Groth16 Verifier
        Groth16Verifier verifier = new Groth16Verifier();
        console.log("Groth16Verifier deployed at:", address(verifier));
    }
}
