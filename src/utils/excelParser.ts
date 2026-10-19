import * as XLSX from 'xlsx';
import { CustomerRecord, CallStatus } from '../types';

export interface ParsedRow {
  rowNumber: number;
  customerName: string;
  phoneNumber: string;
  areaOfReg: string;
  regDate?: string;
  totalTransactions?: number;
  firstTransDate?: string;
  lastTransDate?: string;
  dormantDays?: number;
  callDate: string;
  status: CallStatus;
  appointment: string;
  feedbackNote: string;
  supervisorNote: string;
  agentName?: string;
  isValid: boolean;
  errors: string[];
}

export interface ParseResult {
  fileName: string;
  totalRows: number;
  validRows: ParsedRow[];
  invalidRows: ParsedRow[];
  headersFound: string[];
  missingRequiredHeaders: string[];
}

// Canonical schema headers with new transaction & registration columns between Area/Branch and Call Date
export const EXPECTED_HEADERS = [
  'Customer Name',
  'Phone Number',
  'Area of Reg.',
  'Reg. Date',
  'Total Transactions',
  'First Trans. Date',
  'Last Trans. Date',
  'Dormant Days',
  'Call Date',
  'Status',
  'Appointment / Callback',
  'Feedback Note',
  'Supervisor Note',
  'Agent Name'
];

export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  // Remove spaces, dashes, parentheses, plus, and dots from Excel floating point formats
  const cleaned = phone.replace(/[\s\-\(\)\+\.]/g, '').replace(/e\+\d+/i, '');
  // Phone should have between 7 and 15 digits
  return /^\d{7,15}$/.test(cleaned);
}

export function normalizeStatus(val: string, appointmentVal?: string): CallStatus {
  if (!val) {
    if (appointmentVal && appointmentVal.trim().length > 1) {
      return 'In-progress';
    }
    return 'Uncalled';
  }
  const v = val.trim().toLowerCase();
  if (v.includes('succ') || v.includes('guul') || v.includes('won') || v.includes('agree') || v.includes('qancay') || v.includes('aqbalay')) return 'Success';
  if (
    v.includes('prog') || 
    v.includes('in-prog') || 
    v.includes('pending') || 
    v.includes('callback') || 
    v.includes('call back') || 
    v.includes('call-back') || 
    v.includes('appointment') || 
    v.includes('ballan') || 
    v.includes('balan') || 
    v.includes('socda') || 
    v.includes('dib u wac') ||
    v.includes('wacitaan dambe')
  ) {
    return 'In-progress';
  }
  if (v.includes('not avail') || v.includes('no answer') || v.includes('busy') || v.includes('unavailable') || v.includes('mashquul') || v.includes('jawaab') || v.includes('dansan') || v.includes('damisan') || v.includes('dhacay') || v.includes('qaban')) return 'Not Available';
  if (v.includes('reject') || v.includes('declined') || v.includes('refused') || v.includes('diid') || v.includes('diiday') || v.includes('ma rabo')) return 'Rejected';
  
  if (appointmentVal && appointmentVal.trim().length > 1) {
    return 'In-progress';
  }
  return 'Uncalled';
}

export function parseDateCell(rawCell: any): string {
  if (!rawCell && rawCell !== 0) return '';
  if (rawCell instanceof Date) {
    return rawCell.toISOString().slice(0, 10);
  }
  if (typeof rawCell === 'number' && rawCell > 20000 && rawCell < 60000) {
    try {
      const jsDate = new Date((rawCell - 25569) * 86400 * 1000);
      return jsDate.toISOString().slice(0, 10);
    } catch {
      return String(rawCell).trim();
    }
  }
  const str = String(rawCell || '').trim();
  if (str.includes('T')) {
    return str.split('T')[0];
  }
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  return str;
}

export function parseNumberCell(rawCell: any): number {
  if (rawCell === undefined || rawCell === null || rawCell === '') return 0;
  if (typeof rawCell === 'number') {
    return isNaN(rawCell) ? 0 : Math.max(0, Math.round(rawCell));
  }
  const clean = String(rawCell).replace(/[^\d.-]/g, '');
  const parsed = parseInt(clean, 10);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

export async function parseExcelOrCsvFile(file: File): Promise<ParseResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to array of arrays to inspect headers
  const rawMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (rawMatrix.length === 0) {
    throw new Error('The uploaded file is completely empty.');
  }

  // Detect header row (could be row 0, or row 1/2 if preceded by a title banner)
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(6, rawMatrix.length); r++) {
    const row = rawMatrix[r] || [];
    const rowStr = row.map((c: any) => String(c || '').toLowerCase()).join(' ');
    if (
      (rowStr.includes('name') || rowStr.includes('magac') || rowStr.includes('customer') || rowStr.includes('client')) &&
      (rowStr.includes('phone') || rowStr.includes('mobile') || rowStr.includes('tel') || rowStr.includes('telefoon') || rowStr.includes('status') || rowStr.includes('branch') || rowStr.includes('area'))
    ) {
      headerRowIndex = r;
      break;
    }
  }

  const rawHeaders: string[] = (rawMatrix[headerRowIndex] || []).map((h: any) => String(h || '').trim());
  const normalizedHeaders = rawHeaders.map(h => h.toLowerCase());

  // Find column indices by strict-then-fuzzy match
  const findColIndex = (candidates: string[], excludeIndices: number[] = []) => {
    const cleanCand = candidates.map(c => c.toLowerCase().trim());
    // 1. Exact match pass
    for (let i = 0; i < normalizedHeaders.length; i++) {
      if (excludeIndices.includes(i)) continue;
      const header = normalizedHeaders[i];
      if (cleanCand.includes(header)) {
        return i;
      }
    }
    // 2. Substring match pass
    for (let i = 0; i < normalizedHeaders.length; i++) {
      if (excludeIndices.includes(i)) continue;
      const header = normalizedHeaders[i];
      for (const c of cleanCand) {
        if (c.length >= 4 && (header.includes(c) || c.includes(header))) {
          // Prevent generic date search matching reg. date or trans date
          if (c.includes('call') && (header.includes('reg') || header.includes('trans'))) continue;
          if (c.includes('reg') && header.includes('trans')) continue;
          return i;
        }
      }
    }
    return -1;
  };

  const nameIdx = findColIndex(['customer name', 'client name', 'full name', 'name', 'customer', 'client', 'magaca', 'magaca macmiilka']);
  const phoneIdx = findColIndex(['phone number', 'phone', 'mobile', 'cell', 'contact number', 'tel', 'telefoon', 'lambarka']);
  const areaIdx = findColIndex(['area of reg.', 'area of reg', 'area', 'region', 'branch', 'location', 'gobolka', 'laanta']);
  
  // New transaction & registration columns (positioned between Area/Branch and Call Date)
  const regDateIdx = findColIndex([
    'reg. date', 'reg date', 'registration date', 'date of registration', 'reg_date', 'taariikhda diiwaangalinta', 'diiwaangalin'
  ]);
  const totalTransIdx = findColIndex([
    'total transactions', 'total transaction', 'transactions', 'trans count', 'total trans', 'wadarta wax kala iibsiga', 'kala iibsi', 'total_transactions'
  ]);
  const firstTransDateIdx = findColIndex([
    'first trans. date', 'first trans date', 'first transaction date', 'first transaction', 'first_trans_date', 'taariikhda ugu horreysa', 'first trans'
  ]);
  const lastTransDateIdx = findColIndex([
    'last trans. date', 'last trans date', 'last transaction date', 'last transaction', 'last_trans_date', 'taariikhda ugu dambeysa', 'last trans'
  ]);
  const dormantDaysIdx = findColIndex([
    'dormant days', 'dormant', 'days dormant', 'inactivity days', 'dormancy', 'dormant_days', 'maalmaha aan la isticmaalin'
  ]);

  // Exclude previously matched date columns when resolving call date
  const dateExcluded = [nameIdx, phoneIdx, areaIdx, regDateIdx, totalTransIdx, firstTransDateIdx, lastTransDateIdx, dormantDaysIdx].filter(i => i !== -1);
  const callDateIdx = findColIndex(['call date', 'date of contact', 'contact date', 'call_date', 'taariikhda wacitaanka', 'taariikhda wicitaanka', 'date of call', 'call'], dateExcluded);
  const statusIdx = findColIndex(['status', 'call status', 'outcome', 'xaalada', 'natiijada', 'state']);
  
  // Robust Appointment & Callback synonyms in English & Af-Soomaali
  const appointmentIdx = findColIndex([
    'appointment', 'appointments', 'callback', 'callbacks', 'call back', 'call-back',
    'ballan', 'balan', 'ballanta', 'ballanqaad', 'ballan qaad', 'wacitaan dambe', 'wicitaan dambe',
    'follow up', 'follow-up', 'followup', 'follow ups', 'follow-ups',
    'appointment date', 'callback date', 'scheduled', 'schedule', 'booking', 'bookings',
    'booked', 'remind', 'reminder', 'next call', 'date of appointment', 'appointment / callback',
    'callback / appointment', 'appointment/callback'
  ]);

  // Robust Feedback Notes synonyms in English & Af-Soomaali
  const feedbackIdx = findColIndex([
    'feedback note', 'feedback', 'customer feedback', 'customer feedback note',
    'agent note', 'notes', 'call notes', 'call note', 'customer note', 'customer notes',
    'client feedback', 'client note', 'remarks', 'remark', 'comment', 'comments',
    'faallo', 'faallada', 'faallada macmiilka', 'faallada wakiilka', 'aragtida',
    'aragtida macmiilka', 'cabasho', 'faallooyinka', 'description', 'reason',
    'details', 'agent feedback', 'agent notes'
  ]);

  const supervisorIdx = findColIndex(['supervisor note', 'internal note', 'manager note', 'sup note', 'faallada kormeeraha', 'kormeere']);
  const agentIdx = findColIndex(['agent', 'agent name', 'caller', 'calling agent', 'assigned agent', 'assigned to', 'wakiilka', 'shaqaalaha', 'magaca wakiilka', 'user', 'rep']);

  const missingRequiredHeaders: string[] = [];
  if (nameIdx === -1) missingRequiredHeaders.push('Customer Name');
  if (phoneIdx === -1) missingRequiredHeaders.push('Phone Number');
  if (areaIdx === -1) missingRequiredHeaders.push('Area of Reg.');

  const parsedRows: ParsedRow[] = [];
  const validRows: ParsedRow[] = [];
  const invalidRows: ParsedRow[] = [];

  for (let r = headerRowIndex + 1; r < rawMatrix.length; r++) {
    const row = rawMatrix[r];
    // Skip totally empty rows
    if (!row || row.every((c: any) => String(c).trim() === '')) {
      continue;
    }

    const rowNumber = r + 1;
    const errors: string[] = [];

    const customerName = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
    
    // Parse phone number safely preserving digits and avoiding scientific notation
    let phoneNumber = '';
    if (phoneIdx !== -1 && row[phoneIdx] !== undefined && row[phoneIdx] !== null) {
      const rawPhone = row[phoneIdx];
      if (typeof rawPhone === 'number') {
        phoneNumber = Math.round(rawPhone).toLocaleString('fullwide', { useGrouping: false });
      } else {
        phoneNumber = String(rawPhone).trim().replace(/\.0+$/, '');
      }
    }

    // Area of registration with graceful fallback to Headquarters so rows are not dropped
    const areaOfReg = (areaIdx !== -1 ? String(row[areaIdx] || '').trim() : '') || 'Headquarters';
    
    // Parse the 5 new registration & transaction fields
    const regDate = regDateIdx !== -1 ? parseDateCell(row[regDateIdx]) : '';
    const totalTransactions = totalTransIdx !== -1 ? parseNumberCell(row[totalTransIdx]) : 0;
    const firstTransDate = firstTransDateIdx !== -1 ? parseDateCell(row[firstTransDateIdx]) : '';
    const lastTransDate = lastTransDateIdx !== -1 ? parseDateCell(row[lastTransDateIdx]) : '';
    const dormantDays = dormantDaysIdx !== -1 ? parseNumberCell(row[dormantDaysIdx]) : 0;

    let callDate = callDateIdx !== -1 ? parseDateCell(row[callDateIdx]) : '';
    let statusStr = statusIdx !== -1 ? String(row[statusIdx] || '').trim() : '';
    
    // Parse Appointment cell with type safety
    let appointment = '';
    if (appointmentIdx !== -1 && row[appointmentIdx] !== undefined && row[appointmentIdx] !== null) {
      const rawCell = row[appointmentIdx];
      if (rawCell instanceof Date) {
        appointment = rawCell.toISOString().slice(0, 16).replace('T', ' ');
      } else if (typeof rawCell === 'number' && rawCell > 20000 && rawCell < 60000) {
        // Excel serial date conversion
        try {
          const jsDate = new Date((rawCell - 25569) * 86400 * 1000);
          appointment = jsDate.toISOString().slice(0, 16).replace('T', ' ');
        } catch {
          appointment = String(rawCell).trim();
        }
      } else {
        appointment = String(rawCell || '').trim();
      }
    }

    const feedbackNote = feedbackIdx !== -1 ? String(row[feedbackIdx] || '').trim() : '';
    const supervisorNote = supervisorIdx !== -1 ? String(row[supervisorIdx] || '').trim() : '';
    const agentName = agentIdx !== -1 ? String(row[agentIdx] || '').trim() : '';

    // If appointment is not populated in appointment col, but statusStr or feedbackNote clearly booked one
    if (!appointment) {
      const lowStat = statusStr.toLowerCase();
      const lowNote = feedbackNote.toLowerCase();
      if (lowStat.includes('callback') || lowStat.includes('call back') || lowStat.includes('ballan') || lowStat.includes('balan') || lowStat.includes('appointment')) {
        appointment = 'Callback Booked';
      } else if (lowNote.includes('ballan') || lowNote.includes('balan') || lowNote.includes('callback') || lowNote.includes('call back') || lowNote.includes('dib u wac') || lowNote.includes('soo wac berri')) {
        appointment = 'Follow-up Callback (from note)';
      }
    }

    // Sanitize dates if serialized as Date objects
    if (callDate && callDate.includes('T')) {
      callDate = callDate.split('T')[0];
    }
    if (appointment && appointment.includes('T')) {
      appointment = appointment.slice(0, 16).replace('T', ' ');
    }

    // Validation
    if (!customerName) {
      errors.push('Customer Name is missing');
    }
    if (!phoneNumber) {
      errors.push('Phone Number is missing');
    } else if (!validatePhoneNumber(phoneNumber)) {
      errors.push(`Invalid phone format "${phoneNumber}". Must be 7-15 digits.`);
    }

    const status = normalizeStatus(statusStr, appointment);

    const parsedItem: ParsedRow = {
      rowNumber,
      customerName,
      phoneNumber,
      areaOfReg,
      regDate,
      totalTransactions,
      firstTransDate,
      lastTransDate,
      dormantDays,
      callDate,
      status,
      appointment,
      feedbackNote,
      supervisorNote,
      agentName,
      isValid: errors.length === 0,
      errors
    };

    parsedRows.push(parsedItem);
    if (parsedItem.isValid) {
      validRows.push(parsedItem);
    } else {
      invalidRows.push(parsedItem);
    }
  }

  return {
    fileName: file.name,
    totalRows: parsedRows.length,
    validRows,
    invalidRows,
    headersFound: rawHeaders,
    missingRequiredHeaders
  };
}

export function generateSampleExcelTemplate(): void {
  const headers = [
    'Customer Name',
    'Phone Number',
    'Area of Reg.',
    'Reg. Date',
    'Total Transactions',
    'First Trans. Date',
    'Last Trans. Date',
    'Dormant Days',
    'Call Date',
    'Status',
    'Appointment / Callback',
    'Feedback Note',
    'Supervisor Note',
    'Agent Name'
  ];

  const sampleData = [
    [
      'Abdi Hassan Ali',
      '+252 61 5991122',
      'Mogadishu Central',
      '2025-04-12',
      24,
      '2025-04-15',
      '2026-06-20',
      120,
      '2026-09-22',
      'In-progress',
      '2026-09-25 10:00',
      'Macmiilku wuxuu codsaday in dib loo soo waco berri 10:00 subaxnimo',
      'Follow up on KYC document verification',
      'Mohamed'
    ],
    [
      'Sahra Ahmed Nuur',
      '+252 61 8844221',
      'Mogadishu Central',
      '2024-11-05',
      5,
      '2024-11-08',
      '2025-08-14',
      430,
      '2026-09-23',
      'Rejected',
      '',
      'Macaamiilka marar badan baa la soo wacay wuxuuna ka cabanayaa in dhowr jeer la wacay, wuxuu codsaday in wicitaanka la joojiyo',
      'Customer complaining of multiple calls - cooldown needed',
      'Mohamed'
    ],
    [
      'Nimco Osman Warsame',
      '+252 63 4882233',
      'Hargeisa North',
      '2026-01-18',
      1,
      '2026-01-20',
      '2026-01-20',
      270,
      '',
      'Uncalled',
      '',
      '',
      'New priority lead from remittance promotion',
      'Farhan'
    ],
    [
      'Mohamed Farah Egal',
      '+252 90 7113344',
      'Garowe Commercial Hub',
      '2023-08-19',
      88,
      '2023-08-20',
      '2026-05-10',
      160,
      '2026-09-21',
      'Success',
      '2026-09-24 14:30',
      'Macaamiilku wuu ku qancay adeegga xisaabta ganacsiga',
      'Send corporate PDF rates',
      'Mohamed'
    ]
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 24 }, // Customer Name
    { wch: 18 }, // Phone Number
    { wch: 22 }, // Area of Reg.
    { wch: 14 }, // Reg. Date
    { wch: 18 }, // Total Transactions
    { wch: 16 }, // First Trans. Date
    { wch: 16 }, // Last Trans. Date
    { wch: 14 }, // Dormant Days
    { wch: 14 }, // Call Date
    { wch: 14 }, // Status
    { wch: 22 }, // Appointment / Callback
    { wch: 45 }, // Feedback Note
    { wch: 35 }, // Supervisor Note
    { wch: 18 }  // Agent Name
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'MyCash_Calling_Roster');
  XLSX.writeFile(workbook, 'MyCash_Calling_Template.xlsx');
}
