import { fileTypeFromBuffer } from 'file-type';

/** Image formats accepted for avatars, logos, icons, mission and news images. */
export const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

// file-type reports WMA/WMV as the generic ASF container.
const ASF_MIME_TYPE = 'application/vnd.ms-asf';
const ASF_MEDIA_MIME_BY_EXTENSION: Record<string, string> = {
  wma: 'audio/x-ms-wma',
  wmv: 'video/x-ms-wmv',
};

const TEXT_EXTENSIONS = new Set(['txt', 'sqf', 'sqm']);

// Markup a browser could render if the file were ever served inline.
const HTML_LIKE =
  /<\s*(?:!doctype|html|head|body|script|iframe|svg|object|embed|meta)\b/i;

export type FileLike = { buffer: Buffer; originalname?: string };

export const getFileExtension = (filename = '') => {
  const parts = filename.split('?')[0].split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

export const isMediaMimeType = (mime?: string | null) =>
  Boolean(
    mime &&
    (IMAGE_MIME_TYPES.has(mime) ||
      mime.startsWith('video/') ||
      mime.startsWith('audio/')),
  );

export const looksLikeHtml = (buffer: Buffer) =>
  HTML_LIKE.test(buffer.subarray(0, 4096).toString('utf8'));

/**
 * MIME type derived from the file content, falling back to the extension only
 * for formats without a signature (text files, PBO). Never trusts the MIME
 * type sent by the client.
 */
export async function resolveContentType(file: FileLike): Promise<string> {
  const extension = getFileExtension(file.originalname);
  const detected = await fileTypeFromBuffer(file.buffer);

  if (
    detected?.mime === ASF_MIME_TYPE &&
    ASF_MEDIA_MIME_BY_EXTENSION[extension]
  ) {
    return ASF_MEDIA_MIME_BY_EXTENSION[extension];
  }
  if (detected) {
    return detected.mime;
  }
  if (TEXT_EXTENSIONS.has(extension)) {
    return 'text/plain; charset=utf-8';
  }
  return 'application/octet-stream';
}

export async function isAllowedImageFile(file: FileLike): Promise<boolean> {
  const detected = await fileTypeFromBuffer(file.buffer);
  return Boolean(detected && IMAGE_MIME_TYPES.has(detected.mime));
}

/**
 * Chat, comment, headquarters and news attachments: images, video and audio
 * are checked by signature; PBO and text files have no signature and are
 * accepted by extension, text only if it does not contain markup.
 */
export async function isAllowedAttachmentFile(
  file: FileLike,
): Promise<boolean> {
  const extension = getFileExtension(file.originalname);
  const detected = await fileTypeFromBuffer(file.buffer);

  if (detected) {
    return (
      isMediaMimeType(detected.mime) ||
      (detected.mime === ASF_MIME_TYPE &&
        extension in ASF_MEDIA_MIME_BY_EXTENSION)
    );
  }

  if (extension === 'pbo') {
    return true;
  }

  return TEXT_EXTENSIONS.has(extension) && !looksLikeHtml(file.buffer);
}

/**
 * Object headers for MinIO: media is served inline with its real type so
 * previews keep working; everything else is always downloaded.
 */
export function buildStorageHeaders(
  contentType: string,
  originalName = 'file',
) {
  const headers: Record<string, string> = { 'Content-Type': contentType };

  if (!isMediaMimeType(contentType.split(';')[0].trim())) {
    headers['Content-Disposition'] =
      `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`;
  }

  return headers;
}
