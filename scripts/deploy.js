import hre from "hardhat";

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const GovernanceToken = await hre.ethers.getContractFactory("GovernanceToken");
    const token = await GovernanceToken.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    console.log("GovernanceToken deployed to:", tokenAddress);

    const MyGovernor = await hre.ethers.getContractFactory("MyGovernor");
    const governor = await MyGovernor.deploy(tokenAddress);
    await governor.waitForDeployment();
    console.log("MyGovernor deployed to:", await governor.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
