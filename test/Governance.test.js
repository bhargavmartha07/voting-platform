const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, mine } = require("@nomicfoundation/hardhat-network-helpers");

describe("Governance", function () {
    let token;
    let governor;
    let owner;
    let voter1;
    let voter2;
    let proposer;

    beforeEach(async function () {
        [owner, proposer, voter1, voter2] = await ethers.getSigners();

        const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
        token = await GovernanceToken.deploy();

        const MyGovernor = await ethers.getContractFactory("MyGovernor");
        governor = await MyGovernor.deploy(await token.getAddress());

        // Transfer some tokens to voters
        await token.transfer(voter1.address, ethers.parseUnits("100", 18));
        await token.transfer(voter2.address, ethers.parseUnits("81", 18));
        await token.transfer(proposer.address, ethers.parseUnits("200", 18));

        // Delegate voting power
        await token.connect(voter1).delegate(voter1.address);
        await token.connect(voter2).delegate(voter2.address);
        await token.connect(proposer).delegate(proposer.address);

        // Mine blocks to capture snapshots
        await mine(2);
    });

    describe("MyGovernor", function () {
        async function createProposal(votingType) {
            const targets = [await token.getAddress()];
            const values = [0];
            const calldatas = [token.interface.encodeFunctionData("transfer", [owner.address, 100])];
            const description = "Test Proposal";

            const tx = await governor.connect(proposer)["propose(address[],uint256[],bytes[],string,uint8)"](
                targets, values, calldatas, description, votingType
            );
            const receipt = await tx.wait();
            const event = receipt.logs.find(x => x.fragment && x.fragment.name === 'ProposalCreated');
            return event.args.proposalId;
        }

        it("should handle Standard Voting", async function () {
            const proposalId = await createProposal(0); // 0 = Standard
            await mine(2);
            await governor.connect(voter1).castVote(proposalId, 1);
            const proposal = await governor.proposalVotes(proposalId);
            expect(proposal.forVotes).to.equal(ethers.parseUnits("100", 18));
        });

        it("should handle Quadratic Voting", async function () {
            const proposalId = await createProposal(1); // 1 = Quadratic
            await mine(2);
            await governor.connect(voter1).castVote(proposalId, 1);
            await governor.connect(voter2).castVote(proposalId, 1);
            const proposal = await governor.proposalVotes(proposalId);
            // Voter1: sqrt(100e18 * 1e18) = 10e18
            // Voter2: sqrt(81e18 * 1e18) = 9e18
            const expectedVotes = ethers.parseUnits("19", 18);
            expect(proposal.forVotes).to.equal(expectedVotes);
        });

        it("should enforce quorum", async function () {
            const proposalId = await createProposal(0);
            await mine(2);
            await governor.connect(voter1).castVote(proposalId, 1);

            // Wait for voting period (50400 blocks)
            await mine(50401);

            const state = await governor.state(proposalId);
            // Quorum is 4% of 1M = 40,000. Voter1 has 100. Should be Defeated (enum 3)
            expect(state).to.equal(3);
        });
    });
});
