import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AiAnalysisResult } from '../lib/gemini';
import { User } from '../types';

/**
 * Generates a redesigned, executive, publication-grade multi-page PDF report in English
 * analyzing customer feedback notes in Af-Soomaali, frequent complaints (with originating branches),
 * dedicated Success Feedback, Rejection Feedback & objection scripts, regional branch benchmarks,
 * and an individual Agent Calling Evaluation table that accurately fetches total/assigned leads and metrics.
 *
 * Formatted in Landscape A4 (297mm x 210mm) matching the enterprise portal standard.
 */
export function generateAiIntelligencePdf(
  analysis: AiAnalysisResult,
  currentUser: User,
  selectedScopeDescription: string,
  datePeriod?: string
): void {
  // Landscape A4: 297mm width x 210mm height
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 269mm

  const timestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const isHQAdmin = currentUser.role === 'HQ_ADMIN';
  const cleanScope = selectedScopeDescription.length > 44
    ? selectedScopeDescription.slice(0, 41) + '...'
    : selectedScopeDescription;
  const periodText = datePeriod || analysis.datePeriod || 'All Time';

  // =========================================================================
  // STANDARD EXECUTIVE HEADER
  // =========================================================================
  const renderHeader = (sectionSubtitle: string) => {
    // Top banner background (slate-900)
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 22, 'F');

    // Red accent line (red-600)
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 22, pageWidth, 1.5, 'F');

    // Main Brand Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.text('MYCASH TELE-SALES', margin, 9.5);

    // AI Intelligence tag badge
    doc.setFillColor(220, 38, 38);
    doc.roundedRect(margin + 49, 5.2, 46, 5, 0.8, 0.8, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('AI INTELLIGENCE REPORT', margin + 51, 8.8);

    // Subtitle / Page Section
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text(sectionSubtitle, margin, 16.5);

    // Metadata on right side
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Generated: ${timestamp}`, pageWidth - margin, 7.5, { align: 'right' });
    doc.text(`Scope: ${cleanScope}  |  Period: ${periodText}`, pageWidth - margin, 12.5, { align: 'right' });
    doc.text(`User: ${currentUser.name} (${currentUser.role})  |  Confidential Enterprise MIS`, pageWidth - margin, 17.5, { align: 'right' });
  };

  // =========================================================================
  // STANDARD EXECUTIVE FOOTER (Post-rendered across all pages)
  // =========================================================================
  const renderFooter = (pageNumber: number, totalPagesCount: number) => {
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.4);
    doc.line(margin, 201, pageWidth - margin, 201);

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(
      'CONFIDENTIAL - MYCASH TELE-SALES MANAGEMENT INFORMATION SYSTEM  •  AI INTELLIGENCE & AF-SOOMAALI FEEDBACK ANALYTICS',
      margin,
      205.5
    );

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Page ${pageNumber} of ${totalPagesCount}`, pageWidth - margin, 205.5, { align: 'right' });
  };

  // =========================================================================
  // PAGE 1: EXECUTIVE KPI SUMMARY & TOP COMPLAINTS WITH BRANCHES ORIGIN
  // =========================================================================
  renderHeader('Executive KPI Overview & Frequent Complaints Matrix');

  // Draw 6 Executive KPI Tiles Across Top (width 269mm total)
  const startY = 27;
  const tileWidth = 42.6;
  const tileHeight = 22.5;
  const tileGap = 2.68;

  interface TileData {
    label: string;
    tag: string;
    value: string;
    subtext: string;
    valueColor: [number, number, number];
    topColor: [number, number, number];
    barRatio: number;
  }

  const complaintsPct = analysis.feedbackBreakdown.complaintsPercent;
  const apprecPct = analysis.feedbackBreakdown.appreciationsPercent;
  const rejectPct = analysis.feedbackBreakdown.rejectionsPercent;
  const apptPct = analysis.feedbackBreakdown.inquiriesAndFollowupsPercent;

  const kpiTiles: TileData[] = [
    {
      label: 'CUSTOMER FRICTION',
      tag: 'Complaints',
      value: `${complaintsPct}%`,
      subtext: 'Friction issues identified',
      valueColor: [220, 38, 38], // Red
      topColor: [220, 38, 38],
      barRatio: Math.min(1, Math.max(0.08, complaintsPct / 100))
    },
    {
      label: 'POSITIVE SENTIMENT',
      tag: 'Appreciation',
      value: `${apprecPct}%`,
      subtext: 'Praise & positive sentiment',
      valueColor: [5, 150, 105], // Emerald
      topColor: [16, 185, 129],
      barRatio: Math.min(1, Math.max(0.08, apprecPct / 100))
    },
    {
      label: 'SALES OBJECTIONS',
      tag: 'Rejections',
      value: `${rejectPct}%`,
      subtext: 'Declined customer offers',
      valueColor: [217, 119, 6], // Amber
      topColor: [234, 88, 12],
      barRatio: Math.min(1, Math.max(0.08, rejectPct / 100))
    },
    {
      label: 'SCHEDULED CALLBACKS',
      tag: 'Follow-ups',
      value: `${apptPct}%`,
      subtext: `${analysis.appointmentInsights.totalAppointments} Bookings scheduled`,
      valueColor: [2, 132, 199], // Sky Blue
      topColor: [37, 99, 235],
      barRatio: Math.min(1, Math.max(0.08, apptPct / 100))
    },
    {
      label: 'RECORDS AUDITED',
      tag: 'Total Leads',
      value: analysis.totalRecordsAnalyzed.toLocaleString(),
      subtext: 'Customer records processed',
      valueColor: [15, 23, 42], // Slate-900
      topColor: [99, 102, 241],
      barRatio: 1
    },
    {
      label: 'REGIONAL COVERAGE',
      tag: 'Field Reach',
      value: `${analysis.branchesCovered.length} Hubs`,
      subtext: `${analysis.agentsCovered.length} Calling Agents active`,
      valueColor: [15, 23, 42], // Slate-900
      topColor: [71, 85, 105],
      barRatio: 1
    }
  ];

  kpiTiles.forEach((tile, index) => {
    const x = margin + index * (tileWidth + tileGap);
    const y = startY;

    // Card background: clean white
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, tileWidth, tileHeight, 2, 2, 'F');

    // Subtle slate border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.35);
    doc.roundedRect(x, y, tileWidth, tileHeight, 2, 2, 'S');

    // Delicate top hairline accent stripe
    doc.setFillColor(tile.topColor[0], tile.topColor[1], tile.topColor[2]);
    doc.roundedRect(x, y, tileWidth, 1.3, 0.6, 0.6, 'F');

    // Colored indicator dot
    doc.setFillColor(tile.topColor[0], tile.topColor[1], tile.topColor[2]);
    doc.circle(x + 4, y + 5.6, 0.85, 'F');

    // Concise, unboxed category label (left-aligned)
    doc.setFontSize(5.6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(tile.label, x + 6.4, y + 6.4);

    // Unboxed subtle right category tag (right-aligned, perfectly separated)
    doc.setFontSize(5.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(tile.topColor[0], tile.topColor[1], tile.topColor[2]);
    doc.text(tile.tag, x + tileWidth - 3.8, y + 6.4, { align: 'right' });

    // Prominent KPI Number (High visual impact)
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(tile.valueColor[0], tile.valueColor[1], tile.valueColor[2]);
    doc.text(tile.value, x + 3.8, y + 13.8);

    // Contextual Subtext
    doc.setFontSize(5.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(tile.subtext, x + 3.8, y + 18.2);

    // Micro-Progress Gauge Track (delicate 0.8mm bar at bottom)
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(x + 3.8, y + 20.2, tileWidth - 7.6, 0.8, 0.4, 0.4, 'F');

    // Micro-Progress Gauge Fill
    doc.setFillColor(tile.topColor[0], tile.topColor[1], tile.topColor[2]);
    doc.roundedRect(x + 3.8, y + 20.2, (tileWidth - 7.6) * tile.barRatio, 0.8, 0.4, 0.4, 'F');
  });

  // Executive Strategic Summary Callout Card
  let currentY = startY + tileHeight + 3.8;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 18.5, 1.8, 1.8, 'FD');

  // Red accent left border
  doc.setFillColor(220, 38, 38);
  doc.rect(margin, currentY, 2.5, 18.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  doc.text('EXECUTIVE STRATEGIC SUMMARY & CUSTOMER FEEDBACK AUDIT', margin + 6, currentY + 5.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.9);
  doc.setTextColor(51, 65, 85);
  const splitSummary = doc.splitTextToSize(analysis.executiveSummary, contentWidth - 12);
  doc.text(splitSummary.slice(0, 3), margin + 6, currentY + 10);

  currentY += 23;

  // Section 1 Header: Top Customer Complaints Table (With Originating Branches)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. FREQUENT CUSTOMER COMPLAINTS & ROOT-CAUSE REMEDIATION MATRIX', margin, currentY);

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Ranked by volume • Originating branches clearly identified • Customer feedback quotes in verbatim Af-Soomaali',
    margin,
    currentY + 3.6
  );

  const complaintsRows = analysis.topComplaints.map(c => {
    const branchesText = c.affectedBranches && c.affectedBranches.length > 0
      ? c.affectedBranches.join(', ')
      : 'All Hubs';
    const quoteText = c.customerQuotes && c.customerQuotes.length > 0
      ? c.customerQuotes.slice(0, 2).join(' | ')
      : 'No verbatim quote';

    return [
      c.issue,
      c.category,
      `${c.count} (${c.percentage}%)\n[${c.severity}]`,
      branchesText,
      quoteText,
      `ROOT CAUSE: ${c.rootCause}\nACTION: ${c.actionRecommendation}`
    ];
  });

  autoTable(doc, {
    startY: currentY + 5.5,
    head: [[
      'COMPLAINT ISSUE',
      'CATEGORY',
      'VOL / SEVERITY',
      'ORIGINATING BRANCHES',
      'CUSTOMER FEEDBACK QUOTES (AF-SOOMAALI AS IN EXCEL)',
      'ROOT CAUSE & ACTION REMEDIATION'
    ]],
    body: complaintsRows,
    theme: 'grid',
    margin: { top: 27, bottom: 16, left: margin, right: margin },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      cellPadding: 2.2,
      valign: 'middle'
    },
    bodyStyles: {
      fontSize: 6.6,
      textColor: [30, 41, 59],
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      valign: 'top'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 38 },
      1: { cellWidth: 22 },
      2: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      3: { cellWidth: 30, fontStyle: 'bold', textColor: [13, 148, 136] }, // Teal highlight for originating branches
      4: { cellWidth: 71, fontStyle: 'italic', textColor: [67, 56, 202] }, // Indigo for Somali quotes
      5: { cellWidth: 90, textColor: [15, 23, 42] }
    },
    didParseCell: (data) => {
      // Colorize severity badges
      if (data.section === 'body' && data.column.index === 2) {
        const text = String(data.cell.raw).toUpperCase();
        if (text.includes('CRITICAL') || text.includes('HIGH')) {
          data.cell.styles.textColor = [220, 38, 38];
        } else if (text.includes('MEDIUM')) {
          data.cell.styles.textColor = [217, 119, 6];
        } else {
          data.cell.styles.textColor = [16, 185, 129];
        }
      }
    }
  });

  // =========================================================================
  // PAGE 2: SUCCESS FEEDBACK (APPRECIATIONS) & SCHEDULED APPOINTMENTS
  // =========================================================================
  doc.addPage('a4', 'landscape');
  renderHeader('Customer Success Feedback, Appreciations & Scheduled Appointments');

  currentY = 27;

  // Section 2 Header: Customer Success Feedback
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. CUSTOMER SUCCESS FEEDBACK & POSITIVE SENTIMENT APPRECIATIONS', margin, currentY);

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Why customers joined and what they loved • Verbatim positive Af-Soomaali quotes from converted customer calls',
    margin,
    currentY + 3.6
  );

  const successRows = analysis.topAppreciations.map(a => {
    const branches = a.convertingBranches && a.convertingBranches.length > 0
      ? ` [Hubs: ${a.convertingBranches.slice(0, 3).join(', ')}]`
      : '';
    const quoteText = a.customerQuotes && a.customerQuotes.length > 0
      ? a.customerQuotes.slice(0, 3).join(' | ')
      : 'Customer appreciated fast processing';

    return [
      `${a.theme}${branches}`,
      `${a.count} (${a.percentage}%)`,
      quoteText,
      a.keyDriver
    ];
  });

  autoTable(doc, {
    startY: currentY + 5.5,
    head: [[
      'SUCCESS FEEDBACK THEME / STRENGTH',
      'SHARE (%)',
      'CONVERTED CUSTOMER QUOTES (AF-SOOMAALI AS IN EXCEL)',
      'UNDERLYING CONVERSION DRIVER & REPLICATION STRATEGY'
    ]],
    body: successRows,
    theme: 'grid',
    margin: { top: 27, bottom: 16, left: margin, right: margin },
    headStyles: {
      fillColor: [5, 150, 105], // emerald-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      cellPadding: 2.2,
      valign: 'middle'
    },
    bodyStyles: {
      fontSize: 6.7,
      textColor: [30, 41, 59],
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      valign: 'top'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 52 },
      1: { halign: 'center', cellWidth: 22, fontStyle: 'bold', textColor: [5, 150, 105] },
      2: { cellWidth: 95, fontStyle: 'italic', textColor: [51, 65, 85] },
      3: { cellWidth: 100, textColor: [15, 23, 42] }
    }
  });

  currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6.5 : currentY + 55;

  // Section 3: Scheduled Appointments & Callback Registry
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(
    `3. SCHEDULED APPOINTMENTS & CALLBACK REGISTRY (${analysis.appointmentInsights.totalAppointments} Booked • ${analysis.appointmentInsights.appointmentRate}% of Calls)`,
    margin,
    currentY
  );

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Callback commitments made by agents to prospects • ${analysis.appointmentInsights.actionableFollowupAdvice}`,
    margin,
    currentY + 3.6
  );

  const sampleAppts = (analysis.appointmentInsights.sampleAppointments || []).slice(0, 6);
  const apptRows = sampleAppts.length > 0 
    ? sampleAppts.map(s => [
        s.customerName,
        s.branch || 'Headquarters',
        s.agentName || 'Unassigned',
        s.appointmentTime || 'Agreed Callback Window',
        s.feedbackNote ? `"${s.feedbackNote}"` : 'Customer requested callback',
        s.status || 'In-progress'
      ])
    : [[
        'No Callbacks Booked',
        'All Branches',
        'Calling Team',
        'Immediate',
        'No follow-up appointments recorded yet in this scope',
        'Complete'
      ]];

  autoTable(doc, {
    startY: currentY + 5.5,
    head: [[
      'PROSPECT NAME',
      'BRANCH HUB',
      'ASSIGNED AGENT',
      'SCHEDULED APPOINTMENT / CALLBACK TIME',
      'CUSTOMER NOTE / REASON FOR CALLBACK (AF-SOOMAALI)',
      'STATUS'
    ]],
    body: apptRows,
    theme: 'grid',
    margin: { top: 27, bottom: 16, left: margin, right: margin },
    headStyles: {
      fillColor: [2, 132, 199], // sky-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      cellPadding: 2.2,
      valign: 'middle'
    },
    bodyStyles: {
      fontSize: 6.6,
      textColor: [30, 41, 59],
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      valign: 'top'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: 30 },
      2: { cellWidth: 36 },
      3: { cellWidth: 45, fontStyle: 'bold', textColor: [2, 132, 199] },
      4: { cellWidth: 92, fontStyle: 'italic', textColor: [51, 65, 85] },
      5: { halign: 'center', cellWidth: 26, fontStyle: 'bold' }
    }
  });

  // =========================================================================
  // PAGE 3: SALES REJECTIONS & OBJECTION-HANDLING MASTERY
  // =========================================================================
  doc.addPage('a4', 'landscape');
  renderHeader('Customer Rejection Feedback, Root Objections & Sales Rebuttal Scripts');

  currentY = 27;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('4. SALES REJECTION FEEDBACK & AGENT OBJECTION-HANDLING REBUTTALS', margin, currentY);

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Detailed root causes for declined leads • Verbatim Af-Soomaali objections • Practical counter-scripts for tele-sales reps',
    margin,
    currentY + 3.6
  );

  const rejectionRows = analysis.rejectionAnalysis.map(r => {
    const branches = r.affectedBranches && r.affectedBranches.length > 0
      ? r.affectedBranches.slice(0, 3).join(', ')
      : 'All Hubs';
    const quoteText = r.customerQuotes && r.customerQuotes.length > 0
      ? r.customerQuotes.slice(0, 2).join(' | ')
      : r.customerExplanation;

    return [
      r.reason,
      `${r.count} (${r.percentage}%)`,
      branches,
      quoteText,
      r.overcomingScript
    ];
  });

  autoTable(doc, {
    startY: currentY + 5.5,
    head: [[
      'CUSTOMER OBJECTION / REJECTION REASON',
      'SHARE (%)',
      'AFFECTED BRANCHES',
      'CUSTOMER OBJECTION QUOTES (AF-SOOMAALI AS IN EXCEL)',
      'RECOMMENDED OBJECTION-HANDLING REBUTTAL FOR AGENTS'
    ]],
    body: rejectionRows,
    theme: 'grid',
    margin: { top: 27, bottom: 16, left: margin, right: margin },
    headStyles: {
      fillColor: [234, 88, 12], // orange-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      cellPadding: 2.2,
      valign: 'middle'
    },
    bodyStyles: {
      fontSize: 6.7,
      textColor: [30, 41, 59],
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      valign: 'top'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 48 },
      1: { halign: 'center', cellWidth: 22, fontStyle: 'bold', textColor: [234, 88, 12] },
      2: { cellWidth: 28, fontStyle: 'bold', textColor: [13, 148, 136] },
      3: { cellWidth: 76, fontStyle: 'italic', textColor: [51, 65, 85] },
      4: { cellWidth: 95, textColor: [15, 118, 110], fontStyle: 'bold' }
    }
  });

  currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6.5 : currentY + 65;

  // Objection Handling Strategy Callout Card
  if (currentY < 185) {
    const boxHeight = 17;
    doc.setFillColor(255, 247, 237); // orange-50
    doc.setDrawColor(254, 215, 170); // orange-200
    doc.roundedRect(margin, currentY, contentWidth, boxHeight, 1.8, 1.8, 'FD');

    doc.setFillColor(234, 88, 12);
    doc.rect(margin, currentY, 2.5, boxHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(194, 65, 12);
    doc.text('COACHING FOCUS: TURNING SALES OBJECTIONS INTO ONBOARDED ACCOUNTS', margin + 5, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    const objAdvice = 'Instruct calling staff never to argue with customers who cite loyalty to competitor services (EVC/Zaad). Instead, train them to position MyCash as a secondary complementary service for business transactions, offering lower tariff tiers and nationwide reliability.';
    const splitObj = doc.splitTextToSize(objAdvice, contentWidth - 10);
    doc.text(splitObj.slice(0, 2), margin + 5, currentY + 9.5);
  }

  // =========================================================================
  // PAGE 4: REGIONAL BRANCH BENCHMARKS & STRATEGIC EXECUTIVE ROADMAP
  // =========================================================================
  doc.addPage('a4', 'landscape');
  renderHeader('Regional Branch Comparison & Strategic Executive Roadmap');

  currentY = 27;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('5. REGIONAL BRANCH COMPARISON & FIELD BOTTLENECK AUDIT', margin, currentY);

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Branch-level conversion velocity, dominant feedback/complaint notes, and operational bottlenecks',
    margin,
    currentY + 3.6
  );

  const branchRows = analysis.branchPerformances.map(b => [
    b.branchName,
    b.totalLeads.toLocaleString(),
    b.callsMade.toLocaleString(),
    (b.conversions || 0).toLocaleString(),
    `${b.successRate}%`,
    b.dominantComplaint,
    `${b.strengths} | Bottleneck: ${b.bottlenecks}`,
    b.managerialAdvice
  ]);

  autoTable(doc, {
    startY: currentY + 5.5,
    head: [[
      'BRANCH / REGIONAL HUB',
      'TOTAL LEADS',
      'CALLS',
      'CONVERSIONS',
      'CONV. RATE',
      'DOMINANT FEEDBACK / COMPLAINT',
      'FIELD STRENGTHS & BOTTLENECK',
      'MANAGERIAL COACHING TIP'
    ]],
    body: branchRows,
    theme: 'grid',
    margin: { top: 27, bottom: 16, left: margin, right: margin },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      cellPadding: 2.2,
      valign: 'middle'
    },
    bodyStyles: {
      fontSize: 6.6,
      textColor: [30, 41, 59],
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      valign: 'top'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 36 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'center', cellWidth: 18, fontStyle: 'bold', textColor: [5, 150, 105] },
      4: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      5: { cellWidth: 52 },
      6: { cellWidth: 52 },
      7: { cellWidth: 55, textColor: [15, 118, 110], fontStyle: 'bold' }
    }
  });

  currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6.5 : currentY + 65;

  // Section 6: Strategic Leadership Action Plan
  if (currentY < 185) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('6. STRATEGIC LEADERSHIP ACTION PLAN (RESOLVING ROOT CAUSES)', margin, currentY);

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Prioritized executive initiatives to eliminate customer friction and increase nationwide conversion',
      margin,
      currentY + 3.6
    );

    currentY += 5.2;

    analysis.strategicOvercomeAdvices.slice(0, 3).forEach((adv) => {
      const cardHeight = 13.5;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, currentY, contentWidth, cardHeight, 1.8, 1.8, 'FD');

      const isUrgent = adv.priority.toLowerCase().includes('high') || adv.priority.toLowerCase().includes('urgent') || adv.priority.toLowerCase().includes('immediate');
      doc.setFillColor(isUrgent ? 220 : 37, isUrgent ? 38 : 99, isUrgent ? 38 : 235);
      doc.rect(margin, currentY, 2.5, cardHeight, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(isUrgent ? 220 : 37, isUrgent ? 38 : 99, isUrgent ? 38 : 235);
      doc.text(`[${adv.priority.toUpperCase()}] ${adv.title}`, margin + 5, currentY + 4.4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.6);
      doc.setTextColor(51, 65, 85);
      const splitAdv = doc.splitTextToSize(
        `${adv.description}  •  Target Impact: ${adv.expectedImpact}`,
        contentWidth - 10
      );
      doc.text(splitAdv.slice(0, 2), margin + 5, currentY + 8.8);

      currentY += cardHeight + 2.4;
    });
  }

  // =========================================================================
  // PAGE 5: AGENT CALLING EVALUATION (ACCURATELY FETCHING ASSIGNED/TOTAL LEADS)
  // =========================================================================
  doc.addPage('a4', 'landscape');
  renderHeader('Agent Calling Evaluation & Personalized Objection Coaching');

  currentY = 27;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('7. INDIVIDUAL AGENT EVALUATION & PERSONALIZED OBJECTION-HANDLING COACHING', margin, currentY);

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Assigned leads, completed calls, conversions, customer sentiment patterns, and personalized 1-on-1 coaching',
    margin,
    currentY + 3.6
  );

  // Agent Rows accurately fetching totalAssigned, callsMade, conversions, rejections
  const agentRows = analysis.agentSummaries.map(a => [
    a.agentName,
    a.branch || 'Headquarters',
    a.totalAssigned.toLocaleString(),
    a.callsMade.toLocaleString(),
    a.conversions.toLocaleString(),
    (a.rejections || 0).toLocaleString(),
    `${a.conversionRate}%`,
    a.customerSentimentSummary,
    a.tailoredCoachingAdvice
  ]);

  autoTable(doc, {
    startY: currentY + 5.5,
    head: [[
      'AGENT NAME',
      'BRANCH',
      'ASSIGNED',
      'CALLED',
      'SUCCESS',
      'REJECTED',
      'CONV. RATE',
      'CUSTOMER SENTIMENT / FEEDBACK PATTERNS',
      'TAILORED OBJECTION-HANDLING COACHING ADVICE'
    ]],
    body: agentRows,
    theme: 'grid',
    margin: { top: 27, bottom: 16, left: margin, right: margin },
    headStyles: {
      fillColor: [185, 28, 28], // red-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      cellPadding: 2.2,
      valign: 'middle'
    },
    bodyStyles: {
      fontSize: 6.6,
      textColor: [30, 41, 59],
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      valign: 'top'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 34 },
      1: { cellWidth: 24 },
      2: { halign: 'center', cellWidth: 20, fontStyle: 'bold' }, // Total assigned accurately displayed
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 18, fontStyle: 'bold', textColor: [5, 150, 105] },
      5: { halign: 'center', cellWidth: 16, fontStyle: 'bold', textColor: [234, 88, 12] },
      6: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      7: { cellWidth: 51 },
      8: { cellWidth: 70, textColor: [15, 118, 110], fontStyle: 'bold' }
    }
  });

  // =========================================================================
  // MULTI-PASS ACCURATE FOOTER RENDERING (Page X of Y across all pages)
  // =========================================================================
  const totalPagesCount = doc.getNumberOfPages();
  for (let p = 1; p <= totalPagesCount; p++) {
    doc.setPage(p);
    renderFooter(p, totalPagesCount);
  }

  // Save the PDF file
  const fileName = `MyCash_Customer_Feedback_Intelligence_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
