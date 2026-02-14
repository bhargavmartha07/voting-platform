#!/bin/sh

# Start Hardhat node in the background
npx hardhat node &

# Wait for node to be ready
until nc -z localhost 8545; do
  echo "Waiting for Hardhat node..."
  sleep 1
done

# Deploy contracts
echo "Deploying contracts..."
npx hardhat run scripts/deploy.js --network localhost

# Keep the process running
wait
