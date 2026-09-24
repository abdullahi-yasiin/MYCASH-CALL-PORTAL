import React, { useState, useEffect } from 'react';
import { 
  Users, 
  X, 
  UserPlus, 
  ShieldCheck, 
  UserCheck, 
  Building2, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Key, 
  Shield, 
  Check, 
  RotateCcw, 
  SlidersHorizontal,
  Search,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';
import { User, UserRole, BranchInfo, RoleDefinition, AppPermission } from '../types';
import { ALL_PERMISSIONS, INITIAL_ROLE_DEFINITIONS, checkUserPermission } from '../data/rolesPermissions';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  allUsers: User[];
  branches: BranchInfo[];
  roleDefinitions: RoleDefinition[];
  initialTab?: 'users' | 'roles';
  initialShowAddForm?: boolean;
  onAddUser: (user: User) => Promise<boolean> | void;
  onUpdateUser: (user: User) => Promise<boolean> | void;
  onDeleteUser: (userId: string) => void;
  onToggleUserActive: (userId: string) => void;
  onUpdateRoleDefinitions: (roles: RoleDefinition[]) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  branches,
  roleDefinitions,
  initialTab = 'users',
  initialShowAddForm = false,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onToggleUserActive,
  onUpdateRoleDefinitions
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>(initialTab);
  const [showAddForm, setShowAddForm] = useState<boolean>(initialShowAddForm);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [role, setRole] = useState<UserRole>('TEAM_MEMBER');
  const [branch, setBranch] = useState<string>(branches[0]?.name || '');
  const [supervisorId, setSupervisorId] = useState<string>('');
  const [customPerms, setCustomPerms] = useState<AppPermission[]>([]);
  const [enableCustomPerms, setEnableCustomPerms] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Role Matrix Local State
  const [editableRoles, setEditableRoles] = useState<RoleDefinition[]>(roleDefinitions);
  const [hasUnsavedRoleChanges, setHasUnsavedRoleChanges] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      if (initialShowAddForm) {
        setEditingUser(null);
        setName('');
        setEmail('');
        setPhone('');
        setRole('TEAM_MEMBER');
        setBranch(currentUser.role === 'HQ_ADMIN' ? (branches[0]?.name || '') : currentUser.branch);
        setSupervisorId(currentUser.role === 'SUPERVISOR' ? currentUser.id : '');
        setCustomPerms([]);
        setEnableCustomPerms(false);
        setShowAddForm(true);
      }
    }
  }, [isOpen, initialTab, initialShowAddForm, currentUser, branches]);

  if (!isOpen) return null;

  const isHQAdmin = currentUser.role === 'HQ_ADMIN';

  // Available supervisors for selection (only relevant for HQ Admin; supervisors auto-assign to themselves)
  const supervisors = isHQAdmin
    ? allUsers.filter(u => u.role === 'SUPERVISOR' && u.active)
    : allUsers.filter(u => u.role === 'SUPERVISOR' && u.id === currentUser.id && u.active);

  // Base list of users allowed for the current viewer
  // Rule: Supervisors CANNOT see other supervisors in the User & Role Permissions Administration panel
  const basePersonnel = isHQAdmin
    ? allUsers
    : allUsers.filter(u => {
        // Enforce branch isolation
        if (u.branch !== currentUser.branch) return false;
        // Supervisors cannot see other supervisors
        if (currentUser.role === 'SUPERVISOR' && u.role === 'SUPERVISOR' && u.id !== currentUser.id) {
          return false;
        }
        // Supervisors cannot see HQ Admins
        if (currentUser.role === 'SUPERVISOR' && u.role === 'HQ_ADMIN') {
          return false;
        }
        return true;
      });

  // Available role filters (Supervisors only filter between All and Team Members)
  const availableRoleFilters = isHQAdmin
    ? (['ALL', 'HQ_ADMIN', 'SUPERVISOR', 'TEAM_MEMBER'] as const)
    : (['ALL', 'TEAM_MEMBER'] as const);

  // Visible users based on role and search query
  const visibleUsers = basePersonnel.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.branch.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Check if current user has permission to edit a specific target user
  // Rules:
  // 1. Supervisors and Agents CANNOT edit their own user details.
  // 2. Supervisors can ONLY edit details of agents they created (assigned to them).
  // 3. Admin User can change/edit/delete all other users and their details (including own).
  const canEditTargetUser = (targetUser: User): boolean => {
    // Admin user can edit/change all users
    if (isHQAdmin) return true;

    // Supervisors and Agents cannot edit their own user details
    if (targetUser.id === currentUser.id) return false;

    // Agents cannot edit any user
    if (currentUser.role === 'TEAM_MEMBER') return false;

    // Supervisors can ONLY edit details of agents they created (direct supervisor match)
    if (currentUser.role === 'SUPERVISOR') {
      return targetUser.role === 'TEAM_MEMBER' && targetUser.supervisorId === currentUser.id;
    }

    return false;
  };

  // Check if current user can delete target user
  const canDeleteTargetUser = (targetUser: User): boolean => {
    // Only Admin can delete users, and cannot delete active session user
    return isHQAdmin && targetUser.id !== currentUser.id;
  };

  // Check if current user can toggle active/inactive status of target user
  const canToggleActiveTargetUser = (targetUser: User): boolean => {
    if (isHQAdmin) return true;
    if (targetUser.id === currentUser.id) return false;
    if (currentUser.role === 'SUPERVISOR') {
      return targetUser.role === 'TEAM_MEMBER' && targetUser.supervisorId === currentUser.id;
    }
    return false;
  };

  const handleOpenAddForm = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPhone('');
    setRole('TEAM_MEMBER');
    setBranch(isHQAdmin ? (branches[0]?.name || '') : currentUser.branch);
    setSupervisorId(isHQAdmin ? '' : currentUser.id);
    setCustomPerms([]);
    setEnableCustomPerms(false);
    setFormError(null);
    setShowAddForm(true);
  };

  const handleOpenEditForm = (user: User) => {
    // Enforce permission rule: block if current user is not authorized to edit this target user
    if (!canEditTargetUser(user)) return;
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone || '');
    setRole(isHQAdmin ? user.role : 'TEAM_MEMBER');
    setBranch(isHQAdmin ? user.branch : currentUser.branch);
    setSupervisorId(isHQAdmin ? (user.supervisorId || '') : currentUser.id);
    setCustomPerms(user.customPermissions || []);
    setEnableCustomPerms(!!user.customPermissions && user.customPermissions.length > 0);
    setFormError(null);
    setShowAddForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setFormError('Please enter both Name and Email address.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingUser) {
        // Guard against unauthorized edit submission
        if (!canEditTargetUser(editingUser)) {
          setFormError('You are not authorized to edit this account.');
          setIsSubmitting(false);
          return;
        }
        const updated: User = {
          ...editingUser,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || '+252 61 0000000',
          role: isHQAdmin ? role : 'TEAM_MEMBER',
          branch: isHQAdmin ? branch : currentUser.branch,
          supervisorId: isHQAdmin 
            ? (role === 'TEAM_MEMBER' ? (supervisorId || undefined) : undefined)
            : currentUser.id,
          password: editingUser.password || 'amal123',
          customPermissions: isHQAdmin && enableCustomPerms ? customPerms : undefined
        };
        const result = await onUpdateUser(updated);
        if (result === false) {
          setFormError('Failed to commit user update to database. Check console logs for details.');
          setIsSubmitting(false);
          return;
        }
      } else {
        const newUser: User = {
          id: `u-${Date.now()}`,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || '+252 61 0000000',
          role: isHQAdmin ? role : 'TEAM_MEMBER',
          branch: isHQAdmin ? branch : currentUser.branch,
          supervisorId: isHQAdmin 
            ? (role === 'TEAM_MEMBER' ? (supervisorId || undefined) : undefined)
            : currentUser.id,
          active: true,
          password: 'amal123',
          mustChangePassword: true,
          customPermissions: isHQAdmin && enableCustomPerms ? customPerms : undefined
        };
        const result = await onAddUser(newUser);
        if (result === false) {
          setFormError('Database rejected user creation transaction. Check console logs for details.');
          setIsSubmitting(false);
          return;
        }
      }
      setShowAddForm(false);
      setEditingUser(null);
    } catch (err: any) {
      setFormError(err?.message || 'Unexpected failure saving user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle permission in role matrix
  const handleToggleRolePermission = (roleKey: UserRole, permKey: AppPermission) => {
    setEditableRoles(prev => prev.map(r => {
      if (r.roleKey !== roleKey) return r;
      const exists = r.permissions.includes(permKey);
      const newPerms = exists 
        ? r.permissions.filter(p => p !== permKey)
        : [...r.permissions, permKey];
      return { ...r, permissions: newPerms };
    }));
    setHasUnsavedRoleChanges(true);
  };

  // Grant all permissions to a role
  const handleGrantAllRole = (roleKey: UserRole) => {
    setEditableRoles(prev => prev.map(r => {
      if (r.roleKey !== roleKey) return r;
      return { ...r, permissions: ALL_PERMISSIONS.map(p => p.key) };
    }));
    setHasUnsavedRoleChanges(true);
  };

  // Revoke all permissions from a role
  const handleRevokeAllRole = (roleKey: UserRole) => {
    setEditableRoles(prev => prev.map(r => {
      if (r.roleKey !== roleKey) return r;
      return { ...r, permissions: [] };
    }));
    setHasUnsavedRoleChanges(true);
  };

  // Reset role matrix to default
  const handleResetRoleDefaults = () => {
    setEditableRoles(INITIAL_ROLE_DEFINITIONS);
    setHasUnsavedRoleChanges(true);
  };

  // Save role permissions matrix
  const handleSaveRoleMatrix = () => {
    onUpdateRoleDefinitions(editableRoles);
    setHasUnsavedRoleChanges(false);
  };

  // Custom permission toggle for single user form
  const handleToggleUserCustomPerm = (permKey: AppPermission) => {
    setCustomPerms(prev => 
      prev.includes(permKey) ? prev.filter(p => p !== permKey) : [...prev, permKey]
    );
  };

  // Categories for grouped permission rendering
  const categories = ['Administration', 'Lead Management', 'Calling Operations', 'Reporting & Audit'] as const;

  return (
    <div id="modal-user-management-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div id="modal-user-management-box" className="bg-white rounded-xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-auto sm:my-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[96vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="px-3.5 py-3 sm:px-6 sm:py-4 border-b border-slate-200 bg-slate-50 flex items-start sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 bg-blue-100 text-blue-700 rounded-lg sm:rounded-xl shrink-0 mt-0.5 sm:mt-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-xs sm:text-base flex flex-wrap items-center gap-1 sm:gap-2 leading-snug">
                <span>User & Role Permissions Administration</span>
                {isHQAdmin && (
                  <span className="bg-red-100 text-red-800 text-[8.5px] sm:text-[10px] font-extrabold px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-md">
                    HQ Admin Access
                  </span>
                )}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 leading-tight sm:leading-normal">
                {isHQAdmin 
                  ? 'Manage personnel across all 24 branches and dynamically configure role permission matrix.'
                  : `Team management and agent roster for ${currentUser.branch}`}
              </p>
            </div>
          </div>
          <button
            id="btn-close-user-management-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 sm:p-1.5 hover:bg-slate-200 transition-colors shrink-0"
            title="Close dialog"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-3 sm:px-6 pt-2 sm:pt-3 pb-2 sm:pb-0 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <button
              id="tab-btn-personnel"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 border-b-2 font-bold text-[11px] sm:text-xs transition-all whitespace-nowrap ${
                activeTab === 'users'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Personnel Accounts ({basePersonnel.length})</span>
            </button>

            {isHQAdmin && (
              <button
                id="tab-btn-roles"
                onClick={() => setActiveTab('roles')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 border-b-2 font-bold text-[11px] sm:text-xs transition-all whitespace-nowrap relative ${
                  activeTab === 'roles'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Role Permissions Matrix</span>
                {hasUnsavedRoleChanges && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-0.5" title="Unsaved changes" />
                )}
              </button>
            )}
          </div>

          {activeTab === 'users' && (
            <button
              id="btn-add-new-user-open"
              onClick={handleOpenAddForm}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl shadow-xs transition-colors sm:mb-2 active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add New User</span>
            </button>
          )}

          {activeTab === 'roles' && isHQAdmin && (
            <div className="flex items-center gap-1.5 sm:gap-2 sm:mb-2 w-full sm:w-auto justify-end">
              <button
                id="btn-reset-role-defaults"
                onClick={handleResetRoleDefaults}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 py-1 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10.5px] sm:text-xs font-semibold"
                title="Reset all roles to system defaults"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Defaults</span>
              </button>
              <button
                id="btn-save-role-matrix-top"
                onClick={handleSaveRoleMatrix}
                disabled={!hasUnsavedRoleChanges}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1 text-[10.5px] sm:text-xs font-bold rounded-lg shadow-xs transition-colors ${
                  hasUnsavedRoleChanges
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Matrix</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-3 sm:space-y-4">
          {/* ============================================================ */}
          {/* TAB 1: USERS & PERSONNEL DIRECTORY                           */}
          {/* ============================================================ */}
          {activeTab === 'users' && (
            <div className="space-y-3 sm:space-y-4">
              {/* Search & Role Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-search-users"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, email, branch..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] sm:text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5 self-stretch sm:self-auto overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 mr-0.5 shrink-0">Role:</span>
                  {availableRoleFilters.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRoleFilter(r)}
                      className={`px-2 py-1 rounded-md text-[9.5px] sm:text-[10px] font-bold transition-all whitespace-nowrap shrink-0 ${
                        roleFilter === r
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {r === 'ALL' ? 'All Roles' : r === 'HQ_ADMIN' ? 'HQ Admin' : r === 'SUPERVISOR' ? 'Supervisor' : 'Agent'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add / Edit User Form Modal Drawer */}
              {showAddForm && (
                <form
                  id="form-add-edit-user"
                  onSubmit={handleFormSubmit}
                  className="p-3 sm:p-5 bg-gradient-to-b from-blue-50/50 to-slate-50 border border-blue-200 rounded-xl sm:rounded-2xl space-y-3 sm:space-y-4 text-xs animate-in fade-in duration-150 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1 sm:p-1.5 bg-blue-600 text-white rounded-lg shrink-0">
                        {editingUser ? <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      </div>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {editingUser ? `Edit User: ${editingUser.name}` : 'Provision New User & Assign Permissions'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingUser(null);
                      }}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-md shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {formError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 flex items-start gap-2 text-xs animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">Transaction Failed</div>
                        <div className="text-[11px] text-rose-700 mt-0.5">{formError}</div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1 text-[11px] sm:text-xs">Full Name*</label>
                      <input
                        id="input-user-full-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Sahal Abdi Barre"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-1 focus:ring-blue-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1 text-[11px] sm:text-xs">Email Address*</label>
                      <input
                        id="input-user-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. sahal.barre@mycash.portal"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-1 focus:ring-blue-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1 text-[11px] sm:text-xs">Phone Number</label>
                      <input
                        id="input-user-phone"
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +252 61 7000111"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-1 focus:ring-blue-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1 text-[11px] sm:text-xs">Role Tier*</label>
                      {isHQAdmin ? (
                        <select
                          id="select-user-role"
                          value={role}
                          onChange={(e) => setRole(e.target.value as UserRole)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="TEAM_MEMBER">Calling Agent (Team Member)</option>
                          <option value="SUPERVISOR">Branch Supervisor (Manager)</option>
                          <option value="HQ_ADMIN">HQ Administrator (Super Admin)</option>
                        </select>
                      ) : (
                        <div className="space-y-1">
                          <div className="bg-slate-100 text-slate-800 px-2.5 py-1.5 rounded-lg font-semibold border border-slate-200 text-xs flex items-center justify-between gap-2">
                            <span className="truncate">Calling Agent (Team Member)</span>
                            <span className="text-[9.5px] text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-bold whitespace-nowrap shrink-0">
                              Fixed Role
                            </span>
                          </div>
                          <p className="text-[9.5px] text-slate-500 leading-tight">
                            Supervisors can only provision Calling Agent (Team Member) accounts.
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1 text-[11px] sm:text-xs">Branch / Region Assignment*</label>
                      {isHQAdmin ? (
                        <select
                          id="select-user-branch"
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-blue-500"
                        >
                          {branches.map(b => (
                            <option key={b.id} value={b.name}>
                              {b.name} ({b.region} Region)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="space-y-1">
                          <div className="bg-slate-100 text-slate-800 px-2.5 py-1.5 rounded-lg font-semibold border border-slate-200 text-xs flex items-center justify-between gap-2">
                            <span className="truncate">{currentUser.branch}</span>
                            <span className="text-[9.5px] text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-bold whitespace-nowrap shrink-0">
                              Your Branch
                            </span>
                          </div>
                          <p className="text-[9.5px] text-slate-500 leading-tight">
                            New agents are automatically assigned to your branch.
                          </p>
                        </div>
                      )}
                    </div>

                    {role === 'TEAM_MEMBER' && (
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1 text-[11px] sm:text-xs">Direct Supervisor</label>
                        {isHQAdmin ? (
                          <div className="space-y-1">
                            <select
                              id="select-user-supervisor"
                              value={supervisorId}
                              onChange={(e) => setSupervisorId(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">{supervisors.length === 0 ? '-- No Supervisors Created Yet (Unassigned) --' : '-- Leave Unassigned --'}</option>
                              {supervisors.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.branch})
                                </option>
                              ))}
                            </select>
                            {supervisors.length === 0 && (
                              <p className="text-[9.5px] text-slate-500 leading-tight">
                                No active supervisors registered yet. You can create a Supervisor user anytime.
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="bg-slate-100 text-slate-800 px-2.5 py-1.5 rounded-lg font-semibold border border-slate-200 text-xs flex items-center justify-between">
                              <span className="truncate flex items-center gap-1.5 font-bold text-slate-900">
                                <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                {currentUser.name}
                              </span>
                              <span className="text-[9.5px] text-blue-700 bg-blue-50 border border-blue-200 font-bold px-1.5 py-0.5 rounded ml-2 shrink-0">
                                Auto-Assigned
                              </span>
                            </div>
                            <p className="text-[9.5px] text-slate-500 leading-tight">
                              Supervisors cannot choose direct supervisor; team members are automatically assigned to you.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Individual Custom Permission Overrides (Admin only) */}
                  {isHQAdmin && (
                    <div className="pt-2 border-t border-blue-100">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                        <label className="flex items-start sm:items-center gap-2 cursor-pointer">
                          <input
                            id="checkbox-enable-custom-perms"
                            type="checkbox"
                            checked={enableCustomPerms}
                            onChange={(e) => {
                              setEnableCustomPerms(e.target.checked);
                              if (e.target.checked && customPerms.length === 0) {
                                // seed with default role permissions
                                const roleDef = editableRoles.find(r => r.roleKey === role);
                                setCustomPerms(roleDef ? [...roleDef.permissions] : []);
                              }
                            }}
                            className="mt-0.5 sm:mt-0 rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                          />
                          <span className="font-bold text-slate-800 text-[11px] sm:text-xs flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            Enable Custom Granular Permissions Override for this User
                          </span>
                        </label>
                        {enableCustomPerms && (
                          <span className="self-start sm:self-auto text-[9.5px] sm:text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Custom Overrides Active ({customPerms.length} perms)
                          </span>
                        )}
                      </div>

                      {enableCustomPerms && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2 p-2 sm:p-3 bg-white border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
                          {ALL_PERMISSIONS.map(p => {
                            const isChecked = customPerms.includes(p.key);
                            return (
                              <label
                                key={p.key}
                                className={`flex items-start gap-2 p-1.5 rounded-lg border text-[10.5px] sm:text-[11px] cursor-pointer transition-colors ${
                                  isChecked 
                                    ? 'bg-blue-50/60 border-blue-200 text-blue-900 font-medium'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleUserCustomPerm(p.key)}
                                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-3 h-3"
                                />
                                <div>
                                  <div className="font-bold leading-tight">{p.label}</div>
                                  <div className="text-[9px] text-slate-500 leading-tight mt-0.5">{p.category}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-blue-100">
                    <button
                      type="button"
                      id="btn-cancel-user-form"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingUser(null);
                      }}
                      className="w-full sm:w-auto px-4 py-2 sm:py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg sm:rounded-xl font-bold transition-colors text-center text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      id="btn-submit-user-form"
                      disabled={isSubmitting}
                      className={`w-full sm:w-auto px-5 py-2 sm:py-1.5 text-white rounded-lg sm:rounded-xl font-bold shadow-xs transition-colors text-center text-xs flex items-center justify-center gap-1.5 ${
                        isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                          <span>Committing to Database...</span>
                        </>
                      ) : (
                        editingUser ? 'Save Changes' : 'Create User Account'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* User Directory Table with responsive horizontal scroll */}
              <div className="border border-slate-200 rounded-xl sm:rounded-2xl overflow-x-auto shadow-2xs bg-white">
                <table className="w-full text-left text-xs border-collapse min-w-[620px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[8.5px] sm:text-[9px] border-b border-slate-200">
                      <th className="py-2.5 px-3 sm:px-3.5">User Name & Contact</th>
                      <th className="py-2.5 px-2.5 sm:px-3">Role Tier</th>
                      <th className="py-2.5 px-2.5 sm:px-3">Branch / Region</th>
                      <th className="py-2.5 px-2.5 sm:px-3 text-center">Permissions Granted</th>
                      <th className="py-2.5 px-2.5 sm:px-3 text-center">Account Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                          No users found matching the current search criteria.
                        </td>
                      </tr>
                    ) : (
                      visibleUsers.map((user) => {
                        const userRoleDef = editableRoles.find(r => r.roleKey === user.role);
                        const effectivePermCount = user.role === 'HQ_ADMIN'
                          ? ALL_PERMISSIONS.length
                          : user.customPermissions
                          ? user.customPermissions.length
                          : userRoleDef?.permissions.length || 0;

                        return (
                          <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 sm:py-3 px-2.5 sm:px-3.5">
                              <div className="font-bold text-slate-900 text-[11px] sm:text-xs flex flex-wrap items-center gap-1 sm:gap-1.5 leading-snug">
                                <span className="break-words">{user.name}</span>
                                {user.id === currentUser.id && (
                                  <span className="text-[8px] sm:text-[9px] bg-blue-100 text-blue-700 px-1 sm:px-1.5 py-0.2 rounded font-extrabold uppercase shrink-0">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="text-[9.5px] min-[400px]:text-[10px] sm:text-[10.5px] text-slate-500 mt-0.5 break-all sm:break-normal truncate max-w-[150px] sm:max-w-none" title={user.email}>
                                {user.email}
                              </div>
                              {user.phone && (
                                <div className="text-[8.5px] min-[400px]:text-[9px] sm:text-[9.5px] text-slate-400 font-mono flex items-center gap-1 mt-0.5 whitespace-nowrap">
                                  <Phone className="w-2.5 h-2.5 shrink-0" />
                                  <span>{user.phone}</span>
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 sm:py-3 px-2 sm:px-2.5 md:px-3">
                              <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md text-[8.5px] min-[400px]:text-[9px] sm:text-[9.5px] font-extrabold tracking-wide uppercase whitespace-nowrap leading-tight ${
                                user.role === 'HQ_ADMIN'
                                  ? 'bg-red-100 text-red-800 border border-red-200'
                                  : user.role === 'SUPERVISOR'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                                {user.role === 'HQ_ADMIN' ? 'HQ Admin' : user.role === 'SUPERVISOR' ? 'Supervisor' : 'Agent'}
                              </span>
                            </td>

                            <td className="py-2.5 sm:py-3 px-2.5 sm:px-3">
                              <div className="font-semibold text-slate-800 text-[11px] sm:text-xs">{user.branch}</div>
                              {user.supervisorId ? (
                                <div className="text-[9.5px] sm:text-[10px] text-slate-400 mt-0.5">
                                  Supervisor: {allUsers.find(u => u.id === user.supervisorId)?.name || 'Unassigned'}
                                </div>
                              ) : user.role === 'TEAM_MEMBER' ? (
                                <div className="text-[9.5px] sm:text-[10px] text-slate-400 mt-0.5 italic">
                                  No Supervisor Assigned
                                </div>
                              ) : null}
                            </td>

                            <td className="py-2.5 sm:py-3 px-1.5 sm:px-2.5 md:px-3 text-center">
                              <span className={`inline-flex items-center justify-center gap-0.5 sm:gap-1 px-1.5 py-0.5 rounded-sm text-[8px] min-[400px]:text-[8.5px] sm:text-[9px] font-bold whitespace-nowrap leading-tight ${
                                user.role === 'HQ_ADMIN'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : user.customPermissions
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                <Key className="w-2.5 h-2.5 shrink-0" />
                                <span>{user.role === 'HQ_ADMIN' ? '12 Perms (Custom)' : `${effectivePermCount} Perms${user.customPermissions ? ' (Custom)' : ''}`}</span>
                              </span>
                            </td>

                            <td className="py-2.5 sm:py-3 px-2.5 sm:px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-sm text-[9.5px] sm:text-[10px] font-bold ${
                                user.active 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}>
                                {user.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>

                            <td className="py-2.5 sm:py-3 px-2.5 sm:px-3 text-right">
                              <div className="flex items-center justify-end gap-1 sm:gap-1.5">
                                {/* Edit Button */}
                                {canEditTargetUser(user) ? (
                                  <button
                                    onClick={() => handleOpenEditForm(user)}
                                    className="p-1 sm:p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit user details"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <span
                                    className="p-1 sm:p-1.5 text-slate-300 inline-flex items-center cursor-not-allowed"
                                    title={
                                      user.id === currentUser.id
                                        ? "Supervisors and Agents cannot edit their own user details (HQ Admin required)"
                                        : "You can only edit details of agents you created"
                                    }
                                  >
                                    <Edit3 className="w-3.5 h-3.5 opacity-40" />
                                  </span>
                                )}

                                {/* Status Toggle Button */}
                                {canToggleActiveTargetUser(user) ? (
                                  <button
                                    onClick={() => onToggleUserActive(user.id)}
                                    className={`p-1 sm:p-1.5 rounded-lg transition-colors ${
                                      user.active 
                                        ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                        : 'text-emerald-600 hover:bg-emerald-50'
                                    }`}
                                    title={user.active ? 'Deactivate account' : 'Activate account'}
                                  >
                                    {user.active ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                  </button>
                                ) : (
                                  <span
                                    className="p-1 sm:p-1.5 text-slate-300 inline-flex items-center cursor-not-allowed"
                                    title={
                                      user.id === currentUser.id
                                        ? "Cannot toggle your own account status"
                                        : "Status modification restricted to HQ Admin or creating supervisor"
                                    }
                                  >
                                    {user.active ? <Lock className="w-3.5 h-3.5 opacity-40" /> : <Unlock className="w-3.5 h-3.5 opacity-40" />}
                                  </span>
                                )}

                                {/* Reset Password Button (HQ Admin Only) */}
                                {isHQAdmin && user.id !== currentUser.id && (
                                  resetPasswordUserId === user.id ? (
                                    <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                                      <button
                                        onClick={() => {
                                          onUpdateUser({ ...user, password: 'amal123', mustChangePassword: true });
                                          setResetPasswordUserId(null);
                                        }}
                                        className="px-2 py-0.5 bg-red-600 text-white rounded-[4px] text-[10px] font-bold hover:bg-red-700 active:scale-95 transition-all"
                                      >
                                        Confirm
                                      </button>
                                      <button
                                        onClick={() => setResetPasswordUserId(null)}
                                        className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-[4px] text-[10px] font-bold border border-slate-200 hover:bg-slate-200 active:scale-95 transition-all"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setResetPasswordUserId(user.id)}
                                      className="p-1 sm:p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                      title="Reset password to default (amal123)"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  )
                                )}

                                {/* Delete Button (Admin Only, cannot delete self) */}
                                {canDeleteTargetUser(user) && (
                                  deleteUserId === user.id ? (
                                    <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                                      <button
                                        onClick={() => {
                                          onDeleteUser(user.id);
                                          setDeleteUserId(null);
                                        }}
                                        className="px-2 py-0.5 bg-red-600 text-white rounded-[4px] text-[10px] font-bold hover:bg-red-700 active:scale-95 transition-all"
                                      >
                                        Confirm
                                      </button>
                                      <button
                                        onClick={() => setDeleteUserId(null)}
                                        className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-[4px] text-[10px] font-bold border border-slate-200 hover:bg-slate-200 active:scale-95 transition-all"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setDeleteUserId(user.id)}
                                      className="p-1 sm:p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Delete user account"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: ROLE PERMISSIONS MATRIX (ADMIN ONLY)                  */}
          {/* ============================================================ */}
          {activeTab === 'roles' && isHQAdmin && (
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-xs text-blue-900 flex items-start gap-2.5 sm:gap-3">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm">Role-Based Access Control (RBAC) Matrix</h4>
                  <p className="text-blue-700 text-[10.5px] sm:text-xs mt-0.5 leading-relaxed">
                    HQ Admins can dynamically grant or revoke capabilities for each user role in real time. 
                    Changes take effect immediately across all users assigned to that role.
                  </p>
                </div>
              </div>

              {/* Roles Matrix Grid with responsive horizontal scroll */}
              <div className="border border-slate-200 rounded-xl sm:rounded-2xl overflow-x-auto shadow-2xs bg-white">
                <table className="w-full text-left text-xs border-collapse min-w-[560px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold uppercase tracking-wider text-[8.5px] sm:text-[9px] border-b border-slate-200">
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4 w-2/5">Capability & Permission Scope</th>
                      <th className="py-2.5 sm:py-3 px-2 sm:px-3 text-center bg-red-50/50 border-l border-slate-200">
                        <div className="font-bold text-red-900 text-[9.5px] min-[400px]:text-[10.5px] sm:text-xs flex items-center justify-center leading-tight sm:leading-normal whitespace-nowrap">
                          <span>HQ Admin</span>
                        </div>
                        <div className="text-[8.5px] sm:text-[9px] text-red-600 font-normal lowercase">Global Super Admin</div>
                        <div className="mt-1 flex justify-center gap-1">
                          <span className="text-[8.5px] sm:text-[9px] bg-red-100 text-red-800 px-1.5 py-0.2 rounded font-extrabold">
                            All Rights
                          </span>
                        </div>
                      </th>
                      <th className="py-2.5 sm:py-3 px-2 sm:px-3 text-center bg-blue-50/50 border-l border-slate-200">
                        <div className="font-bold text-blue-900 text-[9.5px] min-[400px]:text-[10.5px] sm:text-xs flex items-center justify-center leading-tight sm:leading-normal whitespace-nowrap">
                          <span>Supervisor</span>
                        </div>
                        <div className="text-[8.5px] sm:text-[9px] text-blue-600 font-normal lowercase">Branch Manager</div>
                        <div className="mt-1 flex justify-center gap-1">
                          <button
                            onClick={() => handleGrantAllRole('SUPERVISOR')}
                            className="text-[8px] sm:text-[8.5px] font-bold text-blue-600 hover:underline cursor-pointer"
                          >
                            All
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            onClick={() => handleRevokeAllRole('SUPERVISOR')}
                            className="text-[8px] sm:text-[8.5px] font-bold text-slate-500 hover:underline cursor-pointer"
                          >
                            None
                          </button>
                        </div>
                      </th>
                      <th className="py-2.5 sm:py-3 px-2 sm:px-3 text-center bg-emerald-50/50 border-l border-slate-200">
                        <div className="font-bold text-emerald-900 text-[9.5px] min-[400px]:text-[10.5px] sm:text-xs flex items-center justify-center leading-tight sm:leading-normal whitespace-nowrap">
                          <span>Calling Agent</span>
                        </div>
                        <div className="text-[8.5px] sm:text-[9px] text-emerald-600 font-normal lowercase">Team Member</div>
                        <div className="mt-1 flex justify-center gap-1">
                          <button
                            onClick={() => handleGrantAllRole('TEAM_MEMBER')}
                            className="text-[8px] sm:text-[8.5px] font-bold text-emerald-600 hover:underline cursor-pointer"
                          >
                            All
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            onClick={() => handleRevokeAllRole('TEAM_MEMBER')}
                            className="text-[8px] sm:text-[8.5px] font-bold text-slate-500 hover:underline cursor-pointer"
                          >
                            None
                          </button>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categories.map((cat) => {
                      const categoryPerms = ALL_PERMISSIONS.filter(p => p.category === cat);
                      return (
                        <React.Fragment key={cat}>
                          {/* Category Header Row */}
                          <tr className="bg-slate-50/90 font-extrabold text-slate-800 text-[9px] sm:text-[10px] uppercase tracking-wider">
                            <td colSpan={4} className="py-1.5 sm:py-2 px-3 sm:px-4 border-t border-slate-200 bg-slate-100/60">
                              {cat}
                            </td>
                          </tr>
                          {categoryPerms.map((perm) => {
                            const hqRole = editableRoles.find(r => r.roleKey === 'HQ_ADMIN');
                            const supRole = editableRoles.find(r => r.roleKey === 'SUPERVISOR');
                            const agentRole = editableRoles.find(r => r.roleKey === 'TEAM_MEMBER');

                            const hqHas = hqRole?.permissions.includes(perm.key) ?? true;
                            const supHas = supRole?.permissions.includes(perm.key) ?? false;
                            const agentHas = agentRole?.permissions.includes(perm.key) ?? false;

                            return (
                              <tr key={perm.key} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2 sm:py-2.5 px-3 sm:px-4">
                                  <div className="font-bold text-slate-900 text-[11px] sm:text-xs">{perm.label}</div>
                                  <div className="text-[9.5px] sm:text-[10px] text-slate-500 leading-tight mt-0.5">
                                    {perm.description}
                                  </div>
                                </td>

                                {/* HQ Admin Toggle */}
                                <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-center border-l border-slate-100 bg-red-50/20">
                                  <div className="inline-flex items-center justify-center p-1 rounded-md bg-red-100 text-red-700 cursor-not-allowed" title="HQ Admin always possesses this permission">
                                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 font-black" />
                                  </div>
                                </td>

                                {/* Supervisor Toggle */}
                                <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-center border-l border-slate-100 bg-blue-50/20">
                                  <button
                                    onClick={() => handleToggleRolePermission('SUPERVISOR', perm.key)}
                                    className={`inline-flex items-center justify-center p-1 sm:p-1.5 rounded-lg transition-all cursor-pointer ${
                                      supHas
                                        ? 'bg-blue-600 text-white shadow-2xs ring-2 ring-blue-300'
                                        : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                                    }`}
                                    title={`Toggle ${perm.label} for Supervisor`}
                                  >
                                    <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                  </button>
                                </td>

                                {/* Agent Toggle */}
                                <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-center border-l border-slate-100 bg-emerald-50/20">
                                  <button
                                    onClick={() => handleToggleRolePermission('TEAM_MEMBER', perm.key)}
                                    className={`inline-flex items-center justify-center p-1 sm:p-1.5 rounded-lg transition-all cursor-pointer ${
                                      agentHas
                                        ? 'bg-emerald-600 text-white shadow-2xs ring-2 ring-emerald-300'
                                        : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                                    }`}
                                    title={`Toggle ${perm.label} for Calling Agent`}
                                  >
                                    <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Save Footer Bar */}
              {hasUnsavedRoleChanges && (
                <div className="p-2.5 sm:p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-amber-900 animate-in fade-in">
                  <div className="flex items-start sm:items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                    <span className="font-semibold text-[11px] sm:text-xs leading-tight">
                      You have unsaved changes to role permissions. Click Save Matrix to apply changes across the platform.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={handleResetRoleDefaults}
                      className="flex-1 sm:flex-initial px-3 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg font-bold text-amber-900 transition-colors text-[11px] sm:text-xs"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleSaveRoleMatrix}
                      className="flex-1 sm:flex-initial px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition-colors text-[11px] sm:text-xs"
                    >
                      Save Matrix
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">
            Current Session: <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.role})
          </div>
          <button
            id="btn-done-user-management"
            onClick={onClose}
            className="px-3.5 sm:px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg sm:rounded-xl transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
