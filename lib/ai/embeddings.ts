/**
 * Cosine similarity between two normalized vectors.
 * Both must be same-length non-zero arrays.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  if (denom === 0) return 0
  return dot / denom
}

/**
 * Normalize an embedding vector to unit length.
 */
export function normalizeEmbedding(vec: number[]): number[] {
  const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0))
  if (mag === 0) return vec
  return vec.map((v) => v / mag)
}
