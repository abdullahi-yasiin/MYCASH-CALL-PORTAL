export interface ProposalPricingTier {
  name: string;
  badge: string;
  oneTimeSetup: string;
  monthlySupport: string;
  targetAudience: string;
  features: string[];
  isRecommended?: boolean;
}

export interface ProposalTimelinePhase {
  phase: string;
  title: string;
  duration: string;
  milestones: string[];
  deliverables: string[];
}

export interface ProposalFeatureScreenshot {
  id: string;
  title: string;
  module: string;
  description: string;
  highlights: string[];
  mockupVisual: string; // ASCII / layout representation for PDF & UI
}

export const PROPOSAL_TIMELINE: ProposalTimelinePhase[] = [
  {
    phase: 'Phase 1',
    title: 'Requirements Alignment & Supabase Cloud Setup',
    duration: 'Weeks 1 – 2',
    milestones: [
      'Finalize enterprise Excel lead schema with custom transaction metrics (Reg. Date, Total Trans., Dormant Days)',
      'Provision Supabase PostgreSQL relational database & Row Level Security (RLS)',
      'Configure automated 30-minute inactivity session security and audit logs'
    ],
    deliverables: [
      'Production database provisioned with 6 core tables & RLS policies',
      'Data mapping dictionary & Excel template validator'
    ]
  },
  {
    phase: 'Phase 2',
    title: 'Core Tele-Sales & Multi-Branch Pilot Deployment',
    duration: 'Weeks 3 – 4',
    milestones: [
      'Deploy Role-Based Access Control (HQ Admin, Branch Supervisor, Calling Agent)',
      'Launch Outbound Focus Calling Mode (Fast Dialer queue with in-line status updates)',
      'Deploy Scheduled Appointments Management with Supervisor Reassignment',
      'Pilot with 3 selected regional branches (Mogadishu, Hargeisa, Garowe)'
    ],
    deliverables: [
      'Live staging portal deployed on continuous deployment (Netlify / Cloud)',
      'Branch pilot operational report with real agent feedback'
    ]
  },
  {
    phase: 'Phase 3',
    title: 'Gemini 3.8 AI Analytics & WhatsApp Automation Hub',
    duration: 'Weeks 5 – 6',
    milestones: [
      'Deploy Gemini 3.8 AI sentiment engine (bilingual Af-Soomaali & English comprehension)',
      'Deploy Supabase Edge Function for Meta WhatsApp Cloud API integration',
      'Implement WhatsApp targeting for Excel call statuses and >90 days dormancy',
      'Integrate AI WhatsApp template composer with Somali banking tone'
    ],
    deliverables: [
      'Automated WhatsApp broadcast hub with real-time audit logs',
      'Bilingual executive PDF analytical report generator'
    ]
  },
  {
    phase: 'Phase 4',
    title: 'Enterprise Network Rollout, Training & Sign-Off',
    duration: 'Weeks 7 – 8',
    milestones: [
      'Onboard all 27 regional branches and calling agent roster',
      'Conduct supervisor training and tele-sales playbook orientation',
      'System stress testing, database backup scheduling, and executive sign-off'
    ],
    deliverables: [
      'Full nationwide operational handover',
      'Complete administrator documentation, SLA agreement, and training videos'
    ]
  }
];

export const PROPOSAL_PRICING: {
  developmentTiers: ProposalPricingTier[];
  infrastructureCosts: { item: string; cost: string; frequency: string; notes: string }[];
  whatsAppApiCosts: { item: string; cost: string; notes: string }[];
} = {
  developmentTiers: [
    {
      name: 'Standard Portal',
      badge: 'Core Essentials',
      oneTimeSetup: '$3,800 USD',
      monthlySupport: '$350 USD / month',
      targetAudience: 'Single branch or small tele-sales teams (< 10 agents)',
      features: [
        'Excel Bulk Leads Import & Auto-Deduplication',
        'Standard Role-Based Access (Admin & Agent)',
        'In-line Status & Feedback Notes Editing',
        'Basic Excel Data Export',
        'Email Support (Next Business Day SLA)'
      ]
    },
    {
      name: 'Fintech Enterprise Tier',
      badge: 'Recommended',
      isRecommended: true,
      oneTimeSetup: '$6,500 USD',
      monthlySupport: '$650 USD / month',
      targetAudience: 'Full MyCash regional branch network (27 Branches, 50+ Agents)',
      features: [
        'All Core Portal Features + Multi-Tier RBAC (HQ Admin, Supervisor, Agent)',
        'Custom Ingestion: Reg. Date, Total Transactions, Dormant Days',
        'Outbound Focus Calling Mode (Speed-dialer flow)',
        'Scheduled Appointments Management & Supervisor Reassignment',
        'Gemini 3.8 AI Bilingual Sentiment Analytics & PDF Executive Reports',
        'WhatsApp Cloud API SMS Automation Hub (>90 Days Dormancy & Status Triggers)',
        'Supabase Realtime Cloud Sync & Immutable Audit Trail',
        'Priority 24/7 SLA & Dedicated Solutions Engineer'
      ]
    },
    {
      name: 'Full Source Ownership & Custom API',
      badge: 'Complete IP Rights',
      oneTimeSetup: '$11,500 USD',
      monthlySupport: '$950 USD / month',
      targetAudience: 'Banking corporations requiring full source code transfer and core-banking integration',
      features: [
        'Everything in Fintech Enterprise Tier',
        '100% Source Code Ownership & Private Git Repository Transfer',
        'Direct Integration with Core Banking Switch / SMS Gateway APIs',
        'On-Premise / Private VPC Cloud Deployment (AWS / Azure / GCP / Self-Hosted)',
        'Unlimited Branches, Supervisors, and Calling Agents',
        'Dedicated SLA with 1-hour critical response time'
      ]
    }
  ],
  infrastructureCosts: [
    {
      item: 'Supabase Cloud Database (Pro Tier)',
      cost: '$25 USD',
      frequency: 'Monthly',
      notes: 'Includes 8 GB database, 100,000 Edge Function invocations, daily automated backups, point-in-time recovery.'
    },
    {
      item: 'Netlify Enterprise Edge Hosting',
      cost: '$19 USD',
      frequency: 'Monthly',
      notes: 'Global CDN, automatic SSL certificates, continuous deployment from repository, zero-downtime updates.'
    },
    {
      item: 'Google Gemini AI Token Quota',
      cost: 'Pay-as-you-go (~$10–$25)',
      frequency: 'Monthly',
      notes: 'Ultra-low cost per 1,000 customer feedback translations and executive intelligence runs via Gemini 3.8 Flash.'
    }
  ],
  whatsAppApiCosts: [
    {
      item: 'Meta WhatsApp Business API Service Messages',
      cost: 'Free tier: 1,000 free conversations / mo',
      notes: 'Customer-initiated service conversations within 24-hr customer service window.'
    },
    {
      item: 'Marketing & Reactivation Broadcast Messages',
      cost: '~$0.025 to $0.038 USD per message',
      notes: 'Meta Graph API standard regional rate for Somalia / East Africa outbound utility & marketing messages.'
    }
  ]
};

export const PROPOSAL_FEATURE_SCREENSHOTS: ProposalFeatureScreenshot[] = [
  {
    id: 'feat-admin-terminal',
    title: 'HQ Executive Summary Dashboard',
    module: 'Leadership & Telemetry',
    description: 'Real-time telemetry aggregating customer leads across all 27 branches and 60+ agents with conversion velocity, call counts, and branch targets.',
    highlights: [
      'Interactive KPI cards: Total Leads, Called, Success, In-Progress, Not Available, Rejected, Appointments',
      'Branch Performance Matrix with target pacing meters and conversion velocity',
      'Quick Action Bar with 1-click WhatsApp SMS, AI Intelligence, and Excel Upload'
    ],
    mockupVisual: `+-----------------------------------------------------------------------------------------+
| [HQ EXECUTIVE DASHBOARD] MyCash Tele-Sales Performance Summary                           |
| Total Leads: 3,043  |  Total Called: 1,842 (60.5%)  |  Converted: 724 (39.3%) | Appts: 184 |
+-----------------------------------------------------------------------------------------+
| [Quick Actions]  [AI Intelligence]  [WhatsApp SMS Broadcast]  [Upload Excel Roster]     |
| [Branch Filter]  Mogadishu (412) | Garowe (289) | Hargeisa (340) | Bosaso (215)...       |
+-----------------------------------------------------------------------------------------+`
  },
  {
    id: 'feat-focus-mode',
    title: 'Outbound Focus Calling Mode (Fast Dialer)',
    module: 'Calling Operations',
    description: 'High-speed outbound calling interface designed for telephone agents to dial, log outcomes, note customer feedback, and book appointments without page reloads.',
    highlights: [
      'Clean single-lead view with one-click status transitions (Success, No Answer, In-progress, Rejected)',
      'Built-in Somali feedback note helper and quick date picker',
      'Next Lead auto-advance with keyboard ergonomics'
    ],
    mockupVisual: `+-----------------------------------------------------------------------------------------+
| [OUTBOUND FOCUS DIALER] Lead #42 of 150 - Mogadishu Branch                              |
| Customer: Maxamed Cali Warsame | Phone: +252 61 555 4321 | Dormant: 112 Days            |
+-----------------------------------------------------------------------------------------+
| Outcome: [✓ Success]  [⧗ In-progress]  [✕ No Answer]  [⛔ Rejected]  [📅 Schedule Appt]   |
| Feedback: "Customer requested account reactivation and merchant payment information"    |
| [<< Previous Lead]                                                [Save & Next Lead >>] |
+-----------------------------------------------------------------------------------------+`
  },
  {
    id: 'feat-whatsapp-hub',
    title: 'WhatsApp Cloud API SMS Automation Hub',
    module: 'Omnichannel Engagement',
    description: 'Automated broadcast and reactivation messaging hub driven by Excel call outcomes and dormancy metrics (>90 days) with Gemini AI template generation.',
    highlights: [
      'Audience segmentation: Over 90 Days Dormant or specific Excel statuses (No Answer, Appointments, etc.)',
      'Gemini 3.8 AI SMS Generator crafting authentic Somali and English banking copy',
      'Live simulated WhatsApp phone chat preview before broadcasting'
    ],
    mockupVisual: `+-----------------------------------------------------------------------------------------+
| [WHATSAPP SMS AUTOMATION] Audience: Over 90 Days Dormant (438 Customers Qualified)       |
| Template: "Asc {{customerName}}, muddo {{dormantDays}} maalmood ah ayaan ku waynay..."  |
+-----------------------------------------------------------------------------------------+
| Gemini AI: [Generate Somali Template]  [Generate English Template]  [Generate Bilingual]|
| Live Preview: [MyCash Official Business] "Asc Maxamed, muddo 112 maalmood ah..."        |
| [Send Test Message: +25261555...]        [Broadcast WhatsApp SMS to 438 Customers >>]   |
+-----------------------------------------------------------------------------------------+`
  },
  {
    id: 'feat-ai-intelligence',
    title: 'Gemini 3.8 AI Intelligence & Bilingual Sentiment Report',
    module: 'Executive Analytics',
    description: 'Natural language analysis translating customer feedback from Af-Soomaali into actionable English management reports with complaint categorizations and agent coaching.',
    highlights: [
      'Automatic translation and categorization of Somali feedback notes',
      'Objection handling scripts and agent coaching recommendations',
      'One-click executive landscape PDF export'
    ],
    mockupVisual: `+-----------------------------------------------------------------------------------------+
| [AI INTELLIGENCE REPORT] Gemini 3.8 Powered Feedback Analytics                          |
| Top Complaint: Network & SMS Delays (38.2%) | Driver: Instant Transaction Speed (44.1%) |
+-----------------------------------------------------------------------------------------+
| Quote: "Qadku wuu xumaa SMS-kuna ma iman" -> English: "Network was down, SMS not recvd" |
| Agent Coaching: Train team on explaining zero-fee merchant transfers during objections  |
| [Download Publication-Grade Executive PDF Report (Landscape A4) >>]                     |
+-----------------------------------------------------------------------------------------+`
  }
];
