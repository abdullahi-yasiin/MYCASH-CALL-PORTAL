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
  'Appointment',
  'Feedback Note',
  'Supervisor Note'
];

export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  // Remove spaces, dashes, parentheses, plus
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  // Phone should have between 7 and 15 digits
  return /^\d{7,15}$/.test(cleaned);
}

export function normalizeStatus(val: string): CallStatus {
  if (!val) return 'Uncalled';
  const v = val.trim().toLowerCase();
  if (v.includes('succ')) return 'Success';
  if (v.includes('prog') || v.includes('in-prog') || v.includes('pending')) return 'In-progress';
  if (v.includes('not avail') || v.includes('no answer') || v.includes('busy') || v.includes('unavailable')) return 'Not Available';
  if (v.includes('reject') || v.includes('declined') || v.includes('refused')) return 'Rejected';
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

  const rawHeaders: string[] = (rawMatrix[0] || []).map((h: any) => String(h || '').trim());
  const normalizedHeaders = rawHeaders.map(h => h.toLowerCase());

  // Find column indices by fuzzy match
  const findColIndex = (candidates: string[]) => {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const header = normalizedHeaders[i];
      if (candidates.some(c => header === c.toLowerCase() || header.includes(c.toLowerCase()))) {
        return i;
      }
    }
    return -1;
  };

  const nameIdx = findColIndex(['customer name', 'client name', 'full name', 'name', 'customer']);
  const phoneIdx = findColIndex(['phone number', 'phone', 'mobile', 'cell', 'contact number', 'tel']);
  const areaIdx = findColIndex(['area of reg.', 'area of reg', 'area', 'region', 'branch', 'location']);
  const callDateIdx = findColIndex(['call date', 'date of contact', 'contact date', 'date']);
  const statusIdx = findColIndex(['status', 'call status', 'outcome']);
  const appointmentIdx = findColIndex(['appointment', 'follow up', 'appointment date', 'scheduled']);
  const feedbackIdx = findColIndex(['feedback note', 'feedback', 'agent note', 'notes', 'call notes']);
  const supervisorIdx = findColIndex(['supervisor note', 'internal note', 'manager note', 'sup note']);

  const missingRequiredHeaders: string[] = [];
  if (nameIdx === -1) missingRequiredHeaders.push('Customer Name');
  if (phoneIdx === -1) missingRequiredHeaders.push('Phone Number');
  if (areaIdx === -1) missingRequiredHeaders.push('Area of Reg.');

  const parsedRows: ParsedRow[] = [];
  const validRows: ParsedRow[] = [];
  const invalidRows: ParsedRow[] = [];

  for (let r = 1; r < rawMatrix.length; r++) {
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
    let appointment = appointmentIdx !== -1 ? String(row[appointmentIdx] || '').trim() : '';
    const feedbackNote = feedbackIdx !== -1 ? String(row[feedbackIdx] || '').trim() : '';
    const supervisorNote = supervisorIdx !== -1 ? String(row[supervisorIdx] || '').trim() : '';

    // Sanitize dates if serialized as Date objects
    if (callDate && callDate.includes('T')) {
      callDate = callDate.split('T')[0];
    }
    if (appointment && appointment.includes('T')) {
      // slice to YYYY-MM-DDTHH:mm
      appointment = appointment.slice(0, 16);
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

    const status = normalizeStatus(statusStr);

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
    'Appointment',
    'Feedback Note',
    'Supervisor Note'
  ];

  const sampleData = [
    [
      'Abdi Hassan Ali',
      '+252 61 5991122',
      'Mogadishu Central',
      '2026-09-22',
      'Success',
      '2026-09-25 10:00',
      'Accepted merchant onboarding demo',
      'Follow up on KYC document verification'
    ],
    [
      'Nimco Osman Warsame',
      '+252 63 4882233',
      'Hargeisa North',
      '',
      'Uncalled',
      '',
      '',
      'New priority lead from remittance promotion'
    ],
    [
      'Mohamed Farah Egal',
      '+252 90 7113344',
      'Garowe Commercial Hub',
      '2026-09-21',
      'In-progress',
      '2026-09-24 14:30',
      'Requested tariff rate sheet for enterprise payroll',
      'Send corporate PDF rates'
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
    { wch: 18 }, // Appointment
    { wch: 35 }, // Feedback Note
    { wch: 35 }  // Supervisor Note
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'MyCash_Calling_Roster');
  XLSX.writeFile(workbook, 'MyCash_Calling_Template.xlsx');
}
