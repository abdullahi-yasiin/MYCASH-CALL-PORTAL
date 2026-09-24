import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserCheck, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  PhoneCall, 
  CheckCircle2, 
  Clock, 
  CalendarCheck, 
  PhoneOff, 
  XCircle, 
  TrendingUp, 
  Eye, 
  Building2, 
  Mail, 
  Phone, 
  ArrowLeft, 
  Sparkles,
  BarChart3,
  Calendar,
  Layers,
  Search,
  ExternalLink
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { User, CustomerRecord, BranchInfo, ActivityLog } from '../types';

interface SupervisorsFocusRollUpProps {
  supervisors: User[];
  teamMembers: User[];
  records: CustomerRecord[];
  branches: BranchInfo[];
  activityLogs: ActivityLog[];
  onExit: () => void;
  onInspectAgentExcel: (agent: User) => void;
}

export const SupervisorsFocusRollUp: React.FC<SupervisorsFocusRollUpProps> = ({
  supervisors,
  teamMembers,
  records,
  branches,
  activityLogs,
  onExit,
  onInspectAgentExcel
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [agentSearch, setAgentSearch] = useState<string>('');

  // Keyboard navigation for scrolling back and forth
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : supervisors.length - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex(prev => (prev < supervisors.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [supervisors.length, onExit]);

  // Safe current supervisor
  const currentSupervisor = supervisors[currentIndex] || supervisors[0];

  // Compute roll-up performance data for each supervisor
  const supervisorsData = useMemo(() => {
    return supervisors.map(sup => {
      // Find branch details
      const branchInfo = branches.find(b => b.name === sup.branch);
      
      // Subordinate team members
      const team = teamMembers.filter(
        tm => tm.supervisorId === sup.id || tm.branch === sup.branch
      );

      // Records belonging to supervisor's team
      const teamAgentIds = new Set(team.map(t => t.id));
      const teamRecords = records.filter(
        r => teamAgentIds.has(r.assignedAgentId) || r.supervisorId === sup.id || r.areaOfReg === sup.branch
      );

      const totalLeads = teamRecords.length;
      const called = teamRecords.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;
      const uncalled = teamRecords.filter(r => !r.hasBeenCalled && (!r.status || r.status === 'Uncalled')).length;
      const success = teamRecords.filter(r => r.status === 'Success').length;
      const inProgress = teamRecords.filter(r => r.status === 'In-progress').length;
      const notAvailable = teamRecords.filter(r => r.status === 'Not Available').length;
      const rejected = teamRecords.filter(r => r.status === 'Rejected').length;
      const appointments = teamRecords.filter(r => r.appointment && r.appointment.trim() !== '').length;
      const conversion = called > 0 ? Math.round((success / called) * 100) : 0;
      const coveragePercent = totalLeads > 0 ? Math.round((called / totalLeads) * 100) : 0;

      // Per-agent metrics within this supervisor's team
      const agentsMetrics = team.map(agent => {
        const agentRecords = records.filter(r => r.assignedAgentId === agent.id);
        const aTotal = agentRecords.length;
        const aCalled = agentRecords.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;
        const aUncalled = agentRecords.filter(r => !r.hasBeenCalled && (!r.status || r.status === 'Uncalled')).length;
        const aSuccess = agentRecords.filter(r => r.status === 'Success').length;
        const aInProgress = agentRecords.filter(r => r.status === 'In-progress').length;
        const aNotAvailable = agentRecords.filter(r => r.status === 'Not Available').length;
        const aRejected = agentRecords.filter(r => r.status === 'Rejected').length;
        const aAppointments = agentRecords.filter(r => r.appointment && r.appointment.trim() !== '').length;
        const aConv = aCalled > 0 ? Math.round((aSuccess / aCalled) * 100) : 0;
        const aCov = aTotal > 0 ? Math.round((aCalled / aTotal) * 100) : 0;

        return {
          agent,
          name: agent.name,
          email: agent.email,
          phone: agent.phone,
          branch: agent.branch,
          totalLeads: aTotal,
          called: aCalled,
          uncalled: aUncalled,
          success: aSuccess,
          inProgress: aInProgress,
          notAvailable: aNotAvailable,
          rejected: aRejected,
          appointments: aAppointments,
          conversion: aConv,
          coveragePercent: aCov
        };
      });

      // Supervisor's branch activity logs
      const supervisorLogs = activityLogs.filter(
        log => log.userId === sup.id || teamAgentIds.has(log.userId)
      ).slice(0, 10);

      return {
        supervisor: sup,
        branchInfo,
        team,
        totalLeads,
        called,
        uncalled,
        success,
        inProgress,
        notAvailable,
        rejected,
        appointments,
        conversion,
        coveragePercent,
        agentsMetrics,
        supervisorLogs
      };
    });
  }, [supervisors, teamMembers, records, branches, activityLogs]);

  const activeData = supervisorsData[currentIndex] || supervisorsData[0];

  if (!activeData) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
        <Users className="w-10 h-10 text-blue-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">No Supervisors Found</h3>
        <p className="text-xs text-slate-500 mt-1">Add supervisors via User Management to see performance roll-up stats.</p>
        <button
          onClick={onExit}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Filtered agents in the active supervisor's team
  const filteredTeamAgents = activeData.agentsMetrics.filter(a => {
    if (!agentSearch.trim()) return true;
    const q = agentSearch.toLowerCase();
    return a.name.toLowerCase().includes(q) || (a.phone && a.phone.includes(q)) || a.email.toLowerCase().includes(q);
  });

  // Chart data for team agents
  const chartData = activeData.agentsMetrics.map(a => ({
    name: a.name.split(' ')[0],
    Success: a.success,
    InProgress: a.inProgress,
    NoAnswer: a.notAvailable,
    Rejected: a.rejected
  }));

  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : supervisors.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev < supervisors.length - 1 ? prev + 1 : 0));
  };

  return (
    <div id="supervisors-focus-rollup-view" className="space-y-4 sm:space-y-5 animate-in fade-in duration-200 p-2 sm:p-0">
      {/* Top Focus Header Bar */}
      <div className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="btn-exit-focus-rollup"
              onClick={onExit}
              className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/80 cursor-pointer shadow-xs"
              title="Exit Focus Mode (Esc)"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 rounded-xs text-[8px] sm:text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                  Focus Mode
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400">
                  Supervisors Roll-Up
                </span>
              </div>
              <h1 className="text-sm sm:text-xl md:text-2xl font-black text-white tracking-tight mt-0.5 flex items-center gap-1.5 sm:gap-2">
                <UserCheck className="w-4 h-4 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
                <span className="truncate max-w-[130px] xs:max-w-[190px] sm:max-w-none">{activeData.supervisor.name}</span>
                <span className="hidden sm:inline text-[10px] sm:text-sm font-semibold text-slate-400 shrink-0">({activeData.supervisor.branch})</span>
              </h1>
            </div>
          </div>

          {/* Quick exit on mobile */}
          <button
            onClick={onExit}
            className="hidden px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg border border-slate-700 cursor-pointer shrink-0"
          >
            Exit
          </button>
        </div>

        {/* Back and Forth Carousel Controller */}
        <div className="flex items-center justify-between md:justify-end gap-2 sm:gap-3 w-full md:w-auto pt-2.5 md:pt-0 border-t border-slate-800/80 md:border-t-0">
          <div className="text-left md:text-right">
            <div className="text-[10px] sm:text-xs font-bold text-slate-200">
              Sup. {currentIndex + 1} / {supervisors.length}
            </div>
            <div className="text-[8.5px] text-amber-400 font-medium md:hidden truncate max-w-[120px]">
              {activeData.supervisor.branch}
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl sm:rounded-2xl border border-slate-700/90 shadow-inner">
            <button
              id="btn-scroll-supervisor-prev"
              onClick={handlePrev}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-700 hover:bg-amber-500 hover:text-slate-950 text-white transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1"
              title="Previous (Arrow Left)"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs font-bold sm:hidden">Prev</span>
            </button>

            {/* Supervisor Selector Pills / Jump */}
            <div className="flex items-center gap-0.5 px-0.5 max-w-[90px] xs:max-w-[130px] sm:max-w-xs overflow-x-auto py-0.5 custom-scrollbar">
              {supervisors.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-black transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                    idx === currentIndex
                      ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold scale-105'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                  title={`${s.name} (${s.branch})`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            <button
              id="btn-scroll-supervisor-next"
              onClick={handleNext}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-700 hover:bg-amber-500 hover:text-slate-950 text-white transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1"
              title="Next (Arrow Right)"
            >
              <span className="text-[10px] sm:text-xs font-bold sm:hidden">Next</span>
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          <button
            onClick={onExit}
            className="hidden md:inline-flex px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[10px] sm:text-xs font-bold rounded-xl sm:rounded-2xl border border-slate-700 transition-colors cursor-pointer"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Mobile-Only Previous / Next Supervisor Toggle Banner */}
      <div className="hidden">
        <button
          id="btn-mobile-supervisor-prev"
          onClick={handlePrev}
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 active:bg-amber-500 active:text-slate-950 text-slate-100 rounded-lg text-xs font-bold transition-all border border-slate-700 cursor-pointer shadow-xs"
        >
          <ChevronLeft className="w-4 h-4 text-amber-400" />
          <span>Previous</span>
        </button>

        <div className="text-center px-1">
          <div className="hidden text-[11px] font-black text-amber-400 truncate max-w-[130px]">
            {activeData.supervisor.name}
          </div>
          <div className="hidden text-[9px] text-slate-400 font-medium">
            {activeData.supervisor.branch} • {currentIndex + 1} of {supervisors.length}
          </div>
        </div>

        <button
          id="btn-mobile-supervisor-next"
          onClick={handleNext}
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 active:bg-amber-500 active:text-slate-950 text-slate-100 rounded-lg text-xs font-bold transition-all border border-slate-700 cursor-pointer shadow-xs"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4 text-amber-400" />
        </button>
      </div>

      {/* Quick Carousel Thumbnails Bar - Removed from Focus Mode as requested */}
      <div className="hidden">
        {supervisorsData.map((sData, idx) => {
          const isSelected = idx === currentIndex;
          return (
            <button
              key={sData.supervisor.id}
              onClick={() => setCurrentIndex(idx)}
              className={`text-left p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 w-[165px] xs:w-[185px] sm:w-auto snap-start ${
                isSelected
                  ? 'bg-white border-amber-400 shadow-md ring-2 ring-amber-400/40'
                  : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider text-slate-400 truncate">
                  {sData.supervisor.branch}
                </span>
                <span className={`px-1.5 py-0.5 rounded-xs text-[8.5px] sm:text-[9px] font-extrabold shrink-0 whitespace-nowrap ${
                  isSelected ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'
                }`}>
                  {sData.conversion}% Conv.
                </span>
              </div>
              <div className="font-bold text-slate-900 text-[11px] sm:text-xs truncate">
                {sData.supervisor.name}
              </div>
              <div className="text-[9.5px] sm:text-[11px] text-slate-500 mt-1 flex items-center justify-between gap-1">
                <span className="truncate">{sData.team.length} Agents</span>
                <span className="font-semibold text-blue-600 shrink-0 whitespace-nowrap">{sData.called}/{sData.totalLeads} calls</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Supervisor Overview Card with Roll-Up Performance */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 border border-slate-200/90 shadow-sm space-y-4 sm:space-y-6">
        {/* Supervisor Profile Summary Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg bg-gradient-to-tr from-amber-500 to-blue-600 text-white font-black text-sm sm:text-base md:text-xl flex items-center justify-center shadow-md shrink-0">
              {activeData.supervisor.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base md:text-lg font-black text-slate-900">
                  {activeData.supervisor.name}
                </h2>
                <span className="px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 rounded-xs text-[9px] sm:text-xs font-bold bg-red-50 text-red-700 border border-red-200 shrink-0">
                  Branch Supervisor
                </span>
              </div>
              <div className="flex items-center flex-wrap gap-x-2.5 sm:gap-x-4 gap-y-0.5 sm:gap-y-1 text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500 shrink-0" />
                  <strong>{activeData.supervisor.branch}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate max-w-[130px] sm:max-w-none">{activeData.supervisor.email}</span>
                </span>
                {activeData.supervisor.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
                    <span>{activeData.supervisor.phone}</span>
                  </span>
                )}
                <span className="flex items-center gap-1 font-semibold text-blue-700">
                  <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span>{activeData.team.length} Subordinate Agents</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Target Progress Indicator */}
          {activeData.branchInfo && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 sm:p-3 w-full sm:min-w-[240px] max-w-full">
              <div className="flex justify-between text-[9px] sm:text-xs text-slate-600 font-medium mb-1">
                <span>Target</span>
                <span className="font-bold text-slate-900">
                  {activeData.called} / {activeData.branchInfo.targetCallsMonth}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 sm:h-2 overflow-hidden">
                <div 
                  className="bg-blue-600 h-1.5 sm:h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, Math.round((activeData.called / activeData.branchInfo.targetCallsMonth) * 100))}%` 
                  }}
                />
              </div>
              <div className="text-[8px] sm:text-[10px] text-slate-500 text-right mt-1 font-semibold">
                {Math.round((activeData.called / activeData.branchInfo.targetCallsMonth) * 100)}% reached
              </div>
            </div>
          )}
        </div>

        {/* Supervisor's Team Key Roll-Up Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 md:gap-3">
          {/* Total Leads */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-2.5 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate">Total Leads</span>
              <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
            </div>
            <div className="text-lg sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
              {activeData.totalLeads}
            </div>
            <div className="text-[8.5px] sm:text-[10px] text-slate-500 truncate mt-0.5 sm:mt-1">
              Across team's Excels
            </div>
          </div>

          {/* Unique Calls Made */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-2.5 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-700 mb-1">
              <span className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider truncate">Calls Made</span>
              <PhoneCall className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 shrink-0" />
            </div>
            <div className="text-lg sm:text-2xl lg:text-3xl font-black text-blue-900 tracking-tight mt-0.5">
              {activeData.called}
            </div>
            <div className="text-[8.5px] sm:text-[10px] text-blue-700 font-semibold truncate mt-0.5 sm:mt-1">
              {activeData.coveragePercent}% Excel Coverage
            </div>
          </div>

          {/* Successful Deals */}
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-2.5 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider truncate">Success</span>
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
            </div>
            <div className="text-lg sm:text-2xl lg:text-3xl font-black text-emerald-900 tracking-tight mt-0.5">
              {activeData.success}
            </div>
            <div className="text-[8.5px] sm:text-[10px] text-emerald-700 font-semibold truncate mt-0.5 sm:mt-1">
              {activeData.conversion}% Team Conv.
            </div>
          </div>

          {/* In-Progress Pipeline */}
          <div className="bg-amber-50/60 border border-amber-100 rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-2.5 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider truncate">In-Progress</span>
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 shrink-0" />
            </div>
            <div className="text-lg sm:text-2xl lg:text-3xl font-black text-amber-900 tracking-tight mt-0.5">
              {activeData.inProgress}
            </div>
            <div className="text-[8.5px] sm:text-[10px] text-amber-700 truncate mt-0.5 sm:mt-1">
              Follow-up roster
            </div>
          </div>

          {/* Scheduled Appointments */}
          <div className="bg-red-50/60 border border-red-100 rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-2.5 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-red-700 mb-1">
              <span className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider truncate">Appointments</span>
              <CalendarCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-600 shrink-0" />
            </div>
            <div className="text-lg sm:text-2xl lg:text-3xl font-black text-red-900 tracking-tight mt-0.5">
              {activeData.appointments}
            </div>
            <div className="text-[8.5px] sm:text-[10px] text-red-700 font-semibold truncate mt-0.5 sm:mt-1">
              Scheduled callbacks
            </div>
          </div>

          {/* Uncalled Leads Remaining */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-2.5 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate">Uncalled</span>
              <PhoneOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
            </div>
            <div className="text-lg sm:text-2xl lg:text-3xl font-black text-slate-700 tracking-tight mt-0.5">
              {activeData.uncalled}
            </div>
            <div className="text-[8.5px] sm:text-[10px] text-slate-500 truncate mt-0.5 sm:mt-1">
              Pending dialing
            </div>
          </div>
        </div>

        {/* Visual Outcome Distribution for this Supervisor's Team */}
        {chartData.length > 0 && (
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Team Calling Performance Breakdown
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                {activeData.team.length} Active Agents Under {activeData.supervisor.name}
              </span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Bar dataKey="Success" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="InProgress" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="NoAnswer" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Rejected" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Subordinate Team Members Performance Table (How their team is doing) */}
        <div className="space-y-2.5 sm:space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
                <span>Supervised Team Members ({activeData.team.length} Agents)</span>
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                Detailed calling metrics synthesized from each team member's Excel file
              </p>
            </div>

            {/* Quick Agent Search Filter */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={agentSearch}
                onChange={(e) => setAgentSearch(e.target.value)}
                placeholder="Search agent name or phone..."
                className="w-full pl-7 sm:pl-8 pr-6 sm:pr-7 py-1 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-[11px] sm:text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              {agentSearch && (
                <button
                  onClick={() => setAgentSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-0.5 cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-xs">
            <div className="overflow-x-auto select-auto">
              <table className="w-full text-left font-table-data text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-tight text-[8.5px] border-b border-slate-200">
                    <th className="py-1.5 px-3 whitespace-nowrap">Agent Name</th>
                    <th className="py-1.5 px-2 whitespace-nowrap">Contact</th>
                    <th className="py-1.5 px-2 text-center whitespace-nowrap">TOTAL LEADS</th>
                    <th className="py-1.5 px-2 text-center whitespace-nowrap">Calls Made</th>
                    <th className="py-1.5 px-2 text-center whitespace-nowrap">Uncalled</th>
                    <th className="py-1.5 px-2 text-center text-emerald-700 whitespace-nowrap">Success</th>
                    <th className="py-1.5 px-2 text-center text-amber-700 whitespace-nowrap">In-Progress</th>
                    <th className="py-1.5 px-2 text-center text-red-700 whitespace-nowrap">Appts</th>
                    <th className="py-1.5 px-2 text-center whitespace-nowrap">Conv %</th>
                    <th className="py-1.5 px-3 min-w-[120px] whitespace-nowrap">Progress</th>
                    <th className="py-1.5 px-2 text-center whitespace-nowrap">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTeamAgents.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-10 text-center text-slate-400">
                        No team agents found for this supervisor.
                      </td>
                    </tr>
                  ) : (
                    filteredTeamAgents.map(a => (
                      <tr key={a.agent.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5 leading-tight">
                            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[9px] shrink-0">
                              {a.name.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="truncate max-w-[130px]">{a.name}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-[10px] text-slate-500 truncate max-w-[130px]">
                          {a.phone || a.email}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-slate-900 text-xs">
                          {a.totalLeads}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-xs text-[11px] border border-blue-100/70">
                            {a.called}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center font-medium text-slate-500 text-[11px]">
                          {a.uncalled}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-emerald-600 text-[11px]">
                          {a.success}
                        </td>
                        <td className="py-2 px-2 text-center font-medium text-amber-600 text-[11px]">
                          {a.inProgress}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-red-700 text-[11px]">
                          {a.appointments > 0 ? (
                            <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded-xs border border-red-200 text-[10px]">
                              {a.appointments}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded-xs text-[10px] font-bold ${
                            a.conversion >= 30 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : a.conversion >= 15 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {a.conversion}%
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-between text-[9px] text-slate-600 mb-0.5">
                            <span>{a.called}/{a.totalLeads}</span>
                            <span className="font-bold">{a.coveragePercent}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                            <div 
                              className="bg-amber-500 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${a.coveragePercent}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            id={`btn-focus-inspect-agent-${a.agent.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onInspectAgentExcel(a.agent);
                            }}
                            className="px-2 py-1 text-[10px] font-semibold text-blue-600 hover:text-white hover:bg-blue-600 rounded border border-blue-200 hover:border-blue-600 transition-all flex items-center gap-1 mx-auto cursor-pointer"
                            title={`Inspect ${a.name}'s customer roster`}
                          >
                            <Eye className="w-3 h-3 pointer-events-none" />
                            <span className="pointer-events-none">Inspect</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
