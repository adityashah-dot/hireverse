import fs from 'fs'
import path from 'path'

// Use local storage when S3 is not configured (for development/testing)
const USE_LOCAL =
  !process.env.S3_ACCESS_KEY_ID ||
  process.env.S3_ACCESS_KEY_ID === 'dummy' ||
  process.env.S3_ACCESS_KEY_ID === 'local'

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

function ensureLocalDir() {
  if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true })
  }
}

// ---- LOCAL STORAGE IMPLEMENTATIONS ----

async function uploadLocal(buffer: Buffer, key: string): Promise<string> {
  ensureLocalDir()
  const fileName = key.replace(/\//g, '_')
  fs.writeFileSync(path.join(LOCAL_UPLOAD_DIR, fileName), buffer)
  return key
}

async function getFileLocal(key: string): Promise<Buffer> {
  const fileName = key.replace(/\//g, '_')
  return fs.readFileSync(path.join(LOCAL_UPLOAD_DIR, fileName))
}

async function deleteLocal(key: string): Promise<void> {
  const fileName = key.replace(/\//g, '_')
  const filePath = path.join(LOCAL_UPLOAD_DIR, fileName)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
}

function getLocalUrl(key: string): string {
  const fileName = key.replace(/\//g, '_')
  return `/uploads/${fileName}`
}

// ---- S3 IMPLEMENTATIONS (only loaded when S3 is configured) ----

async function getS3Client() {
  const { S3Client } = await import('@aws-sdk/client-s3')
  return new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  })
}

// ---- PUBLIC API ----

export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType = 'application/octet-stream'
): Promise<string> {
  if (USE_LOCAL) return uploadLocal(buffer, key)

  const { PutObjectCommand } = await import('@aws-sdk/client-s3')
  const s3 = await getS3Client()
  await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key, Body: buffer, ContentType: contentType }))
  return key
}

export async function getFileFromS3(key: string): Promise<Buffer> {
  if (USE_LOCAL) return getFileLocal(key)

  const { GetObjectCommand } = await import('@aws-sdk/client-s3')
  const s3 = await getS3Client()
  const response = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }))
  const chunks: Uint8Array[] = []
  for await (const chunk of response.Body as any) chunks.push(chunk)
  return Buffer.concat(chunks)
}

export async function deleteFromS3(key: string): Promise<void> {
  if (USE_LOCAL) return deleteLocal(key)

  const { DeleteObjectCommand } = await import('@aws-sdk/client-s3')
  const s3 = await getS3Client()
  await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }))
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  if (USE_LOCAL) return getLocalUrl(key)

  const { GetObjectCommand } = await import('@aws-sdk/client-s3')
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
  const s3 = await getS3Client()
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }), { expiresIn })
}

export function getPublicUrl(key: string): string {
  if (USE_LOCAL) return getLocalUrl(key)

  if (process.env.S3_PUBLIC_URL) return `${process.env.S3_PUBLIC_URL}/${key}`
  return `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`
}
