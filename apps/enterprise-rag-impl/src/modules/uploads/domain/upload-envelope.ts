import { BadRequestException } from '@nestjs/common';
import { ALLOWED_UPLOAD_EXTENSIONS, MAX_UPLOAD_BYTES } from '../const/uploads.const';
import type { UploadedMemoryFile } from '../types/uploads.type';

export { MAX_UPLOAD_BYTES, type UploadedMemoryFile };

/** Preliminary envelope check. The quarantined object is scanned by the worker before any download. */
export function validateUploadEnvelope(file: UploadedMemoryFile): void {
  if (!ALLOWED_UPLOAD_EXTENSIONS.test(file.originalname)) {
    throw new BadRequestException('Unsupported file extension');
  }
  if (file.size < 1 || file.size > MAX_UPLOAD_BYTES) {
    throw new BadRequestException('File size outside limits');
  }
  const fileBuffer = file.buffer;
  const fileExtension = file.originalname.toLowerCase().split('.').pop();
  if (fileExtension === 'pdf' && fileBuffer.subarray(0, 5).toString() !== '%PDF-') {
    throw new BadRequestException('Invalid PDF');
  }
  if (fileExtension === 'docx' && !(fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4b)) {
    throw new BadRequestException('Invalid DOCX');
  }
  if (fileExtension === 'png' && !fileBuffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
    throw new BadRequestException('Invalid PNG');
  }
  if (
    (fileExtension === 'jpg' || fileExtension === 'jpeg') &&
    !(fileBuffer[0] === 255 && fileBuffer[1] === 216 && fileBuffer[2] === 255)
  ) {
    throw new BadRequestException('Invalid JPEG');
  }
  if ((fileExtension === 'txt' || fileExtension === 'md') && fileBuffer.includes(0)) {
    throw new BadRequestException('Binary content in text file');
  }
}
