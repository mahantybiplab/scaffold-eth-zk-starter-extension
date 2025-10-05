import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import crypto from "crypto";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function getEntropy(
  prompt = "Enter custom entropy (leave blank for auto): "
) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, (input) => {
      rl.close();
      if (input.trim()) {
        resolve(input.trim());
      } else {
        resolve(crypto.randomBytes(32).toString("hex")); // fallback
      }
    });
  });
}

async function setupPhase2(circuitName) {
  const buildDir = join(__dirname, "..", "build");

  if (!fs.existsSync(buildDir)) {
    console.error("❌ Build directory does not exist. Run Phase 1 first.");
    process.exit(1);
  }

  try {
    let ptauFile = join(buildDir, "pot12_final.ptau");
    if (!fs.existsSync(ptauFile)) {
      console.error(`❌ Phase 1 output ${ptauFile} not found. Run Phase 1 first.`);
      process.exit(1);
    }

    if (!fs.existsSync(join(buildDir, `${circuitName}.r1cs`))) {
      console.error(`❌ Circuit R1CS file ${circuitName}.r1cs not found. Compile your circuit first.`);
      process.exit(1);
    }

    // -------------------------------
    // 🔹 Phase 2 (Circuit-specific)
    // -------------------------------
    console.log("🔑 Running circuit-specific setup...");

    // 9. Phase 2 Setup: Generating the Initial zkey
    execSync(
      `snarkjs groth16 setup ${join(
        buildDir,
        `${circuitName}.r1cs`
      )} ${ptauFile} ${join(buildDir, `${circuitName}_0000.zkey`)}`,
      { stdio: "inherit" }
    );

    // 10. Contribute to the phase 2 ceremony
    const entropy1Zkey = await getEntropy();
    execSync(
      `snarkjs zkey contribute ${join(
        buildDir,
        `${circuitName}_0000.zkey`
      )} ${join(
        buildDir,
        `${circuitName}_0001.zkey`
      )} --name="Dev Contributor" -v -e="${entropy1Zkey}"`,
      { stdio: "inherit" }
    );

    // 11. Contribute to the phase 2 ceremony
    const entropy2Zkey = await getEntropy();
    execSync(
      `snarkjs zkey contribute ${join(
        buildDir,
        `${circuitName}_0001.zkey`
      )} ${join(
        buildDir,
        `${circuitName}_0002.zkey`
      )} --name="Second contribution Name" -v -e="${entropy2Zkey}"`,
      { stdio: "inherit" }
    );

    // 12. Provide a third contribution using third-party software
    // a. Export challenge for Phase 2
    execSync(
      `snarkjs zkey export bellman ${join(
        buildDir,
        `${circuitName}_0002.zkey`
      )} ${join(buildDir, "challenge_phase2_0003")}`,
      { stdio: "inherit" }
    );

    // b. Contribute using Bellman + entropy
    const entropy3Zkey = await getEntropy(); // or replace with a secure random source
    execSync(
      `snarkjs zkey bellman contribute bn128 ${join(
        buildDir,
        "challenge_phase2_0003"
      )} ${join(buildDir, "response_phase2_0003")} -e="${entropy3Zkey}"`,
      { stdio: "inherit" }
    );

    // c. Import the response back into the zkey
    execSync(
      `snarkjs zkey import bellman ${join(
        buildDir,
        `${circuitName}_0002.zkey`
      )} ${join(buildDir, "response_phase2_0003")} ${join(
        buildDir,
        `${circuitName}_0003.zkey`
      )} -n="Third contribution name"`,
      { stdio: "inherit" }
    );

    // 13. Verify the latest zkey
    execSync(
      `snarkjs zkey verify ${join(
        buildDir,
        `${circuitName}.r1cs`
      )} ${ptauFile} ${join(buildDir, `${circuitName}_0003.zkey`)}`,
      { stdio: "inherit" }
    );

    // 14. Apply a random beacon
    execSync(
      `snarkjs zkey beacon ${join(buildDir, `${circuitName}_0003.zkey`)} ${join(
        buildDir,
        `${circuitName}_final.zkey`
      )} 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2"`,
      { stdio: "inherit" }
    );

    // 15. Verify the final zkey
    execSync(
      `snarkjs zkey verify ${join(
        buildDir,
        `${circuitName}.r1cs`
      )} ${ptauFile} ${join(buildDir, `${circuitName}_final.zkey`)}`,
      { stdio: "inherit" }
    );

    // 16. Export the verification key
    execSync(
      `snarkjs zkey export verificationkey ${join(
        buildDir,
        `${circuitName}_final.zkey`
      )} ${join(buildDir, "verification_key.json")}`,
      { stdio: "inherit" }
    );

    console.log(
      `✅ Phase 2 complete! Use ${circuitName}_final.zkey for proving.`
    );
  } catch (error) {
    console.error("❌ Phase 2 setup failed:", error.message);
    process.exit(1);
  }
}

// Get circuit name from CLI args
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(
    "❌ Please provide a circuit name: node trusted_setup_phase2.js <circuitName>"
  );
  process.exit(1);
}
const circuitName = args[0];

setupPhase2(circuitName);