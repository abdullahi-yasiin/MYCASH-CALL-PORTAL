import React, { useState } from 'react';
import { 
  Users, 
  History, 
  UserPlus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  PhoneOff, 
  XCircle,
  CalendarCheck,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { User, CustomerRecord, ActivityLog, isRecordAssignedBySupervisor } from '../types';

interface SupervisorTeamTabProps {
  currentUser: User;
  teamMembers: User[];
  records: CustomerRecord[];
  activityLogs: ActivityLog[];
  onAddTeamMember: () => void;
  onRemoveTeamMember: (id: string) => void;
}

export const SupervisorTeamTab: React.FC<SupervisorTeamTabProps> = ({
  currentUser,
  teamMembers,
  records,
  activityLogs,
  onAddTeamMember,
  onRemoveTeamMember
}) => {
  const [subTab, setSubTab] = useState<'teamOverview' | 'activityLogs'>('teamOverview');

  // Filter team members belonging to supervisor's branch
  const branchTeamMembers = teamMembers.filter(
    tm => tm.branch === currentUser.branch || tm.supervisorId === currentUser.id
  );

  // Compute metrics per team member
  const agentPerformance = branchTeamMembers.map(agent => {
    const agentRecords = records.filter(r => 
      (r.assignedAgentId === agent.id || (r.assignedAgentName && r.assignedAgentName.trim().toLowerCase() === agent.name.trim().toLowerCase())) &&
      !isRecordAssignedBySupervisor(r)
    );
    const called = agentRecords.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;
    const success = agentRecords.filter(r => r.status === 'Success').length;
    const inProgress = agentRecords.filter(r => r.status === 'In-progress').length;
    const notAvailable = agentRecords.filter(r => r.status === 'Not Available').length;
    const rejected = agentRecords.filter(r => r.status === 'Rejected').length;
    const appointments = agentRecords.filter(r => r.appointment && r.appointment.trim() !== '').length;
    const conversion = called > 0 ? Math.round((success / called) * 100) : 0;

    return {
      ...agent,
      totalLeads: agentRecords.length,
      called,
      success,
      inProgress,
      notAvailable,
      rejected,
      appointments,
      conversion
    };
  });

  // Filter activity logs related to branch or agents in this branch
  const branchLogs = activityLogs.filter(log => {
    const isAgentInBranch = branchTeamMembers.some(tm => tm.id === log.userId);
    return isAgentInBranch || log.userId === currentUser.id;
  });

  return (
    <div className="space-y-4">
      {/* Sub-tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            id="sup-subtab-team"
            onClick={() => setSubTab('teamOverview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'teamOverview'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            (1) Team Members Overview ({branchTeamMembers.length})
          </button>

          <button
            id="sup-subtab-logs"
            onClick={() => setSubTab('activityLogs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'activityLogs'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            (2) Daily Activity Logs ({branchLogs.length})
          </button>
        </div>

        {subTab === 'teamOverview' && (
          <button
            id="btn-add-agent-modal"
            onClick={onAddTeamMember}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Team Member</span>
          </button>
        )}
      </div>

      {/* Categorized Tab 1: Team Members Overview */}
      {subTab === 'teamOverview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentPerformance.map(agent => (
              <div key={agent.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                        {agent.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 text-sm">{agent.name}</h5>
                        <p className="text-[11px] text-slate-500">{agent.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveTeamMember(agent.id)}
                      className="text-slate-300 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                      title="Remove agent from team"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Calling Metrics */}
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                      <div className="text-xs text-slate-500">Assigned</div>
                      <div className="text-base font-bold text-slate-900">{agent.totalLeads}</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-2">
                      <div className="text-xs text-blue-700">Called</div>
                      <div className="text-base font-bold text-blue-950">{agent.called}</div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2">
                      <div className="text-xs text-emerald-700">Success</div>
                      <div className="text-base font-bold text-emerald-950">{agent.success}</div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Appointments Booked:</span>
                      <strong className="text-red-700">{agent.appointments}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">In-Progress Follow-ups:</span>
                      <strong className="text-amber-700">{agent.inProgress}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Conversion Rate:</span>
                      <strong className="text-emerald-700">{agent.conversion}%</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Branch: {agent.branch}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categorized Tab 2: Daily Activity Logs */}
      {subTab === 'activityLogs' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Real-time Telemetry & Calling Audit Trail</span>
            <span className="text-slate-500">{branchLogs.length} logged events</span>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider text-[9px] border-b border-slate-200">
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Operator</th>
                <th className="py-2 px-3">Customer / Target</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branchLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No activity logs recorded yet today.
                  </td>
                </tr>
              ) : (
                branchLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="py-2.5 px-4 text-slate-800 font-medium">
                      {log.customerName}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.action === 'STATUS_CHANGE'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : log.action === 'APPOINTMENT_SCHEDULED'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : log.action === 'EXCEL_IMPORTED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
