#!/bin/bash

# Set the URL to your local validator
solana config set --url localhost

# Build the program
anchor build

# Deploy the program to your local validator
solana program deploy target/deploy/inference_staking.so --program-id target/deploy/inference_staking-keypair.json

echo -e "Program deploy to localnet finished successfully!\n"