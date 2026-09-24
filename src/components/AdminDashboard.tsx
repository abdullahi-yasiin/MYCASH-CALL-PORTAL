import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Building2, 
  UserCheck, 
  Users, 
  TrendingUp, 
  Target, 
  CheckCircle2, 
  Clock, 
  PhoneOff, 
  XCircle,
  CalendarCheck,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  BarChart3,
  Sparkles,
  ArrowUpRight,
  Eye,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Activity,
  Layers,
  PhoneCall,
  UploadCloud,
  ChevronDown,
  X,
  Trash2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { BranchInfo, User, CustomerRecord, ActivityLog, DeleteExcelTarget } from '../types';
import { exportTeamSummaryToExcel, TeamMemberSummaryRow } from '../utils/exportEngine';

interface AdminDashboardProps {
  branches: BranchInfo[];
  supervisors: User[];
  teamMembers: User[];
  records: CustomerRecord[];
  activityLogs: ActivityLog[];
  currentUser: User;
  onInspectAgentExcel: (agent: User) => void;
  onOpenPrdModal: () => void;
  onOpenBulkImport: (targetAgentId?: string) => void;
  onOpenUserManagement?: () => void;
  onOpenDeleteExcel?: (target?: DeleteExcelTarget) => void;
  onOpenSetAgentTarget?: (agent: User) => void;
  onOpenSetBranchTarget?: (branch: BranchInfo) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  branches,
  supervisors,
  teamMembers,
  records,
  activityLogs,
  currentUser,
  onInspectAgentExcel,
  onOpenPrdModal,
  onOpenBulkImport,
  onOpenUserManagement,
  onOpenDeleteExcel,
  onOpenSetAgentTarget,
  onOpenSetBranchTarget
}) => {
  // Active view tab inside the auto-summary dashboard
  const [activeSection, setActiveSection] = useState<'teamExcels' | 'regionalBranches' | 'supervisors' | 'appointments' | 'activityLogs'>('teamExcels');
  
  // Filters for auto-summary
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dedicated filters for the Call Outcome Distribution Visual Analytics Chart
  const [chartBranchFilter, setChartBranchFilter] = useState<string>('ALL');
  const [chartAgentFilter, setChartAgentFilter] = useState<string>('ALL');

  // Upload dropdown state
  const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState(false);
  const [agentFilterQuery, setAgentFilterQuery] = useState('');
  const uploadDropdownRef = useRef<HTMLDivElement>(null);

  // Close upload dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(event.target as Node)) {
        setIsUploadDropdownOpen(false);
      }
    };
    if (isUploadDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUploadDropdownOpen]);

  // Filtered agents for upload assignment dropdown
  const filteredAgentsForUpload = useMemo(() => {
    if (!agentFilterQuery.trim()) return teamMembers;
    const q = agentFilterQuery.toLowerCase();
    return teamMembers.filter(
      a => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.branch.toLowerCase().includes(q)
    );
  }, [teamMembers, agentFilterQuery]);

  // Available agents for the chart filter dropdown based on selected branch
  const availableChartAgents = useMemo(() => {
    if (chartBranchFilter === 'ALL') {
      return teamMembers;
    }
    return teamMembers.filter(m => m.branch === chartBranchFilter);
  }, [teamMembers, chartBranchFilter]);

  // 1. Compute automated summary for EVERY TEAM MEMBER'S EXCEL
  const teamMemberSummaries = useMemo(() => {
    return teamMembers.map(agent => {
      const agentRecords = records.filter(r => r.assignedAgentId === agent.id);
      const totalLeads = agentRecords.length;
      const called = agentRecords.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;
      const uncalled = agentRecords.filter(r => !r.hasBeenCalled && (!r.status || r.status === 'Uncalled')).length;
      const success = agentRecords.filter(r => r.status === 'Success').length;
      const inProgress = agentRecords.filter(r => r.status === 'In-progress').length;
      const notAvailable = agentRecords.filter(r => r.status === 'Not Available').length;
      const rejected = agentRecords.filter(r => r.status === 'Rejected').length;
      const appointments = agentRecords.filter(r => r.appointment && r.appointment.trim() !== '').length;
      const conversion = called > 0 ? Math.round((success / called) * 100) : 0;
      const progressPercent = totalLeads > 0 ? Math.round((called / totalLeads) * 100) : 0;

      const supervisor = supervisors.find(s => s.id === agent.supervisorId || s.branch === agent.branch);

      return {
        agent,
        agentName: agent.name,
        branch: agent.branch,
        supervisorId: supervisor?.id,
        supervisorName: supervisor?.name || 'Assigned Supervisor',
        totalLeads,
        called,
        uncalled,
        success,
        inProgress,
        notAvailable,
        rejected,
        appointments,
        conversion,
        progressPercent
      };
    });
  }, [teamMembers, records, supervisors]);

  // Filtered team member summaries
  const filteredTeamSummaries = useMemo(() => {
    return teamMemberSummaries.filter(s => {
      const matchBranch = selectedBranch === 'ALL' || s.branch === selectedBranch;
      const matchSup = selectedSupervisor === 'ALL' || s.supervisorId === selectedSupervisor;
      const q = searchQuery.toLowerCase();
      const matchQuery = !q || s.agentName.toLowerCase().includes(q) || s.branch.toLowerCase().includes(q) || s.supervisorName.toLowerCase().includes(q);
      return matchBranch && matchSup && matchQuery;
    });
  }, [teamMemberSummaries, selectedBranch, selectedSupervisor, searchQuery]);

  // 2. Compute automated summary for REGIONAL BRANCHES
  const branchSummaries = useMemo(() => {
    return branches.map(branch => {
      const branchRecords = records.filter(r => r.areaOfReg === branch.name);
      const branchAgents = teamMembers.filter(tm => tm.branch === branch.name);
      const activeBranchAgents = branchAgents.filter(tm => tm.active !== false);
      const activeAgentCount = Math.max(1, activeBranchAgents.length);

      const baseWeekly = branch.baseWeeklyTargetPerAgent || 50;
      const baseMonthly = branch.baseMonthlyTargetPerAgent || 200;

      const weeklyTarget = branch.targetCallsWeek || (baseWeekly * activeAgentCount);
      const monthlyTarget = branch.targetCallsMonth || (baseMonthly * activeAgentCount);

      const totalLeads = branchRecords.length;
      const called = branchRecords.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;
      const uncalled = branchRecords.filter(r => !r.hasBeenCalled && (!r.status || r.status === 'Uncalled')).length;
      const success = branchRecords.filter(r => r.status === 'Success').length;
      const inProgress = branchRecords.filter(r => r.status === 'In-progress').length;
      const notAvailable = branchRecords.filter(r => r.status === 'Not Available').length;
      const rejected = branchRecords.filter(r => r.status === 'Rejected').length;
      const appointments = branchRecords.filter(r => r.appointment && r.appointment.trim() !== '').length;
      const conversion = called > 0 ? Math.round((success / called) * 100) : 0;
      
      const monthlyTargetPercent = Math.min(100, Math.round((called / Math.max(1, monthlyTarget)) * 100));
      const weeklyEstimatedCalled = Math.round(called / 4);
      const weeklyTargetPercent = Math.min(100, Math.round((weeklyEstimatedCalled / Math.max(1, weeklyTarget)) * 100));

      const branchSupervisor = supervisors.find(s => s.branch === branch.name || s.id === branch.supervisorId);
      const dynamicSupervisorName = branchSupervisor ? branchSupervisor.name : (branch.supervisorName || 'Unassigned');

      return {
        ...branch,
        supervisorName: dynamicSupervisorName,
        agentCount: branchAgents.length,
        activeAgentCount: activeBranchAgents.length,
        baseWeeklyTargetPerAgent: baseWeekly,
        baseMonthlyTargetPerAgent: baseMonthly,
        weeklyTarget,
        monthlyTarget,
        weeklyTargetPercent,
        monthlyTargetPercent,
        targetCallsMonth: monthlyTarget,
        targetCallsWeek: weeklyTarget,
        totalLeads,
        called,
        uncalled,
        success,
        inProgress,
        notAvailable,
        rejected,
        appointments,
        conversion,
        targetPercent: monthlyTargetPercent
      };
    });
  }, [branches, records, teamMembers, supervisors]);

  // 3. Compute automated summary for SUPERVISORS
  const supervisorSummaries = useMemo(() => {
    return supervisors.map(sup => {
      const supRecords = records.filter(r => r.supervisorId === sup.id || r.areaOfReg === sup.branch);
      const supervisedAgents = teamMembers.filter(tm => tm.supervisorId === sup.id || tm.branch === sup.branch);
      const totalLeads = supRecords.length;
      const called = supRecords.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;
      const uncalled = supRecords.filter(r => !r.hasBeenCalled && (!r.status || r.status === 'Uncalled')).length;
      const success = supRecords.filter(r => r.status === 'Success').length;
      const inProgress = supRecords.filter(r => r.status === 'In-progress').length;
      const notAvailable = supRecords.filter(r => r.status === 'Not Available').length;
      const rejected = supRecords.filter(r => r.status === 'Rejected').length;
      const appointments = supRecords.filter(r => r.appointment && r.appointment.trim() !== '').length;
      const conversion = called > 0 ? Math.round((success / called) * 100) : 0;

      return {
        ...sup,
        agentCount: supervisedAgents.length,
        totalLeads,
        called,
        uncalled,
        success,
        inProgress,
        notAvailable,
        rejected,
        appointments,
        conversion
      };
    });
  }, [supervisors, records, teamMembers]);

  // All upcoming appointments across all team members' Excels
  const allAppointments = useMemo(() => {
    return records
      .filter(r => r.appointment && r.appointment.trim() !== '')
      .sort((a, b) => (a.appointment > b.appointment ? 1 : -1));
  }, [records]);

  // High-level enterprise aggregates
  const totalEnterpriseLeads = records.length;
  const totalEnterpriseCalled = records.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;
  const totalEnterpriseUncalled = records.filter(r => !r.hasBeenCalled && (!r.status || r.status === 'Uncalled')).length;
  const totalEnterpriseSuccess = records.filter(r => r.status === 'Success').length;
  const totalEnterpriseInProgress = records.filter(r => r.status === 'In-progress').length;
  const totalEnterpriseNotAvailable = records.filter(r => r.status === 'Not Available').length;
  const totalEnterpriseRejected = records.filter(r => r.status === 'Rejected').length;
  const totalEnterpriseAppointments = allAppointments.length;
  const enterpriseConversionRate = totalEnterpriseCalled > 0 
    ? Math.round((totalEnterpriseSuccess / totalEnterpriseCalled) * 100) 
    : 0;
  const enterpriseProgressRate = totalEnterpriseLeads > 0 
    ? Math.round((totalEnterpriseCalled / totalEnterpriseLeads) * 100) 
    : 0;

  // Dynamic chart data with branch & agent selector filtering
  const chartData = useMemo(() => {
    // 1. Specific agent selected
    if (chartAgentFilter !== 'ALL') {
      const targetAgentSummary = teamMemberSummaries.find(t => t.agent.id === chartAgentFilter);
      if (targetAgentSummary) {
        return [{
          name: targetAgentSummary.agentName,
          fullName: `${targetAgentSummary.agentName} (${targetAgentSummary.branch})`,
          Success: targetAgentSummary.success,
          InProgress: targetAgentSummary.inProgress,
          NotAvailable: targetAgentSummary.notAvailable,
          Rejected: targetAgentSummary.rejected
        }];
      }
    }

    // 2. Specific branch selected -> display all agents in that branch
    if (chartBranchFilter !== 'ALL') {
      const branchAgents = teamMemberSummaries.filter(t => t.branch === chartBranchFilter);
      if (branchAgents.length > 0) {
        return branchAgents.map(a => ({
          name: a.agentName.split(' ')[0],
          fullName: `${a.agentName} (${a.branch})`,
          Success: a.success,
          InProgress: a.inProgress,
          NotAvailable: a.notAvailable,
          Rejected: a.rejected
        }));
      }
      // If no agent summaries for branch, show the branch itself
      const bSummary = branchSummaries.find(b => b.name === chartBranchFilter);
      if (bSummary) {
        return [{
          name: bSummary.name.replace(' Commercial Hub', '').replace(' Central', '').replace(' North', '').replace(' Port Branch', '').replace(' Southern Hub', ''),
          fullName: bSummary.name,
          Success: bSummary.success,
          InProgress: bSummary.inProgress,
          NotAvailable: bSummary.notAvailable,
          Rejected: bSummary.rejected
        }];
      }
    }

    // 3. Default: All Branches
    return branchSummaries.map(b => ({
      name: b.name.replace(' Commercial Hub', '').replace(' Central', '').replace(' North', '').replace(' Port Branch', '').replace(' Southern Hub', ''),
      fullName: b.name,
      Success: b.success,
      InProgress: b.inProgress,
      NotAvailable: b.notAvailable,
      Rejected: b.rejected
    }));
  }, [chartBranchFilter, chartAgentFilter, teamMemberSummaries, branchSummaries]);

  // Handle export summarized data
  const handleExportSummaryExcel = () => {
    const summaryRows: TeamMemberSummaryRow[] = filteredTeamSummaries.map(s => ({
      agentName: s.agentName,
      branch: s.branch,
      supervisorName: s.supervisorName,
      totalLeads: s.totalLeads,
      called: s.called,
      uncalled: s.uncalled,
      success: s.success,
      inProgress: s.inProgress,
      notAvailable: s.notAvailable,
      rejected: s.rejected,
      appointments: s.appointments,
      conversion: s.conversion,
      progressPercent: s.progressPercent
    }));

    exportTeamSummaryToExcel(summaryRows, 'MyCash_Admin_Team_Excels_Summary');
  };

  return (
    <div className="space-y-5">
      {/* Admin Executive Banner (Selector 1) */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-lg sm:rounded-2xl p-2.5 sm:p-5 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <span className="hidden sm:inline-flex px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-xs text-[7.5px] sm:text-[10px] font-extrabold uppercase bg-red-500/20 text-red-300 border border-red-500/30">
              HQ Executive Terminal
            </span>
          </div>
          <h2 className="text-xs sm:text-lg md:text-xl font-extrabold tracking-tight text-white mt-1 sm:mt-1.5 flex items-center gap-1.5">
            <span>MyCash Tele-Sales Performance Summary</span>
          </h2>
          <p className="text-[8.5px] sm:text-xs text-slate-300 max-w-2xl mt-0.5 leading-normal sm:leading-relaxed">
            Auto-summarising real-time operational data aggregated across <strong>{teamMembers.length} team members' Excels</strong>, <strong>{branches.length} branches</strong>, and <strong>{supervisors.length} supervisors</strong>.
          </p>
        </div>

        {/* Selected target element: Action Buttons container (visible across all views including mobile) */}
        <div 
          id="admin-banner-action-buttons" 
          className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t border-slate-800/80 md:border-t-0"
        >
          {onOpenUserManagement && (
            <button
              id="btn-admin-manage-rbac"
              onClick={onOpenUserManagement}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all border border-slate-700 shadow-2xs cursor-pointer active:scale-95"
              title="Configure system users, roles, and granular permission matrix"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Roles & Permissions</span>
            </button>
          )}

          {/* Upload File with Agent Selection Dropdown */}
          <div ref={uploadDropdownRef} className="relative flex-1 sm:flex-initial min-w-0">
            <button
              id="btn-admin-upload-new-excel"
              onClick={() => setIsUploadDropdownOpen(!isUploadDropdownOpen)}
              className={`w-full sm:w-auto flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-2 sm:px-3 sm:py-2 bg-red-600 hover:bg-red-500 text-white text-[10px] sm:text-[11px] font-bold rounded-lg transition-all shadow-2xs cursor-pointer active:scale-95 ${
                isUploadDropdownOpen ? 'bg-red-500 ring-2 ring-red-400' : ''
              }`}
              title="Import additional customer Excel sheet and select agent to assign"
              aria-haspopup="true"
              aria-expanded={isUploadDropdownOpen}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Upload Excel</span>
              <ChevronDown className={`w-3 h-3 text-red-200 transition-transform duration-200 shrink-0 ${isUploadDropdownOpen ? 'rotate-180 text-white' : ''}`} />
            </button>

            {/* Dropdown Popover / Mobile Overlay Modal */}
            {isUploadDropdownOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-0 bg-slate-950/75 sm:bg-transparent backdrop-blur-xs sm:backdrop-blur-none sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2">
                <div
                  id="dropdown-admin-upload-agent"
                  className="w-full max-w-[340px] sm:w-80 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-3.5 sm:p-3 text-xs animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
                >
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Users className="w-4 h-4 text-red-400 shrink-0" />
                      <span className="font-bold text-white text-xs truncate">Assign Upload to Agent</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-xs bg-red-500/10 text-red-400 border border-red-500/20">
                        {teamMembers.length} Agents
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsUploadDropdownOpen(false)}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Close dropdown"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                <p className="text-[10.5px] sm:text-[11px] text-slate-300 mb-2.5 leading-relaxed">
                  Select an agent to upload and assign an Excel customer calling roster.
                </p>

                {/* Agent Search Filter */}
                {teamMembers.length > 2 && (
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="input-admin-filter-agents"
                      type="text"
                      autoFocus
                      value={agentFilterQuery}
                      onChange={(e) => setAgentFilterQuery(e.target.value)}
                      placeholder="Search agent by name or branch..."
                      className="w-full pl-8 pr-7 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-red-500"
                    />
                    {agentFilterQuery && (
                      <button
                        onClick={() => setAgentFilterQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer p-0.5"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )}

                {/* General / Enterprise Shared Upload Option */}
                <button
                  id="btn-admin-import-general"
                  onClick={() => {
                    setIsUploadDropdownOpen(false);
                    onOpenBulkImport('');
                  }}
                  className="w-full text-left p-2 rounded-xl hover:bg-slate-800 text-slate-200 flex items-center justify-between transition-colors border border-dashed border-slate-700/80 mb-2.5 group cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-xs shrink-0">
                      <UploadCloud className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-white group-hover:text-red-400 transition-colors truncate">
                        General / Unassigned Upload
                      </div>
                      <div className="text-[9.5px] text-slate-400 truncate">Upload to global pool without designating an agent</div>
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded shrink-0 ml-1 font-semibold">All</span>
                </button>

                {/* Section Header */}
                <div className="text-[9.5px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
                  <span>Enterprise Team Members</span>
                  <span>Click to Upload</span>
                </div>

                {/* Agents List */}
                <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
                  {filteredAgentsForUpload.length === 0 ? (
                    <div className="py-4 text-center text-slate-400 text-xs">
                      {teamMembers.length === 0
                        ? "No agents found in system."
                        : "No matching agents found."}
                    </div>
                  ) : (
                    filteredAgentsForUpload.map((ag) => {
                      const summary = teamMemberSummaries.find(s => s.agent.id === ag.id);
                      return (
                        <button
                          key={ag.id}
                          onClick={() => {
                            setIsUploadDropdownOpen(false);
                            onOpenBulkImport(ag.id);
                          }}
                          className="w-full text-left p-2 rounded-xl hover:bg-slate-800 text-slate-200 flex items-center justify-between transition-colors group cursor-pointer border border-transparent hover:border-slate-700"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-300 flex items-center justify-center font-bold text-[9.5px] shrink-0 border border-blue-500/30">
                              {ag.name.slice(0, 1)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-white group-hover:text-red-400 transition-colors truncate">
                                {ag.name}
                              </div>
                              <div className="text-[9.5px] text-slate-400 flex items-center gap-1 flex-wrap truncate">
                                <span className="text-slate-300">{ag.branch}</span>
                                <span>•</span>
                                <span>{summary?.totalLeads || 0} Records</span>
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 shrink-0 ml-1">
                            Select →
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
          </div>

          {/* Delete Excel Feature - Exclusive to HQ Admin (Hidden from header banner as requested) */}
          {currentUser.role === 'HQ_ADMIN' && onOpenDeleteExcel && (
            <button
              id="btn-admin-delete-excel-main"
              type="button"
              onClick={() => onOpenDeleteExcel()}
              className="hidden"
              style={{ display: 'none' }}
              title="Delete existing customer Excel rosters or batches from frontend and Supabase"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="truncate">Delete Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Enterprise Executive KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 md:gap-3">
        {/* Total Leads Across All Excels (hidden on mobile view) */}
        <div className="hidden sm:flex bg-white rounded-xl sm:rounded-2xl p-4 sm:p-3.5 md:p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate">Total Leads</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
            {totalEnterpriseLeads}
          </div>
          <div className="text-[9px] sm:text-[10px] text-slate-500 truncate mt-0.5 sm:mt-1">
            Across {teamMembers.length} Agent Excels
          </div>
        </div>

        {/* Total Deduplicated Calls Made */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-3.5 md:p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-blue-700 truncate">Calls Made</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0">
              <PhoneCall className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-2xl lg:text-3xl font-black text-blue-600 tracking-tight mt-0.5">
            {totalEnterpriseCalled}
          </div>
          <div className="text-[9px] sm:text-[10px] text-blue-700 font-semibold truncate mt-0.5 sm:mt-1">
            {enterpriseProgressRate}% Calling Progress
          </div>
        </div>

        {/* Successful Conversions */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-3.5 md:p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-700 truncate">Total Success</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-2xl lg:text-3xl font-black text-emerald-600 tracking-tight mt-0.5">
            {totalEnterpriseSuccess}
          </div>
          <div className="text-[9px] sm:text-[10px] text-emerald-700 font-semibold truncate mt-0.5 sm:mt-1">
            {enterpriseConversionRate}% Conversion Rate
          </div>
        </div>

        {/* In-Progress Pipeline */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-3.5 md:p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-700 truncate">In-Progress</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-amber-100 text-amber-700 shrink-0">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-2xl lg:text-3xl font-black text-amber-600 tracking-tight mt-0.5">
            {totalEnterpriseInProgress}
          </div>
          <div className="text-[9px] sm:text-[10px] text-slate-500 truncate mt-0.5 sm:mt-1">
            Pending Follow-ups
          </div>
        </div>

        {/* Appointments Scheduled */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-3.5 md:p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-red-700 truncate">Appointments</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-red-100 text-red-700 shrink-0">
              <CalendarCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-2xl lg:text-3xl font-black text-red-600 tracking-tight mt-0.5">
            {totalEnterpriseAppointments}
          </div>
          <div className="text-[9px] sm:text-[10px] text-red-700 font-semibold truncate mt-0.5 sm:mt-1">
            Booked Callbacks
          </div>
        </div>

        {/* Remaining Uncalled */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-3.5 md:p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate">Uncalled Leads</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-slate-100 text-slate-500 shrink-0">
              <PhoneOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-2xl lg:text-3xl font-black text-slate-700 tracking-tight mt-0.5">
            {totalEnterpriseUncalled}
          </div>
          <div className="text-[9px] sm:text-[10px] text-slate-500 truncate mt-0.5 sm:mt-1">
            Queue Remaining
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Automated Summary Breakdown (Selector 3) */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-1 shadow-2xs overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-max p-0.5">
          {/* Tab 1: All Team Members' Excels */}
          <button
            id="admin-tab-team-excels"
            onClick={() => setActiveSection('teamExcels')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
              activeSection === 'teamExcels'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>Team Excels</span>
            <span className={`px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold ${
              activeSection === 'teamExcels' ? 'bg-red-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {teamMembers.length}
            </span>
          </button>

          {/* Tab 2: Regional Branches Summary */}
          <button
            id="admin-tab-regional-branches"
            onClick={() => setActiveSection('regionalBranches')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
              activeSection === 'regionalBranches'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>Branches</span>
            <span className={`px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold ${
              activeSection === 'regionalBranches' ? 'bg-red-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {branches.length}
            </span>
          </button>

          {/* Tab 3: Supervisors Oversight */}
          <button
            id="admin-tab-supervisors-oversight"
            onClick={() => setActiveSection('supervisors')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
              activeSection === 'supervisors'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>Supervisors</span>
            <span className={`px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold ${
              activeSection === 'supervisors' ? 'bg-red-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {supervisors.length}
            </span>
          </button>

          {/* Tab 4: All Scheduled Appointments */}
          <button
            id="admin-tab-appointments"
            onClick={() => setActiveSection('appointments')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
              activeSection === 'appointments'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CalendarCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>Appointments</span>
            <span className={`px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold ${
              activeSection === 'appointments' ? 'bg-red-800 text-white' : 'bg-red-100 text-red-700'
            }`}>
              {allAppointments.length}
            </span>
          </button>

          {/* Tab 5: Live Activity Logs */}
          <button
            id="admin-tab-activity-logs"
            onClick={() => setActiveSection('activityLogs')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
              activeSection === 'activityLogs'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>Audit Logs</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: ALL TEAM MEMBERS' EXCELS AUTO-SUMMARY         */}
      {/* ======================================================== */}
      {activeSection === 'teamExcels' && (
        <div className="space-y-4">
          {/* Filter / Search Bar for Team Excels Summary */}
          <div className="bg-white rounded-lg sm:rounded-2xl p-2 sm:p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-1.5 sm:gap-3 text-[10px] sm:text-xs">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-[180px] max-w-sm">
              <div className="relative w-full">
                <Search className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter team member or branch..."
                  className="w-full pl-6 sm:pl-8 pr-2.5 sm:pr-3 py-1 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-md sm:rounded-xl text-[10px] sm:text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="w-full sm:w-auto flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
              {/* Branch Filter Pill */}
              <div className="flex-1 sm:flex-initial min-w-0 flex items-center gap-1 bg-slate-50 border border-slate-200/90 rounded-md sm:rounded-xl px-2 py-1 text-slate-700 shadow-2xs">
                <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
                <label htmlFor="filter-team-branch-select" className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-tight shrink-0">
                  Branch:
                </label>
                <select
                  id="filter-team-branch-select"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="bg-transparent text-[10px] sm:text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full sm:w-auto truncate"
                >
                  <option value="ALL">All Branches ({branches.length})</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Supervisor Filter Pill */}
              <div className="flex-1 sm:flex-initial min-w-0 flex items-center gap-1 bg-slate-50 border border-slate-200/90 rounded-md sm:rounded-xl px-2 py-1 text-slate-700 shadow-2xs">
                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
                <label htmlFor="filter-team-supervisor-select" className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-tight shrink-0">
                  Supervisor:
                </label>
                <select
                  id="filter-team-supervisor-select"
                  value={selectedSupervisor}
                  onChange={(e) => setSelectedSupervisor(e.target.value)}
                  className="bg-transparent text-[10px] sm:text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full sm:w-auto truncate"
                >
                  <option value="ALL">All Supervisors ({supervisors.length})</option>
                  {supervisors.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.branch})</option>
                  ))}
                </select>
              </div>

              {(selectedBranch !== 'ALL' || selectedSupervisor !== 'ALL' || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedBranch('ALL');
                    setSelectedSupervisor('ALL');
                    setSearchQuery('');
                  }}
                  className="px-2 py-1 text-[10px] sm:text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md sm:rounded-xl transition-colors cursor-pointer shrink-0 ml-auto sm:ml-0"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Automated Team Excels Performance Table */}
          <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl shadow-xs overflow-hidden">
            <div className="px-2.5 sm:px-6 py-2 sm:py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between flex-wrap gap-1.5 sm:gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-[10px] sm:text-sm flex items-center gap-1.5 sm:gap-2">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
                  <span>All Team Members' Excels Performance Roll-Up</span>
                </h3>
                <p className="text-[8px] sm:text-xs text-slate-500 mt-0.5">
                  Automated metric synthesis calculated from each agent's individual customer calling Excel
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 bg-blue-50 text-blue-700 rounded-lg sm:rounded-xl border border-blue-200">
                {filteredTeamSummaries.length} Agent Excels Active
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[7.5px] sm:text-[9px] border-b border-slate-200">
                    <th className="py-1.5 sm:py-2 px-1.5 sm:px-3">Agent / Team Member</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2.5">BRANCH</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">LEADS</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">CALLS</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">Uncalled</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center text-emerald-700">Success</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center text-amber-700">In-Progress</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center text-slate-600">No Answer</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center text-rose-700">Rejected</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center text-red-700">Appointments</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">Conversion</th>
                    <th className="py-1.5 sm:py-2 px-1.5 sm:px-3 min-w-[110px] sm:min-w-[130px]">Excel Coverage</th>
                    <th className="py-1.5 sm:py-2 px-1.5 sm:px-3 text-center min-w-[190px] sm:min-w-[220px] whitespace-nowrap">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTeamSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-slate-400">
                        <AlertCircle className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                        No team member Excels match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTeamSummaries.map((s) => (
                      <tr key={s.agent.id} className="hover:bg-slate-50 transition-colors">
                        {/* Agent */}
                        <td className="py-2 sm:py-3 px-2 sm:px-4">
                          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 max-w-[220px]">
                            <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-100 text-blue-700 border border-blue-200/70 flex items-center justify-center font-extrabold text-[9px] sm:text-[10.5px] shrink-0 shadow-2xs">
                              {s.agentName.slice(0, 2).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-900 text-[10.5px] sm:text-xs truncate leading-tight">
                                {s.agentName}
                              </div>
                              <div className="text-[9px] sm:text-[10.5px] text-slate-400 truncate leading-tight mt-0.5">
                                {s.agent.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Branch */}
                        <td className="py-2 sm:py-3 px-1.5 sm:px-3">
                          <div className="inline-flex items-center gap-1 font-semibold text-slate-800 text-[9.5px] sm:text-xs bg-slate-100/80 px-1.5 sm:px-2 py-0.5 rounded-md border border-slate-200/60 whitespace-nowrap">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{s.branch}</span>
                          </div>
                        </td>

                        {/* Total Leads in Excel */}
                        <td className="py-2 sm:py-3 px-1 sm:px-3 text-center font-extrabold text-slate-900 text-[10px] sm:text-xs">
                          {s.totalLeads}
                        </td>

                        {/* Unique Calls Made */}
                        <td className="py-2 sm:py-3 px-1 sm:px-3 text-center">
                          <span className="font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 sm:px-2 rounded text-[10px] sm:text-xs">
                            {s.called}
                          </span>
                        </td>

                        {/* Uncalled */}
                        <td className="py-2 sm:py-3 px-1 sm:px-3 text-center font-semibold text-slate-500 text-[10px] sm:text-xs">
                          {s.uncalled}
                        </td>

                        {/* Success */}
                        <td className="py-2 sm:py-3 px-1 sm:px-3 text-center font-extrabold text-emerald-600 text-[10px] sm:text-xs">
                          {s.success}
                        </td>

                        {/* In-Progress */}
                        <td className="py-2 sm:py-3 px-1 sm:px-3 text-center font-semibold text-amber-600 text-[10px] sm:text-xs">
                          {s.inProgress}
                        </td>

                        {/* No Answer */}
                        <td className="py-2 sm:py-3 px-1 sm:px-3 text-center font-medium text-slate-500 text-[10px] sm:text-xs">
                          {s.notAvailable}
                        </td>

                        {/* Rejected */}
                        <td className="py-2 sm:py-3 px-1 sm:px-3 text-center font-medium text-rose-600 text-[10px] sm:text-xs">
                          {s.rejected}
                        </td>

                        {/* Appointments */}
                        <td className="py-2 sm:py-3 px-1 sm:px-3 text-center font-bold text-red-700 text-[10px] sm:text-xs">
                          {s.appointments > 0 ? (
                            <span className="bg-red-50 text-red-700 px-1 sm:px-1.5 py-0.5 rounded border border-red-200">
                              {s.appointments}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Conversion Rate */}
                        <td className="py-2 sm:py-3 px-1 sm:px-3 text-center">
                          <span className={`px-1.5 sm:px-2 py-0.5 rounded-xs text-[9.5px] sm:text-[11px] font-bold ${
                            s.conversion >= 30 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : s.conversion >= 15 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {s.conversion}%
                          </span>
                        </td>

                        {/* Excel Coverage Progress */}
                        <td className="py-2 sm:py-3 px-2 sm:px-4">
                          <div className="flex items-center justify-between text-[8.5px] sm:text-[10px] text-slate-600 mb-1">
                            <span>{s.called}/{s.totalLeads} Called</span>
                            <span className="font-bold">{s.progressPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1 sm:h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                s.progressPercent >= 80 ? 'bg-emerald-500' : s.progressPercent >= 40 ? 'bg-blue-600' : 'bg-amber-500'
                              }`} 
                              style={{ width: `${s.progressPercent}%` }}
                            />
                          </div>
                        </td>

                        {/* Action: Inspect, Set Target, and Delete Excel Roster */}
                        <td className="py-2 sm:py-3 px-1.5 sm:px-3 text-center whitespace-nowrap min-w-max">
                          <div className="flex flex-row items-center justify-center gap-1 sm:gap-1.5 flex-nowrap whitespace-nowrap">
                            <button
                              type="button"
                              id={`btn-inspect-agent-excel-${s.agent.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onInspectAgentExcel(s.agent);
                              }}
                              className="shrink-0 inline-flex flex-nowrap items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-md sm:rounded-lg transition-all border border-blue-200 hover:border-blue-600 font-semibold text-[9px] sm:text-xs shadow-2xs cursor-pointer active:scale-95 whitespace-nowrap"
                              title={`Inspect ${s.agentName}'s raw Excel records in audit drawer`}
                            >
                              <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 pointer-events-none shrink-0" />
                              <span className="pointer-events-none whitespace-nowrap">Inspect</span>
                            </button>

                            {currentUser.role === 'HQ_ADMIN' && onOpenSetAgentTarget && (
                              <button
                                type="button"
                                id={`btn-set-target-agent-${s.agent.id}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onOpenSetAgentTarget(s.agent);
                                }}
                                className="shrink-0 inline-flex flex-nowrap items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-amber-800 bg-amber-50 hover:bg-amber-500 hover:text-slate-950 rounded-md sm:rounded-lg transition-all border border-amber-200 hover:border-amber-400 font-bold text-[9px] sm:text-xs shadow-2xs cursor-pointer active:scale-95 whitespace-nowrap"
                                title={`Set weekly (${s.agent.weeklyTarget || 50}/wk) & monthly (${s.agent.monthlyTarget || 200}/mo) targets for ${s.agentName}`}
                              >
                                <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 pointer-events-none shrink-0" />
                                <span className="pointer-events-none whitespace-nowrap">Set Target</span>
                              </button>
                            )}

                            {currentUser.role === 'HQ_ADMIN' && onOpenDeleteExcel && (
                              <button
                                type="button"
                                id={`btn-delete-agent-excel-${s.agent.id}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onOpenDeleteExcel({
                                    type: 'agent',
                                    id: s.agent.id,
                                    name: `${s.agentName}'s Excel Roster`,
                                    recordCount: s.totalLeads,
                                    batchDetails: `${s.agent.branch} Branch`
                                  });
                                }}
                                className="shrink-0 inline-flex flex-nowrap items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-md sm:rounded-lg transition-all border border-rose-200 hover:border-rose-600 font-semibold text-[9px] sm:text-xs shadow-2xs cursor-pointer active:scale-95 whitespace-nowrap"
                                title={`Delete ${s.agentName}'s Excel records from frontend & Supabase database`}
                              >
                                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 pointer-events-none shrink-0" />
                                <span className="pointer-events-none whitespace-nowrap">Delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Summary Footer */}
            <div className="px-3 sm:px-6 py-2 sm:py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2 text-[9.5px] sm:text-xs text-slate-600">
              <div>
                Aggregated summary: <strong>{totalEnterpriseCalled}</strong> calls made across <strong>{teamMembers.length}</strong> agents from <strong>{totalEnterpriseLeads}</strong> total leads.
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500"></span>
                  Avg Conversion: {enterpriseConversionRate}%
                </span>
                <span className="flex items-center gap-1 text-red-700 font-semibold">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500"></span>
                  Total Callbacks: {totalEnterpriseAppointments}
                </span>
              </div>
            </div>
          </div>

          {/* Regional Outcome Distribution Visual Analytics */}
          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3 mb-3 sm:mb-4 pb-2.5 sm:pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 sm:gap-2">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
                  <span>
                    {chartAgentFilter !== 'ALL' 
                      ? 'Agent Call Outcome Analytics' 
                      : chartBranchFilter !== 'ALL' 
                        ? `${chartBranchFilter} Performance` 
                        : 'Call Outcome Visual Analytics'}
                  </span>
                </h4>
                <p className="text-[9px] sm:text-xs text-slate-500 mt-0.5">
                  {chartAgentFilter !== 'ALL'
                    ? `Detailed call outcomes for ${teamMembers.find(m => m.id === chartAgentFilter)?.name || 'selected agent'}`
                    : chartBranchFilter !== 'ALL'
                      ? `Comparing agents across ${chartBranchFilter}`
                      : 'Comparative performance breakdown across regional hubs & agents'}
                </p>
              </div>

              {/* Branch and Agent Filter Selectors */}
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap w-full sm:w-auto">
                {/* Branch Selector */}
                <div className="flex-1 sm:flex-initial min-w-0 flex items-center gap-1 bg-slate-50 border border-slate-200/90 rounded-md sm:rounded-lg px-1.5 py-0.5 sm:px-2 sm:py-1 text-[9px] sm:text-[10.5px] text-slate-700 shadow-2xs">
                  <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                  <label htmlFor="chart-filter-branch" className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-tight shrink-0">
                    Branch:
                  </label>
                  <select
                    id="chart-filter-branch"
                    value={chartBranchFilter}
                    onChange={(e) => {
                      const newBranch = e.target.value;
                      setChartBranchFilter(newBranch);
                      if (newBranch !== 'ALL' && chartAgentFilter !== 'ALL') {
                        const currentAgent = teamMembers.find(m => m.id === chartAgentFilter);
                        if (currentAgent && currentAgent.branch !== newBranch) {
                          setChartAgentFilter('ALL');
                        }
                      }
                    }}
                    className="bg-transparent text-[8.5px] sm:text-[10px] font-semibold text-slate-800 focus:outline-none cursor-pointer w-full sm:w-auto max-w-[110px] sm:max-w-none truncate"
                  >
                    <option value="ALL">All Branches ({branches.length})</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Agent Selector */}
                <div className="flex-1 sm:flex-initial min-w-0 flex items-center gap-1 bg-slate-50 border border-slate-200/90 rounded-md sm:rounded-lg px-1.5 py-0.5 sm:px-2 sm:py-1 text-[9px] sm:text-[10.5px] text-slate-700 shadow-2xs">
                  <Users className="w-3 h-3 text-slate-400 shrink-0" />
                  <label htmlFor="chart-filter-agent" className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-tight shrink-0">
                    Agent:
                  </label>
                  <select
                    id="chart-filter-agent"
                    value={chartAgentFilter}
                    onChange={(e) => {
                      const agentId = e.target.value;
                      setChartAgentFilter(agentId);
                      if (agentId !== 'ALL') {
                        const selectedAgent = teamMembers.find(m => m.id === agentId);
                        if (selectedAgent && chartBranchFilter !== 'ALL' && selectedAgent.branch !== chartBranchFilter) {
                          setChartBranchFilter(selectedAgent.branch);
                        }
                      }
                    }}
                    className="bg-transparent text-[8.5px] sm:text-[10px] font-semibold text-slate-800 focus:outline-none cursor-pointer w-full sm:w-auto max-w-[100px] sm:max-w-[140px] truncate"
                  >
                    <option value="ALL">All Agents ({availableChartAgents.length})</option>
                    {availableChartAgents.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                {/* Reset button */}
                {(chartBranchFilter !== 'ALL' || chartAgentFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setChartBranchFilter('ALL');
                      setChartAgentFilter('ALL');
                    }}
                    className="px-1.5 py-0.5 text-[8.5px] sm:text-[9.5px] font-bold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-md sm:rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Reset chart filters to show all regional hubs"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            <div className="h-44 sm:h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 8.5, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                  <YAxis tick={{ fontSize: 8.5, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '9px', padding: '4px 8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '8.5px', paddingTop: '4px' }} />
                  <Bar dataKey="Success" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="InProgress" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="NotAvailable" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Rejected" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: REGIONAL BRANCHES AUTO-SUMMARY                */}
      {/* ======================================================== */}
      {activeSection === 'regionalBranches' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl shadow-xs overflow-hidden">
            <div className="px-2.5 sm:px-6 py-2 sm:py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between flex-wrap gap-1.5 sm:gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-[10px] sm:text-sm flex items-center gap-1.5 sm:gap-2">
                  <Building2 className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
                  <span>Regional Branch Auto-Summary & Target Attainment</span>
                </h3>
                <p className="text-[8px] sm:text-xs text-slate-500 mt-0.5">
                  Roll-up metrics summarized across all branch team members
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center text-[9.5px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 bg-blue-50 text-blue-700 rounded-lg sm:rounded-xl border border-blue-200">
                {branches.length} Regional Hubs
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[7.5px] sm:text-[9px] border-b border-slate-200">
                    <th className="py-1.5 sm:py-2 px-1.5 sm:px-3">Branch / Region</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2.5">SUPERVISOR</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">AGENTS</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">Total Leads</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">Calls Made</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center text-emerald-700">Success</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center text-amber-700">In-Progress</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center text-red-700">Appointments</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">Conversion</th>
                    <th className="py-1.5 sm:py-2 px-1.5 sm:px-3 min-w-[110px] sm:min-w-[140px]">TARGET REACH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branchSummaries.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 sm:py-3.5 px-2 sm:px-4 font-bold text-slate-900 text-[10px] sm:text-xs">
                        <div>{b.name}</div>
                        <div className="text-[8.5px] sm:text-[10px] text-slate-500 font-normal">{b.region} Region</div>
                      </td>
                      <td className="py-2 sm:py-3.5 px-1.5 sm:px-3 text-[10px] sm:text-xs">
                        {b.supervisorName === 'Unassigned' ? (
                          <span className="text-slate-400 italic text-[9px] sm:text-[10px]">Unassigned</span>
                        ) : (
                          <span className="font-semibold text-slate-800">{b.supervisorName}</span>
                        )}
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-3 text-center">
                        <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[9.5px] sm:text-xs">
                          {b.agentCount} Agents
                        </span>
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-3 text-center font-extrabold text-slate-900 text-[10px] sm:text-xs">
                        {b.totalLeads}
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-3 text-center font-extrabold text-blue-600 text-[10px] sm:text-xs">
                        {b.called}
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-3 text-center font-extrabold text-emerald-600 text-[10px] sm:text-xs">
                        {b.success}
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-3 text-center font-semibold text-amber-600 text-[10px] sm:text-xs">
                        {b.inProgress}
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-3 text-center font-bold text-red-700 text-[10px] sm:text-xs">
                        {b.appointments}
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-3 text-center">
                        <span className="px-1.5 sm:px-2 py-0.5 rounded-xs text-[9.5px] sm:text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          {b.conversion}%
                        </span>
                      </td>
                      <td className="py-2 sm:py-3.5 px-2 sm:px-4 min-w-[210px]">
                        <div className="space-y-1.5">
                          {/* Monthly Target Progress */}
                          <div className="flex items-center justify-between text-[8.5px] sm:text-[10px] text-slate-700">
                            <span className="font-bold">
                              Monthly: {b.called} / {b.monthlyTarget}
                            </span>
                            <span className="font-extrabold text-blue-700">{b.monthlyTargetPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1 sm:h-1.5 overflow-hidden">
                            <div 
                              className="bg-blue-600 h-full rounded-full transition-all duration-300" 
                              style={{ width: `${b.monthlyTargetPercent}%` }}
                            />
                          </div>

                          {/* Weekly Target Sub-line */}
                          <div className="flex items-center justify-between text-[8px] sm:text-[9.5px] text-slate-500">
                            <span>Weekly: ~{Math.round(b.called / 4)} / {b.weeklyTarget}</span>
                            <span className="text-[7.5px] sm:text-[8.5px] font-medium text-slate-400">
                              ({b.baseWeeklyTargetPerAgent || 50}/wk × {Math.max(1, b.activeAgentCount)} agts)
                            </span>
                          </div>

                          {/* Set Target Button - Exclusive to HQ Admin */}
                          {currentUser.role === 'HQ_ADMIN' && onOpenSetBranchTarget && (
                            <div className="pt-1 flex items-center justify-end">
                              <button
                                type="button"
                                id={`btn-set-branch-target-${b.id}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onOpenSetBranchTarget(b);
                                }}
                                className="px-2 py-0.5 text-amber-800 bg-amber-50 hover:bg-amber-500 hover:text-slate-950 rounded border border-amber-200 hover:border-amber-400 flex items-center gap-1 font-bold text-[9px] sm:text-[10px] shadow-2xs cursor-pointer active:scale-95 transition-all"
                                title={`Set weekly & monthly targets for ${b.name} (${b.activeAgentCount} active agents)`}
                              >
                                <Target className="w-3 h-3 pointer-events-none" />
                                <span className="pointer-events-none">Set Target</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 3: SUPERVISORS OVERSIGHT AUTO-SUMMARY            */}
      {/* ======================================================== */}
      {activeSection === 'supervisors' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl shadow-xs overflow-hidden">
            <div className="px-2.5 sm:px-6 py-2 sm:py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between flex-wrap gap-1.5 sm:gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-[10px] sm:text-sm flex items-center gap-1.5 sm:gap-2">
                  <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
                  <span>Supervisors Team Oversight Summary</span>
                </h3>
                <p className="text-[8px] sm:text-xs text-slate-500 mt-0.5">
                  Summarized metrics of team members managed by each regional supervisor
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center text-[9.5px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 bg-blue-50 text-blue-700 rounded-lg sm:rounded-xl border border-blue-200">
                {supervisors.length} Supervisors Active
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[7.5px] sm:text-[9px] border-b border-slate-200">
                    <th className="py-1.5 sm:py-2 px-1.5 sm:px-3">Supervisor Name</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2.5">Assigned Branch</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">Team Members Supervised</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">ALL EXCEL LEADS</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">Team Calls Made</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center text-emerald-700">Team Conversions</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center text-red-700">Team Appointments</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">Branch Conversion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supervisorSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <UserCheck className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
                        <div className="font-semibold text-slate-600 text-xs">No Regional Supervisors Registered Yet</div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Create supervisor accounts via "Manage Users & Roles" to begin overseeing regional branch calling teams.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    supervisorSummaries.map((sup) => (
                    <tr key={sup.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 sm:py-3.5 px-2 sm:px-4">
                        <div className="font-bold text-slate-900 text-[10.5px] sm:text-xs flex items-center gap-1 sm:gap-1.5">
                          <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[8.5px] sm:text-[10px] shrink-0">
                            {sup.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="truncate">{sup.name}</span>
                        </div>
                        <div className="text-[9.5px] sm:text-[11px] text-slate-400 pl-6 sm:pl-7 truncate">{sup.email}</div>
                      </td>
                      <td className="py-2 sm:py-3.5 px-1.5 sm:px-3 font-semibold text-slate-800 text-[10px] sm:text-xs">
                        {sup.branch}
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-3 text-center font-bold text-slate-700">
                        <span className="bg-slate-100 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-xs text-slate-800 text-[9.5px] sm:text-xs">
                          {sup.agentCount} Agents
                        </span>
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-3 text-center font-extrabold text-slate-900 text-[10px] sm:text-xs">
                        {sup.totalLeads}
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-3 text-center font-extrabold text-blue-600 text-[10px] sm:text-xs">
                        {sup.called}
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-3 text-center font-extrabold text-emerald-600 text-[10px] sm:text-xs">
                        {sup.success}
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-3 text-center font-bold text-red-700 text-[10px] sm:text-xs">
                        {sup.appointments}
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-3 text-center">
                        <span className="px-1.5 sm:px-2.5 py-0.5 rounded-xs text-[9.5px] sm:text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          {sup.conversion}%
                        </span>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 4: ALL SCHEDULED APPOINTMENTS SUMMARY            */}
      {/* ======================================================== */}
      {activeSection === 'appointments' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl shadow-xs overflow-hidden">
            <div className="px-2.5 sm:px-6 py-2 sm:py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between flex-wrap gap-1.5 sm:gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-[10px] sm:text-sm flex items-center gap-1.5 sm:gap-2">
                  <CalendarCheck className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 shrink-0" />
                  <span>Upcoming Follow-up & Callback Appointments (All Teams)</span>
                </h3>
                <p className="text-[8px] sm:text-xs text-slate-500 mt-0.5">
                  Scheduled customer callbacks booked across all team members' Excels
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center text-[9.5px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 bg-red-50 text-red-700 rounded-lg sm:rounded-xl border border-red-200">
                {allAppointments.length} Booked Callbacks
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[7.5px] sm:text-[9px] border-b border-slate-200">
                    <th className="py-1.5 sm:py-2 px-1.5 sm:px-3">Customer Name</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2.5">Phone</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2.5">Area / Branch</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2.5">Scheduled Time</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2.5">Assigned Agent</th>
                    <th className="py-1.5 sm:py-2 px-1 sm:px-2.5">Feedback / Objective</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <AlertCircle className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                        No upcoming appointments currently scheduled.
                      </td>
                    </tr>
                  ) : (
                    allAppointments.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 sm:py-3 px-2 sm:px-4 font-bold text-slate-900 text-[10px] sm:text-xs">
                          {app.customerName}
                        </td>
                        <td className="py-2 sm:py-3 px-1.5 sm:px-3 font-mono text-slate-700 text-[10px] sm:text-xs">
                          {app.phoneNumber}
                        </td>
                        <td className="py-2 sm:py-3 px-1.5 sm:px-3 text-slate-600 text-[10px] sm:text-xs">
                          {app.areaOfReg}
                        </td>
                        <td className="py-2 sm:py-3 px-1.5 sm:px-3">
                          <span className="bg-red-100 text-red-800 font-bold px-1.5 sm:px-2 py-0.5 rounded border border-red-200 text-[9.5px] sm:text-xs">
                            {app.appointment.replace('T', ' ')}
                          </span>
                        </td>
                        <td className="py-2 sm:py-3 px-1.5 sm:px-3 font-medium text-slate-800 text-[10px] sm:text-xs">
                          {app.assignedAgentName}
                        </td>
                        <td className="py-2 sm:py-3 px-1.5 sm:px-3 text-slate-600 max-w-sm truncate text-[10px] sm:text-xs" title={app.feedbackNote}>
                          {app.feedbackNote || <span className="text-slate-400 italic">Callback requested</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 5: LIVE ACTIVITY & AUDIT TELEMETRY               */}
      {/* ======================================================== */}
      {activeSection === 'activityLogs' && (
        <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl shadow-xs overflow-hidden">
          <div className="px-2.5 sm:px-6 py-2 sm:py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between flex-wrap gap-1.5 sm:gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-[10px] sm:text-sm flex items-center gap-1.5 sm:gap-2">
                <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
                <span>Live Calling Audit Telemetry</span>
              </h3>
              <p className="text-[8px] sm:text-xs text-slate-500 mt-0.5">
                Real-time log of call disposition changes, notes, and callbacks across all team members
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center text-[9.5px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 bg-slate-100 text-slate-700 rounded-lg sm:rounded-xl">
              {activityLogs.length} Events Recorded
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {activityLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-[10px] sm:text-xs">
                No activity logs recorded yet.
              </div>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="p-2.5 sm:p-4 hover:bg-slate-50 flex items-center justify-between gap-2 sm:gap-3 text-[10px] sm:text-xs">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-[8.5px] sm:text-[10px] shrink-0">
                      {log.userName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-[10.5px] sm:text-xs">
                        {log.userName}{' '}
                        <span className="text-slate-400 font-normal">({log.userRole})</span>
                      </div>
                      <div className="text-slate-600 mt-0.5 text-[9.5px] sm:text-xs">
                        Target: <strong className="text-slate-800">{log.customerName}</strong> • {log.details}
                      </div>
                    </div>
                  </div>
                  <div className="text-[9px] sm:text-[11px] font-mono text-slate-400 shrink-0">
                    {log.timestamp}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
