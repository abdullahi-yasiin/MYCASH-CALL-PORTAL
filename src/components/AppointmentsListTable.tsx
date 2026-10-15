import React, { useState } from 'react';
import {
  PhoneCall,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Phone,
  Copy,
  Check,
  UserCheck,
  AlertCircle,
  FileText,
  User as UserIcon,
  Tag
} from 'lucide-react';
import { CustomerRecord, User, isRecordAssignedBySupervisor } from '../types';

interface AppointmentsListTableProps {
  records: CustomerRecord[];
  type: 'upcoming' | 'previous';
  currentUser: User;
  onMarkAsCalled?: (record: CustomerRecord) => void;
  onReassign?: (record: CustomerRecord) => void;
  onOpenCustomerDrawer?: (record: CustomerRecord) => void;
  emptyMessage?: string;
}

export const AppointmentsListTable: React.FC<AppointmentsListTableProps> = ({
  records,
  type,
  currentUser,
  onMarkAsCalled,
  onReassign,
  onOpenCustomerDrawer,
  emptyMessage
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyPhone = (id: string, phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isSupervisorOrHQ = currentUser.role === 'SUPERVISOR' || currentUser.role === 'HQ_ADMIN';

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('SUCCESS')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (s.includes('PROGRESS')) return 'bg-amber-100 text-amber-800 border-amber-300';
    if (s.includes('REJECT')) return 'bg-rose-100 text-rose-800 border-rose-300';
    if (s.includes('NOT AVAILABLE')) return 'bg-slate-100 text-slate-700 border-slate-300';
    if (s.includes('APPOINTMENT')) return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[7.5px] sm:text-[9px] border-b border-slate-200">
              {type === 'upcoming' ? (
                <>
                  {/* Action Column in front! */}
                  <th className="py-2 px-3 text-center w-36">Action</th>
                  <th className="py-2 px-3">Customer Name</th>
                  <th className="py-2 px-3">Phone</th>
                  <th className="py-2 px-3">Scheduled Callback</th>
                  <th className="py-2 px-3">Area / Branch</th>
                  {isSupervisorOrHQ && <th className="py-2 px-3">Assigned Agent</th>}
                  <th className="py-2 px-3">Feedback / Notes</th>
                  <th className="py-2 px-3">Supervisor Note</th>
                </>
              ) : (
                <>
                  <th className="py-2 px-3 text-center w-24">Status</th>
                  <th className="py-2 px-3">Customer Name</th>
                  <th className="py-2 px-3">Phone</th>
                  <th className="py-2 px-3">Area / Branch</th>
                  <th className="py-2 px-3">Scheduled Time</th>
                  <th className="py-2 px-3">Called At</th>
                  {isSupervisorOrHQ && <th className="py-2 px-3">Agent</th>}
                  <th className="py-2 px-3">Customer Feedback Note</th>
                  <th className="py-2 px-3 text-center">Outcome</th>
                  {onOpenCustomerDrawer && <th className="py-2 px-3 text-center">Dossier</th>}
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length === 0 ? (
              <tr>
                <td
                  colSpan={type === 'upcoming' ? (isSupervisorOrHQ ? 8 : 7) : (isSupervisorOrHQ ? 10 : 9)}
                  className="py-12 text-center text-slate-400 text-xs"
                >
                  <AlertCircle className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                  <span>{emptyMessage || (type === 'upcoming' ? 'No upcoming callback appointments found.' : 'No previous completed appointments recorded yet.')}</span>
                </td>
              </tr>
            ) : (
              records.map((r) => {
                const isSuperAssigned = isRecordAssignedBySupervisor(r);

                if (type === 'upcoming') {
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/90 transition-colors">
                      {/* ACTION BUTTON IN FRONT */}
                      <td className="py-2.5 px-3 text-center align-middle whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {onMarkAsCalled && (
                            <button
                              type="button"
                              onClick={() => onMarkAsCalled(r)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg font-bold text-[10px] sm:text-[11px] shadow-2xs transition-all cursor-pointer active:scale-95"
                              title="Mark this customer as called and log customer feedback note"
                            >
                              <PhoneCall className="w-3 h-3 shrink-0" />
                              <span>Mark as Called</span>
                            </button>
                          )}
                          {isSupervisorOrHQ && onReassign && (
                            <button
                              type="button"
                              onClick={() => onReassign(r)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg font-bold text-[10px] transition-colors cursor-pointer"
                              title="Reassign appointment to another agent"
                            >
                              <UserCheck className="w-3 h-3 shrink-0" />
                              <span>Reassign</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Customer Name */}
                      <td className="py-2.5 px-3 font-bold text-slate-900 text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenCustomerDrawer?.(r)}
                            className="hover:text-blue-600 transition-colors text-left cursor-pointer"
                          >
                            {r.customerName}
                          </button>
                          <span className={`px-1.5 py-0.2 rounded-xs text-[8.5px] font-bold border ${getStatusBadge(r.status)}`}>
                            {r.status}
                          </span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-2.5 px-3 font-mono text-slate-700 text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <a href={`tel:${r.phoneNumber}`} className="hover:text-blue-600 flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            <span>{r.phoneNumber}</span>
                          </a>
                          <button
                            type="button"
                            onClick={(e) => handleCopyPhone(r.id, r.phoneNumber, e)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                            title="Copy phone"
                          >
                            {copiedId === r.id ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Scheduled Callback */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded border border-red-200 text-[10.5px]">
                          <Clock className="w-3 h-3 text-red-600 shrink-0" />
                          <span>{r.appointment ? r.appointment.replace('T', ' ') : 'Callback Requested'}</span>
                        </span>
                        {isSuperAssigned && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                              <UserCheck className="w-2.5 h-2.5 text-amber-600" />
                              Assigned by Supervisor
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Branch */}
                      <td className="py-2.5 px-3 text-slate-600 text-xs">
                        {r.areaOfReg}
                      </td>

                      {/* Assigned Agent */}
                      {isSupervisorOrHQ && (
                        <td className="py-2.5 px-3 font-medium text-slate-800 text-xs">
                          {r.assignedAgentName}
                        </td>
                      )}

                      {/* Feedback / Notes */}
                      <td className="py-2.5 px-3 text-slate-700 text-xs max-w-xs">
                        {r.feedbackNote ? (
                          <div className="whitespace-normal break-words bg-slate-50 border border-slate-200/80 rounded-lg p-2 text-[11px] leading-relaxed text-slate-800">
                            {r.feedbackNote}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No notes logged</span>
                        )}
                      </td>

                      {/* Supervisor Note */}
                      <td className="py-2.5 px-3 text-slate-700 text-xs max-w-xs">
                        {r.supervisorNote ? (
                          <div className="whitespace-normal break-words bg-amber-50/90 border border-amber-200 rounded-lg p-2 text-[10.5px] leading-relaxed text-amber-900 font-medium">
                            {r.supervisorNote}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[10.5px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                }

                // Previous Appointments Row
                return (
                  <tr key={r.id} className="hover:bg-slate-50/90 transition-colors">
                    {/* Status Badge */}
                    <td className="py-2.5 px-3 text-center align-middle whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                        Called
                      </span>
                    </td>

                    {/* Customer Name */}
                    <td className="py-2.5 px-3 font-bold text-slate-900 text-xs">
                      <button
                        type="button"
                        onClick={() => onOpenCustomerDrawer?.(r)}
                        className="hover:text-blue-600 transition-colors text-left cursor-pointer"
                      >
                        {r.customerName}
                      </button>
                    </td>

                    {/* Phone */}
                    <td className="py-2.5 px-3 font-mono text-slate-700 text-[11px] whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <a href={`tel:${r.phoneNumber}`} className="hover:text-blue-600 flex items-center gap-0.5">
                          <Phone className="w-2.5 h-2.5 text-slate-400" />
                          <span>{r.phoneNumber}</span>
                        </a>
                        <button
                          type="button"
                          onClick={(e) => handleCopyPhone(r.id, r.phoneNumber, e)}
                          className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                          title="Copy phone"
                        >
                          {copiedId === r.id ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                        </button>
                      </div>
                    </td>

                    {/* Area / Branch */}
                    <td className="py-2.5 px-3 text-slate-600 text-xs">
                      {r.areaOfReg}
                    </td>

                    {/* Scheduled Time */}
                    <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                      {r.appointment ? r.appointment.replace('T', ' ') : '—'}
                    </td>

                    {/* Called At */}
                    <td className="py-2.5 px-3 text-emerald-800 font-semibold text-[11px] whitespace-nowrap">
                      {r.appointmentCompletedAt
                        ? new Date(r.appointmentCompletedAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : r.callDate || '—'}
                    </td>

                    {/* Agent */}
                    {isSupervisorOrHQ && (
                      <td className="py-2.5 px-3 font-medium text-slate-800 text-xs">
                        {r.appointmentCompletedBy || r.assignedAgentName}
                      </td>
                    )}

                    {/* Customer Feedback Note */}
                    <td className="py-2.5 px-3 text-slate-800 text-xs max-w-sm">
                      <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-2 text-[11px] leading-relaxed text-slate-800">
                        <div className="flex items-center gap-1 text-[9.5px] font-bold text-emerald-800 mb-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Logged Feedback:</span>
                        </div>
                        <p className="italic font-normal">"{r.feedbackNote || 'Completed callback.'}"</p>
                      </div>
                    </td>

                    {/* Outcome Status */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>

                    {/* Dossier button */}
                    {onOpenCustomerDrawer && (
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenCustomerDrawer(r)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10.5px] font-bold transition-colors cursor-pointer"
                        >
                          Dossier
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
