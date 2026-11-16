import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Users, 
  PhoneCall, 
  CheckCircle2, 
  Target, 
  TrendingUp, 
  UserCheck, 
  Search, 
  SlidersHorizontal,
  ArrowUpRight,
  Eye,
  BarChart3,
  Check
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { BranchInfo, User, CustomerRecord } from '../types';

interface BranchesPageProps {
  branches: BranchInfo[];
  supervisors: User[];
  teamMembers: User[];
  records: CustomerRecord[];
  currentUser: User;
  onInspectAgentExcel?: (agent: User) => void;
  onOpenSetBranchTarget?: (branch: BranchInfo) => void;
}

export const BranchesPage: React.FC<BranchesPageProps> = ({
  branches,
  supervisors,
  teamMembers,
  records,
  currentUser,
  onInspectAgentExcel,
  onOpenSetBranchTarget
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchDetail, setSelectedBranchDetail] = useState<string | null>(null);

  const isHQAdmin = currentUser.role === 'HQ_ADMIN';

  // Compute metrics per branch
  const branchMetrics = useMemo(() => {
    return branches.map(branch => {
      const branchSupervisor = supervisors.find(
        s => s.branch === branch.name || s.id === branch.supervisorId
      );
      const supervisorName = branchSupervisor ? branchSupervisor.name : (branch.supervisorName || 'Unassigned');

      const branchAgents = teamMembers.filter(
        a => a.branch.toLowerCase().trim() === branch.name.toLowerCase().trim() ||
             (branchSupervisor && a.supervisorId === branchSupervisor.id)
      );

      const branchRecords = records.filter(
        r => r.areaOfReg?.toLowerCase().trim() === branch.name.toLowerCase().trim()
      );

      const called = branchRecords.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;
      const success = branchRecords.filter(r => r.status === 'Success').length;
      const inProgress = branchRecords.filter(r => r.status === 'In-progress').length;
      const notAvailable = branchRecords.filter(r => r.status === 'Not Available').length;
      const rejected = branchRecords.filter(r => r.status === 'Rejected').length;
      const uncalled = branchRecords.filter(r => !r.status || r.status === 'Uncalled').length;
      const appointments = branchRecords.filter(r => r.appointment && r.appointment.trim() !== '').length;

      const conversionRate = called > 0 ? Math.round((success / called) * 100) : 0;
      const targetPercent = branch.targetCallsMonth > 0 
        ? Math.min(100, Math.round((called / branch.targetCallsMonth) * 100))
        : 0;

      return {
        branch,
        supervisorName,
        supervisor: branchSupervisor,
        agentCount: branchAgents.length,
        agents: branchAgents,
        totalRecords: branchRecords.length,
        called,
        success,
        inProgress,
        notAvailable,
        rejected,
        uncalled,
        appointments,
        conversionRate,
        targetPercent,
        targetCallsWeek: branch.targetCallsWeek,
        targetCallsMonth: branch.targetCallsMonth
      };
    });
  }, [branches, supervisors, teamMembers, records]);

  // Overall Totals
  const totalLeads = records.length;
  const totalCalls = records.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;
  const totalSuccess = records.filter(r => r.status === 'Success').length;
  const overallConversion = totalCalls > 0 ? Math.round((totalSuccess / totalCalls) * 100) : 0;

  // Filtered list
  const filteredBranches = useMemo(() => {
    if (!searchQuery.trim()) return branchMetrics;
    const q = searchQuery.toLowerCase();
    return branchMetrics.filter(
      b => b.branch.name.toLowerCase().includes(q) ||
           b.supervisorName.toLowerCase().includes(q)
    );
  }, [branchMetrics, searchQuery]);

  // Chart data
  const chartData = branchMetrics.map(bm => ({
    name: bm.branch.name,
    'Calls Made': bm.called,
    'Target Calls': bm.targetCallsMonth,
    'Successes': bm.success
  }));

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-red-600 shrink-0" />
            <span>Regional Branches Command</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time branch telemetry, targets fulfillment & supervisor deployment across Somalia
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search branch or supervisor..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
          />
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Total Branches</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{branches.length}</div>
          <div className="text-[10.5px] text-slate-400 mt-0.5">Active regional hubs</div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Total Customer Leads</div>
          <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">{totalLeads.toLocaleString()}</div>
          <div className="text-[10.5px] text-slate-400 mt-0.5">Assigned across branches</div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Total Calls Conducted</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{totalCalls.toLocaleString()}</div>
          <div className="text-[10.5px] text-slate-400 mt-0.5">{totalSuccess} Converted</div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Global Conversion Rate</div>
          <div className="text-xl sm:text-2xl font-black text-red-600 mt-1">{overallConversion}%</div>
          <div className="text-[10.5px] text-slate-400 mt-0.5">Calls to success ratio</div>
        </div>
      </div>

      {/* Branch Comparison Bar Chart */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-500" />
            <span>Branch Performance vs Monthly Target</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">Monthly Target Fulfillment</span>
        </div>

        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="Calls Made" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Successes" fill="#059669" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Target Calls" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Regional Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredBranches.map((bm) => {
          return (
            <div
              key={bm.branch.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Branch Header */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200/80 flex items-center justify-center text-red-600 shrink-0 font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight truncate">
                        {bm.branch.name}
                      </h3>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <UserCheck className="w-3 h-3 text-slate-400" />
                        <span className="truncate">Sup: <strong>{bm.supervisorName}</strong></span>
                      </div>
                    </div>
                  </div>

                  {isHQAdmin && onOpenSetBranchTarget && (
                    <button
                      onClick={() => onOpenSetBranchTarget(bm.branch)}
                      className="text-[10.5px] px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold cursor-pointer shrink-0 transition-colors"
                      title="Set weekly/monthly targets for this branch"
                    >
                      Set Target
                    </button>
                  )}
                </div>

                {/* Target Progress Bar */}
                <div className="mt-3.5 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Monthly Target Progress:</span>
                    <span className="font-bold text-slate-900">
                      {bm.called} / {bm.targetCallsMonth} ({bm.targetPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        bm.targetPercent >= 80 ? 'bg-emerald-600' : bm.targetPercent >= 40 ? 'bg-blue-600' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, bm.targetPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-3 gap-2 mt-3.5 text-center">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-medium">Total Leads</div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">{bm.totalRecords}</div>
                  </div>
                  <div className="p-2 bg-emerald-50/80 rounded-lg border border-emerald-100">
                    <div className="text-[10px] text-emerald-800 font-medium">Success</div>
                    <div className="text-xs sm:text-sm font-bold text-emerald-900 mt-0.5">{bm.success}</div>
                  </div>
                  <div className="p-2 bg-blue-50/80 rounded-lg border border-blue-100">
                    <div className="text-[10px] text-blue-800 font-medium">Conversion</div>
                    <div className="text-xs sm:text-sm font-bold text-blue-900 mt-0.5">{bm.conversionRate}%</div>
                  </div>
                </div>

                {/* Detailed Outcomes */}
                <div className="mt-3 flex items-center justify-between text-[10.5px] text-slate-500 px-1">
                  <span>In-prog: <strong className="text-slate-700">{bm.inProgress}</strong></span>
                  <span>No Ans: <strong className="text-slate-700">{bm.notAvailable}</strong></span>
                  <span>Uncalled: <strong className="text-slate-700">{bm.uncalled}</strong></span>
                  <span>Agents: <strong className="text-slate-700">{bm.agentCount}</strong></span>
                </div>
              </div>

              {/* Agents List Preview */}
              <div className="border-t border-slate-100 pt-3">
                <div className="text-[10.5px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                  <span>Deployed Agents ({bm.agents.length}):</span>
                </div>
                {bm.agents.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {bm.agents.slice(0, 4).map((ag) => (
                      <button
                        key={ag.id}
                        onClick={() => onInspectAgentExcel && onInspectAgentExcel(ag)}
                        className="text-[10px] bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer border border-slate-200/80 truncate max-w-[130px]"
                        title={`Inspect ${ag.name} Excel Records`}
                      >
                        {ag.name}
                      </button>
                    ))}
                    {bm.agents.length > 4 && (
                      <span className="text-[10px] text-slate-400 font-medium self-center pl-1">
                        +{bm.agents.length - 4} more
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">No agents assigned yet</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
