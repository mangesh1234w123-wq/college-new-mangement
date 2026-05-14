// Helper to upload a File object directly to S3 via presigned URL from /api/presign
async function uploadFileToS3(file) {
  const resp = await fetch('/api/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream' })
  });
  if (!resp.ok) throw new Error('Failed to get presign URL');
  const { url, key } = await resp.json();
  const put = await fetch(url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!put.ok) throw new Error('Upload failed');
  return { key };
}

window.uploadFileToS3 = uploadFileToS3;
