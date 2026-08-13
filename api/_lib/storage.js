export const STORAGE_BUCKET = 'job-photos';
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

const BLOCKED_MIME = /(?:x-msdownload|x-msdos-program|x-executable|x-sh|x-bat|javascript|x-httpd-php)/i;
const BLOCKED_EXT = /\.(?:exe|dll|com|scr|bat|cmd|ps1|sh|js|mjs|cjs|jar|msi|php|py|rb)(?:\.|$)/i;

export function safeUpload(name, mime, size) {
  if (!Number.isFinite(size) || size < 1 || size > MAX_FILE_BYTES) return false;
  if (BLOCKED_MIME.test(String(mime || '')) || BLOCKED_EXT.test(String(name || ''))) return false;
  return true;
}

export async function uploadStorageObject({ url, key, fileId, mime, buffer }) {
  if (!safeUpload(fileId, mime, buffer && buffer.length)) {
    const error = new Error('File type is not allowed or the file exceeds 25 MB.');
    error.code = 'unsafe_upload';
    throw error;
  }
  const response = await fetch(`${url}/storage/v1/object/${STORAGE_BUCKET}/${encodeURIComponent(fileId)}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': mime || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: buffer,
  });
  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(detail.slice(0, 240) || 'Storage upload failed.');
    error.code = 'upload_failed';
    error.status = response.status;
    throw error;
  }
  return fileId;
}
