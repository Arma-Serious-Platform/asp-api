import { fileTypeFromBuffer } from 'file-type';
import {
  buildStorageHeaders,
  isAllowedAttachmentFile,
  isAllowedImageFile,
  resolveContentType,
} from './file-signature';

// file-type is ESM-only; its detection is exercised in the Docker checks.
jest.mock('file-type', () => ({ fileTypeFromBuffer: jest.fn() }), {
  virtual: true,
});

const detect = fileTypeFromBuffer as jest.Mock;
const file = (originalname: string, content = 'data') => ({
  originalname,
  buffer: Buffer.from(content),
});

describe('file-signature', () => {
  beforeEach(() => detect.mockReset());

  describe('isAllowedImageFile', () => {
    it.each(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])(
      'accepts %s by signature',
      async (mime) => {
        detect.mockResolvedValue({ ext: 'x', mime });
        await expect(isAllowedImageFile(file('a.bin'))).resolves.toBe(true);
      },
    );

    it('rejects other detected formats and undetectable content (SVG, HTML)', async () => {
      detect.mockResolvedValue({ ext: 'bmp', mime: 'image/bmp' });
      await expect(isAllowedImageFile(file('a.png'))).resolves.toBe(false);

      detect.mockResolvedValue(undefined);
      await expect(
        isAllowedImageFile(file('a.svg', '<svg></svg>')),
      ).resolves.toBe(false);
    });
  });

  describe('isAllowedAttachmentFile', () => {
    it('accepts media detected by signature regardless of the name', async () => {
      detect.mockResolvedValue({ ext: 'mp4', mime: 'video/mp4' });
      await expect(isAllowedAttachmentFile(file('clip.txt'))).resolves.toBe(
        true,
      );
    });

    it('accepts WMV/WMA reported as the ASF container only with a matching extension', async () => {
      detect.mockResolvedValue({ ext: 'asf', mime: 'application/vnd.ms-asf' });
      await expect(isAllowedAttachmentFile(file('clip.wmv'))).resolves.toBe(
        true,
      );
      await expect(isAllowedAttachmentFile(file('clip.pbo'))).resolves.toBe(
        false,
      );
    });

    it('rejects detected non-media formats even with an allowed extension', async () => {
      detect.mockResolvedValue({ ext: 'zip', mime: 'application/zip' });
      await expect(isAllowedAttachmentFile(file('mission.pbo'))).resolves.toBe(
        false,
      );
    });

    it('accepts PBO and plain text without a signature by extension', async () => {
      detect.mockResolvedValue(undefined);
      await expect(isAllowedAttachmentFile(file('mission.pbo'))).resolves.toBe(
        true,
      );
      await expect(
        isAllowedAttachmentFile(file('init.sqf', 'hint "ok";')),
      ).resolves.toBe(true);
    });

    it('rejects text files with markup and unknown extensions', async () => {
      detect.mockResolvedValue(undefined);
      await expect(
        isAllowedAttachmentFile(
          file('notes.txt', '<!DOCTYPE html><script>x</script>'),
        ),
      ).resolves.toBe(false);
      await expect(
        isAllowedAttachmentFile(file('page.html', 'hi')),
      ).resolves.toBe(false);
    });
  });

  describe('resolveContentType', () => {
    it('prefers the detected type over the extension', async () => {
      detect.mockResolvedValue({ ext: 'png', mime: 'image/png' });
      await expect(resolveContentType(file('a.txt'))).resolves.toBe(
        'image/png',
      );
    });

    it('falls back to text/plain for text files and octet-stream otherwise', async () => {
      detect.mockResolvedValue(undefined);
      await expect(resolveContentType(file('a.sqm'))).resolves.toBe(
        'text/plain; charset=utf-8',
      );
      await expect(resolveContentType(file('a.pbo'))).resolves.toBe(
        'application/octet-stream',
      );
    });
  });

  describe('buildStorageHeaders', () => {
    it('serves media inline', () => {
      expect(buildStorageHeaders('video/mp4', 'clip.mp4')).toEqual({
        'Content-Type': 'video/mp4',
      });
    });

    it('forces a download for everything else, with an encoded file name', () => {
      expect(
        buildStorageHeaders('text/plain; charset=utf-8', 'план місії.txt'),
      ).toEqual({
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('план місії.txt')}`,
      });
    });
  });
});
