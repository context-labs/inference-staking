import * as fs from "fs";
import * as path from "path";

// dpyJbccS5Z6ZQnXv4a4uGBMDxysLKJaVuixh1zGMHtw
const DEPLOYER_KEYPAIR = [
  96, 42, 138, 197, 216, 65, 116, 24, 15, 162, 206, 163, 10, 78, 98, 114, 145,
  30, 128, 113, 96, 167, 125, 227, 221, 166, 67, 114, 214, 233, 199, 143, 9,
  111, 38, 90, 231, 11, 46, 125, 122, 31, 220, 32, 58, 88, 141, 62, 112, 143,
  62, 179, 7, 237, 237, 86, 102, 184, 12, 105, 107, 248, 162, 180,
];

// stkm6nUkbfkQ55XN5sFJeMKwf6p3sMcFmQfZ4fdeva7
const PROGRAM_KEYPAIR = [
  79, 154, 184, 18, 182, 225, 93, 125, 165, 87, 153, 221, 89, 99, 45, 108, 138,
  247, 99, 216, 10, 113, 170, 144, 61, 105, 237, 249, 95, 40, 158, 36, 13, 9,
  143, 55, 127, 197, 30, 12, 194, 175, 81, 200, 43, 108, 133, 12, 232, 118, 91,
  73, 32, 189, 113, 32, 67, 65, 190, 181, 244, 184, 98, 124,
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

  console.log("Keys folder setup complete!");
}

setupKeys();
