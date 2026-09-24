import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Calendar, 
  MessageSquare, 
  MessageCircle,
  Copy, 
  Check, 
  X, 
  Sparkles,
  Zap,
  RotateCcw
} from 'lucide-react';
import { CustomerRecord, CallStatus, User } from '../types';

interface FocusCallingModeProps {
  records: CustomerRecord[];
  currentUser: User;
  onUpdateRecord: (updatedRecord: CustomerRecord, changeDetails: string) => void;
  onExit: () => void;
}

export const FocusCallingMode: React.FC<FocusCallingModeProps> = ({
  records,
  currentUser,
  onUpdateRecord,
  onExit
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [callSeconds, setCallSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [note, setNote] = useState<string>('');
  const [appointment, setAppointment] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Focus queue: prioritize uncalled, or current list
  const queue = records.filter(r => currentUser.role === 'TEAM_MEMBER' ? r.assignedAgentId === currentUser.id : true);
  const currentRecord = queue[currentIndex] || queue[0];

  useEffect(() => {
    let timer: any = null;
    if (isTimerRunning) {
      timer = setInterval(() => {
        setCallSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning]);

  useEffect(() => {
    if (currentRecord) {
      setNote(currentRecord.feedbackNote || '');
      setAppointment(currentRecord.appointment || '');
      setCallSeconds(0);
      setIsTimerRunning(false);
    }
  }, [currentIndex, currentRecord]);

  if (!currentRecord) {
    return (
      <div className="p-6 sm:p-12 text-center bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl max-w-lg mx-auto">
        <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-500 mx-auto mb-3" />
        <h3 className="text-base sm:text-lg font-bold text-slate-900">Queue Completed!</h3>
        <p className="text-xs text-slate-500 mt-1">
          No records match your active focus queue filter.
        </p>
        <button
          onClick={onExit}
          className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all"
        >
          Return to Table Grid
        </button>
      </div>
    );
  }

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(currentRecord.phoneNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisposition = (status: CallStatus) => {
    const today = new Date().toISOString().slice(0, 10);
    const updated: CustomerRecord = {
      ...currentRecord,
      status,
      callDate: today,
      appointment: appointment.trim(),
      feedbackNote: note.trim(),
      hasBeenCalled: true,
      callCount: Math.max(1, currentRecord.callCount),
      updatedAt: new Date().toISOString()
    };

    onUpdateRecord(updated, `Focus Mode outcome logged: ${status} (Call duration: ${formatTimer(callSeconds)})`);

    // Auto advance to next record if available
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const progressPercent = queue.length > 0 ? Math.round(((currentIndex + 1) / queue.length) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-lg sm:shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Top Banner */}
      <div className="px-3.5 sm:px-6 py-3 sm:py-4 bg-slate-900 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          {/* Header Left: Icon, Title, Lead count & Mobile Close Button */}
          <div className="flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="p-1.5 sm:p-2 bg-blue-500/20 text-blue-300 rounded-lg sm:rounded-xl border border-blue-500/30 shrink-0">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white truncate">
                    Focus Calling Mode
                  </h3>
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                    High Productivity
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                  Lead <span className="text-white font-semibold">{currentIndex + 1}</span> of {queue.length} in active queue
                </p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onExit}
              className="sm:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0 ml-2 cursor-pointer"
              title="Exit Focus Mode"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Header Right: Call Timer & Desktop Close Button */}
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto pt-1.5 sm:pt-0 border-t border-slate-800/80 sm:border-t-0">
            {/* Mobile Productivity Chip */}
            <span className="sm:hidden px-2 py-0.5 rounded text-[9.5px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              High Productivity
            </span>

            {/* Call Timer Widget */}
            <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-slate-800 rounded-lg sm:rounded-xl border border-slate-700">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
              <span className="font-mono font-bold text-xs sm:text-sm text-white">
                {formatTimer(callSeconds)}
              </span>
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`px-2 py-0.5 rounded text-[9.5px] sm:text-[10px] font-bold transition-colors cursor-pointer ${
                  isTimerRunning ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                }`}
              >
                {isTimerRunning ? 'Pause' : 'Start'}
              </button>
            </div>

            {/* Desktop Close Button */}
            <button
              onClick={onExit}
              className="hidden sm:flex p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              title="Exit to Table View"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Focus Card */}
      <div className="p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
        {/* Customer Primary Details */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-5 bg-slate-50 border border-slate-200/90 rounded-xl sm:rounded-2xl">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
              <span className="px-2 sm:px-2.5 py-0.5 rounded-xs text-[10px] sm:text-xs font-semibold bg-blue-100 text-blue-800 shrink-0">
                {currentRecord.areaOfReg}
              </span>
              <span className="text-[11px] sm:text-xs text-slate-500 truncate">
                Current Status: <strong className="text-slate-800">{currentRecord.status}</strong>
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight break-words">
              {currentRecord.customerName}
            </h2>
            <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2">
              <span className="font-mono text-sm sm:text-base md:text-lg font-bold text-slate-700">
                {currentRecord.phoneNumber}
              </span>
              <button
                onClick={handleCopyPhone}
                className="p-1 sm:p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Copy phone number"
              >
                {copied ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2.5">
            <a
              id="btn-direct-dial"
              href={`tel:${currentRecord.phoneNumber}`}
              onClick={() => setIsTimerRunning(true)}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm shadow-sm hover:shadow-md transition-all cursor-pointer whitespace-nowrap"
              title={`Direct dial ${currentRecord.phoneNumber}`}
            >
              <Phone className="w-4 h-4 shrink-0" />
              <span>Direct Dial</span>
            </a>

            <a
              id="btn-whatsapp-call"
              href={`https://wa.me/${currentRecord.phoneNumber.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsTimerRunning(true)}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-[#25D366] hover:bg-[#20ba59] active:bg-[#1caa51] text-white rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm shadow-sm hover:shadow-md transition-all cursor-pointer whitespace-nowrap"
              title={`Open WhatsApp call / chat with ${currentRecord.phoneNumber}`}
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>WhatsApp Call</span>
            </a>
          </div>
        </div>

        {/* Notes & Follow-up Scheduler */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1 sm:space-y-1.5">
            <label className="text-[11px] sm:text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Call Notes & Customer Feedback</span>
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Record feedback, customer reaction, queries about MyCash transactions or balance..."
              className="w-full p-2.5 sm:p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            <div>
              <label className="text-[11px] sm:text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1 sm:mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>Schedule Appointment / Callback</span>
              </label>
              <input
                type="datetime-local"
                value={appointment}
                onChange={(e) => setAppointment(e.target.value)}
                className="w-full p-2 sm:p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {currentRecord.supervisorNote && (
              <div className="p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-xl text-xs">
                <strong className="text-red-900 block mb-0.5 font-bold">Supervisor Instruction:</strong>
                <p className="text-red-700 leading-relaxed">{currentRecord.supervisorNote}</p>
              </div>
            )}
          </div>
        </div>

        {/* 1-Click Call Dispositions */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-[11px] sm:text-xs font-bold text-slate-700 block">
              Select Call Disposition:
            </label>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
              Auto-saves and advances to next lead
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
            <button
              onClick={() => handleDisposition('Success')}
              className="h-full min-h-[60px] sm:min-h-[72px] py-2.5 sm:py-3.5 px-2 sm:px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl font-bold text-[11px] sm:text-xs shadow-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="leading-tight text-center">Success</span>
            </button>

            <button
              onClick={() => handleDisposition('In-progress')}
              className="h-full min-h-[60px] sm:min-h-[72px] py-2.5 sm:py-3.5 px-2 sm:px-3 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-white rounded-xl font-bold text-[11px] sm:text-xs shadow-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="leading-tight text-center">In-progress</span>
            </button>

            <button
              onClick={() => handleDisposition('Not Available')}
              className="h-full min-h-[60px] sm:min-h-[72px] py-2.5 sm:py-3.5 px-2 sm:px-3 bg-slate-700 hover:bg-slate-600 active:scale-[0.98] text-white rounded-xl font-bold text-[11px] sm:text-xs shadow-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="leading-tight text-center">Not Available</span>
            </button>

            <button
              onClick={() => handleDisposition('Rejected')}
              className="h-full min-h-[60px] sm:min-h-[72px] py-2.5 sm:py-3.5 px-2 sm:px-3 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white rounded-xl font-bold text-[11px] sm:text-xs shadow-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="leading-tight text-center">Rejected</span>
            </button>
          </div>
        </div>

        {/* Bottom Pagination & Progress */}
        <div className="pt-3 sm:pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4 text-xs">
          {/* Mobile Progress Bar (Full Width on Mobile) */}
          <div className="flex sm:hidden items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Lead {currentIndex + 1} of {queue.length}</span>
            <span className="font-bold text-slate-700">{progressPercent}% Complete</span>
          </div>
          <div className="w-full sm:hidden h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center justify-between w-full gap-2">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              className="flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-lg font-medium text-xs transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span>Previous Lead</span>
            </button>

            {/* Desktop Progress Bar (Hidden on Mobile) */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-slate-500 font-medium whitespace-nowrap">
                Progress: {currentIndex + 1} / {queue.length}
              </span>
              <div className="w-24 lg:w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <button
              disabled={currentIndex >= queue.length - 1}
              onClick={() => setCurrentIndex(prev => Math.min(queue.length - 1, prev + 1))}
              className="flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-lg font-medium text-xs transition-colors cursor-pointer"
            >
              <span>Next Lead</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
