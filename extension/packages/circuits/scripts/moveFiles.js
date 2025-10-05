import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Recreate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get circuit name from CLI argument
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(
    "❌ Please provide a circuit name: node moveFiles.js <circuitName>"
  );
  process.exit(1);
}
const circuitName = args[0];

// Source files
const wasmFile = path.join(
  __dirname,
  `../build/${circuitName}_js/${circuitName}.wasm`
);
const zkeyFile = path.join(__dirname, `../build/${circuitName}_final.zkey`);
const verificationFile = path.join(__dirname, "../build/verification_key.json");

// Destination folder
const destDir = path.join(
  __dirname,
  `../../nextjs/public/circuits/${circuitName}_js`
);

// Ensure destination folder exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Move files function
function moveFile(src, destFolder) {
  const fileName = path.basename(src);
  const dest = path.join(destFolder, fileName);

  fs.rename(src, dest, (err) => {
    if (err) throw err;
    console.log(`Moved ${fileName} to ${destFolder}`);
  });
}

// Move both files
moveFile(wasmFile, destDir);
moveFile(zkeyFile, destDir);
moveFile(verificationFile, destDir);

