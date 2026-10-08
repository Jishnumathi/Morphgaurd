/**
 * MorphGuard AI — Metadata & Provenance Forensics Engine
 * Extracts EXIF headers, camera make/model, editing software tags,
 * and detects metadata stripping without treating missing EXIF as definitive proof.
 */

import ExifReader from 'exifreader';
import { MetadataAnalysisResult } from '../../types.js';

export function analyzeMetadata(buffer: Buffer): MetadataAnalysisResult {
  const findings: string[] = [];
  let signalScore = 0.05;

  try {
    const tags = ExifReader.load(buffer, { expanded: true });
    const exif = tags.exif || {};
    const file = tags.file || {};

    const cameraMake = exif.Make ? String(exif.Make.description || exif.Make.value) : undefined;
    const cameraModel = exif.Model ? String(exif.Model.description || exif.Model.value) : undefined;
    const softwareTag = exif.Software ? String(exif.Software.description || exif.Software.value) : undefined;
    const creationDate = exif.DateTimeOriginal ? String(exif.DateTimeOriginal.description || exif.DateTimeOriginal.value) : undefined;
    const hasGps = Boolean(tags.gps && tags.gps.Latitude);
    const colorSpace = exif.ColorSpace ? String(exif.ColorSpace.description || exif.ColorSpace.value) : undefined;

    const metadataPresent = Boolean(cameraMake || cameraModel || softwareTag || creationDate);

    if (metadataPresent) {
      findings.push('EXIF metadata structure is present.');
      if (cameraMake || cameraModel) {
        findings.push(`Camera hardware: ${cameraMake || 'Unknown'} ${cameraModel || ''}`.trim());
      }
      if (creationDate) {
        findings.push(`Capture timestamp: ${creationDate}`);
      }
      if (softwareTag) {
        findings.push(`Software processing tag detected: "${softwareTag}"`);
        // Check for known editing or AI generative tools
        const sLower = softwareTag.toLowerCase();
        if (
          sLower.includes('photoshop') ||
          sLower.includes('gimp') ||
          sLower.includes('faceapp') ||
          sLower.includes('stable diffusion') ||
          sLower.includes('midjourney') ||
          sLower.includes('affinity') ||
          sLower.includes('canva')
        ) {
          signalScore = 0.65;
          findings.push(`Elevated risk indicator: Software tag indicates desktop image editor or generative pipeline.`);
        }
      }
    } else {
      findings.push('Metadata absent or stripped.');
      findings.push('Note: Missing metadata is common across web uploads and social messaging apps; not considered sole proof of manipulation.');
      signalScore = 0.15;
    }

    return {
      signalScore,
      metadataPresent,
      cameraMake,
      cameraModel,
      softwareTag,
      creationDate,
      hasGps,
      colorSpace,
      isStripped: !metadataPresent,
      findings,
    };
  } catch (err) {
    findings.push('No parseable EXIF headers detected in image header.');
    findings.push('Metadata stripped or image saved in stripped format.');
    return {
      signalScore: 0.1,
      metadataPresent: false,
      hasGps: false,
      isStripped: true,
      findings,
    };
  }
}
