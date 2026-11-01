import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  PROPOSAL_TIMELINE, 
  PROPOSAL_PRICING, 
  PROPOSAL_FEATURE_SCREENSHOTS 
} from '../data/proposalData';

/**
 * Generates an executive, publication-grade multi-page Commercial & Technical Proposal PDF
 * for the MyCash Tele-Sales Calling Portal & Customer Intelligence System.
 *
 * Formatted in Portrait A4 (210mm x 297mm).
 */
export function generateProposalPdf(): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // 180mm

  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate-900
  const accentRed: [number, number, number] = [220, 38, 38]; // Red-600
  const accentEmerald: [number, number, number] = [5, 150, 105]; // Emerald-600
  const textDark: [number, number, number] = [30, 41, 59]; // Slate-800
  const textMuted: [number, number, number] = [100, 116, 139]; // Slate-500

  const todayStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  // Helper for consistent headers on subsequent pages
  const renderHeaderFooter = (pageNumber: number, sectionTitle: string) => {
    // Header banner
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 16, 'F');

    doc.setFillColor(...accentRed);
    doc.rect(0, 16, pageWidth, 1.2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('MYCASH TELE-SALES CALLING PORTAL', margin, 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    doc.text(sectionTitle, pageWidth - margin, 10.5, { align: 'right' });

    // Footer banner
    doc.setFillColor(241, 245, 249);
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);
    doc.text('Commercial & Technical Proposal • Confidential Document for MyCash Bank Leadership', margin, pageHeight - 5);
    doc.text(`Page ${pageNumber} of 6`, pageWidth - margin, pageHeight - 5, { align: 'right' });
  };

  // =========================================================================
  // PAGE 1: COVER PAGE
  // =========================================================================
  // Hero Top Half Background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 160, 'F');

  // Decorative Accent Lines
  doc.setFillColor(...accentRed);
  doc.rect(0, 158, pageWidth, 3, 'F');

  doc.setFillColor(...accentEmerald);
  doc.rect(margin, 35, 45, 3, 'F');

  // Super-title
  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PROJECT PROPOSAL & TECHNICAL SPECIFICATION', margin, 46);

  // Main Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('MYCASH TELE-SALES', margin, 62);
  doc.text('CALLING PORTAL & INTELLIGENCE', margin, 73);

  // Subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Centralized Calling Management, Automated Deduplication, Outbound Dialer,', margin, 87);
  doc.text('WhatsApp Cloud API SMS Automation & Gemini 3.8 AI Analytics', margin, 94);

  // Key Pillars Badges on Cover
  const badges = ['Multi-Tier RBAC', 'Supabase Realtime Cloud', 'WhatsApp Cloud API', 'Gemini 3.8 AI'];
  let badgeX = margin;
  badges.forEach((b) => {
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(badgeX, 110, 38, 8, 1.5, 1.5, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(b, badgeX + 19, 115.5, { align: 'center' });
    badgeX += 42;
  });

  // Client & Document Info Block (Bottom Half)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...textDark);
  doc.text('PREPARED FOR:', margin, 185);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Executive Management & Tele-Sales Operations Team', margin, 192);
  doc.text('MyCash Mobile Money & Digital Banking Services', margin, 198);
  doc.text('Amal Express Group • Horn of Africa & Diaspora Banking', margin, 204);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DOCUMENT DETAILS:', margin + 100, 185);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Date: ${todayStr}`, margin + 100, 192);
  doc.text('Document Version: 2.4.0 (Production-Ready)', margin + 100, 198);
  doc.text('Classification: Commercial Proposal (Strictly Confidential)', margin + 100, 204);

  // Scope Summary Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, 225, contentWidth, 42, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryColor);
  doc.text('Executive Proposal Highlights & Inclusions:', margin + 6, 233);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...textDark);
  doc.text('• Complete Enterprise Features: Excel Ingestion, Fast Dialer, Appointments, WhatsApp SMS, AI Intelligence', margin + 6, 241);
  doc.text('• Implementation Schedule: 8-Week Phased Rollout across 27 Regional Branches and 60+ Calling Agents', margin + 6, 247);
  doc.text('• Transparent Commercial Pricing: Flexible Licensing, Monthly Infrastructure & WhatsApp API Cost Breakdown', margin + 6, 253);
  doc.text('• Ready for Immediate Deployment: Backend Supabase Edge Functions & Database Schemas Fully Prepared', margin + 6, 259);

  // =========================================================================
  // PAGE 2: EXECUTIVE SUMMARY & CORE FEATURES BREAKDOWN
  // =========================================================================
  doc.addPage();
  renderHeaderFooter(2, '1. Executive Summary & Features');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('1. Executive Summary & Strategic Objectives', margin, 27);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...textDark);
  const execSummary = 
    'The MyCash Tele-Sales Calling Portal is a modern, enterprise-grade tele-sales operations and customer engagement platform built specifically for financial institutions and mobile money ecosystems. It transforms previously fragmented spreadsheet calling workflows into a centralized, auditable, high-velocity outbound calling engine.';
  const splitExec = doc.splitTextToSize(execSummary, contentWidth);
  doc.text(splitExec, margin, 34);

  // Business Problems Solved Table
  autoTable(doc, {
    startY: 46,
    head: [['Legacy Operational Challenge', 'MyCash Portal Solution & Business Impact']],
    body: [
      ['Disparate Excel spreadsheets managed independently by branches', 'Single centralized database with instant multi-branch rollup & cloud sync'],
      ['Customers receiving duplicate calls from multiple agents', 'Strict deduplication algorithm & unique call state rules preventing lead fatigue'],
      ['No visibility into agent calling cadence and conversion rates', 'Live supervisor & HQ dashboard tracking conversion velocity, targets & KPIs'],
      ['Loss of customer feedback notes in local dialects (Af-Soomaali)', 'Gemini 3.8 AI sentiment engine translating and categorizing feedback into English'],
      ['Manual, slow SMS follow-ups for dormant customers (>90 days)', 'Automated WhatsApp Cloud API SMS hub triggered by Excel status or dormancy']
    ],
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 3, textColor: textDark },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { cellWidth: 110 }
    }
  });

  // Feature Matrix
  const afterProblemsY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text('2. Core System Features & Capabilities Matrix', margin, afterProblemsY);

  autoTable(doc, {
    startY: afterProblemsY + 4,
    head: [['Module', 'Key Capabilities & Features Included in System']],
    body: [
      ['Multi-Tier RBAC Security', 'Granular permissions across HQ Admin, Branch Supervisor, and Calling Agent tiers. Role lockdown on sensitive customer columns (Customer Name, Phone Number, Area).'],
      ['Excel Ingestion Engine', 'High-speed SheetJS parser supporting custom banking columns: Reg. Date, Total Transactions, First Trans. Date, Last Trans. Date, and Dormant Days.'],
      ['Outbound Focus Calling Mode', 'Speed-dialer ergonomics allowing agents to dial, log call outcomes (Success, In-progress, No Answer, Rejected), capture notes, and book appointments without page reloads.'],
      ['Appointments & Callbacks', 'Upcoming and previous scheduled callback queues with supervisor reassignment tools for balanced agent workload distribution.'],
      ['WhatsApp Cloud API SMS Hub', 'Segmented customer broadcast engine targeting customers based on Excel call status or >90 days dormancy with personalized variables and live preview.'],
      ['Gemini 3.8 AI Intelligence', 'Automated natural language processing converting verbatim Somali notes into executive English reports with complaint themes, objection handling scripts, and coaching.'],
      ['Supabase Cloud Realtime DB', 'PostgreSQL relational database with Row Level Security (RLS), real-time pub/sub synchronization, and immutable activity audit logging.']
    ],
    theme: 'grid',
    headStyles: { fillColor: accentEmerald, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 7.8, cellPadding: 2.6, textColor: textDark },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 130 }
    }
  });

  // =========================================================================
  // PAGE 3: FEATURE SCREENSHOTS & USER INTERFACE WALKTHROUGH
  // =========================================================================
  doc.addPage();
  renderHeaderFooter(3, '2. Feature Screenshots & UI Mockups');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('3. Feature Screenshots & Visual UI Walkthrough', margin, 27);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...textDark);
  doc.text('The interface has been engineered with zero-pill visual discipline, high information density, and rapid keyboard navigation.', margin, 33);

  let currentY = 40;
  PROPOSAL_FEATURE_SCREENSHOTS.forEach((feat, index) => {
    // Card Container
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, contentWidth, 53, 2, 2, 'FD');

    // Title Tag
    doc.setFillColor(...(index % 2 === 0 ? primaryColor : accentEmerald));
    doc.roundedRect(margin + 4, currentY + 3.5, 45, 5.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(feat.module.toUpperCase(), margin + 26.5, currentY + 7.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...primaryColor);
    doc.text(feat.title, margin + 54, currentY + 8);

    // Description
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(...textDark);
    const splitDesc = doc.splitTextToSize(feat.description, contentWidth - 8);
    doc.text(splitDesc, margin + 4, currentY + 14);

    // Visual Mockup Box
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin + 4, currentY + 20, contentWidth - 8, 28, 1.5, 1.5, 'F');

    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(52, 211, 153); // Emerald-400
    const lines = feat.mockupVisual.split('\n');
    lines.forEach((line, lIdx) => {
      doc.text(line, margin + 6, currentY + 25 + lIdx * 4);
    });

    currentY += 58;
  });

  // =========================================================================
  // PAGE 4: PROJECT ROLLOUT TIMELINE & PHASED MILESTONES
  // =========================================================================
  doc.addPage();
  renderHeaderFooter(4, '3. Implementation Rollout Timeline');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('4. Project Implementation Timeline & Phased Milestones', margin, 27);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...textDark);
  doc.text('The turnkey delivery follows an agile 8-week production schedule designed to ensure operational stability at scale.', margin, 33);

  // Timeline Phase Table
  const timelineRows = PROPOSAL_TIMELINE.map((p) => [
    `${p.phase}\n(${p.duration})`,
    p.title,
    p.milestones.map((m) => `• ${m}`).join('\n'),
    p.deliverables.map((d) => `✓ ${d}`).join('\n')
  ]);

  autoTable(doc, {
    startY: 40,
    head: [['Phase & Duration', 'Strategic Objective', 'Key Activities & Milestones', 'Deliverables & Sign-Off']],
    body: timelineRows,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 7.5, cellPadding: 3.5, textColor: textDark, valign: 'top' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32, fillColor: [248, 250, 252] },
      1: { fontStyle: 'bold', cellWidth: 42 },
      2: { cellWidth: 60 },
      3: { cellWidth: 46 }
    }
  });

  const timelineEnd = (doc as any).lastAutoTable.finalY + 8;
  // Risk & Mitigation Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, timelineEnd, contentWidth, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text('Deployment Readiness & Risk Mitigation Assurance:', margin + 6, timelineEnd + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textDark);
  doc.text('• Zero Operational Downtime: Current Excel operations continue in parallel until Phase 3 pilot completion.', margin + 6, timelineEnd + 15);
  doc.text('• Data Privacy & Sovereignty: All customer credentials, phone numbers, and notes remain encrypted in Supabase.', margin + 6, timelineEnd + 21);
  doc.text('• Training Materials: Recorded Somali & English video walkthroughs for both branch supervisors and agents.', margin + 6, timelineEnd + 27);
  doc.text('• Fallback Resiliency: Automated offline analytical engine if internet or external AI APIs experience latency.', margin + 6, timelineEnd + 33);

  // =========================================================================
  // PAGE 5: COMMERCIAL INVESTMENT & PRICING SCHEDULE
  // =========================================================================
  doc.addPage();
  renderHeaderFooter(5, '4. Pricing & Commercial Investment');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('5. Commercial Investment & Pricing Models', margin, 27);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...textDark);
  doc.text('Transparent pricing structure providing predictable operational budgeting with no hidden per-seat markups.', margin, 33);

  // Development Tiers Table
  const tierRows = PROPOSAL_PRICING.developmentTiers.map((t) => [
    `${t.name}\n[${t.badge}]`,
    t.targetAudience,
    t.features.map((f) => `• ${f}`).join('\n'),
    t.oneTimeSetup,
    t.monthlySupport
  ]);

  autoTable(doc, {
    startY: 40,
    head: [['Package Tier', 'Target Scale', 'Included Capabilities', 'One-Time Setup', 'Monthly Support']],
    body: tierRows,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 7.5, cellPadding: 3.5, textColor: textDark, valign: 'top' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 36, fillColor: [248, 250, 252] },
      1: { cellWidth: 38 },
      2: { cellWidth: 62 },
      3: { fontStyle: 'bold', cellWidth: 22, textColor: accentRed },
      4: { fontStyle: 'bold', cellWidth: 22, textColor: accentEmerald }
    }
  });

  const tiersEnd = (doc as any).lastAutoTable.finalY + 8;

  // Infrastructure & Operational Costs
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text('Operational Cloud Infrastructure & Third-Party API Pass-Through Costs', margin, tiersEnd);

  const infraRows = PROPOSAL_PRICING.infrastructureCosts.map((i) => [
    i.item,
    i.cost,
    i.frequency,
    i.notes
  ]);

  autoTable(doc, {
    startY: tiersEnd + 4,
    head: [['Infrastructure Component', 'Estimated Cost', 'Frequency', 'Technical Specifications & Value']],
    body: infraRows,
    theme: 'grid',
    headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.8, textColor: textDark },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55 },
      1: { fontStyle: 'bold', cellWidth: 35, textColor: accentEmerald },
      2: { cellWidth: 25 },
      3: { cellWidth: 65 }
    }
  });

  const infraEnd = (doc as any).lastAutoTable.finalY + 6;

  // WhatsApp Messaging Costs
  const waRows = PROPOSAL_PRICING.whatsAppApiCosts.map((w) => [w.item, w.cost, w.notes]);

  autoTable(doc, {
    startY: infraEnd,
    head: [['WhatsApp Cloud API Category', 'Meta Direct Rate', 'Billing & Optimization Strategy']],
    body: waRows,
    theme: 'grid',
    headStyles: { fillColor: accentEmerald, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.8, textColor: textDark },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 65 },
      1: { fontStyle: 'bold', cellWidth: 45, textColor: primaryColor },
      2: { cellWidth: 70 }
    }
  });

  // =========================================================================
  // PAGE 6: SERVICE LEVEL AGREEMENT (SLA), COMPLIANCE & SIGN-OFF
  // =========================================================================
  doc.addPage();
  renderHeaderFooter(6, '5. SLA, Security & Sign-Off');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('6. SLA, Security Compliance & Acceptance Sign-Off', margin, 27);

  // SLA Terms Table
  autoTable(doc, {
    startY: 34,
    head: [['Severity Level', 'Description', 'Initial Response Time', 'Resolution Target']],
    body: [
      ['Severity 1 (Critical)', 'Total portal outage or inability to make outbound calls / save records', '< 1 Hour', '< 4 Hours'],
      ['Severity 2 (High)', 'Major feature failure (e.g. WhatsApp broadcast fails or Excel import blocked)', '< 2 Hours', '< 8 Hours'],
      ['Severity 3 (Medium)', 'Minor system glitch or non-critical cosmetic issue', '< 6 Hours', '< 24 Hours'],
      ['Severity 4 (Low)', 'General inquiry, user role adjustments, or template adjustments', '< 12 Hours', '< 48 Hours']
    ],
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 7.8, cellPadding: 3, textColor: textDark },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: 70 },
      2: { fontStyle: 'bold', cellWidth: 35 },
      3: { fontStyle: 'bold', cellWidth: 35, textColor: accentEmerald }
    }
  });

  const signoffY = (doc as any).lastAutoTable.finalY + 12;

  // Next Steps Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, signoffY, contentWidth, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryColor);
  doc.text('Immediate Next Steps to Commence Deployment:', margin + 6, signoffY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(...textDark);
  doc.text('1. Formal sign-off on the selected package tier (Fintech Enterprise Tier recommended).', margin + 6, signoffY + 15);
  doc.text('2. Provisioning of WhatsApp Business Cloud API permanent token and phone number ID.', margin + 6, signoffY + 21);
  doc.text('3. Initial roster upload of branch supervisors and pilot calling agents.', margin + 6, signoffY + 27);
  doc.text('4. Kick-off orientation session with regional branch managers (Week 1 of Timeline).', margin + 6, signoffY + 33);

  // Signatures Area
  const sigBoxY = signoffY + 46;
  doc.setDrawColor(203, 213, 225);

  // Left Signature (Client)
  doc.line(margin + 5, sigBoxY + 25, margin + 80, sigBoxY + 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text('FOR: MyCash Bank / Amal Express Group', margin + 5, sigBoxY + 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text('Authorized Executive Signature & Date', margin + 5, sigBoxY + 35);

  // Right Signature (Vendor)
  doc.line(margin + 100, sigBoxY + 25, margin + 175, sigBoxY + 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text('FOR: Tele-Sales Solutions Engineering Team', margin + 100, sigBoxY + 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text('Principal Systems Architect & Lead Engineer', margin + 100, sigBoxY + 35);

  // Save the PDF
  const filename = `MYCASH_TELE_SALES_PORTAL_COMMERCIAL_PROPOSAL_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
