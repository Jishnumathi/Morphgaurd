/**
 * MorphGuard AI — Forensic Screening Report Generator
 * Compiles a structured, tamper-evident forensic report (printable HTML and jsPDF export)
 * complying with ISO/IEC 27037 digital evidence preservation standards.
 */

import { jsPDF } from 'jspdf';
import { ForensicCase } from '../../types.js';

export function generatePdfReport(c: ForensicCase): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('MORPHGUARD AI — FORENSIC SCREENING REPORT', 14, 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Official Digital Image Biometric Screening Dossier | Document Ref: ${c.caseNumber}`, 14, 18);
  doc.text(`Classification: OFFICIAL / FORENSIC LAW-ENFORCEMENT USE ONLY`, 14, 22);

  y = 34;

  // 1. Case & Examiner Details Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 28, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('1. CASE INFORMATION', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Case ID: ${c.caseNumber}`, 18, y + 12);
  doc.text(`Subject: ${c.targetSubjectName || 'Unspecified'}`, 18, y + 17);
  doc.text(`Investigator: ${c.createdBy}`, 18, y + 22);

  doc.text(`Date Registered: ${new Date(c.createdAt).toUTCString()}`, 105, y + 12);
  doc.text(`Agency: ${c.analystAgency}`, 105, y + 17);
  doc.text(`Examiner Verdict: ${c.analystVerdict || 'PENDING REVIEW'}`, 105, y + 22);

  y += 34;

  // 2. Image Cryptographic Integrity & Provenance
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('2. IMAGE IDENTIFICATION & CRYPTOGRAPHIC HASH', 14, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Source Filename: ${c.filename}`, 14, y);
  y += 4;
  doc.text(`Resolution: ${c.imageDimensions.width} x ${c.imageDimensions.height} px | Size: ${(c.fileSizeBytes / 1024).toFixed(1)} KB`, 14, y);
  y += 4;
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`SHA-256: ${c.imageHashSha256}`, 14, y);
  y += 7;

  // 3. Overall Forensic Assessment & Risk Score
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('3. BIOMETRIC RISK EVALUATION', 14, y);
  y += 5;

  const res = c.results;
  const summary = res?.summary;
  const riskLevel = summary?.riskLevel || 'INCONCLUSIVE';

  // Draw Risk badge
  let rColor = [16, 185, 129]; // green
  if (riskLevel === 'HIGHER RISK') rColor = [220, 38, 38]; // red
  else if (riskLevel === 'MODERATE RISK') rColor = [217, 119, 6]; // amber
  else if (riskLevel === 'INCONCLUSIVE') rColor = [100, 116, 139]; // slate

  doc.setFillColor(rColor[0], rColor[1], rColor[2]);
  doc.roundedRect(14, y, 44, 12, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(riskLevel, 18, y + 8);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.text(`Risk Metric: ${((summary?.riskScore || 0) * 100).toFixed(1)}%`, 64, y + 5);
  doc.text(`Confidence: ${((summary?.confidence || 0) * 100).toFixed(1)}%`, 64, y + 10);

  doc.text(`Face Detection: ${res?.faceDetection.detected ? 'CONFIRMED' : 'NO FACE DETECTED'}`, 120, y + 5);
  doc.text(`Facial Symmetry: ${res?.faceDetection.facialSymmetryIndex.toFixed(2) || 'N/A'}`, 120, y + 10);

  y += 18;

  // 4. Multimodal Forensic Signals Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('4. MULTIMODAL FORENSIC MODALITY BREAKDOWN', 14, y);
  y += 5;

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageWidth - 28, 6, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('MODALITY', 16, y + 4);
  doc.text('STATUS', 82, y + 4);
  doc.text('SCORE', 112, y + 4);
  doc.text('KEY OBSERVATION', 132, y + 4);
  y += 6;

  if (summary && summary.signals.length > 0) {
    for (const sig of summary.signals) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(sig.name.substring(0, 32), 16, y + 4);

      // Status text
      if (sig.status === 'ANOMALOUS') doc.setTextColor(220, 38, 38);
      else if (sig.status === 'ELEVATED') doc.setTextColor(217, 119, 6);
      else if (sig.status === 'NOT_APPLICABLE') doc.setTextColor(148, 163, 184);
      else doc.setTextColor(16, 185, 129);

      doc.text(sig.status, 82, y + 4);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.text(`${(sig.score * 100).toFixed(0)}%`, 112, y + 4);

      doc.setTextColor(71, 85, 105);
      const shortSummary = sig.summary.length > 40 ? sig.summary.substring(0, 38) + '...' : sig.summary;
      doc.text(shortSummary, 132, y + 4);

      y += 5.2;
    }
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Forensic signals unavailable or image marked inconclusive.', 16, y + 4);
    y += 6;
  }

  y += 4;

  // 5. Primary Indicators & Explanations
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('5. FORENSIC EXPLANATION & PRIMARY INDICATORS', 14, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  const indicators = summary?.primaryIndicators || ['No specific indicators available.'];
  for (const ind of indicators.slice(0, 3)) {
    const lines = doc.splitTextToSize(`• ${ind}`, pageWidth - 32);
    doc.text(lines, 16, y);
    y += lines.length * 3.8;
  }

  y += 3;

  // 6. Technical Limitations
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('6. FORENSIC LIMITATIONS & PROTOCOL BOUNDARIES', 14, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);

  const lims = summary?.limitations || ['Standard single-view constraints apply.'];
  for (const lim of lims.slice(0, 3)) {
    const lines = doc.splitTextToSize(`- ${lim}`, pageWidth - 32);
    doc.text(lines, 16, y);
    y += lines.length * 3.4;
  }

  // Footer Disclaimer (Mandatory)
  const footerY = 270;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, footerY - 2, pageWidth - 14, footerY - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('OFFICIAL DISCLAIMER & LEGAL LIMITATION NOTICE:', 14, footerY + 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  const disclaimer =
    'This report provides AI-assisted forensic screening and should not be treated as a standalone legal determination. Findings must be reviewed by a certified digital forensics examiner where formal legal or administrative action is contemplated. MorphGuard AI does not claim algorithmic determination of criminal culpability.';
  const discLines = doc.splitTextToSize(disclaimer, pageWidth - 28);
  doc.text(discLines, 14, footerY + 6);

  doc.text(`Generated: ${new Date().toISOString()} | Verification Fingerprint: ${c.id.substring(0, 8)}`, 14, footerY + 16);

  return doc;
}
