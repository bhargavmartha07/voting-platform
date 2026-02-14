'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { GOVERNOR_ADDRESS, GOVERNANCE_TOKEN_ADDRESS } from '@/config/contracts';
import GovernorABI from '@/abi/MyGovernor.json';
import TokenABI from '@/abi/GovernanceToken.json';
import { formatEther, parseEther, encodeFunctionData } from 'viem';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Vote, Plus, Wallet, Trash2, CheckCircle2, XCircle, Timer, Users } from 'lucide-react';

const STATUS_MAP = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
const COLORS = ['#ef4444', '#22c55e', '#64748b']; // Against, For, Abstain

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProposal, setNewProposal] = useState({ description: '', votingType: '0' });

  // Fetch proposals from events
  const fetchProposals = async () => {
    if (!publicClient) return;
    setLoading(true);
    try {
      const logs = await publicClient.getLogs({
        address: GOVERNOR_ADDRESS,
        event: {
          type: 'event',
          name: 'ProposalCreated',
          inputs: [
            { indexed: false, name: 'proposalId', type: 'uint256' },
            { indexed: false, name: 'proposer', type: 'address' },
            { indexed: false, name: 'targets', type: 'address[]' },
            { indexed: false, name: 'values', type: 'uint256[]' },
            { indexed: false, name: 'signatures', type: 'string[]' },
            { indexed: false, name: 'calldatas', type: 'bytes[]' },
            { indexed: false, name: 'voteStart', type: 'uint256' },
            { indexed: false, name: 'voteEnd', type: 'uint256' },
            { indexed: false, name: 'description', type: 'string' },
          ],
        },
        fromBlock: 0n,
      });

      const proposalData = await Promise.all(logs.map(async (log: any) => {
        const id = log.args.proposalId;
        const state = await publicClient.readContract({
          address: GOVERNOR_ADDRESS,
          abi: GovernorABI.abi,
          functionName: 'state',
          args: [id],
        });

        const votes = await publicClient.readContract({
          address: GOVERNOR_ADDRESS,
          abi: GovernorABI.abi,
          functionName: 'proposalVotes',
          args: [id],
        });

        const votingType = await publicClient.readContract({
          address: GOVERNOR_ADDRESS,
          abi: GovernorABI.abi,
          functionName: 'proposalVotingTypes',
          args: [id],
        });

        return {
          id: id.toString(),
          proposer: log.args.proposer,
          description: log.args.description,
          voteStart: Number(log.args.voteStart),
          voteEnd: Number(log.args.voteEnd),
          status: STATUS_MAP[state as number],
          votes: {
            against: formatEther((votes as any)[0]),
            for: formatEther((votes as any)[1]),
            abstain: formatEther((votes as any)[2]),
          },
          votingType: Number(votingType) === 0 ? "Standard" : "Quadratic"
        };
      }));

      setProposals(proposalData.reverse());
    } catch (error) {
      console.error("Error fetching proposals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (publicClient) fetchProposals();
  }, [publicClient]);

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!writeContractAsync) return;

    try {
      // Mock transfer call for proposal
      const targets = [GOVERNANCE_TOKEN_ADDRESS];
      const values = [0n];
      const calldatas = [encodeFunctionData({
        abi: TokenABI.abi,
        functionName: 'transfer',
        args: [address, 0n]
      })];

      await writeContractAsync({
        address: GOVERNOR_ADDRESS,
        abi: GovernorABI.abi,
        functionName: 'propose',
        args: [targets, values, calldatas, newProposal.description, Number(newProposal.votingType)],
      });

      alert("Proposal created!");
      fetchProposals();
    } catch (error) {
      console.error(error);
      alert("Failed to create proposal");
    }
  };

  const handleVote = async (proposalId: string, support: number) => {
    if (!writeContractAsync) return;
    try {
      await writeContractAsync({
        address: GOVERNOR_ADDRESS,
        abi: GovernorABI.abi,
        functionName: 'castVote',
        args: [BigInt(proposalId), support],
      });
      alert("Vote cast successfully!");
      fetchProposals();
    } catch (error) {
      console.error(error);
      alert("Failed to cast vote");
    }
  };

  const handleDelegate = async () => {
    if (!writeContractAsync) return;
    try {
      await writeContractAsync({
        address: GOVERNANCE_TOKEN_ADDRESS,
        abi: TokenABI.abi,
        functionName: 'delegate',
        args: [address],
      });
      alert("Delegated successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to delegate");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Decentralized Governance
          </h1>
          <p className="text-slate-400 mt-2">Create proposals and vote on-chain</p>
        </div>

        {!isConnected ? (
          <button
            onClick={() => connect({ connector: injected() })}
            data-testid="connect-wallet-button"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-900/20"
          >
            <Wallet size={20} />
            Connect Wallet
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-slate-400">Connected as</p>
              <p data-testid="user-address" className="font-mono text-blue-400">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>
            <button
              onClick={() => disconnect()}
              className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              <Trash2 size={20} className="text-slate-400" />
            </button>
          </div>
        )}
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats & Actions */}
        <div className="space-y-8">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Users size={20} className="text-blue-400" />
              Governance Power
            </h2>
            <button
              onClick={handleDelegate}
              className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl transition-colors border border-slate-700"
            >
              Delegate to Self
            </button>
            <p className="text-xs text-slate-500 mt-4 text-center">
              You must delegate to self once to activate voting power.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Plus size={20} className="text-emerald-400" />
              Create Proposal
            </h2>
            <form onSubmit={handleCreateProposal} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Description</label>
                <textarea
                  value={newProposal.description}
                  onChange={(e) => setNewProposal({ ...newProposal, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none h-32"
                  placeholder="Describe your proposal..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Voting Mechanism</label>
                <select
                  value={newProposal.votingType}
                  onChange={(e) => setNewProposal({ ...newProposal, votingType: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 outline-none"
                >
                  <option value="0">Standard (1T1V)</option>
                  <option value="1">Quadratic (sqrt)</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-emerald-900/20"
              >
                Submit Proposal
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Proposals List */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-semibold flex items-center gap-2 mb-4">
            <Vote size={24} className="text-blue-400" />
            Proposals
          </h2>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
            </div>
          ) : (
            proposals.map((proposal) => (
              <div
                key={proposal.id}
                data-testid="proposal-list-item"
                className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl group hover:border-slate-700 transition-all"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${proposal.status === 'Active' ? 'bg-blue-500/20 text-blue-400' :
                          proposal.status === 'Succeeded' || proposal.status === 'Executed' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-slate-800 text-slate-400'
                        }`}>
                        {proposal.status}
                      </span>
                      <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded">
                        {proposal.votingType}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-100">{proposal.description}</h3>
                    <p className="text-xs text-slate-500 mt-1 font-mono">ID: {proposal.id.slice(0, 10)}...</p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-slate-400 flex items-center justify-end gap-1">
                      <Timer size={14} />
                      Ends soon
                    </p>
                    <p className="text-xs text-slate-500">Block #{proposal.voteEnd}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Against', value: parseFloat(proposal.votes.against) || 0.001 },
                            { name: 'For', value: parseFloat(proposal.votes.for) || 0.001 },
                            { name: 'Abstain', value: parseFloat(proposal.votes.abstain) || 0.001 },
                          ]}
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {COLORS.map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                          itemStyle={{ color: '#f8fafc' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">For</span>
                      <span className="text-emerald-400 font-bold">{proposal.votes.for}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Against</span>
                      <span className="text-red-400 font-bold">{proposal.votes.against}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-slate-800 pt-2">
                      <span className="text-slate-400 font-semibold">Total Votes</span>
                      <span className="text-white font-bold">
                        {(parseFloat(proposal.votes.for) + parseFloat(proposal.votes.against) + parseFloat(proposal.votes.abstain)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {proposal.status === 'Active' && (
                  <div className="mt-8 flex gap-4">
                    <button
                      onClick={() => handleVote(proposal.id, 1)}
                      data-testid="vote-for-button"
                      className="flex-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white py-3 rounded-xl border border-emerald-600/30 transition-all flex items-center justify-center gap-2 font-bold"
                    >
                      <CheckCircle2 size={18} />
                      Vote For
                    </button>
                    <button
                      onClick={() => handleVote(proposal.id, 0)}
                      data-testid="vote-against-button"
                      className="flex-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white py-3 rounded-xl border border-red-600/30 transition-all flex items-center justify-center gap-2 font-bold"
                    >
                      <XCircle size={18} />
                      Vote Against
                    </button>
                    <button
                      onClick={() => handleVote(proposal.id, 2)}
                      data-testid="vote-abstain-button"
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl border border-slate-700 transition-all font-bold"
                    >
                      Abstain
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
