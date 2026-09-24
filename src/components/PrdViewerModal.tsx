import React, { useState } from 'react';
import { 
  FileText, 
  X, 
  Copy, 
  Check, 
  Download, 
  Search, 
  BookOpen, 
  ShieldCheck, 
  Database, 
  Layers
} from 'lucide-react';
import { PRD_MARKDOWN } from '../data/prdDocument';

interface PrdViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrdViewerModal: React.FC<PrdViewerModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(PRD_MARKDOWN);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([PRD_MARKDOWN], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'MYCASH_CALLING_PORTAL_PRD_ARCHITECTURE.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <span>PRODUCT REQUIREMENT DOCUMENT & ARCHITECTURE SPECIFICATION</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                  Approved
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Official specification for MYCASH CALLING PORTAL (v1.0.0 Enterprise)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
              title="Copy Markdown specification"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? 'Copied Markdown' : 'Copy MD'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
              title="Download Markdown file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search within PRD & Architecture specification..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-800 leading-relaxed text-sm bg-white font-sans">
          <div className="border border-slate-200 bg-slate-50 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <ShieldCheck className="w-4 h-4 text-red-600" />
              <span><strong>RBAC Tiering:</strong> 3 Strict User Tiers</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Database className="w-4 h-4 text-blue-600" />
              <span><strong>Schema Standard:</strong> 8 Canonical Columns</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span><strong>Deduplication:</strong> Unique Call Counting</span>
            </div>
          </div>

          <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-800 bg-white leading-relaxed">
            {PRD_MARKDOWN}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>MyCash Financial Services • Tele-sales & Telemetry Architecture</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors"
          >
            Close Document
          </button>
        </div>
      </div>
    </div>
  );
};
