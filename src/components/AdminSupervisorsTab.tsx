import React, { useState } from 'react';
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
  ChevronRight
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
import { BranchInfo, User, CustomerRecord, isRecordAssignedBySupervisor } from '../types';

interface AdminSupervisorsTabProps {
  branches: BranchInfo[];
  supervisors: User[];
  teamMembers: User[];
  records: CustomerRecord[];
  onSelectBranchFilter?: (branchName: string) => void;
  onSelectSupervisorFilter?: (supId: string) => void;
}

export const AdminSupervisorsTab: React.FC<AdminSupervisorsTabProps> = ({
  branches,
  supervisors,
  teamMembers,
  records,
  onSelectBranchFilter,
  onSelectSupervisorFilter
}) => {
  const [subTab, setSubTab] = useState<'branches' | 'supervisors' | 'teamMembers'>('branches');

  // Compute metrics per branch
  const branchMetrics = branches.map(branch => {
    const branchSupervisor = supervisors.find(s => s.branch === branch.name || s.id === branch.supervisorId);
    const dynamicSupervisorName = branchSupervisor ? branchSupervisor.name : (branch.supervisorName || 'Unassigned');
    const branchRecords = records.filter(r => r.areaOfReg === branch.name);
    const called = branchRecords.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;
    const success = branchRecords.filter(r => r.status === 'Success').length;
    const inProgress = branchRecords.filter(r => r.status === 'In-progress').length;
    const notAvailable = branchRecords.filter(r => r.status === 'Not Available').length;
    const rejected = branchRecords.filter(r => r.status === 'Rejected').length;
    const appointments = branchRecords.filter(r => r.appointment && r.appointment.trim() !== '').length;
    const conversion = called > 0 ? Math.round((success / called) * 100) : 0;
    const progressPercent = Math.min(100, Math.round((called / branch.targetCallsMonth) * 100));

    return {
      ...branch,
      supervisorName: dynamicSupervisorName,
      totalLeads: branchRecords.length,
      called,
      success,
      inProgress,
      notAvailable,
      rejected,
      appointments,
      conversion,
      progressPercent
    };
  });

  // Compute metrics per supervisor
  const supervisorMetrics = supervisors.map(sup => {
    const supRecords = records.filter(r => r.supervisorId === sup.id || r.areaOfReg === sup.branch);
    const called = supRecords.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;
    const success = supRecords.filter(r => r.status === 'Success').length;
    const inProgress = supRecords.filter(r => r.status === 'In-progress').length;
    const notAvailable = supRecords.filter(r => r.status === 'Not Available').length;
    const rejected = supRecords.filter(r => r.status === 'Rejected').length;
    const appointments = supRecords.filter(r => r.appointment && r.appointment.trim() !== '').length;
    const conversion = called > 0 ? Math.round((success / called) * 100) : 0;
    const supervisedAgents = teamMembers.filter(tm => tm.supervisorId === sup.id || tm.branch === sup.branch);

    return {
      ...sup,
      agentCount: supervisedAgents.length,
      totalLeads: supRecords.length,
      called,
      success,
      inProgress,
      notAvailable,
      rejected,
      appointments,
      conversion
    };
  });

  // Compute metrics per team member
  const agentMetrics = teamMembers.map(agent => {
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

  // Chart data for Branches
  const chartData = branchMetrics.map(b => ({
    name: b.name.replace(' Branch', ''),
    Success: b.success,
    InProgress: b.inProgress,
    NotAvailable: b.notAvailable,
    Rejected: b.rejected
  }));

  return (
    <div className="space-y-4">
      {/* Sub-tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            id="admin-subtab-branches"
            onClick={() => setSubTab('branches')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-all ${
              subTab === 'branches'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            (1) Branches / Regions ({branches.length})
          </button>

          <button
            id="admin-subtab-supervisors"
            onClick={() => setSubTab('supervisors')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-all ${
              subTab === 'supervisors'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            (2) Supervisors ({supervisors.length})
          </button>

          <button
            id="admin-subtab-team"
            onClick={() => setSubTab('teamMembers')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-all ${
              subTab === 'teamMembers'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            (3) Individual Team Members ({teamMembers.length})
          </button>
        </div>
      </div>

      {/* Visual Analytics Chart for Regional Comparison */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-3">
          <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 sm:gap-2">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
            <span>Regional Call Outcome Distribution</span>
          </h4>
          <span className="text-[9.5px] sm:text-[11px] text-slate-500 self-start sm:self-auto">Breakdown by Branch</span>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="Success" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="InProgress" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="NotAvailable" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Rejected" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Categorized Tab 1: Branches / Regions */}
      {subTab === 'branches' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branchMetrics.map(b => (
            <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-blue-300 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="font-bold text-slate-900 text-sm">{b.name}</h5>
                  <p className="text-xs text-slate-500">
                    {b.region} Region • Sup: {b.supervisorName === 'Unassigned' ? (
                      <span className="italic text-slate-400">Unassigned</span>
                    ) : (
                      <span className="font-semibold text-slate-700">{b.supervisorName}</span>
                    )}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700">
                  {b.conversion}% Conv.
                </span>
              </div>

              {/* Progress Bar towards target */}
              <div className="mt-3.5 space-y-1">
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Monthly Target ({b.targetCallsMonth} calls)</span>
                  <span className="font-bold text-slate-800">{b.called} called ({b.progressPercent}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${b.progressPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Mini Metrics Grid */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-4 gap-2 text-center">
                <div className="bg-emerald-50 rounded p-1.5">
                  <div className="text-xs font-bold text-emerald-800">{b.success}</div>
                  <div className="text-[10px] text-emerald-600">Success</div>
                </div>
                <div className="bg-amber-50 rounded p-1.5">
                  <div className="text-xs font-bold text-amber-800">{b.inProgress}</div>
                  <div className="text-[10px] text-amber-600">In-Prog</div>
                </div>
                <div className="bg-slate-100 rounded p-1.5">
                  <div className="text-xs font-bold text-slate-700">{b.notAvailable}</div>
                  <div className="text-[10px] text-slate-500">N/A</div>
                </div>
                <div className="bg-red-50 rounded p-1.5">
                  <div className="text-xs font-bold text-red-800">{b.appointments}</div>
                  <div className="text-[10px] text-red-600">Appts</div>
                </div>
              </div>

              {onSelectBranchFilter && (
                <button
                  onClick={() => onSelectBranchFilter(b.name)}
                  className="mt-3 w-full py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded flex items-center justify-center gap-1 transition-colors"
                >
                  <span>Filter records for {b.name}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Categorized Tab 2: Supervisors */}
      {subTab === 'supervisors' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-tight text-[7.5px] sm:text-[9.5px] border-b border-slate-200">
                  <th className="py-1.5 sm:py-2 px-1.5 sm:px-3">Supervisor Name</th>
                  <th className="py-1.5 sm:py-2 px-1.5 sm:px-3">Assigned Branch</th>
                  <th className="py-1.5 sm:py-2 px-1 sm:px-3 text-center">Active Agents</th>
                  <th className="py-1.5 sm:py-2 px-1 sm:px-3 text-center">Total Leads</th>
                  <th className="py-1.5 sm:py-2 px-1 sm:px-3 text-center">Total Called</th>
                  <th className="py-1.5 sm:py-2 px-1 sm:px-3 text-center">Success</th>
                  <th className="py-1.5 sm:py-2 px-1 sm:px-3 text-center">In-Progress</th>
                  <th className="py-1.5 sm:py-2 px-1 sm:px-3 text-center">Appointments</th>
                  <th className="py-1.5 sm:py-2 px-1 sm:px-3 text-center">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supervisorMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <div className="font-semibold text-slate-600 text-xs">No Supervisors Registered Yet</div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Use the User Management panel to add regional branch supervisors.</p>
                    </td>
                  </tr>
                ) : (
                  supervisorMetrics.map(sup => (
                    <tr key={sup.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-slate-900 text-[10.5px] sm:text-xs">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center text-[9px] sm:text-xs shrink-0">
                            {sup.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div>{sup.name}</div>
                            <div className="text-[9.5px] sm:text-[11px] text-slate-400 font-normal">{sup.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 sm:py-3 px-1.5 sm:px-4 text-slate-700 text-[10px] sm:text-xs">{sup.branch}</td>
                      <td className="py-2 sm:py-3 px-1 sm:px-4 text-center font-bold text-slate-800 text-[10px] sm:text-xs">{sup.agentCount}</td>
                      <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-slate-600 text-[10px] sm:text-xs">{sup.totalLeads}</td>
                      <td className="py-2 sm:py-3 px-1 sm:px-4 text-center font-semibold text-blue-700 text-[10px] sm:text-xs">{sup.called}</td>
                      <td className="py-2 sm:py-3 px-1 sm:px-4 text-center font-semibold text-emerald-700 text-[10px] sm:text-xs">{sup.success}</td>
                      <td className="py-2 sm:py-3 px-1 sm:px-4 text-center font-semibold text-amber-700 text-[10px] sm:text-xs">{sup.inProgress}</td>
                      <td className="py-2 sm:py-3 px-1 sm:px-4 text-center font-semibold text-red-700 text-[10px] sm:text-xs">{sup.appointments}</td>
                      <td className="py-2 sm:py-3 px-1 sm:px-4 text-center">
                        <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9.5px] sm:text-xs font-bold bg-emerald-100 text-emerald-800">
                          {sup.conversion}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categorized Tab 3: Individual Team Members */}
      {subTab === 'teamMembers' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-tight text-[7.5px] sm:text-[9.5px] border-b border-slate-200">
                  <th className="py-1.5 sm:py-2 px-1.5 sm:px-3">Agent Name</th>
                  <th className="py-1.5 sm:py-2 px-1.5 sm:px-3">Branch / Region</th>
                  <th className="py-1.5 sm:py-2 px-1 sm:px-3 text-center">Assigned Leads</th>
                  <th className="py-1.5 sm:py-2 px-1 sm:px-3 text-center">Calls Made</th>
                  <th className="py-1.5 sm:py-2 px-1 sm:px-3 text-center">Success Rate</th>
                  <th className="py-1.5 sm:py-2 px-1 sm:px-3 text-center">In-Progress</th>
                  <th className="py-1.5 sm:py-2 px-1 sm:px-3 text-center">Not Available</th>
                  <th className="py-1.5 sm:py-2 px-1 sm:px-3 text-center">Rejected</th>
                  <th className="py-1.5 sm:py-2 px-1 sm:px-3 text-center">Appointments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agentMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <div className="font-semibold text-slate-600 text-xs">No Agents Registered Yet</div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Agents created by Supervisors or Admins will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  agentMetrics.map(agent => (
                  <tr key={agent.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-slate-900 text-[10.5px] sm:text-xs">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[9px] sm:text-xs shrink-0">
                          {agent.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div>{agent.name}</div>
                          <div className="text-[9.5px] sm:text-[11px] text-slate-400 font-normal">{agent.phone || agent.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-1.5 sm:px-4 text-slate-700 text-[10px] sm:text-xs">{agent.branch}</td>
                    <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-slate-600 font-medium text-[10px] sm:text-xs">{agent.totalLeads}</td>
                    <td className="py-2 sm:py-3 px-1 sm:px-4 text-center font-semibold text-blue-700 text-[10px] sm:text-xs">{agent.called}</td>
                    <td className="py-2 sm:py-3 px-1 sm:px-4 text-center font-bold text-emerald-700 text-[10px] sm:text-xs">
                      {agent.conversion}% ({agent.success})
                    </td>
                    <td className="py-2 sm:py-3 px-1 sm:px-4 text-center font-medium text-amber-700 text-[10px] sm:text-xs">{agent.inProgress}</td>
                    <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-slate-500 text-[10px] sm:text-xs">{agent.notAvailable}</td>
                    <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-rose-600 text-[10px] sm:text-xs">{agent.rejected}</td>
                    <td className="py-2 sm:py-3 px-1 sm:px-4 text-center font-bold text-red-700 text-[10px] sm:text-xs">{agent.appointments}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
