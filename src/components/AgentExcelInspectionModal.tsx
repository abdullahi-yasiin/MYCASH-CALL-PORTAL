import React, { useState, useMemo } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Download, 
  Search, 
  Phone, 
  Copy, 
  Check, 
  Calendar, 
  Clock, 
  MessageSquare,
  Lock,
  User as UserIcon,
  CheckCircle2,
  PhoneOff,
  XCircle,
  AlertCircle,
  Trash2,
  UserCheck
} from 'lucide-react';
import { User, CustomerRecord, CallStatus, DeleteExcelTarget, isRecordAssignedBySupervisor } from '../types';
import { exportToExcel } from '../utils/exportEngine';

interface AgentExcelInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: User | null;
  supervisorName?: string;
  records: CustomerRecord[];
  currentUser: User;
  onUpdateRecord?: (record: CustomerRecord, changeDetails: string) => void;
  onDeleteExcel?: (target: DeleteExcelTarget) => void;
  teamMembers?: User[];
}

export const AgentExcelInspectionModal: React.FC<AgentExcelInspectionModalProps> = ({
  isOpen,
  onClose,
  agent,
  supervisorName,
  records,
  currentUser,
  onUpdateRecord,
  onDeleteExcel,
  teamMembers = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [reassigningRecord, setReassigningRecord] = useState<CustomerRecord | null>(null);
  const [targetAgentId, setTargetAgentId] = useState<string>('');
  const [directiveNote, setDirectiveNote] = useState<string>('');

  // Close on Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (reassigningRecord) {
          setReassigningRecord(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, reassigningRecord]);

  // Filter records belonging strictly to this specific agent's uploaded Excel roster (excluding supervisor-assigned records)
  const agentRecords = useMemo(() => {
    if (!agent) return [];
    return records.filter(
      r => (r.assignedAgentId === agent.id || 
      (r.assignedAgentName && r.assignedAgentName.trim().toLowerCase() === agent.name.trim().toLowerCase())) &&
      !isRecordAssignedBySupervisor(r)
    );
  }, [records, agent]);

  // Available target agents for reassignment
  const availableTargetAgents = useMemo(() => {
    return teamMembers.filter(m => m.id !== agent?.id && m.role === 'TEAM_MEMBER');
  }, [teamMembers, agent]);

  // Applied local filter
  const displayedRecords = useMemo(() => {
    return agentRecords.filter(r => {
      const matchStatus = selectedStatus === 'ALL' || r.status === selectedStatus;
      const q = searchQuery.toLowerCase();
      const matchQuery = !q || 
        r.customerName.toLowerCase().includes(q) || 
        r.phoneNumber.includes(q) ||
        r.feedbackNote.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [agentRecords, selectedStatus, searchQuery]);

  if (!isOpen || !agent) return null;

  // Calculate agent summary stats
  const total = agentRecords.length;
  const called = agentRecords.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;
  const success = agentRecords.filter(r => r.status === 'Success').length;
  const inProgress = agentRecords.filter(r => r.status === 'In-progress').length;
  const notAvailable = agentRecords.filter(r => r.status === 'Not Available').length;
  const rejected = agentRecords.filter(r => r.status === 'Rejected').length;
  const appointments = agentRecords.filter(r => r.appointment && r.appointment.trim() !== '').length;
  const conversionRate = called > 0 ? Math.round((success / called) * 100) : 0;

  const handleCopyPhone = (id: string, phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDownloadExcel = () => {
    exportToExcel(agentRecords, `Excel_Roster_${agent.name.replace(/\s+/g, '_')}`);
  };

  const getStatusBadgeStyle = (status: CallStatus) => {
    switch (status) {
      case 'Success':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'In-progress':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Not Available':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'Rejected':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Uncalled':
      default:
        return 'bg-zinc-100 text-zinc-600 border-zinc-300';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 md:p-6 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 max-w-6xl w-full max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-3 sm:px-5 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-400 shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                    Inspection: {agent.name}
                  </h3>
                  <span className="px-1.5 py-0.2 rounded-xs text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                    {agent.branch}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5">
                  Supervisor: <strong className="text-slate-200">{supervisorName || 'Assigned Supervisor'}</strong> • Inspection Mode
                </p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="sm:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0 ml-2 cursor-pointer"
              title="Close inspection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0 border-t border-slate-800/80 sm:border-t-0">
            <button
              onClick={handleDownloadExcel}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-xs w-full sm:w-auto cursor-pointer"
              title="Download this team member's raw Excel file"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Export Excel</span>
            </button>

            {currentUser.role === 'HQ_ADMIN' && onDeleteExcel && (
              <button
                type="button"
                id="btn-inspect-modal-delete-excel"
                onClick={() => onDeleteExcel({
                  type: 'agent',
                  id: agent.id,
                  name: `${agent.name}'s Excel Roster`,
                  recordCount: agentRecords.length,
                  recordIds: agentRecords.map(r => r.id),
                  batchDetails: `${agent.branch} Branch`
                })}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-1 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-xs w-full sm:w-auto cursor-pointer"
                title="Permanently delete this team member's Excel records from frontend and Supabase"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Delete Excel</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="hidden sm:flex p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-2.5 sm:px-5 py-1.5 sm:py-2 shrink-0 grid grid-cols-4 sm:grid-cols-4 md:grid-cols-7 gap-1 sm:gap-1.5 text-center">
          <div className="bg-white p-1 sm:p-1.5 rounded-lg border border-slate-200">
            <span className="text-[8px] sm:text-[9px] text-slate-500 font-semibold block uppercase truncate">Total</span>
            <span className="text-xs sm:text-sm font-extrabold text-slate-900">{total}</span>
          </div>
          <div className="bg-white p-1 sm:p-1.5 rounded-lg border border-slate-200">
            <span className="text-[8px] sm:text-[9px] text-slate-500 font-semibold block uppercase truncate">Called</span>
            <span className="text-xs sm:text-sm font-extrabold text-blue-600">{called}</span>
          </div>
          <div className="bg-white p-1 sm:p-1.5 rounded-lg border border-slate-200">
            <span className="text-[8px] sm:text-[9px] text-slate-500 font-semibold block uppercase truncate">Success</span>
            <span className="text-xs sm:text-sm font-extrabold text-emerald-600">{success}</span>
          </div>
          <div className="bg-white p-1 sm:p-1.5 rounded-lg border border-slate-200">
            <span className="text-[8px] sm:text-[9px] text-slate-500 font-semibold block uppercase truncate">Rate</span>
            <span className="text-xs sm:text-sm font-extrabold text-red-600">{conversionRate}%</span>
          </div>
          <div className="bg-white p-1 sm:p-1.5 rounded-lg border border-slate-200">
            <span className="text-[8px] sm:text-[9px] text-slate-500 font-semibold block uppercase truncate">In-Prog</span>
            <span className="text-xs sm:text-sm font-extrabold text-amber-600">{inProgress}</span>
          </div>
          <div className="bg-white p-1 sm:p-1.5 rounded-lg border border-slate-200">
            <span className="text-[8px] sm:text-[9px] text-slate-500 font-semibold block uppercase truncate">No Answer</span>
            <span className="text-xs sm:text-sm font-extrabold text-slate-600">{notAvailable}</span>
          </div>
          <div className="bg-white p-1 sm:p-1.5 rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
            <span className="text-[8px] sm:text-[9px] text-slate-500 font-semibold block uppercase truncate">Rejected</span>
            <span className="text-xs sm:text-sm font-extrabold text-rose-600">{rejected}</span>
          </div>
        </div>

        {/* Toolbar: Search and Status Filter */}
        <div className="px-2.5 sm:px-5 py-2 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] shrink-0">
          <div className="flex items-center gap-2 w-full sm:max-w-xs md:max-w-sm">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customer, phone, notes..."
                className="w-full pl-8 pr-2.5 py-1.5 sm:py-1 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-md text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between w-full sm:w-auto gap-2">
            <span className="text-slate-500 font-semibold text-[10.5px] sm:text-[11px] shrink-0">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="flex-1 sm:flex-initial bg-white border border-slate-200 rounded-lg sm:rounded-md px-2.5 py-1.5 sm:py-1 text-[10.5px] sm:text-[11px] text-slate-700 font-medium focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Outcomes ({agentRecords.length})</option>
              <option value="Uncalled">Uncalled</option>
              <option value="Success">Success</option>
              <option value="In-progress">In-progress</option>
              <option value="Not Available">Not Available</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Mobile Horizontal Scroll Hint */}
        <div className="sm:hidden px-2.5 py-1 bg-slate-100 text-[10px] text-slate-500 flex items-center justify-between border-b border-slate-200">
          <span>Scroll table horizontally to view columns</span>
          <span className="font-semibold text-slate-700">{displayedRecords.length} records</span>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="min-w-[720px] w-full text-left text-[11px] border-collapse">
            <thead className="sticky top-0 bg-slate-100/95 z-10 text-slate-700 font-bold uppercase tracking-wider text-[8.5px] border-b border-slate-200">
              <tr>
                <th className="py-1.5 px-2.5">Status</th>
                <th className="py-1.5 px-2">Customer Name</th>
                <th className="py-1.5 px-2">Phone Number</th>
                <th className="py-1.5 px-2">Area / Branch</th>
                <th className="py-1.5 px-2">Call Date</th>
                <th className="py-1.5 px-2">Appointment</th>
                <th className="py-1.5 px-2">Agent Feedback</th>
                <th className="py-1.5 px-2">Supervisor Note</th>
                {(currentUser.role === 'SUPERVISOR' || currentUser.role === 'HQ_ADMIN') && (
                  <th className="py-1.5 px-2 text-center">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedRecords.length === 0 ? (
                <tr>
                  <td colSpan={(currentUser.role === 'SUPERVISOR' || currentUser.role === 'HQ_ADMIN') ? 9 : 8} className="py-10 text-center text-slate-400 text-[11px]">
                    <AlertCircle className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                    No records match the current filter in this agent's Excel.
                  </td>
                </tr>
              ) : (
                displayedRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-1.5 px-2.5">
                      <span className={`inline-block px-1.5 py-0.2 rounded-xs text-[8.5px] font-bold tracking-tight whitespace-nowrap border ${getStatusBadgeStyle(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 font-semibold text-slate-900 text-[11px]">
                      {r.customerName}
                    </td>
                    <td className="py-1.5 px-2 font-mono text-slate-700 text-[10.5px]">
                      <div className="flex items-center gap-1">
                        <a href={`tel:${r.phoneNumber}`} className="hover:text-blue-600 flex items-center gap-0.5">
                          <Phone className="w-2.5 h-2.5 text-slate-400" />
                          <span>{r.phoneNumber}</span>
                        </a>
                        <button
                          onClick={(e) => handleCopyPhone(r.id, r.phoneNumber, e)}
                          className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                          title="Copy phone"
                        >
                          {copiedId === r.id ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-1.5 px-2 text-slate-600 text-[11px]">
                      {r.areaOfReg}
                    </td>
                    <td className="py-1.5 px-2 font-mono text-slate-600 text-[10.5px]">
                      {r.callDate || <span className="text-slate-400 italic">-</span>}
                    </td>
                    <td className="py-1.5 px-2">
                      {r.appointment ? (
                        <span className="inline-block font-semibold text-red-700 bg-red-50 px-1 py-0.5 rounded-xs border border-red-200 text-[8.5px] whitespace-nowrap">
                          {r.appointment.replace('T', ' ')}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[9px]">-</span>
                      )}
                    </td>
                    <td className="py-2 px-2.5 max-w-xs text-slate-700 text-[11px] whitespace-pre-wrap break-words leading-relaxed">
                      {r.feedbackNote || <span className="text-slate-400 italic">No notes logged</span>}
                    </td>
                    <td className="py-2 px-2.5 max-w-xs text-[11px] whitespace-pre-wrap break-words leading-relaxed">
                      {r.supervisorNote ? (
                        <span className="text-red-900 font-medium block">
                          {r.supervisorNote}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No directive</span>
                      )}
                    </td>
                    {(currentUser.role === 'SUPERVISOR' || currentUser.role === 'HQ_ADMIN') && (
                      <td className="py-1.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setReassigningRecord(r);
                            setTargetAgentId('');
                            setDirectiveNote('');
                          }}
                          className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
                          title="Assign this customer record to another agent"
                        >
                          <UserCheck className="w-2.5 h-2.5" />
                          <span>Assign</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-3 sm:px-5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 shrink-0">
          <div className="text-[10.5px] sm:text-[11px] text-center sm:text-left">
            Showing <strong className="text-slate-800">{displayedRecords.length}</strong> of{' '}
            <strong className="text-slate-800">{agentRecords.length}</strong> records in {agent.name}'s Excel file
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 sm:py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white rounded-lg sm:rounded-md font-bold transition-colors text-xs sm:text-[11px] cursor-pointer"
          >
            Close Inspection
          </button>
        </div>

      </div>

      {/* Reassign / Assign Modal */}
      {reassigningRecord && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Assign Customer Record</h4>
                  <p className="text-[10px] text-slate-500">Assign to another agent (moves to their Assigned Appointments)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReassigningRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-1.5">
              <div>
                <span className="text-slate-500 font-medium">Customer: </span>
                <strong className="text-slate-900 font-bold">{reassigningRecord.customerName}</strong> ({reassigningRecord.phoneNumber})
              </div>
              <div>
                <span className="text-slate-500 font-medium">Current Agent: </span>
                <strong className="text-slate-800">{agent?.name}</strong>
              </div>
              {reassigningRecord.feedbackNote && (
                <div>
                  <span className="text-slate-500 font-medium">Feedback Note: </span>
                  <span className="text-slate-700 italic">{reassigningRecord.feedbackNote}</span>
                </div>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Assign To Agent <span className="text-red-600">*</span>
                </label>
                <select
                  value={targetAgentId}
                  onChange={(e) => setTargetAgentId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">-- Select Team Member --</option>
                  {availableTargetAgents.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.branch})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Supervisor Directive / Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={directiveNote}
                  onChange={(e) => setDirectiveNote(e.target.value)}
                  placeholder="e.g. Please follow up on this customer immediately..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReassigningRecord(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!targetAgentId}
                onClick={() => {
                  const targetAgent = availableTargetAgents.find(a => a.id === targetAgentId);
                  if (!targetAgent || !agent) return;

                  const updated: CustomerRecord = {
                    ...reassigningRecord,
                    assignedAgentId: targetAgent.id,
                    assignedAgentName: targetAgent.name,
                    appointmentAssignedBySupervisor: true,
                    reassignedFromAgentId: agent.id,
                    reassignedFromAgentName: agent.name,
                    reassignedAt: new Date().toISOString(),
                    appointment: (reassigningRecord.appointment && reassigningRecord.appointment.trim() !== '')
                      ? reassigningRecord.appointment
                      : new Date().toISOString().slice(0, 16),
                    supervisorNote: directiveNote.trim() 
                      ? directiveNote.trim() 
                      : `Assigned to ${targetAgent.name} by Supervisor ${currentUser.name}`,
                    updatedAt: new Date().toISOString()
                  };

                  if (onUpdateRecord) {
                    onUpdateRecord(updated, `Supervisor assigned customer record for ${reassigningRecord.customerName} to ${targetAgent.name}`);
                  }

                  setReassigningRecord(null);
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 active:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
