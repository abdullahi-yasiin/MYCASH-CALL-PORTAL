import React, { useState, useMemo } from 'react';
import { 
  UserCheck, 
  Building2, 
  Users, 
  PhoneCall, 
  CheckCircle2, 
  Target, 
  TrendingUp, 
  Search, 
  Mail, 
  Phone, 
  CalendarCheck,
  Zap,
  ChevronRight,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { User, BranchInfo, CustomerRecord, isRecordAssignedBySupervisor } from '../types';

interface SupervisorsPageProps {
  supervisors: User[];
  teamMembers: User[];
  records: CustomerRecord[];
  branches: BranchInfo[];
  currentUser: User;
  onInspectAgentExcel?: (agent: User) => void;
  onOpenFocusRollUp?: () => void;
}

export const SupervisorsPage: React.FC<SupervisorsPageProps> = ({
  supervisors,
  teamMembers,
  records,
  branches,
  currentUser,
  onInspectAgentExcel,
  onOpenFocusRollUp
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');

  const isHQAdmin = currentUser.role === 'HQ_ADMIN';

  // Compute supervisors stats
  const supervisorStats = useMemo(() => {
    return supervisors.map(sup => {
      const branchInfo = branches.find(b => b.name === sup.branch || b.supervisorId === sup.id);

      const assignedAgents = teamMembers.filter(
        a => a.supervisorId === sup.id || a.branch.toLowerCase().trim() === sup.branch.toLowerCase().trim()
      );

      const agentIds = new Set(assignedAgents.map(a => a.id));
      const agentNames = new Set(assignedAgents.map(a => a.name.toLowerCase().trim()));

      const supervisedRecords = records.filter(
        r => (r.supervisorId === sup.id) ||
             (r.assignedAgentId && agentIds.has(r.assignedAgentId)) ||
             (r.assignedAgentName && agentNames.has(r.assignedAgentName.toLowerCase().trim())) ||
             (r.areaOfReg?.toLowerCase().trim() === sup.branch.toLowerCase().trim())
      );

      const called = supervisedRecords.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;
      const success = supervisedRecords.filter(r => r.status === 'Success').length;
      const inProgress = supervisedRecords.filter(r => r.status === 'In-progress').length;
      const notAvailable = supervisedRecords.filter(r => r.status === 'Not Available').length;
      const rejected = supervisedRecords.filter(r => r.status === 'Rejected').length;
      const uncalled = supervisedRecords.filter(r => !r.status || r.status === 'Uncalled').length;
      const appointments = supervisedRecords.filter(r => r.appointment && r.appointment.trim() !== '').length;

      const conversionRate = called > 0 ? Math.round((success / called) * 100) : 0;

      // Target progress
      const targetCallsMonth = branchInfo ? branchInfo.targetCallsMonth : (assignedAgents.length * 400 || 400);
      const targetPercent = targetCallsMonth > 0 ? Math.min(100, Math.round((called / targetCallsMonth) * 100)) : 0;

      return {
        supervisor: sup,
        branchName: sup.branch,
        branchInfo,
        agents: assignedAgents,
        agentCount: assignedAgents.length,
        totalRecords: supervisedRecords.length,
        called,
        success,
        inProgress,
        notAvailable,
        rejected,
        uncalled,
        appointments,
        conversionRate,
        targetCallsMonth,
        targetPercent
      };
    });
  }, [supervisors, teamMembers, records, branches]);

  // Overall totals
  const totalAgents = teamMembers.length;
  const totalSupervisedCalls = supervisorStats.reduce((sum, s) => sum + s.called, 0);
  const totalSupervisedSuccess = supervisorStats.reduce((sum, s) => sum + s.success, 0);

  // Filtered
  const filteredSupervisors = useMemo(() => {
    return supervisorStats.filter(s => {
      const matchSearch = 
        !searchQuery.trim() ||
        s.supervisor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.supervisor.email && s.supervisor.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchBranch = selectedBranch === 'ALL' || s.branchName === selectedBranch;

      return matchSearch && matchBranch;
    });
  }, [supervisorStats, searchQuery, selectedBranch]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-red-600 shrink-0" />
            <span>Supervisors Management & Directives</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational hierarchy, team allocation, directives and branch calling accountability
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isHQAdmin && onOpenFocusRollUp && (
            <button
              onClick={onOpenFocusRollUp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
              title="Open Supervisors Performance Roll-Up Focus Mode"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Performance Roll-Up</span>
            </button>
          )}

          {/* Branch filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
          >
            <option value="ALL">All Branches ({branches.length})</option>
            {branches.map(b => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>

          {/* Search input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search supervisor..."
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500 font-medium w-40 sm:w-48"
            />
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Active Supervisors</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{supervisors.length}</div>
          <div className="text-[10.5px] text-slate-400 mt-0.5">Across {branches.length} branches</div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Supervised Agents</div>
          <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">{totalAgents}</div>
          <div className="text-[10.5px] text-slate-400 mt-0.5">Assigned to team leads</div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Supervised Calls</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{totalSupervisedCalls.toLocaleString()}</div>
          <div className="text-[10.5px] text-slate-400 mt-0.5">{totalSupervisedSuccess} Successes</div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Avg Team Conversion</div>
          <div className="text-xl sm:text-2xl font-black text-red-600 mt-1">
            {totalSupervisedCalls > 0 ? Math.round((totalSupervisedSuccess / totalSupervisedCalls) * 100) : 0}%
          </div>
          <div className="text-[10.5px] text-slate-400 mt-0.5">Success conversion rate</div>
        </div>
      </div>

      {/* Supervisors Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredSupervisors.map((stat) => {
          const sup = stat.supervisor;

          return (
            <div
              key={sup.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Supervisor Header */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700 font-bold shrink-0">
                      {sup.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight truncate">
                        {sup.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Building2 className="w-3 h-3 text-red-500" />
                          {stat.branchName}
                        </span>
                        <span>•</span>
                        <span>{stat.agentCount} Agents</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    Supervisor
                  </span>
                </div>

                {/* Contact info */}
                <div className="mt-2.5 space-y-1 text-[11px] text-slate-500 font-medium">
                  {sup.email && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{sup.email}</span>
                    </div>
                  )}
                  {sup.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{sup.phone}</span>
                    </div>
                  )}
                </div>

                {/* Monthly Progress */}
                <div className="mt-3.5 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Branch Target Completion:</span>
                    <span className="font-bold text-slate-900">
                      {stat.called} / {stat.targetCallsMonth} ({stat.targetPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        stat.targetPercent >= 80 ? 'bg-emerald-600' : stat.targetPercent >= 40 ? 'bg-blue-600' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, stat.targetPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Performance stats mini grid */}
                <div className="grid grid-cols-3 gap-2 mt-3.5 text-center">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-medium">Leads</div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">{stat.totalRecords}</div>
                  </div>
                  <div className="p-2 bg-emerald-50/80 rounded-lg border border-emerald-100">
                    <div className="text-[10px] text-emerald-800 font-medium">Success</div>
                    <div className="text-xs sm:text-sm font-bold text-emerald-900 mt-0.5">{stat.success}</div>
                  </div>
                  <div className="p-2 bg-blue-50/80 rounded-lg border border-blue-100">
                    <div className="text-[10px] text-blue-800 font-medium">Conversion</div>
                    <div className="text-xs sm:text-sm font-bold text-blue-900 mt-0.5">{stat.conversionRate}%</div>
                  </div>
                </div>

                {/* Sub-status counts */}
                <div className="mt-3 flex items-center justify-between text-[10.5px] text-slate-500 px-1">
                  <span>In-progress: <strong className="text-slate-700">{stat.inProgress}</strong></span>
                  <span>Uncalled: <strong className="text-slate-700">{stat.uncalled}</strong></span>
                  <span>Callbacks: <strong className="text-slate-700">{stat.appointments}</strong></span>
                </div>
              </div>

              {/* Supervised Agents List & Quick Inspection */}
              <div className="border-t border-slate-100 pt-3">
                <div className="text-[10.5px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                  <span>Assigned Agents ({stat.agents.length}):</span>
                  <span className="text-[9.5px] text-slate-400 font-normal">Click to audit excel</span>
                </div>
                {stat.agents.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {stat.agents.map((ag) => (
                      <button
                        key={ag.id}
                        onClick={() => onInspectAgentExcel && onInspectAgentExcel(ag)}
                        className="text-[10px] bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer border border-slate-200/80 truncate max-w-[125px] flex items-center gap-1"
                        title={`Inspect ${ag.name} Excel Records`}
                      >
                        <FileSpreadsheet className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{ag.name}</span>
                      </button>
                    ))}
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
