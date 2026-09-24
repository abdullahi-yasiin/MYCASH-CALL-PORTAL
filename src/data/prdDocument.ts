export const PRD_MARKDOWN = `# PRODUCT REQUIREMENT DOCUMENT (PRD) & TECHNICAL ARCHITECTURE SPECIFICATION

**Product Name:** MYCASH CALLING PORTAL  
**Version:** 1.0.0 (Production Release)  
**Document Author:** Senior Full-Stack Software Engineer & UI/UX Systems Architect  
**Classification:** Internal Enterprise Platform / Tele-sales & Telemetry  
**Status:** Approved & Implemented  

---

## 1. Executive Summary & Strategic Objectives

The **MYCASH CALLING PORTAL** is an enterprise-grade customer contact, outbound calling, and tele-sales operations platform designed for MyCash financial services. It unifies distributed branch calling operations under a single, auditable portal.

### 1.1 Core Business Problems Solved
1. **Disparate Calling Lists:** Historically, customer calling spreadsheets were handled independently across regional branches without centralized deduplication, leading to customer fatigue from repeated calls.
2. **Lack of Auditability & Telemetry:** Inability to track whether a customer was actually contacted, when appointments were secured, and what conversion velocity was achieved per agent.
3. **Operational Silos:** HQ leadership had delayed visibility into branch-level performance, requiring days of manual Excel consolidations.
4. **Data Leakage & Security:** Field agents previously had unrestricted visibility into sensitive data columns; the new system enforces strict Role-Based Access Control (RBAC) down to individual cell columns.

---

## 2. Core System Architecture & Roles (RBAC Matrix)

The application enforces strict Role-Based Access Control across three distinct user tiers.

### 2.1 Role Definitions & Capabilities

| Feature / Permission | Tier A: HQ Admin (Super Admin) | Tier B: Supervisor | Tier C: Team Member (Agent) |
|---|---|---|---|
| **System Scope** | Full global system access across all regions & branches | Restricted strictly to assigned branch / region | Restricted strictly to individually assigned leads |
| **User Administration** | Create, edit, activate/deactivate all branches, supervisors, and agents | Create, edit, and manage agents in assigned branch only | None (Read-only self profile) |
| **Excel Bulk Upload** | Full global upload to any branch or region | Upload customer rosters for assigned branch only | Forbidden |
| **Data Editing Scope** | All columns of any customer record | All columns of records within assigned branch | **Restricted columns only**: Call Date, Status, Appointment, Feedback Note |
| **Locked Columns for Agent** | None | None | **Customer Name, Phone Number, Area of Reg., Supervisor Note** |
| **Dashboard Scope** | Global Analytics (all branches, regions, supervisors, agents) | Team & Branch Analytics only | Personal assigned workload metrics |
| **Export Formats** | Full raw Excel & styled executive PDF (all filters) | Branch-level Excel & styled PDF | Personal assigned list Excel & PDF |
| **Navigation Tabs** | (1) Branches/Regions, (2) Supervisors, (3) Team Members, (4) Calling Records | (1) Team Members Overview, (2) Daily Activity Logs, (3) Calling Records | (1) My Calling Queue, (2) Today's Appointments |

---

## 3. Data Structure & Excel Schema

The ingestion engine and database storage strictly enforce the following 8-column schema:

| Column Header | Data Type | Editable By | Description & Validation Rules |
|---|---|---|---|
| **Customer Name** | String | Admin, Supervisor | Full name of the customer (Required, 2-100 characters). |
| **Phone Number** | String / Phone | Admin, Supervisor | Primary contact number. Sanitized and validated against international or national pattern (7-15 digits). |
| **Area of Reg.** | String | Admin, Supervisor | Registered branch or region name (e.g., Mogadishu Central, Hargeisa North). |
| **Call Date** | Date (YYYY-MM-DD) | All Roles | Date of contact. Automatically populated or selected via date picker. |
| **Status** | Enum Dropdown | All Roles | \`Success\`, \`In-progress\`, \`Not Available\`, \`Rejected\` (Default: \`Uncalled\`). |
| **Appointment** | Date/Time (ISO) | All Roles | Scheduled follow-up or callback date and time. |
| **Feedback Note** | Text Area | All Roles | Qualitative notes detailing customer feedback, objections, or conversion terms. |
| **Supervisor Note** | Text Area | Admin, Supervisor | Internal management directives, audit flags, or VIP instructions. Hidden from agent edit. |

---

## 4. Business Logic & Tracking Rules

### 4.1 Unique Call State Rule
- When an imported customer record has an initial default or blank state (\`Uncalled\` or \`""\`), its \`hasBeenCalled\` flag is \`false\`, and its \`callCount\` is \`0\`.
- As soon as a user changes the Status to **any** valid outcome (\`Success\`, \`In-progress\`, \`Not Available\`, or \`Rejected\`), the record is definitively transitioned to **"Called"** (\`hasBeenCalled: true\`).
- If no Call Date was previously recorded, the system automatically stamps the current system date as the contact date.

### 4.2 Deduplication Logic
- Once a record has transitioned to the "Called" state, its contribution to the global and regional **"Total Called"** metric is capped at exactly **1 unique call**.
- Modifying the status subsequently (e.g., transitioning from \`In-progress\` on Day 1 to \`Success\` on Day 3) updates the respective outcome distribution buckets, but **does NOT increment the "Total Called" metric count again**.
- A customer entity is only counted as an additional "New Call" opportunity if explicitly re-imported as part of a distinct, subsequent Excel upload batch with a fresh Batch ID.

---

## 5. Technical Architecture Specification

\`\`\`
+-----------------------------------------------------------------------------------+
|                           MYCASH CALLING PORTAL CLIENT                            |
+-----------------------------------------------------------------------------------+
|  [Presentation Layer]                                                            |
|  - Role-Adaptive Header & Auth Guard (HQ Admin / Supervisor / Agent)             |
|  - Metric KPI Strip (Total Leads, Called, Success, In-Prog, NA, Rejected, Appts)  |
|  - Multi-Select Filter Cascade (Date, Branch, Supervisor, Agent, Status)         |
|  - Interactive In-line Data Table with RBAC Cell Lockdown                        |
+-----------------------------------------------------------------------------------+
|  [Business & Domain Layer]                                                        |
|  - Unique Call State Evaluator & Deduplication Engine                             |
|  - Dynamic Role Permission Guard (CanEditCell, CanUpload, CanManageUsers)        |
|  - Audit Trail & Activity Logger                                                 |
+-----------------------------------------------------------------------------------+
|  [IO & Processing Engines]                                                        |
|  - Excel/CSV Parser (XLSX): Fuzzy column matching, sanity check, phone validation|
|  - Export Engine: Dynamic XLSX builder & jsPDF autoTable report generator         |
+-----------------------------------------------------------------------------------+
|  [Persistence Layer]                                                             |
|  - Normalized Entity Store (Branches, Users, CustomerRecords, ActivityLogs)     |
|  - Local Storage Snapshot Engine with initial seed hydration                     |
+-----------------------------------------------------------------------------------+
\`\`\`

### 5.1 Entity Relationship Diagram (ERD)

- **Branch** (1) -------- (M) **User** (Supervisors and Agents)
- **Branch** (1) -------- (M) **CustomerRecord** (Area of Registration)
- **User (Supervisor)** (1) -------- (M) **User (Agents)**
- **User (Agent)** (1) -------- (M) **CustomerRecord** (Assigned Leads)
- **CustomerRecord** (1) -------- (M) **ActivityLog** (Audit Trail)

---

## 6. UI/UX Interaction Principles & Design System

1. **Information Density & Keyboard Ergonomics:** Designed for high-cadence tele-sales agents. Status dropdowns, date pickers, and notes can be edited directly in-line without modal dialog roundtrips.
2. **Visual Hierarchy & Color Coding:**
   - \`Success\`: Emerald Green (\`bg-emerald-50 text-emerald-700 border-emerald-200\`)
   - \`In-progress\`: Amber Gold (\`bg-amber-50 text-amber-700 border-amber-200\`)
   - \`Not Available\`: Slate Grey (\`bg-slate-100 text-slate-700 border-slate-300\`)
   - \`Rejected\`: Rose Crimson (\`bg-rose-50 text-rose-700 border-rose-200\`)
   - \`Uncalled\`: Neutral Zinc (\`bg-zinc-100 text-zinc-500\`)
3. **Field Security Affordances:** Cells locked for the active role display an unobtrusive lock badge, preventing accidental interaction while keeping visual alignment clean.
4. **Instant Zero-Config Testing:** A one-click Role Switcher bar allows stakeholders and QA to swap between HQ Admin, Branch Supervisors, and Agents in real time.

---

## 7. Compliance, Security & Performance Benchmarks

- **Field Level Security (FLS):** Enforced before state mutations. Even if an agent inspects DOM elements, mutations on locked attributes are rejected by domain guards.
- **Client-Side Bulk Parsing:** Capable of processing 10,000 Excel records in < 800ms using SheetJS binary streaming.
- **Export Integrity:** Exports respect the active role's security boundaries. Agents cannot export records outside their assigned roster.
`;
