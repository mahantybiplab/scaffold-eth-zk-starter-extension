// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/multiplier2Groth16Verifier.sol"; // Make sure this path is correct


contract DeployGroth16Verifier is ScaffoldETHDeploy {
   
    function run() external ScaffoldEthDeployerRunner {
        // Deploy the Groth16 Verifier
        Groth16Verifier verifier = new multiplier2Groth16Verifier();
       
        
    }
}