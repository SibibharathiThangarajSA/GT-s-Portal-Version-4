/**
 * Site videos, served from the project's object storage rather than from public/.
 *
 * These four files were ~440 MB of MP4 committed to the repository through Git LFS. Every
 * deploy carried them into the container image, every checkout had to resolve LFS, and
 * replacing a video meant a rebuild. They are content, not code, so they live in the bucket
 * and are replaced by uploading a new object under the same key.
 *
 * The URLs point at the API's download route instead of the bucket directly: Railway's bucket
 * accepts a public-read ACL but still refuses anonymous reads, so a direct object URL 403s.
 * That route streams from the bucket and forwards the Range header, so seeking still works.
 *
 * The landing page background stays in public/ on purpose. It is small and sits on the first
 * paint of every visit, so it is not worth an extra hop through the API.
 */
const BUCKET_VIDEO_BASE = '/api/materials/files/site-assets/videos';

export const SITE_VIDEOS = {
  finalOverview: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  leadershipInsights: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  bucketFinalOverview: `${BUCKET_VIDEO_BASE}/final-overview.mp4`,
  bucketLeadershipInsights: `${BUCKET_VIDEO_BASE}/leadership-insights.mp4`
} as const;
