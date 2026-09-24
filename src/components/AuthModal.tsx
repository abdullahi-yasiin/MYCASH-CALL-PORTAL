import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  KeyRound, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onLogin: (user: User) => void;
  allUsers: User[];
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onLogin,
  allUsers
}) => {
  const [email, setEmail] = useState<string>('admin@mycash.portal');
  const [password, setPassword] = useState<string>('••••••••••••');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isResetMode, setIsResetMode] = useState<boolean>(false);
  const [resetSent, setResetSent] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const foundUser = allUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (foundUser) {
      onLogin(foundUser);
    } else {
      setErrorMessage('Invalid credentials. Please select one of the demonstration accounts below.');
    }
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetSent(true);
    setTimeout(() => {
      setResetSent(false);
      setIsResetMode(false);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="p-6 bg-slate-900 text-white text-center relative">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-500 via-blue-600 to-emerald-400 mx-auto flex items-center justify-center font-black text-xl shadow-lg mb-3">
            MC
          </div>
          <h2 className="text-lg font-bold tracking-tight">MYCASH CALLING PORTAL</h2>
          <p className="text-xs text-slate-300 mt-1">
            Enterprise Tele-Sales & Multi-Branch Calling Platform
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {!isResetMode ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="name@mycash.portal"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsResetMode(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter password"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Remember me for 30 days</span>
                </label>
              </div>

              {errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Sign In to Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-3.5">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <KeyRound className="w-4 h-4 text-blue-600" />
                <span>Reset Portal Password</span>
              </div>
              <p className="text-xs text-slate-500">
                Enter your official MyCash work email address to receive an instant verification link and one-time passcode.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="name@mycash.portal"
                  />
                </div>
              </div>

              {resetSent && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Password recovery instructions sent to {email}! Returning to login...</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetMode(false)}
                  className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Back to Sign In
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Send Reset Link
                </button>
              </div>
            </form>
          )}

          {/* Quick Demo Selector for Reviewers */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              <span>Instant Demo Account Sign-In:</span>
            </div>
            <div className="space-y-1.5">
              {allUsers.slice(0, 3).map((u) => (
                <button
                  key={u.id}
                  onClick={() => onLogin(u)}
                  className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{u.name}</div>
                    <div className="text-[11px] text-slate-500">{u.role} • {u.branch}</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    Sign In
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
