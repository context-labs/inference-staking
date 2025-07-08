#!/bin/bash

# Set the URL to your local validator
solana config set --url localhost

# Build the program
anchor build -- --features test

# Deploy the program to your local validator
solana program deploy target/deploy/inference_staking.so -u localhost -k ./keys/localnet/deployer-keypair.json --program-id ./keys/localnet/program-keypair.json

echo -e "Program deploy to localnet finished successfully!\n"