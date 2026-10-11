import * as XLSX from 'xlsx';
import { CustomerRecord, CallStatus } from '../types';

export interface ParsedRow {
  rowNumber: number;
  customerName: string;
  phoneNumber: string;
  areaOfReg: string;
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

// Canonical schema headers
export const EXPECTED_HEADERS = [
  'Customer Name',
  'Phone Number',
  'Area of Reg.',
  'Call Date',
  'Status',
  'Appointment / Callback',
  'Feedback Note',
  'Supervisor Note',
  'Agent Name'
];

export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  // Remove spaces, dashes, parentheses, plus
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
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

  // Find column indices by fuzzy match
  const findColIndex = (candidates: string[]) => {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const header = normalizedHeaders[i];
      if (candidates.some(c => header === c.toLowerCase() || header.includes(c.toLowerCase()) || c.toLowerCase().includes(header))) {
        return i;
      }
    }
    return -1;
  };

  const nameIdx = findColIndex(['customer name', 'client name', 'full name', 'name', 'customer', 'client', 'magaca', 'magaca macmiilka']);
  const phoneIdx = findColIndex(['phone number', 'phone', 'mobile', 'cell', 'contact number', 'tel', 'telefoon', 'lambarka']);
  const areaIdx = findColIndex(['area of reg.', 'area of reg', 'area', 'region', 'branch', 'location', 'gobolka', 'laanta']);
  const callDateIdx = findColIndex(['call date', 'date of contact', 'contact date', 'date', 'taariikh', 'taariikhda']);
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
    const phoneNumber = phoneIdx !== -1 ? String(row[phoneIdx] || '').trim() : '';
    const areaOfReg = areaIdx !== -1 ? String(row[areaIdx] || '').trim() : '';
    let callDate = callDateIdx !== -1 ? String(row[callDateIdx] || '').trim() : '';
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
    if (!areaOfReg) {
      errors.push('Area of Reg. / Branch is missing');
    }

    const status = normalizeStatus(statusStr, appointment);

    const parsedItem: ParsedRow = {
      rowNumber,
      customerName,
      phoneNumber,
      areaOfReg,
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
