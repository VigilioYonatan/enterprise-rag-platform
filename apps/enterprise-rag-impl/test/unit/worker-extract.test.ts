import { describe, expect, it } from 'vitest';
import { boundedText, extractText, splitText } from '../../src/worker/extract';

describe('Text extraction and chunking pipeline', () => {
  it('does not create empty chunks', () => expect(splitText('  \n  ')).toEqual([]));
  it('preserves authorized content without overlap', () =>
    expect(splitText('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij']));
  it('normalizes line endings and whitespace', () => expect(splitText('a\r\nb  c', 100)).toEqual(['a\nb c']));

  it('rejects oversized text exceeding 200 KB in boundedText', () => {
    expect(boundedText('normal text')).toBe('normal text');
    const oversized = 'a'.repeat(200_001);
    expect(() => boundedText(oversized)).toThrow('Extracted document text exceeds 200 KB safety limit');
  });

  it('rejects invalid signatures and unsupported file types in extractText', async () => {
    // Null byte in text
    await expect(extractText(Buffer.from('a\0b'), 'file.txt')).rejects.toThrow('Binary data in text');

    // Invalid PDF signature
    await expect(extractText(Buffer.from('NOT_A_PDF_FILE'), 'doc.pdf')).rejects.toThrow(
      'Invalid PDF signature',
    );

    // Invalid DOCX signature
    await expect(extractText(Buffer.from('NOT_DOCX'), 'doc.docx')).rejects.toThrow(
      'Invalid DOCX archive signature',
    );

    // Invalid PNG / JPG signature
    await expect(extractText(Buffer.from('NOT_PNG'), 'image.png')).rejects.toThrow('Invalid image signature');

    // Unsupported extension
    await expect(extractText(Buffer.from('data'), 'script.sh')).rejects.toThrow('Unsupported document type');
  });

  it('handles Unicode code-point chunking with multibyte characters and overlap', () => {
    const text = 'Cláusula 1: Confidencialidad 🔒. Cláusula 2: Auditoría 📊.';
    const chunks = splitText(text, 25, 5);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toContain('Cláusula 1');
  });
});
