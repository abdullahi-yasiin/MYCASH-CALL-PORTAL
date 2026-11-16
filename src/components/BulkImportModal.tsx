import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Download, 
  Check, 
  Users, 
  ArrowRight,
  ShieldAlert,
  RotateCcw,
  Sparkles,
  RefreshCw,
  UserCheck,
  UserPlus
} from 'lucide-react';
import { 
  parseExcelOrCsvFile, 
  generateSampleExcelTemplate, 
  ParseResult, 
  ParsedRow,
  EXPECTED_HEADERS 
} from '../utils/excelParser';
import { CustomerRecord, User, CallStatus, normalizePhoneForMatching } from '../types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  teamMembers: User[];
  preselectedAgentId?: string;
  isReupload?: boolean;
  existingRecords?: CustomerRecord[];
  onCommitImport: (
    newRecords: CustomerRecord[], 
    batchName: string, 
    continuationSummary?: { updatedCount: number; newCount: number; autoSuccessCount: number }
  ) => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  teamMembers,
  preselectedAgentId,
  isReupload = false,
  existingRecords = [],
  onCommitImport
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(preselectedAgentId || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedAgentId(preselectedAgentId || '');
      setParseResult(null);
      setErrorMessage(null);
    }
  }, [isOpen, preselectedAgentId]);

  // Filter team members based on supervisor scope
  const availableAgents = currentUser.role === 'SUPERVISOR'
    ? teamMembers.filter(t => t.branch === currentUser.branch || t.supervisorId === currentUser.id)
    : teamMembers;

  const targetAgent = availableAgents.find(a => a.id === selectedAgentId);

  // Compute Data Continuation Analysis between the uploaded spreadsheet and existing records
  const continuationAnalysis = useMemo(() => {
    if (!parseResult || parseResult.validRows.length === 0 || !existingRecords || existingRecords.length === 0) {
      return {
        isContinuation: false,
        matchedCount: 0,
        newCount: parseResult?.validRows.length || 0,
        autoSuccessCount: 0,
        existingTotalForAgent: 0,
        sampleMatches: [] as {
          name: string;
          phone: string;
          prevDormant: number;
          newDormant: number;
          prevTrans: number;
          newTrans: number;
          wasCalled: boolean;
          becomesSuccess: boolean;
        }[]
      };
    }

    // Determine target agent's existing records
    const agentRecords = selectedAgentId
      ? existingRecords.filter(r => r.assignedAgentId === selectedAgentId)
      : existingRecords;

    const phoneMap = new Map<string, CustomerRecord>();
    for (const r of agentRecords) {
      const pKey = normalizePhoneForMatching(r.phoneNumber);
      if (pKey) phoneMap.set(pKey, r);
    }

    let matchedCount = 0;
    let newCount = 0;
    let autoSuccessCount = 0;
    const sampleMatches: {
      name: string;
      phone: string;
      prevDormant: number;
      newDormant: number;
      prevTrans: number;
      newTrans: number;
      wasCalled: boolean;
      becomesSuccess: boolean;
    }[] = [];

    for (const row of parseResult.validRows) {
      const pKey = normalizePhoneForMatching(row.phoneNumber);
      const existing = pKey ? phoneMap.get(pKey) : undefined;
      if (existing) {
        matchedCount++;
        const newDormant = row.dormantDays ?? existing.dormantDays ?? 0;
        const wasCalled = Boolean(existing.hasBeenCalled || (existing.status && existing.status !== 'Uncalled'));
        // Automatic Success: customer was called (in any status other than Uncalled) AND now dormant < 30 days
        const becomesSuccess = wasCalled && newDormant < 30;
        if (becomesSuccess) {
          autoSuccessCount++;
        }

        if (sampleMatches.length < 3) {
          sampleMatches.push({
            name: existing.customerName || row.customerName,
            phone: existing.phoneNumber || row.phoneNumber,
            prevDormant: existing.dormantDays ?? 0,
            newDormant,
            prevTrans: existing.totalTransactions ?? 0,
            newTrans: row.totalTransactions ?? 0,
            wasCalled,
            becomesSuccess
          });
        }
      } else {
        newCount++;
      }
    }

    return {
      isContinuation: isReupload || matchedCount > 0,
      matchedCount,
      newCount,
      autoSuccessCount,
      existingTotalForAgent: agentRecords.length,
      sampleMatches
    };
  }, [parseResult, selectedAgentId, existingRecords, isReupload]);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const result = await parseExcelOrCsvFile(file);
      setParseResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse Excel file. Please ensure it is a valid .xlsx or .csv format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCommit = () => {
    if (!parseResult || parseResult.validRows.length === 0) return;

    const assignedAgent = availableAgents.find(a => a.id === selectedAgentId);
    const batchId = `BATCH-${new Date().toISOString().slice(0, 10)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const SYSTEM_BLACKLIST = new Set([
      'mycash', 'amal', 'customer', 'customers', 'lead', 'leads', 'call', 'calls',
      'roster', 'sheet', 'data', 'report', 'export', 'general', 'telesales', 'users', 'user', 'excel'
    ]);

    let fileAgentName = '';
    for (const ag of availableAgents) {
      const firstName = ag.name.toLowerCase().split(' ')[0];
      if (firstName.length >= 3 && parseResult.fileName.toLowerCase().includes(firstName)) {
        fileAgentName = ag.name;
        break;
      }
    }

    if (!fileAgentName) {
      const fileMatch = parseResult.fileName.match(/agent[\s_-]+([a-zA-Z]+)/i) || 
                         parseResult.fileName.match(/([a-zA-Z]+)[\s_-]+calling/i);
      if (fileMatch && !SYSTEM_BLACKLIST.has(fileMatch[1].toLowerCase())) {
        fileAgentName = fileMatch[1];
      }
    }

    // Determine target agent ID & Name
    let targetAgentId = assignedAgent ? assignedAgent.id : '';
    let targetAgentName = assignedAgent ? assignedAgent.name : fileAgentName;
    let targetSupervisorId = currentUser.role === 'SUPERVISOR' ? currentUser.id : (assignedAgent?.supervisorId || '');

    // Map existing records for data continuation matching
    const agentRecords = (existingRecords && existingRecords.length > 0)
      ? (targetAgentId 
          ? existingRecords.filter(r => r.assignedAgentId === targetAgentId) 
          : existingRecords)
      : [];

    const existingByPhone = new Map<string, CustomerRecord>();
    for (const rec of agentRecords) {
      const pKey = normalizePhoneForMatching(rec.phoneNumber);
      if (pKey) existingByPhone.set(pKey, rec);
    }

    const updatedExistingRecords: CustomerRecord[] = [];
    const newRecords: CustomerRecord[] = [];
    const matchedExistingIds = new Set<string>();
    let autoSuccessCount = 0;

    parseResult.validRows.forEach((row: ParsedRow, idx: number) => {
      // Determine agent name and ID for this row
      let effectiveAgentName = (row.agentName && row.agentName.trim().length > 0) 
        ? row.agentName.trim() 
        : (targetAgentName || 'Unassigned');
      let effectiveAgentId = targetAgentId;
      let effectiveSupervisorId = targetSupervisorId;

      if (effectiveAgentName && !effectiveAgentId) {
        const matchingAgent = availableAgents.find(a => 
          a.name.toLowerCase().trim() === effectiveAgentName.toLowerCase().trim() ||
          a.name.toLowerCase().includes(effectiveAgentName.toLowerCase()) ||
          effectiveAgentName.toLowerCase().includes(a.name.toLowerCase())
        );
        if (matchingAgent) {
          effectiveAgentId = matchingAgent.id;
          effectiveAgentName = matchingAgent.name;
          if (!effectiveSupervisorId && matchingAgent.supervisorId) {
            effectiveSupervisorId = matchingAgent.supervisorId;
          }
        } else if (!SYSTEM_BLACKLIST.has(effectiveAgentName.toLowerCase())) {
          effectiveAgentId = `agent-${effectiveAgentName.toLowerCase().replace(/\s+/g, '-')}`;
        } else {
          effectiveAgentName = 'Unassigned';
          effectiveAgentId = '';
        }
      }

      if (!effectiveAgentName || SYSTEM_BLACKLIST.has(effectiveAgentName.toLowerCase())) {
        effectiveAgentName = 'Unassigned';
        effectiveAgentId = '';
      }

      const pKey = normalizePhoneForMatching(row.phoneNumber);
      const existing = pKey ? existingByPhone.get(pKey) : undefined;

      if (existing) {
        // DATA CONTINUATION: Customer exists!
        // ONLY update these 4 fields as per user specification:
        // total_transactions, first_trans_date, last_trans_date, dormant_days
        // All call history, call statuses, feedback notes, supervisor notes, and appointments are strictly preserved!
        matchedExistingIds.add(existing.id);

        const newDormant = row.dormantDays ?? existing.dormantDays ?? 0;
        // Customer was called: in any status other than 'Uncalled', or hasBeenCalled is true
        const wasCalled = Boolean(existing.hasBeenCalled || (existing.status && existing.status !== 'Uncalled'));
        
        // Automated Success Rule:
        // A customer becomes 'Success' when they were called (not in 'Uncalled')
        // AND in the data continuation of the re-uploaded Excel they become no longer dormant (< 30 days)
        const becomesSuccess = wasCalled && newDormant < 30;
        const finalStatus: CallStatus = becomesSuccess 
          ? 'Success' 
          : (existing.status || 'Uncalled');

        if (becomesSuccess && existing.status !== 'Success') {
          autoSuccessCount++;
        }

        const updatedRecord: CustomerRecord = {
          ...existing,
          totalTransactions: row.totalTransactions ?? existing.totalTransactions ?? 0,
          firstTransDate: row.firstTransDate || existing.firstTransDate || '',
          lastTransDate: row.lastTransDate || existing.lastTransDate || '',
          dormantDays: newDormant,
          status: finalStatus,
          // Since this customer existed previously, remove any 'New Customer' hover label
          isNewCustomer: false,
          updatedAt: new Date().toISOString()
        };
        updatedExistingRecords.push(updatedRecord);
      } else {
        // BRAND NEW CUSTOMER: Upload as new record with hover label 'New Customer'
        const hasStatus = (row.status && row.status !== 'Uncalled') || 
                          Boolean(row.appointment && row.appointment.trim().length > 0) || 
                          Boolean(row.feedbackNote && row.feedbackNote.trim().length > 0);

        const newRecord: CustomerRecord = {
          id: `rec-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
          customerName: row.customerName,
          phoneNumber: row.phoneNumber,
          areaOfReg: currentUser.role === 'SUPERVISOR' ? currentUser.branch : (row.areaOfReg || 'General'),
          regDate: row.regDate || '',
          totalTransactions: row.totalTransactions ?? 0,
          firstTransDate: row.firstTransDate || '',
          lastTransDate: row.lastTransDate || '',
          dormantDays: row.dormantDays ?? 0,
          callDate: row.callDate,
          status: row.status || 'Uncalled',
          appointment: row.appointment || '',
          feedbackNote: row.feedbackNote || '',
          supervisorNote: row.supervisorNote || '',
          assignedAgentId: effectiveAgentId,
          assignedAgentName: effectiveAgentName,
          supervisorId: effectiveSupervisorId,
          hasBeenCalled: hasStatus,
          callCount: hasStatus ? 1 : 0,
          importedBatchId: batchId,
          isNewCustomer: true, // Displays 'New Customer' badge with hover tooltip until next upload
          createdAt: new Date().toISOString(),
          updatedAt: hasStatus ? new Date().toISOString() : ''
        };
        newRecords.push(newRecord);
      }
    });

    // For any previous records of this agent that had 'isNewCustomer: true' from a past upload,
    // clear the label now so it disappears on this next upload as requested!
    const olderRecordsToClear: CustomerRecord[] = [];
    for (const rec of agentRecords) {
      if (!matchedExistingIds.has(rec.id) && rec.isNewCustomer) {
        olderRecordsToClear.push({
          ...rec,
          isNewCustomer: false,
          updatedAt: new Date().toISOString()
        });
      }
    }

    const allProcessed = [...updatedExistingRecords, ...newRecords, ...olderRecordsToClear];

    onCommitImport(
      allProcessed, 
      `${parseResult.fileName} (${allProcessed.length} records processed)`,
      {
        updatedCount: updatedExistingRecords.length,
        newCount: newRecords.length,
        autoSuccessCount
      }
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-2 rounded-lg shrink-0 ${isReupload ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-600'}`}>
              {isReupload ? <RotateCcw className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                  {isReupload ? 'Data Continuation & Re-upload Engine' : 'Bulk Excel & CSV Import Engine'}
                </h3>
                {isReupload && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                    Smart Continuation Active
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate sm:whitespace-normal">
                {isReupload 
                  ? 'Re-upload Excel to update dormant days & transactions without deleting existing records or call history'
                  : 'Upload customer calling lists with automatic column mapping, validation, and smart continuation'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-200 transition-colors shrink-0 ml-2 cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
          {/* Target Designated Agent Banner */}
          {selectedAgentId && (
            <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-xl text-xs gap-2 animate-in fade-in ${
              isReupload ? 'bg-emerald-50/90 border border-emerald-300 text-emerald-950' : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
            }`}>
              <div className="flex items-start sm:items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 sm:mt-0">
                  {targetAgent?.name.slice(0, 1) || 'A'}
                </div>
                <div className="min-w-0">
                  <div className="font-bold flex items-center gap-1.5 flex-wrap">
                    <span>{isReupload ? 'Re-uploading for Agent:' : 'Targeted Calling Agent:'}</span>
                    <span className="text-emerald-950 font-extrabold underline decoration-emerald-400">
                      {targetAgent?.name}
                    </span>
                    <span className="px-1.5 py-0.2 bg-emerald-200/70 text-emerald-800 rounded font-semibold text-[10px]">
                      {targetAgent?.branch}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-700 leading-normal mt-0.5">
                    {isReupload
                      ? `Existing customers of ${targetAgent?.name} will be matched by phone number to sync transactions & dormant days while keeping call notes and statuses intact.`
                      : "Customer records from this Excel file will be automatically assigned to this agent's calling roster."}
                  </div>
                </div>
              </div>
              {!isReupload && (
                <button
                  onClick={() => setSelectedAgentId('')}
                  className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold underline cursor-pointer shrink-0 self-end sm:self-auto"
                >
                  Change
                </button>
              )}
            </div>
          )}

          {/* Instructions and Template Download */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl gap-2.5 sm:gap-3">
            <div className="text-xs text-blue-900 space-y-0.5">
              <div className="font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Data Continuation Rules:</span>
              </div>
              <div className="text-blue-700 text-[11px] sm:text-xs leading-relaxed">
                When re-uploading, the system compares unique phone numbers. Existing customers only have their <strong>total_transactions, first_trans_date, last_trans_date,</strong> and <strong>dormant_days</strong> updated. Call history, statuses, and notes are never replaced. New customers receive a <strong>'New Customer'</strong> badge.
              </div>
            </div>
            <button
              onClick={generateSampleExcelTemplate}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template (.xlsx)</span>
            </button>
          </div>

          {/* Drag & Drop Upload Zone */}
          {!parseResult && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 sm:p-8 text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-emerald-600 bg-emerald-50/50 scale-[0.99]' 
                  : 'border-slate-300 hover:border-emerald-500 bg-slate-50/40 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center space-y-2.5 sm:space-y-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800">
                    {isProcessing ? 'Processing spreadsheet...' : 'Click to select or drag and drop your updated Excel file here'}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Supports Microsoft Excel (.xlsx, .xls) and CSV</p>
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Parse Result Summary & Column Mapping Verification */}
          {parseResult && (
            <div className="space-y-3.5 sm:space-y-4">
              {/* File Info Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-100 p-3 rounded-xl text-xs gap-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-slate-800 truncate">{parseResult.fileName}</span>
                  <span className="text-slate-500 shrink-0">({parseResult.totalRows} total rows)</span>
                </div>
                <button
                  onClick={() => setParseResult(null)}
                  className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer self-start sm:self-auto"
                >
                  Upload different file
                </button>
              </div>

              {/* Data Continuation & Smart Sync Card */}
              {continuationAnalysis.isContinuation && (
                <div className="border border-emerald-200 bg-emerald-50/70 rounded-xl p-3 sm:p-4 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                      <RotateCcw className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Data Continuation & Smart Sync Active</span>
                    </div>
                    <span className="text-[10.5px] font-semibold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300">
                      Matched by Unique Phone Number
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Existing Customers to Update */}
                    <div className="p-2.5 bg-white rounded-lg border border-emerald-200/90 flex items-start gap-2.5">
                      <div className="p-1.5 rounded-md bg-blue-50 text-blue-700 shrink-0 mt-0.5">
                        <RefreshCw className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-slate-900">
                          {continuationAnalysis.matchedCount} Existing Customers Found
                        </div>
                        <div className="text-[10.5px] text-slate-600 leading-snug mt-0.5">
                          Only <strong>total_transactions, first_trans_date, last_trans_date,</strong> and <strong>dormant_days</strong> will be updated. Feedback notes, supervisor notes, call history, and appointments will remain untouched!
                        </div>
                      </div>
                    </div>

                    {/* New Customers to Add */}
                    <div className="p-2.5 bg-white rounded-lg border border-emerald-200/90 flex items-start gap-2.5">
                      <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-700 shrink-0 mt-0.5">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-slate-900">
                          {continuationAnalysis.newCount} New Customers to Add
                        </div>
                        <div className="text-[10.5px] text-slate-600 leading-snug mt-0.5">
                          Uploaded as new customer records with a hover label <span className="font-bold text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded">'New Customer'</span> until the next upload.
                        </div>
                      </div>
                    </div>

                    {/* Auto-Success Conversion Metric */}
                    {continuationAnalysis.autoSuccessCount > 0 && (
                      <div className="sm:col-span-2 p-2.5 bg-emerald-100/90 rounded-lg border border-emerald-300 flex items-start gap-2.5">
                        <div className="p-1.5 rounded-md bg-emerald-600 text-white shrink-0 mt-0.5">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-black text-emerald-950 flex items-center gap-1.5">
                            <span>{continuationAnalysis.autoSuccessCount} Customers Auto-Promoted to 'Success'</span>
                            <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full">Automated</span>
                          </div>
                          <div className="text-[10.5px] text-emerald-800 leading-snug mt-0.5">
                            Previously called customers whose dormant period dropped below 30 days in this uploaded Excel (<strong className="font-semibold">&lt; 30 days</strong>) are automatically converted to <strong>'Success'</strong>!
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sample Matches Preview */}
                  {continuationAnalysis.sampleMatches.length > 0 && (
                    <div className="pt-1 border-t border-emerald-200/70 text-[10.5px] text-emerald-900 space-y-1">
                      <div className="font-semibold text-emerald-950">Detected Sample Customer Metric Updates:</div>
                      <div className="grid grid-cols-1 gap-1">
                        {continuationAnalysis.sampleMatches.map((m, i) => (
                          <div key={i} className="flex flex-wrap items-center justify-between bg-white/80 px-2 py-1 rounded border border-emerald-200/70 text-[10px] gap-1">
                            <span className="font-medium text-slate-800 truncate">{m.name} ({m.phone})</span>
                            <div className="flex items-center gap-2 text-slate-600 font-mono">
                              <span>Dormant: {m.prevDormant}d ➔ <strong className="text-emerald-700">{m.newDormant}d</strong></span>
                              <span>•</span>
                              <span>Trans: {m.prevTrans} ➔ <strong className="text-blue-700">{m.newTrans}</strong></span>
                              {m.becomesSuccess && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-600 text-white shrink-0">
                                  ➔ Auto Success (&lt;30d)
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Validation Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-base font-bold text-emerald-950">{parseResult.validRows.length}</div>
                    <div className="text-xs text-emerald-700">Valid records ready in spreadsheet</div>
                  </div>
                </div>

                <div className={`p-3 border rounded-xl flex items-center gap-3 ${
                  parseResult.invalidRows.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                }`}>
                  <AlertTriangle className={`w-5 h-5 shrink-0 ${
                    parseResult.invalidRows.length > 0 ? 'text-amber-600' : 'text-slate-400'
                  }`} />
                  <div>
                    <div className={`text-base font-bold ${
                      parseResult.invalidRows.length > 0 ? 'text-amber-950' : 'text-slate-700'
                    }`}>
                      {parseResult.invalidRows.length}
                    </div>
                    <div className="text-xs text-slate-500">Invalid records with errors (will skip)</div>
                  </div>
                </div>
              </div>

              {/* Column Mapping Verification Checklist */}
              <div className="border border-slate-200 rounded-xl p-3 sm:p-3.5 bg-white space-y-2">
                <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Column Mapping Verification:</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    {EXPECTED_HEADERS.length - parseResult.missingRequiredHeaders.length} of {EXPECTED_HEADERS.length} mapped
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                  {EXPECTED_HEADERS.map(col => {
                    const isMissing = parseResult.missingRequiredHeaders.includes(col);
                    return (
                      <div
                        key={col}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10.5px] sm:text-[11px] font-medium ${
                          isMissing
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isMissing ? (
                          <X className="w-3 h-3 text-rose-500 shrink-0" />
                        ) : (
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                        )}
                        <span className="truncate">{col}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Invalid Rows Preview if any */}
              {parseResult.invalidRows.length > 0 && (
                <div className="border border-rose-200 bg-rose-50/50 rounded-xl p-3 space-y-2 text-xs">
                  <div className="font-semibold text-rose-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Error Log (These rows will be skipped):</span>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                    {parseResult.invalidRows.map((inv, i) => (
                      <div key={i} className="text-[11px] text-rose-700 bg-white border border-rose-100 p-1.5 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="truncate">Row {inv.rowNumber}: {inv.customerName || 'Missing Name'} ({inv.phoneNumber || 'No Phone'})</span>
                        <span className="font-medium text-rose-900 shrink-0">{inv.errors.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agent Assignment Selection */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Users className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-xs">Assigned Team Member:</div>
                    <div className="text-slate-500 text-[10.5px] sm:text-[11px]">Roster destination for this spreadsheet</div>
                  </div>
                </div>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full sm:w-auto bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Leave Unassigned (Shared Pool)</option>
                  {availableAgents.map(ag => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} ({ag.branch})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5 shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors text-center cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="btn-commit-import"
            disabled={!parseResult || parseResult.validRows.length === 0}
            onClick={handleCommit}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <span>
              {continuationAnalysis.matchedCount > 0 
                ? `Commit Data Continuation (${continuationAnalysis.matchedCount} Updated, ${continuationAnalysis.newCount} New)` 
                : `Commit Import (${parseResult?.validRows.length || 0} Records)`}
            </span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
