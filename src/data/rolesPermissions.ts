import { AppPermission, PermissionMeta, RoleDefinition, User } from '../types';

export const ALL_PERMISSIONS: PermissionMeta[] = [
  // Administration
  {
    key: 'MANAGE_USERS',
    label: 'Manage Users & Personnel',
    category: 'Administration',
    description: 'Create new users, update user profiles, change role tiers, and activate/deactivate accounts.'
  },
  {
    key: 'MANAGE_ROLES_PERMISSIONS',
    label: 'Configure Role Permissions Matrix',
    category: 'Administration',
    description: 'Grant or revoke capabilities for system roles (HQ Admin, Supervisor, Agent).'
  },
  {
    key: 'VIEW_ALL_BRANCHES',
    label: 'Global Multi-Branch Access',
    category: 'Administration',
    description: 'Access telemetry, reports, and records across all regional branches.'
  },
  {
    key: 'EDIT_SYSTEM_TARGETS',
    label: 'Edit Monthly Call Targets',
    category: 'Administration',
    description: 'Modify monthly call quotas and performance benchmarks for branches and teams.'
  },

  // Lead Management
  {
    key: 'IMPORT_EXCEL_LEADS',
    label: 'Bulk Excel Leads Import',
    category: 'Lead Management',
    description: 'Upload Excel/CSV customer sheets and distribute leads to branches or agents.'
  },
  {
    key: 'REASSIGN_LEADS',
    label: 'Reassign Customer Leads',
    category: 'Lead Management',
    description: 'Reallocate customer records to different calling agents or regional branches.'
  },
  {
    key: 'DELETE_RECORDS',
    label: 'Delete Customer Records',
    category: 'Lead Management',
    description: 'Permanently remove customer leads from the active calling queue.'
  },

  // Calling Operations
  {
    key: 'OVERRIDE_CALL_STATUS',
    label: 'Update Call Outcomes & Feedback',
    category: 'Calling Operations',
    description: 'Log call outcomes (Success, In-progress, Not Available, Rejected) and feedback notes.'
  },
  {
    key: 'SCHEDULE_APPOINTMENTS',
    label: 'Schedule & Manage Appointments',
    category: 'Calling Operations',
    description: 'Book callback dates and manage today\'s upcoming customer appointments.'
  },
  {
    key: 'ACCESS_FOCUS_MODE',
    label: 'Focus Calling Dialer Workstation',
    category: 'Calling Operations',
    description: 'Utilize distraction-free full-screen outbound dialing mode.'
  },

  // Reporting & Audit
  {
    key: 'EXPORT_DATA_REPORTS',
    label: 'Export Excel & Executive PDF',
    category: 'Reporting & Audit',
    description: 'Download filtered raw Excel workbooks and styled PDF executive reports.'
  },
  {
    key: 'VIEW_AUDIT_LOGS',
    label: 'Inspect Audit & Compliance Trail',
    category: 'Reporting & Audit',
    description: 'Review timestamped system activity logs and call disposition history.'
  }
];

export const INITIAL_ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: 'role-hq-admin',
    roleKey: 'HQ_ADMIN',
    name: 'HQ Super Administrator',
    description: 'Global administrator with unrestricted rights over all branches, users, targets, and security policies.',
    permissions: [
      'VIEW_ALL_BRANCHES',
      'MANAGE_USERS',
      'MANAGE_ROLES_PERMISSIONS',
      'IMPORT_EXCEL_LEADS',
      'EXPORT_DATA_REPORTS',
      'REASSIGN_LEADS',
      'EDIT_SYSTEM_TARGETS',
      'DELETE_RECORDS',
      'OVERRIDE_CALL_STATUS',
      'SCHEDULE_APPOINTMENTS',
      'ACCESS_FOCUS_MODE',
      'VIEW_AUDIT_LOGS'
    ],
    isSystemDefault: true
  },
  {
    id: 'role-supervisor',
    roleKey: 'SUPERVISOR',
    name: 'Branch Supervisor',
    description: 'Branch manager overseeing regional team members, lead assignments, daily activity logs, and branch exports.',
    permissions: [
      'IMPORT_EXCEL_LEADS',
      'EXPORT_DATA_REPORTS',
      'REASSIGN_LEADS',
      'OVERRIDE_CALL_STATUS',
      'SCHEDULE_APPOINTMENTS',
      'ACCESS_FOCUS_MODE',
      'VIEW_AUDIT_LOGS'
    ],
    isSystemDefault: true
  },
  {
    id: 'role-team-member',
    roleKey: 'TEAM_MEMBER',
    name: 'Calling Agent (Team Member)',
    description: 'Frontline tele-sales operator working through assigned customer call queues and logging call outcomes.',
    permissions: [
      'OVERRIDE_CALL_STATUS',
      'SCHEDULE_APPOINTMENTS',
      'ACCESS_FOCUS_MODE'
    ],
    isSystemDefault: true
  }
];

/**
 * Check if a user possesses a specific permission.
 * Admin possesses all permissions by default or configured matrix.
 */
export function checkUserPermission(
  user: User | null | undefined,
  permission: AppPermission,
  roles: RoleDefinition[] = INITIAL_ROLE_DEFINITIONS
): boolean {
  if (!user || !user.active) return false;

  // HQ Admin possesses all permissions unless explicitly restricted in custom configuration
  if (user.role === 'HQ_ADMIN') return true;

  // Check user custom permissions override if present
  if (user.customPermissions && user.customPermissions.includes(permission)) {
    return true;
  }

  // Check role-based permissions matrix
  const roleDef = roles.find((r) => r.roleKey === user.role);
  if (roleDef && roleDef.permissions.includes(permission)) {
    return true;
  }

  return false;
}
