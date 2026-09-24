import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, ShieldAlert } from 'lucide-react';

interface PasswordForceChangeModalProps {
  userName: string;
  onPasswordChange: (newPassword: string) => void;
  onCancel?: () => void;
}

export const PasswordForceChangeModal: React.FC<PasswordForceChangeModalProps> = ({
  userName,
  onPasswordChange,
  onCancel
}) => {
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedPassword = newPassword.trim();
    if (trimmedPassword.length < 5) {
      setError('Password must be at least 5 characters long.');
      return;
    }

    if (trimmedPassword === 'amal123') {
      setError('You cannot use the standard temporary password. Please choose a unique password.');
      return;
    }

    if (trimmedPassword !== confirmPassword.trim()) {
      setError('Passwords do not match. Please try again.');
      return;
    }

    setIsSuccess(true);
    setTimeout(() => {
      onPasswordChange(trimmedPassword);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-red-500/30 mx-auto mb-3">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">Protect Your Account</h2>
          <p className="text-xs text-slate-500 mt-1.5 px-2">
            Hi <span className="font-semibold text-slate-900">{userName}</span>, you are logging in with a temporary password or your password was recently reset. Please configure a new personal password to continue.
          </p>
        </div>

        {isSuccess ? (
          <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-xl text-center flex flex-col items-center justify-center gap-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-bounce" />
            <div className="font-bold text-sm text-slate-900">Password Updated Successfully</div>
            <p className="text-xs text-slate-500">
              Encrypting security keys and establishing session environment...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 5 characters"
                  className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Verify password"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full h-11 bg-red-600 hover:bg-red-500 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-red-200 flex items-center justify-center gap-2 transition-all cursor-pointer mt-4"
            >
              Confirm and Unlock Portal
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer pt-1"
              >
                Cancel and back to sign in
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
