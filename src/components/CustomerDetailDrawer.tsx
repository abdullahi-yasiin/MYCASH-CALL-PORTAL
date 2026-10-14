import React, { useState } from 'react';
import { 
  X, 
  Phone, 
  MessageCircle,
  Copy, 
  Check, 
  Calendar, 
  Clock, 
  MessageSquare, 
  ShieldAlert, 
  Lock, 
  Save, 
  Building2, 
  UserCheck, 
  ExternalLink,
  Sparkles,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { CustomerRecord, CallStatus, User, ActivityLog } from '../types';

interface CustomerDetailDrawerProps {
  record: CustomerRecord | null;
  onClose: () => void;
  currentUser: User;
  onUpdateRecord: (updatedRecord: CustomerRecord, changeDetails: string) => void;
  activityLogs: ActivityLog[];
}

export const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({
  record,
  onClose,
  currentUser,
  onUpdateRecord,
  activityLogs
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [tempFeedback, setTempFeedback] = useState<string>('');
  const [tempSupervisorNote, setTempSupervisorNote] = useState<string>('');
  const [tempStatus, setTempStatus] = useState<CallStatus>('Uncalled');
  const [tempCallDate, setTempCallDate] = useState<string>('');
  const [tempAppointment, setTempAppointment] = useState<string>('');

  React.useEffect(() => {
    if (record) {
      setTempFeedback(record.feedbackNote || '');
      setTempSupervisorNote(record.supervisorNote || '');
      setTempStatus(record.status);
      setTempCallDate(record.callDate || '');
      setTempAppointment(record.appointment || '');
    }
  }, [record]);

  if (!record) return null;

  const canEditCustomerInfo = currentUser.role === 'HQ_ADMIN' || currentUser.role === 'SUPERVISOR';
  const canEditSupervisorNote = currentUser.role === 'HQ_ADMIN' || currentUser.role === 'SUPERVISOR';

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(record.phoneNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAll = () => {
    const today = new Date().toISOString().slice(0, 10);
    const hasAppt = Boolean(tempAppointment && tempAppointment.trim() !== '');
    // If appointment is present and status was Uncalled, set status to In-progress
    const finalStatus: CallStatus = (tempStatus === 'Uncalled' && hasAppt) ? 'In-progress' : tempStatus;
    const isCalled = finalStatus !== 'Uncalled' || hasAppt;

    const updated: CustomerRecord = {
      ...record,
      status: finalStatus,
      callDate: tempCallDate || (isCalled ? today : record.callDate),
      appointment: tempAppointment.trim(),
      feedbackNote: tempFeedback.trim(),
      supervisorNote: canEditSupervisorNote ? tempSupervisorNote.trim() : record.supervisorNote,
      hasBeenCalled: isCalled,
      callCount: isCalled ? Math.max(1, record.callCount || 1) : 0,
      updatedAt: new Date().toISOString()
    };

    onUpdateRecord(updated, `Saved full dossier updates for ${record.customerName}`);
    onClose();
  };

  // Filter logs for this record
  const recordLogs = activityLogs.filter(l => l.recordId === record.id);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Centered Modal Popup */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-dossier-title"
        className="relative w-full max-w-2xl bg-white shadow-2xl border border-slate-300 rounded-md flex flex-col max-h-[90vh] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 my-auto"
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex items-start justify-between shrink-0">
          <div>
            <div className="hidden items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-blue-500/30 text-blue-300 border border-blue-500/40">
                {record.areaOfReg}
              </span>
              {record.hasBeenCalled && (
                <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Called (Deduplicated)
                </span>
              )}
              <span className="px-2 py-0.5 rounded-xs text-[9px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                Centered Dossier Popup
              </span>
            </div>
            <h3 id="customer-dossier-title" className="font-extrabold text-base sm:text-lg text-white tracking-tight">
              {record.customerName}
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {record.phoneNumber}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Close dossier popup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Communication Bar */}
        <div className="px-5 sm:px-6 py-2.5 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Native Dial */}
            <a
              href={`tel:${record.phoneNumber}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Now</span>
            </a>

            {/* WhatsApp Call / Message Direct Action */}
            <a
              href={`https://wa.me/${record.phoneNumber.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white rounded font-semibold shadow-xs transition-colors cursor-pointer"
              title={`Open WhatsApp call / chat with ${record.phoneNumber}`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Whatsapp Call</span>
            </a>

            {/* Copy Phone */}
            <button
              onClick={handleCopyPhone}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded font-medium transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-500">
            Agent: <strong className="text-slate-800">{record.assignedAgentName}</strong>
          </span>
        </div>

        {/* Modal Body Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs font-table-data">
          
          {/* Status & Outcome Selector */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2.5">
            <label className="font-bold text-slate-800 text-xs block">
              Call Outcome Status (Unique Call Rule)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2">
              {(['Success', 'In-progress', 'Not Available', 'Rejected', 'Uncalled'] as CallStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setTempStatus(st)}
                  className={`py-1.5 px-2 rounded-sm font-bold text-xs border text-center transition-all cursor-pointer ${
                    tempStatus === st
                      ? st === 'Success'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : st === 'In-progress'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : st === 'Not Available'
                        ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                        : st === 'Rejected'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-zinc-700 text-white border-zinc-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Changing status will automatically stamp call date and mark as unique call without re-incrementing total count.
            </p>
          </div>

          {/* Date and Follow-up Appointment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Call Contact Date
              </label>
              <input
                type="date"
                value={tempCallDate}
                onChange={(e) => setTempCallDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-red-600" />
                  Scheduled Appointment
                </label>
                {tempAppointment && (
                  <button
                    type="button"
                    onClick={() => setTempAppointment('')}
                    className="text-[11px] text-red-600 hover:text-red-800 font-semibold cursor-pointer flex items-center gap-0.5"
                    title="Clear appointment"
                  >
                    <X className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
              <input
                type="datetime-local"
                value={
                  tempAppointment.includes('T') 
                    ? tempAppointment.slice(0, 16) 
                    : tempAppointment.match(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/)
                    ? tempAppointment.replace(/\s+/, 'T').slice(0, 16)
                    : tempAppointment.match(/^\d{4}-\d{2}-\d{2}$/)
                    ? `${tempAppointment}T09:00`
                    : ''
                }
                onChange={(e) => {
                  setTempAppointment(e.target.value);
                  if (tempStatus === 'Uncalled' && e.target.value) {
                    setTempStatus('In-progress');
                  }
                }}
                className={`w-full bg-white border rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  tempAppointment ? 'border-red-300 bg-red-50/30' : 'border-slate-300'
                }`}
              />
              {tempAppointment && !tempAppointment.match(/^\d{4}-\d{2}-\d{2}/) && (
                <div className="mt-1 text-[11px] text-amber-700 font-medium">
                  Note from import: "{tempAppointment}"
                </div>
              )}
            </div>
          </div>

          {/* Qualitative Feedback Note (Editable by All Roles) */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                Agent Feedback Note
              </span>
              <span className="text-[10px] font-normal text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-xs">
                Editable by Agent
              </span>
            </label>
            <textarea
              rows={3}
              value={tempFeedback}
              onChange={(e) => setTempFeedback(e.target.value)}
              placeholder="Log customer response, specific product inquiries, objections, tariff questions..."
              className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            />
          </div>

          {/* Internal Supervisor Note (Role Protected) */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                Internal Supervisor Note
              </span>
              {!canEditSupervisorNote ? (
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-xs flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked for Agents
                </span>
              ) : (
                <span className="text-[10px] font-normal text-red-600 bg-red-50 px-1.5 py-0.5 rounded-xs">
                  Admin / Supervisor Access
                </span>
              )}
            </label>
            {canEditSupervisorNote ? (
              <textarea
                rows={2}
                value={tempSupervisorNote}
                onChange={(e) => setTempSupervisorNote(e.target.value)}
                placeholder="Manager directives, audit compliance flags, KYC verification dispatch instructions..."
                className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500 text-xs"
              />
            ) : (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-500 italic text-[11px]">
                {record.supervisorNote || 'No internal supervisor note recorded.'}
              </div>
            )}
          </div>

          {/* Call History & Telemetry Logs */}
          <div className="border-t border-slate-200 pt-3 space-y-2">
            <h4 className="font-bold text-slate-800 text-xs">Call & Modification Audit Trail</h4>
            {recordLogs.length === 0 ? (
              <div className="text-[11px] text-slate-400 italic">No previous events logged for this record.</div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {recordLogs.map(l => (
                  <div key={l.id} className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px] space-y-0.5">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="font-semibold text-slate-700">{l.userName} ({l.userRole})</span>
                      <span className="font-mono text-[10px]">{l.timestamp}</span>
                    </div>
                    <div className="text-slate-600">{l.details}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAll}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Changes</span>
          </button>
        </div>

      </div>
    </div>
  );
};
