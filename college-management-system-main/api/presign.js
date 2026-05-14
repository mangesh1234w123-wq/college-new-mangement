const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  }
});

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { filename, contentType } = req.body || {};
    if (!filename || !contentType) return res.status(400).json({ error: 'Missing filename or contentType' });

    const Key = `reports/${Date.now()}-${filename}`;
    const cmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key,
      ContentType: contentType,
      ACL: 'private'
    });

    const url = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
    return res.json({ url, key: Key });
  } catch (err) {
    console.error('presign error', err);
    return res.status(500).json({ error: 'presign_failed' });
  }
};
