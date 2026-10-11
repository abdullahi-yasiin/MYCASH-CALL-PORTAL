import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { User, UserRole, BranchInfo } from '../types';

// Configure pdfjs worker safely for web browser runtime
if (typeof window !== 'undefined') {
  try {
    // Set fallback CDN worker or disable worker if needed
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${(pdfjsLib as any).version || '4.10.38'}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('[PDF.js] Worker setup warning:', e);
  }
}

export interface ParsedUserRow {
  rowNumber: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  branch: string;
  supervisorId?: string;
  supervisorName?: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
  existingUserId?: string;
}

export interface UserFileParseResult {
  fileName: string;
  fileType: 'excel' | 'doc' | 'pdf' | 'csv' | 'txt' | 'unknown';
  fileSize: number;
  totalRows: number;
  validRows: ParsedUserRow[];
  invalidRows: ParsedUserRow[];
  duplicateCount: number;
  headersFound: string[];
  rawTextPreview?: string;
}

// Canonical expected headers alias mapping
const NAME_ALIASES = ['name', 'full name', 'fullname', 'magac', 'magaca', 'staff name', 'employee name', 'user name', 'username'];
const EMAIL_ALIASES = ['email', 'email address', 'e-mail', 'mail', 'user email', 'work email', 'iimayl'];
const PHONE_ALIASES = ['phone', 'phone number', 'phonenumber', 'mobile', 'tel', 'telephone', 'contact', 'cell', 'lambarka'];
const ROLE_ALIASES = ['role', 'role tier', 'position', 'title', 'level', 'user role', 'derejo'];
const BRANCH_ALIASES = ['branch', 'region', 'branch name', 'location', 'office', 'city', 'laanta'];
const SUPERVISOR_ALIASES = ['supervisor', 'supervisor name', 'supervisor email', 'manager', 'reports to', 'reporting to', 'lead'];

/**
 * Validate standard email address format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean);
}

/**
 * Normalize and clean phone numbers (defaults to Somali formatting if applicable)
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '+252 61 0000000';
  let clean = phone.replace(/[^0-9+]/g, '').trim();
  if (!clean) return '+252 61 0000000';
  if (clean.startsWith('252')) clean = `+${clean}`;
  if (!clean.startsWith('+')) {
    if (clean.startsWith('0')) clean = `+252 ${clean.slice(1)}`;
    else if (clean.length === 9) clean = `+252 ${clean}`;
    else clean = `+252 ${clean}`;
  }
  return clean;
}

/**
 * Normalize user role string to system UserRole enum
 */
export function normalizeUserRole(val: string | undefined, defaultRole: UserRole = 'TEAM_MEMBER'): UserRole {
  if (!val) return defaultRole;
  const v = val.toString().trim().toUpperCase().replace(/[\s\-_]+/g, '');

  if (v.includes('ADMIN') || v.includes('HQ') || v.includes('SUPERADMIN') || v.includes('DIRECTOR') || v.includes('MADAX')) {
    return 'HQ_ADMIN';
  }
  if (v.includes('SUPERVISOR') || v.includes('MANAGER') || v.includes('LEAD') || v.includes('MADAXE') || v.includes('MAAMUL')) {
    return 'SUPERVISOR';
  }
  if (v.includes('AGENT') || v.includes('CALLER') || v.includes('MEMBER') || v.includes('TEAM') || v.includes('STAFF') || v.includes('SHAQAALE')) {
    return 'TEAM_MEMBER';
  }

  return defaultRole;
}

/**
 * Fuzzy / exact match for branch name from registered branches list
 */
export function matchBranchName(val: string | undefined, branches: BranchInfo[], fallbackBranch?: string): string {
  const fallback = fallbackBranch || branches[0]?.name || 'Headquarters';
  if (!val) return fallback;

  const clean = val.toString().trim().toLowerCase().replace(/branch$/i, '').trim();
  if (!clean) return fallback;

  // Exact match
  const exact = branches.find(b => b.name.toLowerCase() === clean || b.name.toLowerCase().includes(clean));
  if (exact) return exact.name;

  // Region match
  const regionMatch = branches.find(b => b.region.toLowerCase().includes(clean) || clean.includes(b.region.toLowerCase()));
  if (regionMatch) return regionMatch.name;

  // Alias match for common Somali towns
  for (const b of branches) {
    const bSimple = b.name.toLowerCase().split(' ')[0];
    if (clean.includes(bSimple) || bSimple.includes(clean)) {
      return b.name;
    }
  }

  return fallback;
}

/**
 * Match supervisor by name, email, or id
 */
export function matchSupervisor(
  val: string | undefined,
  supervisors: User[],
  branch: string
): { id?: string; name?: string } {
  if (!val) {
    // If no supervisor specified, look for default supervisor in this branch
    const branchSupervisor = supervisors.find(s => s.branch === branch);
    if (branchSupervisor) {
      return { id: branchSupervisor.id, name: branchSupervisor.name };
    }
    return {};
  }

  const clean = val.toString().trim().toLowerCase();
  const found = supervisors.find(
    s => s.name.toLowerCase().includes(clean) ||
         clean.includes(s.name.toLowerCase()) ||
         s.email.toLowerCase() === clean ||
         s.id.toLowerCase() === clean
  );

  if (found) {
    return { id: found.id, name: found.name };
  }

  return {};
}

/**
 * Validate and enhance parsed user row against database state
 */
export function validateUserRow(
  raw: {
    rowNumber: number;
    name: string;
    email: string;
    phone?: string;
    role?: string;
    branch?: string;
    supervisor?: string;
  },
  branches: BranchInfo[],
  existingUsers: User[],
  defaultBranch?: string,
  defaultRole?: UserRole
): ParsedUserRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  const name = (raw.name || '').trim();
  const email = (raw.email || '').trim().toLowerCase();
  const phone = formatPhoneNumber(raw.phone || '');
  const role = normalizeUserRole(raw.role, defaultRole || 'TEAM_MEMBER');
  const branch = matchBranchName(raw.branch, branches, defaultBranch);

  if (!name) {
    errors.push('Full Name is required');
  } else if (name.length < 2) {
    errors.push('Full Name is too short');
  }

  if (!email) {
    errors.push('Email address is required');
  } else if (!isValidEmail(email)) {
    errors.push('Invalid email format (e.g. name@amal.com)');
  }

  // Check existing user conflicts
  const existingUser = existingUsers.find(u => u.email.toLowerCase() === email);
  const isDuplicate = !!existingUser;
  if (isDuplicate) {
    warnings.push(`Account already exists (${existingUser.name} - ${existingUser.role}). Importing will update existing profile.`);
  }

  // Match direct supervisor if role is team member
  const supervisors = existingUsers.filter(u => u.role === 'SUPERVISOR' && u.active);
  let supervisorId: string | undefined = undefined;
  let supervisorName: string | undefined = undefined;

  if (role === 'TEAM_MEMBER') {
    const matched = matchSupervisor(raw.supervisor, supervisors, branch);
    supervisorId = matched.id;
    supervisorName = matched.name;
    if (!supervisorId && supervisors.length > 0) {
      warnings.push(`No supervisor assigned for branch "${branch}".`);
    }
  }

  return {
    rowNumber: raw.rowNumber,
    name,
    email,
    phone,
    role,
    branch,
    supervisorId,
    supervisorName,
    isValid: errors.length === 0,
    errors,
    warnings,
    isDuplicate,
    existingUserId: existingUser?.id,
  };
}

/**
 * Parse Excel file (.xlsx, .xls, .csv)
 */
export function parseExcelUsers(
  data: ArrayBuffer,
  branches: BranchInfo[],
  existingUsers: User[],
  defaultBranch?: string,
  defaultRole?: UserRole
): { rows: ParsedUserRow[]; headersFound: string[] } {
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Excel workbook contains no sheets.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!jsonData || jsonData.length === 0) {
    throw new Error('Excel sheet is completely empty.');
  }

  // Identify header row (scan first 6 rows)
  let headerRowIndex = -1;
  let headerMap: { [key: string]: number } = {};

  for (let r = 0; r < Math.min(jsonData.length, 6); r++) {
    const row = jsonData[r] || [];
    const lowerCells = row.map(c => String(c || '').trim().toLowerCase());

    const hasName = lowerCells.some(c => NAME_ALIASES.includes(c));
    const hasEmail = lowerCells.some(c => EMAIL_ALIASES.includes(c));

    if (hasName || hasEmail) {
      headerRowIndex = r;
      lowerCells.forEach((c, idx) => {
        if (NAME_ALIASES.includes(c)) headerMap['name'] = idx;
        else if (EMAIL_ALIASES.includes(c)) headerMap['email'] = idx;
        else if (PHONE_ALIASES.includes(c)) headerMap['phone'] = idx;
        else if (ROLE_ALIASES.includes(c)) headerMap['role'] = idx;
        else if (BRANCH_ALIASES.includes(c)) headerMap['branch'] = idx;
        else if (SUPERVISOR_ALIASES.includes(c)) headerMap['supervisor'] = idx;
      });
      break;
    }
  }

  // If no header found, assume standard column order: Name(0), Email(1), Phone(2), Role(3), Branch(4), Supervisor(5)
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    headerMap = { name: 0, email: 1, phone: 2, role: 3, branch: 4, supervisor: 5 };
  }

  const headersFound = (jsonData[headerRowIndex] || []).map(c => String(c || '').trim()).filter(Boolean);
  const rows: ParsedUserRow[] = [];

  for (let r = headerRowIndex + 1; r < jsonData.length; r++) {
    const rowData = jsonData[r] || [];
    // Skip totally blank rows
    if (rowData.every(c => String(c || '').trim() === '')) continue;

    const rawName = String(rowData[headerMap['name']] || '').trim();
    const rawEmail = String(rowData[headerMap['email']] || '').trim();
    const rawPhone = String(rowData[headerMap['phone']] || '').trim();
    const rawRole = String(rowData[headerMap['role']] || '').trim();
    const rawBranch = String(rowData[headerMap['branch']] || '').trim();
    const rawSupervisor = String(rowData[headerMap['supervisor']] || '').trim();

    if (!rawName && !rawEmail) continue;

    const parsed = validateUserRow(
      {
        rowNumber: r + 1,
        name: rawName,
        email: rawEmail,
        phone: rawPhone,
        role: rawRole,
        branch: rawBranch,
        supervisor: rawSupervisor,
      },
      branches,
      existingUsers,
      defaultBranch,
      defaultRole
    );

    rows.push(parsed);
  }

  return { rows, headersFound };
}

/**
 * Parse text or table extracted from Word document (.docx, .doc) or text files
 */
export async function parseDocUsers(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  branches: BranchInfo[],
  existingUsers: User[],
  defaultBranch?: string,
  defaultRole?: UserRole
): Promise<{ rows: ParsedUserRow[]; headersFound: string[]; rawText: string }> {
  let html = '';
  let rawText = '';

  try {
    const result = await mammoth.convertToHtml({ arrayBuffer });
    html = result.value;
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    rawText = textResult.value;
  } catch (err) {
    console.warn('[Doc Parser] Mammoth convert failed, attempting raw text decoding:', err);
    const decoder = new TextDecoder('utf-8');
    rawText = decoder.decode(arrayBuffer);
  }

  const rows: ParsedUserRow[] = [];
  const headersFound: string[] = [];

  // Check if Word contains HTML table <table>
  if (html && html.includes('<table')) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const table = tempDiv.querySelector('table');
    if (table) {
      const trs = Array.from(table.querySelectorAll('tr'));
      if (trs.length > 0) {
        // First row as headers
        const thCells = Array.from(trs[0].querySelectorAll('th, td')).map(td => td.textContent?.trim().toLowerCase() || '');
        headersFound.push(...thCells);

        const headerMap: { [key: string]: number } = {};
        thCells.forEach((c, idx) => {
          if (NAME_ALIASES.includes(c)) headerMap['name'] = idx;
          else if (EMAIL_ALIASES.includes(c)) headerMap['email'] = idx;
          else if (PHONE_ALIASES.includes(c)) headerMap['phone'] = idx;
          else if (ROLE_ALIASES.includes(c)) headerMap['role'] = idx;
          else if (BRANCH_ALIASES.includes(c)) headerMap['branch'] = idx;
          else if (SUPERVISOR_ALIASES.includes(c)) headerMap['supervisor'] = idx;
        });

        if (Object.keys(headerMap).length === 0) {
          headerMap['name'] = 0;
          headerMap['email'] = 1;
          headerMap['phone'] = 2;
          headerMap['role'] = 3;
          headerMap['branch'] = 4;
        }

        for (let i = 1; i < trs.length; i++) {
          const cells = Array.from(trs[i].querySelectorAll('td')).map(td => td.textContent?.trim() || '');
          if (cells.every(c => !c)) continue;

          const rawName = cells[headerMap['name']] || '';
          const rawEmail = cells[headerMap['email']] || '';
          const rawPhone = cells[headerMap['phone']] || '';
          const rawRole = cells[headerMap['role']] || '';
          const rawBranch = cells[headerMap['branch']] || '';
          const rawSupervisor = cells[headerMap['supervisor']] || '';

          if (!rawName && !rawEmail) continue;

          const parsed = validateUserRow(
            {
              rowNumber: i + 1,
              name: rawName,
              email: rawEmail,
              phone: rawPhone,
              role: rawRole,
              branch: rawBranch,
              supervisor: rawSupervisor,
            },
            branches,
            existingUsers,
            defaultBranch,
            defaultRole
          );
          rows.push(parsed);
        }

        if (rows.length > 0) {
          return { rows, headersFound, rawText };
        }
      }
    }
  }

  // Fallback: parse raw text line by line / key-values
  const textRows = parseStructuredLines(rawText, branches, existingUsers, defaultBranch, defaultRole);
  return { rows: textRows, headersFound: ['Line Text Pattern'], rawText };
}

/**
 * Parse PDF document page by page using pdfjs-dist
 */
export async function parsePdfUsers(
  arrayBuffer: ArrayBuffer,
  branches: BranchInfo[],
  existingUsers: User[],
  defaultBranch?: string,
  defaultRole?: UserRole
): Promise<{ rows: ParsedUserRow[]; headersFound: string[]; rawText: string }> {
  let combinedText = '';

  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean);
      combinedText += pageStrings.join(' ') + '\n';
    }
  } catch (pdfErr) {
    console.warn('[PDF.js] Direct PDF extraction failed, trying binary string scanner:', pdfErr);
    // Fallback: search for plain text chunks in PDF buffer
    const decoder = new TextDecoder('latin1');
    const binaryStr = decoder.decode(arrayBuffer);
    const textMatches = binaryStr.match(/\((.*?)\)\s*Tj/g) || [];
    const extracted = textMatches.map(m => m.replace(/^\\\(|\) Tj$/g, '')).join(' ');
    combinedText = extracted || binaryStr;
  }

  const rows = parseStructuredLines(combinedText, branches, existingUsers, defaultBranch, defaultRole);
  return { rows, headersFound: ['PDF Text Stream'], rawText: combinedText };
}

/**
 * Universal structured text line extractor:
 * Parses formats such as:
 * 1. "Name: Ahmed Ali | Email: ahmed@amal.com | Role: Agent | Branch: Mogadishu | Phone: +25261..."
 * 2. "Ahmed Ali, ahmed@amal.com, +252617000111, Agent, Mogadishu Branch"
 * 3. Tab or Pipe separated values
 * 4. Regex email discovery with surrounding context
 */
export function parseStructuredLines(
  text: string,
  branches: BranchInfo[],
  existingUsers: User[],
  defaultBranch?: string,
  defaultRole?: UserRole
): ParsedUserRow[] {
  if (!text) return [];

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows: ParsedUserRow[] = [];
  const seenEmails = new Set<string>();

  let rowCounter = 1;

  for (const line of lines) {
    // Check for delimiter patterns (CSV, Pipe, Tab)
    const delimiter = line.includes('|') ? '|' : line.includes('\t') ? '\t' : line.includes(',') ? ',' : null;

    if (delimiter) {
      const parts = line.split(delimiter).map(p => p.trim());
      // Skip header lines
      const lower0 = parts[0]?.toLowerCase() || '';
      if (lower0 === 'name' || lower0 === 'full name' || lower0 === 'magac' || lower0 === 'email') {
        continue;
      }

      // Check if one part is an email
      const emailIdx = parts.findIndex(p => isValidEmail(p));
      if (emailIdx !== -1) {
        const rawEmail = parts[emailIdx];
        const rawName = emailIdx > 0 ? parts[0] : (parts[1] || 'Imported User');
        const rawPhone = parts.find(p => /^\+?[0-9\s\-()]{7,16}$/.test(p) && p !== rawEmail) || '';
        const rawRole = parts.find(p => ['admin', 'hq_admin', 'supervisor', 'agent', 'team_member'].some(r => p.toLowerCase().includes(r))) || '';
        const rawBranch = parts.find(p => branches.some(b => b.name.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(b.region.toLowerCase()))) || '';

        if (!seenEmails.has(rawEmail.toLowerCase())) {
          seenEmails.add(rawEmail.toLowerCase());
          rows.push(
            validateUserRow(
              {
                rowNumber: rowCounter++,
                name: rawName,
                email: rawEmail,
                phone: rawPhone,
                role: rawRole,
                branch: rawBranch,
              },
              branches,
              existingUsers,
              defaultBranch,
              defaultRole
            )
          );
          continue;
        }
      }
    }

    // Check for Key-Value pattern (e.g. Name: ... Email: ...)
    if (line.toLowerCase().includes('email:') || line.toLowerCase().includes('name:')) {
      const nameMatch = line.match(/name:\s*([^,|;\n]+)/i);
      const emailMatch = line.match(/email:\s*([^\s,|;\n]+)/i);
      const phoneMatch = line.match(/phone:\s*([^,|;\n]+)/i);
      const roleMatch = line.match(/role:\s*([^,|;\n]+)/i);
      const branchMatch = line.match(/branch:\s*([^,|;\n]+)/i);

      if (emailMatch && emailMatch[1]) {
        const rawEmail = emailMatch[1].trim();
        if (!seenEmails.has(rawEmail.toLowerCase())) {
          seenEmails.add(rawEmail.toLowerCase());
          rows.push(
            validateUserRow(
              {
                rowNumber: rowCounter++,
                name: nameMatch ? nameMatch[1].trim() : rawEmail.split('@')[0],
                email: rawEmail,
                phone: phoneMatch ? phoneMatch[1].trim() : '',
                role: roleMatch ? roleMatch[1].trim() : '',
                branch: branchMatch ? branchMatch[1].trim() : '',
              },
              branches,
              existingUsers,
              defaultBranch,
              defaultRole
            )
          );
          continue;
        }
      }
    }

    // Regex email scan on unformatted lines
    const emailMatches = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (emailMatches) {
      for (const email of emailMatches) {
        if (!seenEmails.has(email.toLowerCase())) {
          seenEmails.add(email.toLowerCase());
          // Extract remaining words as name
          const stripped = line.replace(email, '').replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
          const words = stripped.split(/\s+/).filter(w => w.length > 1);
          const name = words.slice(0, 3).join(' ') || email.split('@')[0];

          rows.push(
            validateUserRow(
              {
                rowNumber: rowCounter++,
                name,
                email,
              },
              branches,
              existingUsers,
              defaultBranch,
              defaultRole
            )
          );
        }
      }
    }
  }

  return rows;
}

/**
 * Universal file router for bulk user imports
 */
export async function parseUserFile(
  file: File,
  branches: BranchInfo[],
  existingUsers: User[],
  defaultBranch?: string,
  defaultRole?: UserRole
): Promise<UserFileParseResult> {
  const fileName = file.name;
  const lowerName = fileName.toLowerCase();
  const buffer = await file.arrayBuffer();

  let fileType: UserFileParseResult['fileType'] = 'unknown';
  let rows: ParsedUserRow[] = [];
  let headersFound: string[] = [];
  let rawTextPreview: string | undefined = undefined;

  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv')) {
    fileType = lowerName.endsWith('.csv') ? 'csv' : 'excel';
    const parsed = parseExcelUsers(buffer, branches, existingUsers, defaultBranch, defaultRole);
    rows = parsed.rows;
    headersFound = parsed.headersFound;
  } else if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
    fileType = 'doc';
    const parsed = await parseDocUsers(buffer, fileName, branches, existingUsers, defaultBranch, defaultRole);
    rows = parsed.rows;
    headersFound = parsed.headersFound;
    rawTextPreview = parsed.rawText.slice(0, 500);
  } else if (lowerName.endsWith('.pdf')) {
    fileType = 'pdf';
    const parsed = await parsePdfUsers(buffer, branches, existingUsers, defaultBranch, defaultRole);
    rows = parsed.rows;
    headersFound = parsed.headersFound;
    rawTextPreview = parsed.rawText.slice(0, 500);
  } else if (lowerName.endsWith('.txt')) {
    fileType = 'txt';
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(buffer);
    rows = parseStructuredLines(text, branches, existingUsers, defaultBranch, defaultRole);
    headersFound = ['Text File Lines'];
    rawTextPreview = text.slice(0, 500);
  } else {
    // Fallback: try Excel first, then doc
    try {
      const parsed = parseExcelUsers(buffer, branches, existingUsers, defaultBranch, defaultRole);
      fileType = 'excel';
      rows = parsed.rows;
      headersFound = parsed.headersFound;
    } catch {
      fileType = 'doc';
      const parsed = await parseDocUsers(buffer, fileName, branches, existingUsers, defaultBranch, defaultRole);
      rows = parsed.rows;
      headersFound = parsed.headersFound;
    }
  }

  const validRows = rows.filter(r => r.isValid);
  const invalidRows = rows.filter(r => !r.isValid);
  const duplicateCount = rows.filter(r => r.isDuplicate).length;

  return {
    fileName,
    fileType,
    fileSize: file.size,
    totalRows: rows.length,
    validRows,
    invalidRows,
    duplicateCount,
    headersFound,
    rawTextPreview,
  };
}

/**
 * Generate Sample Excel Template for User Bulk Upload
 */
export function downloadSampleUserExcelTemplate(): void {
  const sampleData = [
    {
      'Full Name': 'Farah Hassan Shire',
      'Email': 'farah.shire@amal.com',
      'Phone Number': '+252 61 7220011',
      'Role Tier': 'SUPERVISOR',
      'Branch': 'Mogadishu Branch',
      'Direct Supervisor': ''
    },
    {
      'Full Name': 'Amina Abdi Warsame',
      'Email': 'amina.warsame@amal.com',
      'Phone Number': '+252 61 8334455',
      'Role Tier': 'TEAM_MEMBER',
      'Branch': 'Mogadishu Branch',
      'Direct Supervisor': 'Farah Hassan Shire'
    },
    {
      'Full Name': 'Jama Mohamed Nur',
      'Email': 'jama.nur@amal.com',
      'Phone Number': '+252 61 9445566',
      'Role Tier': 'TEAM_MEMBER',
      'Branch': 'Garowe Branch',
      'Direct Supervisor': ''
    },
    {
      'Full Name': 'Khadija Said Ali',
      'Email': 'khadija.ali@amal.com',
      'Phone Number': '+252 61 5112233',
      'Role Tier': 'TEAM_MEMBER',
      'Branch': 'Hargeisa Branch',
      'Direct Supervisor': ''
    },
    {
      'Full Name': 'Omar Dahir Gedi',
      'Email': 'omar.gedi@amal.com',
      'Phone Number': '+252 61 4001122',
      'Role Tier': 'HQ_ADMIN',
      'Branch': 'Headquarters',
      'Direct Supervisor': ''
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  // Auto column widths
  ws['!cols'] = [
    { wch: 24 }, // Full Name
    { wch: 28 }, // Email
    { wch: 20 }, // Phone Number
    { wch: 16 }, // Role Tier
    { wch: 24 }, // Branch
    { wch: 24 }, // Direct Supervisor
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Users_Import_Template');

  XLSX.writeFile(wb, 'MyCash_Users_Import_Template.xlsx');
}

/**
 * Generate Sample Text / CSV guide for bulk upload
 */
export function downloadSampleUserTextGuide(): void {
  const content = `# MYCASH PORTAL - BULK USER IMPORT FORMAT GUIDE (EXCEL, DOC, PDF)
# You can upload this format in .xlsx, .docx, .pdf, or .csv

Full Name,Email,Phone Number,Role Tier,Branch,Direct Supervisor
Farah Hassan Shire,farah.shire@amal.com,+252 61 7220011,SUPERVISOR,Mogadishu Branch,
Amina Abdi Warsame,amina.warsame@amal.com,+252 61 8334455,TEAM_MEMBER,Mogadishu Branch,Farah Hassan Shire
Jama Mohamed Nur,jama.nur@amal.com,+252 61 9445566,TEAM_MEMBER,Garowe Branch,
Khadija Said Ali,khadija.ali@amal.com,+252 61 5112233,TEAM_MEMBER,Hargeisa Branch,
Omar Dahir Gedi,omar.gedi@amal.com,+252 61 4001122,HQ_ADMIN,Headquarters,

# Notes:
# 1. Role Tier options: HQ_ADMIN, SUPERVISOR, TEAM_MEMBER (or Calling Agent)
# 2. Default password for new users is 'amal123' with mandatory reset on first login.
# 3. For Doc / PDF files: You can include a table with the same columns, or comma/pipe separated lines.
`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'MyCash_Bulk_User_Import_Guide.txt';
  a.click();
  URL.revokeObjectURL(url);
}
