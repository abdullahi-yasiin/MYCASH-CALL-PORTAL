import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Building2, 
  Users, 
  PhoneCall, 
  CalendarCheck, 
  History, 
  Sparkles, 
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Filter,
  BarChart3,
  Calendar,
  Layers,
  ShieldCheck,
  UserCheck,
  User as UserIcon,
  Check,
  Zap,
  Eye,
  Clock
} from 'lucide-react';
import { 
  User, 
  CustomerRecord, 
  ActivityLog, 
  FilterState, 
  BranchInfo,
  CallStatus,
  RoleDefinition,
  DeleteExcelTarget
} from './types';
import { 
  INITIAL_BRANCHES, 
  INITIAL_USERS, 
  INITIAL_CUSTOMERS, 
  INITIAL_ACTIVITY_LOGS 
} from './data/mockData';
import { INITIAL_ROLE_DEFINITIONS, checkUserPermission } from './data/rolesPermissions';
import { calculateMetrics, filterRecords } from './utils/metrics';
import { exportToExcel, exportToPdf } from './utils/exportEngine';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { FiltersBar } from './components/FiltersBar';
import { DataTable } from './components/DataTable';
import { BulkImportModal } from './components/BulkImportModal';
import { AdminSupervisorsTab } from './components/AdminSupervisorsTab';
import { SupervisorTeamTab } from './components/SupervisorTeamTab';
import { PrdViewerModal } from './components/PrdViewerModal';
import { UserManagementModal } from './components/UserManagementModal';
import { CustomerDetailDrawer } from './components/CustomerDetailDrawer';
import { FocusCallingMode } from './components/FocusCallingMode';
import { LoginPage } from './components/LoginPage';
import { AdminDashboard } from './components/AdminDashboard';
import { SupervisorDashboard } from './components/SupervisorDashboard';
import { AgentExcelInspectionModal } from './components/AgentExcelInspectionModal';
import { SupervisorsFocusRollUp } from './components/SupervisorsFocusRollUp';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { PasswordForceChangeModal } from './components/PasswordForceChangeModal';
import { DeleteExcelModal } from './components/DeleteExcelModal';
import { SetTargetModal } from './components/SetTargetModal';
import { SessionInactivityModal } from './components/SessionInactivityModal';
import { supabaseDb } from './lib/supabase';

// 30 Minutes Inactivity Session Rules
// Close/End session only IF the session is not active for 30 minutes
export const SESSION_INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds (1,800,000 ms)
export const SESSION_WARNING_THRESHOLD_MS = 28 * 60 * 1000; // Warning countdown shown at 28 minutes of inactivity (2 min grace period)

const INITIAL_FILTERS: FilterState = {
  dateStart: '',
  dateEnd: '',
  branches: [],
  supervisors: [],
  teamMembers: [],
  statuses: [],
  searchQuery: ''
};

export default function App() {
  // Persistent state
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('mycash_v3_users');
    if (saved) {
      try {
        const parsed: User[] = JSON.parse(saved);
        return parsed;
      } catch (e) {
        return INITIAL_USERS;
      }
    }
    return INITIAL_USERS;
  });

  const [branches, setBranches] = useState<BranchInfo[]>(() => {
    const saved = localStorage.getItem('mycash_v3_branches');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_BRANCHES;
      }
    }
    return INITIAL_BRANCHES;
  });

  const [records, setRecords] = useState<CustomerRecord[]>([]);

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('mycash_v3_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Dynamic RBAC Role Definitions & Permission Matrix
  const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinition[]>(() => {
    const saved = localStorage.getItem('mycash_v2_roles');
    return saved ? JSON.parse(saved) : INITIAL_ROLE_DEFINITIONS;
  });

  // Current logged in user (null if not authenticated yet)
  // Close/End session only IF the session is not active for 30 minutes
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('mycash_v3_current_user');
    const lastActive = localStorage.getItem('mycash_v3_last_activity');
    if (savedUser) {
      if (lastActive) {
        const elapsed = Date.now() - parseInt(lastActive, 10);
        if (elapsed >= SESSION_INACTIVITY_LIMIT_MS) {
          // Session expired due to 30 minutes of inactivity
          console.warn('[Session Security] Session closed upon load: Inactive for 30+ minutes.');
          localStorage.removeItem('mycash_v3_current_user');
          localStorage.removeItem('mycash_v3_last_activity');
          localStorage.setItem('mycash_v3_is_auth_view', JSON.stringify(true));
          return null;
        }
      }
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        // Fallback
      }
    }
    return null;
  });

  // Full-page Login View vs Dashboard Workspace View
  // Default to true (Login screen) unless a valid logged-in session exists and is active within 30 minutes
  const [isAuthView, setIsAuthView] = useState<boolean>(() => {
    const savedUser = localStorage.getItem('mycash_v3_current_user');
    const lastActive = localStorage.getItem('mycash_v3_last_activity');
    if (!savedUser) return true;
    if (lastActive) {
      const elapsed = Date.now() - parseInt(lastActive, 10);
      if (elapsed >= SESSION_INACTIVITY_LIMIT_MS) {
        return true;
      }
    }
    const savedAuth = localStorage.getItem('mycash_v3_is_auth_view');
    return savedAuth ? JSON.parse(savedAuth) : false;
  });

  // Session 30-Minute Inactivity Auto-Close State
  const [inactivityNotice, setInactivityNotice] = useState<string | null>(() => {
    const lastActive = localStorage.getItem('mycash_v3_last_activity');
    if (lastActive) {
      const elapsed = Date.now() - parseInt(lastActive, 10);
      if (elapsed >= SESSION_INACTIVITY_LIMIT_MS) {
        return 'Your previous session was closed automatically after 30 minutes of inactivity. Please sign in again.';
      }
    }
    return null;
  });
  const [isSessionWarningOpen, setIsSessionWarningOpen] = useState<boolean>(false);
  const [warningSecondsRemaining, setWarningSecondsRemaining] = useState<number>(120);

  const lastActivityRef = useRef<number>(Date.now());
  const lastStoredWriteRef = useRef<number>(Date.now());

  // Focus Calling Mode for high-productivity outbound dialing
  const [isFocusModeActive, setIsFocusModeActive] = useState<boolean>(false);

  // Customer Detail Drawer
  const [drawerRecord, setDrawerRecord] = useState<CustomerRecord | null>(null);

  // Inspected Agent for Excel Roster Audit Drilldown (for Admin & Supervisor)
  const [inspectedAgent, setInspectedAgent] = useState<User | null>(null);

  // Active top-level tab (for team members)
  const [activeTab, setActiveTab] = useState<'records' | 'adminAnalytics' | 'supervisorTeam' | 'appointments'>('records');

  // Filters
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  // Modals state
  const [isPrdModalOpen, setIsPrdModalOpen] = useState<boolean>(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);
  const [importTargetAgentId, setImportTargetAgentId] = useState<string>('');
  const [isUserManagementOpen, setIsUserManagementOpen] = useState<boolean>(false);
  const [userManagementTab, setUserManagementTab] = useState<'users' | 'roles'>('users');
  const [userManagementShowAddForm, setUserManagementShowAddForm] = useState<boolean>(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState<boolean>(false);
  const [isDeleteExcelOpen, setIsDeleteExcelOpen] = useState<boolean>(false);
  const [deleteExcelTarget, setDeleteExcelTarget] = useState<DeleteExcelTarget | null>(null);
  const [isSetTargetOpen, setIsSetTargetOpen] = useState<boolean>(false);
  const [targetAgentForModal, setTargetAgentForModal] = useState<User | null>(null);
  const [targetBranchForModal, setTargetBranchForModal] = useState<BranchInfo | null>(null);

  // Toast notification with type support
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Close / End session ONLY when session is not active for 30 minutes
  const handleSessionTimeout = useCallback(() => {
    console.warn('[Session Security] 30 minutes of inactivity reached. Closing session.');
    setIsSessionWarningOpen(false);
    setIsAuthView(true);
    setCurrentUser(null);
    localStorage.removeItem('mycash_v3_current_user');
    localStorage.removeItem('mycash_v3_last_activity');
    localStorage.setItem('mycash_v3_is_auth_view', JSON.stringify(true));
    setInactivityNotice('Your session has ended because the terminal was inactive for 30 minutes. Please sign in again.');
    showToast('Session ended: 30 minutes of inactivity reached.', 'error');
  }, []);

  // Record user interaction to keep session active (only ends if NOT active for 30 min)
  const recordActivity = useCallback((forceStorageUpdate = false) => {
    const now = Date.now();
    lastActivityRef.current = now;

    // If warning dialog was active, close it immediately since user is actively interacting
    setIsSessionWarningOpen(prev => {
      if (prev) return false;
      return prev;
    });

    // Throttle writes to localStorage to prevent unnecessary disk I/O (every 4 seconds)
    if (forceStorageUpdate || now - lastStoredWriteRef.current >= 4000) {
      lastStoredWriteRef.current = now;
      localStorage.setItem('mycash_v3_last_activity', now.toString());
    }
  }, []);

  // Monitor user activity and enforce 30-minute inactivity limit
  useEffect(() => {
    if (!currentUser || isAuthView) {
      setIsSessionWarningOpen(false);
      return;
    }

    // Initialize or verify last active timestamp
    const existingLastActive = localStorage.getItem('mycash_v3_last_activity');
    if (!existingLastActive) {
      const now = Date.now();
      localStorage.setItem('mycash_v3_last_activity', now.toString());
      lastActivityRef.current = now;
    } else {
      const parsed = parseInt(existingLastActive, 10);
      if (!isNaN(parsed)) {
        lastActivityRef.current = parsed;
      }
    }

    // Listen for any user input across the application
    const handleUserInteraction = () => {
      recordActivity();
    };

    const userActivityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click', 'wheel'];
    userActivityEvents.forEach(evt => {
      window.addEventListener(evt, handleUserInteraction, { passive: true });
    });

    // Storage event for multi-tab synchronization
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'mycash_v3_last_activity' && e.newValue) {
        const remoteTime = parseInt(e.newValue, 10);
        if (!isNaN(remoteTime)) {
          lastActivityRef.current = remoteTime;
          setIsSessionWarningOpen(false);
        }
      }
      if (e.key === 'mycash_v3_current_user' && !e.newValue) {
        // Session ended in another window/tab
        setCurrentUser(null);
        setIsAuthView(true);
        setIsSessionWarningOpen(false);
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // Periodic timer checking if 30 minutes of inactivity has elapsed
    const timerInterval = setInterval(() => {
      const now = Date.now();
      const storedLast = localStorage.getItem('mycash_v3_last_activity');
      const lastActive = storedLast ? parseInt(storedLast, 10) : lastActivityRef.current;
      const elapsed = now - lastActive;

      if (elapsed >= SESSION_INACTIVITY_LIMIT_MS) {
        // Inactive for 30 minutes -> Close session
        handleSessionTimeout();
      } else if (elapsed >= SESSION_WARNING_THRESHOLD_MS) {
        // Warning threshold reached (28 minutes of inactivity)
        const remainingMs = SESSION_INACTIVITY_LIMIT_MS - elapsed;
        const remainingSec = Math.max(1, Math.ceil(remainingMs / 1000));
        setWarningSecondsRemaining(remainingSec);
        setIsSessionWarningOpen(true);
      } else {
        setIsSessionWarningOpen(false);
      }
    }, 1000);

    // Check immediately on tab focus or computer wake
    const handleVisibilityOrFocus = () => {
      const now = Date.now();
      const storedLast = localStorage.getItem('mycash_v3_last_activity');
      const lastActive = storedLast ? parseInt(storedLast, 10) : lastActivityRef.current;
      const elapsed = now - lastActive;

      if (elapsed >= SESSION_INACTIVITY_LIMIT_MS) {
        handleSessionTimeout();
      } else {
        recordActivity(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(timerInterval);
      userActivityEvents.forEach(evt => {
        window.removeEventListener(evt, handleUserInteraction);
      });
      window.removeEventListener('storage', handleStorageEvent);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [currentUser, isAuthView, recordActivity, handleSessionTimeout]);

  // Automatic background cloud sync with Supabase
  useEffect(() => {
    async function initAutomatedSupabaseSync() {
      try {
        console.log('[Supabase Sync: Start] Testing connection to Supabase database...');
        const conn = await supabaseDb.testConnection();

        if (conn.tables.customerRecords) {
          // Fetch existing customers from remote DB to ensure persistence
          const remoteCustomers = await supabaseDb.fetchCustomers();
          if (remoteCustomers !== null) {
            setRecords(remoteCustomers);
            localStorage.setItem('mycash_v3_records', JSON.stringify(remoteCustomers));
          }
        }

        if (conn.tables.activityLogs) {
          // Sync activity logs
          const remoteLogs = await supabaseDb.fetchActivityLogs();
          if (remoteLogs && remoteLogs.length > 0) {
            setActivityLogs(remoteLogs);
          } else {
            // Push local logs to cloud
            const savedLocalLogs = localStorage.getItem('mycash_v3_logs');
            if (savedLocalLogs) {
              try {
                const parsedLocalLogs = JSON.parse(savedLocalLogs);
                if (parsedLocalLogs && parsedLocalLogs.length > 0) {
                  for (const log of parsedLocalLogs) {
                    await supabaseDb.insertActivityLog(log);
                  }
                  setActivityLogs(parsedLocalLogs);
                }
              } catch (e) {
                console.warn('[Supabase Sync: Warning] Local logs push error:', e);
              }
            }
          }
        }

        // Synchronize Users with robust error handling and tracking logs
        if (conn.tables.users) {
          console.group('[Supabase Users Sync: Execution]');
          console.log('[Supabase Users Sync: Status] Users table is accessible.');
          try {
            console.log('[Supabase Users Sync: Step 1] Querying users from Supabase...');
            const remoteUsers = await supabaseDb.fetchUsers();

            if (remoteUsers === null) {
              console.error('[Supabase Users Sync: Step 1 FAILED] fetchUsers returned null. Potential RLS policy violation or network failure.');
            } else {
              console.log(`[Supabase Users Sync: Step 2] Successfully retrieved ${remoteUsers.length} user(s) from database.`);
              
              const existingAdmin = remoteUsers.find(u => u.id === 'u-admin-1');
              if (!existingAdmin) {
                console.warn('[Supabase Users Sync: Step 3 Notice] Default HQ Admin (u-admin-1) not present in cloud database. Provisioning account...');
                const defaultAdmin: User = {
                  id: 'u-admin-1',
                  name: 'Abdullahi Yasin',
                  email: 'cabdallahyasiin@gmail.com',
                  role: 'HQ_ADMIN',
                  branch: 'Headquarters',
                  active: true,
                  phone: '+252710000255',
                  password: 'amal123',
                  mustChangePassword: false
                };
                const adminResult = await supabaseDb.upsertUser(defaultAdmin);
                if (adminResult.success) {
                  console.log('[Supabase Users Sync: Step 3 Success] Default HQ Admin provisioned in database.');
                  const updatedUsers = await supabaseDb.fetchUsers() || [defaultAdmin];
                  setUsers(updatedUsers);
                  const freshAdmin = updatedUsers.find(u => u.id === 'u-admin-1') || defaultAdmin;
                  setCurrentUser(prev => prev && prev.id === 'u-admin-1' ? freshAdmin : prev);
                } else {
                  console.error('[Supabase Users Sync: Step 3 FAILED] Failed to provision default HQ Admin:', adminResult.error);
                }
              } else {
                console.log('[Supabase Users Sync: Step 3 Verified] HQ Admin account verified in cloud database. Updating UI state.');
                setUsers(remoteUsers);
                const syncedAdmin = existingAdmin;
                setCurrentUser(prev => {
                  if (!prev) return null;
                  if (prev.id === 'u-admin-1') return syncedAdmin;
                  const stillExists = remoteUsers.find(u => u.id === prev.id);
                  if (!stillExists) {
                    console.warn(`[Supabase Users Sync: Session Terminated] User ID "${prev.id}" was not found in remote database. Clearing stale local session.`);
                    localStorage.removeItem('mycash_v3_current_user');
                    return null;
                  }
                  return stillExists;
                });
              }
            }
          } catch (usersErr: any) {
            console.error('[Supabase Users Sync: FATAL EXCEPTION] Error during users synchronization:', usersErr);
          }
          console.groupEnd();
        } else {
          console.warn('[Supabase Users Sync: Warning] Users table unreachable or not provisioned in Supabase.');
        }
      } catch (e) {
        console.warn('[Supabase Sync: Warning] Automated cloud sync notice:', e);
      }
    }

    initAutomatedSupabaseSync();
  }, []);

  // Synchronize storage
  useEffect(() => {
    localStorage.setItem('mycash_v3_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('mycash_v3_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('mycash_v3_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('mycash_v3_is_auth_view', JSON.stringify(isAuthView));
  }, [isAuthView]);

  useEffect(() => {
    localStorage.setItem('mycash_v3_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('mycash_v3_logs', JSON.stringify(activityLogs));
  }, [activityLogs]);

  useEffect(() => {
    localStorage.setItem('mycash_v2_roles', JSON.stringify(roleDefinitions));
  }, [roleDefinitions]);

  // Filtered customer records based on role and active filters
  const filteredRecords = useMemo(() => {
    return filterRecords(records, filters, currentUser);
  }, [records, filters, currentUser]);

  // Calculated metrics adhering to Unique Call State Rule & Deduplication Logic
  const metrics = useMemo(() => {
    return calculateMetrics(filteredRecords);
  }, [filteredRecords]);

  // Appointments today or upcoming
  const upcomingAppointments = useMemo(() => {
    return filteredRecords.filter(r => r.appointment && r.appointment.trim() !== '');
  }, [filteredRecords]);

  // Supervisors and Team Members lists
  const supervisorsList = useMemo(() => users.filter(u => u.role === 'SUPERVISOR'), [users]);
  const teamMembersList = useMemo(() => users.filter(u => u.role === 'TEAM_MEMBER'), [users]);

  // Supervisor name for the currently inspected agent
  const inspectedAgentSupervisor = useMemo(() => {
    if (!inspectedAgent) return undefined;
    const sup = users.find(u => u.id === inspectedAgent.supervisorId || u.branch === inspectedAgent.branch);
    return sup?.name;
  }, [inspectedAgent, users]);

  // Record update handler
  const handleUpdateRecord = (updatedRecord: CustomerRecord, changeDetails: string) => {
    if (!currentUser) return;
    setRecords(prev => prev.map(r => (r.id === updatedRecord.id ? updatedRecord : r)));

    // Create activity log entry
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      recordId: updatedRecord.id,
      customerName: updatedRecord.customerName,
      action: updatedRecord.appointment && changeDetails.includes('appointment')
        ? 'APPOINTMENT_SCHEDULED'
        : 'STATUS_CHANGE',
      newValue: updatedRecord.status,
      details: changeDetails
    };

    setActivityLogs(prev => [newLog, ...prev]);
    showToast(`Updated: ${updatedRecord.customerName} (${updatedRecord.status})`);

    // Sync with Supabase Cloud DB
    supabaseDb.upsertCustomer(updatedRecord);
    supabaseDb.insertActivityLog(newLog);
  };

  // Bulk import commit handler
  const handleCommitImport = (newRecords: CustomerRecord[], batchName: string) => {
    if (!currentUser) return;
    setRecords(prev => [...newRecords, ...prev]);

    const importLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      recordId: `batch-${Date.now()}`,
      customerName: batchName,
      action: 'EXCEL_IMPORTED',
      details: `Imported ${newRecords.length} records into system roster.`
    };

    setActivityLogs(prev => [importLog, ...prev]);
    showToast(`Successfully imported ${newRecords.length} customer records.`);

    // Sync imported batch with Supabase Cloud DB
    supabaseDb.batchUpsertCustomers(newRecords);
    supabaseDb.insertActivityLog(importLog);
  };

  // Add new user with strict database-first transaction & comprehensive tracking logs
  const handleAddUser = async (newUser: User): Promise<boolean> => {
    console.group(`[User Creation Transaction: ${newUser.name}]`);
    console.log(`[User Creation: Step 1] Validating payload and preparing transaction:`, {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      branch: newUser.branch,
      supervisorId: newUser.supervisorId || 'Unassigned',
      phone: newUser.phone,
      active: newUser.active
    });

    try {
      // Step 2: Commit directly to Supabase cloud database first
      console.log(`[User Creation: Step 2] Submitting database transaction to Supabase...`);
      const result = await supabaseDb.upsertUser(newUser);

      if (!result.success) {
        console.error(`[User Creation: Step 2 FAILED] Supabase rejected user transaction:`, {
          error: result.error,
          code: result.code,
          userId: newUser.id,
          userEmail: newUser.email
        });
        showToast(`Failed to create user "${newUser.name}": ${result.error || 'Database error'}`, 'error');
        console.groupEnd();
        return false;
      }

      console.log(`[User Creation: Step 3] Database transaction confirmed successful.`);

      // Step 4: Update UI state and localStorage ONLY after successful DB transaction
      console.log(`[User Creation: Step 4] Updating React application state and local cache...`);
      setUsers(prev => {
        const exists = prev.some(u => u.id === newUser.id);
        const updated = exists
          ? prev.map(u => u.id === newUser.id ? newUser : u)
          : [...prev, newUser];
        localStorage.setItem('mycash_v3_users', JSON.stringify(updated));
        return updated;
      });

      // Step 5: Audit log
      console.log(`[User Creation: Step 5] Generating audit log record...`);
      const creationLog: ActivityLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'System Admin',
        userRole: currentUser?.role || 'HQ_ADMIN',
        recordId: newUser.id,
        customerName: newUser.name,
        action: 'STATUS_CHANGE',
        details: `Created new ${newUser.role} user account: ${newUser.name} (${newUser.email}) at ${newUser.branch}.`
      };
      setActivityLogs(prev => [creationLog, ...prev]);
      supabaseDb.insertActivityLog(creationLog);

      showToast(`Created user: ${newUser.name} (${newUser.role})`);
      console.log(`[User Creation: Step 6 COMPLETE] User successfully registered and confirmed in UI.`);
      console.groupEnd();
      return true;
    } catch (err: any) {
      console.error(`[User Creation: FATAL EXCEPTION] Unexpected error during creation flow:`, err);
      showToast(`Error creating user: ${err?.message || 'Unexpected network or database failure'}`, 'error');
      console.groupEnd();
      return false;
    }
  };

  // Update existing user with database confirmation first
  const handleUpdateUser = async (updatedUser: User): Promise<boolean> => {
    console.group(`[User Update Transaction: ${updatedUser.name}]`);
    console.log(`[User Update: Step 1] Validating payload for user ${updatedUser.id}`);

    try {
      console.log(`[User Update: Step 2] Submitting update transaction to Supabase...`);
      const result = await supabaseDb.upsertUser(updatedUser);

      if (!result.success) {
        console.error(`[User Update: Step 2 FAILED] Supabase rejected update:`, result.error);
        showToast(`Failed to update user "${updatedUser.name}": ${result.error}`, 'error');
        console.groupEnd();
        return false;
      }

      console.log(`[User Update: Step 3] Database transaction confirmed. Updating UI state...`);
      setUsers(prev => {
        const updated = prev.map(u => (u.id === updatedUser.id ? updatedUser : u));
        localStorage.setItem('mycash_v3_users', JSON.stringify(updated));
        return updated;
      });
      if (currentUser && currentUser.id === updatedUser.id) {
        setCurrentUser(updatedUser);
        localStorage.setItem('mycash_v3_current_user', JSON.stringify(updatedUser));
      }
      showToast(`Updated user: ${updatedUser.name}`);
      console.log(`[User Update: Complete] User ${updatedUser.name} updated.`);
      console.groupEnd();
      return true;
    } catch (err: any) {
      console.error(`[User Update: Exception] Unexpected failure updating user:`, err);
      showToast(`Error updating user: ${err?.message || 'Database error'}`, 'error');
      console.groupEnd();
      return false;
    }
  };

  // Update current user password
  const handleUpdatePassword = async (newPassword: string) => {
    if (!currentUser) return;
    const updatedUser: User = { 
      ...currentUser, 
      password: newPassword, 
      mustChangePassword: false 
    };
    setCurrentUser(updatedUser);
    localStorage.setItem('mycash_v3_current_user', JSON.stringify(updatedUser));
    setUsers(prev => {
      const updated = prev.map(u => u.id === currentUser.id ? updatedUser : u);
      localStorage.setItem('mycash_v3_users', JSON.stringify(updated));
      return updated;
    });
    await supabaseDb.upsertUser(updatedUser);
    await supabaseDb.updateUserPassword(currentUser.id, newPassword);
    showToast('Your security password has been updated and encrypted in cloud.');
  };

  // Delete user account with database confirmation
  const handleDeleteUser = async (userId: string) => {
    console.log(`[User Deletion] Initiating deletion for user: ${userId}`);
    const success = await supabaseDb.deleteUser(userId);
    if (!success) {
      console.error(`[User Deletion: FAILED] Database could not delete user ${userId}.`);
      showToast('Failed to delete user account from cloud database.', 'error');
      return;
    }
    setUsers(prev => {
      const filtered = prev.filter(u => u.id !== userId);
      localStorage.setItem('mycash_v3_users', JSON.stringify(filtered));
      return filtered;
    });
    showToast('User account permanently deleted from portal & cloud database.');
  };

  // Update role permissions matrix
  const handleUpdateRoleDefinitions = (newRoles: RoleDefinition[]) => {
    setRoleDefinitions(newRoles);
    showToast(`Saved Role Permissions Matrix successfully.`);
  };

  // Toggle user active status with database confirmation
  const handleToggleUserActive = async (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    const toggledUser: User = { ...targetUser, active: !targetUser.active };
    console.log(`[User Status Toggle] Submitting status toggle to Supabase: ${userId} active=${toggledUser.active}`);
    const result = await supabaseDb.upsertUser(toggledUser);
    if (!result.success) {
      console.error(`[User Status Toggle: FAILED]`, result.error);
      showToast(`Failed to update status: ${result.error}`, 'error');
      return;
    }
    setUsers(prev => {
      const updated = prev.map(u => (u.id === userId ? toggledUser : u));
      localStorage.setItem('mycash_v3_users', JSON.stringify(updated));
      return updated;
    });
    showToast(`Updated user status for ${targetUser.name}.`);
  };

  // Remove team member (for supervisor)
  const handleRemoveTeamMember = (agentId: string) => {
    setUsers(prev => prev.filter(u => u.id !== agentId));
    showToast(`Removed team member from branch roster.`);
  };

  // Open Set Target Modal for Individual Agent (HQ Admin Only)
  const handleOpenSetAgentTarget = (agent: User) => {
    if (!currentUser || currentUser.role !== 'HQ_ADMIN') {
      showToast('Unauthorized: Only HQ Admin Users can set calling targets.', 'error');
      return;
    }
    setTargetAgentForModal(agent);
    setTargetBranchForModal(null);
    setIsSetTargetOpen(true);
  };

  // Open Set Target Modal for Branch (HQ Admin Only)
  const handleOpenSetBranchTarget = (branch: BranchInfo) => {
    if (!currentUser || currentUser.role !== 'HQ_ADMIN') {
      showToast('Unauthorized: Only HQ Admin Users can set calling targets.', 'error');
      return;
    }
    setTargetBranchForModal(branch);
    setTargetAgentForModal(null);
    setIsSetTargetOpen(true);
  };

  // Save Agent Target
  const handleSaveAgentTarget = async (agentId: string, weeklyTarget: number, monthlyTarget: number) => {
    if (!currentUser || currentUser.role !== 'HQ_ADMIN') {
      showToast('Unauthorized: Only HQ Admin Users can set calling targets.', 'error');
      return;
    }
    const agent = users.find(u => u.id === agentId);
    if (!agent) return;

    const updatedUser: User = { ...agent, weeklyTarget, monthlyTarget };
    setUsers(prev => {
      const updated = prev.map(u => u.id === agentId ? updatedUser : u);
      localStorage.setItem('mycash_v3_users', JSON.stringify(updated));
      return updated;
    });

    // Background sync to Supabase
    await supabaseDb.upsertUser(updatedUser);

    // Audit log
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      recordId: agent.id,
      customerName: agent.name,
      action: 'NOTE_UPDATED',
      details: `HQ Admin updated targets for ${agent.name}: Weekly: ${weeklyTarget} calls/wk, Monthly: ${monthlyTarget} calls/mo.`
    };
    setActivityLogs(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem('mycash_v3_logs', JSON.stringify(updated));
      return updated;
    });

    showToast(`Targets updated for ${agent.name}: ${weeklyTarget}/wk, ${monthlyTarget}/mo.`);
  };

  // Save Branch Target
  const handleSaveBranchTarget = (
    branchId: string, 
    baseWeeklyPerAgent: number, 
    baseMonthlyPerAgent: number, 
    totalWeekly: number, 
    totalMonthly: number
  ) => {
    if (!currentUser || currentUser.role !== 'HQ_ADMIN') {
      showToast('Unauthorized: Only HQ Admin Users can set calling targets.', 'error');
      return;
    }
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;

    setBranches(prev => {
      const updated = prev.map(b => b.id === branchId ? {
        ...b,
        baseWeeklyTargetPerAgent: baseWeeklyPerAgent,
        baseMonthlyTargetPerAgent: baseMonthlyPerAgent,
        targetCallsWeek: totalWeekly,
        targetCallsMonth: totalMonthly
      } : b);
      localStorage.setItem('mycash_v3_branches', JSON.stringify(updated));
      return updated;
    });

    // Audit log
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      recordId: branch.id,
      customerName: branch.name,
      action: 'NOTE_UPDATED',
      details: `HQ Admin updated targets for ${branch.name}: Weekly: ${totalWeekly} calls/wk, Monthly: ${totalMonthly} calls/mo (${baseWeeklyPerAgent}/wk per agent).`
    };
    setActivityLogs(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem('mycash_v3_logs', JSON.stringify(updated));
      return updated;
    });

    showToast(`Targets updated for ${branch.name}: ${totalWeekly}/wk, ${totalMonthly}/mo.`);
  };

  // Open Delete Excel confirmation modal (HQ Admin Only)
  const handleOpenDeleteExcelModal = (target?: DeleteExcelTarget) => {
    if (!currentUser || currentUser.role !== 'HQ_ADMIN') {
      showToast('Unauthorized: Only HQ Admin Users can delete Excel customer records.', 'error');
      return;
    }
    setDeleteExcelTarget(target || null);
    setIsDeleteExcelOpen(true);
  };

  // Permanent Delete Excel & Customer Records - STRICT HQ_ADMIN PERMISSION ONLY
  const handleConfirmDeleteExcel = async (target: DeleteExcelTarget): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'HQ_ADMIN') {
      showToast('Unauthorized: Only HQ Admin Users can delete Excel customer records.', 'error');
      return false;
    }

    console.group(`[HQ Admin Delete Excel: ${target.name}]`);
    console.log(`[Delete Excel: Step 1] Validating target and identifying customer records:`, {
      targetType: target.type,
      targetId: target.id,
      targetName: target.name,
      admin: currentUser.name,
      email: currentUser.email
    });

    try {
      let targetIds: string[] = [];

      if (target.type === 'all') {
        targetIds = records.map(r => r.id);
      } else if (target.type === 'agent' && target.id) {
        const agent = users.find(u => u.id === target.id);
        targetIds = records
          .filter(r => r.assignedAgentId === target.id || (agent && r.assignedAgentName && r.assignedAgentName.trim().toLowerCase() === agent.name.trim().toLowerCase()))
          .map(r => r.id);
      } else if (target.type === 'batch' && target.id) {
        targetIds = records
          .filter(r => r.importedBatchId === target.id || (target.id === 'Initial/Standard Roster' && !r.importedBatchId))
          .map(r => r.id);
      } else if (target.type === 'records' && target.recordIds) {
        targetIds = target.recordIds;
      }

      console.log(`[Delete Excel: Step 2] Found ${targetIds.length} customer records to purge.`);

      // Step 3: Delete from Supabase backend database
      console.log(`[Delete Excel: Step 3] Executing Supabase database deletion...`);
      let supabaseSuccess = false;

      if (target.type === 'all') {
        supabaseSuccess = await supabaseDb.deleteAllCustomers();
      } else if (target.type === 'agent' && target.id) {
        const agent = users.find(u => u.id === target.id);
        const resByAgent = await supabaseDb.deleteCustomersByAgent(target.id, agent?.name);
        const resByIds = targetIds.length > 0 ? await supabaseDb.deleteCustomers(targetIds) : true;
        supabaseSuccess = resByAgent || resByIds;
      } else if (target.type === 'batch' && target.id) {
        const resByBatch = await supabaseDb.deleteCustomersByBatch(target.id);
        const resByIds = targetIds.length > 0 ? await supabaseDb.deleteCustomers(targetIds) : true;
        supabaseSuccess = resByBatch || resByIds;
      } else {
        supabaseSuccess = await supabaseDb.deleteCustomers(targetIds);
      }

      if (!supabaseSuccess) {
        console.error(`[Delete Excel: Step 3 FAILED] Supabase rejected deletion transaction.`);
        showToast('Failed to delete customer records from Supabase backend.', 'error');
        console.groupEnd();
        return false;
      }

      console.log(`[Delete Excel: Step 4] Supabase backend deletion confirmed.`);

      // Step 5: Update React state & localStorage
      const idSet = new Set(targetIds);
      setRecords(prev => {
        const filtered = target.type === 'all' 
          ? [] 
          : prev.filter(r => !idSet.has(r.id));
        localStorage.setItem('mycash_v3_records', JSON.stringify(filtered));
        return filtered;
      });

      // Step 6: Log audit activity
      const deleteLog: ActivityLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        recordId: target.id || `batch-${Date.now()}`,
        customerName: target.name,
        action: 'STATUS_CHANGE',
        details: `[HQ Admin Delete] Purged ${target.name} (${targetIds.length} customer records removed from frontend & Supabase cloud database).`
      };
      setActivityLogs(prev => [deleteLog, ...prev]);
      supabaseDb.insertActivityLog(deleteLog);

      showToast(`Successfully deleted ${target.name} (${targetIds.length} records purged from frontend & Supabase).`);
      console.log(`[Delete Excel: Step 7 COMPLETE] Excel records deleted.`);
      console.groupEnd();

      if (inspectedAgent && target.type === 'agent' && target.id === inspectedAgent.id) {
        setInspectedAgent(null);
      }

      return true;
    } catch (err: any) {
      console.error(`[Delete Excel: FATAL EXCEPTION]`, err);
      showToast(`Error deleting Excel records: ${err?.message || 'Database error'}`, 'error');
      console.groupEnd();
      return false;
    }
  };

  // Switch active user demo
  const handleSwitchUser = (selectedUser: User) => {
    setCurrentUser(selectedUser);
    setFilters(INITIAL_FILTERS);
    setActiveTab('records');
    setIsAuthView(true); // Redirect to normal login page!
    showToast(`Session locked. Please sign in as ${selectedUser.name}.`);
  };

  // Export Excel
  const handleExportExcel = () => {
    if (!currentUser) return;
    const scopeName = currentUser.role === 'HQ_ADMIN' ? 'Global' : currentUser.branch;
    exportToExcel(filteredRecords, `MyCash_${scopeName}_Calls`);
    showToast(`Exported ${filteredRecords.length} records to Excel.`);
  };

  // Export PDF
  const handleExportPdf = () => {
    if (!currentUser) return;
    const filterSummary = filters.statuses.length > 0
      ? `Status: ${filters.statuses.join(', ')}`
      : 'All Outcome Categories';
    exportToPdf(filteredRecords, metrics, currentUser, users, filterSummary, branches);
    showToast(`Generated executive PDF calling report.`);
  };

  // If user navigated to the dedicated full-page Login view or no active session
  if (isAuthView || !currentUser) {
    return (
      <LoginPage
        allUsers={users}
        currentUser={currentUser}
        onUpdateUser={handleUpdateUser}
        inactivityNotice={inactivityNotice}
        onLoginSuccess={(loggedInUser) => {
          const now = Date.now();
          localStorage.setItem('mycash_v3_last_activity', now.toString());
          localStorage.setItem('mycash_v3_current_user', JSON.stringify(loggedInUser));
          localStorage.setItem('mycash_v3_is_auth_view', JSON.stringify(false));
          setInactivityNotice(null);
          setIsSessionWarningOpen(false);
          lastActivityRef.current = now;
          lastStoredWriteRef.current = now;
          setCurrentUser(loggedInUser);
          setIsAuthView(false);
          showToast(`Welcome, ${loggedInUser.name}! Session started.`);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Primary Top Header */}
      <Header
        currentUser={currentUser}
        allUsers={users}
        roleDefinitions={roleDefinitions}
        onSwitchUser={handleSwitchUser}
        onOpenPrdModal={() => setIsPrdModalOpen(true)}
        onOpenBulkImport={(targetAgentId?: string) => {
          setImportTargetAgentId(targetAgentId || '');
          setIsBulkImportOpen(true);
        }}
        onOpenUserManagement={() => {
          setUserManagementTab('users');
          setUserManagementShowAddForm(false);
          setIsUserManagementOpen(true);
        }}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        onLogout={() => {
          setIsSessionWarningOpen(false);
          setIsAuthView(true);
          setCurrentUser(null);
          localStorage.removeItem('mycash_v3_current_user');
          localStorage.removeItem('mycash_v3_last_activity');
          localStorage.setItem('mycash_v3_is_auth_view', JSON.stringify(true));
          setInactivityNotice(null);
          showToast('Signed out of active terminal.');
        }}
        onToggleFocusMode={() => setIsFocusModeActive(!isFocusModeActive)}
        isFocusModeActive={isFocusModeActive}
        searchQuery={filters.searchQuery}
        onSearchChange={(q) => setFilters(prev => ({ ...prev, searchQuery: q }))}
        onOpenLoginScreen={() => {
          setIsSessionWarningOpen(false);
          setIsAuthView(true);
          setCurrentUser(null);
          localStorage.removeItem('mycash_v3_current_user');
          localStorage.removeItem('mycash_v3_last_activity');
          localStorage.setItem('mycash_v3_is_auth_view', JSON.stringify(true));
          setInactivityNotice(null);
        }}
        onRefreshData={() => {
          setRecords(prev => [...prev]);
          showToast('Dashboard metrics & customer roster synchronized.');
        }}
        onOpenProfileSettings={() => setIsProfileSettingsOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Focus Mode View: Role-Adaptive */}
        {isFocusModeActive ? (
          currentUser.role === 'HQ_ADMIN' ? (
            /* HQ ADMIN FOCUS MODE: Supervisors Performance Roll-Up Stats with scroll back & forth */
            <SupervisorsFocusRollUp
              supervisors={supervisorsList}
              teamMembers={teamMembersList}
              records={records}
              branches={branches}
              activityLogs={activityLogs}
              onExit={() => setIsFocusModeActive(false)}
              onInspectAgentExcel={(agent) => setInspectedAgent(agent)}
            />
          ) : (
            /* AGENT / SUPERVISOR FOCUS CALLING SPEED-DIAL */
            <FocusCallingMode
              records={filteredRecords}
              currentUser={currentUser}
              onUpdateRecord={handleUpdateRecord}
              onExit={() => setIsFocusModeActive(false)}
            />
          )
        ) : currentUser.role === 'HQ_ADMIN' ? (
          /* ======================================================= */
          /* HQ ADMIN DASHBOARD: NO RAW EXCEL LIST!                 */
          /* Automatically summarises data from all team members    */
          /* ======================================================= */
          <AdminDashboard
            branches={branches}
            supervisors={supervisorsList}
            teamMembers={teamMembersList}
            records={records}
            activityLogs={activityLogs}
            currentUser={currentUser}
            onInspectAgentExcel={(agent) => setInspectedAgent(agent)}
            onOpenPrdModal={() => setIsPrdModalOpen(true)}
            onOpenBulkImport={(targetAgentId?: string) => {
              setImportTargetAgentId(targetAgentId || '');
              setIsBulkImportOpen(true);
            }}
            onOpenUserManagement={() => setIsUserManagementOpen(true)}
            onOpenDeleteExcel={handleOpenDeleteExcelModal}
            onOpenSetAgentTarget={handleOpenSetAgentTarget}
            onOpenSetBranchTarget={handleOpenSetBranchTarget}
          />
        ) : currentUser.role === 'SUPERVISOR' ? (
          /* ======================================================= */
          /* SUPERVISOR DASHBOARD: NO RAW EXCEL LIST!               */
          /* Automatically summarises data from team members under  */
          /* their supervision                                      */
          /* ======================================================= */
          <SupervisorDashboard
            currentUser={currentUser}
            teamMembers={teamMembersList}
            records={records}
            activityLogs={activityLogs}
            onInspectAgentExcel={(agent) => setInspectedAgent(agent)}
            onAddTeamMember={() => {
              setUserManagementTab('users');
              setUserManagementShowAddForm(true);
              setIsUserManagementOpen(true);
            }}
            onOpenBulkImport={(targetAgentId?: string) => {
              setImportTargetAgentId(targetAgentId || '');
              setIsBulkImportOpen(true);
            }}
            onRefreshData={() => {
              setRecords(prev => [...prev]);
              showToast('Team performance metrics and records updated.');
            }}
          />
        ) : (
          /* ======================================================= */
          /* TEAM MEMBER (AGENT) WORKSPACE: PERSONAL CALLING QUEUE   */
          /* ======================================================= */
          <div className="space-y-5">
            {/* Metric Cards for Agent's Queue */}
            <MetricCards
              metrics={metrics}
              roleName={`${currentUser.name} (Assigned Queue)`}
            />

            {/* Tabbed Navigation Bar for Agent */}
            <div className="bg-white border border-slate-200/90 rounded-lg sm:rounded-md p-1 sm:p-1.5 shadow-xs flex items-center justify-between flex-wrap gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                <button
                  id="tab-calling-records"
                  onClick={() => setActiveTab('records')}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3.5 sm:py-1.5 rounded-sm sm:rounded-xs text-[10.5px] sm:text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'records'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <PhoneCall className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span>Calling Queue</span>
                  <span className={`px-1 sm:px-1.5 py-0.5 rounded-xs text-[9px] sm:text-[10px] font-bold ${
                    activeTab === 'records' ? 'bg-red-800 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {filteredRecords.length}
                  </span>
                </button>

                <button
                  id="tab-appointments"
                  onClick={() => setActiveTab('appointments')}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3.5 sm:py-1.5 rounded-sm sm:rounded-xs text-[10.5px] sm:text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'appointments'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <CalendarCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span>
                    <span className="hidden sm:inline">My Scheduled </span>Appointments
                  </span>
                  <span className={`px-1 sm:px-1.5 py-0.5 rounded-xs text-[9px] sm:text-[10px] font-bold ${
                    activeTab === 'appointments' ? 'bg-red-800 text-white' : 'bg-red-100 text-red-700'
                  }`}>
                    {upcomingAppointments.length}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 pr-1 sm:pr-2">
                <button
                  onClick={() => setIsFocusModeActive(true)}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-sky-50 text-sky-800 border border-sky-200 text-[10.5px] sm:text-xs font-bold hover:bg-sky-100 transition-colors cursor-pointer"
                  title="Open High Productivity Focus Calling Mode"
                >
                  <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-600 shrink-0" />
                  <span>Focus<span className="hidden sm:inline"> Queue</span></span>
                </button>

                <span className="hidden md:inline-flex text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                  {currentUser.branch}
                </span>
              </div>
            </div>

            {/* Active Subtab View */}
            {activeTab === 'records' ? (
              <div className="space-y-4">
                <FiltersBar
                  filters={filters}
                  onFilterChange={setFilters}
                  currentUser={currentUser}
                  branches={branches}
                  supervisors={supervisorsList}
                  teamMembers={teamMembersList}
                  onReset={() => setFilters(INITIAL_FILTERS)}
                />

                <DataTable
                  records={filteredRecords}
                  currentUser={currentUser}
                  onUpdateRecord={handleUpdateRecord}
                  onOpenCustomerDrawer={(rec) => setDrawerRecord(rec)}
                  onRequestDeleteRecords={(ids) => handleOpenDeleteExcelModal({
                    type: 'records',
                    name: `${ids.length} Selected Customer Records`,
                    recordCount: ids.length,
                    recordIds: ids
                  })}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                      <CalendarCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
                      Scheduled Follow-up & Callback Appointments
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                      Customers assigned to you who requested callbacks
                    </p>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-3 sm:py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg sm:rounded-xl self-start sm:self-auto">
                    {upcomingAppointments.length} Booked Callbacks
                  </span>
                </div>

                <DataTable
                  records={upcomingAppointments}
                  currentUser={currentUser}
                  onUpdateRecord={handleUpdateRecord}
                  onOpenCustomerDrawer={(rec) => setDrawerRecord(rec)}
                  onRequestDeleteRecords={(ids) => handleOpenDeleteExcelModal({
                    type: 'records',
                    name: `${ids.length} Selected Customer Records`,
                    recordCount: ids.length,
                    recordIds: ids
                  })}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-3 sm:py-5 mt-6 sm:mt-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-[10px] sm:text-xs text-slate-500 gap-2 sm:gap-3 text-center sm:text-left">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center sm:justify-start">
            <img 
              src="/images/LOGODES..png" 
              alt="MyCash Logo" 
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0" 
            />
            <strong className="text-slate-800 font-bold text-[9px] sm:text-[10.5px] tracking-tight">MYCASH CALLING PORTAL</strong>
            <span className="hidden xs:inline text-slate-300">•</span>
            <span className="text-[9.5px] sm:text-xs text-slate-500 hidden xs:inline">Enterprise Tele-Sales & Lead Telemetry</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 sm:gap-3 flex-wrap justify-center text-[10px] sm:text-xs">
            <span className="text-slate-400 text-[9.5px] sm:text-xs">v1.0.0</span>
          </div>
        </div>
      </footer>

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 backdrop-blur-md text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150 border ${
          toast.type === 'error'
            ? 'bg-rose-900/95 text-rose-50 border-rose-700 shadow-rose-950/40'
            : 'bg-slate-900/95 text-white border-slate-800'
        }`}>
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Modals */}
      <PrdViewerModal
        isOpen={isPrdModalOpen}
        onClose={() => setIsPrdModalOpen(false)}
      />

      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => {
          setIsBulkImportOpen(false);
          setImportTargetAgentId('');
        }}
        currentUser={currentUser}
        teamMembers={teamMembersList}
        preselectedAgentId={importTargetAgentId}
        onCommitImport={handleCommitImport}
      />

      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        currentUser={currentUser}
        allUsers={users}
        branches={branches}
        roleDefinitions={roleDefinitions}
        initialTab={userManagementTab}
        initialShowAddForm={userManagementShowAddForm}
        onAddUser={handleAddUser}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
        onToggleUserActive={handleToggleUserActive}
        onUpdateRoleDefinitions={handleUpdateRoleDefinitions}
      />

      {/* Customer Detail Drawer */}
      <CustomerDetailDrawer
        record={drawerRecord}
        onClose={() => setDrawerRecord(null)}
        currentUser={currentUser}
        onUpdateRecord={handleUpdateRecord}
        activityLogs={activityLogs}
      />

      {/* Agent Excel Inspection Modal (Audit Drilldown) */}
      <AgentExcelInspectionModal
        isOpen={!!inspectedAgent}
        onClose={() => setInspectedAgent(null)}
        agent={inspectedAgent}
        supervisorName={
          supervisorsList.find(s => s.id === inspectedAgent?.supervisorId || s.branch === inspectedAgent?.branch)?.name
        }
        records={records}
        currentUser={currentUser}
        onUpdateRecord={handleUpdateRecord}
        onDeleteExcel={(target) => handleOpenDeleteExcelModal(target)}
      />

      {/* Delete Excel & Customer Records Confirmation Modal (Exclusive to HQ Admin) */}
      <DeleteExcelModal
        isOpen={isDeleteExcelOpen}
        onClose={() => {
          setIsDeleteExcelOpen(false);
          setDeleteExcelTarget(null);
        }}
        currentUser={currentUser}
        records={records}
        teamMembers={teamMembersList}
        initialTarget={deleteExcelTarget}
        onConfirmDelete={handleConfirmDeleteExcel}
      />

      {/* Set Weekly & Monthly Target Modal for Agents & Branches (Exclusive to HQ Admin) */}
      <SetTargetModal
        isOpen={isSetTargetOpen}
        onClose={() => {
          setIsSetTargetOpen(false);
          setTargetAgentForModal(null);
          setTargetBranchForModal(null);
        }}
        currentUser={currentUser || INITIAL_USERS[0]}
        targetAgent={targetAgentForModal}
        targetBranch={targetBranchForModal}
        allUsers={users}
        records={records}
        onSaveAgentTarget={handleSaveAgentTarget}
        onSaveBranchTarget={handleSaveBranchTarget}
      />

      {/* User Profile Settings Modal */}
      <ProfileSettingsModal
        isOpen={isProfileSettingsOpen}
        onClose={() => setIsProfileSettingsOpen(false)}
        currentUser={currentUser}
        onUpdatePassword={handleUpdatePassword}
      />

      {/* Force Change Password Modal if active session requires initial password configuration */}
      {currentUser && currentUser.mustChangePassword && (
        <PasswordForceChangeModal
          userName={currentUser.name}
          onPasswordChange={handleUpdatePassword}
        />
      )}

      {/* 30-Minute Inactivity Auto-Close Warning Modal */}
      <SessionInactivityModal
        isOpen={isSessionWarningOpen}
        secondsRemaining={warningSecondsRemaining}
        onStayLoggedIn={() => recordActivity(true)}
        onLogoutNow={handleSessionTimeout}
      />
    </div>
  );
}
