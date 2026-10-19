import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Users, 
  Target, 
  CheckCircle2, 
  Clock, 
  PhoneOff, 
  XCircle,
  CalendarCheck,
  TrendingUp,
  FileSpreadsheet,
  Download,
  UserPlus,
  Eye,
  Search,
  Activity,
  AlertCircle,
  PhoneCall,
  Calendar,
  Sparkles,
  RefreshCw,
  UploadCloud,
  ChevronDown,
  X,
  UserCheck,
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
import { User, CustomerRecord, ActivityLog, CallStatus, isRecordAssignedBySupervisor } from '../types';
import { exportTeamSummaryToExcel, TeamMemberSummaryRow } from '../utils/exportEngine';
import { MarkAsCalledModal } from './MarkAsCalledModal';
import { AppointmentsListTable } from './AppointmentsListTable';

interface SupervisorDashboardProps {
  currentUser: User;
  teamMembers: User[];
  records: CustomerRecord[];
  activityLogs: ActivityLog[];
  onInspectAgentExcel: (agent: User) => void;
  onAddTeamMember: () => void;
  onOpenBulkImport: (targetAgentId?: string) => void;
  onRefreshData?: () => void;
  onUpdateRecord?: (updatedRecord: CustomerRecord, changeDetails: string) => void;
  onOpenAiIntelligence?: () => void;
}

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  currentUser,
  teamMembers,
  records,
  activityLogs,
  onInspectAgentExcel,
  onAddTeamMember,
  onOpenBulkImport,
  onRefreshData,
  onUpdateRecord,
  onOpenAiIntelligence
}) => {
  const [activeTab, setActiveTab] = useState<'teamSummary' | 'teamAppointments' | 'teamActivity'>('teamSummary');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState(false);
  const [agentFilterQuery, setAgentFilterQuery] = useState('');
  const uploadDropdownRef = useRef<HTMLDivElement>(null);

  // Reassign appointment modal state
  const [reassignModalRecord, setReassignModalRecord] = useState<CustomerRecord | null>(null);
  const [selectedTargetAgentId, setSelectedTargetAgentId] = useState<string>('');
  const [reassignNote, setReassignNote] = useState<string>('');

  // Appointments subtab & Mark As Called state
  const [appointmentSubTab, setAppointmentSubTab] = useState<'upcoming' | 'previous'>('upcoming');
  const [markAsCalledRecord, setMarkAsCalledRecord] = useState<CustomerRecord | null>(null);

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

  const handleTriggerRefresh = () => {
    setIsRefreshing(true);
    if (onRefreshData) {
      onRefreshData();
    }
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // 1. Filter team members created under this supervisor (matching supervisorId or branch)
  const supervisedAgents = useMemo(() => {
    return teamMembers.filter(
      tm => tm.supervisorId === currentUser.id || tm.branch === currentUser.branch
    );
  }, [teamMembers, currentUser]);

  // Filtered agents for upload assignment dropdown
  const filteredAgentsForUpload = useMemo(() => {
    if (!agentFilterQuery.trim()) return supervisedAgents;
    const q = agentFilterQuery.toLowerCase();
    return supervisedAgents.filter(
      a => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || (a.phone && a.phone.includes(q))
    );
  }, [supervisedAgents, agentFilterQuery]);

  // 2. Compute automated summary for each team member's Excel (strictly raw Excel calling rosters)
  const agentSummaries = useMemo(() => {
    return supervisedAgents.map(agent => {
      const agentRecords = records.filter(r => 
        (r.assignedAgentId === agent.id || (r.assignedAgentName && r.assignedAgentName.trim().toLowerCase() === agent.name.trim().toLowerCase())) &&
        !isRecordAssignedBySupervisor(r)
      );
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

      return {
        agent,
        agentName: agent.name,
        branch: agent.branch,
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
  }, [supervisedAgents, records]);

  // Active supervised Excels (agents with uploaded Excel containing records)
  const activeSupervisedExcelsCount = useMemo(() => {
    return agentSummaries.filter(s => s.totalLeads > 0).length;
  }, [agentSummaries]);

  // Filtered agent summaries
  const filteredAgentSummaries = useMemo(() => {
    return agentSummaries.filter(s => {
      const q = searchQuery.toLowerCase();
      return !q || s.agentName.toLowerCase().includes(q) || s.agent.email.toLowerCase().includes(q);
    });
  }, [agentSummaries, searchQuery]);

  // 3. Roll-up metrics across all supervised team members' Excels
  const supervisedAgentIds = useMemo(() => new Set(supervisedAgents.map(a => a.id)), [supervisedAgents]);
  
  const teamRecords = useMemo(() => {
    const seen = new Set<string>();
    const list: CustomerRecord[] = [];
    for (const r of records) {
      if (!r || !r.id || seen.has(r.id)) continue;
      if (supervisedAgentIds.has(r.assignedAgentId) || r.supervisorId === currentUser.id) {
        seen.add(r.id);
        list.push(r);
      }
    }
    return list;
  }, [records, supervisedAgentIds, currentUser.id]);

  const totalTeamLeads = teamRecords.length;
  const totalTeamCalled = teamRecords.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;
  const totalTeamUncalled = teamRecords.filter(r => !r.hasBeenCalled && (!r.status || r.status === 'Uncalled')).length;
  const totalTeamSuccess = teamRecords.filter(r => r.status === 'Success').length;
  const totalTeamInProgress = teamRecords.filter(r => r.status === 'In-progress').length;
  const totalTeamNotAvailable = teamRecords.filter(r => r.status === 'Not Available').length;
  const totalTeamRejected = teamRecords.filter(r => r.status === 'Rejected').length;
  
  // Team appointments (includes all scheduled callbacks and supervisor-assigned appointments not completed)
  const teamAppointments = useMemo(() => {
    return teamRecords
      .filter(r => ((r.appointment && r.appointment.trim() !== '') || isRecordAssignedBySupervisor(r)) && !r.appointmentCompleted)
      .sort((a, b) => ((a.appointment || '') > (b.appointment || '') ? 1 : -1));
  }, [teamRecords]);

  // Previous appointments for supervisor's team
  const previousTeamAppointments = useMemo(() => {
    return teamRecords
      .filter(r => r.appointmentCompleted === true)
      .sort((a, b) => {
        const aDate = a.appointmentCompletedAt || a.callDate || '';
        const bDate = b.appointmentCompletedAt || b.callDate || '';
        return bDate.localeCompare(aDate);
      });
  }, [teamRecords]);

  const teamConversionRate = totalTeamCalled > 0 
    ? Math.round((totalTeamSuccess / totalTeamCalled) * 100) 
    : 0;
  const teamCoverageRate = totalTeamLeads > 0 
    ? Math.round((totalTeamCalled / totalTeamLeads) * 100) 
    : 0;

  // Filter activity logs of this supervisor's agents
  const teamLogs = useMemo(() => {
    return activityLogs.filter(log => {
      return supervisedAgentIds.has(log.userId) || log.userId === currentUser.id;
    });
  }, [activityLogs, supervisedAgentIds, currentUser.id]);

  // Chart data comparing supervised agents
  const agentChartData = agentSummaries.map(s => ({
    name: s.agentName.split(' ')[0],
    Success: s.success,
    InProgress: s.inProgress,
    NotAvailable: s.notAvailable,
    Rejected: s.rejected
  }));

  // Export summary
  const handleExportTeamSummary = () => {
    const rows: TeamMemberSummaryRow[] = agentSummaries.map(s => ({
      agentName: s.agentName,
      branch: s.branch,
      supervisorName: currentUser.name,
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

    exportTeamSummaryToExcel(rows, `Team_Summary_${currentUser.branch.replace(/\s+/g, '_')}`);
  };

  return (
    <div className="space-y-5">
      {/* Supervisor Branch Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white rounded-lg sm:rounded-2xl p-2.5 sm:p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 sm:gap-4">
        <div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <span className="hidden sm:inline-flex px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-xs text-[7.5px] sm:text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Branch Supervisor Control Terminal
            </span>
            <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-xs text-[7.5px] sm:text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {currentUser.branch} Hub
            </span>
          </div>
          <h2 className="text-xs sm:text-xl md:text-2xl font-black tracking-tight text-white mt-1 sm:mt-1.5 flex items-center gap-1 sm:gap-2">
            <span>{currentUser.name} - Team Performance Summary</span>
          </h2>
          <p className="text-[8.5px] sm:text-xs text-slate-300 max-w-2xl mt-0.5 sm:mt-1 leading-normal sm:leading-relaxed">
            Auto-summarising real-time calling analytics aggregated from the customer Excels of <strong>{activeSupervisedExcelsCount} active team member Excels</strong> ({supervisedAgents.length} supervised agents).
          </p>
        </div>

        {/* Selected target element: Supervisor Action Buttons container */}
        <div 
          id="supervisor-banner-action-buttons" 
          className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t border-slate-800/80 md:border-t-0"
        >
          {/* Upload File with Agent Selection Dropdown */}
          <div ref={uploadDropdownRef} className="relative flex-1 sm:flex-initial min-w-0">
            <button
              id="btn-supervisor-upload-file"
              onClick={() => setIsUploadDropdownOpen(!isUploadDropdownOpen)}
              className={`w-full sm:w-auto flex items-center justify-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-2 text-[9px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 ${
                isUploadDropdownOpen
                  ? 'bg-emerald-500 ring-2 ring-emerald-400 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
              title="Upload customer Excel file and select agent to assign"
              aria-haspopup="true"
              aria-expanded={isUploadDropdownOpen}
            >
              <UploadCloud className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Upload File</span>
              <ChevronDown className={`w-3 h-3 text-emerald-200 transition-transform duration-200 shrink-0 ${isUploadDropdownOpen ? 'rotate-180 text-white' : ''}`} />
            </button>

            {/* Dropdown Popover / Mobile Overlay Modal */}
            {isUploadDropdownOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-0 bg-slate-950/75 sm:bg-transparent backdrop-blur-xs sm:backdrop-blur-none sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2">
                <div
                  id="dropdown-supervisor-upload-agent"
                  className="w-full max-w-[340px] sm:w-80 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-3.5 sm:p-3 text-xs animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
                >
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-bold text-white text-xs truncate">Assign Upload to Agent</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {supervisedAgents.length} Agents
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
                  Select an agent under your supervision to upload and assign customer Excel records.
                </p>

                {/* Agent Search Filter */}
                {supervisedAgents.length > 2 && (
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="input-supervisor-filter-agents"
                      type="text"
                      autoFocus
                      value={agentFilterQuery}
                      onChange={(e) => setAgentFilterQuery(e.target.value)}
                      placeholder="Search agent by name..."
                      className="w-full pl-8 pr-7 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
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

                {/* General / Team Shared Upload Option */}
                <button
                  id="btn-supervisor-import-general"
                  onClick={() => {
                    setIsUploadDropdownOpen(false);
                    onOpenBulkImport('');
                  }}
                  className="w-full text-left p-2 rounded-xl hover:bg-slate-800 text-slate-200 flex items-center justify-between transition-colors border border-dashed border-slate-700/80 mb-2.5 group cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                      <UploadCloud className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-white group-hover:text-emerald-400 transition-colors truncate">
                        General / Unassigned Upload
                      </div>
                      <div className="text-[9.5px] text-slate-400 truncate">Upload to branch pool without designating an agent</div>
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded shrink-0 ml-1 font-semibold">All</span>
                </button>

                {/* Section Header */}
                <div className="text-[9.5px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
                  <span>Designated Team Members</span>
                  <span>Click to Upload</span>
                </div>

                {/* Agents List */}
                <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
                  {filteredAgentsForUpload.length === 0 ? (
                    <div className="py-4 text-center text-slate-400 text-xs">
                      {supervisedAgents.length === 0
                        ? "No agents under your supervision yet. Click 'Add Member' first."
                        : "No matching agents found."}
                    </div>
                  ) : (
                    filteredAgentsForUpload.map((ag) => {
                      const summary = agentSummaries.find(s => s.agent.id === ag.id);
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
                            <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-[9.5px] shrink-0 border border-blue-500/30">
                              {ag.name.slice(0, 2).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors truncate">
                                {ag.name}
                              </div>
                              <div className="text-[9.5px] text-slate-400 truncate">
                                {summary ? `${summary.totalLeads} current leads` : ag.email}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0 ml-1">
                            Upload
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

          {/* Add Member Button */}
          <button
            id="btn-supervisor-add-member"
            onClick={onAddTeamMember}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-2 bg-blue-600 hover:bg-blue-500 text-white text-[9px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
            title="Create a new team member under your branch"
          >
            <UserPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Add Member</span>
          </button>

          {/* AI Intelligence & Feedback Analytics Button */}
          {onOpenAiIntelligence && (
            <button
              id="btn-supervisor-ai-intelligence"
              onClick={onOpenAiIntelligence}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-2 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-[9px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all border border-red-500/50 shadow-xs cursor-pointer active:scale-95"
              title="Launch AI Intelligence & Feedback Analytics (Somali Language & PDF Report)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse shrink-0" />
              <span className="truncate">AI Intelligence</span>
            </button>
          )}
        </div>
      </div>

      {/* Supervisor Team KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2.5 md:gap-3">
        {/* Total Leads in Team Excels (hidden on mobile view) */}
        <div className="hidden sm:flex bg-white rounded-lg sm:rounded-2xl p-1.5 sm:p-3 md:p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-0.5 sm:mb-1">
            <span className="text-[7.5px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate">Team Leads</span>
            <div className="p-0.5 sm:p-1.5 rounded-xs sm:rounded-lg bg-blue-50 text-blue-600 shrink-0">
              <Users className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="text-sm sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
            {totalTeamLeads}
          </div>
          <div className="text-[7px] sm:text-[10px] text-slate-500 truncate mt-0.5 sm:mt-1">
            {activeSupervisedExcelsCount} Active Excel{activeSupervisedExcelsCount === 1 ? '' : 's'} ({supervisedAgents.length} Supervised)
          </div>
        </div>

        {/* Unique Calls Made by Team */}
        <div className="bg-white rounded-lg sm:rounded-2xl p-1.5 sm:p-3 md:p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-0.5 sm:mb-1">
            <span className="text-[7.5px] sm:text-[10px] font-bold uppercase tracking-wider text-blue-700 truncate">Team Calls</span>
            <div className="p-0.5 sm:p-1.5 rounded-xs sm:rounded-lg bg-blue-100 text-blue-700 shrink-0">
              <PhoneCall className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="text-sm sm:text-2xl lg:text-3xl font-black text-blue-600 tracking-tight mt-0.5">
            {totalTeamCalled}
          </div>
          <div className="text-[7px] sm:text-[10px] text-blue-700 font-semibold truncate mt-0.5 sm:mt-1">
            {teamCoverageRate}% Calling Progress
          </div>
        </div>

        {/* Successful Conversions */}
        <div className="bg-white rounded-lg sm:rounded-2xl p-1.5 sm:p-3 md:p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-0.5 sm:mb-1">
            <span className="text-[7.5px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-700 truncate">Conversions</span>
            <div className="p-0.5 sm:p-1.5 rounded-xs sm:rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
              <CheckCircle2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="text-sm sm:text-2xl lg:text-3xl font-black text-emerald-600 tracking-tight mt-0.5">
            {totalTeamSuccess}
          </div>
          <div className="text-[7px] sm:text-[10px] text-emerald-700 font-semibold truncate mt-0.5 sm:mt-1">
            {teamConversionRate}% Team Conv.
          </div>
        </div>

        {/* In-Progress Pipeline */}
        <div className="bg-white rounded-lg sm:rounded-2xl p-1.5 sm:p-3 md:p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-0.5 sm:mb-1">
            <span className="text-[7.5px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-700 truncate">In-Progress</span>
            <div className="p-0.5 sm:p-1.5 rounded-xs sm:rounded-lg bg-amber-100 text-amber-700 shrink-0">
              <Clock className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="text-sm sm:text-2xl lg:text-3xl font-black text-amber-600 tracking-tight mt-0.5">
            {totalTeamInProgress}
          </div>
          <div className="text-[7px] sm:text-[10px] text-slate-500 truncate mt-0.5 sm:mt-1">
            Pending Follow-ups
          </div>
        </div>

        {/* Team Appointments */}
        <div className="bg-white rounded-lg sm:rounded-2xl p-1.5 sm:p-3 md:p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-0.5 sm:mb-1">
            <span className="text-[7.5px] sm:text-[10px] font-bold uppercase tracking-wider text-red-700 truncate">Callbacks</span>
            <div className="p-0.5 sm:p-1.5 rounded-xs sm:rounded-lg bg-red-100 text-red-700 shrink-0">
              <CalendarCheck className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="text-sm sm:text-2xl lg:text-3xl font-black text-red-600 tracking-tight mt-0.5">
            {teamAppointments.length}
          </div>
          <div className="text-[7px] sm:text-[10px] text-red-700 font-semibold truncate mt-0.5 sm:mt-1">
            Booked Callbacks
          </div>
        </div>

        {/* Uncalled Leads in Team Excels */}
        <div className="bg-white rounded-lg sm:rounded-2xl p-1.5 sm:p-3 md:p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-0.5 sm:mb-1">
            <span className="text-[7.5px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate">Uncalled Leads</span>
            <div className="p-0.5 sm:p-1.5 rounded-xs sm:rounded-lg bg-slate-100 text-slate-500 shrink-0">
              <PhoneOff className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="text-sm sm:text-2xl lg:text-3xl font-black text-slate-700 tracking-tight mt-0.5">
            {totalTeamUncalled}
          </div>
          <div className="text-[7px] sm:text-[10px] text-slate-500 truncate mt-0.5 sm:mt-1">
            Queue Remaining
          </div>
        </div>
      </div>

      {/* Supervisor Navigation Tabs */}
      <div className="bg-white border border-slate-200/90 rounded-lg sm:rounded-2xl p-1 sm:p-1.5 shadow-xs overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-max">
          {/* Tab 1: Team Members' Excels Summary */}
          <button
            id="sup-tab-team-summary"
            onClick={() => setActiveTab('teamSummary')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3.5 sm:py-2 rounded-md sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'teamSummary'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Team Members</span>
            <span className={`px-1 sm:px-1.5 py-0.2 rounded-xs text-[8.5px] sm:text-[10px] font-semibold ${
              activeTab === 'teamSummary' ? 'bg-red-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {supervisedAgents.length}
            </span>
          </button>

          {/* Tab 2: Team Scheduled Appointments */}
          <button
            id="sup-tab-team-appointments"
            onClick={() => setActiveTab('teamAppointments')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3.5 sm:py-2 rounded-md sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'teamAppointments'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CalendarCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Callbacks</span>
            <span className={`px-1 sm:px-1.5 py-0.2 rounded-xs text-[8.5px] sm:text-[10px] font-semibold ${
              activeTab === 'teamAppointments' ? 'bg-red-800 text-white' : 'bg-red-100 text-red-700'
            }`}>
              {teamAppointments.length}
            </span>
          </button>

          {/* Tab 3: Team Activity Logs */}
          <button
            id="sup-tab-team-activity"
            onClick={() => setActiveTab('teamActivity')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3.5 sm:py-2 rounded-md sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'teamActivity'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Activity Stream</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: TEAM MEMBERS' EXCELS AUTO-SUMMARY             */}
      {/* ======================================================== */}
      {activeTab === 'teamSummary' && (
        <div className="space-y-3 sm:space-y-4">
          {/* Search bar */}
          <div className="flex bg-white rounded-lg sm:rounded-2xl p-2 sm:p-3.5 border border-slate-200 shadow-xs flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-3 text-[10px] sm:text-xs">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 max-w-sm">
              <div className="relative w-full">
                <Search className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter team member by name..."
                  className="w-full pl-6 sm:pl-8 pr-2.5 sm:pr-3 py-1 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-md sm:rounded-xl text-[10px] sm:text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="text-[9px] sm:text-xs text-slate-500 text-right sm:text-left">
              Showing <strong>{filteredAgentSummaries.length}</strong> team members under supervision
            </div>
          </div>

          {/* Automated Team Performance Roll-Up Table */}
          <div className="bg-white border border-slate-200/90 rounded-md shadow-xs overflow-hidden">
            <div className="px-2 sm:px-5 py-1.5 sm:py-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-1.5 sm:gap-3 flex-wrap">
              <div>
                <h3 className="font-bold text-slate-900 text-[10px] sm:text-xs md:text-sm flex items-center gap-1 sm:gap-1.5">
                  <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 shrink-0" />
                  <span>Team Members' Excels Performance Roll-Up</span>
                </h3>
                <p className="text-[8px] sm:text-[10px] md:text-[11px] text-slate-500 mt-0.5 leading-tight">
                  Automated metric synthesis summarizing each team member's customer Excel list
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-xs border border-blue-200 shrink-0">
                {supervisedAgents.length} Team Members
              </span>
            </div>

            <div className="overflow-x-auto select-auto">
              <table className="w-full text-left font-table-data text-[9.5px] sm:text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-tight text-[7.5px] sm:text-[8.5px] border-b border-slate-200">
                    <th id="th-team-member" className="py-1 sm:py-1.5 px-2 sm:px-3 whitespace-nowrap">Team Member</th>
                    <th id="th-total-leads" className="py-1 sm:py-1.5 px-1.5 sm:px-2 text-center whitespace-nowrap font-bold text-slate-700" title="Total Leads in Excel">TOTAL LEADS</th>
                    <th id="th-calls-made" className="py-1 sm:py-1.5 px-1.5 sm:px-2 text-center whitespace-nowrap font-bold text-blue-900">Calls Made</th>
                    <th id="th-uncalled" className="py-1 sm:py-1.5 px-1.5 sm:px-2 text-center whitespace-nowrap">Uncalled</th>
                    <th id="th-success" className="py-1 sm:py-1.5 px-1.5 sm:px-2 text-center text-emerald-700 whitespace-nowrap">Success</th>
                    <th id="th-in-progress" className="py-1 sm:py-1.5 px-1.5 sm:px-2 text-center text-amber-700 whitespace-nowrap">In-Progress</th>
                    <th id="th-no-answer" className="py-1 sm:py-1.5 px-1.5 sm:px-2 text-center text-slate-600 whitespace-nowrap">No Answer</th>
                    <th id="th-rejected" className="py-1 sm:py-1.5 px-1.5 sm:px-2 text-center text-rose-700 whitespace-nowrap">Rejected</th>
                    <th id="th-appts" className="py-1 sm:py-1.5 px-1.5 sm:px-2 text-center text-red-700 whitespace-nowrap">Appts</th>
                    <th id="th-conversion" className="py-1 sm:py-1.5 px-1.5 sm:px-2 text-center whitespace-nowrap">Conv %</th>
                    <th id="th-coverage" className="py-1 sm:py-1.5 px-2 sm:px-3 min-w-[100px] sm:min-w-[120px] whitespace-nowrap">Excel Coverage</th>
                    <th id="th-audit" className="py-1 sm:py-1.5 px-1.5 sm:px-2 text-center whitespace-nowrap">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAgentSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-slate-400 text-[10px] sm:text-xs">
                        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-slate-300" />
                        No team members found under your branch.
                      </td>
                    </tr>
                  ) : (
                    filteredAgentSummaries.map((s) => (
                      <tr key={s.agent.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-1 sm:py-2 px-2 sm:px-3">
                          <div className="font-bold text-slate-900 text-[9.5px] sm:text-xs flex items-center gap-1 sm:gap-1.5 leading-tight">
                            <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[7.5px] sm:text-[9px] shrink-0">
                              {s.agentName.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="truncate max-w-[110px] sm:max-w-[140px]">{s.agentName}</span>
                          </div>
                          <div className="text-[8px] sm:text-[10px] text-slate-400 pl-5 sm:pl-6.5 truncate max-w-[120px] sm:max-w-[150px]">{s.agent.email}</div>
                        </td>

                        <td className="py-1 sm:py-2 px-1.5 sm:px-2 text-center font-bold text-slate-800 text-[9.5px] sm:text-xs">
                          {s.totalLeads}
                        </td>

                        <td className="py-1 sm:py-2 px-1.5 sm:px-2 text-center">
                          <span className="font-bold text-blue-700 bg-blue-50 px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-xs text-[9px] sm:text-[11px] border border-blue-100/70">
                            {s.called}
                          </span>
                        </td>

                        <td className="py-1 sm:py-2 px-1.5 sm:px-2 text-center font-medium text-slate-500 text-[9px] sm:text-[11px]">
                          {s.uncalled}
                        </td>

                        <td className="py-1 sm:py-2 px-1.5 sm:px-2 text-center font-bold text-emerald-600 text-[9px] sm:text-[11px]">
                          {s.success}
                        </td>

                        <td className="py-1 sm:py-2 px-1.5 sm:px-2 text-center font-medium text-amber-600 text-[9px] sm:text-[11px]">
                          {s.inProgress}
                        </td>

                        <td className="py-1 sm:py-2 px-1.5 sm:px-2 text-center font-medium text-slate-500 text-[9px] sm:text-[11px]">
                          {s.notAvailable}
                        </td>

                        <td className="py-1 sm:py-2 px-1.5 sm:px-2 text-center font-medium text-rose-600 text-[9px] sm:text-[11px]">
                          {s.rejected}
                        </td>

                        <td className="py-1 sm:py-2 px-1.5 sm:px-2 text-center font-bold text-red-700 text-[9px] sm:text-[11px]">
                          {s.appointments > 0 ? (
                            <span className="bg-red-50 text-red-700 px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-xs border border-red-200 text-[8px] sm:text-[10px]">
                              {s.appointments}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        <td className="py-1 sm:py-2 px-1.5 sm:px-2 text-center">
                          <span className={`px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-xs text-[8.5px] sm:text-[10px] font-bold ${
                            s.conversion >= 30 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : s.conversion >= 15 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {s.conversion}%
                          </span>
                        </td>

                        <td className="py-1 sm:py-2 px-2 sm:px-3">
                          <div className="flex items-center justify-between text-[7.5px] sm:text-[9px] text-slate-600 mb-0.5">
                            <span>{s.called}/{s.totalLeads}</span>
                            <span className="font-bold">{s.progressPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                s.progressPercent >= 80 ? 'bg-emerald-500' : s.progressPercent >= 40 ? 'bg-blue-600' : 'bg-amber-500'
                              }`} 
                              style={{ width: `${s.progressPercent}%` }}
                            />
                          </div>
                        </td>

                        <td className="py-1 sm:py-2 px-1.5 sm:px-2 text-center">
                          <button
                            type="button"
                            id={`btn-inspect-agent-excel-${s.agent.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onInspectAgentExcel(s.agent);
                            }}
                            className="px-1 py-0.5 sm:px-2 sm:py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xs sm:rounded border border-slate-200 hover:border-blue-300 flex items-center gap-0.5 sm:gap-1 mx-auto text-[8.5px] sm:text-[10px] font-medium transition-colors cursor-pointer"
                            title={`Inspect ${s.agentName}'s raw Excel records in audit drawer`}
                          >
                            <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3 pointer-events-none" />
                            <span className="pointer-events-none">Inspect</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-3 sm:px-5 py-1.5 sm:py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 text-[9px] sm:text-[11px] text-slate-600">
              <div>
                Aggregated for {currentUser.branch}: <strong>{totalTeamCalled}</strong> calls made across <strong>{supervisedAgents.length}</strong> team members.
              </div>
              <div className="font-bold text-emerald-700 text-[9.5px] sm:text-[11px]">
                Team Conversion Rate: {teamConversionRate}%
              </div>
            </div>
          </div>

          {/* Team Members Calling Comparison Chart */}
          {agentChartData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg sm:rounded-2xl p-2 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between mb-1.5 sm:mb-4">
                <div>
                  <h4 className="text-[8.5px] sm:text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1 sm:gap-2">
                    <TrendingUp className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
                    <span>Team Members Calling Outcome Comparison</span>
                  </h4>
                  <p className="text-[7.5px] sm:text-xs text-slate-500 mt-0.5 leading-tight">
                    Visual comparison of call outcomes across your team members
                  </p>
                </div>
              </div>
              <div className="h-36 sm:h-56 w-full mr-[18px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agentChartData} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 7.5, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                    <YAxis tick={{ fontSize: 7.5, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '6px', fontSize: '8px', padding: '3px 6px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '7.5px', paddingTop: '2px' }} />
                    <Bar dataKey="Success" fill="#10b981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="InProgress" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="NotAvailable" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Rejected" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: TEAM SCHEDULED APPOINTMENTS                   */}
      {/* ======================================================== */}
      {activeTab === 'teamAppointments' && (
        <div className="space-y-3 sm:space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-lg sm:rounded-2xl p-3 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                <CalendarCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 shrink-0" />
                <span>Team Callback Appointments & Follow-up</span>
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                Manage upcoming customer callbacks booked by team members and review previous completed callbacks
              </p>
            </div>

            {/* Subtab Pills - Responsive on Mobile */}
            <div className="w-full sm:w-auto overflow-x-auto no-scrollbar flex items-center gap-1 sm:gap-1.5 bg-slate-100 p-1 sm:p-1.5 rounded-xl border border-slate-200 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setAppointmentSubTab('upcoming')}
                className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 text-[10.5px] sm:text-xs ${
                  appointmentSubTab === 'upcoming'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarCheck className="w-3 h-3 text-red-600" />
                <span>Upcoming Callbacks</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9.5px] ${
                  appointmentSubTab === 'upcoming' ? 'bg-red-800 text-white' : 'bg-red-100 text-red-700'
                }`}>
                  {teamAppointments.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAppointmentSubTab('previous')}
                className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 text-[10.5px] sm:text-xs ${
                  appointmentSubTab === 'previous'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-800 hover:text-emerald-950 bg-emerald-50 border border-emerald-200'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Previous Appointments</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-bold ${
                  appointmentSubTab === 'previous' ? 'bg-emerald-900 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {previousTeamAppointments.length}
                </span>
              </button>
            </div>
          </div>

          {appointmentSubTab === 'upcoming' ? (
            <AppointmentsListTable
              records={teamAppointments}
              type="upcoming"
              currentUser={currentUser}
              onMarkAsCalled={(rec) => setMarkAsCalledRecord(rec)}
              onReassign={(rec) => {
                setReassignModalRecord(rec);
                setSelectedTargetAgentId('');
                setReassignNote('');
              }}
              emptyMessage="No upcoming appointments currently booked by your team members."
            />
          ) : (
            <AppointmentsListTable
              records={previousTeamAppointments}
              type="previous"
              currentUser={currentUser}
              emptyMessage="No completed team callback appointments recorded in Previous Appointments yet."
            />
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 3: TEAM ACTIVITY STREAM                          */}
      {/* ======================================================== */}
      {activeTab === 'teamActivity' && (
        <div className="bg-white border border-slate-200/90 rounded-lg sm:rounded-2xl shadow-xs overflow-hidden">
          <div className="px-2.5 sm:px-6 py-1.5 sm:py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-1.5 sm:gap-3 flex-wrap">
            <div>
              <h3 className="font-bold text-slate-900 text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2">
                <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
                Team Calling Activity & Disposition Stream
              </h3>
              <p className="text-[8px] sm:text-xs text-slate-500 mt-0.5 leading-tight">
                Real-time activity feed of actions logged by team members created under you
              </p>
            </div>
            <span className="hidden sm:inline-flex text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-xl shrink-0">
              {teamLogs.length} Events Logged
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {teamLogs.length === 0 ? (
              <div className="py-8 sm:py-12 text-center text-slate-400 text-[10px] sm:text-xs">
                No activity logs recorded for your team yet.
              </div>
            ) : (
              teamLogs.map((log) => (
                <div key={log.id} className="p-2 sm:p-4 hover:bg-slate-50 flex items-center justify-between gap-2 sm:gap-3 text-[9.5px] sm:text-xs">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-blue-700 text-[8.5px] sm:text-[10px] shrink-0">
                      {log.userName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-[9.5px] sm:text-xs">
                        {log.userName}{' '}
                        <span className="text-slate-400 font-normal text-[8.5px] sm:text-[11px]">({log.userRole})</span>
                      </div>
                      <div className="text-slate-600 mt-0.5 text-[8.5px] sm:text-xs">
                        Customer: <strong className="text-slate-800">{log.customerName}</strong> • {log.details}
                      </div>
                    </div>
                  </div>
                  <div className="text-[8px] sm:text-[11px] font-mono text-slate-400 shrink-0">
                    {log.timestamp}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Reassign Appointment Modal */}
      {reassignModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-lg shrink-0">
                  <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                    Reassign Callback Appointment
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Reallocate follow-up to another team member
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReassignModalRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-1.5">
              <div>
                <span className="text-slate-500 font-medium">Customer Name: </span>
                <strong className="text-slate-900 font-bold">{reassignModalRecord.customerName}</strong> ({reassignModalRecord.phoneNumber})
              </div>
              <div>
                <span className="text-slate-500 font-medium">Scheduled Time: </span>
                <span className="font-mono font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded text-[11px]">
                  {reassignModalRecord.appointment.replace('T', ' ')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Currently Assigned To: </span>
                <strong className="text-slate-800">{reassignModalRecord.assignedAgentName}</strong>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Assign To Team Member <span className="text-red-600">*</span>
                </label>
                <select
                  value={selectedTargetAgentId}
                  onChange={(e) => setSelectedTargetAgentId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">-- Select Team Member --</option>
                  {supervisedAgents.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.branch}) {a.id === reassignModalRecord.assignedAgentId ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Supervisor Directive / Reassignment Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={reassignNote}
                  onChange={(e) => setReassignNote(e.target.value)}
                  placeholder="e.g. Please follow up on this callback as requested..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReassignModalRecord(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedTargetAgentId}
                onClick={() => {
                  const targetAgent = supervisedAgents.find(a => a.id === selectedTargetAgentId);
                  if (!targetAgent) return;

                  const updated: CustomerRecord = {
                    ...reassignModalRecord,
                    assignedAgentId: targetAgent.id,
                    assignedAgentName: targetAgent.name,
                    appointmentAssignedBySupervisor: true,
                    reassignedFromAgentId: reassignModalRecord.assignedAgentId,
                    reassignedFromAgentName: reassignModalRecord.assignedAgentName,
                    reassignedAt: new Date().toISOString(),
                    appointment: (reassignModalRecord.appointment && reassignModalRecord.appointment.trim() !== '')
                      ? reassignModalRecord.appointment
                      : new Date().toISOString().slice(0, 16),
                    supervisorNote: reassignNote.trim() 
                      ? reassignNote.trim() 
                      : (reassignModalRecord.supervisorNote || `Assigned to ${targetAgent.name} by Supervisor ${currentUser.name}`),
                    updatedAt: new Date().toISOString()
                  };

                  if (onUpdateRecord) {
                    onUpdateRecord(updated, `Supervisor reassigned appointment for ${reassignModalRecord.customerName} to ${targetAgent.name}`);
                  }

                  setReassignModalRecord(null);
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 active:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Mark As Called Modal */}
      <MarkAsCalledModal
        isOpen={Boolean(markAsCalledRecord)}
        record={markAsCalledRecord}
        currentUser={currentUser}
        onClose={() => setMarkAsCalledRecord(null)}
        onSave={(record, feedbackNote, status) => {
          if (!onUpdateRecord) return;
          const updated: CustomerRecord = {
            ...record,
            appointmentCompleted: true,
            appointmentCompletedAt: new Date().toISOString(),
            appointmentCompletedBy: currentUser.name,
            feedbackNote,
            status,
            hasBeenCalled: true,
            callDate: new Date().toISOString().split('T')[0],
            callCount: Math.max(1, (record.callCount || 0) + 1),
            updatedAt: new Date().toISOString()
          };
          onUpdateRecord(updated, `Supervisor marked appointment as called for ${record.customerName} (${status})`);
        }}
      />
    </div>
  );
};
