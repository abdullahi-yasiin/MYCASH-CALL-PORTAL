import React from 'react';
import { 
  Search, 
  RotateCcw, 
  Building2, 
  UserCheck, 
  Users, 
  Calendar
} from 'lucide-react';
import { FilterState, User, BranchInfo, CallStatus } from '../types';

interface FiltersBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  currentUser: User;
  branches: BranchInfo[];
  supervisors: User[];
  teamMembers: User[];
  onReset: () => void;
}

const STATUS_OPTIONS: CallStatus[] = ['Success', 'In-progress', 'Not Available', 'Rejected', 'Uncalled'];

export const FiltersBar: React.FC<FiltersBarProps> = ({
  filters,
  onFilterChange,
  currentUser,
  branches,
  supervisors,
  teamMembers,
  onReset
}) => {
  const isHQAdmin = currentUser.role === 'HQ_ADMIN';
  const isSupervisor = currentUser.role === 'SUPERVISOR';

  // Available team members based on role
  const availableTeamMembers = isSupervisor
    ? teamMembers.filter(tm => tm.branch === currentUser.branch || tm.supervisorId === currentUser.id)
    : teamMembers;

  const handleBranchToggle = (branchName: string) => {
    const exists = filters.branches.includes(branchName);
    const updated = exists
      ? filters.branches.filter(b => b !== branchName)
      : [...filters.branches, branchName];
    onFilterChange({ ...filters, branches: updated });
  };

  const handleSupervisorToggle = (supId: string) => {
    const exists = filters.supervisors.includes(supId);
    const updated = exists
      ? filters.supervisors.filter(s => s !== supId)
      : [...filters.supervisors, supId];
    onFilterChange({ ...filters, supervisors: updated });
  };

  const handleTeamMemberToggle = (tmId: string) => {
    const exists = filters.teamMembers.includes(tmId);
    const updated = exists
      ? filters.teamMembers.filter(t => t !== tmId)
      : [...filters.teamMembers, tmId];
    onFilterChange({ ...filters, teamMembers: updated });
  };

  const handleStatusToggle = (status: CallStatus) => {
    const exists = filters.statuses.includes(status);
    const updated = exists
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    onFilterChange({ ...filters, statuses: updated });
  };

  const hasActiveFilters = 
    filters.dateStart !== '' || 
    filters.dateEnd !== '' || 
    filters.branches.length > 0 || 
    filters.supervisors.length > 0 || 
    filters.teamMembers.length > 0 || 
    filters.statuses.length > 0 || 
    filters.searchQuery !== '';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-3.5 md:p-4 shadow-xs space-y-2 sm:space-y-3">
      {/* Search and Date Range Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 sm:gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2" />
          <input
            id="filter-search-input"
            type="text"
            placeholder="Search customer name, phone, branch, or notes..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            className="w-full pl-7 sm:pl-8 pr-3 sm:pr-4 py-1 sm:py-1.5 text-[11px] sm:text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] text-slate-600">
            <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-500 text-[9.5px] sm:text-[11px]">From:</span>
            <input
              id="filter-date-start"
              type="date"
              value={filters.dateStart}
              onChange={(e) => onFilterChange({ ...filters, dateStart: e.target.value })}
              className="bg-transparent text-slate-900 font-medium focus:outline-none text-[9.5px] sm:text-[11px]"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] text-slate-600">
            <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-500 text-[9.5px] sm:text-[11px]">To:</span>
            <input
              id="filter-date-end"
              type="date"
              value={filters.dateEnd}
              onChange={(e) => onFilterChange({ ...filters, dateEnd: e.target.value })}
              className="bg-transparent text-slate-900 font-medium focus:outline-none text-[9.5px] sm:text-[11px]"
            />
          </div>

          {hasActiveFilters && (
            <button
              id="btn-reset-filters"
              onClick={onReset}
              className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
              title="Reset all active filters"
            >
              <RotateCcw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Role-Specific Filter Selectors */}
      <div className="flex flex-col gap-1.5 sm:gap-2 pt-1.5 sm:pt-2 border-t border-slate-100 text-[10px] sm:text-xs">
        {/* Status Pills */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 mr-0.5">Status:</span>
          {STATUS_OPTIONS.map(status => {
            const isSelected = filters.statuses.includes(status);
            const isHiddenOnMobile = status === 'Uncalled';
            return (
              <button
                key={status}
                id={`filter-status-${status.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => handleStatusToggle(status)}
                className={`${isHiddenOnMobile ? 'hidden sm:inline-flex' : 'inline-flex'} items-center text-[9.5px] sm:text-[11px] px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-sm sm:rounded-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? status === 'Success'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : status === 'In-progress'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : status === 'Not Available'
                      ? 'bg-slate-700 text-white shadow-2xs'
                      : status === 'Rejected'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>

        {/* HQ Admin: Branch & Supervisor Multi-Select Filters */}
        {isHQAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 sm:gap-2 pt-0.5">
            {/* Branches Filter */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs overflow-x-auto pb-0.5">
              <span className="flex items-center gap-1 text-slate-500 font-medium shrink-0 text-[10px] sm:text-[11px]">
                <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
                Branches:
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {branches.map(b => {
                  const selected = filters.branches.includes(b.name);
                  return (
                    <button
                      key={b.id}
                      onClick={() => handleBranchToggle(b.name)}
                      className={`px-1.5 py-0.5 rounded text-[9.5px] sm:text-[11px] font-medium transition-colors cursor-pointer ${
                        selected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {b.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Supervisors Filter */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs overflow-x-auto pb-0.5">
              <span className="flex items-center gap-1 text-slate-500 font-medium shrink-0 text-[10px] sm:text-[11px]">
                <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
                Supervisors:
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {supervisors.map(s => {
                  const selected = filters.supervisors.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSupervisorToggle(s.id)}
                      className={`px-1.5 py-0.5 rounded text-[9.5px] sm:text-[11px] font-medium transition-colors cursor-pointer ${
                        selected
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Team Members Filter (Visible to HQ Admin and Supervisor) */}
        {(isHQAdmin || isSupervisor) && availableTeamMembers.length > 0 && (
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs overflow-x-auto pt-0.5">
            <span className="flex items-center gap-1 text-slate-500 font-medium shrink-0 text-[10px] sm:text-[11px]">
              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
              Agents:
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {availableTeamMembers.map(tm => {
                const selected = filters.teamMembers.includes(tm.id);
                return (
                  <button
                    key={tm.id}
                    onClick={() => handleTeamMemberToggle(tm.id)}
                    className={`px-1.5 py-0.5 rounded text-[9.5px] sm:text-[11px] font-medium transition-colors cursor-pointer ${
                      selected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tm.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
