## Installation

```shell
npx create-eth@latest -e mahantybiplab/scaffold-eth-zk-starter-extension
```

## Requirements

Before you begin, you need to install the following tools:

- Node (>= v20.18.3)
- Yarn (v1 or v2+)
- Git
- [Foundry](https://getfoundry.sh/)
- [Rust](https://rust-lang.org/tools/install/)
- [Circom](https://docs.circom.io/getting-started/installation/)

**Run all the commands given here from the root directory (unless stated otherwise).**

## Circom highlighter for vs code

- `circom-highlighting-vscode` by `iden3 `

## Quickstart

```shell

yarn zk-pipeline <circuitName> //  <circuitName> is multiplier2

yarn move-files <circuitName> //  <circuitName> is multiplier2

yarn chain // run this if you have not started anvil

yarn deploy --file DeployGroth16Verifier.s.sol  // to deploy Groth16Verifier smart contract

yarn start // to start the frontend
```

## What is Zero-Knowledge Proof?

Imagine you know a **secret password** but you don’t want to tell anyone.  
Instead, you want to **prove that you know it**.

Zero-Knowledge Proofs (ZKPs) allow you to prove knowledge of something (like a password, a solution to a puzzle, or a computation) **without revealing the secret itself**.

ZKPs shine in problems where _verification is easy_ but _finding the solution is hard_.
One of such problem is to prove a transaction is valid (you have enough balance and no double-spend) without revealing sender, receiver, or amount — this is how **Zcash enables private payments** on a public blockchain.

Btw, what are the characteristics of ZKPs ?

## Properties of ZKPs

### 1. **Completeness** ✅

If the statement is true and the prover follows the protocol honestly, the verifier will be convinced.  
👉 Example: If you really know the password, you can always convince the verifier.

### 2. **Soundness** 🔒

If the statement is false, no cheating prover can trick the verifier into accepting (except with negligible probability).  
👉 Example: If you don’t know the password, you can’t fake your way through the proof.

### 3. **Zero-Knowledge** 🤫

The proof reveals nothing beyond the fact that the statement is true.  
👉 Example: You prove you know the password without actually showing the password.

⚡ In short: **ZKPs convince (completeness), can’t be cheated (soundness), and don’t leak secrets (zero-knowledge).**

## Write ZKPs without overwhelmed by it's underlying mathematics

At their core, ZKPs are proofs about **mathematical statements** — they rely on algebra (polynomials, modular arithmetic, elliptic curves) to create constraints that can be checked efficiently. Writing ZKPs in math ensures **rigor, security, and verifiability**, since computers can’t “trust” plain words, only precise mathematical rules.

Since not everyone is fond of mathematics, writing ZKPs directly in math can be complex. This is where Circom comes to the rescue — it allows you to design circuits (constraints) in a simple, programming-like way, enabling you to build and prove custom ZKPs (such as password checks or private transactions) without hand-crafting all the cryptography.

Circom helps us **design these proofs** as circuits.

## Writing circuits

From the above statements you may have understood that A **Zero-Knowledge Proof (ZKP)** is a cryptographic protocol where a _prover_ convinces a _verifier_ that a certain **computation** has been carried out correctly on some private input, without revealing that input itself.

### Circuits

- A **circuit** in Circom is like a **blueprint of a computation**.
- It defines **what needs to be computed** step by step (like adding, multiplying, hashing, etc.).
- Example: a circuit could describe “take two numbers, multiply them, and compare with a third number.”

### Witness

A **witness** is the collection of all **secret (private) inputs** and **intermediate values** that satisfy the circuit’s constraints.

The **witness** includes **all values** that flow through the circuit:

1. **Private inputs** (known only to the prover).
2. **Public inputs** (shared with the verifier).
3. **Intermediate signals** (values computed inside the circuit).

### Constraints

- **Constraints** are the **rules** that must always hold true inside the circuit.
- They ensure the prover can’t cheat by plugging in random values.
- Example: if the circuit says `a * b = c`, then the constraint forces the witness values of `a`, `b`, and `c` to actually satisfy that equation.

In our `multiplier2.circom` :

```circom
pragma circom 2.0.0;

/*This circuit template checks that c is the multiplication of a and b.*/

template Multiplier2 () {
    signal input a;
    signal input b;
    signal input c;

    signal output c_out;

    // enforce c_out is public = c
    c_out <== c;

    // constraint: a * b must equal the given c
    a * b === c;
}

component main = Multiplier2();
```

- `pragma circom 2.0.0;`- defines the version of Circom being used
- `template Multiplier()` - templates are the equivalent to objects in most programming languages, a common form of abstraction
- `signal input a;` - our first input, `a`; inputs are private by default
- `signal input b;` - our second input, `b`; also private by default
- `signal input c;` - our third input, `c`; also private by default
- `signal output c_out;` - our output `c_out`; outputs are always public
- `c_out <== c;` - this does two things: assigns the signal `c_out` a value _and_ constrains `c_out` to be equal to `c`
- `a * b === c;` - this constraints `a * b` must equal the given `c`
- `component main = Multiplier2()` - instantiates our main component

A constraint in Circom can only use operations involving constants, addition or multiplication. It enforces that both sides of the equation must be equal.

## Compiling the circuit

Now is time to compile the circuit to get a system of arithmetic equations representing it. As a result of the compilation we will also obtain programs to compute the witness.

If you have already run all the commands from the quick start section , then run :
```shell
yarn circom-clean <circuitName>
```

 We can compile the circuit with the following command:

```shell
yarn circom-compile <circuitName> //  <circuitName> is multiplier2
```

This command creates a build folder (if doesn't exist) inside circuit directory and inside build folder it generates the following files and folder :

- `multiplier2.r1cs`: it contains the `R1CS constraint system` (In this system, a constraint can only use operations involving constants, addition or multiplication.) of the circuit in binary format .

- `multiplier2_js`: this directory contains the `Wasm` code `multiplier2.wasm` and other files needed to generate the `witness` .

- `multiplier2.sym` : it's a symbols file required for debugging or for printing the constraint system in an annotated mode.

You will get an error if the file name is `Multiplier2.circom` .

## Computing our witness

Before creating the proof, we need to calculate all the **signals**—the variables that carry values inside the circuit—ensuring they satisfy all of the circuit's constraints. To perform this calculation, we use the **Wasm module** that Circom generates during compilation.

In our case, let's say we want to prove that we are able to factor the number 33. So, we assign `a = 3` , `b = 11` and `c = 33` .

We need to create a file named `input.json` containing the inputs written in the standard json format. It's already created for you .

We use strings instead of numbers because JavaScript does not work accurately with integers larger than $2^{53}$.

```text
{"a": "3", "b": "11", "c": "33"}
```

Now, we calculate the witness and generate a binary file `witness.wtns` containing it in a format accepted by `snarkjs`.

### Computing the witness

```bash
yarn generate-witness multiplier2
```

## Proving circuits

After compiling the circuit and running the witness calculator with an appropriate input, we'll have two important files:

- **.wtns** - contains all the computed signals (the witness)
- **.r1cs** - contains the constraints describing the circuit

So together, `.r1cs` + `.wtns` prove that you have a correct solution to the circuit. But a verifier can’t trust these files directly — checking them would reveal private data and require full recomputation. Instead, a cryptographic proof (generated using the witness and the proving key) allows the verifier to quickly confirm correctness without seeing the witness.

Before jumping into the steps, here's a quick primer on the key tech we'll be using:

### 🔹zk-SNARK

Stands for **Zero-Knowledge Succinct Non-Interactive Argument of Knowledge**. Let's break that down:

- **Zero-Knowledge** → The proof reveals nothing about your secret values, only that they're correct
- **Succinct** → Proofs are tiny (just a few hundred bytes) and lightning-fast to verify
- **Non-Interactive** → No back-and-forth needed — just create one proof, send it, done
- **Argument of Knowledge** → Guarantees you actually know the secret (you can't just guess)

👉 Real-world example: **Zcash** uses this for private cryptocurrency transactions.

---

### 🔹 Groth16

A popular **zk-SNARK protocol** (think of it as a "recipe" for generating those efficient proofs) invented in 2016. It's a go-to choice because it's super lightweight and speedy:

- **Proof size**: Just **200–300 bytes**—that's tinier than a single tweet (which can be up to 280 characters)!
- **Verification time**: Blazing fast, often under a **millisecond**—quicker than you can blink.
- **The catch**: It needs a **trusted setup**—a one-time process split into two phases (a powers-of-tau ceremony for public parameters, followed by phase 2 for circuit-specific keys, all done securely to avoid leaks—we'll show how to run it next using snarkjs, without diving into the internals).

This keeps things practical for real apps like blockchain, without bogging down your device.
With that foundation, let's outline the process—snarkjs handles the Groth16 magic under the hood.

**Some steps that we need to follow to create a zero-knowledge proof:**

- The circuit rules (.r1cs) must be encoded into cryptographic form.

- This requires a proving key and verifying key, both generated during a trusted setup (which we'll cover in just a moment).

- The proving key lets you transform the witness into a succinct cryptographic proof.

- The verifying key lets anyone else check the proof.

👉 Without the setup (keys), .r1cs and .wtns remain just math data, not a cryptographic proof.

---

### **🔹 Trusted Setup — Why Do We Need It?**

Now that we've teased it, let's unpack the trusted setup—it's the secret sauce making Groth16 so powerful (and why we mentioned it as a "catch"). Think of the trusted setup as creating a **custom lock and key** for your circuit:

#### **What happens during setup:**

1. Secret random numbers are generated
2. These secrets create two special keys:
   - **Proving key** → lets you create proofs
   - **Verification key** → lets anyone verify proofs
3. The secret randomness must be **permanently destroyed** (this is critical!)

#### **Why "trusted"?**

Here's the catch: if someone keeps a copy of those secret random numbers, they could create **fake proofs** that look valid but are actually lies. It's like having a master key that can forge any lock.

**Example:** Imagine proving you know factors of 33. With the secrets, someone could "prove" that 2 × 2 = 33, and the verifier would incorrectly accept it!

#### **The solution: Multi-party ceremonies**

To make this secure, we use ceremonies where **many people** participate:

- Each person adds their own randomness
- Only **ONE person** needs to be honest and destroy their secrets
- As long as at least one participant is trustworthy, the system is secure

It's like breaking a master key into pieces — you'd need **every single piece** to forge proofs.

---

### **Groth16 Setup: Two Phases**

Since we're using Groth16, we need a trusted setup with **two parts** —and snarkjs makes running them straightforward:

#### **1. Powers of Tau (Universal Setup)**

- **Circuit-independent** → do this once, use it for many circuits
- Like creating a universal "blank canvas" that any circuit can use
- Usually done through large public ceremonies with hundreds of participants
- ✅ You can reuse existing Powers of Tau ceremonies

#### **2. Phase 2 (Circuit-Specific Setup)**

- **Depends on your exact circuit** → must be done for each unique circuit
- Takes the universal parameters and customizes them for your specific constraints
- If you modify your circuit, you need to redo Phase 2

**Bottom line:** The trusted setup is the price we pay for Groth16's incredible efficiency. It creates specialized keys that make proofs tiny and verification instant, but we need to trust that the secret randomness was destroyed. For applications needing maximum performance, this trade-off is worth it!

_Note: If you want to avoid trusted setups entirely, consider using PLONK or other "transparent" proving systems — though they have slightly larger proofs._

Ready to put this into action? In the next section, we'll run the snarkjs commands to handle these phases hands-on.

The below command will do these setups for us automatically:

```shell
yarn trusted-setup multiplier2
```
⚠️ But if you really want to know how a trusted setup is done in Circom, click below 👇. Reminder: it’s a long read 📖⏳

<details>
<summary>Running the Trusted Setup with snarkjs(click to expand)</summary>

Now let's see how `circuits/scripts/trusted_setup.js` file is automating this process for us:

#### 1. Start a new powers of tau ceremony

```js
execSync(
  `snarkjs powersoftau new bn128 12 ${join(buildDir, "pot12_0000.ptau")} -v`,
  { stdio: "inherit" }
);
```

The `new` command is used to start a powers of tau ceremony.

The first parameter after `new` refers to the type of curve you wish to use. At the moment, snarkjs supports both `bn128` (a classic Ethereum-native pairing-friendly curve for fast zk-SNARKs with ~100-bit security) and `bls12-381` (a more modern pairing-friendly curve with ~128-bit security, ideal for BLS signatures and efficient zk-proofs).

The second parameter, in this case `12`, is the power of two of the maximum number of constraints that the ceremony can accept: in this case, the number of constraints is `2 ^ 12 = 4096`. The maximum value supported here is `28`, which means you can use `snarkjs` to securely generate zk-snark parameters for circuits with up to `2 ^ 28` (≈268 million) constraints.

#### 2. Contribute to the ceremony

```js
const entropy1 = await getEntropy();
execSync(
  `snarkjs powersoftau contribute ${join(buildDir, "pot12_0000.ptau")} ${join(
    buildDir,
    "pot12_0001.ptau"
  )} --name="First contribution" -v -e="${entropy1}"`,
  { stdio: "inherit" }
);
```

The `contribute` command creates a ptau file with a new contribution.

You'll be prompted to enter some random text to provide an extra source of entropy.

`contribute` takes as input the transcript of the protocol so far, in this case `pot12_0000.ptau`, and outputs a new transcript, in this case `pot12_0001.ptau`, which includes the computation carried out by the new contributor (ptau files contain a history of all the challenges and responses that have taken place so far).

By letting you write the random text as part of the command, the `-e` parameter allows contribute to be non-interactive.
If you remove `-e="${entropy1}"` and don't have `getEntropy` function, you'll be prompted to enter some random text to provide an extra source of entropy.

`name` can be anything you want, and is just included for reference (it will be printed when you verify the file (step 5)).

#### 3. Provide a second contribution

```js
const entropy2 = await getEntropy();
execSync(
  `snarkjs powersoftau contribute ${join(buildDir, "pot12_0001.ptau")} ${join(
    buildDir,
    "pot12_0002.ptau"
  )} --name="Second contribution" -v -e="${entropy2}"`,
  { stdio: "inherit" }
);
```

It's self explanatory.

#### 4. Provide a third contribution using third-party software

1. Export challenge

```js
// Export challenge
execSync(
  `snarkjs powersoftau export challenge ${join(
    buildDir,
    "pot12_0002.ptau"
  )} ${join(buildDir, "challenge_0003")}`,
  { stdio: "inherit" }
);
```

- Creates a `challenge_0003` file from the current `.ptau`.
- This file contains the data needed for the next participant to make a contribution, without exposing secret randomness.

2. Contribute to challenge

```js
// Contribute to challenge (can be done on another machine using another compatible software!)
const entropy3 = await getEntropy();
execSync(
  `snarkjs powersoftau challenge contribute bn128 ${join(
    buildDir,
    "challenge_0003"
  )} ${join(buildDir, "response_0003")} -e="${entropy3}"`,
  { stdio: "inherit" }
);
```

- A participant (could be another person, or simulated locally) takes the challenge file, mixes in their own **random entropy**, and produces a `response_0003` file.

- This ensures fresh randomness is added securely.

3. Import response

```js
// Import response
execSync(
  `snarkjs powersoftau import response ${join(
    buildDir,
    "pot12_0002.ptau"
  )} ${join(buildDir, "response_0003")} ${join(
    buildDir,
    "pot12_0003.ptau"
  )} -n="Third-party contribution"`,
  { stdio: "inherit" }
);
```

- The coordinator imports the contributed response into the `.ptau`, producing an updated `pot12_0003.ptau`.

- Now the ceremony includes the **third-party’s contribution**, strengthening the setup.

#### 5. Verify the protocol so far

```js
execSync(`snarkjs powersoftau verify ${join(buildDir, "pot12_0003.ptau")}`, {
  stdio: "inherit",
});
```

The `verify` command verifies a `ptau` (powers of tau) file, which means it checks all the contributions to the multi-party computation (MPC) up to that point. It also prints the hashes of all the intermediate results to the console.

If everything checks out, you should see the following at the top of the output:

```
[INFO]  snarkJS: Powers Of tau file OK!
```

In sum, whenever a new zk-snark project needs to perform a trusted setup, you can just pick the latest `ptau` file, and run the `verify` command to verify the entire chain of challenges and responses so far.

#### 6. Apply a random beacon

```js
execSync(
  `snarkjs powersoftau beacon ${join(buildDir, "pot12_0003.ptau")} ${join(
    buildDir,
    "pot12_beacon.ptau"
  )} 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"`,
  { stdio: "inherit" }
);
```

The `beacon` command creates a `ptau` file with a contribution applied in the form of a random beacon.

We need to apply a random beacon in order to finalize phase 1 of the trusted setup.

> To paraphrase Sean Bowe and Ariel Gabizon, a random beacon is a source of public randomness that is not available before a fixed time. The beacon itself can be a delayed hash function (e.g. 2^40 iterations of SHA256) evaluated on some high entropy and publicly available data. Possible sources of data include: the closing value of the stock market on a certain date in the future, the output of a selected set of national lotteries, or the value of a block at a particular height in one or more blockchains. E.g. the hash of the 11 millionth Ethereum block (which as of this writing is some 3 months in the future). See [here](https://eprint.iacr.org/2017/1050.pdf) for more on the importance of a random beacon.

For the purposes of this tutorial, the beacon is essentially a delayed hash function evaluated on `0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f` (in practice this value will be some form of high entropy and publicly available data of your choice). The next input -- in our case `10` -- just tells `snarkjs` to perform `2 ^ 10` iterations of this hash function.

> Note that [security holds](https://eprint.iacr.org/2017/1050) even if an adversary has limited influence on the beacon.

#### 7. Prepare phase 2

```js
execSync(
  `snarkjs powersoftau prepare phase2 ${join(
    buildDir,
    "pot12_beacon.ptau"
  )} ${ptauFile} -v`,
  { stdio: "inherit" }
);
```

We're now ready to prepare phase 2 of the setup (the circuit-specific phase).

Under the hood, the `prepare phase2` command calculates the encrypted evaluation of the Lagrange polynomials at tau for `tau`, `alpha*tau`, and `beta*tau`. It takes the beacon `ptau` file we generated in the previous step and outputs a final `ptau` file which will be used to generate the circuit proving and verification keys.

Prepared (phase2) Ptau files for bn128 with 54 contributions and a beacon can be found [here](https://github.com/iden3/snarkjs?tab=readme-ov-file#7-prepare-phase-2)

#### 8. Verify the final ptau

```js
execSync(`snarkjs powersoftau verify ${ptauFile} -v`, { stdio: "inherit" });
```

The verify command verifies a powers of tau file.

Before we go ahead and create the circuit, we perform a final check and verify the final protocol transcript.

> Notice there is no longer a warning informing you that the file does not contain phase 2 precalculated values.

#### 9. Phase 2 Setup: Generating the Initial zkey

```js
execSync(
  `snarkjs groth16 setup ${join(
    buildDir,
    `${circuitName}.r1cs`
  )} ${ptauFile} ${join(buildDir, `${circuitName}_0000.zkey`)}`,
  { stdio: "inherit" }
);
```

This generates the reference `zkey` without phase 2 contributions.

IMPORTANT: Do not use this zkey in production, as it's not safe. It requires at least one contribution.

The `zkey new` command creates an initial `zkey` file with zero contributions.

The `zkey` is a zero-knowledge key that includes both the proving and verification keys as well as phase 2 contributions.

Importantly, one can verify whether a `zkey` belongs to a specific circuit or not.

Note that `multiplier2_0000.zkey` (the output of the `zkey` command above) does not include any contributions yet, so it cannot be used in a final circuit.

_The following steps (9-14) are similar to the equivalent phase 1 steps, except we use `zkey` instead of `powersoftau` as the main command, and we generate `zkey` rather than `ptau` files._

#### 10. Contribute to the phase 2 ceremony

```js
const entropyZkey = await getEntropy();
execSync(
  `snarkjs zkey contribute ${join(buildDir, `${circuitName}_0000.zkey`)} ${join(
    buildDir,
    `${circuitName}_0001.zkey`
  )} --name="1st Contributor Name" -v -e="${entropyZkey}"`,
  { stdio: "inherit" }
);
```

The `zkey contribute` command creates a `zkey` file with a new contribution.

As in phase 1, you'll be prompted to enter some random text to provide an extra source of entropy.

#### 11. Contribute to the phase 2 ceremony

```js
const entropy2Zkey = await getEntropy();
execSync(
  `snarkjs zkey contribute ${join(buildDir, `${circuitName}_0001.zkey`)} ${join(
    buildDir,
    `${circuitName}_0002.zkey`
  )} --name="Second contribution Name" -v -e="${entropy2Zkey}"`,
  { stdio: "inherit" }
);
```

We provide a second contribution.

#### 12. Provide a third contribution using third-party software

The corresponding code is almost same as above third contribution using third-party software.

#### 13. Verify the latest zkey

```js
execSync(
  `snarkjs zkey verify ${join(
    buildDir,
    `${circuitName}.r1cs`
  )} ${ptauFile} ${join(buildDir, `${circuitName}_0003.zkey`)}`,
  { stdio: "inherit" }
);
```

The `zkey verify` command verifies a `zkey` file. It also prints the hashes of all the intermediary results to the console.

We verify the `zkey` file we created in the previous step, which means we check all the contributions to the second phase of the multi-party computation (MPC) up to that point.

This command also checks that the `zkey` file matches the circuit.

If everything checks out, you should see the following:

```
[INFO]  snarkJS: ZKey Ok!
```

#### 14. Apply a random beacon

```js
execSync(
  `snarkjs zkey beacon ${join(buildDir, `${circuitName}_0003.zkey`)} ${join(
    buildDir,
    `${circuitName}_final.zkey`
  )} 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2"`,
  { stdio: "inherit" }
);
```

The `zkey beacon` command creates a `zkey` file with a contribution applied in the form of a random beacon.

We use it to apply a random beacon to the latest `zkey` after the final contribution has been made (this is necessary to generate a final `zkey` file and finalize phase 2 of the trusted setup).

#### 15. Verify the final zkey

```js
execSync(
  `snarkjs zkey verify ${join(
    buildDir,
    `${circuitName}.r1cs`
  )} ${ptauFile} ${join(buildDir, `${circuitName}_final.zkey`)}`,
  { stdio: "inherit" }
);
```

Before we go ahead and export the verification key as a `json`, we perform a final check and verify the final protocol transcript (`zkey`).

#### 16. Export the verification key

```js
execSync(
  `snarkjs zkey export verificationkey ${join(
    buildDir,
    `${circuitName}_final.zkey`
  )} verification_key.json`,
  { stdio: "inherit" }
);
```
We export the verification key from `circuit_final.zkey` into `verification_key.json`.

</details>

## Generating a Groth16 Proof

Once the witness is computed and the trusted setup is already executed, we can **generate a zk-proof** associated to the circuit and the witness:

```shell
yarn generate-proof multiplier2
```

This command generates a Groth16 proof and outputs two files:

- `proof.json`: it contains the proof.
- `public.json`: it contains the values of the public inputs and outputs.

## Verifying a Groth16 Proof

To **verify the proof**, execute the following command:

```shell
yarn verify-proof
```

The command uses the files `verification_key.json` we exported earlier,`proof.json` and `public.json` to check if the proof is valid. If the proof is valid, the command outputs an `OK`.

A valid proof not only proves that we know a set of signals that satisfy the circuit, but also that the public inputs and outputs that we use match the ones described in the `public.json` file.

## Verifying from a Smart Contract

👉 It is also possible to generate a **Solidity verifier** that allows **verifying proofs on Ethereum blockchain**.

First, we need to generate the `Groth16Verifier.sol` inside `foundry/contracts/` directory using the command:

```shell
yarn generate-sol-verifier multiplier2
```

The `Groth16Verifier` has a `view` function called `verifyProof` that returns `TRUE` if and only if the proof and the inputs are valid.

**To run the full zk workflow from compilation to Solidity groth16 verifier contract in one go.**

```shell
yarn zk-pipeline multiplier2
```

**To Copy compiled circuit artifacts (WASM, zkey, verification key) to Next.js public directory for client-side ZK proof generation and verification.**

```shell
yarn move-files multiplier2
```

---

## 🔎 Proof Verification in This Project

We support two modes of verification:

### 1. ✅ Off-chain Verification

* Done with `snarkjs.verify()` in the browser.
* Uses the circuit’s `verification_key.json`.
* **Why:**

  * Quick, free check (no gas).
  * Good for testing before touching the blockchain.
  * Prevents submitting invalid proofs and wasting resources.

### 2. ⛓️ On-chain Verification (Read-only)

* Done with the deployed **`Groth16Verifier`** smart contract.
* Our frontend calls the verifier using **`readContract`**, which performs the actual elliptic curve pairing check **inside the EVM**.
* **Why:**

  * The check is trustless (comes directly from the blockchain).
  * Useful to confirm that the verifier contract recognizes the proof as valid.
  * No gas cost since this is a read-only call (no state changes).

---

## ❓ Why Have Both?

* **Off-chain verify** → quick sanity check to avoid unnecessary blockchain calls.
* **On-chain verify (read-only)** → trustless check that the verifier contract accepts the proof, without spending gas.

👉 In this project we **do not use stateful verification (`writeContract`)**, since we don’t persist proof results or trigger on-chain logic. If you wanted to mint tokens, unlock funds, or enforce access, you would extend the contract and use `writeContract`.

---

## Understanding the Frontend: Key Concepts in nextjs/app/zk/page.tsx

### 🔹 1. Proof Generation — `makeProof()`
```ts
const makeProof = async (_proofInput, _wasm, _zkey) => {
  const { proof, publicSignals } = await groth16.fullProve(_proofInput, _wasm, _zkey);
  return { proof, publicSignals };
};
```
- This function uses **`snarkjs.groth16.fullProve()`** to generate a zk-SNARK proof.  
- It takes:
  - `_proofInput`: the circuit inputs (like `a`, `b`, `c` values).  
  - `_wasm`: the compiled circuit file.  
  - `_zkey`: the proving key file.  
- Returns:
  - `proof`: cryptographic proof of correctness.  
  - `publicSignals`: the public outputs of the circuit.  
- The proof generated by this function is later used for both off-chain and on-chain verification, since both require a valid proof and the same public signals.
---

### 🔹 2. Off-chain Verification — `verifyProofOffChain()`
```ts
const verifyProofOffChain = async (_verificationkey, signals, proof) => {
  const vkey = await fetch(_verificationkey).then(res => res.json());
  return groth16.verify(vkey, signals, proof);
};
```
- Loads the circuit’s **`verification_key.json`** from the `netxtjs/public/circuits` folder.  
- Passes the key, proof, and public signals to `snarkjs.groth16.verify()` to check validity **locally in the browser**.  
- No blockchain or smart contract is involved → **zero gas cost**.  
- Purpose: Quickly test whether the proof is valid before sending it to the verifier contract.

---

### 🔹 3. Proof Formatting for Solidity — `formatProofForSolidity()`
```ts
const calldataStr = await groth16.exportSolidityCallData(proof, publicSignals);
```
- Converts the proof and public signals into the specific data format required by the Solidity verifier contract (`a`, `b`, `c`, `input`).  
- This uses **`groth16.exportSolidityCallData()`**, which outputs a string representation of the proof as Solidity calldata.  
- The function then:
  1. Cleans and splits that string.  
  2. Converts each value to a `BigInt`.  
  3. Maps the data into the tuple structure expected by the verifier contract.  

This step is **only used for on-chain verification**.

---

### 🔹 4. On-chain Verification — Contract Call
```ts
const { a, b, c, input } = await formatProofForSolidity(proof, signals);
const isValid = await publicClient.readContract({
  address: verifierContract.address,
  abi: verifierContract.abi,
  functionName: "verifyProof",
  args: [a, b, c, input],
});
```
- Takes the Solidity-formatted proof values and sends them to the deployed **`Groth16Verifier`** contract.  
- Calls the `verifyProof(a, b, c, input)` function using **`readContract()`** from Wagmi.  
- The EVM runs the elliptic curve pairing checks but **does not broadcast or record a transaction** — so **no gas is spent**.  
- Returns a boolean (`true` / `false`) depending on whether the verifier contract considers the proof valid.  

---

## Managing Multiple Circuits

If you've already generated artifacts for one circuit and want to compile a different one, clean the previous build artifacts first:

```shell
yarn circom-clean <previousCircuitName>
```

## On modifying a circuit 

Whenever you modify a circuit, you must recompile it, change the input.json file ,generate a new witness, perform a circuit-specific trusted setup, create a proof, verify that proof, and  generate a new Solidity verifier contract and don't forget to move the required files for off-Chain verification.

Here are the required commands:
```shell
yarn circom-compile multiplier2
yarn generate-witness multiplier2
yarn circuit-specific-setup multiplier2
yarn generate-proof multiplier2
yarn verify-proof
yarn generate-sol-verifier multiplier2
yarn move-files multiplier2
```
**If you haven't started the front-end from Quickstart Section:**

```shell
yarn chain // run this if you have not started anvil

yarn deploy --file DeployGroth16Verifier.s.sol  // to deploy Groth16Verifier smart contract

yarn start // to start the frontend
```


## Challenge for the braves

**Can you create Circom constraints for inputs a and b such that neither can be 1 or 33?**
Let me know if you can solve this challenge, or I'll provide the solution! 😁

## Conclusion

At a high level, you now understand how to use Circom to create circuits for zero-knowledge proofs (ZKPs). If you want to deep dive ZKPs then I have some resources for you. It will be a long journey so don't hurry to finish all the resources, take your time, be curios , know how you learn best and then double down on that method of learning, ask questions , join communities . Hurrying only cause delay , it's coming from my own experience, so plz listen .

### Learn Math Prerequisites

1. Learn some basics linear algebra
2. In parallel, learn maths from [Extropy Essential Maths](https://academy.extropy.io/pages/courses/zkmaths-landing.html) and [Math foundations section rareskill zkBook](https://rareskills.io/zk-book)

### Build core understanding of zkPs

1. [Rareskill Zkbook](https://rareskills.io/zk-book)
2. [ProofsArgsAndZK](https://people.cs.georgetown.edu/jthaler/ProofsArgsAndZK.html)

After completing Rareskill ZkBook and ProofsArgsAndZK you can choose your own path.
**Live a free life ✨**
