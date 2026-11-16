import React from 'react';
import { 
  LayoutDashboard, 
  Sparkles, 
  Building2, 
  UserCheck, 
  Users, 
  CalendarCheck, 
  History, 
  MessageSquare, 
  FileSpreadsheet, 
  Settings, 
  User as UserIcon, 
  Zap, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  X,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Activity,
  Download
} from 'lucide-react';
import { User, UserRole, RoleDefinition } from '../types';

export type NavItemKey = 
  | 'dashboard' 
  | 'aiIntelligence' 
  | 'branches' 
  | 'supervisors' 
  | 'appointments' 
  | 'auditLogs' 
  | 'whatsappSms' 
  | 'reports' 
  | 'settings' 
  | 'profile';

interface SidebarProps {
  currentUser: User;
  activeNav: NavItemKey;
  onNavigate: (key: NavItemKey) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isFocusModeActive: boolean;
  onToggleFocusMode: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
  onLogout: () => void;
  upcomingAppointmentsCount?: number;
  totalAuditLogsCount?: number;
  onOpenProposalDoc?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeNav,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  isFocusModeActive,
  onToggleFocusMode,
  onRefreshData,
  isRefreshing,
  onLogout,
  upcomingAppointmentsCount = 0,
  totalAuditLogsCount = 0,
  onOpenProposalDoc
}) => {
  const isHQAdmin = currentUser.role === 'HQ_ADMIN';
  const isSupervisor = currentUser.role === 'SUPERVISOR';

  const navItems: {
    key: NavItemKey;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    badgeColor?: string;
    category?: string;
  }[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      category: 'Overview'
    },
    {
      key: 'aiIntelligence',
      label: 'AI Intelligence',
      icon: Sparkles,
      badge: 'Gemini',
      badgeColor: 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white',
      category: 'Overview'
    },
    {
      key: 'branches',
      label: 'Branches',
      icon: Building2,
      category: 'Management'
    },
    {
      key: 'supervisors',
      label: isHQAdmin ? 'Supervisors' : 'Team Members',
      icon: isHQAdmin ? UserCheck : Users,
      category: 'Management'
    },
    {
      key: 'appointments',
      label: 'Appointments',
      icon: CalendarCheck,
      badge: upcomingAppointmentsCount > 0 ? upcomingAppointmentsCount : undefined,
      badgeColor: 'bg-emerald-500 text-white font-bold',
      category: 'Operations'
    },
    {
      key: 'auditLogs',
      label: 'Audit Logs',
      icon: History,
      badge: totalAuditLogsCount > 0 ? totalAuditLogsCount : undefined,
      badgeColor: 'bg-slate-700 text-slate-200',
      category: 'Operations'
    },
    {
      key: 'whatsappSms',
      label: 'WhatsApp SMS',
      icon: MessageSquare,
      badge: 'Live',
      badgeColor: 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30',
      category: 'Operations'
    },
    {
      key: 'reports',
      label: 'Reports',
      icon: FileSpreadsheet,
      category: 'Tools & Config'
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: Settings,
      category: 'Tools & Config'
    },
    {
      key: 'profile',
      label: 'Profile',
      icon: UserIcon,
      category: 'Tools & Config'
    }
  ];

  // Group nav items by category for crisp organization when expanded
  const categories = ['Overview', 'Management', 'Operations', 'Tools & Config'];

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'HQ_ADMIN':
        return 'HQ Admin';
      case 'SUPERVISOR':
        return 'Supervisor';
      case 'TEAM_MEMBER':
        return 'Agent';
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0B172E] text-slate-200 select-none border-r border-slate-800/80">
      
      {/* Brand Header */}
      <div className="flex items-center justify-between px-3.5 py-4 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <img 
            src="/images/LOGODES..png" 
            alt="MyCash Logo" 
            className="w-9 h-9 object-contain shrink-0"
          />
          {(!isCollapsed || isMobileOpen) && (
            <div className="flex flex-col min-w-0 transition-opacity duration-200">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm tracking-tight text-white truncate">
                  MYCASH
                </span>
                <span className="px-1.5 py-0.2 rounded text-[8px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live
                </span>
              </div>
              <span className="text-slate-400 font-bold tracking-widest text-[8px] uppercase truncate">
                Calling Portal
              </span>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        {isMobileOpen ? (
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          /* Desktop collapse toggle button */
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer shrink-0"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Primary Action Controls: Focus Mode & Sync */}
      <div className="p-3 border-b border-slate-800/80 space-y-2 shrink-0 bg-slate-900/40">
        {/* Focus Mode Button */}
        <button
          onClick={() => {
            onToggleFocusMode();
            if (isMobileOpen) onCloseMobile();
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
            isFocusModeActive
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-400/50'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          } ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}`}
          title={isFocusModeActive ? "Exit Focus Mode" : "Launch Speed-Dial Focus Mode"}
        >
          <Zap className={`w-4 h-4 shrink-0 ${isFocusModeActive ? 'animate-pulse text-slate-950' : 'text-amber-300'}`} />
          {(!isCollapsed || isMobileOpen) && (
            <div className="flex items-center justify-between flex-1 min-w-0">
              <span className="truncate">{isFocusModeActive ? 'Exit Focus Mode' : 'Focus Mode'}</span>
              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase ${
                isFocusModeActive ? 'bg-slate-950 text-amber-400' : 'bg-blue-700 text-blue-100'
              }`}>
                {isFocusModeActive ? 'Active' : 'Speed'}
              </span>
            </div>
          )}
        </button>

        {/* Sync Button */}
        <button
          onClick={onRefreshData}
          disabled={isRefreshing}
          className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-800 hover:text-white transition-all cursor-pointer border border-slate-700/60 ${
            isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''
          }`}
          title="Synchronize Database Roster & Metrics"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-400 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
          {(!isCollapsed || isMobileOpen) && (
            <div className="flex items-center justify-between flex-1 min-w-0">
              <span className="truncate text-[11px]">{isRefreshing ? 'Syncing...' : 'Sync Database'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </div>
          )}
        </button>
      </div>

      {/* Navigation Links Scrollable Area */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4 custom-scrollbar">
        {categories.map((cat) => {
          const categoryItems = navItems.filter(item => item.category === cat);
          if (categoryItems.length === 0) return null;

          return (
            <div key={cat} className="space-y-1">
              {/* Category Header Label */}
              {(!isCollapsed || isMobileOpen) && (
                <div className="px-3 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase mb-1">
                  {cat}
                </div>
              )}

              {categoryItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.key;

                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      onNavigate(item.key);
                      if (isMobileOpen) onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer relative group ${
                      isActive
                        ? 'bg-blue-600/20 text-white font-bold border-l-3 border-blue-500 shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    } ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}`}
                    title={isCollapsed && !isMobileOpen ? item.label : undefined}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`} />

                    {(!isCollapsed || isMobileOpen) && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Tooltip on collapsed desktop view */}
                    {isCollapsed && !isMobileOpen && (
                      <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-semibold rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-slate-700">
                        {item.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User Profile Footer Card */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div 
            onClick={() => {
              onNavigate('profile');
              if (isMobileOpen) onCloseMobile();
            }}
            className="flex items-center gap-2.5 overflow-hidden cursor-pointer flex-1 group"
            title="View & Edit Profile"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate group-hover:text-blue-300 transition-colors">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {getRoleLabel(currentUser.role)} · {currentUser.branch}
                </span>
              </div>
            )}
          </div>

          {(!isCollapsed || isMobileOpen) && (
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside 
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className="fixed top-0 bottom-0 left-0 z-30 transition-all duration-300 ease-in-out" style={{ width: isCollapsed ? '4rem' : '15rem' }}>
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Sliding Drawer */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
