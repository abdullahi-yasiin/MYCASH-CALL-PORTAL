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
  CheckCircle2,
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
  DeleteExcelTarget,
  isRecordAssignedBySupervisor
} from './types';
import { 
  INITIAL_BRANCHES, 
  INITIAL_USERS, 
  INITIAL_CUSTOMERS, 
  INITIAL_ACTIVITY_LOGS 
} from './data/mockData';
import { INITIAL_ROLE_DEFINITIONS, checkUserPermission } from './data/rolesPermissions';
import { calculateMetrics, filterRecords } from './utils/metrics';
import { exportToExcel, exportToPdf, printPdfReportViaCssGrid } from './utils/exportEngine';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { FiltersBar } from './components/FiltersBar';
import { DataTable } from './components/DataTable';
import { BulkImportModal } from './components/BulkImportModal';
import { AdminSupervisorsTab } from './components/AdminSupervisorsTab';
import { SupervisorTeamTab } from './components/SupervisorTeamTab';
import { PrdViewerModal } from './components/PrdViewerModal';
import { UserManagementModal } from './components/UserManagementModal';
import { BulkUserImportModal } from './components/BulkUserImportModal';
import { EmailConfigurationModal } from './components/EmailConfigurationModal';
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
import { AiIntelligenceModal } from './components/AiIntelligenceModal';
import { MarkAsCalledModal } from './components/MarkAsCalledModal';
import { AppointmentsListTable } from './components/AppointmentsListTable';
import { supabase, supabaseDb, fromDBCustomerRecord } from './lib/supabase';
import { safeStorage, saveRecordsToIDB, getRecordsFromIDB } from './utils/safeStorage';

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

// Purge deleted test records and deduplicate records by ID, while strictly preserving all real customer leads
export function sanitizeRecordsWithAgentUsers(
  recordsList: CustomerRecord[], 
  userList: User[]
): { valid: CustomerRecord[]; orphaned: CustomerRecord[] } {
  const seenIds = new Set<string>();
  const cleanList: CustomerRecord[] = [];

  for (const r of recordsList) {
    if (!r || !r.id || seenIds.has(r.id)) {
      continue;
    }

    // Purge any deleted test records and test appointments whose excel record was deleted
    if (
      r.id === 'rec-imp-1791793349671-127' || 
      (r.customerName && (r.customerName.toLowerCase().includes('test appointment') || (r.customerName.toLowerCase().trim() === 'test' && r.appointment))) ||
      (r.feedbackNote && r.feedbackNote.toLowerCase().includes('test appointment')) ||
      (r.appointment && r.appointment.toLowerCase().includes('test appointment')) ||
      (r.customerName === '' && r.appointment)
    ) {
      continue;
    }

    seenIds.add(r.id);
    cleanList.push(r);
  }

  // Preserve all customer records (including unassigned pool leads and excel agents)
  return { valid: cleanList, orphaned: [] };
}

export default function App() {
  // Persistent state
  const [users, setUsers] = useState<User[]>(() => {
    const saved = safeStorage.getItem('mycash_v3_users');
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
    const saved = safeStorage.getItem('mycash_v3_branches');
    if (saved) {
      try {
        const parsed: BranchInfo[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingIds = new Set(parsed.map(b => b.id));
          const existingNames = new Set(parsed.map(b => b.name.toLowerCase()));
          const missing = INITIAL_BRANCHES.filter(
            b => !existingIds.has(b.id) && !existingNames.has(b.name.toLowerCase())
          );
          if (missing.length > 0) {
            const merged = [...parsed, ...missing];
            safeStorage.setItem('mycash_v3_branches', JSON.stringify(merged));
            return merged;
          }
          return parsed;
        }
      } catch (e) {
        return INITIAL_BRANCHES;
      }
    }
    return INITIAL_BRANCHES;
  });

  const [records, setRecords] = useState<CustomerRecord[]>(() => {
    const saved = safeStorage.getItem('mycash_v3_records');
    const savedUsers = safeStorage.getItem('mycash_v3_users');
    let loadedUsers: User[] = INITIAL_USERS;
    if (savedUsers) {
      try {
        const parsed = JSON.parse(savedUsers);
        if (Array.isArray(parsed) && parsed.length > 0) loadedUsers = parsed;
      } catch (e) {}
    }
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const raw = parsed.map(fromDBCustomerRecord);
          const { valid } = sanitizeRecordsWithAgentUsers(raw, loadedUsers);
          return valid;
        }
      } catch (e) {
        // Fallback
      }
    }
    return [];
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = safeStorage.getItem('mycash_v3_logs');
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
    const saved = safeStorage.getItem('mycash_v2_roles');
    return saved ? JSON.parse(saved) : INITIAL_ROLE_DEFINITIONS;
  });

  // Current logged in user (null if not authenticated yet)
  // Close/End session only IF the session is not active for 30 minutes
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = safeStorage.getItem('mycash_v3_current_user');
    const lastActive = safeStorage.getItem('mycash_v3_last_activity');
    if (savedUser) {
      if (lastActive) {
        const elapsed = Date.now() - parseInt(lastActive, 10);
        if (elapsed >= SESSION_INACTIVITY_LIMIT_MS) {
          // Session expired due to 30 minutes of inactivity
          console.warn('[Session Security] Session closed upon load: Inactive for 30+ minutes.');
          safeStorage.removeItem('mycash_v3_current_user');
          safeStorage.removeItem('mycash_v3_last_activity');
          safeStorage.setItem('mycash_v3_is_auth_view', JSON.stringify(true));
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
    const savedUser = safeStorage.getItem('mycash_v3_current_user');
    const lastActive = safeStorage.getItem('mycash_v3_last_activity');
    if (!savedUser) return true;
    if (lastActive) {
      const elapsed = Date.now() - parseInt(lastActive, 10);
      if (elapsed >= SESSION_INACTIVITY_LIMIT_MS) {
        return true;
      }
    }
    const savedAuth = safeStorage.getItem('mycash_v3_is_auth_view');
    return savedAuth ? JSON.parse(savedAuth) : false;
  });

  // Session 30-Minute Inactivity Auto-Close State
  const [inactivityNotice, setInactivityNotice] = useState<string | null>(() => {
    const lastActive = safeStorage.getItem('mycash_v3_last_activity');
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
  const isRecordsInitializedRef = useRef<boolean>(records.length > 0);

  // Focus Calling Mode for high-productivity outbound dialing
  const [isFocusModeActive, setIsFocusModeActive] = useState<boolean>(false);

  // Customer Detail Drawer
  const [drawerRecord, setDrawerRecord] = useState<CustomerRecord | null>(null);

  // Inspected Agent for Excel Roster Audit Drilldown (for Admin & Supervisor)
  const [inspectedAgent, setInspectedAgent] = useState<User | null>(null);

  // Active top-level tab (for team members)
  const [activeTab, setActiveTab] = useState<'records' | 'adminAnalytics' | 'supervisorTeam' | 'appointments'>('records');
  const [agentAppointmentSubTab, setAgentAppointmentSubTab] = useState<'all' | 'myBooked' | 'assignedBySupervisor' | 'previous'>('all');
  const [markAsCalledRecord, setMarkAsCalledRecord] = useState<CustomerRecord | null>(null);

  // Filters
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  // Modals state
  const [isPrdModalOpen, setIsPrdModalOpen] = useState<boolean>(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);
  const [importTargetAgentId, setImportTargetAgentId] = useState<string>('');
  const [isUserManagementOpen, setIsUserManagementOpen] = useState<boolean>(false);
  const [isBulkUserImportOpen, setIsBulkUserImportOpen] = useState<boolean>(false);
  const [userManagementTab, setUserManagementTab] = useState<'users' | 'roles'>('users');
  const [userManagementShowAddForm, setUserManagementShowAddForm] = useState<boolean>(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState<boolean>(false);
  const [isDeleteExcelOpen, setIsDeleteExcelOpen] = useState<boolean>(false);
  const [deleteExcelTarget, setDeleteExcelTarget] = useState<DeleteExcelTarget | null>(null);
  const [isSetTargetOpen, setIsSetTargetOpen] = useState<boolean>(false);
  const [targetAgentForModal, setTargetAgentForModal] = useState<User | null>(null);
  const [targetBranchForModal, setTargetBranchForModal] = useState<BranchInfo | null>(null);
  const [isAiIntelligenceOpen, setIsAiIntelligenceOpen] = useState<boolean>(false);
  const [isEmailConfigOpen, setIsEmailConfigOpen] = useState<boolean>(false);

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
    safeStorage.removeItem('mycash_v3_current_user');
    safeStorage.removeItem('mycash_v3_last_activity');
    safeStorage.setItem('mycash_v3_is_auth_view', JSON.stringify(true));
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
      safeStorage.setItem('mycash_v3_last_activity', now.toString());
    }
  }, []);

  // Monitor user activity and enforce 30-minute inactivity limit
  useEffect(() => {
    if (!currentUser || isAuthView) {
      setIsSessionWarningOpen(false);
      return;
    }

    // Initialize or verify last active timestamp
    const existingLastActive = safeStorage.getItem('mycash_v3_last_activity');
    if (!existingLastActive) {
      const now = Date.now();
      safeStorage.setItem('mycash_v3_last_activity', now.toString());
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
      const storedLast = safeStorage.getItem('mycash_v3_last_activity');
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
      const storedLast = safeStorage.getItem('mycash_v3_last_activity');
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

        // Synchronize Users with robust error handling and tracking logs
        let activeUsers: User[] = users;
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
                  activeUsers = updatedUsers;
                  const freshAdmin = updatedUsers.find(u => u.id === 'u-admin-1') || defaultAdmin;
                  setCurrentUser(prev => prev && prev.id === 'u-admin-1' ? freshAdmin : prev);
                } else {
                  console.error('[Supabase Users Sync: Step 3 FAILED] Failed to provision default HQ Admin:', adminResult.error);
                }
              } else {
                console.log('[Supabase Users Sync: Step 3 Verified] HQ Admin account verified in cloud database. Updating UI state.');
                setUsers(remoteUsers);
                activeUsers = remoteUsers;
                const syncedAdmin = existingAdmin;
                setCurrentUser(prev => {
                  if (!prev) return null;
                  if (prev.id === 'u-admin-1') return syncedAdmin;
                  const stillExists = remoteUsers.find(u => u.id === prev.id);
                  if (!stillExists) {
                    console.warn(`[Supabase Users Sync: Session Terminated] User ID "${prev.id}" was not found in remote database. Clearing stale local session.`);
                    safeStorage.removeItem('mycash_v3_current_user');
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

        // Safe Customer Records Sync with Supabase
        if (conn.tables.customerRecords) {
          // Fetch existing customers from remote DB to ensure persistence
          const remoteCustomers = await supabaseDb.fetchCustomers();
          if (remoteCustomers !== null && remoteCustomers.length > 0) {
            const { valid } = sanitizeRecordsWithAgentUsers(remoteCustomers, activeUsers);
            if (valid.length > 0) {
              setRecords(valid);
              isRecordsInitializedRef.current = true;
              saveRecordsToIDB(valid);
              if (valid.length <= 500) {
                safeStorage.setItem('mycash_v3_records', JSON.stringify(valid));
              }
            }
          } else if (remoteCustomers !== null && remoteCustomers.length === 0) {
            // Remote database has 0 records (e.g. after database purge/reset) - clear local cache so UI is in sync
            setRecords([]);
            isRecordsInitializedRef.current = true;
            saveRecordsToIDB([]);
            safeStorage.removeItem('mycash_v3_records');
          }
        }

        if (conn.tables.activityLogs) {
          // Sync activity logs
          const remoteLogs = await supabaseDb.fetchActivityLogs();
          if (remoteLogs && remoteLogs.length > 0) {
            setActivityLogs(remoteLogs);
          } else {
            // Push local logs to cloud
            const savedLocalLogs = safeStorage.getItem('mycash_v3_logs');
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
      } catch (e) {
        console.warn('[Supabase Sync: Warning] Automated cloud sync notice:', e);
      }
    }

    initAutomatedSupabaseSync();

    // Supabase Realtime synchronization for customer_records
    const channel = supabase
      .channel('realtime_customer_records')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_records' },
        async () => {
          try {
            console.log('[Supabase Realtime: Event] customer_records modified in backend. Refreshing...');
            const remoteCustomers = await supabaseDb.fetchCustomers();
            if (remoteCustomers !== null && remoteCustomers.length > 0) {
              // Get current users from state/safeStorage to sanitize
              const savedUsersStr = safeStorage.getItem('mycash_v3_users');
              let currentUsersList = users;
              if (savedUsersStr) {
                try {
                  const parsed = JSON.parse(savedUsersStr);
                  if (Array.isArray(parsed) && parsed.length > 0) currentUsersList = parsed;
                } catch (e) {}
              }
              const { valid } = sanitizeRecordsWithAgentUsers(remoteCustomers, currentUsersList);
              if (valid.length > 0) {
                setRecords(prev => {
                  if (prev.length === 0) return valid;
                  const localMap = new Map(prev.map(r => [r.id, r]));
                  const merged = valid.map(remoteRec => {
                    const local = localMap.get(remoteRec.id);
                    if (local) {
                      const localTime = local.updatedAt || local.createdAt || '';
                      const remoteTime = remoteRec.updatedAt || remoteRec.createdAt || '';
                      if (localTime >= remoteTime) {
                        return local;
                      }
                    }
                    return remoteRec;
                  });
                  const remoteIds = new Set(valid.map(r => r.id));
                  const localOnly = prev.filter(r => !remoteIds.has(r.id));
                  const combined = [...localOnly, ...merged];
                  const finalMap = new Map<string, CustomerRecord>();
                  for (const r of combined) {
                    if (r && r.id && !finalMap.has(r.id)) {
                      finalMap.set(r.id, r);
                    }
                  }
                  const finalList = Array.from(finalMap.values());
                  saveRecordsToIDB(finalList);
                  if (finalList.length <= 500) {
                    safeStorage.setItem('mycash_v3_records', JSON.stringify(finalList));
                  }
                  return finalList;
                });
                isRecordsInitializedRef.current = true;
              }
            }
          } catch (e) {
            console.warn('[Supabase Realtime: Notice] Error refreshing records:', e);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Hydrate records from IndexedDB if localStorage was empty or cleared
  useEffect(() => {
    let isMounted = true;
    if (records.length === 0) {
      getRecordsFromIDB().then(cachedRecords => {
        if (!isMounted) return;
        if (cachedRecords && cachedRecords.length > 0) {
          setRecords(prev => {
            if (prev.length === 0) {
              const { valid } = sanitizeRecordsWithAgentUsers(cachedRecords, users);
              return valid;
            }
            return prev;
          });
        }
        isRecordsInitializedRef.current = true;
      });
    } else {
      isRecordsInitializedRef.current = true;
    }
    return () => {
      isMounted = false;
    };
  }, []);

  // Synchronize storage safely with QuotaExceeded resilience
  useEffect(() => {
    safeStorage.setItem('mycash_v3_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      safeStorage.setItem('mycash_v3_current_user', JSON.stringify(currentUser));
    } else {
      safeStorage.removeItem('mycash_v3_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    safeStorage.setItem('mycash_v3_is_auth_view', JSON.stringify(isAuthView));
  }, [isAuthView]);

  useEffect(() => {
    // Prevent wiping IndexedDB with [] on initial mount before IDB hydration
    if (!isRecordsInitializedRef.current && records.length === 0) {
      return;
    }
    isRecordsInitializedRef.current = true;
    saveRecordsToIDB(records);
    if (records.length <= 500) {
      safeStorage.setItem('mycash_v3_records', JSON.stringify(records));
    }
  }, [records]);

  useEffect(() => {
    // Retain up to 100 recent logs in local storage cache to protect quota
    safeStorage.setItem('mycash_v3_logs', JSON.stringify(activityLogs.slice(0, 100)));
  }, [activityLogs]);

  useEffect(() => {
    safeStorage.setItem('mycash_v2_roles', JSON.stringify(roleDefinitions));
  }, [roleDefinitions]);

  // Filtered customer records based on role and active filters
  const filteredRecords = useMemo(() => {
    return filterRecords(records, filters, currentUser);
  }, [records, filters, currentUser]);

  // Agent Calling Queue records: Strictly original Excel roster leads, excluding records assigned by supervisor
  const agentCallingQueueRecords = useMemo(() => {
    if (currentUser?.role === 'TEAM_MEMBER') {
      return filteredRecords.filter(r => !isRecordAssignedBySupervisor(r));
    }
    return filteredRecords;
  }, [filteredRecords, currentUser]);

  // Calculated metrics adhering to Unique Call State Rule & Deduplication Logic
  const metrics = useMemo(() => {
    if (currentUser?.role === 'TEAM_MEMBER') {
      return calculateMetrics(agentCallingQueueRecords);
    }
    return calculateMetrics(filteredRecords);
  }, [filteredRecords, agentCallingQueueRecords, currentUser]);

  // Appointments today or upcoming (for agent: both self-booked appointments and supervisor-assigned appointments)
  const upcomingAppointments = useMemo(() => {
    if (currentUser?.role === 'TEAM_MEMBER') {
      return records.filter(r => {
        const isAssignedToAgent = r.assignedAgentId === currentUser.id ||
          (r.assignedAgentName && r.assignedAgentName.trim().toLowerCase() === currentUser.name.trim().toLowerCase());
        if (!isAssignedToAgent) return false;

        const hasAppointment = Boolean(r.appointment && r.appointment.trim() !== '');
        const isSupervisorAssigned = isRecordAssignedBySupervisor(r);

        return (hasAppointment || isSupervisorAssigned) && !r.appointmentCompleted;
      }).sort((a, b) => {
        const aAppt = (a.appointment || '').trim();
        const bAppt = (b.appointment || '').trim();
        if (aAppt && !bAppt) return -1;
        if (!aAppt && bAppt) return 1;
        return aAppt.localeCompare(bAppt);
      });
    }
    return filteredRecords.filter(r => ((r.appointment && r.appointment.trim() !== '') || isRecordAssignedBySupervisor(r)) && !r.appointmentCompleted).sort((a, b) => {
      const aAppt = (a.appointment || '').trim();
      const bAppt = (b.appointment || '').trim();
      if (aAppt && !bAppt) return -1;
      if (!aAppt && bAppt) return 1;
      return aAppt.localeCompare(bAppt);
    });
  }, [records, filteredRecords, currentUser]);

  // Completed / Previous Appointments (for agent)
  const previousAppointments = useMemo(() => {
    if (currentUser?.role === 'TEAM_MEMBER') {
      return records.filter(r => {
        const isAssignedToAgent = r.assignedAgentId === currentUser.id ||
          (r.assignedAgentName && r.assignedAgentName.trim().toLowerCase() === currentUser.name.trim().toLowerCase());
        if (!isAssignedToAgent) return false;
        return r.appointmentCompleted === true;
      }).sort((a, b) => {
        const aDate = a.appointmentCompletedAt || a.callDate || '';
        const bDate = b.appointmentCompletedAt || b.callDate || '';
        return bDate.localeCompare(aDate);
      });
    }
    return records.filter(r => r.appointmentCompleted === true).sort((a, b) => {
      const aDate = a.appointmentCompletedAt || a.callDate || '';
      const bDate = b.appointmentCompletedAt || b.callDate || '';
      return bDate.localeCompare(aDate);
    });
  }, [records, currentUser]);

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
    setRecords(prev => {
      const nextList = prev.map(r => (r.id === updatedRecord.id ? updatedRecord : r));
      saveRecordsToIDB(nextList);
      if (nextList.length <= 500) {
        safeStorage.setItem('mycash_v3_records', JSON.stringify(nextList));
      }
      return nextList;
    });

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

  // Mark as Called handler: saves customer feedback note and moves appointment to Previous Appointments
  const handleSaveMarkAsCalled = (record: CustomerRecord, feedbackNote: string, status: CallStatus) => {
    if (!currentUser) return;
    const updated: CustomerRecord = {
      ...record,
      appointmentCompleted: true,
      appointmentCompletedAt: new Date().toISOString(),
      appointmentCompletedBy: currentUser.name,
      feedbackNote,
      status,
      hasBeenCalled: true,
      callDate: new Date().toISOString().split('T')[0],
      callCount: Math.max(1, (record.callCount || 0) + 1),
      updatedAt: new Date().toISOString()
    };
    handleUpdateRecord(updated, `Marked appointment as called for ${record.customerName} (${status})`);
    showToast(`Appointment for ${record.customerName} marked as called and recorded in Previous Appointments.`);
  };

  // Bulk import commit handler
  const handleCommitImport = (newRecords: CustomerRecord[], batchName: string) => {
    if (!currentUser) return;
    setRecords(prev => {
      const recMap = new Map<string, CustomerRecord>();
      for (const r of newRecords) {
        if (r && r.id) recMap.set(r.id, r);
      }
      for (const r of prev) {
        if (r && r.id && !recMap.has(r.id)) {
          recMap.set(r.id, r);
        }
      }
      const combined = Array.from(recMap.values());
      saveRecordsToIDB(combined);
      if (combined.length <= 500) {
        safeStorage.setItem('mycash_v3_records', JSON.stringify(combined));
      }
      return combined;
    });

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

      // Step 4: Update UI state and safeStorage ONLY after successful DB transaction
      console.log(`[User Creation: Step 4] Updating React application state and local cache...`);
      setUsers(prev => {
        const exists = prev.some(u => u.id === newUser.id);
        const updated = exists
          ? prev.map(u => u.id === newUser.id ? newUser : u)
          : [...prev, newUser];
        safeStorage.setItem('mycash_v3_users', JSON.stringify(updated));
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

  // Bulk import multiple users with transactional batch database upsert and audit logging
  const handleCommitBulkUsers = async (importedUsers: User[], auditDetails: string): Promise<boolean> => {
    console.group(`[Bulk Users Transaction: Count ${importedUsers.length}]`);
    try {
      // Step 1: Commit batch directly to Supabase cloud database
      const dbRes = await supabaseDb.batchUpsertUsers(importedUsers);
      if (!dbRes.success) {
        console.error('[Bulk Users Transaction: Error] Supabase rejected batch:', dbRes.error);
        showToast(`Database rejected bulk users: ${dbRes.error}`, 'error');
        console.groupEnd();
        return false;
      }

      // Step 2: Merge into local React state and local storage cache
      setUsers(prev => {
        const userMap = new Map(prev.map(u => [u.id, u]));
        importedUsers.forEach(u => {
          userMap.set(u.id, u);
        });
        const updated = Array.from(userMap.values());
        safeStorage.setItem('mycash_v3_users', JSON.stringify(updated));
        return updated;
      });

      // Step 3: Insert comprehensive activity log
      const bulkLog: ActivityLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'HQ Admin',
        userRole: currentUser?.role || 'HQ_ADMIN',
        recordId: `bulk-users-${Date.now()}`,
        customerName: 'HQ User Administration',
        action: 'STATUS_CHANGE',
        details: auditDetails
      };
      setActivityLogs(prev => [bulkLog, ...prev]);
      supabaseDb.insertActivityLog(bulkLog);

      showToast(`Bulk imported ${importedUsers.length} user accounts successfully!`);
      console.log('[Bulk Users Transaction: Complete] Successfully committed and synchronized.');
      console.groupEnd();
      return true;
    } catch (err: any) {
      console.error('[Bulk Users Transaction: Exception]', err);
      showToast(`Error committing bulk users: ${err?.message || 'Transaction error'}`, 'error');
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
        safeStorage.setItem('mycash_v3_users', JSON.stringify(updated));
        return updated;
      });
      if (currentUser && currentUser.id === updatedUser.id) {
        setCurrentUser(updatedUser);
        safeStorage.setItem('mycash_v3_current_user', JSON.stringify(updatedUser));
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
    safeStorage.setItem('mycash_v3_current_user', JSON.stringify(updatedUser));
    setUsers(prev => {
      const updated = prev.map(u => u.id === currentUser.id ? updatedUser : u);
      safeStorage.setItem('mycash_v3_users', JSON.stringify(updated));
      return updated;
    });
    await supabaseDb.upsertUser(updatedUser);
    await supabaseDb.updateUserPassword(currentUser.id, newPassword);
    showToast('Your security password has been updated and encrypted in cloud.');
  };

  // Delete user account and cascade delete all associated customer records from database & frontend
  const handleDeleteUser = async (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    const targetName = targetUser?.name;
    console.group(`[HQ Admin User Deletion] User: ${userId} (${targetName || 'Unknown'})`);

    // 1. Identify all customer records associated with this user
    const recordsToDelete = records.filter(r => 
      r.assignedAgentId === userId || 
      (targetName && r.assignedAgentName && r.assignedAgentName.trim().toLowerCase() === targetName.trim().toLowerCase()) ||
      (targetUser?.role === 'SUPERVISOR' && r.supervisorId === userId)
    );
    const recordIdsToDelete = recordsToDelete.map(r => r.id);
    console.log(`[User Deletion] Found ${recordIdsToDelete.length} customer records belonging to "${targetName || userId}" to purge.`);

    // 2. Delete customer records from Supabase backend database
    if (recordIdsToDelete.length > 0) {
      console.log(`[User Deletion] Purging customer records by IDs from Supabase...`);
      await supabaseDb.deleteCustomers(recordIdsToDelete);
    }
    if (userId || targetName) {
      console.log(`[User Deletion] Purging customer records by agent ID/name from Supabase...`);
      await supabaseDb.deleteCustomersByAgent(userId, targetName);
    }

    // 3. Delete user from Supabase backend database
    console.log(`[User Deletion] Purging user account from Supabase...`);
    const success = await supabaseDb.deleteUser(userId, targetName);
    if (!success) {
      console.error(`[User Deletion: FAILED] Database could not delete user ${userId}.`);
      showToast('Failed to delete user account from cloud database.', 'error');
      console.groupEnd();
      return;
    }

    // 4. Update Frontend State: Purge customer records from React state & safeStorage
    if (recordIdsToDelete.length > 0) {
      const idSet = new Set(recordIdsToDelete);
      setRecords(prev => {
        const remaining = prev.filter(r => 
          !idSet.has(r.id) &&
          r.assignedAgentId !== userId &&
          !(targetName && r.assignedAgentName && r.assignedAgentName.trim().toLowerCase() === targetName.trim().toLowerCase()) &&
          !(targetUser?.role === 'SUPERVISOR' && r.supervisorId === userId)
        );
        saveRecordsToIDB(remaining);
        if (remaining.length <= 250) {
          safeStorage.setItem('mycash_v3_records', JSON.stringify(remaining));
        } else {
          safeStorage.removeItem('mycash_v3_records');
        }
        return remaining;
      });
    }

    // 5. Update Frontend State: Remove user from React state & safeStorage
    setUsers(prev => {
      const filtered = prev.filter(u => u.id !== userId);
      safeStorage.setItem('mycash_v3_users', JSON.stringify(filtered));
      return filtered;
    });

    // 6. Generate detailed audit activity log
    const deletionLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || 'system',
      userName: currentUser?.name || 'HQ Admin',
      userRole: currentUser?.role || 'HQ_ADMIN',
      recordId: userId,
      customerName: targetName || 'User Account',
      action: 'STATUS_CHANGE',
      details: recordIdsToDelete.length > 0
        ? `HQ Admin permanently deleted ${targetUser?.role || 'user'} account "${targetName}" and purged all ${recordIdsToDelete.length} associated customer records from database and roster.`
        : `HQ Admin permanently deleted ${targetUser?.role || 'user'} account "${targetName}" from system.`
    };
    setActivityLogs(prev => [deletionLog, ...prev]);
    supabaseDb.insertActivityLog(deletionLog);

    // 7. Toast confirmation
    if (recordIdsToDelete.length > 0) {
      showToast(`User "${targetName}" and ${recordIdsToDelete.length} customer records were permanently deleted from cloud database & portal.`);
    } else {
      showToast(`User account "${targetName || userId}" permanently deleted from portal & cloud database.`);
    }
    console.groupEnd();
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
      safeStorage.setItem('mycash_v3_users', JSON.stringify(updated));
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
      safeStorage.setItem('mycash_v3_users', JSON.stringify(updated));
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
      safeStorage.setItem('mycash_v3_logs', JSON.stringify(updated.slice(0, 100)));
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
      safeStorage.setItem('mycash_v3_branches', JSON.stringify(updated));
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
      safeStorage.setItem('mycash_v3_logs', JSON.stringify(updated.slice(0, 100)));
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
        const agentNameClean = agent?.name?.trim().toLowerCase();
        targetIds = records
          .filter(r => 
            r.assignedAgentId === target.id || 
            (agentNameClean && r.assignedAgentName && r.assignedAgentName.trim().toLowerCase() === agentNameClean) ||
            r.reassignedFromAgentId === target.id ||
            (agentNameClean && r.reassignedFromAgentName && r.reassignedFromAgentName.trim().toLowerCase() === agentNameClean) ||
            (target.id && r.supervisorNote && r.supervisorNote.includes(target.id))
          )
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
        console.warn(`[Delete Excel: Step 3 Notice] Supabase deletion transaction was unavailable or skipped; proceeding with local deletion.`);
      } else {
        console.log(`[Delete Excel: Step 4] Supabase backend deletion confirmed.`);
      }

      // Step 5: Update React state & safeStorage with IndexedDB persistence
      const idSet = new Set(targetIds);
      setRecords(prev => {
        const filtered = target.type === 'all' 
          ? [] 
          : prev.filter(r => !idSet.has(r.id));
        saveRecordsToIDB(filtered);
        if (filtered.length <= 250) {
          safeStorage.setItem('mycash_v3_records', JSON.stringify(filtered));
        } else {
          safeStorage.removeItem('mycash_v3_records');
        }
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

  // Print / CSS Grid PDF Report
  const handlePrintReport = () => {
    if (!currentUser) return;
    const filterSummary = filters.statuses.length > 0
      ? `Status: ${filters.statuses.join(', ')}`
      : 'All Outcome Categories';
    printPdfReportViaCssGrid(filteredRecords, metrics, currentUser, users, filterSummary, branches);
    showToast(`Opened print-optimized CSS Grid report.`);
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
          safeStorage.setItem('mycash_v3_last_activity', now.toString());
          safeStorage.setItem('mycash_v3_current_user', JSON.stringify(loggedInUser));
          safeStorage.setItem('mycash_v3_is_auth_view', JSON.stringify(false));
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
        onPrintReport={handlePrintReport}
        onLogout={() => {
          setIsSessionWarningOpen(false);
          setIsAuthView(true);
          setCurrentUser(null);
          safeStorage.removeItem('mycash_v3_current_user');
          safeStorage.removeItem('mycash_v3_last_activity');
          safeStorage.setItem('mycash_v3_is_auth_view', JSON.stringify(true));
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
          safeStorage.removeItem('mycash_v3_current_user');
          safeStorage.removeItem('mycash_v3_last_activity');
          safeStorage.setItem('mycash_v3_is_auth_view', JSON.stringify(true));
          setInactivityNotice(null);
        }}
        onRefreshData={() => {
          setRecords(prev => [...prev]);
          showToast('Dashboard metrics & customer roster synchronized.');
        }}
        onOpenProfileSettings={() => setIsProfileSettingsOpen(true)}
        onOpenAiIntelligence={(currentUser?.role === 'HQ_ADMIN' || currentUser?.role === 'SUPERVISOR') ? () => setIsAiIntelligenceOpen(true) : undefined}
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
              records={currentUser.role === 'TEAM_MEMBER' ? agentCallingQueueRecords : filteredRecords}
              currentUser={currentUser}
              teamMembers={teamMembersList}
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
            onOpenBulkUserImport={() => setIsBulkUserImportOpen(true)}
            onOpenUserManagement={() => setIsUserManagementOpen(true)}
            onOpenDeleteExcel={handleOpenDeleteExcelModal}
            onOpenSetAgentTarget={handleOpenSetAgentTarget}
            onOpenSetBranchTarget={handleOpenSetBranchTarget}
            onOpenAiIntelligence={() => setIsAiIntelligenceOpen(true)}
            onOpenEmailConfig={() => setIsEmailConfigOpen(true)}
            onUpdateRecord={handleUpdateRecord}
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
            onUpdateRecord={handleUpdateRecord}
            onOpenAiIntelligence={() => setIsAiIntelligenceOpen(true)}
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
                    {agentCallingQueueRecords.length}
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
                  records={agentCallingQueueRecords}
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
                {(() => {
                  const myBookedAppointments = upcomingAppointments.filter(r => !isRecordAssignedBySupervisor(r));
                  const assignedBySupervisorAppointments = upcomingAppointments.filter(r => isRecordAssignedBySupervisor(r));

                  const activeAppointmentsList = 
                    agentAppointmentSubTab === 'myBooked'
                      ? myBookedAppointments
                      : agentAppointmentSubTab === 'assignedBySupervisor'
                      ? assignedBySupervisorAppointments
                      : upcomingAppointments;

                  return (
                    <>
                      <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                            <CalendarCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 shrink-0" />
                            Scheduled Follow-up & Callback Appointments
                          </h3>
                          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                            Manage customer callbacks booked by you or assigned to you by your Supervisor
                          </p>
                        </div>

                        {/* Subtab Pills - Fully Responsive for Mobile View */}
                        <div className="w-full sm:w-auto overflow-x-auto no-scrollbar flex items-center gap-1 sm:gap-1.5 bg-slate-100 p-1 sm:p-1.5 rounded-xl border border-slate-200 text-xs shrink-0">
                          <button
                            type="button"
                            onClick={() => setAgentAppointmentSubTab('all')}
                            className={`shrink-0 whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 text-[10.5px] sm:text-xs ${
                              agentAppointmentSubTab === 'all'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>All Callbacks</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[9.5px] ${
                              agentAppointmentSubTab === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {upcomingAppointments.length}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setAgentAppointmentSubTab('myBooked')}
                            className={`shrink-0 whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 text-[10.5px] sm:text-xs ${
                              agentAppointmentSubTab === 'myBooked'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>My Booked</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[9.5px] ${
                              agentAppointmentSubTab === 'myBooked' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {myBookedAppointments.length}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setAgentAppointmentSubTab('assignedBySupervisor')}
                            className={`shrink-0 whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 text-[10.5px] sm:text-xs ${
                              agentAppointmentSubTab === 'assignedBySupervisor'
                                ? 'bg-amber-500 text-slate-950 shadow-2xs'
                                : 'text-amber-900 hover:text-amber-950 bg-amber-50 border border-amber-200'
                            }`}
                          >
                            <UserCheck className="w-3 h-3 text-amber-900 shrink-0" />
                            <span>Assigned</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[9.5px] font-extrabold ${
                              agentAppointmentSubTab === 'assignedBySupervisor' ? 'bg-slate-950 text-amber-300' : 'bg-amber-200 text-amber-900'
                            }`}>
                              {assignedBySupervisorAppointments.length}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setAgentAppointmentSubTab('previous')}
                            className={`shrink-0 whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 text-[10.5px] sm:text-xs ${
                              agentAppointmentSubTab === 'previous'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-emerald-800 hover:text-emerald-950 bg-emerald-50 border border-emerald-200'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Previous Appointments</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[9.5px] font-bold ${
                              agentAppointmentSubTab === 'previous' ? 'bg-emerald-900 text-white' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {previousAppointments.length}
                            </span>
                          </button>
                        </div>
                      </div>

                      {agentAppointmentSubTab === 'assignedBySupervisor' && (
                        <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs text-amber-900 flex items-center gap-2.5 shadow-2xs">
                          <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
                          <div>
                            <span className="font-bold block">Assigned by Supervisor</span>
                            <span className="text-[11px] text-amber-800">
                              Showing customer appointments assigned or reassigned to you by your Supervisor for priority follow-up calling.
                            </span>
                          </div>
                        </div>
                      )}

                      {agentAppointmentSubTab === 'previous' ? (
                        <AppointmentsListTable
                          records={previousAppointments}
                          type="previous"
                          currentUser={currentUser}
                          onOpenCustomerDrawer={(rec) => setDrawerRecord(rec)}
                          emptyMessage="No completed callback appointments recorded in Previous Appointments yet."
                        />
                      ) : (
                        <AppointmentsListTable
                          records={activeAppointmentsList}
                          type="upcoming"
                          currentUser={currentUser}
                          onMarkAsCalled={(rec) => setMarkAsCalledRecord(rec)}
                          onOpenCustomerDrawer={(rec) => setDrawerRecord(rec)}
                          emptyMessage="No upcoming callback appointments found."
                        />
                      )}
                    </>
                  );
                })()}
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
        records={records}
        initialTab={userManagementTab}
        initialShowAddForm={userManagementShowAddForm}
        onAddUser={handleAddUser}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
        onToggleUserActive={handleToggleUserActive}
        onUpdateRoleDefinitions={handleUpdateRoleDefinitions}
        onOpenBulkUserImport={() => setIsBulkUserImportOpen(true)}
      />

      {currentUser?.role === 'HQ_ADMIN' && (
        <BulkUserImportModal
          isOpen={isBulkUserImportOpen}
          onClose={() => setIsBulkUserImportOpen(false)}
          currentUser={currentUser}
          allUsers={users}
          branches={branches}
          onCommitBulkUsers={handleCommitBulkUsers}
        />
      )}

      {currentUser?.role === 'HQ_ADMIN' && (
        <EmailConfigurationModal
          isOpen={isEmailConfigOpen}
          onClose={() => setIsEmailConfigOpen(false)}
          users={users}
          currentUser={currentUser}
          onShowToast={(msg) => setToast({ message: msg, type: 'success' })}
        />
      )}

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
        teamMembers={teamMembersList}
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

      {/* Mark As Called Modal for completing callback appointments */}
      <MarkAsCalledModal
        isOpen={Boolean(markAsCalledRecord)}
        record={markAsCalledRecord}
        currentUser={currentUser}
        onClose={() => setMarkAsCalledRecord(null)}
        onSave={handleSaveMarkAsCalled}
      />

      {/* AI Intelligence & Customer Feedback Analytics Modal */}
      {(currentUser?.role === 'HQ_ADMIN' || currentUser?.role === 'SUPERVISOR') && isAiIntelligenceOpen && (
        <AiIntelligenceModal
          isOpen={isAiIntelligenceOpen}
          onClose={() => setIsAiIntelligenceOpen(false)}
          currentUser={currentUser}
          allBranches={branches}
          allAgents={teamMembersList}
          records={records}
        />
      )}
    </div>
  );
}
