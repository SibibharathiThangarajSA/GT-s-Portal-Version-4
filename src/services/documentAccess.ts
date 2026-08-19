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
  materialsLink?: string;
  attachmentName?: string;
  fileName?: string;
  fileType?: string;
  title?: string;
  file?: File | Blob;
}

/**
 * Validates whether a given URL string is non-empty and usable.
 */
const isUsableUrl = (value?: string): boolean => {
  if (!value) return false;

  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '#') return false;

  return true;
};

/**
 * Preference order matches what the upload endpoint returns: downloadUrl, webUrl and url are the
 * same API route for a bucket object, and attachmentUrl is the assignment equivalent.
 */
export const resolveDocumentUrl = (record: DocumentLike | null | undefined): string => {
  if (!record) return '';

  if (record.file && typeof record.file === 'object' && ((record.file as any) instanceof Blob || 'size' in record.file)) {
    try {
      return URL.createObjectURL(record.file as Blob);
    } catch (e) {
      console.warn('Could not create object URL for in-memory file:', e);
    }
  }

  const candidates = [
    record.downloadUrl,
    record.webUrl,
    record.url,
    record.attachmentUrl,
    record.materialsLink
  ];
  const usable = candidates.find(isUsableUrl);

  return usable ? usable.trim() : '';
};

/**
 * Safely encodes URL path segments while preserving slashes, query parameters, and protocol.
 * This guarantees special characters like '#', '&', '+', spaces, brackets, and parens in file names
 * are not truncated or misinterpreted by the browser during HTTP requests.
 */
export const encodeDocumentUrl = (rawUrl: string): string => {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();

  // If it's a full absolute external URL:
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const urlObj = new URL(trimmed);
      urlObj.pathname = urlObj.pathname
        .split('/')
        .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
        .join('/');
      return urlObj.toString();
    } catch {
      return trimmed;
    }
  }

  // If it's a relative path:
  const [pathPart, ...queryParts] = trimmed.split('?');
  const safePath = pathPart
    .split('/')
    .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
    .join('/');
  const query = queryParts.length > 0 ? `?${queryParts.join('?')}` : '';
  return `${safePath}${query}`;
};

/**
 * View: opens the document for reading in the unified document viewer screen.
 *
 * All materials (Provided, Additional, Assignments, PDFs, Word docs, images, text, and stored files)
 * open in the full-featured in-browser document viewer screen. External non-document web links
 * open directly in a new tab.
 */
export const openDocument = (record: DocumentLike | null | undefined): boolean => {
  const url = resolveDocumentUrl(record);
  if (!url) return false;

  const docTitle =
    record?.title ||
    record?.attachmentName ||
    record?.fileName ||
    'Document Preview';

  const safeUrl = encodeDocumentUrl(url);
  const cleanUrl = safeUrl.toLowerCase().split('?')[0];
  const lowerTitle = docTitle.toLowerCase();
  const lowerType = (record?.fileType || '').toLowerCase();

  // Check if it's a PowerPoint presentation (.ppt, .pptx, SharePoint PPT)
  const isPowerPoint =
    cleanUrl.endsWith('.pptx') ||
    cleanUrl.endsWith('.ppt') ||
    lowerTitle.endsWith('.pptx') ||
    lowerTitle.endsWith('.ppt') ||
    lowerType.includes('powerpoint') ||
    lowerType.includes('ppt') ||
    safeUrl.includes('sharepoint.com') ||
    safeUrl.includes('1drv.ms') ||
    safeUrl.includes('onedrive.live.com');

  // Check if it's an external video streaming website link (e.g. YouTube, Vimeo)
  const isStreamingVideoUrl =
    safeUrl.includes('youtube.com') ||
    safeUrl.includes('youtu.be') ||
    safeUrl.includes('vimeo.com');

  // 1. Video Streaming Links (YouTube / Vimeo)
  if (isStreamingVideoUrl) {
    window.open(safeUrl, '_blank', 'noopener,noreferrer');
    return true;
  }

  // 2. PowerPoint Presentations (.ppt, .pptx, SharePoint PPT):
  // Always open directly in Web PowerPoint (Microsoft 365 / Office Online Web Viewer) in a new tab (Never in document-viewer.html)
  if (isPowerPoint) {
    if (safeUrl.includes('sharepoint.com') || safeUrl.includes('1drv.ms') || safeUrl.includes('onedrive.live.com')) {
      const onlinePptUrl = safeUrl.includes('?') ? `${safeUrl}&web=1` : `${safeUrl}?web=1`;
      window.open(onlinePptUrl, '_blank', 'noopener,noreferrer');
      return true;
    }

    const fullUrl = safeUrl.startsWith('http') ? safeUrl : `${window.location.origin}${safeUrl.startsWith('/') ? '' : '/'}${safeUrl}`;
    const officeWebPptUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fullUrl)}`;
    window.open(officeWebPptUrl, '_blank', 'noopener,noreferrer');
    return true;
  }

  // 3. ALL other documents (PDF, Word DOC/DOCX, Excel XLSX, Images, Code, SQL, Text):
  // Open in the Universal In-Browser Document Viewer screen
  const viewerUrl = `/document-viewer.html?file=${encodeURIComponent(safeUrl)}&title=${encodeURIComponent(docTitle)}`;
  window.open(viewerUrl, '_blank', 'noopener,noreferrer');
  return true;
};

/**
 * Download: saves the document. Deliberately separate from openDocument, and never used for a
 * View control.
 */
export const downloadDocument = async (record: DocumentLike | null | undefined): Promise<boolean> => {
  const url = resolveDocumentUrl(record);
  if (!url) return false;

  const safeUrl = encodeDocumentUrl(url);
  const suggestedName =
    record?.attachmentName ||
    record?.fileName ||
    `${(record?.title || 'document').replace(/[\\/:*?"<>|]/g, '-')}`;

  try {
    // Fetched first so the browser saves the bytes under the intended name; a plain anchor to a
    // cross-route URL can navigate instead of downloading.
    const response = await fetch(safeUrl, { credentials: 'include' });
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);

    const blobUrl = URL.createObjectURL(await response.blob());
    triggerSave(blobUrl, suggestedName);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    return true;
  } catch {
    // The object may still be reachable directly even when fetch is blocked, so fall back to
    // letting the browser handle it rather than failing the download outright.
    triggerSave(safeUrl, suggestedName);
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
