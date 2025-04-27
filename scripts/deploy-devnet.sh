#!/bin/bash
set -e 
set -o pipefail

# Constants
DEVNET_PROGRAM_ID="dinfV1dqxfSJYCRV2QY4yREdgcdoEkzynZXZs6kxeSm"
MAINNET_PROGRAM_ID="dinfV1dqxfSJYCRV2QY4yREdgcdoEkzynZXZs6kxeSm"

# Run tests before deployment
printf "\nRunning tests prior to deployment...\n"
anchor test || { echo -e "\nTests failed! Please ensure tests are passing before attempting to deploy the program.\n"; exit 1; }

# Check if build and test left working tree changes
if [[ `git status --porcelain` ]]; then
  echo -e "\nBuild and test resulted in working tree changes! Aborting...\n";
  exit 1;
fi

# Use devnet configuration
cp scripts/anchor-configs/Anchor.dev.toml Anchor.toml

# Replace program ID in source file
sed -i '' "s/$MAINNET_PROGRAM_ID/$DEVNET_PROGRAM_ID/" programs/inference-staking/src/lib.rs

echo -e "\n🚀 Deploying program ID $DEVNET_PROGRAM_ID to Solana devnet.\n"
echo -e "🏗️ All checks passed! Building program...\n"

# Build the program
anchor build -- --features devnet
echo -e "\nBuild finished!\n"

# Confirm deployment
read -p "Press ENTER to confirm and proceed with the devnet program deployment to program ID $DEVNET_PROGRAM_ID" -n 1 -r
echo

if [[ -z $REPLY ]]; then
  printf "Running solana program deploy target/deploy/inference_staking.so -u devnet -k ./keys/devnet/deployer-keypair.json --program-id ./keys/devnet/program-keypair.json\n"
  printf "This will take a moment...\n"
  solana program deploy ./target/deploy/inference_staking.so -u devnet -k ./keys/devnet/deployer-keypair.json --program-id ./keys/devnet/program-keypair.json
  echo -e "Program deploy to devnet finished successfully!\n"
else
  printf "Deployment cancelled.\n"
fi

# Restore original program ID in source file
sed -i '' "s/$DEVNET_PROGRAM_ID/$MAINNET_PROGRAM_ID/" programs/inference-staking/src/lib.rs

# Restore local configuration
cp scripts/anchor-configs/Anchor.local.toml Anchor.toml