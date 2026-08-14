/**
 * One way to reach a stored document, used by provided materials, additional materials and
 * assignments alike.
 *
 * Each of the three used to resolve its URL differently - materials through one helper, the
 * assignment card through a bare anchor - so a fix applied to one never reached the others.
 *
 * The URL always points at the API's own route, which streams the object out of the bucket.
 * Nothing here builds a storage URL: the database holds the object key and the backend resolves
 * it, so a link keeps working after the record is reloaded.
 */

/** Anything the API can hand back with a document attached to it. */
export interface DocumentLike {
  url?: string;
  webUrl?: string;
  downloadUrl?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  fileName?: string;
  fileType?: string;
  title?: string;
}

/**
 * A URL is only usable if it survives a page reload and points at this origin's API or a real
 * external address. Blob URLs live and die with the tab that made them, and a localhost address
 * is a developer machine that nobody else can reach.
 */
const isUsableUrl = (value?: string): boolean => {
  if (!value) return false;

  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '#') return false;
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return false;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(trimmed)) return false;

  return true;
};

/**
 * Preference order matches what the upload endpoint returns: downloadUrl, webUrl and url are the
 * same API route for a bucket object, and attachmentUrl is the assignment equivalent.
 */
export const resolveDocumentUrl = (record: DocumentLike | null | undefined): string => {
  if (!record) return '';

  const candidates = [record.downloadUrl, record.webUrl, record.url, record.attachmentUrl];
  const usable = candidates.find(isUsableUrl);

  return usable ? usable.trim() : '';
};

export const hasDocument = (record: DocumentLike | null | undefined): boolean =>
  resolveDocumentUrl(record) !== '';

/**
 * View: opens the document for reading and nothing else.
 *
 * The API serves objects with their stored content type and no Content-Disposition, so a PDF
 * renders in the browser's viewer. Returns false when there is no document, which the caller
 * should surface - the previous behaviour generated a text file from the title and description
 * and handed that to the user instead, which looks like a broken document rather than a missing
 * one.
 */
export const openDocument = (record: DocumentLike | null | undefined): boolean => {
  const url = resolveDocumentUrl(record);
  if (!url) return false;

  const docTitle =
    record?.title ||
    record?.attachmentName ||
    record?.fileName ||
    'Document Preview';

  const cleanUrl = url.toLowerCase();
  const fileType = record?.fileType?.toLowerCase() || '';

  // Route Word (.docx, .doc) files through the in-browser document viewer
  // so the document opens visually on screen rather than triggering a browser download
  if (cleanUrl.endsWith('.docx') || cleanUrl.endsWith('.doc') || fileType === 'docx' || fileType === 'doc') {
    const viewerUrl = `/document-viewer.html?file=${encodeURIComponent(url)}&title=${encodeURIComponent(docTitle)}`;
    window.open(viewerUrl, '_blank', 'noopener,noreferrer');
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return true;
};

/**
 * Download: saves the document. Deliberately separate from openDocument, and never used for a
 * View control.
 */
export const downloadDocument = async (record: DocumentLike | null | undefined): Promise<boolean> => {
  const url = resolveDocumentUrl(record);
  if (!url) return false;

  const suggestedName =
    record?.attachmentName ||
    record?.fileName ||
    `${(record?.title || 'document').replace(/[\\/:*?"<>|]/g, '-')}`;

  try {
    // Fetched first so the browser saves the bytes under the intended name; a plain anchor to a
    // cross-route URL can navigate instead of downloading.
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);

    const blobUrl = URL.createObjectURL(await response.blob());
    triggerSave(blobUrl, suggestedName);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    return true;
  } catch {
    // The object may still be reachable directly even when fetch is blocked, so fall back to
    // letting the browser handle it rather than failing the download outright.
    triggerSave(url, suggestedName);
    return true;
  }
};

const triggerSave = (href: string, fileName: string) => {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
};
