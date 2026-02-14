// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Governor, IGovernor} from "@openzeppelin/contracts/governance/Governor.sol";
import {GovernorSettings} from "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import {GovernorCountingSimple} from "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import {GovernorVotes, IVotes} from "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import {GovernorVotesQuorumFraction} from "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

contract MyGovernor is Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes, GovernorVotesQuorumFraction {
    enum VotingType { Standard, Quadratic }
    
    mapping(uint256 => VotingType) public proposalVotingTypes;

    constructor(IVotes _token)
        Governor("MyGovernor")
        GovernorSettings(1 /* 1 block voting delay */, 50400 /* 1 week voting period */, 100e18)
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4) // 4% quorum
    {}

    function votingDelay()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(Governor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    function _countVote(
        uint256 proposalId,
        address account,
        uint8 support,
        uint256 totalWeight,
        bytes memory params
    ) internal override(Governor, GovernorCountingSimple) returns (uint256) {
        uint256 actualWeight = totalWeight;
        if (proposalVotingTypes[proposalId] == VotingType.Quadratic) {
            // scale up by 1e18 to keep precision after sqrt
            actualWeight = Math.sqrt(totalWeight * 1e18);
        }
        return super._countVote(proposalId, account, support, actualWeight, params);
    }

    // Custom propose with voting type
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        VotingType votingType
    ) public returns (uint256) {
        uint256 proposalId = super.propose(targets, values, calldatas, description);
        proposalVotingTypes[proposalId] = votingType;
        return proposalId;
    }

    // Override the standard propose to default to Standard voting type
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(Governor) returns (uint256) {
        return propose(targets, values, calldatas, description, VotingType.Standard);
    }
}
