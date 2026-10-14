import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Building2, 
  FileText, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Users, 
  LogOut, 
  ShieldCheck, 
  UserCheck, 
  User as UserIcon,
  Sparkles,
  Lock,
  Search,
  Zap,
  Activity,
  ChevronDown,
  Filter,
  RefreshCw,
  Database
} from 'lucide-react';
import { User, UserRole, RoleDefinition } from '../types';
import { checkUserPermission } from '../data/rolesPermissions';

interface HeaderProps {
  currentUser: User;
  allUsers: User[];
  roleDefinitions?: RoleDefinition[];
  onSwitchUser: (user: User) => void;
  onOpenPrdModal: () => void;
  onOpenBulkImport: (preselectedAgentId?: string) => void;
  onOpenUserManagement: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onLogout: () => void;
  onToggleFocusMode?: () => void;
  isFocusModeActive?: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenLoginScreen: () => void;
  onRefreshData?: () => void;
  onOpenProfileSettings?: () => void;
  onOpenAiIntelligence?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  allUsers,
  roleDefinitions,
  onSwitchUser,
  onOpenPrdModal,
  onOpenBulkImport,
  onOpenUserManagement,
  onExportExcel,
  onExportPdf,
  onLogout,
  onToggleFocusMode,
  isFocusModeActive,
  searchQuery,
  onSearchChange,
  onOpenLoginScreen,
  onRefreshData,
  onOpenProfileSettings,
  onOpenAiIntelligence
}) => {
  const isHQAdmin = currentUser.role === 'HQ_ADMIN';
  const isSupervisor = currentUser.role === 'SUPERVISOR';
  const isAgent = currentUser.role === 'TEAM_MEMBER';
  const canUploadExcel = checkUserPermission(currentUser, 'IMPORT_EXCEL_LEADS', roleDefinitions);
  const canManageUsers = checkUserPermission(currentUser, 'MANAGE_USERS', roleDefinitions) || checkUserPermission(currentUser, 'MANAGE_ROLES_PERMISSIONS', roleDefinitions) || isHQAdmin || isSupervisor;
  const canExportData = checkUserPermission(currentUser, 'EXPORT_DATA_REPORTS', roleDefinitions);
  const canFocusMode = checkUserPermission(currentUser, 'ACCESS_FOCUS_MODE', roleDefinitions);

  const [exportMenuOpen, setExportMenuOpen] = useState<boolean>(false);
  const [agentDropdownOpen, setAgentDropdownOpen] = useState<boolean>(false);
  const [agentFilterQuery, setAgentFilterQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const importDropdownRef = useRef<HTMLDivElement>(null);

  const handleTriggerRefresh = () => {
    setIsRefreshing(true);
    if (onRefreshData) {
      onRefreshData();
    }
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // Close agent dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (importDropdownRef.current && !importDropdownRef.current.contains(event.target as Node)) {
        setAgentDropdownOpen(false);
      }
    };
    if (agentDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [agentDropdownOpen]);

  // Filter available agents for import
  const availableAgentsForImport = useMemo(() => {
    const agents = allUsers.filter(u => u.role === 'TEAM_MEMBER');
    const scoped = isSupervisor
      ? agents.filter(u => u.branch === currentUser.branch || u.supervisorId === currentUser.id)
      : agents;

    if (!agentFilterQuery.trim()) return scoped;
    const q = agentFilterQuery.toLowerCase();
    return scoped.filter(
      a => a.name.toLowerCase().includes(q) || a.branch.toLowerCase().includes(q) || (a.phone && a.phone.includes(q))
    );
  }, [allUsers, isSupervisor, currentUser, agentFilterQuery]);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'HQ_ADMIN':
        return {
          label: 'HQ ADMIN',
          subLabel: 'Global Super Admin',
          style: 'bg-red-500/20 text-red-300 border-red-500/30',
          icon: ShieldCheck
        };
      case 'SUPERVISOR':
        return {
          label: 'SUPERVISOR',
          subLabel: currentUser.branch,
          style: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          icon: UserCheck
        };
      case 'TEAM_MEMBER':
        return {
          label: 'AGENT',
          subLabel: 'Calling Member',
          style: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          icon: UserIcon
        };
    }
  };

  const roleBadge = getRoleBadge(currentUser.role);
  const RoleIcon = roleBadge.icon;

  return (
    <header className="bg-[#0B172E] text-slate-100 sticky top-0 z-40 shadow-md border-b border-slate-800/80">
      {/* Primary Top Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[3.25rem] sm:h-16 py-1.5 sm:py-0 gap-1.5 sm:gap-3 flex-wrap sm:flex-nowrap">
          
          {/* Brand Logo & Telemetry Indicator */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <img 
              src="/images/LOGODES..png" 
              alt="MyCash Logo" 
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0" 
            />
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-black text-xs sm:text-sm md:text-base tracking-tight text-white leading-none">
                  MYCASH
                </h1>
                <span className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[8.5px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 leading-none">
                  <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                  Secure
                </span>
              </div>
              <span className="text-slate-400 font-bold tracking-[0.18em] text-[7.5px] sm:text-[8.5px] uppercase mt-0.5 leading-tight">
                CALLING PORTAL
              </span>
            </div>
          </div>

          {/* Center Search Input */}
          <div className="hidden xl:flex items-center flex-1 max-w-xs mx-3">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Quick search customer name or phone..."
                className="w-full pl-8 pr-7 py-1 bg-slate-850 bg-slate-900/80 border border-slate-700/80 rounded-lg text-[11px] text-white placeholder-slate-400 focus:outline-none focus:bg-slate-900 focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Action Navigation Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap sm:flex-nowrap justify-end">
            {/* Manual Data & Metrics Refresh Button */}
            <button
              id="btn-refresh-dashboard"
              onClick={handleTriggerRefresh}
              disabled={isRefreshing}
              className={`px-1.5 py-1 bg-slate-800/90 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-200 hover:text-white text-[9px] sm:text-[11px] font-semibold rounded-lg sm:rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                isRefreshing ? 'opacity-80 text-blue-400' : ''
              }`}
              title="Manually re-fetch and re-calculate roster metrics"
              aria-label="Refresh metrics and roster data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 shrink-0 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline text-[10px]">
                {isRefreshing ? 'Syncing...' : 'Sync'}
              </span>
            </button>

            {/* AI Intelligence & Feedback Analytics Button (Admin & Supervisor) */}
            {onOpenAiIntelligence && (isHQAdmin || currentUser?.role === 'SUPERVISOR') && (
              <button
                id="btn-header-ai-intelligence"
                onClick={onOpenAiIntelligence}
                className="hidden sm:flex items-center gap-1 sm:gap-1.5 px-2 py-1 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-95 text-white text-[9px] sm:text-[11px] font-bold rounded-lg sm:rounded-xl shadow-xs transition-all cursor-pointer border border-red-500/40 shrink-0"
                title="Open AI Intelligence & Feedback Analytics with Af-Soomaali comprehension, charts, and downloadable PDF report"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse shrink-0" />
                <span className="truncate">AI Intelligence</span>
              </button>
            )}

            {/* Focus Calling Mode Speed-Dial Button */}
            {onToggleFocusMode && canFocusMode && (
              <button
                id="btn-toggle-focus-mode"
                onClick={onToggleFocusMode}
                className={`flex items-center gap-1 px-1.5 py-1 rounded-lg sm:rounded-xl text-[9px] sm:text-[11px] font-bold transition-all cursor-pointer border shrink-0 ${
                  isFocusModeActive
                    ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-xs'
                    : 'bg-blue-950/70 hover:bg-blue-900/70 border-blue-700/60 text-blue-300 hover:text-blue-200'
                }`}
                title={isHQAdmin ? "Open Supervisors Performance Roll-Up Focus Mode" : "Toggle Focus Calling Mode speed-dial queue"}
              >
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline">
                  {isFocusModeActive ? 'Exit' : isHQAdmin ? 'Roll-Up' : 'Focus'}
                </span>
              </button>
            )}

            {/* Export Dropdown */}
            {canExportData && (
              <div className="relative shrink-0">
                <button
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  className="flex items-center gap-1 px-1.5 py-1 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-[9px] sm:text-[11px] font-semibold rounded-lg sm:rounded-xl border border-slate-700 transition-colors cursor-pointer"
                  title="Export data and executive reports"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="hidden xs:inline">Export</span>
                  <ChevronDown className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                </button>

                {exportMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-44 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95"
                    onClick={() => setExportMenuOpen(false)}
                  >
                    <button
                      onClick={onExportExcel}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-xs text-white">Excel (.xlsx)</div>
                        <div className="text-[10px] text-slate-400">Filtered raw rows</div>
                      </div>
                    </button>

                    <button
                      id="btn-export-pdf-report"
                      onClick={onExportPdf}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2.5 transition-colors cursor-pointer rounded-xl"
                    >
                      <Download className="w-4 h-4 text-red-400 shrink-0" />
                      <div>
                        <div className="font-bold text-xs text-white">PDF Report</div>
                        <div className="text-[10px] text-slate-400">KPI tiles, branch list & charts</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* User Management for Admin & Supervisor */}
            {canManageUsers && (
              <button
                id="btn-manage-users"
                onClick={onOpenUserManagement}
                className="hidden sm:flex px-1.5 py-1 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-[9px] sm:text-[11px] font-medium rounded-lg sm:rounded-xl border border-slate-700 transition-colors items-center gap-1 cursor-pointer shrink-0"
                title="Manage team members and branches"
              >
                <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="hidden xl:inline">Personnel</span>
              </button>
            )}

            {/* View Full Login Screen / Sign Out */}
            <button
              id="btn-view-login-screen"
              onClick={onLogout}
              className="flex items-center gap-1 px-1.5 py-1 bg-slate-800/90 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-700/60 text-slate-200 text-[9px] sm:text-[11px] font-medium rounded-lg sm:rounded-xl border border-slate-700 transition-colors cursor-pointer shrink-0 group"
              title="Sign out and return to login screen"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-400 shrink-0" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Dynamic Role & Permission Strip */}
      <div className="bg-red-600 px-3 sm:px-6 lg:px-8 py-1.5 sm:py-2">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2.5 text-[11px] sm:text-xs">
          
          {/* Active User Credentials & Permission Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-red-100 font-medium text-[10px] sm:text-xs">Session:</span>
            <div 
              onClick={onOpenProfileSettings}
              className="flex items-center gap-1.5 bg-red-700 hover:bg-red-800 transition-all px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl border border-red-800/40 hover:border-white/50 cursor-pointer active:scale-95 group"
              title="View profile details & change password"
            >
              <strong className="text-white group-hover:text-red-200 transition-colors font-bold text-[11px] sm:text-xs">{currentUser.name}</strong>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[9px] sm:text-[10px] font-bold border bg-white text-red-700 border-white`}>
                <RoleIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                {roleBadge.label}
              </span>
            </div>
            <span className="text-red-100 font-medium text-[10px] sm:text-xs hidden xs:inline">
              Branch: <strong className="text-white">{currentUser.branch}</strong>
            </span>
          </div>



        </div>
      </div>
    </header>
  );
};
