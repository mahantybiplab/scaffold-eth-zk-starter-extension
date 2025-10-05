"use client";

import { useEffect, useState } from "react";
import { groth16 } from "snarkjs";
import { usePublicClient } from "wagmi";
import contracts from "~~/contracts/deployedContracts";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

// Generate proof using snarkjs
const makeProof = async (_proofInput: any, _wasm: string, _zkey: string) => {
  const { proof, publicSignals } = await groth16.fullProve(_proofInput, _wasm, _zkey);
  return { proof, publicSignals };
};

// Off-chain verification
const verifyProofOffChain = async (_verificationkey: string, signals: any, proof: any) => {
  const vkey = await fetch(_verificationkey).then(res => res.json());
  return groth16.verify(vkey, signals, proof);
};

/**
 * Converts a snarkjs proof + publicSignals into Solidity calldata arrays {a,b,c,input}.
 */
async function formatProofForSolidity(proof: any, publicSignals: any) {
  // Export Solidity-ready call data string
  const calldataStr: string = await groth16.exportSolidityCallData(proof, publicSignals);

  // Clean string and convert to BigInt array
  const calldata = calldataStr
    .replace(/["[\]\s]/g, "")
    .split(",")
    .map(x => BigInt(x));

  // Map to a,b,c,input
  const a = [calldata[0], calldata[1]] as const;
  const b: [[bigint, bigint], [bigint, bigint]] = [
    [calldata[2], calldata[3]],
    [calldata[4], calldata[5]],
  ];
  const c = [calldata[6], calldata[7]] as const;
  const input = [calldata[8]] as const;

  return { a, b, c, input };
}

export default function ProofPage() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");

  const [proof, setProof] = useState<any>(null);
  const [signals, setSignals] = useState<any>(null);

  const [offchainResult, setOffchainResult] = useState<string | null>(null);
  const [onchainResult, setOnchainResult] = useState<string | null>(null);

  const [circuitName, setCircuitName] = useState("multiplier2");

  useEffect(() => {
    setProof(null);
    setSignals(null);
    setOffchainResult(null);
    setOnchainResult(null);
  }, [a, b, c]); // Runs when either a or b changes

  const wasmFile = `/circuits/${circuitName}_js/${circuitName}.wasm`;
  const zkeyFile = `/circuits/${circuitName}_js/${circuitName}_final.zkey`;
  const verificationKey = `/circuits/${circuitName}_js/verification_key.json`;

  const publicClient = usePublicClient();

  const { targetNetwork } = useTargetNetwork();
  const verifierContract = contracts[targetNetwork.id as keyof typeof contracts]?.Groth16Verifier;

  // Generate proof only
  const runProofs = async () => {
    if (a.length === 0 || b.length === 0 || c.length === 0) return;

    try {
      const { proof: _proof, publicSignals: _signals } = await makeProof({ a, b, c }, wasmFile, zkeyFile);
      setProof(_proof);
      setSignals(_signals);
      setOffchainResult(null);
      setOnchainResult(null);
    } catch (err: any) {
      console.error(err);
      setProof(null);
      setSignals(null);
      setOffchainResult(null);
      setOnchainResult(null);
      setOffchainResult("❌ Error generating proof: " + err.message);
    }
  };

  // Off-chain verification
  const handleOffChainVerify = async () => {
    if (!proof || !signals) {
      setOffchainResult("⚠️ Generate proof first.");
      setOnchainResult(null);
      return;
    }
    try {
      const valid = await verifyProofOffChain(verificationKey, signals, proof);
      setOffchainResult(valid ? "✅ Valid proof (Off-chain)" : "❌ Invalid proof (Off-chain)");
    } catch (err: any) {
      setOnchainResult(null);
      setOffchainResult("❌ Off-chain verification failed: " + err.message);
    }
  };

  // On-chain verification
  const handleOnChainVerify = async () => {
    if (!proof || !signals) {
      setOnchainResult("⚠️ Generate proof first.");
      setOffchainResult(null);
      return;
    }

    if (!publicClient) {
      setOnchainResult("❌ No public client available. Check your wallet connection.");
      return;
    }

    try {
      const { a, b, c, input } = await formatProofForSolidity(proof, signals);
      const isValid = await publicClient.readContract({
        address: verifierContract.address,
        abi: verifierContract.abi,
        functionName: "verifyProof",
        args: [a, b, c, input],
      });
      console.log("isValid: ", isValid);
      setOnchainResult(isValid ? "✅ Valid proof (On-chain)" : "❌ Invalid proof (On-chain)");
    } catch (err: any) {
      setOnchainResult("❌ On-chain verification failed: " + err.message);
      setOffchainResult(null);
    }
  };

  return (
    <div className="p-4 max-w-full lg:max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold mb-4 text-center sm:text-left">Witness Inputs</h2>

      {/* Inputs */}
      <div className="space-y-4 mb-6">
        {/* Circuit Name - Full Width */}
        <div className="w-full">
          <label className="block mb-1 font-medium text-sm sm:text-base">Enter circuit name:</label>
          <input
            type="text"
            value={circuitName}
            onChange={e => setCircuitName(e.target.value)}
            placeholder="Enter circuit name"
            className="w-full p-2 sm:p-3 text-sm sm:text-base rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Factor Inputs - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="flex flex-col">
            <label className="mb-1 font-medium text-sm sm:text-base">Input a:</label>
            <input
              type="text"
              required
              value={a}
              onChange={e => setA(e.target.value)}
              className="w-full p-2 sm:p-3 text-sm sm:text-base rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 font-medium text-sm sm:text-base">Input b:</label>
            <input
              type="text"
              required
              value={b}
              onChange={e => setB(e.target.value)}
              className="w-full p-2 sm:p-3 text-sm sm:text-base rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 font-medium text-sm sm:text-base">Input c:</label>
            <input
              type="text"
              required
              value={c}
              onChange={e => setC(e.target.value)}
              className="w-full p-2 sm:p-3 text-sm sm:text-base rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Buttons - Responsive Layout */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 mb-6">
        <button
          onClick={runProofs}
          className="w-full sm:w-auto px-4 py-2 sm:py-3 text-sm sm:text-base border border-blue-500 text-blue-500 rounded hover:bg-blue-50 transition flex-1 sm:flex-none"
        >
          Generate Proof
        </button>
        <button
          onClick={handleOffChainVerify}
          className="w-full sm:w-auto px-4 py-2 sm:py-3 text-sm sm:text-base border border-green-500 text-green-500 rounded hover:bg-green-50 transition flex-1 sm:flex-none"
        >
          Verify Off-chain
        </button>
        <button
          onClick={handleOnChainVerify}
          className="w-full sm:w-auto px-4 py-2 sm:py-3 text-sm sm:text-base border border-purple-500 text-purple-500 rounded hover:bg-purple-50 transition flex-1 sm:flex-none"
        >
          Verify On-chain
        </button>
      </div>

      {/* Proof & Signals - Responsive Cards */}
      {proof && (
        <div className="space-y-4 sm:space-y-6">
          {/* Proof Section */}
          <div className="w-full">
            <span className="font-semibold text-sm sm:text-base block mb-2">Proof:</span>
            <div className="w-full overflow-x-auto">
              <pre className="text-xs sm:text-sm break-words whitespace-pre-wrap bg-transparent p-2 sm:p-3 rounded border border-gray-200 min-h-[100px]">
                {JSON.stringify(proof, null, 2)}
              </pre>
            </div>
          </div>

          {/* Signals Section */}
          <div className="w-full">
            <span className="font-semibold text-sm sm:text-base block mb-2">Output Signals:</span>
            <div className="w-full overflow-x-auto">
              <pre className="text-xs sm:text-sm break-words whitespace-pre-wrap bg-transparent p-2 sm:p-3 rounded border border-gray-200 min-h-[60px]">
                {JSON.stringify(signals, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Results - Responsive Text */}
      <div className="mt-4 sm:mt-6 space-y-2">
        {offchainResult && (
          <p className="text-sm sm:text-base p-2 sm:p-3 rounded border border-gray-200 break-words">{offchainResult}</p>
        )}
        {onchainResult && (
          <p className="text-sm sm:text-base p-2 sm:p-3 rounded border border-gray-200 break-words">{onchainResult}</p>
        )}
      </div>
    </div>
  );
}
