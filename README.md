## Installation

```shell
npx create-eth@latest -e mahantybiplab/scaffold-eth-zk-starter-extension
```

## Requirements

Before you begin, you need to install the following tools:

- Node (>= v20.18.3)
- Yarn (v1 or v2+)
- Git
- [Rust](https://rust-lang.org/tools/install/)
- [Circom](https://docs.circom.io/getting-started/installation/)

**Run all the  commands given here from the  root directory**

## Circom highlighter for vs code

-  `circom-highlighting-vscode` by `iden3 `
## Quickstart

```shell

yarn zk-pipeline <circuitName> //  <circuitName> is multiplier2

yarn move-files <circuitName> //  <circuitName> is multiplier2

yarn chain // run this if you have not started anvil

yarn deploy --file DeployGroth16Verifier.s.sol  // to deploy Groth16Verifier smart contract 

yarn start // to start the frontend 
```
Now interact with the frontend and enjoy  😁

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
    // private inputs
    signal input a;
    signal input b;

    // public input
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

Now is time to compile the circuit to get a system of arithmetic equations representing it. As a result of the compilation we will also obtain programs to compute the witness. We can compile the circuit with the following command:

```bash
yarn circom-compile <circuitName> //  <circuitName> is multiplier2
```

This command creates a build folder if doesn't exist inside circuit directory and inside build folder it generates the following files and folder :

-  `multiplier2.r1cs`: it that contains the `R1CS constraint system` (In this system, a constraint can only use operations involving constants, addition or multiplication.) of the circuit in binary format .

- `multiplier2_js`: this directory   contains the `Wasm` code `multiplier2.wasm` and other files needed to generate the `witness` .

- `multiplier2.sym` : it's a symbols file required for debugging or for printing the constraint system in an annotated mode.

You will get an error if the file name is `Multiplier2.circom` .

## Computing our witness

Before creating the proof, we need to calculate all the `signals` (A **signal** is a variable that carries a value inside the circuit.) of the circuit that match all the constraints of the circuit. For that, we will use the `Wasm` module generated by`circom` that helps to do this job.

In our case, let's say we want to prove that we are able to factor the number 33. So, we assign `a = 3` , `b = 11` and `c = 33` .

We need to create a file named `input.json` containing the inputs written in the standard json format. It's already created for you .

We use strings instead of numbers because JavaScript does not work accurately with integers larger than $2^{53}$.

```text
{"a": "3", "b": "11", "c":"33"}
```

Now, we calculate the witness and generate a binary file `witness.wtns` containing it in a format accepted by `snarkjs`.


### Computing the witness 

```bash
yarn generate-witness multiplier2
```

## Proving circuits

After compiling the circuit and running the witness calculator with an appropriate input, we will have a file with extension .wtns that contains all the computed signals and, a file with extension .r1cs that contains the constraints describing the circuit. Both files will be used to create our proof.

Now, we will use the `snarkjs` tool to generate and validate a proof for our input. In particular, using the multiplier2, **we will prove that we are able to provide the two factors of the number 33**. That is, we will show that we know two integers `a` and `b` such that when we multiply them, it results in the number 33.

### Some useful terms

#### 🔹 zk-SNARK

- Stands for **Zero-Knowledge Succinct Non-Interactive Argument of Knowledge**.
- A ZK proof system that is:
  - **Succinct** → proofs are very small and quick to verify.
  - **Non-interactive** → prover and verifier don’t need back-and-forth communication, just one proof.
  - **Zero-Knowledge** → reveals nothing except validity.
  - **Argument of Knowledge** → ensures the prover really knows the secret.

👉 Used in systems like **Zcash** for private payments.

#### 🔹 Groth16

- A specific **zk-SNARK proving algorithm**, created in 2016.
- Known for being **highly efficient**:

  - Proofs are only about **200–300 bytes**.
  - Verification takes only a few milliseconds.

- Limitation → requires a **trusted setup**.

#### 🔹 Trusted Setup

Some zk-SNARK protocols, like Groth16, need a special preparation step before they can be used. This step is called the _trusted setup_. In it, cryptographic keys are generated: a proving key for the prover and a verification key for the verifier. These keys make the protocol efficient and secure. The reason it’s called _trusted_ is that during setup, temporary secret randomness is created, and it must be destroyed afterwards — otherwise, someone could generate fake proofs. That’s why we need a trusted setup.

We are going to use the Groth16 zk-SNARK protocol. To use this protocol, you will need to generate a trusted setup . **Groth16 requires a per circuit trusted setup**. In more detail, the trusted setup consists of 2 parts:

- The powers of tau, which is independent of the circuit, it's a one time setup.
- The phase 2, which depends on the circuit i.e. on changing the circuit we need to do it again.

The below command will do these two parts for us automatically:
```shell
yarn trusted-setup multiplier2
```

## Generating a Proof

Once the witness is computed and the trusted setup is already executed, we can **generate a zk-proof** associated to the circuit and the witness:

```shell
yarn generate-proof multiplier2
```

This command generates a Groth16 proof and outputs two files:

- `proof.json`: it contains the proof.
- `public.json`: it contains the values of the public inputs and outputs.

## Verifying a Proof

To **verify the proof**, execute the following command:

```text
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


The `Groth16Verifier`  has a `view` function called `verifyProof` that returns `TRUE` if and only if the proof and the inputs are valid. 

**To run the full zk workflow from compilation to Solidity verifier in one go.**
```shell
yarn zk-pipeline multiplier2
```

**To Copy compiled circuit artifacts (WASM, zkey, verification key) to Next.js public directory for client-side ZK proof generation and verification.**
```shell
yarn move-files multiplier2
```

**If you haven't started the front-end from Quickstart Section:** 

```shell
yarn chain // run this if you have not started anvil

yarn deploy --file DeployGroth16Verifier.s.sol  // to deploy Groth16Verifier smart contract 

yarn start // to start the frontend
```

Now interact with the frontend and enjoy 😁
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

After completing Rareskill ZkBook and  ProofsArgsAndZK you can choose your own path.
**Live a free life ✨**
