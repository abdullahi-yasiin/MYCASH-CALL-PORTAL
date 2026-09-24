import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { User } from '../types';
import { PasswordForceChangeModal } from './PasswordForceChangeModal';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  allUsers: User[];
  onCancelOrBack?: () => void;
  currentUser?: User | null;
  onUpdateUser?: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  allUsers,
  onCancelOrBack,
  currentUser,
  onUpdateUser
}) => {
  const [email, setEmail] = useState<string>(() => {
    return currentUser?.email || '';
  });
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password Force Change state for newly created users or users with standard 'amal123' password
  const [pendingForceChangeUser, setPendingForceChangeUser] = useState<User | null>(null);

  // Forgot Password state
  const [isForgotPassword, setIsForgotPassword] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetSubmitted, setResetSubmitted] = useState<boolean>(false);

  const handleLogin = (userToLogin?: User) => {
    setIsLoading(true);
    setErrorMessage(null);

    setTimeout(() => {
      setIsLoading(false);
      if (userToLogin) {
        const requiresChange = userToLogin.mustChangePassword ?? (userToLogin.password === 'amal123' && userToLogin.id !== 'u-admin-1');
        if (requiresChange) {
          setPendingForceChangeUser(userToLogin);
          return;
        }
        onLoginSuccess(userToLogin);
        return;
      }

      const match = allUsers.find(
        u => u.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (match) {
        const expectedPassword = match.password || 'amal123';
        if (password === expectedPassword) {
          // If account has mustChangePassword flag or is still on the standard 'amal123' password, trigger force change modal
          const requiresChange = match.mustChangePassword ?? (expectedPassword === 'amal123' && match.id !== 'u-admin-1');

          if (requiresChange) {
            setPendingForceChangeUser(match);
            return;
          }

          onLoginSuccess(match);
        } else {
          setErrorMessage('Invalid password. (If your account was newly created or reset, please use standard "amal123")');
        }
      } else {
        setErrorMessage('Account not found with this email address.');
      }
    }, 350);
  };

  const handleForcePasswordChangeComplete = (newPrivatePassword: string) => {
    if (!pendingForceChangeUser) return;
    const updatedUser: User = {
      ...pendingForceChangeUser,
      password: newPrivatePassword,
      mustChangePassword: false,
    };

    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }

    setPendingForceChangeUser(null);
    onLoginSuccess(updatedUser);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setResetSubmitted(true);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col items-center justify-center p-3 sm:p-6 font-sans relative overflow-hidden">
      {/* Ambient background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-red-500/8 via-rose-500/4 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-gradient-to-t from-slate-200/50 to-transparent rounded-full blur-2xl" />
      </div>

      <div className="w-full max-w-[340px] xs:max-w-sm sm:max-w-[410px] relative z-10">
        {/* Main Card */}
        <div className="bg-white border border-slate-200/90 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.09),0_1px_3px_rgba(15,23,42,0.04)] rounded-2xl sm:rounded-3xl p-5 sm:p-8 relative overflow-hidden backdrop-blur-sm">
          
          {/* Subtle top accent bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-600" />

          {/* Brand Header */}
          <div className="text-center mb-5 sm:mb-6 pt-1">
            <img 
              src="/images/LOGODES..png" 
              alt="MyCash Logo" 
              className="w-20 h-20 sm:w-28 sm:h-28 object-contain mx-auto -mt-4 sm:-mt-7 -mb-4 sm:-mb-6 shrink-0 relative -top-2 sm:-top-3.5" 
            />
            <h1 className="text-base sm:text-lg font-extrabold text-slate-950 tracking-tight leading-tight">
              MYCASH CALLING PORTAL
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1">
              {isForgotPassword ? 'Reset your corporate account password' : 'Sign in to access your call workspace'}
            </p>
          </div>

          {!isForgotPassword ? (
            /* Sign In Form */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="space-y-3.5 sm:space-y-4"
            >
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-red-600 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-red-600 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50/90 border border-rose-200/90 rounded-xl text-[11px] sm:text-xs text-rose-700 flex items-start gap-2 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 sm:h-11 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-red-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Forgot Password Form */
            <form onSubmit={handleResetPassword} className="space-y-3.5 sm:space-y-4">
              {resetSubmitted ? (
                <div className="p-4 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl text-xs text-emerald-800 flex flex-col gap-2.5 text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-sm text-emerald-950">Reset Instructions Sent</div>
                  <p className="text-slate-600 leading-relaxed">
                    We sent password recovery instructions to <span className="font-semibold text-slate-900">{resetEmail || 'your email'}</span>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetSubmitted(false);
                    }}
                    className="mt-2 inline-flex items-center justify-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-bold hover:underline cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                      Work Email Address
                    </label>
                    <div className="relative group">
                      <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-red-600 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="name@mycash.portal"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-10 sm:h-11 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-red-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Request...</span>
                      </>
                    ) : (
                      <span>Send Reset Link</span>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {/* Trust badge footer inside card */}
          <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10.5px] text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>256-bit Encrypted Session • Authorized Access Only</span>
          </div>

        </div>

        {/* Outer footer note */}
        <p className="text-center text-[10.5px] text-slate-400 mt-4">
          © {new Date().getFullYear()} MyCash Calling Portal. All rights reserved.
        </p>
      </div>

      {/* Force Change Password Modal for accounts with standard 'amal123' password */}
      {pendingForceChangeUser && (
        <PasswordForceChangeModal
          userName={pendingForceChangeUser.name}
          onPasswordChange={handleForcePasswordChangeComplete}
          onCancel={() => {
            setPendingForceChangeUser(null);
            setPassword('');
          }}
        />
      )}
    </div>
  );
};
