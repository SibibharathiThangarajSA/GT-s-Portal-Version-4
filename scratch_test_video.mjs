import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  endpoint: 'https://t3.storageapi.dev',
  region: 'auto',
  credentials: {
    accessKeyId: 'tid_qJLZlUnpNMISimFhapSl_QhDKMbBumkqfSPqdbFjeAqPVcqSck',
    secretAccessKey: 'tsec_DExQt4kUQMFnD-ATXFJKoL+NAbk0SAEZ6ntDiu6z0FxxCV+JIiR-6+m-xiX+q9EW4oNcn1'
  }
});

async function testVideoFetch() {
  try {
    const cmd = new GetObjectCommand({
      Bucket: 'shelved-trunk-zrxdvpxaih4',
      Key: 'site-assets/videos/leadership-insights.mp4',
      Range: 'bytes=0-1024'
    });
    const res = await s3.send(cmd);
    console.log('Status ContentRange:', res.ContentRange);
    console.log('ContentLength:', res.ContentLength);
    console.log('ContentType:', res.ContentType);
  } catch (err) {
    console.error('Error fetching video range:', err);
  }
}

testVideoFetch();
