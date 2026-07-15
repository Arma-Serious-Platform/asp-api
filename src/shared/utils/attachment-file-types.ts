export const ATTACHMENT_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'] as const;
export const ATTACHMENT_VIDEO_EXTENSIONS = [
  'mp4',
  'webm',
  'mov',
  'ogg',
  'ogv',
  'avi',
  'mkv',
  'm4v',
  'wmv',
  'flv',
  '3gp',
] as const;
export const ATTACHMENT_AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'opus'] as const;
export const ATTACHMENT_GAME_EXTENSIONS = ['pbo'] as const;
export const ATTACHMENT_TEXT_EXTENSIONS = ['txt', 'sqf', 'sqm'] as const;

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/jpg',
]);

export const getAttachmentFileExtension = (filename: string): string => {
  const cleanValue = filename.split('?')[0];
  const parts = cleanValue.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

export const isAllowedAttachmentExtension = (extension: string): boolean => {
  const ext = extension.toLowerCase();

  return (
    (ATTACHMENT_IMAGE_EXTENSIONS as readonly string[]).includes(ext) ||
    (ATTACHMENT_VIDEO_EXTENSIONS as readonly string[]).includes(ext) ||
    (ATTACHMENT_AUDIO_EXTENSIONS as readonly string[]).includes(ext) ||
    (ATTACHMENT_GAME_EXTENSIONS as readonly string[]).includes(ext) ||
    (ATTACHMENT_TEXT_EXTENSIONS as readonly string[]).includes(ext)
  );
};

export const isAllowedAttachmentFile = (filename: string, mimeType?: string | null): boolean => {
  if (mimeType?.startsWith('video/')) return true;
  if (mimeType?.startsWith('audio/')) return true;
  if (mimeType && ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) return true;
  if (mimeType?.startsWith('image/')) return false;
  if (mimeType === 'text/plain') return true;

  return isAllowedAttachmentExtension(getAttachmentFileExtension(filename));
};
