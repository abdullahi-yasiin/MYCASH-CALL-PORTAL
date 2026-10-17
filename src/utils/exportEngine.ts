import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CustomerRecord, CallMetrics, User, BranchInfo } from '../types';
import { calculateMetrics } from './metrics';

export function exportToExcel(records: CustomerRecord[], fileNamePrefix: string = 'MyCash_Calling_Export'): void {
  const exportData = records.map(r => ({
    'Customer Name': r.customerName,
    'Phone Number': r.phoneNumber,
    'Area of Reg.': r.areaOfReg,
    'Call Date': r.callDate || '-',
    'Status': r.status,
    'Appointment': r.appointment || '-',
    'Feedback Note': r.feedbackNote || '-',
    'Supervisor Note': r.supervisorNote || '-',
    'Assigned Agent': r.assignedAgentName || '-',
    'Call Count': r.callCount
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  // Custom column widths
  worksheet['!cols'] = [
    { wch: 24 }, // Customer Name
    { wch: 18 }, // Phone Number
    { wch: 22 }, // Area
    { wch: 14 }, // Call Date
    { wch: 14 }, // Status
    { wch: 20 }, // Appointment
    { wch: 35 }, // Feedback Note
    { wch: 35 }, // Supervisor Note
    { wch: 20 }, // Agent
    { wch: 10 }  // Count
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Calling_Data');
  
  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${fileNamePrefix}_${timestamp}.xlsx`);
}

export interface TeamMemberSummaryRow {
  agentName: string;
  branch: string;
  supervisorName?: string;
  totalLeads: number;
  called: number;
  uncalled: number;
  success: number;
  inProgress: number;
  notAvailable: number;
  rejected: number;
  appointments: number;
  conversion: number;
  progressPercent: number;
}

export function exportTeamSummaryToExcel(
  summaries: TeamMemberSummaryRow[],
  fileNamePrefix: string = 'MyCash_Team_Excels_Summary'
): void {
  const exportData = summaries.map(s => ({
    'Agent Name': s.agentName,
    'Branch / Region': s.branch,
    'Supervisor': s.supervisorName || '-',
    'Total Leads in Excel': s.totalLeads,
    'Unique Calls Completed': s.called,
    'Uncalled Remaining': s.uncalled,
    'Success (Conversions)': s.success,
    'In-progress': s.inProgress,
    'Not Available': s.notAvailable,
    'Rejected': s.rejected,
    'Appointments Scheduled': s.appointments,
    'Conversion Rate (%)': `${s.conversion}%`,
    'Progress (%)': `${s.progressPercent}%`
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  worksheet['!cols'] = [
    { wch: 22 }, // Agent Name
    { wch: 24 }, // Branch
    { wch: 20 }, // Supervisor
    { wch: 20 }, // Total Leads
    { wch: 22 }, // Called
    { wch: 20 }, // Uncalled
    { wch: 22 }, // Success
    { wch: 14 }, // In-progress
    { wch: 16 }, // Not Available
    { wch: 12 }, // Rejected
    { wch: 24 }, // Appointments
    { wch: 20 }, // Conversion Rate
    { wch: 16 }  // Progress
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Team_Excels_Summary');
  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${fileNamePrefix}_${timestamp}.xlsx`);
}

export interface ConsolidatedBranchSummary {
  name: string;
  region: string;
  supervisorName: string;
  agentCount: number;
  totalLeads: number;
  called: number;
  success: number;
  inProgress: number;
  notAvailable: number;
  rejected: number;
  appointments: number;
  conversion: number;
  avgCallsPerAgent: number;
  monthlyTarget: number;
  attainment: number;
}

/**
 * Accurately calculates regional branch metrics across all customer records.
 * Uses exact + normalized Somali region matching, agent assignment matching,
 * and dynamic regional discovery so no records or calls are dropped.
 */
/**
 * Accurately calculates regional branch metrics across all customer records.
 * Uses deterministic best-match branch allocation to guarantee zero duplication,
 * correct record totals, and precise conversion and average call statistics.
 */
export function computeConsolidatedBranchSummaries(
  records: CustomerRecord[],
  agents: User[],
  supervisors: User[],
  branches?: BranchInfo[]
): ConsolidatedBranchSummary[] {
  const defaultBranches: BranchInfo[] = [
    { id: 'b-mgd', name: 'Mogadishu Branch', region: 'Banadir', supervisorId: '', supervisorName: 'Guled Warsame', targetCallsMonth: 1500, targetCallsWeek: 375 },
    { id: 'b-hrg', name: 'Hargeisa Branch', region: 'Maroodi Jeex', supervisorId: '', supervisorName: 'Farhan Mohamed', targetCallsMonth: 1200, targetCallsWeek: 300 },
    { id: 'b-grw', name: 'Garowe Branch', region: 'Nugaal', supervisorId: '', supervisorName: 'Khadar Ahmed', targetCallsMonth: 950, targetCallsWeek: 240 },
    { id: 'b-bos', name: 'Bosaso Branch', region: 'Bari', supervisorId: '', supervisorName: 'Liban Jama', targetCallsMonth: 900, targetCallsWeek: 225 },
    { id: 'b-ksm', name: 'Kismaayo Branch', region: 'Lower Juba', supervisorId: '', supervisorName: 'Maryan Abdi', targetCallsMonth: 800, targetCallsWeek: 200 },
    { id: 'b-byd', name: 'Baydhabo Branch', region: 'Bay', supervisorId: '', supervisorName: 'Mustafa Hassan', targetCallsMonth: 850, targetCallsWeek: 210 },
    { id: 'b-glk-n', name: 'Galkacyo North Branch', region: 'Mudug', supervisorId: '', supervisorName: 'Ali Yare', targetCallsMonth: 800, targetCallsWeek: 200 },
    { id: 'b-glk-s', name: 'Galkacyo South Branch', region: 'Mudug', supervisorId: '', supervisorName: 'Hassan Mire', targetCallsMonth: 750, targetCallsWeek: 190 },
    { id: 'b-hq', name: 'HQ Branch', region: 'Headquarters', supervisorId: '', supervisorName: 'Abdullahi Yasin', targetCallsMonth: 2000, targetCallsWeek: 500 }
  ];

  const baseList: BranchInfo[] = branches && branches.length > 0 ? branches : defaultBranches;
  const consolidatedList: BranchInfo[] = [...baseList];

  // Discover all distinct areas present in actual records that aren't already represented
  const distinctRecordAreas = Array.from(new Set(records.map(r => (r.areaOfReg || '').trim()).filter(Boolean)));
  distinctRecordAreas.forEach((areaName, idx) => {
    const cleanArea = areaName.toLowerCase().replace(/branch|hub|central|[_-\s]+/gi, '').trim();
    const exists = consolidatedList.some(b => {
      const bClean = b.name.toLowerCase().replace(/branch|hub|central|[_-\s]+/gi, '').trim();
      const rClean = (b.region || '').toLowerCase().replace(/branch|hub|central|[_-\s]+/gi, '').trim();
      return b.name.toLowerCase() === areaName.toLowerCase() ||
        b.id.toLowerCase() === areaName.toLowerCase() ||
        (cleanArea.length >= 3 && (bClean === cleanArea || rClean === cleanArea));
    });
    if (!exists) {
      consolidatedList.push({
        id: `b-dyn-${idx}`,
        name: areaName,
        region: areaName,
        supervisorId: '',
        supervisorName: 'Branch Supervisor',
        targetCallsMonth: 600,
        targetCallsWeek: 150
      });
    }
  });

  // Map each record to exactly ONE branch to eliminate double-counting and preserve math integrity
  const branchRecordsMap = new Map<string, CustomerRecord[]>();
  consolidatedList.forEach(b => branchRecordsMap.set(b.id, []));

  // Pre-index agents by ID and name
  const agentBranchMap = new Map<string, string>();
  agents.forEach(a => {
    if (a.branch) {
      agentBranchMap.set(a.id, a.branch);
      agentBranchMap.set(a.name.toLowerCase().trim(), a.branch);
    }
  });

  records.forEach(r => {
    const rArea = (r.areaOfReg || '').trim();
    const rAreaLow = rArea.toLowerCase();

    // 1. Direct exact name match
    let matched = consolidatedList.find(b => b.name.toLowerCase() === rAreaLow || b.id.toLowerCase() === rAreaLow);

    // 2. Direct exact region match (if unambiguous)
    if (!matched && rArea) {
      const regMatches = consolidatedList.filter(b => (b.region || '').toLowerCase() === rAreaLow);
      if (regMatches.length === 1) {
        matched = regMatches[0];
      } else if (regMatches.length > 1) {
        // Disambiguate North/South or specific hubs
        if (rAreaLow.includes('north')) {
          matched = regMatches.find(b => b.name.toLowerCase().includes('north')) || regMatches[0];
        } else if (rAreaLow.includes('south')) {
          matched = regMatches.find(b => b.name.toLowerCase().includes('south')) || regMatches[0];
        } else {
          matched = regMatches[0];
        }
      }
    }

    // 3. Agent assignment match
    if (!matched) {
      const agBranchName = (r.assignedAgentId && agentBranchMap.get(r.assignedAgentId)) ||
        (r.assignedAgentName && agentBranchMap.get(r.assignedAgentName.toLowerCase().trim()));
      if (agBranchName) {
        const agBranchLow = agBranchName.toLowerCase().trim();
        matched = consolidatedList.find(b => b.name.toLowerCase() === agBranchLow || b.id.toLowerCase() === agBranchLow);
      }
    }

    // 4. Normalized name match (without stripping North/South)
    if (!matched && rArea) {
      const rClean = rAreaLow.replace(/branch|hub|central|[_-\s]+/gi, '').trim();
      if (rClean.length >= 3) {
        matched = consolidatedList.find(b => {
          const bClean = b.name.toLowerCase().replace(/branch|hub|central|[_-\s]+/gi, '').trim();
          return bClean === rClean;
        });
        if (!matched) {
          matched = consolidatedList.find(b => {
            const bClean = b.name.toLowerCase().replace(/branch|hub|central|[_-\s]+/gi, '').trim();
            return (bClean.includes(rClean) || rClean.includes(bClean)) &&
              (bClean.includes('north') === rClean.includes('north')) &&
              (bClean.includes('south') === rClean.includes('south'));
          });
        }
      }
    }

    // 5. Fallback: Default to HQ or first branch so record is never lost
    const finalBranch = matched || consolidatedList.find(b => b.name.toLowerCase().includes('hq')) || consolidatedList[0];
    if (finalBranch) {
      branchRecordsMap.get(finalBranch.id)?.push(r);
    }
  });

  return consolidatedList.map(b => {
    const bNameLow = b.name.toLowerCase().trim();
    const bRegLow = (b.region || '').toLowerCase().trim();

    const branchAgents = agents.filter(a => {
      if (!a.branch) return false;
      const agBranchLow = a.branch.toLowerCase().trim();
      return agBranchLow === bNameLow || agBranchLow === bRegLow ||
        agBranchLow.replace(/branch|hub|central|[_-\s]+/gi, '').trim() === bNameLow.replace(/branch|hub|central|[_-\s]+/gi, '').trim();
    });

    const branchRecords = branchRecordsMap.get(b.id) || [];

    const totalLeads = branchRecords.length;
    const called = branchRecords.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;
    const success = branchRecords.filter(r => r.status === 'Success').length;
    const inProgress = branchRecords.filter(r => r.status === 'In-progress').length;
    const notAvailable = branchRecords.filter(r => r.status === 'Not Available').length;
    const rejected = branchRecords.filter(r => r.status === 'Rejected').length;
    const appointments = branchRecords.filter(r => r.appointment && r.appointment.trim() !== '').length;
    const conversion = called > 0 ? Math.round((success / called) * 100) : 0;
    
    const agentCount = branchAgents.length;
    const avgCallsPerAgent = agentCount > 0 ? Math.round((called / agentCount) * 10) / 10 : (called > 0 ? called : 0);

    const monthlyTarget = b.targetCallsMonth || (b.baseMonthlyTargetPerAgent ? b.baseMonthlyTargetPerAgent * Math.max(1, agentCount) : 600);
    const attainment = monthlyTarget > 0 ? Math.round((called / monthlyTarget) * 100) : 0;

    const sup = supervisors.find(s => s.branch === b.name || s.id === b.supervisorId);
    const supervisorName = sup ? sup.name : b.supervisorName || 'Unassigned';

    return {
      name: b.name,
      region: b.region,
      supervisorName,
      agentCount,
      totalLeads,
      called,
      success,
      inProgress,
      notAvailable,
      rejected,
      appointments,
      conversion,
      avgCallsPerAgent,
      monthlyTarget,
      attainment
    };
  });
}

export interface RegionalAggregate {
  region: string;
  branchCount: number;
  branches: string[];
  totalLeads: number;
  called: number;
  success: number;
  inProgress: number;
  notAvailable: number;
  rejected: number;
  appointments: number;
  conversion: number;
  agentCount: number;
  avgCallsPerBranch: number;
  monthlyTarget: number;
  attainment: number;
  supervisorNames: string[];
}

export function computeRegionalAggregates(branchSummaries: ConsolidatedBranchSummary[]): RegionalAggregate[] {
  const map = new Map<string, RegionalAggregate>();

  branchSummaries.forEach(b => {
    const regKey = (b.region || b.name || 'General Territory').trim();
    const existing = map.get(regKey);
    if (!existing) {
      map.set(regKey, {
        region: regKey,
        branchCount: 1,
        branches: [b.name],
        totalLeads: b.totalLeads,
        called: b.called,
        success: b.success,
        inProgress: b.inProgress,
        notAvailable: b.notAvailable,
        rejected: b.rejected,
        appointments: b.appointments,
        conversion: b.conversion,
        agentCount: b.agentCount,
        avgCallsPerBranch: b.called,
        monthlyTarget: b.monthlyTarget,
        attainment: b.attainment,
        supervisorNames: b.supervisorName && b.supervisorName !== 'Unassigned' ? [b.supervisorName] : []
      });
    } else {
      existing.branchCount += 1;
      if (!existing.branches.includes(b.name)) existing.branches.push(b.name);
      existing.totalLeads += b.totalLeads;
      existing.called += b.called;
      existing.success += b.success;
      existing.inProgress += b.inProgress;
      existing.notAvailable += b.notAvailable;
      existing.rejected += b.rejected;
      existing.appointments += b.appointments;
      existing.agentCount += b.agentCount;
      existing.monthlyTarget += b.monthlyTarget;
      existing.conversion = existing.called > 0 ? Math.round((existing.success / existing.called) * 100) : 0;
      existing.attainment = existing.monthlyTarget > 0 ? Math.round((existing.called / existing.monthlyTarget) * 100) : 0;
      existing.avgCallsPerBranch = existing.branchCount > 0 ? Math.round(existing.called / existing.branchCount) : existing.called;
      if (b.supervisorName && b.supervisorName !== 'Unassigned' && !existing.supervisorNames.includes(b.supervisorName)) {
        existing.supervisorNames.push(b.supervisorName);
      }
    }
  });

  return Array.from(map.values()).sort((a, b) => b.called - a.called || b.conversion - a.conversion);
}

/**
 * Modern, executive-grade PDF Report Generator
 * Features:
 * 1. KPI Metric Tiles with color-coded badges
 * 2. Regional Branch Performance & Target Attainment Table
 * 3. Team Member & Agent Roster Breakdown Table
 * 4. Beautiful Data Charts: Branch Performance Bars, Outcome Distribution Stack, & Agent Leaderboard
 */
export function exportToPdf(
  records: CustomerRecord[],
  metrics: CallMetrics,
  currentUser: User,
  allUsers: User[],
  filterSummary: string = 'All Active Filters',
  branches?: BranchInfo[]
): void {
  // Landscape A4: 297mm width x 210mm height
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const timestamp = new Date().toLocaleString('en-US', { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  });
  
  const isHQAdmin = currentUser.role === 'HQ_ADMIN';
  const scopeTitle = isHQAdmin ? 'Global Enterprise HQ' : `${currentUser.branch} Hub`;

  // Filter agents and supervisors
  const agents = allUsers.filter(u => u.role === 'TEAM_MEMBER' && (isHQAdmin || u.branch === currentUser.branch || u.supervisorId === currentUser.id));
  const supervisors = allUsers.filter(u => u.role === 'SUPERVISOR' && (isHQAdmin || u.branch === currentUser.branch));

  // Calculate comprehensive regional branch summaries
  const branchSummaries = computeConsolidatedBranchSummaries(records, agents, supervisors, branches);

  // Calculate agent summaries
  const agentSummaries = agents.map(agent => {
    const agentRecords = records.filter(r => r.assignedAgentId === agent.id);
    const totalLeads = agentRecords.length;
    const called = agentRecords.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;
    const uncalled = agentRecords.filter(r => !r.hasBeenCalled && (!r.status || r.status === 'Uncalled')).length;
    const success = agentRecords.filter(r => r.status === 'Success').length;
    const inProgress = agentRecords.filter(r => r.status === 'In-progress').length;
    const notAvailable = agentRecords.filter(r => r.status === 'Not Available').length;
    const rejected = agentRecords.filter(r => r.status === 'Rejected').length;
    const appointments = agentRecords.filter(r => r.appointment && r.appointment.trim() !== '').length;
    const conversion = called > 0 ? Math.round((success / called) * 100) : 0;
    const coverage = totalLeads > 0 ? Math.round((called / totalLeads) * 100) : 0;
    
    const sup = supervisors.find(s => s.id === agent.supervisorId || s.branch === agent.branch);
    const supervisorName = sup ? sup.name : 'Branch Lead';

    return {
      name: agent.name,
      branch: agent.branch,
      supervisorName,
      totalLeads,
      called,
      uncalled,
      success,
      inProgress,
      notAvailable,
      rejected,
      appointments,
      conversion,
      coverage
    };
  });

  // Overall totals
  const totalLeadsCount = records.length;
  const totalCallsCount = metrics.totalCalled;
  const totalSuccessCount = metrics.totalSuccess;
  const totalAppointmentsCount = metrics.totalAppointments;
  const totalInProgressCount = metrics.totalInProgress;
  const totalUncalledCount = metrics.uncalledCount ?? Math.max(0, totalLeadsCount - totalCallsCount);
  const overallConversionRate = metrics.conversionRate;
  const overallCoverageRate = totalLeadsCount > 0 ? Math.round((totalCallsCount / totalLeadsCount) * 100) : 0;

  // Header drawing function with Modern Top Navigation Tabs
  const renderHeader = (pageNumber: number, sectionSubtitle: string) => {
    // Top banner background
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 297, 23, 'F');

    // Brand title & Icon
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text('MYCASH TELE-SALES', 14, 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text(`|  ${sectionSubtitle}`, 62, 8);

    // Metadata on right side
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Generated: ${timestamp}`, 283, 6.2, { align: 'right' });
    doc.text(`Scope: ${scopeTitle}  •  User: ${currentUser.name} (${currentUser.role})`, 283, 9.8, { align: 'right' });

    // Executive Top Navigation Tabs (Row 2 inside Header Banner)
    const navTabs = [
      { id: 1, num: '01', title: 'Executive KPI & Regional Hubs' },
      { id: 2, num: '02', title: 'Agent Calling Audit & Performance' },
      { id: 3, num: '03', title: 'Visual Analytics & Leaderboards' }
    ];

    const tabStartX = 14;
    const tabY = 13.2;
    const tabW = 63;
    const tabH = 7.6;
    const tabGap = 3.5;

    navTabs.forEach((tab, i) => {
      const tabX = tabStartX + i * (tabW + tabGap);
      const isActive = tab.id === pageNumber;

      if (isActive) {
        // Active tab container
        doc.setFillColor(30, 41, 59); // slate-800
        doc.roundedRect(tabX, tabY, tabW, tabH, 1.2, 1.2, 'F');
        doc.setDrawColor(220, 38, 38); // red-600
        doc.setLineWidth(0.35);
        doc.roundedRect(tabX, tabY, tabW, tabH, 1.2, 1.2, 'S');

        // Active indicator badge dot
        doc.setFillColor(16, 185, 129); // emerald-500
        doc.circle(tabX + 4.2, tabY + 3.8, 1.0, 'F');

        // Active bottom accent line
        doc.setFillColor(220, 38, 38); // red-600
        doc.rect(tabX + 1.2, tabY + tabH - 1.2, tabW - 2.4, 1.2, 'F');

        // Active label
        doc.setFontSize(6.1);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`${tab.num} • ${tab.title}`, tabX + 7.2, tabY + 4.8);
      } else {
        // Inactive tab container
        doc.setFillColor(15, 23, 42); // slate-900
        doc.roundedRect(tabX, tabY, tabW, tabH, 1.2, 1.2, 'F');
        doc.setDrawColor(51, 65, 85); // slate-700
        doc.setLineWidth(0.2);
        doc.roundedRect(tabX, tabY, tabW, tabH, 1.2, 1.2, 'S');

        // Inactive label
        doc.setFontSize(5.9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`${tab.num} • ${tab.title}`, tabX + 5.2, tabY + 4.8);
      }
    });

    // Red accent dividing strip below banner
    doc.setFillColor(220, 38, 38); // red-600
    doc.rect(0, 23, 297, 1.2, 'F');
  };

  // Footer drawing function
  const renderFooter = (pageNumber: number, totalPages: number) => {
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.4);
    doc.line(14, 201, 283, 201);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('CONFIDENTIAL - MYCASH TELE-SALES MANAGEMENT INFORMATION SYSTEM', 14, 206);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${pageNumber} of ${totalPages}`, 283, 206, { align: 'right' });
  };

  // =========================================================================
  // PAGE 1: EXECUTIVE KPI TILES & REGIONAL BRANCH PERFORMANCE TABLE
  // =========================================================================
  renderHeader(1, 'Executive KPI Summary & Regional Branch Performance');

  // CSS Grid Geometry: 6 Columns across 269mm printable content width (14mm margins)
  // (269mm - 5 * 3.8mm gap) / 6 columns = 41.6mm per column
  const startY = 26.5;
  const tileWidth = 41.6;
  const tileHeight = 23.5;
  const tileGap = 3.8;
  const tileMarginLeft = 14;

  interface TileData {
    label: string;
    value: string | number;
    subtext: string;
    topColor: [number, number, number]; // Accent color
    bgTint: [number, number, number];   // Subtle header background tint
    badgeText?: string;
  }

  const kpiTiles: TileData[] = [
    {
      label: 'TOTAL LEADS POOL',
      value: totalLeadsCount.toLocaleString(),
      subtext: `${agents.length} Active Roster Agents`,
      topColor: [37, 99, 235], // Blue
      bgTint: [241, 246, 254],
      badgeText: '100% Leads'
    },
    {
      label: 'COMPLETED CALLS',
      value: totalCallsCount.toLocaleString(),
      subtext: `${overallCoverageRate}% Pipeline Coverage`,
      topColor: [29, 78, 216], // Dark Blue
      bgTint: [239, 246, 255],
      badgeText: `${overallCoverageRate}% Dialed`
    },
    {
      label: 'CONVERTED / SUCCESS',
      value: totalSuccessCount.toLocaleString(),
      subtext: `${overallConversionRate}% Lead Conversion`,
      topColor: [16, 185, 129], // Emerald
      bgTint: [236, 253, 245],
      badgeText: `${overallConversionRate}% Conv.`
    },
    {
      label: 'SCHEDULED CALLBACKS',
      value: totalAppointmentsCount.toLocaleString(),
      subtext: 'Active Follow-up Queued',
      topColor: [220, 38, 38], // Red
      bgTint: [254, 242, 242],
      badgeText: 'Callbacks'
    },
    {
      label: 'IN-PROGRESS PIPELINE',
      value: totalInProgressCount.toLocaleString(),
      subtext: 'Open Customer Inquiries',
      topColor: [217, 119, 6], // Amber
      bgTint: [254, 249, 238],
      badgeText: 'Active'
    },
    {
      label: 'UNTOUCHED LEADS',
      value: totalUncalledCount.toLocaleString(),
      subtext: 'Available for Dialing',
      topColor: [100, 116, 139], // Slate
      bgTint: [248, 250, 252],
      badgeText: 'Queued'
    }
  ];

  // Render Modern Executive KPI Metric Tabs
  kpiTiles.forEach((tile, index) => {
    const x = tileMarginLeft + index * (tileWidth + tileGap);
    const y = startY;

    // Outer card container
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, tileWidth, tileHeight, 1.8, 1.8, 'F');
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.28);
    doc.roundedRect(x, y, tileWidth, tileHeight, 1.8, 1.8, 'S');

    // Tab Header Notch (top 6.0mm)
    doc.setFillColor(tile.bgTint[0], tile.bgTint[1], tile.bgTint[2]);
    doc.roundedRect(x, y, tileWidth, 6.0, 1.8, 1.8, 'F');
    doc.rect(x, y + 2, tileWidth, 4.0, 'F'); // square bottom of notch

    // Vibrant top accent line (1.8mm height)
    doc.setFillColor(tile.topColor[0], tile.topColor[1], tile.topColor[2]);
    doc.roundedRect(x, y, tileWidth, 1.8, 1.2, 1.2, 'F');

    // Header label text
    doc.setFontSize(5.4);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text(tile.label, x + 3.0, y + 4.6);

    // Pill badge on top right
    if (tile.badgeText) {
      doc.setFontSize(4.8);
      doc.setFont('helvetica', 'bold');
      const badgeTextW = doc.getTextWidth(tile.badgeText);
      const badgeW = Math.max(12, badgeTextW + 3.0);
      const badgeX = x + tileWidth - badgeW - 2.0;
      const badgeY = y + 1.8;

      doc.setFillColor(tile.topColor[0], tile.topColor[1], tile.topColor[2]);
      doc.roundedRect(badgeX, badgeY, badgeW, 3.5, 0.8, 0.8, 'F');

      doc.setTextColor(255, 255, 255);
      doc.text(tile.badgeText, badgeX + badgeW / 2, badgeY + 2.5, { align: 'center' });
    }

    // Metric Value (Bold geometric typography)
    doc.setFontSize(13.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(String(tile.value), x + 3.0, y + 14.0);

    // Subtle colored status indicator dot
    doc.setFillColor(tile.topColor[0], tile.topColor[1], tile.topColor[2]);
    doc.circle(x + 4.0, y + 19.4, 0.75, 'F');

    // Subtext
    doc.setFontSize(5.6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(tile.subtext, x + 6.2, y + 20.0);
  });

  // Section Header: Regional Branch Performance
  const branchTableStartY = startY + tileHeight + 5;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('REGIONAL BRANCH AUTO-SUMMARY & TARGET ATTAINMENT', 14, branchTableStartY);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Aggregated regional performance across branch hubs, active calling agents, and monthly quotas', 14, branchTableStartY + 3.8);

  // Branch Performance Table: Column alignment matching: Left for text, Center for agents, Right for numbers
  const branchTableHead = [
    [
      'BRANCH / REGIONAL HUB',
      'SUPERVISOR',
      'AGENTS',
      'TOTAL LEADS',
      'CALLED',
      'SUCCESS',
      'IN-PROGRESS',
      'CALLBACKS',
      'CONV. RATE',
      'MONTHLY TARGET',
      'ATTAINMENT'
    ]
  ];

  // Prioritize active regional hubs with leads or calling activity
  const activeBranchList = branchSummaries.filter(b => b.totalLeads > 0 || b.called > 0);
  const displayBranches = activeBranchList.length > 0 ? activeBranchList.slice(0, 10) : branchSummaries.slice(0, 6);

  const branchTableBody = displayBranches.map(b => [
    `${b.name} (${b.region})`,
    b.supervisorName,
    `${b.agentCount}`,
    b.totalLeads.toLocaleString(),
    b.called.toLocaleString(),
    b.success.toLocaleString(),
    b.inProgress.toLocaleString(),
    b.appointments.toLocaleString(),
    `${b.conversion}%`,
    b.monthlyTarget.toLocaleString(),
    `${b.attainment}%`
  ]);

  // Aggregated Totals Row strictly synchronizes with verified global metrics
  const totalBranchLeads = totalLeadsCount;
  const totalBranchCalled = totalCallsCount;
  const totalBranchSuccess = totalSuccessCount;
  const totalBranchInProgress = totalInProgressCount;
  const totalBranchAppointments = totalAppointmentsCount;
  const totalBranchMonthlyTarget = branchSummaries.reduce((sum, b) => sum + b.monthlyTarget, 0);
  const totalBranchAttainment = totalBranchMonthlyTarget > 0 ? Math.round((totalBranchCalled / totalBranchMonthlyTarget) * 100) : 0;
  const totalBranchConversion = overallConversionRate;

  branchTableBody.push([
    'AGGREGATED TOTALS',
    `${supervisors.length} Sup.`,
    `${agents.length}`,
    totalBranchLeads.toLocaleString(),
    totalBranchCalled.toLocaleString(),
    totalBranchSuccess.toLocaleString(),
    totalBranchInProgress.toLocaleString(),
    totalBranchAppointments.toLocaleString(),
    `${totalBranchConversion}%`,
    totalBranchMonthlyTarget.toLocaleString(),
    `${totalBranchAttainment}%`
  ]);

  // Branch column alignments: Text columns left, Counts center, Metrics right
  const branchColAligns: ('left' | 'center' | 'right')[] = [
    'left',
    'left',
    'center',
    'right',
    'right',
    'right',
    'right',
    'right',
    'right',
    'right',
    'right'
  ];

  autoTable(doc, {
    startY: branchTableStartY + 6,
    head: branchTableHead,
    body: branchTableBody,
    theme: 'grid',
    margin: { left: 14, right: 14 },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 }
    },
    bodyStyles: {
      fontSize: 7.2,
      textColor: [30, 41, 59], // slate-800
      cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 },
      lineColor: [226, 232, 240], // slate-200
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // slate-50
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 52 },
      1: { cellWidth: 34 },
      2: { cellWidth: 18 },
      3: { cellWidth: 21 },
      4: { fontStyle: 'bold', textColor: [29, 78, 216], cellWidth: 20 },
      5: { fontStyle: 'bold', textColor: [5, 150, 105], cellWidth: 19 },
      6: { fontStyle: 'bold', textColor: [180, 83, 9], cellWidth: 21 },
      7: { fontStyle: 'bold', textColor: [220, 38, 38], cellWidth: 20 },
      8: { fontStyle: 'bold', textColor: [4, 120, 87], cellWidth: 21 },
      9: { cellWidth: 23 },
      10: { fontStyle: 'bold', cellWidth: 20 }
    },
    didParseCell: (data) => {
      // Force header and body cell alignment to match 100%
      const colIdx = data.column.index;
      if (branchColAligns[colIdx]) {
        data.cell.styles.halign = branchColAligns[colIdx];
      }

      // Highlight totals row
      if (data.section === 'body' && data.row.index === branchTableBody.length - 1) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [15, 23, 42];
      }
    }
  });

  // =========================================================================
  // PAGE 2: TEAM MEMBERS & AGENT ROSTER PERFORMANCE BREAKDOWN
  // =========================================================================
  doc.addPage('a4', 'landscape');
  renderHeader(2, 'Team Member Performance & Excel Roster Audit');

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('AGENT CALLING PERFORMANCE & EXCEL COVERAGE BREAKDOWN', 14, 29);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Comprehensive individual calling breakdown for ${agentSummaries.length} team members with quota compliance metrics`, 14, 33.5);

  const agentTableHead = [
    [
      'AGENT NAME',
      'BRANCH HUB',
      'SUPERVISOR',
      'EXCEL LEADS',
      'CALLS MADE',
      'UNCALLED',
      'SUCCESS',
      'IN-PROGRESS',
      'CALLBACKS',
      'CONV. %',
      'COVERAGE %'
    ]
  ];

  const agentTableBody = agentSummaries.map(a => [
    a.name,
    a.branch,
    a.supervisorName,
    a.totalLeads.toLocaleString(),
    a.called.toLocaleString(),
    a.uncalled.toLocaleString(),
    a.success.toLocaleString(),
    a.inProgress.toLocaleString(),
    a.appointments.toLocaleString(),
    `${a.conversion}%`,
    `${a.coverage}%`
  ]);

  // Aggregated Totals Row for Agent Table
  const totalAgentLeads = agentSummaries.reduce((sum, a) => sum + a.totalLeads, 0);
  const totalAgentCalled = agentSummaries.reduce((sum, a) => sum + a.called, 0);
  const totalAgentUncalled = agentSummaries.reduce((sum, a) => sum + a.uncalled, 0);
  const totalAgentSuccess = agentSummaries.reduce((sum, a) => sum + a.success, 0);
  const totalAgentInProgress = agentSummaries.reduce((sum, a) => sum + a.inProgress, 0);
  const totalAgentAppointments = agentSummaries.reduce((sum, a) => sum + a.appointments, 0);
  const totalAgentConversion = totalAgentCalled > 0 ? Math.round((totalAgentSuccess / totalAgentCalled) * 100) : 0;
  const totalAgentCoverage = totalAgentLeads > 0 ? Math.round((totalAgentCalled / totalAgentLeads) * 100) : 0;

  agentTableBody.push([
    'ROSTER TOTALS',
    `${branchSummaries.length} Hubs`,
    `${supervisors.length} Sup.`,
    totalAgentLeads.toLocaleString(),
    totalAgentCalled.toLocaleString(),
    totalAgentUncalled.toLocaleString(),
    totalAgentSuccess.toLocaleString(),
    totalAgentInProgress.toLocaleString(),
    totalAgentAppointments.toLocaleString(),
    `${totalAgentConversion}%`,
    `${totalAgentCoverage}%`
  ]);

  const agentColAligns: ('left' | 'center' | 'right')[] = [
    'left',
    'left',
    'left',
    'right',
    'right',
    'right',
    'right',
    'right',
    'right',
    'right',
    'right'
  ];

  autoTable(doc, {
    startY: 37,
    head: agentTableHead,
    body: agentTableBody,
    theme: 'grid',
    margin: { left: 14, right: 14 },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      cellPadding: { top: 2.4, bottom: 2.4, left: 2.5, right: 2.5 }
    },
    bodyStyles: {
      fontSize: 7.0,
      textColor: [30, 41, 59],
      cellPadding: { top: 2.0, bottom: 2.0, left: 2.5, right: 2.5 },
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { cellWidth: 36 },
      2: { cellWidth: 33 },
      3: { cellWidth: 21 },
      4: { fontStyle: 'bold', textColor: [29, 78, 216], cellWidth: 21 },
      5: { cellWidth: 19 },
      6: { fontStyle: 'bold', textColor: [5, 150, 105], cellWidth: 19 },
      7: { fontStyle: 'bold', textColor: [180, 83, 9], cellWidth: 20 },
      8: { fontStyle: 'bold', textColor: [220, 38, 38], cellWidth: 19 },
      9: { fontStyle: 'bold', textColor: [4, 120, 87], cellWidth: 19 },
      10: { fontStyle: 'bold', cellWidth: 20 }
    },
    didParseCell: (data) => {
      const colIdx = data.column.index;
      if (agentColAligns[colIdx]) {
        data.cell.styles.halign = agentColAligns[colIdx];
      }

      if (data.section === 'body' && data.row.index === agentTableBody.length - 1) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [15, 23, 42];
      }
    }
  });

  // =========================================================================
  // PAGE 3: VISUAL ANALYTICS, CHARTS & STRATEGIC INSIGHTS GRID (2x2)
  // =========================================================================
  doc.addPage('a4', 'landscape');
  renderHeader(3, 'Visual Analytics, Performance Charts & Strategic Insights');

  // CSS Grid 2x2:
  // Left Column Width: 160mm, Right Column Width: 103mm, Gap: 6mm
  // 14mm + 160mm + 6mm = 180mm (Right card X). 180mm + 103mm = 283mm (14mm margin right)
  const chart1X = 14;
  const chart1Y = 28;
  const chart1Width = 160;
  const chart1Height = 80;

  // Card 1: Regional Performance Leaderboard (Top Left)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(chart1X, chart1Y, chart1Width, chart1Height, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.roundedRect(chart1X, chart1Y, chart1Width, chart1Height, 2, 2, 'S');

  // Top accent bar
  doc.setFillColor(37, 99, 235); // Blue accent
  doc.rect(chart1X, chart1Y, chart1Width, 2, 'F');

  // Card 1 Title & Subtitle
  doc.setFontSize(8.8);
  // Card 1 Title & Subtitle
  doc.setFontSize(8.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Regional Performance Leaderboard', chart1X + 5, chart1Y + 7.5);

  // Regional Performance Leaderboard: Accurate regional benchmark calculation
  const regionalAggregates = computeRegionalAggregates(branchSummaries);
  const activeCallingRegions = regionalAggregates.filter(r => r.called > 0);
  const activeCallingBranches = branchSummaries.filter(b => b.called > 0);
  const totalCallsInBranches = branchSummaries.reduce((sum, b) => sum + b.called, 0);
  const totalSuccessInBranches = branchSummaries.reduce((sum, b) => sum + b.success, 0);

  const avgRegionCalls = activeCallingRegions.length > 0 
    ? Math.round(activeCallingRegions.reduce((sum, r) => sum + r.called, 0) / activeCallingRegions.length)
    : (activeCallingBranches.length > 0 ? Math.round(totalCallsInBranches / activeCallingBranches.length) : 0);

  const avgRegionConv = totalCallsInBranches > 0 
    ? Math.round((totalSuccessInBranches / totalCallsInBranches) * 100) 
    : overallConversionRate;

  doc.setFontSize(6.4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Top 5 regions & hubs ranked by calls & conversions (Regional Avg: ${avgRegionCalls.toLocaleString()} calls • ${avgRegionConv}% avg conv)`, chart1X + 5, chart1Y + 11.5);

  // Legend badges on top right
  doc.setFillColor(37, 99, 235); // Blue
  doc.roundedRect(chart1X + chart1Width - 52, chart1Y + 5.2, 3, 3, 0.5, 0.5, 'F');
  doc.setFontSize(6.0);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Calls Made', chart1X + chart1Width - 47, chart1Y + 7.6);

  doc.setFillColor(16, 185, 129); // Green
  doc.roundedRect(chart1X + chart1Width - 27, chart1Y + 5.2, 3, 3, 0.5, 0.5, 'F');
  doc.text('Conv. Rate', chart1X + chart1Width - 22, chart1Y + 7.6);

  // Top 5 Branches sorted strictly from highest called & conversion to lowest
  const sortedBranches = [...branchSummaries]
    .filter(b => b.called > 0 || b.totalLeads > 0)
    .sort((a, b) => b.called - a.called || b.conversion - a.conversion);
  
  const topBranches = sortedBranches.length >= 5 
    ? sortedBranches.slice(0, 5) 
    : [...sortedBranches, ...branchSummaries.filter(b => !sortedBranches.includes(b))].slice(0, 5);

  const maxBranchCalls = Math.max(...topBranches.map(b => b.called), 1);
  const branchRowStartY = chart1Y + 16.5;
  const branchRowHeight = 12.2;

  topBranches.forEach((b, rank) => {
    const yPos = branchRowStartY + rank * branchRowHeight;

    // Medal badge colors
    const medalColors: [number, number, number][] = [
      [234, 179, 8],   // 1st: Gold
      [148, 163, 184], // 2nd: Silver
      [180, 83, 9],    // 3rd: Bronze
      [71, 85, 105],   // 4th: Slate
      [71, 85, 105]    // 5th: Slate
    ];

    doc.setFillColor(medalColors[rank][0], medalColors[rank][1], medalColors[rank][2]);
    doc.circle(chart1X + 8, yPos + 4, 3.2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5.8);
    doc.setFont('helvetica', 'bold');
    doc.text(String(rank + 1), chart1X + 8, yPos + 5.2, { align: 'center' });

    // Branch Name & Supervisor
    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(b.name, chart1X + 14, yPos + 3.2);

    doc.setFontSize(5.6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const agentText = b.agentCount > 0 ? `${b.agentCount} Agents (Avg ${Math.round(b.called / b.agentCount)} calls/agent)` : 'Central Roster';
    doc.text(`${b.region} Region  |  Sup: ${b.supervisorName}  |  ${agentText}`, chart1X + 14, yPos + 7.4);

    // Progress Bar Track
    const branchBarTrackX = chart1X + 80;
    const branchBarMaxW = 44;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(branchBarTrackX, yPos + 1.5, branchBarMaxW, 5.2, 1, 1, 'F');

    const branchBarW = Math.min(branchBarMaxW, (b.called / maxBranchCalls) * branchBarMaxW);
    if (branchBarW > 0) {
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(branchBarTrackX, yPos + 1.5, branchBarW, 5.2, 1, 1, 'F');
    }

    // Call count
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`${b.called.toLocaleString()} Calls`, chart1X + 128, yPos + 5.2);

    // Conversion badge pill
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(chart1X + chart1Width - 20, yPos + 1.5, 16, 5.2, 1, 1, 'F');
    doc.setFontSize(5.8);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(`${b.conversion}% Conv`, chart1X + chart1Width - 12, yPos + 5.2, { align: 'center' });
  });

  // -------------------------------------------------------------
  // Card 2: Call Outcome Distribution Gauge (Top Right)
  // -------------------------------------------------------------
  const chart2X = 180;
  const chart2Y = 28;
  const chart2Width = 103;
  const chart2Height = 80;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(chart2X, chart2Y, chart2Width, chart2Height, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.roundedRect(chart2X, chart2Y, chart2Width, chart2Height, 2, 2, 'S');

  // Title
  doc.setFontSize(8.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Call Outcome Distribution Breakdown', chart2X + 5, chart2Y + 7);

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Total resolved vs active pipeline distribution', chart2X + 5, chart2Y + 11.2);

  // Segmented Bar Calculation
  const totalCallsForGauge = Math.max(1, totalCallsCount);
  const successPct = Math.round((metrics.totalSuccess / totalCallsForGauge) * 100);
  const inProgPct = Math.round((metrics.totalInProgress / totalCallsForGauge) * 100);
  const notAvailPct = Math.round((metrics.totalNotAvailable / totalCallsForGauge) * 100);
  const rejectedPct = Math.max(0, 100 - (successPct + inProgPct + notAvailPct));

  const gaugeBarX = chart2X + 6;
  const gaugeBarY = chart2Y + 16.5;
  const gaugeBarWidth = chart2Width - 12;
  const gaugeBarHeight = 9.5;

  let currentX = gaugeBarX;

  // Segment 1: Success (Green)
  const w1 = (successPct / 100) * gaugeBarWidth;
  doc.setFillColor(16, 185, 129);
  doc.rect(currentX, gaugeBarY, w1, gaugeBarHeight, 'F');
  currentX += w1;

  // Segment 2: In-Progress (Amber)
  const w2 = (inProgPct / 100) * gaugeBarWidth;
  doc.setFillColor(245, 158, 11);
  doc.rect(currentX, gaugeBarY, w2, gaugeBarHeight, 'F');
  currentX += w2;

  // Segment 3: Not Available (Slate)
  const w3 = (notAvailPct / 100) * gaugeBarWidth;
  doc.setFillColor(148, 163, 184);
  doc.rect(currentX, gaugeBarY, w3, gaugeBarHeight, 'F');
  currentX += w3;

  // Segment 4: Rejected (Rose)
  const w4 = Math.max(0, gaugeBarX + gaugeBarWidth - currentX);
  doc.setFillColor(244, 63, 94);
  doc.rect(currentX, gaugeBarY, w4, gaugeBarHeight, 'F');

  // Outer border
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.roundedRect(gaugeBarX, gaugeBarY, gaugeBarWidth, gaugeBarHeight, 1, 1, 'S');

  // Breakdown Legend List
  interface OutcomeItem {
    label: string;
    count: number;
    pct: number;
    color: [number, number, number];
  }

  const outcomesList: OutcomeItem[] = [
    { label: 'Success (Conversions)', count: metrics.totalSuccess, pct: successPct, color: [16, 185, 129] },
    { label: 'In-Progress (Active Follow-up)', count: metrics.totalInProgress, pct: inProgPct, color: [245, 158, 11] },
    { label: 'Not Available / No Answer', count: metrics.totalNotAvailable, pct: notAvailPct, color: [148, 163, 184] },
    { label: 'Rejected / Disqualified', count: metrics.totalRejected, pct: rejectedPct, color: [244, 63, 94] }
  ];

  outcomesList.forEach((item, i) => {
    const itemY = chart2Y + 31 + i * 11;

    // Color box
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.roundedRect(chart2X + 6, itemY, 4.5, 4.5, 0.8, 0.8, 'F');

    // Label & count
    doc.setFontSize(7.0);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(item.label, chart2X + 13, itemY + 3.5);

    // Value & percentage aligned right
    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(`${item.count.toLocaleString()} (${item.pct}%)`, chart2X + chart2Width - 6, itemY + 3.5, { align: 'right' });

    // Subtle divider
    if (i < outcomesList.length - 1) {
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(chart2X + 6, itemY + 7.2, chart2X + chart2Width - 6, itemY + 7.2);
    }
  });

  // -------------------------------------------------------------
  // Card 3: Top Performing Agents Leaderboard (Bottom Left)
  // -------------------------------------------------------------
  const chart3X = 14;
  const chart3Y = 112;
  const chart3Width = 160;
  const chart3Height = 84;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(chart3X, chart3Y, chart3Width, chart3Height, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.roundedRect(chart3X, chart3Y, chart3Width, chart3Height, 2, 2, 'S');

  // Title
  doc.setFontSize(8.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Top 5 Employees Performance Leaderboard', chart3X + 5, chart3Y + 7);

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Ranked strictly from highest to lowest by completed calls and conversion rate', chart3X + 5, chart3Y + 11.2);

  // Top 5 employees sorted strictly from highest calls/conversion to lowest
  const topAgents = [...agentSummaries]
    .sort((a, b) => b.called - a.called || b.conversion - a.conversion || b.success - a.success)
    .slice(0, 5);

  const maxAgentCalls = Math.max(...topAgents.map(a => a.called), 1);
  const agentBarStartY = chart3Y + 15.5;
  const agentRowHeight = 12.8;

  topAgents.forEach((agent, rank) => {
    const yPos = agentBarStartY + rank * agentRowHeight;

    // Rank Medal Badge
    const medalColors: [number, number, number][] = [
      [234, 179, 8],   // 1st: Gold
      [148, 163, 184], // 2nd: Silver
      [180, 83, 9],    // 3rd: Bronze
      [71, 85, 105],   // 4th: Slate
      [71, 85, 105]    // 5th: Slate
    ];

    doc.setFillColor(medalColors[rank][0], medalColors[rank][1], medalColors[rank][2]);
    doc.circle(chart3X + 8, yPos + 4, 3.2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5.8);
    doc.setFont('helvetica', 'bold');
    doc.text(String(rank + 1), chart3X + 8, yPos + 5.2, { align: 'center' });

    // Agent Name & Branch
    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(agent.name, chart3X + 14, yPos + 3.2);

    doc.setFontSize(5.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${agent.branch} Hub  |  Sup: ${agent.supervisorName}`, chart3X + 14, yPos + 7.4);

    // Horizontal Progress Bar
    const agentBarTrackX = chart3X + 76;
    const agentBarMaxW = 48;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(agentBarTrackX, yPos + 1.5, agentBarMaxW, 5.2, 1, 1, 'F');

    const agentBarW = Math.min(agentBarMaxW, (agent.called / maxAgentCalls) * agentBarMaxW);
    if (agentBarW > 0) {
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(agentBarTrackX, yPos + 1.5, agentBarW, 5.2, 1, 1, 'F');
    }

    // Call count
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`${agent.called} Calls`, chart3X + 128, yPos + 5.2);

    // Conversion chip
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(chart3X + chart3Width - 18, yPos + 1.5, 14, 5.2, 1, 1, 'F');
    doc.setFontSize(5.8);
    doc.setTextColor(255, 255, 255);
    doc.text(`${agent.conversion}% Conv`, chart3X + chart3Width - 11, yPos + 5.2, { align: 'center' });
  });

  // -------------------------------------------------------------
  // Card 4: Executive Summary Findings & Strategic Insights (Bottom Right)
  // -------------------------------------------------------------
  const chart4X = 180;
  const chart4Y = 112;
  const chart4Width = 103;
  const chart4Height = 84;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(chart4X, chart4Y, chart4Width, chart4Height, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.roundedRect(chart4X, chart4Y, chart4Width, chart4Height, 2, 2, 'S');

  // Top accent bar
  doc.setFillColor(220, 38, 38);
  doc.rect(chart4X, chart4Y, chart4Width, 2, 'F');

  doc.setFontSize(8.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Key Operational Findings & Insights', chart4X + 5, chart4Y + 8);

  const bestBranch = [...branchSummaries].sort((a, b) => b.conversion - a.conversion)[0];
  const topAgent = topAgents[0];

  interface InsightCard {
    title: string;
    desc: string;
    color: [number, number, number];
  }

  const insights: InsightCard[] = [
    {
      title: 'Top Performing Regional Hub',
      desc: bestBranch ? `${bestBranch.name} leads with ${bestBranch.conversion}% conversion rate (${bestBranch.success} successes from ${bestBranch.called} calls).` : 'High performance across all active hubs.',
      color: [16, 185, 129]
    },
    {
      title: 'Top Calling Contributor',
      desc: topAgent ? `${topAgent.name} achieved highest conversions (${topAgent.success} customers, ${topAgent.conversion}% conv. rate in ${topAgent.branch}).` : 'Balanced agent performance.',
      color: [37, 99, 235]
    },
    {
      title: 'Quota & Attainment Pace',
      desc: `Total completed calls have reached ${totalBranchAttainment}% of current monthly targets with ${totalAppointmentsCount} scheduled callbacks queued.`,
      color: [245, 158, 11]
    }
  ];

  insights.forEach((ins, idx) => {
    const cardY = chart4Y + 14 + idx * 22;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(chart4X + 5, cardY, chart4Width - 10, 19.5, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(chart4X + 5, cardY, chart4Width - 10, 19.5, 1.5, 1.5, 'S');

    // Left color bar
    doc.setFillColor(ins.color[0], ins.color[1], ins.color[2]);
    doc.rect(chart4X + 5, cardY, 1.8, 19.5, 'F');

    // Title
    doc.setFontSize(7.0);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(ins.color[0], ins.color[1], ins.color[2]);
    doc.text(ins.title, chart4X + 9, cardY + 5.2);

    // Description word-wrapped
    doc.setFontSize(6.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const splitDesc = doc.splitTextToSize(ins.desc, chart4Width - 17);
    doc.text(splitDesc, chart4X + 9, cardY + 9.8);
  });

  // Render footers across all generated pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    renderFooter(p, totalPages);
  }

  // Save PDF
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`MyCash_Executive_Performance_Report_${dateStr}.pdf`);
}

/**
 * Generates a self-contained, publication-grade HTML report with native CSS Grid layout
 * for printing directly or generating pixel-perfect PDFs via the browser print engine.
 */
export function generatePrintableHtmlReport(
  records: CustomerRecord[],
  metrics: CallMetrics,
  currentUser: User,
  allUsers: User[],
  filterSummary: string = 'All Active Filters',
  branches?: BranchInfo[]
): string {
  const isHQAdmin = currentUser.role === 'HQ_ADMIN';
  const scopeTitle = isHQAdmin ? 'Global Enterprise HQ' : `${currentUser.branch} Hub`;
  const timestamp = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  const agents = allUsers.filter(u => u.role === 'TEAM_MEMBER' && (isHQAdmin || u.branch === currentUser.branch || u.supervisorId === currentUser.id));
  const supervisors = allUsers.filter(u => u.role === 'SUPERVISOR' && (isHQAdmin || u.branch === currentUser.branch));

  const branchSummaries = computeConsolidatedBranchSummaries(records, agents, supervisors, branches);

  const totalBranchLeads = totalLeadsCount;
  const totalBranchCalled = totalCallsCount;
  const totalBranchSuccess = totalSuccessCount;
  const totalBranchInProgress = totalInProgressCount;
  const totalBranchAppointments = totalAppointmentsCount;
  const totalBranchMonthlyTarget = branchSummaries.reduce((sum, b) => sum + b.monthlyTarget, 0);
  const totalBranchAttainment = totalBranchMonthlyTarget > 0 ? Math.round((totalBranchCalled / totalBranchMonthlyTarget) * 100) : 0;
  const totalBranchConversion = overallConversionRate;

  const activeBranchList = branchSummaries.filter(b => b.totalLeads > 0 || b.called > 0);
  const displayBranches = activeBranchList.length > 0 ? activeBranchList.slice(0, 10) : branchSummaries.slice(0, 6);
  const avgRegionCalls = activeBranchList.length > 0 ? Math.round(totalCallsCount / activeBranchList.length) : 0;

  // Agent summaries calculation
  const agentSummaries = agents.map(agent => {
    const agentRecords = records.filter(r => r.assignedAgentId === agent.id);
    const totalLeads = agentRecords.length;
    const called = agentRecords.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;
    const uncalled = agentRecords.filter(r => !r.hasBeenCalled && (!r.status || r.status === 'Uncalled')).length;
    const success = agentRecords.filter(r => r.status === 'Success').length;
    const inProgress = agentRecords.filter(r => r.status === 'In-progress').length;
    const notAvailable = agentRecords.filter(r => r.status === 'Not Available').length;
    const rejected = agentRecords.filter(r => r.status === 'Rejected').length;
    const appointments = agentRecords.filter(r => r.appointment && r.appointment.trim() !== '').length;
    const conversion = called > 0 ? Math.round((success / called) * 100) : 0;
    const coverage = totalLeads > 0 ? Math.round((called / totalLeads) * 100) : 0;
    
    const sup = supervisors.find(s => s.id === agent.supervisorId || s.branch === agent.branch);
    const supervisorName = sup ? sup.name : 'Branch Lead';

    return {
      name: agent.name,
      branch: agent.branch,
      supervisorName,
      totalLeads,
      called,
      uncalled,
      success,
      inProgress,
      notAvailable,
      rejected,
      appointments,
      conversion,
      coverage
    };
  });

  const totalAgentLeads = agentSummaries.reduce((sum, a) => sum + a.totalLeads, 0);
  const totalAgentCalled = agentSummaries.reduce((sum, a) => sum + a.called, 0);
  const totalAgentUncalled = agentSummaries.reduce((sum, a) => sum + a.uncalled, 0);
  const totalAgentSuccess = agentSummaries.reduce((sum, a) => sum + a.success, 0);
  const totalAgentInProgress = agentSummaries.reduce((sum, a) => sum + a.inProgress, 0);
  const totalAgentAppointments = agentSummaries.reduce((sum, a) => sum + a.appointments, 0);
  const totalAgentConversion = totalAgentCalled > 0 ? Math.round((totalAgentSuccess / totalAgentCalled) * 100) : 0;
  const totalAgentCoverage = totalAgentLeads > 0 ? Math.round((totalAgentCalled / totalAgentLeads) * 100) : 0;

  const sortedBranches = [...branchSummaries]
    .filter(b => b.called > 0 || b.totalLeads > 0)
    .sort((a, b) => b.called - a.called || b.conversion - a.conversion);
  const topBranches = sortedBranches.length >= 5
    ? sortedBranches.slice(0, 5)
    : [...sortedBranches, ...branchSummaries.filter(b => !sortedBranches.includes(b))].slice(0, 5);
  const maxBranchCalls = Math.max(...topBranches.map(b => b.called), 1);

  const topAgents = [...agentSummaries]
    .sort((a, b) => b.called - a.called || b.conversion - a.conversion || b.success - a.success)
    .slice(0, 5);
  const maxAgentCalls = Math.max(...topAgents.map(a => a.called), 1);
  const bestBranch = [...branchSummaries].sort((a, b) => b.conversion - a.conversion)[0];
  const topAgent = topAgents[0];

  const notAvailableCount = records.filter(r => r.status === 'Not Available').length;
  const rejectedCount = records.filter(r => r.status === 'Rejected').length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MyCash Tele-Sales Executive Performance Report</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm 12mm 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #ffffff;
      color: #0f172a;
      line-height: 1.35;
      font-size: 10px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      page-break-after: always;
      position: relative;
      min-height: 188mm;
      padding-bottom: 24px;
    }
    .page:last-child {
      page-break-after: avoid;
    }
    .header-banner {
      background: #0f172a;
      color: #ffffff;
      padding: 10px 16px;
      border-bottom: 3px solid #dc2626;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      border-radius: 4px 4px 0 0;
    }
    .header-title {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.6px;
    }
    .header-subtitle {
      font-size: 10.5px;
      color: #cbd5e1;
      font-weight: 500;
      margin-left: 8px;
    }
    .header-meta {
      font-size: 8px;
      color: #94a3b8;
      text-align: right;
      line-height: 1.35;
    }
    /* 6-COLUMN CSS GRID FOR KPI TILES */
    /* 6-COLUMN CSS GRID FOR KPI TILES */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0;
      position: relative;
      overflow: hidden;
    }
    .kpi-card-header {
      padding: 5px 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(226, 232, 240, 0.6);
      border-top: 3px solid;
    }
    .kpi-label {
      font-size: 7.5px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .kpi-badge {
      font-size: 6.8px;
      font-weight: 700;
      padding: 1.5px 5px;
      border-radius: 4px;
      color: #ffffff;
      white-space: nowrap;
      flex-shrink: 0;
      margin-left: 4px;
    }
    .kpi-body {
      padding: 7px 8px;
    }
    .kpi-value {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 3px;
      font-variant-numeric: tabular-nums;
    }
    .kpi-subtext {
      font-size: 7.5px;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .kpi-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
    }
    /* SECTION HEADER */
    .section-title {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 2px;
      letter-spacing: 0.2px;
    }
    .section-desc {
      font-size: 8.5px;
      color: #64748b;
      margin-bottom: 8px;
    }
    /* TABLE LAYOUT */
    .report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5px;
      margin-bottom: 12px;
      table-layout: fixed;
    }
    .report-table th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 5px 7px;
      border: 1px solid #1e293b;
      font-size: 8px;
      letter-spacing: 0.3px;
    }
    .report-table td {
      padding: 4.5px 7px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
      font-variant-numeric: tabular-nums;
    }
    .report-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .report-table th.num, .report-table td.num {
      text-align: right;
    }
    .report-table th.center, .report-table td.center {
      text-align: center;
    }
    .report-table tr.totals-row td {
      background: #f1f5f9;
      font-weight: 800;
      color: #0f172a;
      border-top: 1.5px solid #cbd5e1;
    }
    /* CSS GRID FOR 2x2 ANALYTICS TILES ON PAGE 3 */
    .analytics-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    .analytics-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      position: relative;
      border-top-width: 3.5px;
    }
    .analytics-card-title {
      font-size: 10px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .analytics-card-subtitle {
      font-size: 8px;
      color: #64748b;
      margin-bottom: 10px;
    }
    .bar-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 7px;
      font-size: 8px;
    }
    .bar-label {
      width: 110px;
      font-weight: 600;
      color: #334155;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .bar-track {
      flex: 1;
      height: 7px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      border-radius: 4px;
    }
    .bar-val {
      width: 55px;
      text-align: right;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .insight-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-left-width: 4px;
      border-radius: 4px;
      padding: 7px 9px;
      margin-bottom: 7px;
    }
    .insight-title {
      font-size: 8.5px;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .insight-desc {
      font-size: 7.8px;
      color: #475569;
      line-height: 1.35;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      margin-top: 12px;
      font-size: 7.5px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>
  <!-- ================= PAGE 1 ================= -->
  <div class="page">
    <div class="header-banner">
      <div>
        <span class="header-title">MYCASH TELE-SALES</span>
        <span class="header-subtitle">| Executive KPI Summary & Regional Branch Performance</span>
      </div>
      <div class="header-meta">
        <div>Generated: ${timestamp}</div>
        <div>Scope: ${scopeTitle} | User: ${currentUser.name} (${currentUser.role})</div>
        <div>Filter: ${filterSummary}</div>
      </div>
    </div>

    <!-- 6-COLUMN CSS GRID KPI TILES -->
    <div class="kpi-grid">
      <!-- 1: Total Leads -->
      <div class="kpi-card">
        <div class="kpi-card-header" style="border-top-color: #2563eb; background: #f1f6fe;">
          <div class="kpi-label">TOTAL LEADS POOL</div>
        </div>
        <div class="kpi-body">
          <div class="kpi-value">${totalLeadsCount.toLocaleString()}</div>
          <div class="kpi-subtext">
            <span class="kpi-dot" style="background: #2563eb;"></span>
            <span>${agents.length} Active Roster Agents</span>
          </div>
        </div>
      </div>

      <!-- 2: Completed Calls -->
      <div class="kpi-card">
        <div class="kpi-card-header" style="border-top-color: #1d4ed8; background: #eff6ff;">
          <div class="kpi-label">COMPLETED CALLS</div>
          <div class="kpi-badge" style="background: #1d4ed8;">${overallCoverageRate}% Cov.</div>
        </div>
        <div class="kpi-body">
          <div class="kpi-value">${totalCallsCount.toLocaleString()}</div>
          <div class="kpi-subtext">
            <span class="kpi-dot" style="background: #1d4ed8;"></span>
            <span>${overallCoverageRate}% Leads Dialed</span>
          </div>
        </div>
      </div>

      <!-- 3: Converted / Success -->
      <div class="kpi-card">
        <div class="kpi-card-header" style="border-top-color: #10b981; background: #ecfdf5;">
          <div class="kpi-label">CONVERTED / SUCCESS</div>
          <div class="kpi-badge" style="background: #10b981;">${overallConversionRate}% Conv.</div>
        </div>
        <div class="kpi-body">
          <div class="kpi-value">${totalSuccessCount.toLocaleString()}</div>
          <div class="kpi-subtext">
            <span class="kpi-dot" style="background: #10b981;"></span>
            <span>${overallConversionRate}% Lead Conversion</span>
          </div>
        </div>
      </div>

      <!-- 4: Scheduled Callbacks -->
      <div class="kpi-card">
        <div class="kpi-card-header" style="border-top-color: #dc2626; background: #fef2f2;">
          <div class="kpi-label">SCHEDULED CALLBACKS</div>
        </div>
        <div class="kpi-body">
          <div class="kpi-value">${totalAppointmentsCount.toLocaleString()}</div>
          <div class="kpi-subtext">
            <span class="kpi-dot" style="background: #dc2626;"></span>
            <span>Active Follow-up Queued</span>
          </div>
        </div>
      </div>

      <!-- 5: In-Progress -->
      <div class="kpi-card">
        <div class="kpi-card-header" style="border-top-color: #d97706; background: #fffbeb;">
          <div class="kpi-label">IN-PROGRESS PIPELINE</div>
        </div>
        <div class="kpi-body">
          <div class="kpi-value">${totalInProgressCount.toLocaleString()}</div>
          <div class="kpi-subtext">
            <span class="kpi-dot" style="background: #d97706;"></span>
            <span>Open Customer Inquiries</span>
          </div>
        </div>
      </div>

      <!-- 6: Untouched Leads -->
      <div class="kpi-card">
        <div class="kpi-card-header" style="border-top-color: #64748b; background: #f8fafc;">
          <div class="kpi-label">UNTOUCHED LEADS</div>
        </div>
        <div class="kpi-body">
          <div class="kpi-value">${totalUncalledCount.toLocaleString()}</div>
          <div class="kpi-subtext">
            <span class="kpi-dot" style="background: #64748b;"></span>
            <span>Available for Dialing</span>
          </div>
        </div>
      </div>
    </div>

    <div>
      <div class="section-title">REGIONAL BRANCH AUTO-SUMMARY & TARGET ATTAINMENT</div>
      <div class="section-desc">Aggregated regional performance across branch hubs, active calling agents, and monthly quotas</div>
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 20%;">BRANCH / REGIONAL HUB</th>
            <th style="width: 13%;">SUPERVISOR</th>
            <th class="center" style="width: 6%;">AGENTS</th>
            <th class="num" style="width: 8%;">TOTAL LEADS</th>
            <th class="num" style="width: 7.5%;">CALLED</th>
            <th class="num" style="width: 7.5%;">SUCCESS</th>
            <th class="num" style="width: 8%;">IN-PROGRESS</th>
            <th class="num" style="width: 7.5%;">CALLBACKS</th>
            <th class="num" style="width: 7.5%;">CONV. RATE</th>
            <th class="num" style="width: 8.5%;">MONTHLY TARGET</th>
            <th class="num" style="width: 6.5%;">ATTAINMENT</th>
          </tr>
        </thead>
        <tbody>
          ${displayBranches.map(b => `
            <tr>
              <td><strong>${b.name}</strong> (${b.region})</td>
              <td>${b.supervisorName}</td>
              <td class="center">${b.agentCount}</td>
              <td class="num">${b.totalLeads.toLocaleString()}</td>
              <td class="num" style="font-weight: 700; color: #1d4ed8;">${b.called.toLocaleString()}</td>
              <td class="num" style="font-weight: 700; color: #059669;">${b.success.toLocaleString()}</td>
              <td class="num" style="font-weight: 700; color: #b45309;">${b.inProgress.toLocaleString()}</td>
              <td class="num" style="font-weight: 700; color: #dc2626;">${b.appointments.toLocaleString()}</td>
              <td class="num" style="font-weight: 700; color: #047857;">${b.conversion}%</td>
              <td class="num">${b.monthlyTarget.toLocaleString()}</td>
              <td class="num" style="font-weight: 700;">${b.attainment}%</td>
            </tr>
          `).join('')}
          <tr class="totals-row">
            <td>AGGREGATED TOTALS</td>
            <td>${supervisors.length} Sup.</td>
            <td class="center">${agents.length}</td>
            <td class="num">${totalBranchLeads.toLocaleString()}</td>
            <td class="num">${totalBranchCalled.toLocaleString()}</td>
            <td class="num">${totalBranchSuccess.toLocaleString()}</td>
            <td class="num">${totalBranchInProgress.toLocaleString()}</td>
            <td class="num">${totalBranchAppointments.toLocaleString()}</td>
            <td class="num">${totalBranchConversion}%</td>
            <td class="num">${totalBranchMonthlyTarget.toLocaleString()}</td>
            <td class="num">${totalBranchAttainment}%</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      <div>CONFIDENTIAL - MYCASH TELE-SALES MANAGEMENT INFORMATION SYSTEM</div>
      <div>Page 1 of 3</div>
    </div>
  </div>

  <!-- ================= PAGE 2 ================= -->
  <div class="page">
    <div class="header-banner">
      <div>
        <span class="header-title">MYCASH TELE-SALES</span>
        <span class="header-subtitle">| Team Member Performance & Excel Roster Audit</span>
      </div>
      <div class="header-meta">
        <div>Generated: ${timestamp}</div>
        <div>Scope: ${scopeTitle} | User: ${currentUser.name} (${currentUser.role})</div>
        <div>Filter: ${filterSummary}</div>
      </div>
    </div>

    <div>
      <div class="section-title">AGENT CALLING PERFORMANCE & EXCEL COVERAGE BREAKDOWN</div>
      <div class="section-desc">Comprehensive individual calling breakdown for ${agentSummaries.length} team members with quota compliance metrics</div>
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 17%;">AGENT NAME</th>
            <th style="width: 14%;">BRANCH HUB</th>
            <th style="width: 13%;">SUPERVISOR</th>
            <th class="num" style="width: 8%;">EXCEL LEADS</th>
            <th class="num" style="width: 8%;">CALLS MADE</th>
            <th class="num" style="width: 7%;">UNCALLED</th>
            <th class="num" style="width: 7%;">SUCCESS</th>
            <th class="num" style="width: 7%;">IN-PROGRESS</th>
            <th class="num" style="width: 7%;">CALLBACKS</th>
            <th class="num" style="width: 6%;">CONV. %</th>
            <th class="num" style="width: 6%;">COVERAGE %</th>
          </tr>
        </thead>
        <tbody>
          ${agentSummaries.map(a => `
            <tr>
              <td><strong>${a.name}</strong></td>
              <td>${a.branch}</td>
              <td>${a.supervisorName}</td>
              <td class="num">${a.totalLeads.toLocaleString()}</td>
              <td class="num" style="font-weight: 700; color: #1d4ed8;">${a.called.toLocaleString()}</td>
              <td class="num" style="color: #64748b;">${a.uncalled.toLocaleString()}</td>
              <td class="num" style="font-weight: 700; color: #059669;">${a.success.toLocaleString()}</td>
              <td class="num" style="font-weight: 700; color: #b45309;">${a.inProgress.toLocaleString()}</td>
              <td class="num" style="font-weight: 700; color: #dc2626;">${a.appointments.toLocaleString()}</td>
              <td class="num" style="font-weight: 700; color: #047857;">${a.conversion}%</td>
              <td class="num" style="font-weight: 700;">${a.coverage}%</td>
            </tr>
          `).join('')}
          <tr class="totals-row">
            <td>ROSTER TOTALS</td>
            <td>${branchList.length} Hubs</td>
            <td>${supervisors.length} Sup.</td>
            <td class="num">${totalAgentLeads.toLocaleString()}</td>
            <td class="num">${totalAgentCalled.toLocaleString()}</td>
            <td class="num">${totalAgentUncalled.toLocaleString()}</td>
            <td class="num">${totalAgentSuccess.toLocaleString()}</td>
            <td class="num">${totalAgentInProgress.toLocaleString()}</td>
            <td class="num">${totalAgentAppointments.toLocaleString()}</td>
            <td class="num">${totalAgentConversion}%</td>
            <td class="num">${totalAgentCoverage}%</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      <div>CONFIDENTIAL - MYCASH TELE-SALES MANAGEMENT INFORMATION SYSTEM</div>
      <div>Page 2 of 3</div>
    </div>
  </div>

  <!-- ================= PAGE 3 ================= -->
  <div class="page">
    <div class="header-banner">
      <div>
        <span class="header-title">MYCASH TELE-SALES</span>
        <span class="header-subtitle">| Visual Analytics, Leaderboards & Strategic Insights</span>
      </div>
      <div class="header-meta">
        <div>Generated: ${timestamp}</div>
        <div>Scope: ${scopeTitle} | User: ${currentUser.name} (${currentUser.role})</div>
        <div>Filter: ${filterSummary}</div>
      </div>
    </div>

    <!-- 2x2 CSS GRID FOR ADVANCED VISUAL REPORTING -->
    <div class="analytics-grid">
      <!-- Card 1: Regional Performance Leaderboard -->
      <div class="analytics-card" style="border-top-color: #3b82f6;">
        <div class="analytics-card-title">Regional Performance Leaderboard</div>
        <div class="analytics-card-subtitle">Top 5 branches ranked from highest called volume and conversion rate to lowest</div>
        ${topBranches.map((b, i) => `
          <div class="bar-row">
            <span class="bar-label" style="display: flex; align-items: center; gap: 4px;">
              <strong style="color: #2563eb;">#${i + 1}</strong> ${b.name}
            </span>
            <div class="bar-track">
              <div class="bar-fill" style="width: ${Math.min(100, (b.called / maxBranchCalls) * 100)}%; background: #2563eb;"></div>
            </div>
            <span class="bar-val" style="color: #1d4ed8; font-weight: 700;">${b.called} calls (${b.conversion}%)</span>
          </div>
        `).join('')}
      </div>

      <!-- Card 2: Outcome Distribution Gauge -->
      <div class="analytics-card" style="border-top-color: #10b981;">
        <div class="analytics-card-title">Overall Call Outcome Distribution</div>
        <div class="analytics-card-subtitle">Completed call categorization across roster records</div>
        <div class="bar-row">
          <span class="bar-label">Converted / Success</span>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${totalCallsCount > 0 ? (totalSuccessCount / totalCallsCount) * 100 : 0}%; background: #10b981;"></div>
          </div>
          <span class="bar-val" style="color: #047857;">${totalSuccessCount}</span>
        </div>
        <div class="bar-row">
          <span class="bar-label">Scheduled Callbacks</span>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${totalCallsCount > 0 ? (totalAppointmentsCount / totalCallsCount) * 100 : 0}%; background: #dc2626;"></div>
          </div>
          <span class="bar-val" style="color: #b91c1c;">${totalAppointmentsCount}</span>
        </div>
        <div class="bar-row">
          <span class="bar-label">In-Progress Follow-ups</span>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${totalCallsCount > 0 ? (totalInProgressCount / totalCallsCount) * 100 : 0}%; background: #f59e0b;"></div>
          </div>
          <span class="bar-val" style="color: #d97706;">${totalInProgressCount}</span>
        </div>
        <div class="bar-row">
          <span class="bar-label">Not Available</span>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${totalCallsCount > 0 ? (notAvailableCount / totalCallsCount) * 100 : 0}%; background: #94a3b8;"></div>
          </div>
          <span class="bar-val" style="color: #64748b;">${notAvailableCount}</span>
        </div>
        <div class="bar-row">
          <span class="bar-label">Rejected Leads</span>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${totalCallsCount > 0 ? (rejectedCount / totalCallsCount) * 100 : 0}%; background: #e11d48;"></div>
          </div>
          <span class="bar-val" style="color: #be123c;">${rejectedCount}</span>
        </div>
      </div>

      <!-- Card 3: Top 5 Employees Performance Leaderboard -->
      <div class="analytics-card" style="border-top-color: #8b5cf6;">
        <div class="analytics-card-title">Top 5 Employees Performance Leaderboard</div>
        <div class="analytics-card-subtitle">Ranked from highest to lowest by completed calls and conversion rate</div>
        ${topAgents.map((a, i) => `
          <div class="bar-row">
            <span class="bar-label" style="display: flex; align-items: center; gap: 4px;">
              <strong style="color: #7c3aed;">#${i + 1}</strong> ${a.name}
            </span>
            <div class="bar-track">
              <div class="bar-fill" style="width: ${Math.min(100, (a.called / maxAgentCalls) * 100)}%; background: #8b5cf6;"></div>
            </div>
            <span class="bar-val" style="color: #6d28d9; font-weight: 700;">${a.called} calls (${a.conversion}%)</span>
          </div>
        `).join('')}
      </div>

      <!-- Card 4: Strategic Operational Insights -->
      <div class="analytics-card" style="border-top-color: #dc2626;">
        <div class="analytics-card-title">Key Operational Findings & Insights</div>
        <div class="analytics-card-subtitle">Automated executive intelligence and quota pacing summary</div>
        
        <div class="insight-card" style="border-left-color: #10b981;">
          <div class="insight-title" style="color: #047857;">Top Performing Regional Hub</div>
          <div class="insight-desc">${bestBranch ? `${bestBranch.name} leads with ${bestBranch.conversion}% conversion rate (${bestBranch.success} successes from ${bestBranch.called} calls).` : 'High performance across all active hubs.'}</div>
        </div>

        <div class="insight-card" style="border-left-color: #3b82f6;">
          <div class="insight-title" style="color: #1d4ed8;">Top Calling Contributor</div>
          <div class="insight-desc">${topAgent ? `${topAgent.name} achieved highest conversions (${topAgent.success} customers, ${topAgent.conversion}% conv. rate in ${topAgent.branch}).` : 'Balanced agent performance.'}</div>
        </div>

        <div class="insight-card" style="border-left-color: #f59e0b;">
          <div class="insight-title" style="color: #d97706;">Quota & Attainment Pace</div>
          <div class="insight-desc">Total completed calls have reached ${totalBranchAttainment}% of current monthly targets with ${totalAppointmentsCount} scheduled callbacks queued.</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div>CONFIDENTIAL - MYCASH TELE-SALES MANAGEMENT INFORMATION SYSTEM</div>
      <div>Page 3 of 3</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Prints the executive report directly using browser print engine with native CSS Grid layout
 */
export function printPdfReportViaCssGrid(
  records: CustomerRecord[],
  metrics: CallMetrics,
  currentUser: User,
  allUsers: User[],
  filterSummary: string = 'All Active Filters',
  branches?: BranchInfo[]
): void {
  const htmlContent = generatePrintableHtmlReport(records, metrics, currentUser, allUsers, filterSummary, branches);
  
  // Use invisible iframe for seamless print dialog without opening unwanted popups
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();
    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (e) {
          // ignore cleanup if already detached
        }
      }, 2000);
    }, 400);
  }
}


