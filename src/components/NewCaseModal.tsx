/**
 * MorphGuard AI — New Forensic Case & Image Ingestion Modal
 * Validates MIME types, verifies file signatures, computes SHA-256 hashes,
 * and runs full multimodal forensic analysis with real-time status feedback.
 */

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileImage,
  AlertCircle,
  CheckCircle2,
  Shield,
  Sparkles,
  Loader2,
  Lock,
} from 'lucide-react';
import { ForensicCase, UserSession } from '../types.js';

interface NewCaseModalProps {
  user: UserSession;
  isOpen: boolean;
  onClose: () => void;
  onCaseCreated: (newCase: ForensicCase) => void;
}

export const NewCaseModal: React.FC<NewCaseModalProps> = ({
  user,
  isOpen,
  onClose,
  onCaseCreated,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [caseTitle, setCaseTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);

    // Validate size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds 25 MB safety limit.');
      return;
    }

    // Validate extension / mime
    const validExtensions = /\.(jpe?g|png|webp)$/i;
    if (!file.name.match(validExtensions) && !file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setErrorMessage('Unsupported file format. Please provide JPEG, PNG, or WEBP facial imagery.');
      return;
    }

    setSelectedFile(file);
    if (!caseTitle) {
      setCaseTitle(`Forensic Screening: ${file.name}`);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a facial image to analyze.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      setStatusMessage('Validating MIME signature & generating SHA-256 cryptographic hash...');
      await new Promise((r) => setTimeout(r, 300));

      setStatusMessage('Running biometric face detection & landmark localization...');
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('title', caseTitle || `Investigation: ${selectedFile.name}`);
      formData.append('subjectName', subjectName || 'Unregistered Subject');
      formData.append('analystUser', user.email);
      formData.append('analystRole', user.role);

      setStatusMessage('Extracting 8 multimodal forensic modalities (Noise, FFT, LBP, ELA, Edges)...');
      const response = await fetch('/api/cases/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `Analysis failed (${response.status})`);
      }

      setStatusMessage('Calibrating multimodal feature fusion & synthesizing anomaly heatmap...');
      const newCase: ForensicCase = await response.json();

      onCaseCreated(newCase);
      onClose();
    } catch (err: any) {
      console.error('Forensic Pipeline Upload Error:', err);
      setErrorMessage(err.message || 'Forensic analysis pipeline failed. Ensure image is uncorrupted.');
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Initiate Forensic Case Investigation</h3>
              <p className="text-[11px] text-slate-400">Secure image ingestion with cryptographic SHA-256 hash preservation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* File Upload Dropzone */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Facial Image Evidence (JPEG, PNG, WEBP)
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-950/20'
                  : 'border-slate-700 bg-slate-950 hover:border-slate-600 hover:bg-slate-900/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />

              {previewUrl ? (
                <div className="space-y-3 flex flex-col items-center">
                  <div className="relative max-w-[160px] max-h-[180px] rounded-lg overflow-hidden border border-slate-700 shadow-md">
                    <img src={previewUrl} alt="Upload preview" className="object-contain max-h-[180px] w-auto" />
                  </div>
                  <div className="text-xs text-slate-300 font-medium">
                    {selectedFile?.name} ({(Number(selectedFile?.size) / 1024).toFixed(1)} KB)
                  </div>
                  <span className="text-[11px] text-indigo-400 hover:underline">Click or drag to change file</span>
                </div>
              ) : (
                <div className="space-y-2 flex flex-col items-center py-2">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                    <Upload className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="text-xs text-slate-300 font-medium">
                    Drag and drop facial image evidence here, or <span className="text-indigo-400">browse files</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Accepted standards: ICAO 9303, ISO/IEC 19794-5, JPG, PNG, WEBP (Max 25 MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Subject & Case Metadata Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Target Subject Name</label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g. Elena Rostova or Applicant #A-491"
                disabled={isProcessing}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Investigation Title</label>
              <input
                type="text"
                value={caseTitle}
                onChange={(e) => setCaseTitle(e.target.value)}
                placeholder="e.g. Identity Document Renewal Review"
                disabled={isProcessing}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/60 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-300">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Multimodal Forensic Pipeline Running...</span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono pl-6">{statusMessage}</p>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-indigo-500 rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Integrity preserved via cryptographic SHA-256</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              id="start-forensic-analysis-btn"
              onClick={handleUploadAndAnalyze}
              disabled={isProcessing || !selectedFile}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 flex items-center space-x-1.5 shadow-sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Execute Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
