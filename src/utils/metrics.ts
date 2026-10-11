import { CustomerRecord, CallMetrics, FilterState, User } from '../types';

export function calculateMetrics(records: CustomerRecord[]): CallMetrics {
  const totalLeads = records.length;
  
  // Unique Call State Rule & Deduplication Logic:
  // A record counts as 1 unique call if hasBeenCalled is true (or status is not Uncalled/blank)
  const calledRecords = records.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled'));
  const totalCalled = calledRecords.length;

  let totalSuccess = 0;
  let totalInProgress = 0;
  let totalNotAvailable = 0;
  let totalRejected = 0;
  let totalAppointments = 0;
  let uncalledCount = 0;

  records.forEach(r => {
    if (r.status === 'Success') totalSuccess++;
    else if (r.status === 'In-progress') totalInProgress++;
    else if (r.status === 'Not Available') totalNotAvailable++;
    else if (r.status === 'Rejected') totalRejected++;
    else uncalledCount++;

    if (r.appointment && r.appointment.trim() !== '') {
      totalAppointments++;
    }
  });

  const conversionRate = totalCalled > 0 ? Math.round((totalSuccess / totalCalled) * 100) : 0;

  return {
    totalLeads,
    totalCalled,
    totalSuccess,
    totalInProgress,
    totalNotAvailable,
    totalRejected,
    totalAppointments,
    conversionRate,
    uncalledCount
  };
}

export function filterRecords(
  records: CustomerRecord[],
  filters: FilterState,
  currentUser: User | null
): CustomerRecord[] {
  if (!currentUser) return [];

  return records.filter(record => {
    // 1. Role-based scoping:
    if (currentUser.role === 'TEAM_MEMBER') {
      // Team members only see assigned records (matched by id or name)
      const matchId = record.assignedAgentId === currentUser.id;
      const matchName = Boolean(
        record.assignedAgentName &&
        currentUser.name &&
        (record.assignedAgentName.trim().toLowerCase() === currentUser.name.trim().toLowerCase() ||
         record.assignedAgentName.trim().toLowerCase().includes(currentUser.name.trim().toLowerCase()) ||
         currentUser.name.trim().toLowerCase().includes(record.assignedAgentName.trim().toLowerCase()))
      );
      if (!matchId && !matchName) {
        return false;
      }
    } else if (currentUser.role === 'SUPERVISOR') {
      // Supervisors see records in their branch/region or assigned to them/their agents
      const matchSupervisorId = Boolean(record.supervisorId && record.supervisorId === currentUser.id);
      const matchAreaExact = record.areaOfReg === currentUser.branch;
      const bClean = (currentUser.branch || '').toLowerCase().replace(/branch|hub|central|[_-\s]+/gi, '').trim();
      const rClean = (record.areaOfReg || '').toLowerCase().replace(/[_-\s]+/g, '').trim();
      const matchAreaFuzzy = Boolean(bClean.length >= 3 && (rClean.includes(bClean) || bClean.includes(rClean)));
      if (!matchSupervisorId && !matchAreaExact && !matchAreaFuzzy) {
        return false;
      }
    }
    // HQ Admin can see all

    // 2. Active filters:
    // Date range filter
    if (filters.dateStart) {
      if (!record.callDate || record.callDate < filters.dateStart) return false;
    }
    if (filters.dateEnd) {
      if (!record.callDate || record.callDate > filters.dateEnd) return false;
    }

    // Branch / Area filter with fuzzy Somali branch name matching
    if (filters.branches.length > 0) {
      const match = filters.branches.some(b => {
        if (b === record.areaOfReg) return true;
        const bClean = b.toLowerCase().replace(/branch|hub|central|[_-\s]+/gi, '').trim();
        const rClean = (record.areaOfReg || '').toLowerCase().replace(/[_-\s]+/g, '').trim();
        return bClean.length >= 3 && (rClean.includes(bClean) || bClean.includes(rClean));
      });
      if (!match) return false;
    }

    // Supervisor filter
    if (filters.supervisors.length > 0) {
      if (!filters.supervisors.includes(record.supervisorId)) return false;
    }

    // Team Member filter
    if (filters.teamMembers.length > 0) {
      if (!filters.teamMembers.includes(record.assignedAgentId)) return false;
    }

    // Status filter
    if (filters.statuses.length > 0) {
      if (!filters.statuses.includes(record.status)) return false;
    }

    // Search query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const matchName = record.customerName.toLowerCase().includes(q);
      const matchPhone = record.phoneNumber.toLowerCase().includes(q);
      const matchArea = record.areaOfReg.toLowerCase().includes(q);
      const matchAgent = record.assignedAgentName.toLowerCase().includes(q);
      const matchNote = (record.feedbackNote || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchArea && !matchAgent && !matchNote) {
        return false;
      }
    }

    return true;
  });
}
