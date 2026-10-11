import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AiAnalysisResult } from '../lib/gemini';
import { User } from '../types';

/**
 * Generates an executive, beautifully formatted multi-page PDF report
 * written in English analyzing customer feedbacks, complaints,
 * appreciations, rejections, branch dynamics, and agent coaching.
 *
 * Formatted in Landscape A4 to match the official portal report standard
 * with executive dark banner, red accent line, KPI cards, and autoTable styling.
 */
export function generateAiIntelligencePdf(
  analysis: AiAnalysisResult,
  currentUser: User,
  selectedScopeDescription: string
): void {
  // Landscape A4: 297mm width x 210mm height (matching portal export standard)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 269mm
  const totalPages = 4;

  const timestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const isHQAdmin = currentUser.role === 'HQ_ADMIN';
  const scopeTitle = isHQAdmin ? 'Global Enterprise HQ' : `${currentUser.branch || 'Branch'} Hub`;
  const cleanScope = selectedScopeDescription.length > 40
    ? selectedScopeDescription.slice(0, 37) + '...'
    : selectedScopeDescription;

  // =========================================================================
  // STANDARD EXECUTIVE HEADER (Identical to Portal's Official Report Design)
  // =========================================================================
  const renderHeader = (pageNumber: number, sectionSubtitle: string) => {
    // Top banner background (slate-900)
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 22, 'F');

    // Red accent line (red-600)
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 22, pageWidth, 1.5, 'F');

    // Main Brand Title (Top line)
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.text('MYCASH TELE-SALES', margin, 9.5);

    // AI Intelligence tag badge next to brand title
    doc.setFillColor(220, 38, 38);
    doc.roundedRect(margin + 49, 5.2, 45, 5, 0.8, 0.8, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('AI INTELLIGENCE REPORT', margin + 51, 8.8);

    // Subtitle / Slogan (Placed directly UNDER the Main Title)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text(sectionSubtitle, margin, 16.5);

    // Metadata on right side (right-aligned to margin, strictly separated)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Generated: ${timestamp}`, pageWidth - margin, 7.5, { align: 'right' });
    doc.text(`Scope: ${cleanScope}  |  User: ${currentUser.name} (${currentUser.role})`, pageWidth - margin, 12.5, { align: 'right' });
    doc.text('Report: AI Intelligence & Customer Feedback Analytics', pageWidth - margin, 17.5, { align: 'right' });
  };

  // =========================================================================
  // STANDARD EXECUTIVE FOOTER (Identical to Portal's Official Report Design)
  // =========================================================================
  const renderFooter = (pageNumber: number) => {
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.4);
    doc.line(margin, 201, pageWidth - margin, 201);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(
      'CONFIDENTIAL - MYCASH TELE-SALES MANAGEMENT INFORMATION SYSTEM  •  AI INTELLIGENCE & FEEDBACK ANALYTICS',
      margin,
      206
    );

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, 206, { align: 'right' });
  };

  // =========================================================================
  // PAGE 1: EXECUTIVE KPI SUMMARY & TOP COMPLAINTS ANALYSIS
  // =========================================================================
  renderHeader(1, 'Executive KPI Overview & Customer Feedback Breakdown');

  // Draw 6 KPI Tiles Across Top (width 269mm total)
  const startY = 27;
  const tileWidth = 42.5;
  const tileHeight = 21;
  const tileGap = 2.8;

  interface TileData {
    label: string;
    value: string;
    subtext: string;
    topColor: [number, number, number];
    badgeText?: string;
  }

  const kpiTiles: TileData[] = [
    {
      label: 'COMPLAINTS RATE',
      value: `${analysis.feedbackBreakdown.complaintsPercent}%`,
      subtext: 'Friction points identified',
      topColor: [220, 38, 38], // Red
      badgeText: 'Friction'
    },
    {
      label: 'APPRECIATION RATE',
      value: `${analysis.feedbackBreakdown.appreciationsPercent}%`,
      subtext: 'Praise & positive sentiment',
      topColor: [16, 185, 129], // Emerald
      badgeText: 'Positive'
    },
    {
      label: 'REJECTION OBJECTIONS',
      value: `${analysis.feedbackBreakdown.rejectionsPercent}%`,
      subtext: 'Declined sales objections',
      topColor: [234, 88, 12], // Orange
      badgeText: 'Objections'
    },
    {
      label: 'APPOINTMENTS / INQUIRIES',
      value: `${analysis.feedbackBreakdown.inquiriesAndFollowupsPercent}%`,
      subtext: `${analysis.appointmentInsights.totalAppointments} Callbacks scheduled`,
      topColor: [37, 99, 235], // Blue
      badgeText: 'Follow-ups'
    },
    {
      label: 'TOTAL RECORDS AUDITED',
      value: analysis.totalRecordsAnalyzed.toLocaleString(),
      subtext: 'Feedback notes examined',
      topColor: [99, 102, 241], // Indigo
      badgeText: 'Audited'
    },
    {
      label: 'FIELD COVERAGE',
      value: `${analysis.branchesCovered.length} Hubs`,
      subtext: `${analysis.agentsCovered.length} Calling Agents active`,
      topColor: [71, 85, 105], // Slate
      badgeText: 'Coverage'
    }
  ];

  kpiTiles.forEach((tile, index) => {
    const x = margin + index * (tileWidth + tileGap);
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
    doc.text(tile.label, x + 3, y + 5.6);

    // Tile value
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(tile.value, x + 3, y + 13.5);

    // Subtext
    doc.setFontSize(6.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(tile.subtext, x + 3, y + 18);

    // Optional badge pill
    if (tile.badgeText) {
      doc.setFillColor(tile.topColor[0], tile.topColor[1], tile.topColor[2]);
      doc.roundedRect(x + tileWidth - 14, y + 3.2, 11.5, 4.2, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(5.2);
      doc.setFont('helvetica', 'bold');
      doc.text(tile.badgeText, x + tileWidth - 8.2, y + 6.2, { align: 'center' });
    }
  });

  // Executive Summary Callout Card
  let currentY = startY + tileHeight + 4;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, currentY, contentWidth, 20, 2, 2, 'FD');

  // Red accent left border
  doc.setFillColor(220, 38, 38);
  doc.rect(margin, currentY, 2.5, 20, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('EXECUTIVE STRATEGIC SUMMARY & CUSTOMER FEEDBACK AUDIT', margin + 6, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(51, 65, 85); // slate-700
  const splitSummary = doc.splitTextToSize(analysis.executiveSummary, contentWidth - 12);
  doc.text(splitSummary.slice(0, 3), margin + 6, currentY + 10.5);

  currentY += 24.5;

  // Section 1 Header: Top Customer Complaints Table
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. MOST FREQUENT CUSTOMER COMPLAINTS & ROOT-CAUSE REMEDIATION MATRIX', margin, currentY);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Ranked by frequency and operational severity • Cross-referenced against original customer feedback notes in Af-Soomaali',
    margin,
    currentY + 3.8
  );

  const complaintsRows = analysis.topComplaints.map(c => [
    c.issue,
    c.category,
    `${c.count} (${c.percentage}%)`,
    c.severity.toUpperCase(),
    c.customerQuotes.join(' | '),
    c.rootCause,
    c.actionRecommendation
  ]);

  autoTable(doc, {
    startY: currentY + 5.5,
    head: [[
      'COMPLAINT ISSUE',
      'CATEGORY',
      'VOLUME (%)',
      'SEVERITY',
      'CUSTOMER FEEDBACK QUOTES (AF-SOOMAALI AS IN EXCEL)',
      'ROOT CAUSE',
      'ACTION RECOMMENDATION'
    ]],
    body: complaintsRows,
    theme: 'grid',
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      cellPadding: 2.2,
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
      0: { fontStyle: 'bold', cellWidth: 38 },
      1: { cellWidth: 24 },
      2: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      3: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
      4: { cellWidth: 65, fontStyle: 'italic', textColor: [67, 56, 202] },
      5: { cellWidth: 54 },
      6: { cellWidth: 54, textColor: [15, 118, 110], fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      // Color severity badges
      if (data.section === 'body' && data.column.index === 3) {
        const text = String(data.cell.raw).toUpperCase();
        if (text.includes('HIGH') || text.includes('CRITICAL')) {
          data.cell.styles.textColor = [220, 38, 38];
        } else if (text.includes('MEDIUM')) {
          data.cell.styles.textColor = [217, 119, 6];
        } else {
          data.cell.styles.textColor = [16, 185, 129];
        }
      }
    }
  });

  renderFooter(1);

  // =========================================================================
  // PAGE 2: APPRECIATIONS, REJECTION OBJECTIONS & APPOINTMENTS
  // =========================================================================
  doc.addPage('a4', 'landscape');
  renderHeader(2, 'Customer Appreciations, Rejection Objections & Appointments');

  currentY = 27;

  // Section 2: Appreciations
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. CUSTOMER APPRECIATIONS & WHAT CLIENTS LOVE (AF-SOOMAALI FEEDBACK)', margin, currentY);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Identified product strengths and positive customer experiences to replicate across sales teams',
    margin,
    currentY + 3.8
  );

  const apprecRows = analysis.topAppreciations.map(a => [
    a.theme,
    `${a.count} (${a.percentage}%)`,
    a.customerQuotes.join(' | '),
    a.keyDriver
  ]);

  autoTable(doc, {
    startY: currentY + 5.5,
    head: [[
      'APPRECIATION THEME',
      'SHARE (%)',
      'CUSTOMER POSITIVE FEEDBACK QUOTES (AF-SOOMAALI AS IN EXCEL)',
      'UNDERLYING SUCCESS DRIVER & BEST PRACTICE'
    ]],
    body: apprecRows,
    theme: 'grid',
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [5, 150, 105], // emerald-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      cellPadding: 2.2
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
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'center', cellWidth: 20, fontStyle: 'bold', textColor: [5, 150, 105] },
      2: { cellWidth: 110, fontStyle: 'italic', textColor: [51, 65, 85] },
      3: { cellWidth: 89, textColor: [15, 23, 42] }
    }
  });

  currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6.5 : currentY + 50;

  // Section 3: Rejections & Objections
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('3. SALES REJECTIONS & CUSTOMER OBJECTION-HANDLING SCRIPTS', margin, currentY);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Why customers declined or expressed hesitation with proven objection-handling rebuttals for tele-sales reps',
    margin,
    currentY + 3.8
  );

  const rejectionRows = analysis.rejectionAnalysis.map(r => [
    r.reason,
    `${r.count} (${r.percentage}%)`,
    r.customerQuotes && r.customerQuotes.length > 0 ? r.customerQuotes.join(' | ') : r.customerExplanation,
    r.overcomingScript
  ]);

  autoTable(doc, {
    startY: currentY + 5.5,
    head: [[
      'CUSTOMER OBJECTION / DECLINE REASON',
      'SHARE (%)',
      'CUSTOMER FEEDBACK QUOTES (AF-SOOMAALI AS IN EXCEL)',
      'RECOMMENDED OBJECTION-HANDLING SCRIPT FOR AGENTS'
    ]],
    body: rejectionRows,
    theme: 'grid',
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [234, 88, 12], // orange-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      cellPadding: 2.2
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
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'center', cellWidth: 20, fontStyle: 'bold', textColor: [234, 88, 12] },
      2: { cellWidth: 95, fontStyle: 'italic', textColor: [51, 65, 85] },
      3: { cellWidth: 104, textColor: [15, 118, 110], fontStyle: 'bold' }
    }
  });

  currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 5 : currentY + 45;

  // Section 4: Scheduled Appointments Card (if space permits)
  if (currentY < 185) {
    const boxHeight = 15;
    doc.setFillColor(240, 249, 255); // sky-50
    doc.setDrawColor(186, 230, 253); // sky-200
    doc.roundedRect(margin, currentY, contentWidth, boxHeight, 2, 2, 'FD');

    // Sky left stripe
    doc.setFillColor(2, 132, 199);
    doc.rect(margin, currentY, 2.5, boxHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(3, 105, 161);
    doc.text(
      `4. SCHEDULED APPOINTMENTS & CALLBACK ADHERENCE (${analysis.appointmentInsights.totalAppointments} Booked • ${analysis.appointmentInsights.appointmentRate}% of Calls)`,
      margin + 5,
      currentY + 4.8
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    const obsText = `Key Observations: ${analysis.appointmentInsights.keyObservations}  |  Adherence Guidance: ${analysis.appointmentInsights.actionableFollowupAdvice}`;
    const splitObs = doc.splitTextToSize(obsText, contentWidth - 10);
    doc.text(splitObs.slice(0, 2), margin + 5, currentY + 9.5);
  }

  renderFooter(2);

  // =========================================================================
  // PAGE 3: REGIONAL BRANCH PERFORMANCE & STRATEGIC LEADERSHIP ROADMAP
  // =========================================================================
  doc.addPage('a4', 'landscape');
  renderHeader(3, 'Regional Branch Dynamics & Strategic Action Plan');

  currentY = 27;

  // Section 5: Regional Branch Comparison
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('5. REGIONAL BRANCH COMPARISON & FIELD BOTTLENECK AUDIT', margin, currentY);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Branch-level conversion velocity, dominant friction points, and field managerial coaching focus',
    margin,
    currentY + 3.8
  );

  const branchRows = analysis.branchPerformances.map(b => [
    b.branchName,
    b.totalLeads.toLocaleString(),
    b.callsMade.toLocaleString(),
    `${b.successRate}%`,
    b.dominantComplaint,
    b.strengths,
    b.bottlenecks,
    b.managerialAdvice
  ]);

  autoTable(doc, {
    startY: currentY + 5.5,
    head: [[
      'BRANCH / HUB',
      'TOTAL LEADS',
      'CALLS',
      'CONV. RATE',
      'DOMINANT FEEDBACK / COMPLAINT',
      'OBSERVED STRENGTHS',
      'FIELD BOTTLENECKS',
      'MANAGERIAL COACHING TIP'
    ]],
    body: branchRows,
    theme: 'grid',
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      cellPadding: 2.2
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
      0: { fontStyle: 'bold', cellWidth: 34 },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'center', cellWidth: 18, fontStyle: 'bold', textColor: [5, 150, 105] },
      4: { cellWidth: 46 },
      5: { cellWidth: 44 },
      6: { cellWidth: 44 },
      7: { cellWidth: 49, textColor: [15, 118, 110], fontStyle: 'bold' }
    }
  });

  currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6.5 : currentY + 65;

  // Section 6: Strategic Leadership Action Plan
  if (currentY < 185) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('6. STRATEGIC LEADERSHIP ACTION PLAN (RESOLVING ROOT CAUSES)', margin, currentY);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Prioritized executive initiatives to eliminate customer friction and increase nationwide conversion',
      margin,
      currentY + 3.8
    );

    currentY += 5.5;

    analysis.strategicOvercomeAdvices.slice(0, 3).forEach((adv) => {
      const cardHeight = 14;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, currentY, contentWidth, cardHeight, 1.8, 1.8, 'FD');

      // Priority indicator color
      const isUrgent = adv.priority.toLowerCase().includes('high') || adv.priority.toLowerCase().includes('urgent');
      doc.setFillColor(isUrgent ? 220 : 59, isUrgent ? 38 : 130, isUrgent ? 38 : 246);
      doc.rect(margin, currentY, 2.5, cardHeight, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(isUrgent ? 220 : 37, isUrgent ? 38 : 99, isUrgent ? 38 : 235);
      doc.text(`[${adv.priority.toUpperCase()}] ${adv.title}`, margin + 5, currentY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(51, 65, 85);
      const splitAdv = doc.splitTextToSize(
        `${adv.description}  •  Target Impact: ${adv.expectedImpact}`,
        contentWidth - 10
      );
      doc.text(splitAdv.slice(0, 2), margin + 5, currentY + 9);

      currentY += cardHeight + 2.5;
    });
  }

  renderFooter(3);

  // =========================================================================
  // PAGE 4: INDIVIDUAL AGENT PERFORMANCE & OBJECTION COACHING
  // =========================================================================
  doc.addPage('a4', 'landscape');
  renderHeader(4, 'Agent Calling Evaluation & Personalized Coaching');

  currentY = 27;

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('7. INDIVIDUAL AGENT EVALUATION & PERSONALIZED OBJECTION-HANDLING COACHING', margin, currentY);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Per-agent metrics, encountered customer feedback patterns, and tailored 1-on-1 coaching advice',
    margin,
    currentY + 3.8
  );

  const agentRows = analysis.agentSummaries.map(a => [
    a.agentName,
    a.branch,
    a.totalAssigned.toLocaleString(),
    a.callsMade.toLocaleString(),
    a.conversions.toLocaleString(),
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
      'CONVERSIONS',
      'CONV. RATE',
      'CUSTOMER SENTIMENT / FEEDBACK ENCOUNTERED',
      'TAILORED OBJECTION-HANDLING COACHING ADVICE'
    ]],
    body: agentRows,
    theme: 'grid',
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [185, 28, 28], // red-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      cellPadding: 2.2
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
      0: { fontStyle: 'bold', cellWidth: 34 },
      1: { cellWidth: 26 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 18, fontStyle: 'bold', textColor: [5, 150, 105] },
      6: { cellWidth: 54 },
      7: { cellWidth: 87, textColor: [15, 118, 110], fontStyle: 'bold' }
    }
  });

  renderFooter(4);

  // Save the PDF file
  const fileName = `MyCash_Customer_Feedback_Intelligence_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
