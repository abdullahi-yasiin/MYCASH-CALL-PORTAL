import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, ShieldCheck, Mail, Phone as PhoneIcon, Building2, User as UserIcon, Check } from 'lucide-react';
import { User } from '../types';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdatePassword: (newPassword: string) => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdatePassword
}) => {
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

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
      setError('Passwords do not match.');
      return;
    }

    onUpdatePassword(trimmedPassword);
    setSuccess(true);
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div id="profile-settings-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div id="profile-settings-box" className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-100 text-red-600 border border-red-200/60 rounded-lg">
              <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">My Profile Settings</h3>
              <p className="text-[10px] sm:text-xs text-slate-500">Configure your password and credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Profile details */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* Redesigned User Information Section */}
          <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
            {/* Header Identity Row */}
            <div className="flex items-center gap-3 pb-3 mb-3 border-b border-slate-200/80">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-red-100 text-red-600 border border-red-200/70 flex items-center justify-center font-black text-xs sm:text-sm shrink-0 shadow-2xs">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate leading-tight">
                    {currentUser.name}
                  </h4>
                  <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-sm text-[9px] sm:text-[10px] font-bold border ${
                    currentUser.role === 'HQ_ADMIN'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : currentUser.role === 'SUPERVISOR'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {currentUser.role === 'HQ_ADMIN' ? 'HQ Admin' : currentUser.role === 'SUPERVISOR' ? 'Supervisor' : 'Team Member'}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[10.5px] text-slate-500 truncate mt-0.5">
                  User Type: <span className="font-semibold text-slate-700">{currentUser.role === 'HQ_ADMIN' ? 'HQ Administrator' : currentUser.role === 'SUPERVISOR' ? 'Branch Supervisor' : 'Tele-Sales Agent'}</span>
                </p>
              </div>
            </div>

            {/* Structured 2x2 Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              {/* Work Email */}
              <div className="flex items-center gap-2 p-1.5 sm:p-2 bg-white border border-slate-200/80 rounded-xl">
                <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <Mail className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] sm:text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">Work Email</span>
                  <span className="font-semibold text-slate-800 text-[10px] sm:text-[10.5px] truncate block" title={currentUser.email}>
                    {currentUser.email}
                  </span>
                </div>
              </div>

              {/* Branch Hub */}
              <div className="flex items-center gap-2 p-1.5 sm:p-2 bg-white border border-slate-200/80 rounded-xl">
                <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <Building2 className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] sm:text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">Assigned Hub</span>
                  <span className="font-semibold text-slate-800 text-[10px] sm:text-[10.5px] truncate block">
                    {currentUser.branch}
                  </span>
                </div>
              </div>

              {/* Mobile Phone */}
              <div className="flex items-center gap-2 p-1.5 sm:p-2 bg-white border border-slate-200/80 rounded-xl">
                <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <PhoneIcon className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] sm:text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">Mobile Phone</span>
                  <span className="font-semibold text-slate-800 text-[10px] sm:text-[10.5px] truncate block">
                    {currentUser.phone || 'Not configured'}
                  </span>
                </div>
              </div>

              {/* Terminal Access Status */}
              <div className="flex items-center gap-2 p-1.5 sm:p-2 bg-white border border-slate-200/80 rounded-xl">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100">
                  <ShieldCheck className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] sm:text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">Terminal Status</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="font-bold text-emerald-700 text-[10px] sm:text-[10.5px]">
                      {currentUser.active !== false ? 'Active & Verified' : 'Deactivated'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="font-bold text-slate-800 text-xs sm:text-sm mb-3 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-red-600" />
              Change Login Password
            </h4>

            {success ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Password changed successfully. Saving secure keys...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1 text-[11px] sm:text-xs">New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 5 characters"
                      className="w-full pl-9 pr-9 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-slate-400 hover:text-slate-600 absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1 text-[11px] sm:text-xs">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded-lg leading-tight">
                    {error}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg font-bold shadow-xs text-xs shadow-red-500/20 cursor-pointer transition-all"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
