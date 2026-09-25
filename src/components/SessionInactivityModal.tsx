import React, { useEffect } from 'react';
import { Clock, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';

interface SessionInactivityModalProps {
  isOpen: boolean;
  secondsRemaining: number;
  onStayLoggedIn: () => void;
  onLogoutNow: () => void;
}

export const SessionInactivityModal: React.FC<SessionInactivityModalProps> = ({
  isOpen,
  secondsRemaining,
  onStayLoggedIn,
  onLogoutNow
}) => {
  useEffect(() => {
    if (!isOpen) return;

    // Any key press while modal is open automatically extends session
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onStayLoggedIn();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onStayLoggedIn]);

  if (!isOpen) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div 
      id="session-inactivity-modal-backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div 
        id="session-inactivity-modal-box"
        className="bg-white border border-amber-200/90 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-900 relative overflow-hidden"
      >
        {/* Top warning stripe */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-red-500 to-amber-500" />

        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100/90 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-950 leading-tight">
              Session Inactivity Notice
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Portal security auto-close safeguard
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-4">
          You have been inactive for over <strong className="text-slate-900 font-bold">28 minutes</strong>. To safeguard customer records and terminal data, your session will automatically close if not active for <strong className="text-red-600 font-bold">30 minutes</strong>.
        </p>

        {/* Countdown Box */}
        <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Time remaining before auto-close:</span>
          </div>
          <span className="font-mono font-black text-lg sm:text-xl text-amber-700 bg-white px-3 py-1 rounded-lg border border-amber-200 shadow-2xs">
            {formattedTime}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onLogoutNow}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Now</span>
          </button>

          <button
            type="button"
            onClick={onStayLoggedIn}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Stay Signed In</span>
          </button>
        </div>
      </div>
    </div>
  );
};
