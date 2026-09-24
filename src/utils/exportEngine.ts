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

  // Default branches fallback if not provided
  const branchList: BranchInfo[] = branches && branches.length > 0 ? branches : [
    { id: 'b-1', name: 'Mogadishu Central', region: 'Banaadir', supervisorId: 'u-sup-1', supervisorName: 'Guled Warsame', targetCallsMonth: 1200, targetCallsWeek: 300, baseWeeklyTargetPerAgent: 50, baseMonthlyTargetPerAgent: 200 },
    { id: 'b-2', name: 'Hargeisa Commercial Hub', region: 'Woqooyi Galbeed', supervisorId: 'u-sup-2', supervisorName: 'Farhan Mohamed', targetCallsMonth: 800, targetCallsWeek: 200, baseWeeklyTargetPerAgent: 50, baseMonthlyTargetPerAgent: 200 },
    { id: 'b-3', name: 'Garowe North', region: 'Nugaal', supervisorId: 'u-sup-3', supervisorName: 'Khadar Ahmed', targetCallsMonth: 600, targetCallsWeek: 150, baseWeeklyTargetPerAgent: 50, baseMonthlyTargetPerAgent: 200 },
    { id: 'b-4', name: 'Bosaso Port Branch', region: 'Bari', supervisorId: 'u-sup-4', supervisorName: 'Liban Jama', targetCallsMonth: 600, targetCallsWeek: 150, baseWeeklyTargetPerAgent: 50, baseMonthlyTargetPerAgent: 200 },
    { id: 'b-5', name: 'Kismayo Southern Hub', region: 'Jubaland', supervisorId: 'u-sup-5', supervisorName: 'Maryan Abdi', targetCallsMonth: 600, targetCallsWeek: 150, baseWeeklyTargetPerAgent: 50, baseMonthlyTargetPerAgent: 200 },
    { id: 'b-6', name: 'Baidoa Central', region: 'Bay', supervisorId: 'u-sup-6', supervisorName: 'Mustafa Hassan', targetCallsMonth: 600, targetCallsWeek: 150, baseWeeklyTargetPerAgent: 50, baseMonthlyTargetPerAgent: 200 }
  ];

  // Calculate branch summaries
  const branchSummaries = branchList.map(b => {
    const branchRecords = records.filter(r => r.areaOfReg === b.name);
    const branchAgents = agents.filter(a => a.branch === b.name);
    const totalLeads = branchRecords.length;
    const called = branchRecords.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;
    const success = branchRecords.filter(r => r.status === 'Success').length;
    const inProgress = branchRecords.filter(r => r.status === 'In-progress').length;
    const notAvailable = branchRecords.filter(r => r.status === 'Not Available').length;
    const rejected = branchRecords.filter(r => r.status === 'Rejected').length;
    const appointments = branchRecords.filter(r => r.appointment && r.appointment.trim() !== '').length;
    const conversion = called > 0 ? Math.round((success / called) * 100) : 0;
    const monthlyTarget = b.targetCallsMonth || (b.baseMonthlyTargetPerAgent ? b.baseMonthlyTargetPerAgent * Math.max(1, branchAgents.length) : 600);
    const attainment = monthlyTarget > 0 ? Math.round((called / monthlyTarget) * 100) : 0;

    const sup = supervisors.find(s => s.branch === b.name || s.id === b.supervisorId);
    const supervisorName = sup ? sup.name : b.supervisorName || 'Unassigned';

    return {
      name: b.name,
      region: b.region,
      supervisorName,
      agentCount: branchAgents.length,
      totalLeads,
      called,
      success,
      inProgress,
      notAvailable,
      rejected,
      appointments,
      conversion,
      monthlyTarget,
      attainment
    };
  });

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

  // Header drawing function
  const renderHeader = (pageNumber: number, sectionSubtitle: string) => {
    // Top banner background
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 297, 22, 'F');

    // Red accent line
    doc.setFillColor(220, 38, 38); // red-600
    doc.rect(0, 22, 297, 1.5, 'F');

    // Brand title & Icon
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('MYCASH TELE-SALES', 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text(`|  ${sectionSubtitle}`, 70, 11);

    // Metadata on right side
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Generated: ${timestamp}`, 283, 8, { align: 'right' });
    doc.text(`Scope: ${scopeTitle}  |  User: ${currentUser.name} (${currentUser.role})`, 283, 14, { align: 'right' });
    doc.text(`Filter: ${filterSummary}`, 283, 19, { align: 'right' });
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

  // Draw 6 KPI Tiles Across Top
  const startY = 27;
  const tileWidth = 42.5;
  const tileHeight = 22;
  const tileGap = 2.8;
  const tileMarginLeft = 14;

  interface TileData {
    label: string;
    value: string | number;
    subtext: string;
    topColor: [number, number, number]; // RGB
    badgeText?: string;
  }

  const kpiTiles: TileData[] = [
    {
      label: 'TOTAL LEADS POOL',
      value: totalLeadsCount.toLocaleString(),
      subtext: `${agents.length} Active Agents`,
      topColor: [59, 130, 246] // Blue
    },
    {
      label: 'COMPLETED CALLS',
      value: totalCallsCount.toLocaleString(),
      subtext: `${overallCoverageRate}% Total Coverage`,
      topColor: [37, 99, 235], // Dark Blue
      badgeText: `${overallCoverageRate}%`
    },
    {
      label: 'SUCCESS / CONVERTED',
      value: totalSuccessCount.toLocaleString(),
      subtext: `${overallConversionRate}% Conversion`,
      topColor: [16, 185, 129], // Emerald
      badgeText: `${overallConversionRate}% Rate`
    },
    {
      label: 'SCHEDULED CALLBACKS',
      value: totalAppointmentsCount.toLocaleString(),
      subtext: 'Upcoming Follow-ups',
      topColor: [220, 38, 38] // Red
    },
    {
      label: 'IN-PROGRESS PIPELINE',
      value: totalInProgressCount.toLocaleString(),
      subtext: 'Active Follow-ups',
      topColor: [245, 158, 11] // Amber
    },
    {
      label: 'UNTOUCHED LEADS',
      value: totalUncalledCount.toLocaleString(),
      subtext: 'Queued for Dialing',
      topColor: [100, 116, 139] // Slate
    }
  ];

  kpiTiles.forEach((tile, index) => {
    const x = tileMarginLeft + index * (tileWidth + tileGap);
    const y = startY;

    // Card background
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(x, y, tileWidth, tileHeight, 2, 2, 'F');

    // Border
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, tileWidth, tileHeight, 2, 2, 'S');

    // Colored top accent stripe
    doc.setFillColor(tile.topColor[0], tile.topColor[1], tile.topColor[2]);
    doc.rect(x, y, tileWidth, 1.8, 'F');

    // Tile label
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(tile.label, x + 3, y + 5.8);

    // Tile value
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(String(tile.value), x + 3, y + 14);

    // Subtext
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(tile.subtext, x + 3, y + 19);

    // Optional badge pill
    if (tile.badgeText) {
      doc.setFillColor(tile.topColor[0], tile.topColor[1], tile.topColor[2]);
      doc.roundedRect(x + tileWidth - 14, y + 3.5, 11.5, 4.2, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'bold');
      doc.text(tile.badgeText, x + tileWidth - 8.2, y + 6.5, { align: 'center' });
    }
  });

  // Section Header: Regional Branch Performance
  const branchTableStartY = startY + tileHeight + 4.5;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('REGIONAL BRANCH AUTO-SUMMARY & TARGET ATTAINMENT', 14, branchTableStartY);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Comprehensive roll-up aggregated across regional branch hubs, active calling agents, and monthly quotas', 14, branchTableStartY + 3.8);

  // Branch Performance AutoTable
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

  const branchTableBody = branchSummaries.map(b => [
    `${b.name} (${b.region})`,
    b.supervisorName,
    `${b.agentCount} Agents`,
    b.totalLeads.toLocaleString(),
    b.called.toLocaleString(),
    b.success.toLocaleString(),
    b.inProgress.toLocaleString(),
    b.appointments.toLocaleString(),
    `${b.conversion}%`,
    b.monthlyTarget.toLocaleString(),
    `${b.attainment}%`
  ]);

  // Totals Row
  const totalBranchLeads = branchSummaries.reduce((sum, b) => sum + b.totalLeads, 0);
  const totalBranchCalled = branchSummaries.reduce((sum, b) => sum + b.called, 0);
  const totalBranchSuccess = branchSummaries.reduce((sum, b) => sum + b.success, 0);
  const totalBranchInProgress = branchSummaries.reduce((sum, b) => sum + b.inProgress, 0);
  const totalBranchAppointments = branchSummaries.reduce((sum, b) => sum + b.appointments, 0);
  const totalBranchMonthlyTarget = branchSummaries.reduce((sum, b) => sum + b.monthlyTarget, 0);
  const totalBranchAttainment = totalBranchMonthlyTarget > 0 ? Math.round((totalBranchCalled / totalBranchMonthlyTarget) * 100) : 0;
  const totalBranchConversion = totalBranchCalled > 0 ? Math.round((totalBranchSuccess / totalBranchCalled) * 100) : 0;

  branchTableBody.push([
    'AGGREGATED TOTALS',
    `${supervisors.length} Supervisors`,
    `${agents.length} Agents`,
    totalBranchLeads.toLocaleString(),
    totalBranchCalled.toLocaleString(),
    totalBranchSuccess.toLocaleString(),
    totalBranchInProgress.toLocaleString(),
    totalBranchAppointments.toLocaleString(),
    `${totalBranchConversion}%`,
    totalBranchMonthlyTarget.toLocaleString(),
    `${totalBranchAttainment}%`
  ]);

  autoTable(doc, {
    startY: branchTableStartY + 6,
    head: branchTableHead,
    body: branchTableBody,
    theme: 'grid',
    margin: { left: 14, right: 14 },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      cellPadding: 2.2,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 54 },
      1: { cellWidth: 36 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', fontStyle: 'bold', textColor: [37, 99, 235], cellWidth: 18 },
      5: { halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129], cellWidth: 18 },
      6: { halign: 'center', fontStyle: 'bold', textColor: [217, 119, 6], cellWidth: 18 },
      7: { halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38], cellWidth: 20 },
      8: { halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105], cellWidth: 22 },
      9: { halign: 'center', cellWidth: 24 },
      10: { halign: 'center', fontStyle: 'bold', cellWidth: 21 }
    },
    didParseCell: (data) => {
      // Highlight summary totals row
      if (data.row.index === branchTableBody.length - 1) {
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
  doc.text(`Individual performance breakdown for ${agentSummaries.length} calling team members`, 14, 33.5);

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
      fontSize: 6.8,
      cellPadding: 2,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: [30, 41, 59],
      cellPadding: 1.8,
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 44 },
      1: { cellWidth: 38 },
      2: { cellWidth: 34 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', fontStyle: 'bold', textColor: [37, 99, 235], cellWidth: 20 },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129], cellWidth: 18 },
      7: { halign: 'center', fontStyle: 'bold', textColor: [217, 119, 6], cellWidth: 20 },
      8: { halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38], cellWidth: 20 },
      9: { halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105], cellWidth: 18 },
      10: { halign: 'center', fontStyle: 'bold', cellWidth: 19 }
    }
  });

  // =========================================================================
  // PAGE 3: BEAUTIFUL CHARTS & GRAPHS OF TEAMS AND BRANCHES
  // =========================================================================
  doc.addPage('a4', 'landscape');
  renderHeader(3, 'Visual Analytics, Charts & Performance Visualizations');

  // Chart Grid Setup
  // Top Half: Branch Calls & Target Comparison Graph + Call Outcome Gauge
  // Bottom Half: Top Performing Agents Leaderboard + Key Executive Findings Callout

  // -------------------------------------------------------------
  // GRAPH 1: REGIONAL BRANCHES CALL VOLUME & TARGET COMPARISON BARS
  // -------------------------------------------------------------
  const chart1X = 14;
  const chart1Y = 28;
  const chart1Width = 160;
  const chart1Height = 82;

  // Chart Container Card
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(chart1X, chart1Y, chart1Width, chart1Height, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(chart1X, chart1Y, chart1Width, chart1Height, 2.5, 2.5, 'S');

  // Title
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Regional Branch Calls vs. Monthly Target Quotas', chart1X + 4, chart1Y + 6.5);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Comparative visual performance tracking actual calls made against targeted branch quota', chart1X + 4, chart1Y + 10.5);

  // Legend
  doc.setFillColor(37, 99, 235); // Blue: Calls Made
  doc.rect(chart1X + chart1Width - 52, chart1Y + 4, 3, 3, 'F');
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text('Calls Made', chart1X + chart1Width - 47, chart1Y + 6.5);

  doc.setFillColor(16, 185, 129); // Green: Success
  doc.rect(chart1X + chart1Width - 28, chart1Y + 4, 3, 3, 'F');
  doc.text('Success', chart1X + chart1Width - 23, chart1Y + 6.5);

  // Draw Horizontal Bar Chart for Branches
  const maxTarget = Math.max(...branchSummaries.map(b => Math.max(b.monthlyTarget, b.called, 1)), 1);
  const barChartStartY = chart1Y + 16;
  const barHeight = 6.5;
  const barGap = 4;
  const barMaxPixelWidth = 85;

  branchSummaries.slice(0, 6).forEach((b, idx) => {
    const yPos = barChartStartY + idx * (barHeight + barGap);

    // Branch Label
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    const cleanBranchName = b.name.replace(' Commercial Hub', '').replace(' Central', '').replace(' Southern Hub', '').replace(' Port Branch', '').replace(' North', '');
    doc.text(cleanBranchName, chart1X + 4, yPos + 4.5);

    // Target Subtext
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Tgt: ${b.monthlyTarget}`, chart1X + 32, yPos + 4.5);

    // Background Bar Track
    const trackX = chart1X + 46;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(trackX, yPos, barMaxPixelWidth, barHeight, 1, 1, 'F');

    // Called Fill Bar
    const calledBarWidth = Math.min(barMaxPixelWidth, (b.called / maxTarget) * barMaxPixelWidth);
    if (calledBarWidth > 0) {
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(trackX, yPos, calledBarWidth, barHeight, 1, 1, 'F');
    }

    // Success Segment overlay
    const successBarWidth = Math.min(calledBarWidth, (b.success / maxTarget) * barMaxPixelWidth);
    if (successBarWidth > 0) {
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(trackX, yPos, successBarWidth, barHeight, 1, 1, 'F');
    }

    // Target Reference Line (if within bounds)
    const targetX = trackX + Math.min(barMaxPixelWidth, (b.monthlyTarget / maxTarget) * barMaxPixelWidth);
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.6);
    doc.line(targetX, yPos - 0.5, targetX, yPos + barHeight + 0.5);

    // Metric Text Values on right
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${b.called} / ${b.monthlyTarget}`, trackX + barMaxPixelWidth + 3, yPos + 4.5);

    // Attainment Badge
    const attainmentColor: [number, number, number] = b.attainment >= 80 ? [16, 185, 129] : b.attainment >= 50 ? [37, 99, 235] : [217, 119, 6];
    doc.setFillColor(attainmentColor[0], attainmentColor[1], attainmentColor[2]);
    doc.roundedRect(chart1X + chart1Width - 16, yPos + 0.5, 12, 5, 1, 1, 'F');
    doc.setFontSize(5.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`${b.attainment}%`, chart1X + chart1Width - 10, yPos + 4, { align: 'center' });
  });

  // -------------------------------------------------------------
  // GRAPH 2: CALL OUTCOME DISTRIBUTION VISUAL GAUGE
  // -------------------------------------------------------------
  const chart2X = 180;
  const chart2Y = 28;
  const chart2Width = 103;
  const chart2Height = 82;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(chart2X, chart2Y, chart2Width, chart2Height, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(chart2X, chart2Y, chart2Width, chart2Height, 2.5, 2.5, 'S');

  // Title
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Call Outcome Distribution Breakdown', chart2X + 4, chart2Y + 6.5);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Total resolved vs ongoing calling pipeline', chart2X + 4, chart2Y + 10.5);

  // Segmented Bar Calculation
  const totalCallsForGauge = Math.max(1, totalCallsCount);
  const successPct = Math.round((metrics.totalSuccess / totalCallsForGauge) * 100);
  const inProgPct = Math.round((metrics.totalInProgress / totalCallsForGauge) * 100);
  const notAvailPct = Math.round((metrics.totalNotAvailable / totalCallsForGauge) * 100);
  const rejectedPct = Math.max(0, 100 - (successPct + inProgPct + notAvailPct));

  // Multi-segment horizontal progress bar
  const gaugeBarX = chart2X + 6;
  const gaugeBarY = chart2Y + 16;
  const gaugeBarWidth = chart2Width - 12;
  const gaugeBarHeight = 10;

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
  doc.setLineWidth(0.3);
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
    const itemY = chart2Y + 31 + i * 11.5;

    // Color box
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.roundedRect(chart2X + 6, itemY, 4.5, 4.5, 0.8, 0.8, 'F');

    // Label & count
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(item.label, chart2X + 13, itemY + 3.5);

    // Value & percentage
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(`${item.count.toLocaleString()} (${item.pct}%)`, chart2X + chart2Width - 6, itemY + 3.5, { align: 'right' });

    // Subtle divider
    if (i < outcomesList.length - 1) {
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(chart2X + 6, itemY + 7.5, chart2X + chart2Width - 6, itemY + 7.5);
    }
  });

  // -------------------------------------------------------------
  // GRAPH 3: TOP PERFORMING AGENTS LEADERBOARD (BOTTOM LEFT)
  // -------------------------------------------------------------
  const chart3X = 14;
  const chart3Y = 114;
  const chart3Width = 160;
  const chart3Height = 82;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(chart3X, chart3Y, chart3Width, chart3Height, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(chart3X, chart3Y, chart3Width, chart3Height, 2.5, 2.5, 'S');

  // Title
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Top Calling Team Members Leaderboard', chart3X + 4, chart3Y + 6.5);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Ranked by completed calls, converted leads, and conversion efficiency', chart3X + 4, chart3Y + 10.5);

  // Sort top agents by success and calls
  const topAgents = [...agentSummaries]
    .sort((a, b) => b.success - a.success || b.called - a.called)
    .slice(0, 5);

  const maxAgentCalls = Math.max(...topAgents.map(a => a.called), 1);
  const agentBarStartY = chart3Y + 15;
  const agentRowHeight = 12.5;

  topAgents.forEach((agent, rank) => {
    const yPos = agentBarStartY + rank * agentRowHeight;

    // Rank Medal Badge
    const medalColors: [number, number, number][] = [
      [234, 179, 8],   // 1st: Gold (Amber-500)
      [148, 163, 184], // 2nd: Silver (Slate-400)
      [180, 83, 9],    // 3rd: Bronze (Amber-700)
      [71, 85, 105],   // 4th: Slate-600
      [71, 85, 105]    // 5th: Slate-600
    ];

    doc.setFillColor(medalColors[rank][0], medalColors[rank][1], medalColors[rank][2]);
    doc.circle(chart3X + 7.5, yPos + 4, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.text(String(rank + 1), chart3X + 7.5, yPos + 5.2, { align: 'center' });

    // Agent Name & Branch
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(agent.name, chart3X + 13, yPos + 3.2);

    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${agent.branch} Hub  |  Sup: ${agent.supervisorName}`, chart3X + 13, yPos + 7.2);

    // Horizontal Progress Bar
    const agentBarTrackX = chart3X + 76;
    const agentBarMaxW = 50;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(agentBarTrackX, yPos + 1.5, agentBarMaxW, 5, 1, 1, 'F');

    const agentBarW = Math.min(agentBarMaxW, (agent.called / maxAgentCalls) * agentBarMaxW);
    if (agentBarW > 0) {
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(agentBarTrackX, yPos + 1.5, agentBarW, 5, 1, 1, 'F');
    }

    // Text Values
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`${agent.called} Calls`, chart3X + 130, yPos + 5);

    // Conversion chip
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(chart3X + chart3Width - 17, yPos + 1.5, 13, 5, 1, 1, 'F');
    doc.setFontSize(5.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`${agent.conversion}% Conv`, chart3X + chart3Width - 10.5, yPos + 5, { align: 'center' });
  });

  // -------------------------------------------------------------
  // GRAPH 4: EXECUTIVE SUMMARY CALLOUT & KEY METRICS (BOTTOM RIGHT)
  // -------------------------------------------------------------
  const chart4X = 180;
  const chart4Y = 114;
  const chart4Width = 103;
  const chart4Height = 82;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(chart4X, chart4Y, chart4Width, chart4Height, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(chart4X, chart4Y, chart4Width, chart4Height, 2.5, 2.5, 'S');

  // Top accent
  doc.setFillColor(220, 38, 38);
  doc.rect(chart4X, chart4Y, chart4Width, 2, 'F');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Key Operational Findings & Strategic Insights', chart4X + 5, chart4Y + 8);

  // Highest converting branch
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
    const cardY = chart4Y + 14 + idx * 21.5;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(chart4X + 5, cardY, chart4Width - 10, 19, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(chart4X + 5, cardY, chart4Width - 10, 19, 1.5, 1.5, 'S');

    // Left color bar
    doc.setFillColor(ins.color[0], ins.color[1], ins.color[2]);
    doc.rect(chart4X + 5, cardY, 1.5, 19, 'F');

    // Title
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(ins.color[0], ins.color[1], ins.color[2]);
    doc.text(ins.title, chart4X + 9, cardY + 4.8);

    // Description (split text if long)
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const splitDesc = doc.splitTextToSize(ins.desc, chart4Width - 16);
    doc.text(splitDesc, chart4X + 9, cardY + 9);
  });

  // Render footers across all 3 pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    renderFooter(p, totalPages);
  }

  // Save PDF
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`MyCash_Executive_Performance_Report_${dateStr}.pdf`);
}
