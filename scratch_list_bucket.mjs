import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  endpoint: 'https://t3.storageapi.dev',
  region: 'auto',
  credentials: {
    accessKeyId: 'tid_qJLZlUnpNMISimFhapSl_QhDKMbBumkqfSPqdbFjeAqPVcqSck',
    secretAccessKey: 'tsec_DExQt4kUQMFnD-ATXFJKoL+NAbk0SAEZ6ntDiu6z0FxxCV+JIiR-6+m-xiX+q9EW4oNcn1'
  }
});

async function listBucket() {
  try {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: 'shelved-trunk-zrxdvpxaih4',
      MaxKeys: 100
    }));
    console.log('Bucket Contents:');
    (res.Contents || []).forEach(item => {
      console.log(`- ${item.Key} (${item.Size} bytes)`);
    });
  } catch (err) {
    console.error('Bucket list error:', err);
  }
}

listBucket();
