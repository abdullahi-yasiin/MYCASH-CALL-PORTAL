import React, { useState, useRef, useEffect } from 'react';
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
  UserCheck
} from 'lucide-react';
import { 
  parseExcelOrCsvFile, 
  generateSampleExcelTemplate, 
  ParseResult, 
  ParsedRow,
  EXPECTED_HEADERS 
} from '../utils/excelParser';
import { CustomerRecord, User } from '../types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  teamMembers: User[];
  preselectedAgentId?: string;
  onCommitImport: (newRecords: CustomerRecord[], batchName: string) => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  teamMembers,
  preselectedAgentId,
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

  if (!isOpen) return null;

  // Filter team members based on supervisor scope
  const availableAgents = currentUser.role === 'SUPERVISOR'
    ? teamMembers.filter(t => t.branch === currentUser.branch || t.supervisorId === currentUser.id)
    : teamMembers;

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

    const newRecords: CustomerRecord[] = parseResult.validRows.map((row: ParsedRow, idx: number) => {
      const hasStatus = row.status && row.status !== 'Uncalled';
      return {
        id: `rec-imp-${Date.now()}-${idx}`,
        customerName: row.customerName,
        phoneNumber: row.phoneNumber,
        areaOfReg: currentUser.role === 'SUPERVISOR' ? currentUser.branch : row.areaOfReg,
        callDate: row.callDate,
        status: row.status,
        appointment: row.appointment,
        feedbackNote: row.feedbackNote,
        supervisorNote: row.supervisorNote,
        assignedAgentId: assignedAgent ? assignedAgent.id : '',
        assignedAgentName: assignedAgent ? assignedAgent.name : 'Unassigned',
        supervisorId: currentUser.role === 'SUPERVISOR' ? currentUser.id : (assignedAgent?.supervisorId || ''),
        hasBeenCalled: hasStatus,
        callCount: hasStatus ? 1 : 0,
        importedBatchId: batchId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    onCommitImport(newRecords, `${parseResult.fileName} (${newRecords.length} records)`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">Bulk Excel & CSV Import Engine</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate sm:whitespace-normal">
                Upload customer calling lists with automatic column mapping and validation
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 gap-2 animate-in fade-in">
              <div className="flex items-start sm:items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 sm:mt-0">
                  {availableAgents.find(a => a.id === selectedAgentId)?.name.slice(0, 1) || 'A'}
                </div>
                <div className="min-w-0">
                  <div className="font-bold flex items-center gap-1.5 flex-wrap">
                    <span>Targeted Calling Agent:</span>
                    <span className="text-emerald-950 font-extrabold underline decoration-emerald-400">
                      {availableAgents.find(a => a.id === selectedAgentId)?.name}
                    </span>
                    <span className="px-1.5 py-0.2 bg-emerald-200/70 text-emerald-800 rounded font-semibold text-[10px]">
                      {availableAgents.find(a => a.id === selectedAgentId)?.branch}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-700 leading-normal mt-0.5">
                    Customer records from this Excel file will be automatically assigned to this agent's calling roster.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgentId('')}
                className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold underline cursor-pointer shrink-0 self-end sm:self-auto"
              >
                Change
              </button>
            </div>
          )}

          {/* Instructions and Template Download */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl gap-2.5 sm:gap-3">
            <div className="text-xs text-blue-900 space-y-0.5">
              <div className="font-semibold">Required Excel Schema:</div>
              <div className="text-blue-700 text-[11px] sm:text-xs leading-relaxed">
                Customer Name*, Phone Number*, Area of Reg.*, Call Date, Status, Appointment, Feedback Note, Supervisor Note
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
                  ? 'border-blue-600 bg-blue-50/50 scale-[0.99]' 
                  : 'border-slate-300 hover:border-blue-400 bg-slate-50/40 hover:bg-slate-50'
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
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800">
                    {isProcessing ? 'Processing spreadsheet...' : 'Click to select or drag and drop your file here'}
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

              {/* Validation Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-base font-bold text-emerald-950">{parseResult.validRows.length}</div>
                    <div className="text-xs text-emerald-700">Valid records ready to import</div>
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
                    <div className="text-xs text-slate-500">Invalid records with errors</div>
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
                    <div className="font-semibold text-xs">Assign to Team Member (Optional):</div>
                    <div className="text-slate-500 text-[10.5px] sm:text-[11px]">Leave unassigned or designate an agent now</div>
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
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <span>Commit Import ({parseResult?.validRows.length || 0} Records)</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
