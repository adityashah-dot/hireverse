import { getFileFromS3 } from './storage'

export async function extractTextFromFile(fileKey: string): Promise<string> {
  const buffer = await getFileFromS3(fileKey)
  const ext = fileKey.split('.').pop()?.toLowerCase()

  if (ext === 'pdf') {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return data.text
  }

  if (ext === 'doc' || ext === 'docx') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  if (ext === 'txt') {
    return buffer.toString('utf-8')
  }

  throw new Error(`Unsupported file type: ${ext}`)
}

export function generateFileKey(folder: string, originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const ext = originalName.split('.').pop()?.toLowerCase() || 'bin'
  return `${folder}/${timestamp}-${random}.${ext}`
}

export function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const types: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
  }
  return types[ext || ''] || 'application/octet-stream'
}
