import * as fs from "fs";
import * as path from "path";

// dpyJbccS5Z6ZQnXv4a4uGBMDxysLKJaVuixh1zGMHtw
const DEPLOYER_KEYPAIR = [
  96, 42, 138, 197, 216, 65, 116, 24, 15, 162, 206, 163, 10, 78, 98, 114, 145,
  30, 128, 113, 96, 167, 125, 227, 221, 166, 67, 114, 214, 233, 199, 143, 9,
  111, 38, 90, 231, 11, 46, 125, 122, 31, 220, 32, 58, 88, 141, 62, 112, 143,
  62, 179, 7, 237, 237, 86, 102, 184, 12, 105, 107, 248, 162, 180,
];

// stkxmBvNyGRH6FWi4tjFtPpL9XmwnT9ZpqrQnUogvHG
const PROGRAM_KEYPAIR = [
  114, 113, 72, 226, 19, 79, 42, 25, 42, 108, 132, 147, 220, 78, 52, 146, 146,
  208, 172, 37, 181, 144, 137, 34, 53, 55, 148, 29, 110, 92, 90, 6, 13, 9, 144,
  56, 100, 47, 160, 26, 50, 118, 6, 46, 190, 124, 121, 68, 223, 7, 174, 74, 39,
  175, 249, 210, 219, 30, 26, 122, 202, 99, 112, 187,
];

function setupKeys() {
  const rootDir = path.join(__dirname, "..");
  const keysDir = path.join(rootDir, "keys");

  if (fs.existsSync(keysDir)) {
    console.warn("Keys folder already exists, skipping setup.");
    return;
  }

  console.log("Setting up keys folder...");

  fs.mkdirSync(keysDir, { recursive: true });

  const devnetDir = path.join(keysDir, "devnet");
  const localnetDir = path.join(keysDir, "localnet");

  fs.mkdirSync(devnetDir, { recursive: true });
  fs.mkdirSync(localnetDir, { recursive: true });

  const environments = ["devnet", "localnet"];

  environments.forEach((env) => {
    const envDir = path.join(keysDir, env);

    const deployerPath = path.join(envDir, "deployer-keypair.json");
    fs.writeFileSync(deployerPath, JSON.stringify(DEPLOYER_KEYPAIR));

    const programPath = path.join(envDir, "program-keypair.json");
    fs.writeFileSync(programPath, JSON.stringify(PROGRAM_KEYPAIR));

    console.log(`Created keypairs for ${env} environment`);
  });

  const targetDir = path.join(rootDir, "target", "deploy");
  fs.mkdirSync(targetDir, { recursive: true });

  const targetProgramPath = path.join(
    targetDir,
    "inference_staking-keypair.json"
  );
  fs.writeFileSync(targetProgramPath, JSON.stringify(PROGRAM_KEYPAIR));

  console.log(
    "Copied program keypair to target/deploy/inference_staking-keypair.json"
  );

  console.log("Keys folder setup complete!");
}

setupKeys();
