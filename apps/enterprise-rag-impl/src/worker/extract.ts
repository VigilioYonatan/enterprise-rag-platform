import { env } from '../config/env';

export function boundedText(text: string): string {
  const bytes = Buffer.byteLength(text, 'utf8');
  // A silent truncation invents completeness: reject instead of losing citations invisibly.
  if (bytes > 200_000) {
    throw new Error('Extracted document text exceeds 200 KB safety limit');
  }
  return text;
}

/** All supplied content is untrusted. No HTML rendering, scripts, macros, formulas or embedded URLs are executed. */
export async function extractText(file: Buffer, name: string): Promise<string> {
  const lower = name.toLowerCase();
  if (/\.(txt|md)$/.test(lower)) {
    if (file.includes(0)) {
      throw new Error('Binary data in text upload');
    }
    return boundedText(file.toString('utf8'));
  }
  if (lower.endsWith('.pdf')) {
    if (file.subarray(0, 5).toString() !== '%PDF-') {
      throw new Error('Invalid PDF signature');
    }
    // pdf-parse 1.x; cap pages and text output on the worker's resource-limited process.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const parse = require('pdf-parse') as (
      buf: Buffer,
      options?: { max: number },
    ) => Promise<{ text: string }>;
    const data = await parse(file, { max: 100 });
    return boundedText(data.text);
  }
  if (lower.endsWith('.docx')) {
    if (file[0] !== 0x50 || file[1] !== 0x4b) {
      throw new Error('Invalid DOCX archive signature');
    }
    const mammoth = await import('mammoth');
    const docx = await mammoth.extractRawText({ buffer: file });
    return boundedText(docx.value);
  }
  if (/\.(png|jpe?g)$/.test(lower)) {
    const png = file.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
    const jpg = file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff;
    if (!png && !jpg) {
      throw new Error('Invalid image signature');
    }
    if (!env.OCR_ENABLED) {
      throw new Error('Image OCR disabled');
    }
    const { createWorker } = await import('tesseract.js');
    // Offline-safe configuration: never fetch traineddata from external CDNs or write into read-only /app.
    const worker = await createWorker('spa', 1, {
      langPath: env.OCR_LANG_PATH,
      gzip: false,
      cacheMethod: 'none',
    });
    try {
      const result = await worker.recognize(file);
      return boundedText(result.data.text);
    } finally {
      await worker.terminate();
    }
  }
  throw new Error('Unsupported document type');
}

/**
 * Splits normalized UTF-8 text by Unicode code points (preventing lone UTF-16 surrogates).
 * Defaults to `overlap = 0` for deterministic non-overlapping callers; ingestion passes `overlap = 120`.
 */
export function splitText(text: string, max = 900, overlap = 0): string[] {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .trim();
  if (!normalized) {
    return [];
  }
  const safeMax = Math.max(1, Math.trunc(max));
  const safeOverlap = Math.max(0, Math.min(Math.trunc(overlap), safeMax - 1));
  const codePoints = Array.from(normalized);

  if (safeOverlap === 0) {
    const output: string[] = [];
    for (let offset = 0; offset < codePoints.length; offset += safeMax) {
      output.push(codePoints.slice(offset, offset + safeMax).join(''));
    }
    return output;
  }

  const output: string[] = [];
  let start = 0;
  while (start < codePoints.length) {
    let end = Math.min(start + safeMax, codePoints.length);
    if (end < codePoints.length) {
      // Snap back to nearest whitespace in the tail 20% window so words aren't cut mid-token.
      const minBreak = start + Math.floor(safeMax * 0.8);
      for (let cursor = end; cursor > minBreak; cursor--) {
        if (codePoints[cursor] === ' ' || codePoints[cursor] === '\n') {
          end = cursor;
          break;
        }
      }
    }
    const slice = codePoints.slice(start, end).join('').trim();
    if (slice) {
      output.push(slice);
    }
    if (end >= codePoints.length) {
      break;
    }
    start = Math.max(start + 1, end - safeOverlap);
  }
  return output;
}
