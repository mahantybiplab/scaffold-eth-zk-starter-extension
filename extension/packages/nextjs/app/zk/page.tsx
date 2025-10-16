"use client";

import { useEffect, useState } from "react";
import { groth16 } from "snarkjs";
import { usePublicClient } from "wagmi";
import contracts from "~~/contracts/deployedContracts";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

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

  const [proof, setProof] = useState<any>(null);
  const [signals, setSignals] = useState<any>(null);

  const [circuitName, setCircuitName] = useState("KnowFactorsOf33");

  useEffect(() => {
    setProof(null);
    setSignals(null);
  }, [a, b]); // Runs when either a or b changes

  const wasmFile = `/circuits/${circuitName}_js/${circuitName}.wasm`;
  const zkeyFile = `/circuits/${circuitName}_js/${circuitName}_final.zkey`;
  const verificationKey = `/circuits/${circuitName}_js/verification_key.json`;

  const publicClient = usePublicClient();

  const { targetNetwork } = useTargetNetwork();
  const verifierContract = contracts[targetNetwork.id as keyof typeof contracts]?.Groth16Verifier;

  // Generate proof only
  const runProofs = async () => {
    if (a.length === 0 || b.length === 0) return;

    try {
      const { proof: _proof, publicSignals: _signals } = await makeProof({ a, b }, wasmFile, zkeyFile);
      setProof(_proof);
      setSignals(_signals);
      notification.success("✅ Proof is generated successfully", {
        duration: 3000,
        position: "top-center",
      });
    } catch (err: any) {
      console.error(err);
      setProof(null);
      setSignals(null);
      notification.error(`❌ Error generating proof: ${err.message}`, {
        duration: 3000,
        position: "top-center",
      });
    }
  };

  // Off-chain verification
  const handleOffChainVerify = async () => {
    if (!proof || !signals) {
      notification.warning("Generate proof first.", {
        duration: 3000,
        position: "top-center",
      });
      return;
    }
    try {
      const valid = await verifyProofOffChain(verificationKey, signals, proof);
      if (valid) {
        notification.success("✅ Valid proof (Off-chain)", {
          duration: 3000,
          position: "top-center",
        });
      } else {
        notification.error("❌ Invalid proof (Off-chain)", {
          duration: 3000,
          position: "top-center",
        });
      }
    } catch (err: any) {
      notification.error(`❌ Off-chain verification process failed: ${err.message}`, {
        duration: 3000,
        position: "top-center",
      });
    }
  };

  // On-chain verification
  const handleOnChainVerify = async () => {
    if (!proof || !signals) {
      notification.warning("Generate proof first.", {
        duration: 3000,
        position: "top-center",
      });
      return;
    }

    if (!publicClient) {
      notification.error("❌ No public client available. Check your wallet connection.", {
        duration: 3000,
        position: "top-center",
      });
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
      if (isValid) {
        notification.success("✅ Valid proof (On-chain)", {
          duration: 3000,
          position: "top-center",
        });
      } else {
        notification.error("❌ Invalid proof (On-chain)", {
          duration: 3000,
          position: "top-center",
        });
      }
    } catch (err: any) {
      notification.error(`❌ On-chain verification process failed: ${err.message}`, {
        duration: 3000,
        position: "top-center",
      });
    }
  };

  return (
    <div className="p-4 max-w-full lg:max-w-4xl mx-auto space-y-6">
      {/* Explanation Section */}
      <div className="p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-3">🎯 Our Goal Here</h1>
        <p className="mb-4">
          This circuit lets you prove that you know two secret numbers <b>a</b> and <b>b</b> whose product equals{" "}
          <b>33</b>, without revealing the numbers themselves.
        </p>

        <h2 className="text-xl font-semibold mb-2">🧩 How It Works</h2>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>
            The <b>circuit name</b> tells the app which Zero-Knowledge circuit to use (for example,
            <code>KnowFactorsOf33</code> checks if <code>a × b = c</code>).
          </li>
          <li>
            Provide two private inputs: <code>a</code> and <code>b</code>.
          </li>
          <li>
            The circuit checks that <code>a × b = 33</code>.
          </li>
          <li>The proof confirms the statement is true without revealing your numbers.</li>
        </ul>

        <p className="italic">
          Example: If <code>a = 3</code> and <code>b = 11</code>, the proof confirms you know factors of 33.
        </p>
      </div>

      {/* Witness Inputs */}
      <div className="shadow-md rounded-xl p-6 space-y-6">
        <h2 className="text-xl font-semibold  text-center sm:text-left">🔑 Witness Inputs</h2>

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

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Input a:</label>
            <input
              type="text"
              required
              value={a}
              onChange={e => setA(e.target.value)}
              placeholder="Enter value for a"
              className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 font-medium">Input b:</label>
            <input
              type="text"
              required
              value={b}
              onChange={e => setB(e.target.value)}
              placeholder="Enter value for b"
              className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={runProofs}
            className="flex-1 sm:flex-none px-5 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
          >
            Generate Proof
          </button>
          <button
            onClick={handleOffChainVerify}
            className="flex-1 sm:flex-none px-5 py-3 text-white bg-green-600 hover:bg-green-700 rounded-lg font-medium transition"
          >
            Verify Off-chain
          </button>
          <button
            onClick={handleOnChainVerify}
            className="flex-1 sm:flex-none px-5 py-3 text-white bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition"
          >
            Verify On-chain
          </button>
        </div>
      </div>

      {/* Proof & Signals */}
      {proof && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Proof */}
          <div className="shadow-md rounded-xl p-4 overflow-x-auto">
            <h3 className="font-semibold mb-2">📝 Proof</h3>
            <pre className="text-sm break-words whitespace-pre-wrap p-3 rounded-lg border border-gray-200 min-h-[120px]">
              {JSON.stringify(proof, null, 2)}
            </pre>
          </div>

          {/* Signals */}
          <div className="shadow-md rounded-xl p-4 overflow-x-auto">
            <h3 className="font-semibold mb-2">📊 Output Signals</h3>
            <pre className="text-sm break-words whitespace-pre-wrap p-3 rounded-lg border border-gray-200 min-h-[120px]">
              {JSON.stringify(signals, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
