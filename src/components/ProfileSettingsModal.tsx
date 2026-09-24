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
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <UserIcon className="w-4 h-4 sm:w-5 sm:h-5" />
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
          
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 sm:p-4 space-y-2.5">
            <div className="flex items-start gap-2.5 text-xs">
              <UserIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Account Holder</span>
                <span className="font-extrabold text-slate-800 text-sm">{currentUser.name}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-xs">
              <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Work Email</span>
                <span className="font-semibold text-slate-800">{currentUser.email}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-xs">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Branch/Region Assignment</span>
                <span className="font-semibold text-slate-800">{currentUser.branch}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-xs">
              <PhoneIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Mobile Number</span>
                <span className="font-semibold text-slate-800">{currentUser.phone || 'None'}</span>
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
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs text-xs"
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
