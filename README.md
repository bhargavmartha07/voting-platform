# Decentralized On-Chain Voting Platform

A full-stack decentralized governance platform built with Hardhat, OpenZeppelin Governor, and Next.js.

## Features
- **Governance Token**: ERC-20 token with snapshot and delegation capabilities.
- **Governor**: Modular governance contract supporting both Standard (1T1V) and Quadratic Voting mechanisms.
- **Proposal Lifecycle**: Complete proposal management (Pending, Active, Defeated, Succeeded, Executed).
- **Frontend Dashboard**: Beautiful dark-themed UI to view proposals, create new ones, and cast votes.
- **Quadratic Voting**: Implements `cost = votes^2` logic to empower community members and reduce the influence of whales.

## Technology Stack
- **Smart Contracts**: Solidity, Hardhat, OpenZeppelin Contracts.
- **Frontend**: Next.js (App Router), Tailwind CSS, Wagmi, Viem, Lucide React, Recharts.
- **Containerization**: Docker, Docker Compose.

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js (for local development)

### Running with Docker
1. Clone the repository.
2. Run the following command:
   ```bash
   docker-compose up --build
   ```
3. The Hardhat node will start at `http://localhost:8545`.
4. The frontend will be available at `http://localhost:3000`.

### Local Development
1. Install root dependencies: `npm install`
2. Install frontend dependencies: `cd frontend && npm install`
3. Start Hardhat node: `npx hardhat node`
4. Deploy contracts: `npx hardhat run scripts/deploy.js --network localhost`
5. Copy the deployed addresses to `frontend/src/config/contracts.ts`.
6. Start frontend: `cd frontend && npm run dev`

## Smart Contract Details
- **GovernanceToken.sol**: Inherits `ERC20Votes`. Used for snapshotting voting power.
- **MyGovernor.sol**: Extends `Governor` with standard and quadratic voting types. Votes are counted based on the selected mechanism during proposal creation.

## Testing
Comprehensive tests cover the proposal lifecycle, delegation, and voting mechanisms:
```bash
npx hardhat test
```

## Environment Variables
See `.env.example` for the required environment variables.
