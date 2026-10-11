import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  AlertTriangle,
  X,
  Download,
  Check,
  Users,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Building2,
  Trash2,
  Plus,
  RefreshCw,
  Sparkles,
  AlertCircle,
  FileCode,
  Info
} from 'lucide-react';
import { User, UserRole, BranchInfo, ActivityLog } from '../types';
import {
  parseUserFile,
  ParsedUserRow,
  UserFileParseResult,
  downloadSampleUserExcelTemplate,
  downloadSampleUserTextGuide,
  validateUserRow
} from '../utils/userFileParser';
import { supabaseDb } from '../lib/supabase';
import { GoogleGenAI } from '@google/genai';

interface BulkUserImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  allUsers: User[];
  branches: BranchInfo[];
  onCommitBulkUsers: (importedUsers: User[], auditDetails: string) => Promise<boolean>;
}

export const BulkUserImportModal: React.FC<BulkUserImportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  branches,
  onCommitBulkUsers,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [parseResult, setParseResult] = useState<UserFileParseResult | null>(null);
  const [rows, setRows] = useState<ParsedUserRow[]>([]);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Configuration options
  const [defaultBranch, setDefaultBranch] = useState<string>(branches[0]?.name || 'Headquarters');
  const [defaultRole, setDefaultRole] = useState<UserRole>('TEAM_MEMBER');
  const [updateExistingUsers, setUpdateExistingUsers] = useState<boolean>(true);
  const [filterTab, setFilterTab] = useState<'all' | 'valid' | 'duplicates' | 'errors'>('all');
  const [isAiRefining, setIsAiRefining] = useState<boolean>(false);

  // Reset when opening/closing
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setParseResult(null);
      setRows([]);
      setRawFile(null);
      setFilterTab('all');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Strict Security Check: ONLY HQ User Admin can access bulk user import
  if (currentUser.role !== 'HQ_ADMIN') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border border-red-200">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Restricted Access</h3>
          <p className="text-sm text-slate-600 mb-6">
            Bulk User Import is strictly reserved for Headquarters (HQ) User Administrators only.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  const supervisors = allUsers.filter(u => u.role === 'SUPERVISOR' && u.active);

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
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleProcessFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setRawFile(file);

    try {
      const result = await parseUserFile(file, branches, allUsers, defaultBranch, defaultRole);
      setParseResult(result);
      setRows([...result.validRows, ...result.invalidRows]);
    } catch (err: any) {
      console.error('[Bulk User Import] Parse Error:', err);
      setErrorMessage(
        err?.message ||
          'Failed to parse the file. Please ensure it is a valid Excel (.xlsx, .xls), Word Doc (.docx, .doc), or PDF (.pdf).'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Re-validate all rows when default branch or default role changes
  const handleReapplyDefaults = () => {
    if (rows.length === 0) return;
    const revalidated = rows.map((r, idx) =>
      validateUserRow(
        {
          rowNumber: idx + 1,
          name: r.name,
          email: r.email,
          phone: r.phone,
          role: r.role,
          branch: r.branch || defaultBranch,
          supervisor: r.supervisorName,
        },
        branches,
        allUsers,
        defaultBranch,
        defaultRole
      )
    );
    setRows(revalidated);
  };

  // Inline row updates
  const handleUpdateRowField = (idx: number, field: keyof ParsedUserRow, value: any) => {
    setRows(prev => {
      const copy = [...prev];
      const target = { ...copy[idx], [field]: value };

      // Re-validate this row
      const validated = validateUserRow(
        {
          rowNumber: target.rowNumber,
          name: target.name,
          email: target.email,
          phone: target.phone,
          role: target.role,
          branch: target.branch,
          supervisor: target.supervisorName,
        },
        branches,
        allUsers,
        defaultBranch,
        defaultRole
      );

      copy[idx] = validated;
      return copy;
    });
  };

  // Delete single row from preview
  const handleDeleteRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  // Add empty row manually
  const handleAddManualRow = () => {
    const newRow = validateUserRow(
      {
        rowNumber: rows.length + 1,
        name: '',
        email: '',
        phone: '+252 61 ',
        role: defaultRole,
        branch: defaultBranch,
      },
      branches,
      allUsers,
      defaultBranch,
      defaultRole
    );
    setRows(prev => [...prev, newRow]);
  };

  // Optional Gemini AI extraction enhancement for unstructured PDF / Doc
  const handleAiSmartExtraction = async () => {
    if (!parseResult?.rawTextPreview && rows.length > 0) return;
    setIsAiRefining(true);
    setErrorMessage(null);

    try {
      const apiKey =
        (import.meta as any).env?.VITE_GEMINI_API_KEY ||
        (typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : '') ||
        '';

      if (!apiKey) {
        throw new Error('Gemini API key is not configured for AI text parsing.');
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are a data extraction assistant for an enterprise telecom call center portal.
Analyze this document snippet and extract every personnel/user record.
Return a STRICT JSON array of objects:
[
  {
    "name": "Full Name",
    "email": "user@email.com",
    "phone": "+25261...",
    "role": "TEAM_MEMBER" | "SUPERVISOR" | "HQ_ADMIN",
    "branch": "Branch Name in Somalia",
    "supervisorName": "Supervisor Name if specified"
  }
]

Document Text:
${parseResult?.rawTextPreview || ''}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const extracted = JSON.parse(response.text || '[]');
      if (Array.isArray(extracted) && extracted.length > 0) {
        const aiRows = extracted.map((item: any, idx: number) =>
          validateUserRow(
            {
              rowNumber: idx + 1,
              name: item.name || '',
              email: item.email || '',
              phone: item.phone || '',
              role: item.role || defaultRole,
              branch: item.branch || defaultBranch,
              supervisor: item.supervisorName,
            },
            branches,
            allUsers,
            defaultBranch,
            defaultRole
          )
        );
        setRows(aiRows);
      } else {
        throw new Error('AI could not identify structured personnel rows in this snippet.');
      }
    } catch (err: any) {
      setErrorMessage(`AI Extraction Notice: ${err?.message || 'Failed to refine with AI'}`);
    } finally {
      setIsAiRefining(false);
    }
  };

  // Submit and commit users
  const handleCommit = async () => {
    const validRows = rows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setErrorMessage('No valid user accounts to import. Please review and resolve row errors.');
      return;
    }

    // Filter out duplicates if updateExistingUsers is false
    const rowsToProcess = updateExistingUsers
      ? validRows
      : validRows.filter(r => !r.isDuplicate);

    if (rowsToProcess.length === 0) {
      setErrorMessage('All valid accounts are duplicates and "Update existing users" is toggled off.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Build User models
      const usersToCommit: User[] = rowsToProcess.map((r, idx) => {
        const existing = allUsers.find(u => u.email.toLowerCase() === r.email.toLowerCase());
        return {
          id: existing ? existing.id : `u-bulk-${Date.now()}-${idx}`,
          name: r.name.trim(),
          email: r.email.trim().toLowerCase(),
          phone: r.phone.trim() || '+252 61 0000000',
          role: r.role,
          branch: r.branch || defaultBranch,
          supervisorId: r.role === 'TEAM_MEMBER' ? r.supervisorId : undefined,
          active: true,
          password: existing?.password || 'amal123',
          mustChangePassword: existing ? existing.mustChangePassword : true,
          customPermissions: existing?.customPermissions,
        };
      });

      const agentsCount = usersToCommit.filter(u => u.role === 'TEAM_MEMBER').length;
      const supervisorsCount = usersToCommit.filter(u => u.role === 'SUPERVISOR').length;
      const adminsCount = usersToCommit.filter(u => u.role === 'HQ_ADMIN').length;

      const auditDetails = `Bulk imported ${usersToCommit.length} user account(s) from "${rawFile?.name || 'document'}" (${agentsCount} agents, ${supervisorsCount} supervisors, ${adminsCount} HQ admins).`;

      const success = await onCommitBulkUsers(usersToCommit, auditDetails);

      if (success) {
        setSuccessMessage(
          `Successfully imported and registered ${usersToCommit.length} user accounts (${agentsCount} Calling Agents, ${supervisorsCount} Supervisors, ${adminsCount} HQ Admins).`
        );
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setErrorMessage('Database rejected bulk user transaction. Please review Supabase cloud logs.');
      }
    } catch (err: any) {
      console.error('[Bulk User Import] Submission error:', err);
      setErrorMessage(err?.message || 'Unexpected failure during bulk user import transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered rows for preview table
  const displayedRows = rows.filter(r => {
    if (filterTab === 'valid') return r.isValid && !r.isDuplicate;
    if (filterTab === 'duplicates') return r.isDuplicate;
    if (filterTab === 'errors') return !r.isValid;
    return true;
  });

  const validCount = rows.filter(r => r.isValid && !r.isDuplicate).length;
  const duplicateCount = rows.filter(r => r.isDuplicate).length;
  const errorCount = rows.filter(r => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-md shrink-0">
              <UploadCloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-lg font-bold text-white tracking-tight">
                  HQ Admin Bulk User Import
                </h2>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-bold bg-red-500/30 text-red-200 border border-red-500/40 rounded-full">
                  HQ Admin Only
                </span>
              </div>
              <p className="text-[10px] text-slate-300">
                Batch provision Calling Agents, Supervisors, and HQ Admins via Excel, Word Doc, or PDF.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Top Info Banner & Sample Download Links */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-slate-700 space-y-0.5">
                <span className="font-bold text-slate-900">Supported File Formats:</span>
                <p className="text-[11px] text-slate-600">
                  <strong className="text-slate-800">Excel</strong> (.xlsx, .xls),{' '}
                  <strong className="text-slate-800">Word Document</strong> (.docx, .doc),{' '}
                  <strong className="text-slate-800">PDF</strong> (.pdf), and{' '}
                  <strong className="text-slate-800">CSV/Text</strong> (.csv, .txt).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={downloadSampleUserExcelTemplate}
                className="flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                title="Download ready-to-fill Excel template"
              >
                <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                <span>Excel Template</span>
              </button>

              <button
                type="button"
                onClick={downloadSampleUserTextGuide}
                className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                title="Download Doc / PDF column format guide"
              >
                <FileText className="w-3 h-3 text-blue-600" />
                <span>Doc/PDF Guide</span>
              </button>
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 flex items-start gap-3 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold">Import Notice</div>
                <div className="text-[11px] text-rose-700 mt-0.5">{errorMessage}</div>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center gap-3 text-xs animate-in fade-in">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex-1 font-bold text-emerald-900">{successMessage}</div>
            </div>
          )}

          {/* Upload Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-red-500 bg-red-50/60 scale-[1.01]'
                : rawFile
                ? 'border-emerald-400 bg-emerald-50/30'
                : 'border-slate-300 hover:border-red-400 hover:bg-slate-50/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.docx,.doc,.pdf,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/pdf,text/csv,text/plain"
              className="hidden"
              onChange={handleFileChange}
            />

            {isProcessing ? (
              <div className="flex flex-col items-center justify-center py-4">
                <RefreshCw className="w-8 h-8 text-red-600 animate-spin mb-3" />
                <p className="font-bold text-slate-800 text-sm">
                  Extracting and validating personnel accounts...
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Parsing columns, roles, and Somalian phone/branch mappings
                </p>
              </div>
            ) : rawFile && parseResult ? (
              <div className="flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                  {parseResult.fileType === 'excel' || parseResult.fileType === 'csv' ? (
                    <FileSpreadsheet className="w-6 h-6" />
                  ) : parseResult.fileType === 'pdf' ? (
                    <FileText className="w-6 h-6" />
                  ) : (
                    <FileCode className="w-6 h-6" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900 text-sm">{rawFile.name}</p>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-slate-200 text-slate-800">
                    {parseResult.fileType}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {(rawFile.size / 1024).toFixed(1)} KB • {rows.length} total users parsed
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[11px] text-blue-600 font-semibold hover:underline">
                    Click to change or replace file
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6 text-red-600" />
                </div>
                <p className="font-bold text-slate-900 text-sm sm:text-base">
                  Drag & drop your User File here, or click to browse
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Accepts <span className="font-semibold text-slate-700">Excel</span> (.xlsx, .xls, .csv),{' '}
                  <span className="font-semibold text-slate-700">Word</span> (.docx, .doc), or{' '}
                  <span className="font-semibold text-slate-700">PDF</span> (.pdf)
                </p>
                <div className="flex items-center gap-2 mt-4 text-[11px] font-medium text-slate-500">
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md">Full Name</span>
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md">Email</span>
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md">Role</span>
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md">Branch</span>
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md">Supervisor</span>
                </div>
              </div>
            )}
          </div>

          {/* Import Settings & Fallback Overrides */}
          {rows.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  Default Fallback Assignments (when missing in document):
                </span>
                {parseResult?.rawTextPreview && (
                  <button
                    type="button"
                    onClick={handleAiSmartExtraction}
                    disabled={isAiRefining}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                    title="Use Gemini AI to smartly parse unstructured text from PDF/Doc"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isAiRefining ? 'animate-spin' : ''}`} />
                    <span>{isAiRefining ? 'AI Refining...' : 'AI Smart Extract'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Default Branch:
                  </label>
                  <select
                    value={defaultBranch}
                    onChange={e => {
                      setDefaultBranch(e.target.value);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.name}>
                        {b.name} ({b.region})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Default Role Tier:
                  </label>
                  <select
                    value={defaultRole}
                    onChange={e => {
                      setDefaultRole(e.target.value as UserRole);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                  >
                    <option value="TEAM_MEMBER">Calling Agent (Team Member)</option>
                    <option value="SUPERVISOR">Branch Supervisor (Manager)</option>
                    <option value="HQ_ADMIN">HQ Administrator</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={updateExistingUsers}
                      onChange={e => setUpdateExistingUsers(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5"
                    />
                    <span className="text-[11px] font-bold text-slate-800">
                      Update existing accounts with same email
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* User Preview Table */}
          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setFilterTab('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                      filterTab === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Users ({rows.length})
                  </button>

                  <button
                    onClick={() => setFilterTab('valid')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                      filterTab === 'valid'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <CheckCircle className="w-3 h-3" />
                    <span>New Ready ({validCount})</span>
                  </button>

                  <button
                    onClick={() => setFilterTab('duplicates')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                      filterTab === 'duplicates'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Existing ({duplicateCount})</span>
                  </button>

                  {errorCount > 0 && (
                    <button
                      onClick={() => setFilterTab('errors')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                        filterTab === 'errors'
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      }`}
                    >
                      <AlertCircle className="w-3 h-3" />
                      <span>Errors ({errorCount})</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddManualRow}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Add Row</span>
                  </button>
                </div>
              </div>

              {/* Table Container */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 text-[11px] font-bold sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3 min-w-[140px]">Full Name*</th>
                        <th className="py-2.5 px-3 min-w-[170px]">Email Address*</th>
                        <th className="py-2.5 px-3 min-w-[120px]">Phone</th>
                        <th className="py-2.5 px-3 min-w-[130px]">Role Tier</th>
                        <th className="py-2.5 px-3 min-w-[140px]">Branch</th>
                        <th className="py-2.5 px-3 min-w-[130px]">Supervisor</th>
                        <th className="py-2.5 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {displayedRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No users in this view.
                          </td>
                        </tr>
                      ) : (
                        displayedRows.map((r, idx) => {
                          const realIdx = rows.findIndex(row => row === r);
                          return (
                            <tr
                              key={`user-row-${realIdx}`}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                !r.isValid
                                  ? 'bg-rose-50/40'
                                  : r.isDuplicate
                                  ? 'bg-amber-50/40'
                                  : ''
                              }`}
                            >
                              {/* Row index & status indicator */}
                              <td className="py-2 px-3 text-center">
                                <div className="flex items-center justify-center">
                                  {!r.isValid ? (
                                    <span
                                      title={r.errors.join(', ')}
                                      className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[10px] font-bold"
                                    >
                                      !
                                    </span>
                                  ) : r.isDuplicate ? (
                                    <span
                                      title="Account already exists. Will update."
                                      className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold"
                                    >
                                      U
                                    </span>
                                  ) : (
                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                  )}
                                </div>
                              </td>

                              {/* Full Name */}
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={r.name}
                                  onChange={e =>
                                    handleUpdateRowField(realIdx, 'name', e.target.value)
                                  }
                                  placeholder="Full Name"
                                  className={`w-full px-2 py-1 bg-transparent border rounded text-xs font-semibold ${
                                    !r.name ? 'border-rose-400 bg-rose-50/50' : 'border-transparent hover:border-slate-300 focus:border-blue-500'
                                  }`}
                                />
                              </td>

                              {/* Email Address */}
                              <td className="py-2 px-3">
                                <input
                                  type="email"
                                  value={r.email}
                                  onChange={e =>
                                    handleUpdateRowField(realIdx, 'email', e.target.value)
                                  }
                                  placeholder="user@amal.com"
                                  className={`w-full px-2 py-1 bg-transparent border rounded text-xs ${
                                    r.errors.some(e => e.includes('email'))
                                      ? 'border-rose-400 bg-rose-50/50 text-rose-700 font-semibold'
                                      : 'border-transparent hover:border-slate-300 focus:border-blue-500 font-medium'
                                  }`}
                                />
                              </td>

                              {/* Phone */}
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={r.phone}
                                  onChange={e =>
                                    handleUpdateRowField(realIdx, 'phone', e.target.value)
                                  }
                                  placeholder="+252 61 0000000"
                                  className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded text-xs font-mono"
                                />
                              </td>

                              {/* Role */}
                              <td className="py-2 px-3">
                                <select
                                  value={r.role}
                                  onChange={e =>
                                    handleUpdateRowField(realIdx, 'role', e.target.value as UserRole)
                                  }
                                  className="w-full px-2 py-1 bg-transparent border border-slate-200 rounded text-[11px] font-bold text-slate-800"
                                >
                                  <option value="TEAM_MEMBER">Calling Agent</option>
                                  <option value="SUPERVISOR">Supervisor</option>
                                  <option value="HQ_ADMIN">HQ Admin</option>
                                </select>
                              </td>

                              {/* Branch */}
                              <td className="py-2 px-3">
                                <select
                                  value={r.branch}
                                  onChange={e =>
                                    handleUpdateRowField(realIdx, 'branch', e.target.value)
                                  }
                                  className="w-full px-2 py-1 bg-transparent border border-slate-200 rounded text-[11px] font-medium text-slate-800"
                                >
                                  <option value="Headquarters">Headquarters</option>
                                  {branches.map(b => (
                                    <option key={b.id} value={b.name}>
                                      {b.name}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* Supervisor */}
                              <td className="py-2 px-3">
                                {r.role === 'TEAM_MEMBER' ? (
                                  <select
                                    value={r.supervisorId || ''}
                                    onChange={e => {
                                      const sup = supervisors.find(s => s.id === e.target.value);
                                      handleUpdateRowField(realIdx, 'supervisorId', sup?.id);
                                      handleUpdateRowField(realIdx, 'supervisorName', sup?.name);
                                    }}
                                    className="w-full px-2 py-1 bg-transparent border border-slate-200 rounded text-[11px] text-slate-700"
                                  >
                                    <option value="">-- Unassigned --</option>
                                    {supervisors.map(s => (
                                      <option key={s.id} value={s.id}>
                                        {s.name} ({s.branch.split(' ')[0]})
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic px-2">N/A</span>
                                )}
                              </td>

                              {/* Delete button */}
                              <td className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(realIdx)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                                  title="Remove row from batch"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Summary & Commit Button */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            {rows.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{rows.length} Total Users</span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-700 font-semibold">{validCount} New</span>
                <span className="text-slate-300">•</span>
                <span className="text-amber-700 font-semibold">{duplicateCount} Existing</span>
                {errorCount > 0 && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-rose-700 font-semibold">{errorCount} Invalid</span>
                  </>
                )}
              </div>
            ) : (
              <span>Upload an Excel, Word Doc, or PDF document to begin.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              id="btn-commit-bulk-user-import"
              onClick={handleCommit}
              disabled={isSubmitting || rows.length === 0 || rows.filter(r => r.isValid).length === 0}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-lg text-[10px] font-bold shadow-md transition-all ${
                isSubmitting || rows.length === 0 || rows.filter(r => r.isValid).length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : 'bg-red-600 hover:bg-red-700 text-white cursor-pointer active:scale-95 shadow-red-600/20'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Committing to Database...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>
                    Commit Import ({rows.filter(r => r.isValid).length} Users)
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
