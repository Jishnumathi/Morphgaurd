/**
 * MorphGuard AI — Cryptographic Integrity & File Signature Validation
 */

import { createHash } from 'crypto';

export interface FileValidationResult {
  valid: boolean;
  format: 'jpeg' | 'png' | 'webp' | 'unknown';
  mimeType: string;
  sha256: string;
  error?: string;
}

export function computeSha256(buffer: Buffer | Uint8Array): string {
  const hash = createHash('sha256');
  hash.update(buffer);
  return hash.digest('hex');
}

export function validateFileSignature(buffer: Buffer): FileValidationResult {
  const sha256 = computeSha256(buffer);

  if (buffer.length < 8) {
    return {
      valid: false,
      format: 'unknown',
      mimeType: 'application/octet-stream',
      sha256,
      error: 'File is too small to be a valid image.',
    };
  }

  // Check JPEG signature: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return {
      valid: true,
      format: 'jpeg',
      mimeType: 'image/jpeg',
      sha256,
    };
  }

  // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return {
      valid: true,
      format: 'png',
      mimeType: 'image/png',
      sha256,
    };
  }

  // Check WEBP signature: "RIFF" .... "WEBP"
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return {
      valid: true,
      format: 'webp',
      mimeType: 'image/webp',
      sha256,
    };
  }

  return {
    valid: false,
    format: 'unknown',
    mimeType: 'application/octet-stream',
    sha256,
    error: 'Unsupported or unverified image file signature. Allowed: JPEG, PNG, WEBP.',
  };
}
