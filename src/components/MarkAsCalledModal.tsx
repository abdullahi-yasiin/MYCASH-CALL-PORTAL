import React, { useState, useEffect } from 'react';
import {
  X,
  PhoneCall,
  CheckCircle2,
  Phone,
  Copy,
  Check,
  Calendar,
  User as UserIcon,
  MapPin,
  AlertCircle,
  Clock
} from 'lucide-react';
import { CustomerRecord, CallStatus, User } from '../types';

interface MarkAsCalledModalProps {
  isOpen: boolean;
  record: CustomerRecord | null;
  currentUser: User;
  onClose: () => void;
  onSave: (record: CustomerRecord, feedbackNote: string, status: CallStatus) => void;
}

export const MarkAsCalledModal: React.FC<MarkAsCalledModalProps> = ({
  isOpen,
  record,
  currentUser,
  onClose,
  onSave
}) => {
  const [feedbackNote, setFeedbackNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<CallStatus>('Success');
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (record) {
      setFeedbackNote(record.feedbackNote || '');
      setSelectedStatus(record.status && record.status !== 'Uncalled' ? record.status : 'Success');
      setValidationError('');
    }
  }, [record, isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !record) return null;

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(record.phoneNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedNote = feedbackNote.trim();
    if (!trimmedNote) {
      setValidationError('Customer Feedback Note is required to complete this appointment.');
      return;
    }

    onSave(record, trimmedNote, selectedStatus);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4 my-8 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/70">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                <span>Mark as Called</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Appointment Completed
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Log customer feedback to record this callback in <strong>Previous Appointments</strong>.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Customer Context Summary */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-sm">
                {record.customerName}
              </span>
              <span className="text-[9.5px] font-bold px-1.5 py-0.2 bg-white text-slate-700 rounded border border-slate-200">
                {record.areaOfReg}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
              <a href={`tel:${record.phoneNumber}`} className="flex items-center gap-1 hover:text-blue-600">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>{record.phoneNumber}</span>
              </a>
              <button
                type="button"
                onClick={handleCopyPhone}
                className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer ml-1"
                title="Copy phone"
              >
                {copied ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-red-600" />
              <span>Scheduled: <strong className="text-red-700 font-bold">{record.appointment ? record.appointment.replace('T', ' ') : 'Callback Requested'}</strong></span>
            </span>
            <span className="flex items-center gap-1">
              <UserIcon className="w-3 h-3 text-blue-600" />
              <span>Agent: <strong className="text-slate-800">{record.assignedAgentName || currentUser.name}</strong></span>
            </span>
          </div>

          {record.supervisorNote && (
            <div className="p-2 bg-amber-50/90 border border-amber-200 rounded-lg text-[10.5px] text-amber-900">
              <span className="font-bold block text-[9.5px] uppercase tracking-wide text-amber-800 mb-0.5">
                Supervisor Directive:
              </span>
              <p className="italic">{record.supervisorNote}</p>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Outcome Status Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Call Outcome Status <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(['Success', 'In-progress', 'Not Available', 'Rejected'] as CallStatus[]).map((status) => {
                const isSelected = selectedStatus === status;
                let activeStyle = 'bg-slate-900 text-white border-slate-900';
                if (status === 'Success') activeStyle = 'bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-500/20';
                if (status === 'In-progress') activeStyle = 'bg-amber-600 text-white border-amber-600 shadow-xs shadow-amber-500/20';
                if (status === 'Rejected') activeStyle = 'bg-rose-600 text-white border-rose-600 shadow-xs shadow-rose-500/20';
                if (status === 'Not Available') activeStyle = 'bg-slate-700 text-white border-slate-700';

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setSelectedStatus(status);
                      setValidationError('');
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                      isSelected
                        ? activeStyle
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>



          {/* Customer Feedback Note */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                Customer Feedback Note <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">
                {feedbackNote.length} characters
              </span>
            </div>
            <textarea
              rows={4}
              value={feedbackNote}
              onChange={(e) => {
                setFeedbackNote(e.target.value);
                if (e.target.value.trim()) setValidationError('');
              }}
              placeholder="Record customer response, discussed terms, product preference, and outcome details (required to complete callback)..."
              className={`w-full bg-white border rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 leading-relaxed ${
                validationError
                  ? 'border-red-400 focus:ring-red-400 bg-red-50/20'
                  : 'border-slate-300 focus:ring-emerald-500'
              }`}
              autoFocus
            />
            {validationError && (
              <p className="text-[11px] font-semibold text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{validationError}</span>
              </p>
            )}
          </div>

          {/* Visibility Info */}
          <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-[11px] text-emerald-950 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Recorded in Previous Appointments:</strong>
              <p className="text-emerald-900 text-[10.5px] mt-0.5 leading-tight">
                This record will be saved with your feedback note, timestamped, and immediately available in the <strong>Previous Appointments</strong> tab.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save & Complete Appointment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
