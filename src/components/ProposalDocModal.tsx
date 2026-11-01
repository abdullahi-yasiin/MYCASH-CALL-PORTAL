import React, { useState } from 'react';
import { 
  FileText, 
  X, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  Calendar, 
  DollarSign, 
  Layers, 
  ShieldCheck, 
  ExternalLink,
  Sparkles,
  PhoneCall,
  MessageSquare,
  BarChart3,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { 
  PROPOSAL_TIMELINE, 
  PROPOSAL_PRICING, 
  PROPOSAL_FEATURE_SCREENSHOTS 
} from '../data/proposalData';
import { generateProposalPdf } from '../utils/proposalPdfExport';

interface ProposalDocModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProposalDocModal: React.FC<ProposalDocModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'FEATURES' | 'TIMELINE' | 'PRICING' | 'SLA'>('OVERVIEW');
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    setIsExporting(true);
    try {
      generateProposalPdf();
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const text = `MYCASH TELE-SALES CALLING PORTAL - PROJECT PROPOSAL & SPECIFICATION
Client: MyCash Mobile Money & Digital Banking Services (Amal Express Group)
Scope: Centralized Tele-Sales Operations, Fast Dialer, WhatsApp SMS Automation, Gemini 3.8 AI Analytics, and Supabase Real-time Cloud DB

1. IMPLEMENTATION TIMELINE:
- Phase 1 (Weeks 1-2): Requirements Alignment, Supabase DB Setup & RLS
- Phase 2 (Weeks 3-4): Core Tele-Sales & Multi-Branch Pilot Deployment (Mogadishu, Hargeisa, Garowe)
- Phase 3 (Weeks 5-6): Gemini 3.8 AI Bilingual Sentiment & WhatsApp Cloud API SMS Hub
- Phase 4 (Weeks 7-8): Enterprise Network Rollout across 27 Regional Branches, 60+ Calling Agents, Staff Training

2. PRICING TIERS:
- Standard Portal: $3,800 USD Setup | $350 USD/mo Support
- Fintech Enterprise Tier (Recommended): $6,500 USD Setup | $650 USD/mo Support (Full 27-branch network, AI, WhatsApp & SLA)
- Full Source Ownership & Custom API: $11,500 USD Setup | $950 USD/mo Support (100% Code ownership, Core Banking APIs)

3. PASS-THROUGH CLOUD COSTS:
- Supabase Cloud Pro: $25 USD/mo
- Netlify Edge Hosting: $19 USD/mo
- Meta WhatsApp Business API: 1,000 free service convs/mo; ~$0.025-$0.038 per marketing broadcast
- Gemini AI Token Quota: ~$10-$25/mo`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 md:p-6 overflow-hidden">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-gradient-to-br from-red-600 to-rose-700 text-white rounded-xl shadow-md shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-white text-sm sm:text-base tracking-tight truncate">
                  Commercial & Technical Proposal Document
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/20 text-red-300 border border-red-500/40">
                  Ready to Sign
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  6-Page Multi-Section PDF
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Prepared for MyCash Bank Leadership • Timeline, Features, Pricing & Architecture
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleCopySummary}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Copy Proposal Executive Summary to Clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy Summary'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Print via Browser"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Print</span>
            </button>

            <button
              id="btn-download-proposal-pdf"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer border border-red-500/40"
              title="Download High-Resolution 6-Page PDF Proposal Document"
            >
              <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'Generating PDF...' : 'Download PDF (.pdf)'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1 cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 bg-slate-900 border-b border-slate-800 flex items-center gap-1 sm:gap-2 overflow-x-auto shrink-0 scrollbar-none py-2">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'OVERVIEW' 
                ? 'bg-red-600 text-white shadow-xs' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>1. Executive Summary</span>
          </button>

          <button
            onClick={() => setActiveTab('FEATURES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'FEATURES' 
                ? 'bg-red-600 text-white shadow-xs' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. Features & Screenshots</span>
          </button>

          <button
            onClick={() => setActiveTab('TIMELINE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'TIMELINE' 
                ? 'bg-red-600 text-white shadow-xs' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>3. Phased Timeline</span>
          </button>

          <button
            onClick={() => setActiveTab('PRICING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'PRICING' 
                ? 'bg-red-600 text-white shadow-xs' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>4. Pricing & Investment</span>
          </button>

          <button
            onClick={() => setActiveTab('SLA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'SLA' 
                ? 'bg-red-600 text-white shadow-xs' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>5. SLA & Sign-Off</span>
          </button>
        </div>

        {/* Modal Body / Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-slate-300 space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Hero Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 rounded-2xl p-5 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10">
                  <span className="text-[11px] font-extrabold text-red-400 uppercase tracking-widest">
                    Commercial & Technical Proposal
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                    MyCash Tele-Sales Calling Portal & Customer Intelligence System
                  </h2>
                  <p className="text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
                    A centralized, enterprise-grade tele-sales operations and customer engagement platform built specifically for MyCash Bank and Amal Express. It transforms fragmented spreadsheet calling workflows into a real-time, auditable outbound calling engine with automated WhatsApp campaigns and bilingual AI sentiment analysis.
                  </p>
                  
                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Client</span>
                      <strong className="text-white">MyCash Bank / Amal Group</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Coverage</span>
                      <strong className="text-white">27 Regional Branches</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Estimated Delivery</span>
                      <strong className="text-emerald-400">8 Weeks Total</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">PDF Status</span>
                      <button 
                        onClick={handleDownloadPdf}
                        className="text-red-400 hover:text-red-300 font-bold underline cursor-pointer"
                      >
                        6 Pages Ready
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Problem vs Solution Table */}
              <div>
                <h4 className="text-sm font-extrabold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-red-400" />
                  <span>Strategic Problem vs. Solution Transformation</span>
                </h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-300 uppercase text-[10px] font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-3 w-1/2">Current Operational Challenge</th>
                        <th className="p-3 w-1/2 text-emerald-400">MyCash Portal Solution & Business Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                      <tr>
                        <td className="p-3 text-slate-300 font-medium">
                          Disparate Excel spreadsheets managed independently by 27 branches with no central sync.
                        </td>
                        <td className="p-3 text-slate-200 bg-emerald-950/20">
                          Single centralized Supabase PostgreSQL database with instant multi-branch rollup, real-time KPI tracking, and zero data silos.
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 text-slate-300 font-medium">
                          Customers receiving duplicate calls from multiple agents causing brand fatigue.
                        </td>
                        <td className="p-3 text-slate-200 bg-emerald-950/20">
                          Strict deduplication algorithms preventing double-calling and locking active customer sessions.
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 text-slate-300 font-medium">
                          No visibility into agent calling cadence, talk time, and conversion metrics.
                        </td>
                        <td className="p-3 text-slate-200 bg-emerald-950/20">
                          Live supervisor & HQ dashboard tracking conversion velocity, targets, and individual team member accountability.
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 text-slate-300 font-medium">
                          Valuable customer feedback notes written in Af-Soomaali lost in unstructured text.
                        </td>
                        <td className="p-3 text-slate-200 bg-emerald-950/20">
                          Gemini 3.8 AI sentiment engine translating and categorizing feedback into actionable executive insights.
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 text-slate-300 font-medium">
                          Manual, slow SMS follow-ups for dormant customers (&gt;90 days) leading to customer churn.
                        </td>
                        <td className="p-3 text-slate-200 bg-emerald-950/20">
                          Automated WhatsApp Cloud API SMS hub triggered by Excel status or dormancy with live mobile preview.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* System Architecture Diagram */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                <div className="text-slate-400 text-xs mb-2 font-sans font-bold">HIGH-LEVEL SYSTEM ARCHITECTURE:</div>
                <pre className="leading-relaxed">
{`+-------------------------------------------------------------------------------------------------+
|                                 MYCASH TELE-SALES WEB PORTAL                                    |
| [HQ Admin Executive Terminal]  |  [Branch Supervisor Queue]  |  [Calling Agent Focus Dialer]    |
+-------------------------------------------------------------------------------------------------+
                                                |
               +--------------------------------+-------------------------------+
               |                                                                |
               v                                                                v
+-------------------------------+                             +-----------------------------------+
|      GEMINI 3.8 AI ENGINE     |                             |     SUPABASE POSTGRESQL CLOUD     |
| • Somali/English NLP Analysis |                             | • Multi-Tenant RBAC Security      |
| • Objection Handling Scripts  |                             | • Real-Time Pub/Sub Data Sync     |
| • AI WhatsApp SMS Composer    |                             | • Immutable Activity Audit Logs   |
+-------------------------------+                             +-----------------------------------+
               |                                                                |
               +--------------------------------+-------------------------------+
                                                |
                                                v
                              +-----------------------------------+
                              |   META WHATSAPP BUSINESS API      |
                              |   (Via Supabase Edge Function)    |
                              | • Over 90-day Dormant Reactivation|
                              | • Call Status Trigger Broadcasts  |
                              +-----------------------------------+`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: FEATURES & SCREENSHOTS */}
          {activeTab === 'FEATURES' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    Core Modules & Visual Feature Walkthroughs
                  </h4>
                  <p className="text-xs text-slate-400">
                    High-fidelity layout mockups demonstrating the actual user interface implemented in the portal.
                  </p>
                </div>
                <button
                  onClick={handleDownloadPdf}
                  className="px-3 py-1 bg-red-600/20 border border-red-500/40 text-red-300 text-xs font-bold rounded-lg hover:bg-red-600/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>See in PDF</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROPOSAL_FEATURE_SCREENSHOTS.map((feat, idx) => (
                  <div 
                    key={feat.id}
                    className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                          {feat.module}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          Module 0{idx + 1}
                        </span>
                      </div>
                      <h5 className="font-bold text-white text-sm mb-1.5 flex items-center gap-2">
                        {feat.id.includes('whatsapp') && <MessageSquare className="w-4 h-4 text-emerald-400" />}
                        {feat.id.includes('focus') && <PhoneCall className="w-4 h-4 text-amber-400" />}
                        {feat.id.includes('ai') && <Sparkles className="w-4 h-4 text-rose-400" />}
                        {feat.id.includes('admin') && <BarChart3 className="w-4 h-4 text-blue-400" />}
                        <span>{feat.title}</span>
                      </h5>
                      <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                        {feat.description}
                      </p>

                      {/* Feature Highlights */}
                      <ul className="space-y-1 mb-3 text-[11px] text-slate-300">
                        {feat.highlights.map((h, hIdx) => (
                          <li key={hIdx} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Screenshot / ASCII Visual Mockup */}
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-[9.5px] text-emerald-400 overflow-x-auto shadow-inner">
                      <pre className="whitespace-pre">{feat.mockupVisual}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: TIMELINE */}
          {activeTab === 'TIMELINE' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
                  <Clock className="w-4 h-4" />
                  <span>Production Roadmap & Delivery Strategy</span>
                </div>
                <h4 className="text-base font-extrabold text-white">
                  Turnkey 8-Week Nationwide Deployment Schedule
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                  Structured into four distinct phases to guarantee continuous business operations, rigorous security auditing, branch supervisor orientation, and zero disruption to daily calling quotas.
                </p>
              </div>

              <div className="space-y-4">
                {PROPOSAL_TIMELINE.map((item, idx) => (
                  <div 
                    key={idx}
                    className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row gap-4 relative overflow-hidden"
                  >
                    <div className="md:w-48 shrink-0 border-b md:border-b-0 md:border-r border-slate-800 pb-3 md:pb-0 md:pr-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-500/20 text-red-300 border border-red-500/30">
                        {item.phase}
                      </span>
                      <h5 className="font-black text-white text-sm sm:text-base mt-2">
                        {item.title}
                      </h5>
                      <span className="inline-block mt-1 text-xs font-bold text-amber-400 font-mono">
                        {item.duration}
                      </span>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h6 className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                          Key Milestones & Activities
                        </h6>
                        <ul className="space-y-1.5 text-xs text-slate-300">
                          {item.milestones.map((m, mIdx) => (
                            <li key={mIdx} className="flex items-start gap-1.5">
                              <span className="text-red-400 font-bold">•</span>
                              <span>{m}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3">
                        <h6 className="text-[11px] font-extrabold uppercase text-emerald-400 tracking-wider mb-2">
                          Deliverables & Acceptance Criteria
                        </h6>
                        <ul className="space-y-1.5 text-xs text-slate-200">
                          {item.deliverables.map((d, dIdx) => (
                            <li key={dIdx} className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PRICING */}
          {activeTab === 'PRICING' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Transparent Commercial Investment Options
                </h4>
                <p className="text-xs text-slate-400">
                  Fixed one-time software deployment packages with zero hidden per-seat licensing fees.
                </p>
              </div>

              {/* Pricing Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PROPOSAL_PRICING.developmentTiers.map((tier, idx) => (
                  <div 
                    key={idx}
                    className={`rounded-2xl p-5 flex flex-col justify-between transition-all ${
                      tier.isRecommended
                        ? 'bg-gradient-to-b from-slate-900 via-slate-850 to-slate-900 border-2 border-red-500 shadow-xl shadow-red-950/20 relative'
                        : 'bg-slate-950/60 border border-slate-800'
                    }`}
                  >
                    {tier.isRecommended && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-red-600 text-white font-extrabold text-[10px] rounded-full uppercase tracking-wider shadow-sm">
                        Most Popular for Banks
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h5 className="font-extrabold text-white text-base">
                          {tier.name}
                        </h5>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tier.isRecommended ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {tier.badge}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mb-4 min-h-[32px]">
                        {tier.targetAudience}
                      </p>

                      <div className="mb-4 pb-4 border-b border-slate-800">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-white">{tier.oneTimeSetup}</span>
                          <span className="text-xs text-slate-400 font-medium">one-time setup</span>
                        </div>
                        <div className="text-xs text-emerald-400 font-bold mt-1">
                          + {tier.monthlySupport}
                        </div>
                      </div>

                      <ul className="space-y-2 text-xs text-slate-300 mb-6">
                        {tier.features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={handleDownloadPdf}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        tier.isRecommended
                          ? 'bg-red-600 hover:bg-red-500 text-white shadow-md'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Select {tier.name} in PDF</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Cloud & Third-Party Pass-Through Costs Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                  <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span>Cloud Hosting & Database (Pass-Through)</span>
                  </h5>
                  <div className="space-y-2 text-xs">
                    {PROPOSAL_PRICING.infrastructureCosts.map((infra, iIdx) => (
                      <div key={iIdx} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800/80">
                        <div className="flex items-center justify-between font-bold text-slate-200">
                          <span>{infra.item}</span>
                          <span className="text-emerald-400 font-mono">{infra.cost} ({infra.frequency})</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{infra.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                  <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>Meta WhatsApp Cloud API Direct Rates</span>
                  </h5>
                  <div className="space-y-2 text-xs">
                    {PROPOSAL_PRICING.whatsAppApiCosts.map((wa, wIdx) => (
                      <div key={wIdx} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800/80">
                        <div className="flex items-center justify-between font-bold text-slate-200">
                          <span>{wa.item}</span>
                          <span className="text-amber-400 font-mono">{wa.cost}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{wa.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SLA & SIGN-OFF */}
          {activeTab === 'SLA' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Service Level Agreement (SLA) & Incident Response
                </h4>
                <p className="text-xs text-slate-400">
                  Guaranteed uptime and rapid engineering resolution targets during production operations.
                </p>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-300 uppercase text-[10px] font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Severity</th>
                      <th className="p-3">Definition</th>
                      <th className="p-3">Initial Response</th>
                      <th className="p-3 text-emerald-400">Resolution Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                    <tr>
                      <td className="p-3 font-bold text-rose-400">Severity 1 (Critical)</td>
                      <td className="p-3 text-slate-300">Total portal outage or inability to make outbound calls / save records.</td>
                      <td className="p-3 text-slate-200 font-mono">&lt; 1 Hour</td>
                      <td className="p-3 text-emerald-400 font-mono font-bold">&lt; 4 Hours</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-amber-400">Severity 2 (High)</td>
                      <td className="p-3 text-slate-300">Major feature failure (e.g. WhatsApp broadcast fails or Excel import blocked).</td>
                      <td className="p-3 text-slate-200 font-mono">&lt; 2 Hours</td>
                      <td className="p-3 text-emerald-400 font-mono font-bold">&lt; 8 Hours</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-blue-400">Severity 3 (Medium)</td>
                      <td className="p-3 text-slate-300">Minor system glitch or non-critical cosmetic issue.</td>
                      <td className="p-3 text-slate-200 font-mono">&lt; 6 Hours</td>
                      <td className="p-3 text-emerald-400 font-mono font-bold">&lt; 24 Hours</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-400">Severity 4 (Low)</td>
                      <td className="p-3 text-slate-300">General inquiry, user role adjustments, or template adjustments.</td>
                      <td className="p-3 text-slate-200 font-mono">&lt; 12 Hours</td>
                      <td className="p-3 text-emerald-400 font-mono font-bold">&lt; 48 Hours</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Acceptance Signatures Block */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                  Document Signatures & Acceptance
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
                  <div className="space-y-4">
                    <div className="h-12 border-b border-dashed border-slate-700 flex items-end pb-1 text-slate-400 text-xs italic">
                      [Authorized Executive Signature]
                    </div>
                    <div>
                      <strong className="text-white text-xs block">FOR: MyCash Bank / Amal Express Group</strong>
                      <span className="text-[11px] text-slate-400">Authorized Leadership Representative & Date</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="h-12 border-b border-dashed border-slate-700 flex items-end pb-1 text-slate-400 text-xs italic">
                      [Engineering Principal Signature]
                    </div>
                    <div>
                      <strong className="text-white text-xs block">FOR: Tele-Sales Solutions Engineering Team</strong>
                      <span className="text-[11px] text-slate-400">Principal Systems Architect & Date</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="text-slate-400 text-[11px] hidden sm:block">
            Document ID: <span className="font-mono text-slate-300">MYCASH-PROPOSAL-V2.4</span> • Classification: Strictly Confidential
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              id="btn-footer-download-pdf"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Generating PDF...' : 'Download Full PDF (.pdf)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
