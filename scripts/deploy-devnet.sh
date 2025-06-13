#!/bin/bash
set -e 
set -o pipefail

# Constants
DEVNET_PROGRAM_ID="stkxmBvNyGRH6FWi4tjFtPpL9XmwnT9ZpqrQnUogvHG"
MAINNET_PROGRAM_ID="stkxmBvNyGRH6FWi4tjFtPpL9XmwnT9ZpqrQnUogvHG"

# Use devnet configuration
cp scripts/anchor-configs/Anchor.dev.toml Anchor.toml

# Replace program ID in source file
sed -i '' "s/$MAINNET_PROGRAM_ID/$DEVNET_PROGRAM_ID/" programs/inference-staking/src/lib.rs

echo -e "\n🚀 Deploying program ID $DEVNET_PROGRAM_ID to Solana devnet.\n"

# Build the program
anchor build
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
