import { describe, expect, it } from 'vitest';
import { validateUploadEnvelope } from '../../src/modules/uploads/presentation/http/controllers/uploads.controller';

function file(name: string, data: Buffer) {
  return { originalname: name, buffer: data, size: data.length };
}
describe('upload envelope safety', () => {
  it('rejects unsupported extension', () =>
    expect(() => validateUploadEnvelope(file('virus.exe', Buffer.from('abc')))).toThrow());
  it('rejects empty payload', () =>
    expect(() => validateUploadEnvelope(file('empty.txt', Buffer.alloc(0)))).toThrow());
  it('rejects invalid PDF magic', () =>
    expect(() => validateUploadEnvelope(file('spoof.pdf', Buffer.from('notpdf')))).toThrow());
  it('accepts valid minimal UTF8 text envelope', () =>
    expect(() => validateUploadEnvelope(file('source.txt', Buffer.from('hello world')))).not.toThrow());
  it('rejects NUL byte in text', () =>
    expect(() => validateUploadEnvelope(file('binary.md', Buffer.from([65, 0, 66])))).toThrow());
});
