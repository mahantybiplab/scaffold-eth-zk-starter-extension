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
    "❌ Please provide a circuit name: node circom_clean.js <circuitName>"
  );
  process.exit(1);
}

const circuitName = args[0];
const buildDir = path.join(__dirname, "../build");
const publicCircuitDir = path.join(
  __dirname,
  `../../nextjs/public/circuits/${circuitName}_js`
);

// Delete directories
try {
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true, force: true });
    console.log(`✅ Deleted: ${buildDir}`);
  } else {
    console.log(`ℹ️  Directory not found: ${buildDir}`);
  }

  if (fs.existsSync(publicCircuitDir)) {
    fs.rmSync(publicCircuitDir, { recursive: true, force: true });
    console.log(`✅ Deleted: ${publicCircuitDir}`);
  } else {
    console.log(`ℹ️  Directory not found: ${publicCircuitDir}`);
  }

  console.log("🎉 Cleanup completed successfully!");
} catch (error) {
  console.error("❌ Error during cleanup:", error.message);
  process.exit(1);
}
