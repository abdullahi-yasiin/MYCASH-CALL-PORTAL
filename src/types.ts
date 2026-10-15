export type UserRole = 'HQ_ADMIN' | 'SUPERVISOR' | 'TEAM_MEMBER';

export type AppPermission =
  | 'VIEW_ALL_BRANCHES'        // View metrics & records across all regional branches
  | 'MANAGE_USERS'             // Create, edit, and deactivate users
  | 'MANAGE_ROLES_PERMISSIONS' // Modify permissions allocated to roles
  | 'IMPORT_EXCEL_LEADS'       // Bulk import customer lead sheets
  | 'EXPORT_DATA_REPORTS'      // Export Excel & PDF reports
  | 'REASSIGN_LEADS'           // Reassign records between agents & branches
  | 'EDIT_SYSTEM_TARGETS'      // Modify branch & monthly call targets
  | 'DELETE_RECORDS'           // Delete customer records
  | 'OVERRIDE_CALL_STATUS'     // Update call outcome, notes, and call status
  | 'SCHEDULE_APPOINTMENTS'    // Schedule & reschedule customer appointments
  | 'ACCESS_FOCUS_MODE'        // Access high-speed outbound focus dialer
  | 'VIEW_AUDIT_LOGS';         // Inspect activity & compliance audit logs

export interface PermissionMeta {
  key: AppPermission;
  label: string;
  category: 'Administration' | 'Lead Management' | 'Calling Operations' | 'Reporting & Audit';
  description: string;
}

export interface RoleDefinition {
  id: string;
  roleKey: UserRole;
  name: string;
  description: string;
  permissions: AppPermission[];
  isSystemDefault: boolean;
}

export type CallStatus = 'Success' | 'In-progress' | 'Not Available' | 'Rejected' | 'Uncalled';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branch: string; // Region or Branch name
  supervisorId?: string; // For team members
  avatar?: string;
  phone?: string;
  active: boolean;
  password?: string; // Account password
  mustChangePassword?: boolean; // When created with standard password 'amal123', requires force change on first login
  customPermissions?: AppPermission[]; // Optional granular permission overrides
  weeklyTarget?: number; // Weekly calling target (default 50)
  monthlyTarget?: number; // Monthly calling target (default 200)
}

export interface CustomerRecord {
  id: string;
  customerName: string;
  phoneNumber: string;
  areaOfReg: string; // Branch / Region
  callDate: string; // YYYY-MM-DD
  status: CallStatus;
  appointment: string; // YYYY-MM-DDTHH:mm or readable
  feedbackNote: string;
  supervisorNote: string;
  assignedAgentId: string;
  assignedAgentName: string;
  supervisorId: string;
  hasBeenCalled: boolean; // Unique Call State Rule
  callCount: number; // Deduplication: once set, increments to 1, further edits don't re-increment total calls
  importedBatchId?: string;
  appointmentAssignedBySupervisor?: boolean;
  appointmentCompleted?: boolean;
  appointmentCompletedAt?: string;
  appointmentCompletedBy?: string;
  reassignedFromAgentId?: string;
  reassignedFromAgentName?: string;
  reassignedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function isRecordAssignedBySupervisor(r: CustomerRecord | undefined | null): boolean {
  if (!r) return false;
  if (r.appointmentAssignedBySupervisor) return true;
  if (Boolean(r.reassignedFromAgentId)) return true;
  if (typeof r.supervisorNote === 'string') {
    if (r.supervisorNote.includes('[SUP_ASSIGN:')) return true;
    const lower = r.supervisorNote.toLowerCase();
    if (
      lower.includes('by supervisor') || 
      lower.includes('assigned by supervisor') || 
      lower.startsWith('assigned to ') ||
      lower.includes('supervisor assigned')
    ) {
      return true;
    }
  }
  return false;
}

export interface DeleteExcelTarget {
  type: 'agent' | 'batch' | 'all' | 'records';
  id?: string;
  name: string;
  recordCount: number;
  recordIds?: string[];
  batchDetails?: string;
}

export interface BranchInfo {
  id: string;
  name: string;
  region: string;
  supervisorId: string;
  supervisorName: string;
  targetCallsMonth: number;
  targetCallsWeek?: number;
  baseWeeklyTargetPerAgent?: number;
  baseMonthlyTargetPerAgent?: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  recordId: string;
  customerName: string;
  action: 'STATUS_CHANGE' | 'NOTE_UPDATED' | 'APPOINTMENT_SCHEDULED' | 'RECORD_CREATED' | 'EXCEL_IMPORTED';
  previousValue?: string;
  newValue?: string;
  details: string;
}

export interface FilterState {
  dateStart: string;
  dateEnd: string;
  branches: string[];
  supervisors: string[];
  teamMembers: string[];
  statuses: CallStatus[];
  searchQuery: string;
}

export interface CallMetrics {
  totalLeads: number;
  totalCalled: number; // Deduplicated: records that have ever been called
  totalSuccess: number;
  totalInProgress: number;
  totalNotAvailable: number;
  totalRejected: number;
  totalAppointments: number;
  conversionRate: number; // (Success / Called) * 100
  uncalledCount: number;
}
