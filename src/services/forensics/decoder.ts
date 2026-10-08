/**
 * MorphGuard AI — Safe Image Decoder
 * Decodes JPEG / PNG into raw RGBA buffers for forensic pixel-level mathematics.
 */

import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

export interface DecodedImage {
  width: number;
  height: number;
  data: Uint8Array; // RGBA byte array, length = width * height * 4
  format: 'jpeg' | 'png' | 'webp';
  grayscale: Uint8Array; // Grayscale byte array, length = width * height
}

export function decodeImage(buffer: Buffer, format: 'jpeg' | 'png' | 'webp'): DecodedImage {
  let width = 0;
  let height = 0;
  let rgba: Uint8Array;

  if (format === 'jpeg') {
    const raw = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true });
    width = raw.width;
    height = raw.height;
    rgba = new Uint8Array(raw.data);
  } else if (format === 'png') {
    const png = PNG.sync.read(buffer);
    width = png.width;
    height = png.height;
    rgba = new Uint8Array(png.data);
  } else {
    // For WEBP or fallback, attempt jpeg decoding or handle safely
    try {
      const raw = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true });
      width = raw.width;
      height = raw.height;
      rgba = new Uint8Array(raw.data);
    } catch {
      throw new Error('Unsupported or corrupted WEBP image encoding. Please upload PNG or JPEG for full forensic analysis.');
    }
  }

  // Precompute Grayscale buffer: Y = 0.299R + 0.587G + 0.114B
  const grayscale = new Uint8Array(width * height);
  const totalPixels = width * height;
  for (let i = 0; i < totalPixels; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    grayscale[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  return {
    width,
    height,
    data: rgba,
    format,
    grayscale,
  };
}

/**
 * Encodes an RGBA buffer into a standard PNG buffer using pngjs
 */
export function encodePng(rgbaData: Uint8Array, width: number, height: number): Buffer {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height * 4; i++) {
    png.data[i] = rgbaData[i];
  }
  return PNG.sync.write(png);
}

/**
 * Converts an RGBA buffer into a base64 PNG data URL
 */
export function createPngDataUrl(rgbaData: Uint8Array, width: number, height: number): string {
  const buf = encodePng(rgbaData, width, height);
  return `data:image/png;base64,${buf.toString('base64')}`;
}
