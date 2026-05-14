const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

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
    const { key, filename, meta } = req.body || {};
    if (!key || !filename) return res.status(400).json({ error: 'Missing key or filename' });

    const metadata = {
      key,
      filename,
      meta: meta || {},
      uploadedAt: new Date().toISOString()
    };

    const metaKey = `reports/metadata/${Date.now()}-${Math.random().toString(36).slice(2,9)}.json`;
    const cmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: metaKey,
      Body: JSON.stringify(metadata),
      ContentType: 'application/json'
    });

    await s3.send(cmd);
    return res.json({ ok: true, metaKey });
  } catch (err) {
    console.error('save-report error', err);
    return res.status(500).json({ error: 'save_failed' });
  }
};
